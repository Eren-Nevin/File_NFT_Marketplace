# @nftm/contracts

Solidity 0.8.24 + Foundry + OpenZeppelin v5.

## Install

`forge install` manages deps via git submodules, so a `.git` directory must exist at the repo root.

```sh
# from repo root, only once:
git init -q

# then:
cd packages/contracts
forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts OpenZeppelin/openzeppelin-contracts-upgradeable
```

> Recent Foundry versions removed `--no-commit` — it's now the default. If you actually want to auto-commit submodule additions, pass `--commit` instead.

## Build & test

```sh
forge build
forge test -vvv
forge coverage
```

## Deploy (Base mainnet)

Fill out the repo-root `.env` (see `.env.example` for the full list — the deploy-only block at the bottom is required), then:

```sh
pnpm -F @nftm/contracts deploy:base
```

This wraps `forge script script/Deploy.s.sol`, loads `.env`, validates required vars, and broadcasts to Base (chainId 8453). Addresses are written to `deployments/8453.json`. Copy them back into `.env` as `FACTORY_ADDRESS`, `MARKETPLACE_ADDRESS`, and `NFT_COLLECTION_IMPLEMENTATION_ADDRESS`.

### What gets deployed
1. `NFTCollection` implementation (one shared logic contract — clones are cheap).
2. `Marketplace` (USDC fixed-price + EIP-712 vouchers, owner = your `SUPER_ADMIN`).
3. `CollectionFactory` (your `SUPER_ADMIN` is `DEFAULT_ADMIN_ROLE` + `DEPLOYER_ROLE`).
4. `Marketplace.grantRole(REGISTRAR_ROLE, factory)` so new collections auto-register.

### Pre-flight checklist
- [ ] `forge test -vvv` is green locally.
- [ ] `SUPER_ADMIN` (deployer) wallet holds enough ETH on Base for ~3 contract deploys + one role grant (~0.005 ETH at typical gas).
- [ ] `TREASURY_ADDRESS` is a wallet you actually control.
- [ ] `VOUCHER_SIGNER_ADDRESS` matches the public key for `VOUCHER_SIGNER_PRIVATE_KEY`.
- [ ] `BASE_RPC_URL` is a paid/private endpoint (free public RPCs can rate-limit mid-deploy).

## Deploy (Base Sepolia)

```sh
export BASE_SEPOLIA_RPC_URL=...
export SUPER_ADMIN_PRIVATE_KEY=0x...
export VOUCHER_SIGNER_ADDRESS=0x...
export TREASURY_ADDRESS=0x...
export USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

pnpm -F @nftm/contracts deploy:sepolia
```

## Contracts

- `NFTCollection.sol` — clonable ERC-1155 + EIP-2981 + per-token URI.
- `CollectionFactory.sol` — deterministic EIP-1167 clones of NFTCollection.
- `Marketplace.sol` — USDC fixed-price marketplace: primary via EIP-712 lazy-mint vouchers, secondary with royalty + platform fee.
