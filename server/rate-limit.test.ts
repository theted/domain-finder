import { describe, expect, it } from "vitest";
import { clientAddress, createRateLimiter } from "./rate-limit.ts";

describe("createRateLimiter", () => {
  it("allows a number of requests per hour per key, then says when to come back", () => {
    let now = 0;
    const take = createRateLimiter(2, () => now);
    expect(take("a")).toEqual({ ok: true });
    now = 10 * 60_000;
    expect(take("a")).toEqual({ ok: true });
    expect(take("a")).toEqual({ ok: false, retryAfterSeconds: 50 * 60 });
    expect(take("b")).toEqual({ ok: true });
    now = 60 * 60_000 + 1;
    expect(take("a")).toEqual({ ok: true });
  });

  it("is off at zero", () => {
    const take = createRateLimiter(0);
    for (let i = 0; i < 5; i++) expect(take("a")).toEqual({ ok: true });
  });
});

describe("clientAddress", () => {
  it("ignores X-Forwarded-For when no proxy is trusted", () => {
    expect(clientAddress("1.1.1.1", "10.0.0.5", 0)).toBe("10.0.0.5");
  });

  it("takes the address the trusted proxy saw, not what the client claims", () => {
    // The client sent "X-Forwarded-For: 6.6.6.6"; nginx appended the real address.
    expect(clientAddress("6.6.6.6, 203.0.113.9", "172.18.0.1", 1)).toBe("203.0.113.9");
    expect(clientAddress("203.0.113.9", "172.18.0.1", 1)).toBe("203.0.113.9");
    expect(clientAddress("6.6.6.6, 203.0.113.9, 10.0.0.2", "172.18.0.1", 2)).toBe("203.0.113.9");
  });

  it("falls back to the socket address", () => {
    expect(clientAddress(undefined, "172.18.0.1", 1)).toBe("172.18.0.1");
    expect(clientAddress("", undefined, 1)).toBe("unknown");
  });
});
