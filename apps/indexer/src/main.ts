import { createPublicClient, http, type PublicClient } from 'viem';
import { getChain } from '@nftm/shared/chain';
import { getDb, closeDb } from '@nftm/db';
import pino from 'pino';
import { loadEnv } from './env.js';
import { FACTORY_EVENTS_ABI, MARKETPLACE_EVENTS_ABI } from './abis.js';
import { getOrInitCursor, setCursor } from './cursors.js';
import {
  handleCancelled,
  handleCollectionCreated,
  handleListed,
  handlePrimarySale,
  handleSecondarySale,
} from './handlers.js';

const env = loadEnv();
const log = pino({ level: env.NODE_ENV === 'production' ? 'info' : 'debug' });
const db = getDb();

const chain = getChain(env.CHAIN_ID);
const rpcUrl =
  env.CHAIN_ID === 8453
    ? env.BASE_RPC_URL
    : env.CHAIN_ID === 84532
      ? env.BASE_SEPOLIA_RPC_URL
      : env.ANVIL_RPC_URL;
if (!rpcUrl) throw new Error(`No RPC URL configured for chain ${env.CHAIN_ID}`);

const client = createPublicClient({ chain, transport: http(rpcUrl) }) as PublicClient;

async function pollOnce(contract: `0x${string}`, abi: readonly unknown[], onEvent: (ev: any) => Promise<void>) {
  const head = await client.getBlockNumber();
  const fromBlock = await getOrInitCursor(db, env.CHAIN_ID, contract, head);
  if (head <= fromBlock) return;
  const toBlock = head;

  // viem getLogs caps at provider-dependent ranges; chunk safely.
  const CHUNK = 1000n;
  let from = fromBlock + 1n;
  while (from <= toBlock) {
    const end = from + CHUNK - 1n < toBlock ? from + CHUNK - 1n : toBlock;
    const logs = await client.getContractEvents({
      address: contract,
      abi: abi as never,
      fromBlock: from,
      toBlock: end,
    });
    for (const lg of logs) {
      try {
        await onEvent(lg);
      } catch (err) {
        log.error({ err, log: lg }, 'event handler failed');
      }
    }
    from = end + 1n;
  }
  await setCursor(db, env.CHAIN_ID, contract, toBlock);
}

async function tick() {
  try {
    if (env.FACTORY_ADDRESS) {
      await pollOnce(env.FACTORY_ADDRESS, FACTORY_EVENTS_ABI as never, async (lg: any) => {
        if (lg.eventName !== 'CollectionCreated') return;
        await handleCollectionCreated(db, env.CHAIN_ID, {
          address: lg.args.collection,
          txHash: lg.transactionHash,
          blockNumber: lg.blockNumber,
          name: lg.args.name,
          symbol: lg.args.symbol,
          royaltyReceiver: lg.args.royaltyReceiver,
          royaltyBps: Number(lg.args.royaltyBps),
          platformFeeBps: Number(lg.args.platformFeeBps),
          deployer: lg.args.admin,
          salt: lg.args.salt,
        });
      });
    }
    if (env.MARKETPLACE_ADDRESS) {
      await pollOnce(env.MARKETPLACE_ADDRESS, MARKETPLACE_EVENTS_ABI as never, async (lg: any) => {
        switch (lg.eventName) {
          case 'PrimarySale':
            await handlePrimarySale(db, env.CHAIN_ID, {
              voucherHash: lg.args.voucherHash,
              collection: lg.args.collection,
              tokenId: lg.args.tokenId,
              buyer: lg.args.buyer,
              amount: lg.args.amount,
              totalPaid: lg.args.totalPaid,
              txHash: lg.transactionHash,
              logIndex: lg.logIndex,
              blockNumber: lg.blockNumber,
            });
            break;
          case 'Listed':
            await handleListed(db, env.CHAIN_ID, {
              listingId: lg.args.listingId,
              seller: lg.args.seller,
              collection: lg.args.collection,
              tokenId: lg.args.tokenId,
              amount: lg.args.amount,
              pricePerUnit: lg.args.pricePerUnit,
              txHash: lg.transactionHash,
            });
            break;
          case 'Cancelled':
            await handleCancelled(db, { listingId: lg.args.listingId });
            break;
          case 'SecondarySale':
            await handleSecondarySale(db, env.CHAIN_ID, {
              listingId: lg.args.listingId,
              buyer: lg.args.buyer,
              seller: lg.args.seller,
              collection: lg.args.collection,
              tokenId: lg.args.tokenId,
              amount: lg.args.amount,
              totalPaid: lg.args.totalPaid,
              royaltyAmount: lg.args.royaltyAmount,
              platformFee: lg.args.platformFee,
              txHash: lg.transactionHash,
              logIndex: lg.logIndex,
              blockNumber: lg.blockNumber,
            });
            break;
        }
      });
    }
  } catch (err) {
    log.error({ err }, 'tick failed');
  }
}

async function main() {
  if (!env.FACTORY_ADDRESS && !env.MARKETPLACE_ADDRESS) {
    log.warn('Neither FACTORY_ADDRESS nor MARKETPLACE_ADDRESS set; indexer idling');
  }
  log.info({ chainId: env.CHAIN_ID, factory: env.FACTORY_ADDRESS, marketplace: env.MARKETPLACE_ADDRESS }, 'indexer starting');

  // Long-running loop
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (;;) {
    await tick();
    await new Promise((r) => setTimeout(r, env.POLL_INTERVAL_MS));
  }
}

main().catch(async (err) => {
  log.error({ err }, 'indexer crashed');
  await closeDb();
  process.exit(1);
});
