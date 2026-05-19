import type { Address, Hex, TypedDataDomain } from 'viem';
import {
  MARKETPLACE_EIP712_DOMAIN_NAME,
  MARKETPLACE_EIP712_DOMAIN_VERSION,
} from './chain.js';

// EIP-712 LazyVoucher — mirror this struct in the Marketplace contract.
export const LAZY_VOUCHER_TYPES = {
  LazyVoucher: [
    { name: 'collection', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'maxAmount', type: 'uint256' },
    { name: 'pricePerUnit', type: 'uint256' },
    { name: 'tokenURI', type: 'string' },
    { name: 'expiresAt', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

export type LazyVoucher = {
  collection: Address;
  tokenId: bigint;
  maxAmount: bigint;
  pricePerUnit: bigint;
  tokenURI: string;
  expiresAt: bigint;
  nonce: bigint;
};

export function marketplaceDomain(chainId: number, marketplace: Address): TypedDataDomain {
  return {
    name: MARKETPLACE_EIP712_DOMAIN_NAME,
    version: MARKETPLACE_EIP712_DOMAIN_VERSION,
    chainId,
    verifyingContract: marketplace,
  };
}

export type SignedLazyVoucher = {
  voucher: LazyVoucher;
  signature: Hex;
  signer: Address;
};
