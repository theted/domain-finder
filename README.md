# Domain finder

Describe what you're naming and get name ideas, each checked for a free domain while you watch.

- **Names** come from OpenAI (`gpt-6-luna` by default), streamed as structured output so the first
  names show up within a second or two.
- **Availability** comes from the registries' public [RDAP] servers, found through IANA's bootstrap
  file. Endings without RDAP (.co and .se, for example) fall back to DNS and are marked "probably
  free". There is no paid availability API.
- **One process**: a [Hono] server on Node streams newline-delimited JSON to a React client, and
  serves the built client in production.

Free domains show as blue links to the registrar. Taken ones show as purple, struck-through links
to the site.

## Running it

Needs Node 24 or newer (`.nvmrc` says 26).

```sh
cp .env.sample .env   # add OPENAI_API_KEY; without one the app runs in demo mode
npm install
npm run dev           # API on :5000, Vite on http://127.0.0.1:5173
```

Production, either directly:

```sh
npx vite build && npm start   # serves the app and API on :5000
```

or with Docker, the way it runs on the server:

```sh
docker compose up --build     # http://127.0.0.1:8088, localhost only
```

## Configuration

| Variable            | Default      |                                                         |
| ------------------- | ------------ | ------------------------------------------------------- |
| `OPENAI_API_KEY`    | —            | Without it, names are canned (demo mode)                |
| `OPENAI_MODEL`      | `gpt-6-luna` | Any model that supports structured outputs              |
| `PORT` / `HOST`     | `5000` / `127.0.0.1` | The Docker image sets `HOST=0.0.0.0`            |
| `SEARCHES_PER_HOUR` | `30`         | Per client IP; `0` turns the limit off                  |
| `TRUST_PROXY`       | `0`          | Proxies to trust `X-Forwarded-For` from; compose sets 1 |

## Checks

```sh
npm run lint
npm run typecheck
npm test
```

Tests never call OpenAI, a registry or DNS. CI runs all three and builds the Docker image.

## Deploy

Deploys to **domains.sundbergsolutions.se**, on the shared EC2 box, following the conventions in
`theted/infrastructure` (`ec2-docker.md`, `the-box.md`):

- Every push to master that passes CI runs `theted/workflows`' `deploy-ec2.yml`. It checks out that
  commit in `/opt/domain-finder` on the box and runs `docker compose up -d --build`.
- The container listens on `127.0.0.1:8088`, a port claimed in `the-box.md`. The host nginx
  terminates TLS (certbot) and proxies to it.
- `/opt/domain-finder/.env` (mode 600, not in git) holds `OPENAI_API_KEY`. The deploy refuses to
  start without that file.
- Results stream as NDJSON. The server sends `X-Accel-Buffering: no`, so nginx passes each line
  through as it's written instead of buffering the whole response.
- Search limits, the availability cache and the RDAP bootstrap live in memory, so a restart resets
  them. That's fine for a single container. There's no Redis or database.

[RDAP]: https://www.icann.org/rdap
[Hono]: https://hono.dev
