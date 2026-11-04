FROM node:24-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.16.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY src ./src
COPY drizzle ./drizzle
COPY scripts/start.js ./scripts/start.js
RUN mkdir /app/data && chown node:node /app/data
USER node
EXPOSE 3000
CMD ["node", "scripts/start.js"]
