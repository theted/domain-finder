# Domain-finder

Tool for generating suggestions for domain names, as well as checking their avilability.

- Generates suggestions for domain names matching the users' business, utilizing [OpenAI API]
- Processing queues for domain name availability checks using [Bull], WHOIS/DNS lookup using [Domainr] -
- Real-time updates to the client using [Socket.io]
- React frontend

## Starting the application

Start the server

```
npx ts-node backend/server.ts
```

Start at least one worker

```
npx ts-node backend/worker.ts
```

Start the client (if in development mode)

```
npm run start
```

[Domainr]: https://domainr.com
[OpenAI API]: https://openai.com/api/
[Bull]: https://bullmq.io/
[Socket.io]: https://socket.io/
