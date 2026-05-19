import { base, baseSepolia, foundry } from 'viem/chains';
import type { Address, Chain } from 'viem';

export const SUPPORTED_CHAIN_IDS = [base.id, baseSepolia.id, foundry.id] as const;
export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

export const CHAINS: Record<SupportedChainId, Chain> = {
  [base.id]: base,
  [baseSepolia.id]: baseSepolia,
  [foundry.id]: foundry,
};

export function getChain(chainId: number): Chain {
  if (!isSupportedChainId(chainId)) throw new Error(`Unsupported chainId: ${chainId}`);
  return CHAINS[chainId];
}

export function isSupportedChainId(chainId: number): chainId is SupportedChainId {
  return (SUPPORTED_CHAIN_IDS as readonly number[]).includes(chainId);
}

// Canonical USDC addresses. Anvil/foundry uses whatever the local deploy script picks;
// it must be passed in via env on dev. Mainnet/Sepolia are hardcoded.
export const USDC_ADDRESS_BY_CHAIN: Record<SupportedChainId, Address | undefined> = {
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [baseSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  [foundry.id]: undefined,
};

// USDC uses 6 decimals on every chain we support.
export const USDC_DECIMALS = 6;

// Number of confirmations the indexer waits before marking a row final.
export const FINALITY_CONFIRMATIONS = 12;

// EIP-712 domain name + version — must match the Marketplace contract literals exactly.
export const MARKETPLACE_EIP712_DOMAIN_NAME = 'NftmMarketplace';
export const MARKETPLACE_EIP712_DOMAIN_VERSION = '1';
