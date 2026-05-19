import { createSiweMessage } from 'viem/siwe';
import type { Address } from 'viem';

export interface BuildSiweArgs {
  address: Address;
  chainId: number;
  origin: string;
  nonce: string;
  statement?: string;
}

export function buildSiwe(args: BuildSiweArgs): string {
  const url = new URL(args.origin);
  return createSiweMessage({
    address: args.address,
    chainId: args.chainId,
    domain: url.host,
    nonce: args.nonce,
    uri: args.origin,
    version: '1',
    statement: args.statement ?? 'Sign in to FreedomFi NFT Marketplace.',
    issuedAt: new Date(),
    expirationTime: new Date(Date.now() + 1000 * 60 * 10),
  });
}
