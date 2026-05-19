import { createSiweMessage } from 'viem/siwe';
import type { Address } from 'viem';

export function buildAdminSiwe(args: {
  address: Address;
  chainId: number;
  origin: string;
  nonce: string;
}): string {
  const url = new URL(args.origin);
  return createSiweMessage({
    address: args.address,
    chainId: args.chainId,
    domain: url.host,
    nonce: args.nonce,
    uri: args.origin,
    version: '1',
    statement: 'Sign in to NFTM Admin.',
    issuedAt: new Date(),
    expirationTime: new Date(Date.now() + 1000 * 60 * 10),
  });
}
