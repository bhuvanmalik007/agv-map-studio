# The assignment explicitly requires Debian Bullseye as the foundation.
FROM debian:bullseye-slim AS base

# Reuse the official Node distribution without changing the Debian base image.
FROM node:22-bullseye-slim AS node-runtime

FROM base AS build
COPY --from=node-runtime /usr/local/ /usr/local/
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts vitest.config.ts tsconfig*.json ./
COPY shared ./shared
COPY client ./client
COPY server ./server
COPY data ./data
RUN npm run build && npm prune --omit=dev

FROM base AS runtime
COPY --from=node-runtime /usr/local/ /usr/local/
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/data ./data

RUN groupadd --system app && \
    useradd --system --gid app --home-dir /app app && \
    chown -R app:app /app/data

USER app
EXPOSE 3000
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "dist/server/server/index.js"]
