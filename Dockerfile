# The browser bundle is built here; at runtime Node runs the TypeScript server
# directly (type stripping), so there is no server build step.
FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx vite build

FROM node:26-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=5000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
COPY shared ./shared
COPY --from=build /app/dist ./dist
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:5000/api/health || exit 1
CMD ["node", "server/index.ts"]
