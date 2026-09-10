FROM node:24-slim AS build
RUN corepack enable
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
COPY apps/client/package.json apps/client/
RUN pnpm install --frozen-lockfile --filter @diskographia/server... --filter @diskographia/shared...

COPY packages/shared packages/shared
COPY apps/server apps/server
RUN pnpm --filter @diskographia/shared build && pnpm --filter @diskographia/server build

FROM node:24-slim
RUN corepack enable
WORKDIR /repo
ENV NODE_ENV=production

COPY --from=build /repo /repo
WORKDIR /repo/apps/server

EXPOSE 4000
CMD ["node", "dist/main.js"]
