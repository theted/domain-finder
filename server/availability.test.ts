import { describe, expect, it, vi } from "vitest";
import { createAvailabilityChecker } from "./availability.ts";

const bootstrap = {
  services: [
    [["com", "net"], ["https://rdap.verisign.example/com/v1/"]],
    [["ai"], ["http://insecure.example/", "https://rdap.ai.example/rdap/"]],
  ],
};

const dnsError = (code: string) => Object.assign(new Error(code), { code });

// rdap: domain → HTTP status; dns: domain → "resolves" or an error code
const setup = (rdap: Record<string, number>, dns: Record<string, string> = {}) => {
  const fetch = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("data.iana.org")) return Response.json(bootstrap);
    const domain = url.split("/domain/")[1]!;
    return new Response("{}", { status: rdap[domain] ?? 404 });
  });
  const resolveNs = vi.fn(async (domain: string) => {
    const answer = dns[domain] ?? "ENOTFOUND";
    if (answer === "resolves") return ["ns1.example."];
    throw dnsError(answer);
  });
  return { fetch, resolveNs, check: createAvailabilityChecker({ fetch, resolveNs }) };
};

describe("availability", () => {
  it("calls a name taken when the registry has a record", async () => {
    const { check } = setup({ "acme.com": 200 });
    expect(await check("acme", "com")).toMatchObject({ domain: "acme.com", status: "taken", certain: true });
  });

  it("calls a name free when the registry answers 404 and nothing resolves", async () => {
    const { check, fetch } = setup({});
    expect(await check("zyxwv", "com")).toMatchObject({ status: "available", certain: true });
    expect(String(fetch.mock.calls[1]![0])).toBe("https://rdap.verisign.example/com/v1/domain/zyxwv.com");
  });

  it("prefers a registry's https server from the bootstrap file", async () => {
    const { check, fetch } = setup({});
    await check("zyxwv", "ai");
    expect(String(fetch.mock.calls[1]![0])).toBe("https://rdap.ai.example/rdap/domain/zyxwv.ai");
  });

  it("trusts DNS over a registry 404", async () => {
    const { check } = setup({}, { "busy.com": "resolves" });
    expect(await check("busy", "com")).toMatchObject({ status: "taken", certain: true });
  });

  it("falls back to DNS for endings without RDAP, and says it's unsure", async () => {
    const { check, fetch } = setup({}, { "taken.se": "resolves" });
    expect(await check("fresh", "se")).toMatchObject({ status: "available", certain: false });
    expect(await check("taken", "se")).toMatchObject({ status: "taken", certain: true });
    expect(fetch).toHaveBeenCalledTimes(1); // only the bootstrap
  });

  it("falls back to DNS when the registry errors", async () => {
    const { check } = setup({ "flaky.com": 503 });
    expect(await check("flaky", "com")).toMatchObject({ status: "available", certain: false });
  });

  it("reports unknown when neither source answers", async () => {
    const { check } = setup({ "dark.co": 503 }, { "dark.co": "ESERVFAIL" });
    expect(await check("dark", "co")).toMatchObject({ status: "unknown", certain: false });
  });

  it("caches answers and loads the bootstrap once", async () => {
    const { check, fetch } = setup({ "acme.com": 200 });
    await Promise.all([check("acme", "com"), check("other", "com")]);
    await check("acme", "com");
    const urls = fetch.mock.calls.map(([input]) => String(input));
    expect(urls.filter((u) => u.includes("data.iana.org"))).toHaveLength(1);
    expect(urls.filter((u) => u.endsWith("acme.com"))).toHaveLength(1);
  });

  it("uses DNS only when the bootstrap can't be fetched", async () => {
    const fetch = vi.fn(async () => {
      throw new Error("offline");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const check = createAvailabilityChecker({ fetch, resolveNs: async () => ["ns1."] });
    expect(await check("acme", "com")).toMatchObject({ status: "taken", certain: true });
    warn.mockRestore();
  });
});
