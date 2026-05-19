FROM node:22-alpine AS base
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.6.0 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml* package.json ./
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY packages/shared packages/shared
COPY packages/db packages/db
COPY tsconfig.base.json ./
RUN pnpm -F @nftm/shared build && pnpm -F @nftm/db build

FROM build AS runner
WORKDIR /repo/packages/db
CMD ["sh", "-c", "pnpm migrate && pnpm seed"]
