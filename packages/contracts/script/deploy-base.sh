#!/usr/bin/env bash
# Deploy NFTCollection (implementation) + Marketplace + CollectionFactory to
# Base mainnet, wire REGISTRAR_ROLE, and write addresses to deployments/8453.json.
#
# Required env (sourced from repo-root .env):
#   BASE_RPC_URL                 — Base mainnet RPC
#   SUPER_ADMIN_PRIVATE_KEY      — deployer key; becomes DEFAULT_ADMIN_ROLE
#   USDC_ADDRESS                 — 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
#   TREASURY_ADDRESS             — receives primary sales + platform fees
#   VOUCHER_SIGNER_ADDRESS       — holds MINTER_ROLE on each new collection
#   ETHERSCAN_API_KEY            — for --verify on Basescan (Etherscan-compatible)
#
# Usage:
#   pnpm -F @nftm/contracts deploy:base

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../../.." && pwd)

if [[ ! -f "$REPO_ROOT/.env" ]]; then
  echo "✗ $REPO_ROOT/.env not found. Copy .env.example to .env and fill it in." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$REPO_ROOT/.env"
set +a

missing=()
for var in BASE_RPC_URL SUPER_ADMIN_PRIVATE_KEY USDC_ADDRESS TREASURY_ADDRESS VOUCHER_SIGNER_ADDRESS; do
  if [[ -z "${!var:-}" ]]; then missing+=("$var"); fi
done
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "✗ Missing required env vars: ${missing[*]}" >&2
  exit 1
fi

if [[ "${USDC_ADDRESS,,}" != "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" ]]; then
  echo "⚠ USDC_ADDRESS ($USDC_ADDRESS) does not match the canonical Base mainnet USDC."
  read -r -p "Continue anyway? [y/N] " ans
  [[ "${ans,,}" == "y" ]] || exit 1
fi

cd "$SCRIPT_DIR/.."

verify_flag=""
if [[ -n "${ETHERSCAN_API_KEY:-}" ]]; then
  verify_flag="--verify"
else
  echo "⚠ ETHERSCAN_API_KEY not set — skipping --verify (contracts won't be auto-verified)."
fi

# Deploy.s.sol reads SUPER_ADMIN_PRIVATE_KEY via vm.envUint and calls
# vm.startBroadcast(pk), so we don't need --private-key on the CLI.
echo "→ forge script Deploy.s.sol → Base mainnet (chainId 8453)"
forge script script/Deploy.s.sol \
  --rpc-url "$BASE_RPC_URL" \
  --broadcast \
  $verify_flag

echo
echo "✓ Deploy complete. Addresses written to packages/contracts/deployments/8453.json."
echo "  Copy them into the repo-root .env (FACTORY_ADDRESS, MARKETPLACE_ADDRESS,"
echo "  NFT_COLLECTION_IMPLEMENTATION_ADDRESS), then run:"
echo "    pnpm compose:up && pnpm db:migrate && pnpm db:seed"
