import { parseSiweMessage, verifySiweMessage } from 'viem/siwe';
import type { Address, PublicClient } from 'viem';
import { nanoid } from 'nanoid';
import type { Redis } from 'ioredis';

const NONCE_PREFIX = 'siwe:nonce:';
const NONCE_TTL_SECONDS = 60 * 5;

export async function issueNonce(redis: Redis, address: Address): Promise<string> {
  const nonce = nanoid(24).replace(/[-_]/g, 'A'); // SIWE requires alphanumeric nonces
  await redis.set(`${NONCE_PREFIX}${address.toLowerCase()}:${nonce}`, '1', 'EX', NONCE_TTL_SECONDS);
  return nonce;
}

export async function consumeNonce(redis: Redis, address: Address, nonce: string): Promise<boolean> {
  const key = `${NONCE_PREFIX}${address.toLowerCase()}:${nonce}`;
  const deleted = await redis.del(key);
  return deleted === 1;
}

export interface VerifiedSiwe {
  address: Address;
  domain: string;
  uri: string;
  chainId: number;
}

export async function verifySiwe(args: {
  publicClient: PublicClient;
  message: string;
  signature: `0x${string}`;
  redis: Redis;
  expectedDomain: string;
  expectedChainId: number;
}): Promise<VerifiedSiwe | { error: string }> {
  let parsed: ReturnType<typeof parseSiweMessage>;
  try {
    parsed = parseSiweMessage(args.message);
  } catch (err) {
    return { error: `parse: ${(err as Error).message}` };
  }
  if (!parsed.address) return { error: 'missing address' };
  if (parsed.domain !== args.expectedDomain) return { error: `domain mismatch: ${parsed.domain}` };
  if (parsed.chainId !== args.expectedChainId) {
    return { error: `chain mismatch: ${parsed.chainId}` };
  }
  if (parsed.expirationTime && parsed.expirationTime.getTime() < Date.now()) {
    return { error: 'message expired' };
  }
  if (parsed.notBefore && parsed.notBefore.getTime() > Date.now()) {
    return { error: 'not yet valid' };
  }
  if (!parsed.nonce) return { error: 'missing nonce' };

  // Consume nonce — single-use. If it doesn't exist (already used or expired), reject.
  const ok = await consumeNonce(args.redis, parsed.address as Address, parsed.nonce);
  if (!ok) return { error: 'nonce invalid or already used' };

  const isValid = await verifySiweMessage(args.publicClient, {
    address: parsed.address as Address,
    message: args.message,
    signature: args.signature,
  });
  if (!isValid) return { error: 'signature invalid' };

  return {
    address: parsed.address as Address,
    domain: parsed.domain ?? args.expectedDomain,
    uri: parsed.uri ?? '',
    chainId: parsed.chainId ?? args.expectedChainId,
  };
}
