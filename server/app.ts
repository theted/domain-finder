import { Hono, type Context } from "hono";
import { stream } from "hono/streaming";
import { z } from "zod";
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  FEELS,
  MAX_FEELS,
  MAX_OWN_NAMES,
  MAX_TLDS,
  NAMES_PER_BATCH,
  TLDS,
  toLabel,
  type DomainResult,
  type HealthResponse,
  type StreamEvent,
  type Tld,
} from "../shared/domain.ts";
import type { GenerateNames } from "./names.ts";
import type { RateLimiter } from "./rate-limit.ts";

export type AppDeps = {
  generateNames: GenerateNames;
  checkDomain: (name: string, tld: Tld) => Promise<DomainResult>;
  rateLimit: RateLimiter;
  clientKey: (c: Context) => string;
  demo: boolean;
  model: string;
};

const tlds = z.array(z.enum(TLDS)).min(1, "Pick at least one domain ending.").max(MAX_TLDS);

const SearchSchema = z.object({
  description: z.string().trim().min(DESCRIPTION_MIN, "Describe what you're naming.").max(DESCRIPTION_MAX),
  feels: z.array(z.enum(FEELS)).max(MAX_FEELS).default([]),
  tlds,
  exclude: z.array(z.string().max(63)).max(300).default([]),
});

const CheckSchema = z.object({
  names: z.array(z.string().max(80)).min(1).max(MAX_OWN_NAMES),
  tlds,
});

type Send = (event: StreamEvent) => Promise<void>;

// Responses are newline-delimited JSON: one StreamEvent per line, ending with
// "done" or "error". Writes are chained so concurrent domain checks can't interleave.
const ndjson = (c: Context, run: (send: Send, signal: AbortSignal) => Promise<void>) => {
  c.header("content-type", "application/x-ndjson; charset=utf-8");
  c.header("cache-control", "no-store");
  c.header("x-accel-buffering", "no");

  return stream(c, async (out) => {
    const abort = new AbortController();
    out.onAbort(() => abort.abort());

    let queue = Promise.resolve();
    const send: Send = (event) =>
      (queue = queue.then(async () => {
        if (!out.aborted) await out.write(`${JSON.stringify(event)}\n`);
      }));

    try {
      await run(send, abort.signal);
      await send({ type: "done" });
    } catch (error) {
      if (abort.signal.aborted) return;
      console.error("Stream failed:", error);
      await send({ type: "error", message: "Name ideas couldn't be generated. Try again in a moment." });
    }
  });
};

const badRequest = (c: Context, error: z.ZodError) =>
  c.json({ error: error.issues[0]?.message ?? "Invalid request." }, 400);

export const createApp = (deps: AppDeps) => {
  const app = new Hono();

  app.get("/api/health", (c) => c.json<HealthResponse>({ ok: true, demo: deps.demo, model: deps.model }));

  app.post("/api/search", async (c) => {
    const parsed = SearchSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return badRequest(c, parsed.error);

    const limited = deps.rateLimit(deps.clientKey(c));
    if (!limited.ok) {
      const minutes = Math.ceil(limited.retryAfterSeconds / 60);
      c.header("retry-after", String(limited.retryAfterSeconds));
      return c.json(
        { error: `That's the hourly limit for name searches. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` },
        429,
      );
    }

    const { description, feels, tlds, exclude } = parsed.data;
    return ndjson(c, async (send, signal) => {
      const seen = new Set(exclude.map(toLabel).filter((label) => label !== null));
      const checks: Promise<void>[] = [];

      const ideas = deps.generateNames(
        { description, feels, exclude: [...seen], count: NAMES_PER_BATCH },
        signal,
      );
      let count = 0;
      for await (const idea of ideas) {
        const name = toLabel(idea.name);
        if (!name || seen.has(name)) continue;
        seen.add(name);
        count++;
        await send({ type: "name", name, why: idea.why.trim() });
        for (const tld of tlds) checks.push(deps.checkDomain(name, tld).then((r) => send({ type: "domain", ...r })));
      }
      await send({ type: "generated", count });
      await Promise.all(checks);
    });
  });

  app.post("/api/check", async (c) => {
    const parsed = CheckSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return badRequest(c, parsed.error);

    const names = [...new Set(parsed.data.names.map(toLabel).filter((label) => label !== null))];
    if (!names.length) return c.json({ error: "Use letters, digits or hyphens, at least two characters." }, 400);

    return ndjson(c, async (send) => {
      const checks = names.flatMap((name) => [
        send({ type: "name", name, why: "" }),
        ...parsed.data.tlds.map((tld) => deps.checkDomain(name, tld).then((r) => send({ type: "domain", ...r }))),
      ]);
      await Promise.all(checks);
    });
  });

  app.all("/api/*", (c) => c.json({ error: "Not found." }, 404));

  return app;
};
