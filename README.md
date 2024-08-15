# Domain-finder

Tool for generating suggestions for domain names, as well as checking their avilability.

- Generates suggestions for domain names matching the users' business, utilizing [OpenAI API]
- Processing queues for domain name availability checks using [Bull], WHOIS/DNS lookup using [DomainR] -
- Real-time updates to the client using [Socket.io]
- [React] frontend

### Set environment variables

Set your environment variables in an [`.env`](./.env.sample) file:

```
cp .env.sample .env
```

It contains config for [OpenAI API] and [DomainR] credentials.

### Running in Docker

Easiest way to run the app is using [Docker]:

```
docker-compose up
```

## Dependencies & installation

[Bun] and [Redis] are dependencies. Install package dependencies using [Bun]:

```
bun install
```

### Starting environment using `start-dev-environment`

To spin up a development environment, the `start-dev-environment` shorthand may be used for starting a `server`, `worker`, and `client` in separate processes in a single command:

```
bun start-dev-environment
```

### Starting processes individually

Alternatively, start the processes separately:

#### Start the server

```
bun start-server
```

#### Start at least one worker

```
bun start-worker
```

#### Start the client (in development mode)

```
bun dev
```

[DomainR]: https://domainr.com
[OpenAI API]: https://openai.com/api/
[Bull]: https://bullmq.io/
[Socket.io]: https://socket.io/
[React]: https://reactjs.org/
[Bun]: https://bun.sh/
[Redis]: https://redis.io/
[Docker]: https://www.docker.com/
