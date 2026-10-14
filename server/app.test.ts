import { describe, expect, it, vi } from "vitest";
import type { DomainResult, StreamEvent, Tld } from "../shared/domain.ts";
import { createApp, type AppDeps } from "./app.ts";
import type { GenerateNames } from "./names.ts";
import { createRateLimiter } from "./rate-limit.ts";

const ideas = (...names: string[]): GenerateNames =>
  async function* () {
    for (const name of names) yield { name, why: `Why ${name}` };
  };

const checkDomain = async (name: string, tld: Tld): Promise<DomainResult> => ({
  domain: `${name}.${tld}`,
  name,
  tld,
  status: name.startsWith("taken") ? "taken" : "available",
  certain: true,
});

const build = (overrides: Partial<AppDeps> = {}) =>
  createApp({
    generateNames: ideas("Mugkin", "takenly"),
    checkDomain,
    rateLimit: createRateLimiter(100),
    clientKey: () => "test",
    demo: false,
    model: "test-model",
    ...overrides,
  });

const post = (app: ReturnType<typeof build>, path: string, body: unknown) =>
  app.request(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const events = async (res: Response) =>
  (await res.text())
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as StreamEvent);

describe("POST /api/search", () => {
  it("streams names, then a result per domain, then done", async () => {
    const res = await post(build(), "/api/search", { description: "ceramic cups", tlds: ["com", "io"] });
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");

    const stream = await events(res);
    expect(stream.filter((e) => e.type === "name")).toEqual([
      { type: "name", name: "mugkin", why: "Why Mugkin" },
      { type: "name", name: "takenly", why: "Why takenly" },
    ]);
    const domains = stream.flatMap((e) => (e.type === "domain" ? [`${e.domain}:${e.status}`] : []));
    expect(domains.sort()).toEqual(["mugkin.com:available", "mugkin.io:available", "takenly.com:taken", "takenly.io:taken"]);
    expect(stream.at(-1)).toEqual({ type: "done" });
  });

  it("drops duplicates, unusable names and names already shown", async () => {
    const app = build({ generateNames: ideas("Mugkin", "mugkin.com", "!!", "Kilnfolk") });
    const stream = await events(await post(app, "/api/search", { description: "cups", tlds: ["com"], exclude: ["KILNFOLK"] }));
    expect(stream.filter((e) => e.type === "name").map((e) => e.type === "name" && e.name)).toEqual(["mugkin"]);
  });

  it("passes the request through to the name generator", async () => {
    const generateNames = vi.fn(ideas());
    await post(build({ generateNames }), "/api/search", {
      description: "  a bakery  ",
      feels: ["warm"],
      tlds: ["se"],
      exclude: ["Dawnloaf"],
    });
    expect(generateNames.mock.calls[0]![0]).toEqual({ description: "a bakery", feels: ["warm"], exclude: ["dawnloaf"], count: 12 });
  });

  it("rejects requests it can't use", async () => {
    const app = build();
    const res = await post(app, "/api/search", { description: "x", tlds: ["com"] });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Describe what you're naming." });
    expect((await post(app, "/api/search", { description: "cups", tlds: [] })).status).toBe(400);
    expect((await post(app, "/api/search", { description: "cups", tlds: ["museum"] })).status).toBe(400);
  });

  it("ends the stream with an error event when generation fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const failing: GenerateNames = async function* () {
      yield { name: "first", why: "" };
      throw new Error("model down");
    };
    const stream = await events(await post(build({ generateNames: failing }), "/api/search", { description: "cups", tlds: ["com"] }));
    expect(stream.at(-1)).toMatchObject({ type: "error" });
    error.mockRestore();
  });

  it("limits searches per client per hour", async () => {
    const app = build({ rateLimit: createRateLimiter(1) });
    expect((await post(app, "/api/search", { description: "cups", tlds: ["com"] })).status).toBe(200);
    const res = await post(app, "/api/search", { description: "cups", tlds: ["com"] });
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("3600");
    expect(((await res.json()) as { error: string }).error).toMatch(/hourly limit/);
  });
});

describe("POST /api/check", () => {
  it("checks your own names without calling the model", async () => {
    const generateNames = vi.fn(ideas());
    const stream = await events(await post(build({ generateNames }), "/api/check", { names: ["My Name", "takenco"], tlds: ["com"] }));
    expect(generateNames).not.toHaveBeenCalled();
    expect(stream.filter((e) => e.type === "name").map((e) => e.type === "name" && e.name)).toEqual(["myname", "takenco"]);
    expect(stream.filter((e) => e.type === "domain")).toHaveLength(2);
  });
});

describe("GET /api/health", () => {
  it("says whether names are real", async () => {
    const res = await build({ demo: true }).request("/api/health");
    expect(await res.json()).toEqual({ ok: true, demo: true, model: "test-model" });
  });
});
