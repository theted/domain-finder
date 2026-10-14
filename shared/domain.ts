// Shared between the server and the browser: what can be asked for, and the
// shape of the NDJSON events streamed back.

export const TLDS = ["com", "io", "ai", "co", "dev", "app", "se", "net", "org", "xyz"] as const;
export type Tld = (typeof TLDS)[number];

export const DEFAULT_TLDS: Tld[] = ["com", "io", "ai"];
export const MAX_TLDS = 5;

export const FEELS = ["warm", "playful", "premium", "technical", "minimal", "bold", "calm", "nordic"] as const;
export type Feel = (typeof FEELS)[number];
export const MAX_FEELS = 3;

export const DESCRIPTION_MIN = 3;
export const DESCRIPTION_MAX = 500;
export const NAMES_PER_BATCH = 12;
export const MAX_OWN_NAMES = 10;

export type Availability = "available" | "taken" | "unknown";

export type DomainResult = {
  domain: string;
  name: string;
  tld: Tld;
  status: Availability;
  // false when only DNS could be consulted (no registry RDAP for the TLD),
  // so "available" means "nothing resolves", not "the registry says free".
  certain: boolean;
};

export type SearchRequest = {
  description: string;
  feels: Feel[];
  tlds: Tld[];
  exclude: string[];
};

export type CheckRequest = {
  names: string[];
  tlds: Tld[];
};

export type StreamEvent =
  | { type: "name"; name: string; why: string }
  | ({ type: "domain" } & DomainResult)
  | { type: "done" }
  | { type: "error"; message: string };

export type HealthResponse = {
  ok: true;
  demo: boolean;
  model: string;
};

// A name is the second-level label of a domain: lowercase letters, digits and
// inner hyphens, at most 63 characters. Returns null when nothing usable is left.
export const toLabel = (input: string): string | null => {
  const label = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\.[a-z]{2,}$/, "")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
  return label.length >= 2 && label.length <= 63 ? label : null;
};

export const isTld = (value: string): value is Tld => (TLDS as readonly string[]).includes(value);
