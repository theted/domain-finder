import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Hono } from "hono";
import { afterAll, describe, expect, it } from "vitest";
import { serveClient } from "./static.ts";

const dir = mkdtempSync(path.join(tmpdir(), "domain-finder-dist-"));
mkdirSync(path.join(dir, "assets"));
writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>app</title>");
writeFileSync(path.join(dir, "assets", "index-abc123.js"), "console.log(1)");
writeFileSync(path.join(dir, "favicon.svg"), "<svg/>");
afterAll(() => rmSync(dir, { recursive: true }));

const app = new Hono();
app.get("/api/health", (c) => c.json({ ok: true }));
serveClient(app, path.relative(process.cwd(), dir));

describe("serveClient", () => {
  it("lets browsers keep hashed assets for good", async () => {
    const res = await app.request("/assets/index-abc123.js");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  });

  it("makes browsers revalidate index.html and other unhashed files", async () => {
    for (const url of ["/", "/favicon.svg"]) {
      const res = await app.request(url);
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toBe("no-cache");
    }
  });

  it("answers unknown paths with index.html, also uncached", async () => {
    const res = await app.request("/some/deep/link");
    expect(await res.text()).toContain("<title>app</title>");
    expect(res.headers.get("cache-control")).toBe("no-cache");
  });

  it("leaves API routes alone", async () => {
    const res = await app.request("/api/health");
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get("cache-control")).toBeNull();
  });
});
