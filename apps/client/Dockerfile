FROM node:24-slim AS build
RUN corepack enable
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/client/package.json apps/client/
COPY apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile --filter @diskographia/client... --filter @diskographia/shared...

COPY packages/shared packages/shared
COPY apps/client apps/client

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_UPLOADS_URL
ARG NEXT_PUBLIC_PLATFORM_HANDLE
ARG NEXT_PUBLIC_HOME_SELECTION_SLUG
ARG NEXT_PUBLIC_HOME_SHOWCASE_SLUG
ARG NEXT_PUBLIC_PLATFORM_MANIFEST_SLUG
ARG NEXT_PUBLIC_DEMO_MODE

RUN pnpm --filter @diskographia/shared build && pnpm --filter @diskographia/client build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /repo/apps/client/.next/standalone ./
COPY --from=build /repo/apps/client/.next/static ./apps/client/.next/static
COPY --from=build /repo/apps/client/public ./apps/client/public

EXPOSE 3000
CMD ["node", "apps/client/server.js"]
