// Sliding one-hour window per client. Every search costs an OpenAI call, so a
// public deploy needs a ceiling; in-memory is enough for a single process.

const WINDOW_MS = 60 * 60 * 1000;

export type RateLimiter = (key: string) => { ok: true } | { ok: false; retryAfterSeconds: number };

export const createRateLimiter = (perHour: number, now: () => number = Date.now): RateLimiter => {
  const hits = new Map<string, number[]>();

  return (key) => {
    if (perHour <= 0) return { ok: true };
    const time = now();
    const recent = (hits.get(key) ?? []).filter((t) => t > time - WINDOW_MS);

    if (recent.length >= perHour) {
      hits.set(key, recent);
      return { ok: false, retryAfterSeconds: Math.ceil((recent[0]! + WINDOW_MS - time) / 1000) };
    }

    recent.push(time);
    hits.set(key, recent);
    if (hits.size > 10_000) {
      for (const [k, times] of hits) if (times.at(-1)! <= time - WINDOW_MS) hits.delete(k);
    }
    return { ok: true };
  };
};

// Each trusted proxy appends the address it saw to X-Forwarded-For, so behind `hops` of them
// the client is the entry `hops` places from the right. Anything further left was sent by the
// client and can be anything, so it never decides whose limit a request counts against.
export const clientAddress = (forwardedFor: string | undefined, remote: string | undefined, hops: number) => {
  if (hops > 0 && forwardedFor) {
    const chain = forwardedFor
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const address = chain[chain.length - hops];
    if (address) return address;
  }
  return remote || "unknown";
};
