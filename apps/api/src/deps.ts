import { Redis } from 'ioredis';
import { getDb } from '@nftm/db';
import { getChain } from '@nftm/shared/chain';
import { createPublicClient, createWalletClient, http, type PublicClient, type WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { loadEnv, type Env } from './env.js';
import { createLogger } from './lib/logger.js';
import { createPinataClient, type PinataClient } from './services/pinata.js';

export interface Deps {
  env: Env;
  log: ReturnType<typeof createLogger>;
  db: ReturnType<typeof getDb>;
  redis: Redis;
  publicClient: PublicClient;
  voucherSigner?: WalletClient;
  pinata?: PinataClient;
}

let _deps: Deps | undefined;

export function getDeps(): Deps {
  if (_deps) return _deps;
  const env = loadEnv();
  const log = createLogger({ level: env.NODE_ENV === 'production' ? 'info' : 'debug' });
  const db = getDb();
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

  const chain = getChain(env.CHAIN_ID);
  const rpcUrl =
    env.CHAIN_ID === 8453
      ? env.BASE_RPC_URL
      : env.CHAIN_ID === 84532
        ? env.BASE_SEPOLIA_RPC_URL
        : env.ANVIL_RPC_URL;
  if (!rpcUrl) throw new Error(`No RPC URL configured for chain ${env.CHAIN_ID}`);

  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) }) as PublicClient;

  let voucherSigner: WalletClient | undefined;
  if (env.VOUCHER_SIGNER_PRIVATE_KEY) {
    const account = privateKeyToAccount(env.VOUCHER_SIGNER_PRIVATE_KEY);
    voucherSigner = createWalletClient({ account, chain, transport: http(rpcUrl) });
  }

  const pinata = env.PINATA_JWT
    ? createPinataClient({ jwt: env.PINATA_JWT, gateway: env.PINATA_GATEWAY_URL })
    : undefined;

  _deps = { env, log, db, redis, publicClient, voucherSigner, pinata };
  return _deps;
}
