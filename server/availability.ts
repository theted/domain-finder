import { promises as dns } from "node:dns";
import type { DomainResult, Tld } from "../shared/domain.ts";

// Availability comes from the registries' public RDAP servers (the successor
// to WHOIS), found through IANA's bootstrap file. TLDs without RDAP fall back
// to DNS, which can prove a name is taken but only suggest that it's free.

const BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json";
const BOOTSTRAP_TTL_MS = 24 * 60 * 60 * 1000;
const BOOTSTRAP_RETRY_MS = 5 * 60 * 1000;
const RESULT_TTL_MS = 15 * 60 * 1000;
const LOOKUP_TIMEOUT_MS = 6000;
const PER_HOST_CONCURRENCY = 4;

// Registries that answer RDAP but are missing from IANA's bootstrap file.
// Checked on 2026-10-14: .io answers 200 for registered names and 404 otherwise.
const UNLISTED_RDAP: Partial<Record<string, string>> = {
  io: "https://rdap.identitydigital.services/rdap/",
};

type Deps = {
  fetch?: typeof fetch;
  resolveNs?: (domain: string) => Promise<unknown>;
  now?: () => number;
};

type RdapVerdict = "registered" | "not-found" | "error";
type DnsVerdict = "resolves" | "nxdomain" | "error";

const createLimiter = (max: number) => {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async <T>(task: () => Promise<T>): Promise<T> => {
    // A finishing task hands its slot straight to the next waiter, so
    // `active` never overshoots `max`.
    if (active < max) active++;
    else await new Promise<void>((resolve) => waiting.push(resolve));
    try {
      return await task();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
};

const resolver = new dns.Resolver({ timeout: 2500, tries: 2 });

export const createAvailabilityChecker = ({
  fetch: fetchImpl = fetch,
  resolveNs = (domain) => resolver.resolveNs(domain),
  now = Date.now,
}: Deps = {}) => {
  let bootstrap: { servers: Map<string, string>; expires: number } | null = null;
  let bootstrapLoading: Promise<Map<string, string>> | null = null;
  const limiters = new Map<string, ReturnType<typeof createLimiter>>();
  const cache = new Map<string, { result: DomainResult; expires: number }>();

  const loadBootstrap = async (): Promise<Map<string, string>> => {
    if (bootstrap && bootstrap.expires > now()) return bootstrap.servers;
    bootstrapLoading ??= (async () => {
      try {
        const res = await fetchImpl(BOOTSTRAP_URL, { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) });
        if (!res.ok) throw new Error(`IANA bootstrap answered ${res.status}`);
        const data = (await res.json()) as { services: [string[], string[]][] };
        const servers = new Map<string, string>();
        for (const [tlds, urls] of data.services) {
          const url = urls.find((u) => u.startsWith("https://")) ?? urls[0];
          if (url) for (const tld of tlds) servers.set(tld.toLowerCase(), url);
        }
        bootstrap = { servers, expires: now() + BOOTSTRAP_TTL_MS };
      } catch (error) {
        console.warn("RDAP bootstrap unavailable, using DNS only for now:", (error as Error).message);
        bootstrap = { servers: bootstrap?.servers ?? new Map(), expires: now() + BOOTSTRAP_RETRY_MS };
      } finally {
        bootstrapLoading = null;
      }
      return bootstrap.servers;
    })();
    return bootstrapLoading;
  };

  const rdapLookup = async (base: string, domain: string): Promise<RdapVerdict> => {
    const host = new URL(base).host;
    let limit = limiters.get(host);
    if (!limit) limiters.set(host, (limit = createLimiter(PER_HOST_CONCURRENCY)));

    return limit(async () => {
      try {
        const url = new URL(`domain/${domain}`, base.endsWith("/") ? base : `${base}/`);
        const res = await fetchImpl(url, {
          headers: { accept: "application/rdap+json" },
          signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
        });
        await res.body?.cancel();
        if (res.status === 404) return "not-found";
        return res.ok ? "registered" : "error";
      } catch {
        return "error";
      }
    });
  };

  const dnsLookup = async (domain: string): Promise<DnsVerdict> => {
    try {
      await resolveNs(domain);
      return "resolves";
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOTFOUND") return "nxdomain";
      // The name exists, it just has no NS records of its own.
      if (code === "ENODATA") return "resolves";
      return "error";
    }
  };

  const lookup = async (name: string, tld: Tld): Promise<DomainResult> => {
    const domain = `${name}.${tld}`;
    const result = (status: DomainResult["status"], certain: boolean): DomainResult => ({
      domain,
      name,
      tld,
      status,
      certain,
    });

    const servers = await loadBootstrap();
    const base = servers.get(tld) ?? UNLISTED_RDAP[tld];
    const rdap = base ? await rdapLookup(base, domain) : "error";
    if (rdap === "registered") return result("taken", true);

    const dnsVerdict = await dnsLookup(domain);
    if (dnsVerdict === "resolves") return result("taken", true);
    // A registry 404 is authoritative. Without one, an unresolvable name is
    // only probably free: it could be registered but parked without DNS.
    if (rdap === "not-found") return result("available", true);
    if (dnsVerdict === "nxdomain") return result("available", false);
    return result("unknown", false);
  };

  return async (name: string, tld: Tld): Promise<DomainResult> => {
    const key = `${name}.${tld}`;
    const hit = cache.get(key);
    if (hit && hit.expires > now()) return hit.result;

    const result = await lookup(name, tld);
    if (result.status !== "unknown") {
      if (cache.size > 5000) cache.clear();
      cache.set(key, { result, expires: now() + RESULT_TTL_MS });
    }
    return result;
  };
};

export type CheckDomain = ReturnType<typeof createAvailabilityChecker>;
