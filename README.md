# FreedomFi NFT Marketplace

B2C NFT marketplace on **Base**. Admin team mints NFTs (ERC-1155) and sells them to retail buyers in USDC; holders can resell on the secondary market with EIP-2981 royalty + a platform fee.

## Layout

```
apps/
  dapp/        SvelteKit 2 storefront (buyer-facing)
  admin/       SvelteKit 2 admin dashboard
  api/         Hono REST/JSON API
  indexer/     Node worker — chain event indexer + BullMQ jobs
packages/
  contracts/   Foundry — Solidity sources + tests
  db/          Drizzle ORM schema + migrations
  shared/      Zod schemas, EIP-712 typed-data, chain constants
  sdk/         Typed API client (generated)
  ui/          Shared Svelte components + Tailwind preset
docker-compose.yml
.env.example
```

## Quick start

```sh
cp .env.example .env   # then fill in secrets
pnpm install
pnpm compose:up
pnpm dev
```

DApp: <http://localhost:9301> · Admin: <http://localhost:9302>

> First time only: `git init` at the repo root (Foundry uses git submodules for contract deps), then `cd packages/contracts && forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts OpenZeppelin/openzeppelin-contracts-upgradeable`.

In production the VPS nginx terminates TLS and proxies:

- `nft-marketplace.projects.erennevin.xyz` → `127.0.0.1:9301`
- `nft-marketplace-admin.projects.erennevin.xyz` → `127.0.0.1:9302`

## Stack

| Layer | Choice |
| --- | --- |
| Runtime | Node 22 LTS, pnpm 10, Turborepo 2 |
| Frontend | SvelteKit 2, Svelte 5 (runes), Tailwind 4 |
| API | Hono 4, Zod, pino |
| DB / cache | Postgres 16 (Drizzle ORM), Redis 7 (BullMQ) |
| Chain | viem 2, Foundry, OpenZeppelin v5, Base mainnet + Base Sepolia |
| Storage | IPFS via Pinata |
| Auth | SIWE (EIP-4361) |

## License

MIT — see [LICENSE](./LICENSE).
