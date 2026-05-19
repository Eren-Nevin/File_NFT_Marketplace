FROM node:22-alpine AS base
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.6.0 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml* package.json ./
COPY apps/indexer/package.json apps/indexer/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/db packages/db
COPY apps/indexer apps/indexer
RUN pnpm -F @nftm/shared build && pnpm -F @nftm/db build && pnpm -F @nftm/indexer build

FROM node:22-alpine AS runner
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.6.0 --activate
WORKDIR /repo
COPY --from=build /repo /repo
WORKDIR /repo/apps/indexer
CMD ["node", "dist/main.js"]
