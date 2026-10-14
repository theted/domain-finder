import { existsSync } from "node:fs";
import path from "node:path";
import { serve } from "@hono/node-server";
import { getConnInfo } from "@hono/node-server/conninfo";
import { createApp } from "./app.ts";
import { createAvailabilityChecker } from "./availability.ts";
import { createDemoNames, createOpenAiNames } from "./names.ts";
import { clientAddress, createRateLimiter } from "./rate-limit.ts";
import { serveClient } from "./static.ts";

const env = process.env;
const port = Number(env.PORT ?? 5000);
const hostname = env.HOST ?? "127.0.0.1";
const apiKey = env.OPENAI_API_KEY?.trim();
const model = env.OPENAI_MODEL?.trim() || "gpt-6-luna";
const demo = env.DEMO === "true" || !apiKey;
const proxyHops = env.TRUST_PROXY === "true" ? 1 : Number(env.TRUST_PROXY) || 0;

const app = createApp({
  generateNames: demo ? createDemoNames() : createOpenAiNames({ apiKey: apiKey!, model }),
  checkDomain: createAvailabilityChecker(),
  rateLimit: createRateLimiter(Number(env.SEARCHES_PER_HOUR ?? 30)),
  clientKey: (c) => clientAddress(c.req.header("x-forwarded-for"), getConnInfo(c).remote.address, proxyHops),
  demo,
  model,
});

// In production the built client is served from the same origin as the API.
const dist = path.relative(process.cwd(), path.join(import.meta.dirname, "..", "dist"));
if (existsSync(dist)) serveClient(app, dist);

const server = serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`domain-finder listening on http://${info.address}:${info.port}`);
  console.log(demo ? "Demo mode: names are canned (set OPENAI_API_KEY for real ones)." : `Names from OpenAI ${model}.`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => server.close(() => process.exit(0)));
}
