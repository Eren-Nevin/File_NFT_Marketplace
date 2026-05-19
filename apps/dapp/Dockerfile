FROM node:22-alpine AS base
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.6.0 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml* package.json ./
COPY apps/dapp/package.json apps/dapp/
COPY packages/shared/package.json packages/shared/
COPY packages/sdk/package.json packages/sdk/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/sdk packages/sdk
COPY packages/ui packages/ui
COPY apps/dapp apps/dapp
RUN pnpm -F @nftm/shared build && pnpm -F @nftm/sdk build && pnpm -F @nftm/ui build && pnpm -F @nftm/dapp build

FROM node:22-alpine AS runner
ENV NODE_ENV=production
ENV PORT=3000
RUN corepack enable && corepack prepare pnpm@10.6.0 --activate
WORKDIR /repo
COPY --from=build /repo /repo
WORKDIR /repo/apps/dapp
EXPOSE 3000
CMD ["node", "build/index.js"]
