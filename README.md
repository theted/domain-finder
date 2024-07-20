# Domain-finder

Tool for generating suggestions for domain names, as well as checking their avilability.

- Generates suggestions for domain names matching the users' business, utilizing [OpenAI API]
- Processing queues for domain name availability checks using [Bull], WHOIS/DNS lookup using [Domainr] -
- Real-time updates to the client using [Socket.io]
- React frontend

## Dependencies & installation

Altough [Bun] i the runtime used, **npm** is used for package management, so dependenencies are installed like so:

```
npm install
```

### Starting using `start-dev-environment`

To spin up a development environment, the `start-dev-environment` shorthand may be used for starting a `server`, `worker`, and `client` in separate processes in a single command:

```
npm run start-dev-environment
```

### Starting processes individually

Alternatively, start the processes separately:

#### Start the server

```
npm run start-server
```

#### Start at least one worker

```
npm run start-worker
```

#### Start the client (if in development mode)

```
npm run dev
```

[Domainr]: https://domainr.com
[OpenAI API]: https://openai.com/api/
[Bull]: https://bullmq.io/
[Socket.io]: https://socket.io/
[Bun]: https://bun.sh/
