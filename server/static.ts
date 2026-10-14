import { serveStatic } from "@hono/node-server/serve-static";
import type { Context, Hono, MiddlewareHandler } from "hono";

// Hashed files under /assets/ never change, so browsers may keep them for a year. Everything
// else, index.html above all, must be revalidated: a browser holding yesterday's index.html
// would ask for asset hashes the new build no longer has, and render a blank page.
const cacheControl = (file: string) =>
  file.includes("/assets/") ? "public, max-age=31536000, immutable" : "no-cache";

// Serves the built client from `root` (relative to the working directory), with index.html as
// the fallback for any path the API and the files don't answer.
export const serveClient = (app: Hono, root: string) => {
  // serveStatic calls onFound after it has built its Response, so a c.header() there only
  // lands by accident of @hono/node-server's lightweight Response. Note which file was
  // served instead, and set the header on the returned response.
  const served = new WeakMap<Context, string>();
  const onFound = (file: string, c: Context) => void served.set(c, file);

  const withCacheControl =
    (handler: MiddlewareHandler): MiddlewareHandler =>
    async (c, next) => {
      const res = await handler(c, next);
      const file = served.get(c);
      if (!(res instanceof Response) || !file) return res;
      const out = new Response(res.body, res);
      out.headers.set("cache-control", cacheControl(file));
      return out;
    };

  app.use("/*", withCacheControl(serveStatic({ root, onFound })));
  app.get("*", withCacheControl(serveStatic({ root, path: "index.html", onFound })));
};
