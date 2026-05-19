import { eq, and } from 'drizzle-orm';
import { indexerCursors } from '@nftm/db/schema';
import type { getDb } from '@nftm/db';

export async function getOrInitCursor(
  db: ReturnType<typeof getDb>,
  chainId: number,
  contractAddress: `0x${string}`,
  defaultHead: bigint,
): Promise<bigint> {
  const addr = contractAddress.toLowerCase();
  const existing = await db
    .select()
    .from(indexerCursors)
    .where(and(eq(indexerCursors.chainId, chainId), eq(indexerCursors.contractAddress, addr)))
    .limit(1);
  if (existing[0]) return existing[0].lastBlock;
  await db.insert(indexerCursors).values({
    chainId,
    contractAddress: addr,
    lastBlock: defaultHead,
  });
  return defaultHead;
}

export async function setCursor(
  db: ReturnType<typeof getDb>,
  chainId: number,
  contractAddress: `0x${string}`,
  lastBlock: bigint,
): Promise<void> {
  const addr = contractAddress.toLowerCase();
  await db
    .update(indexerCursors)
    .set({ lastBlock, updatedAt: new Date() })
    .where(and(eq(indexerCursors.chainId, chainId), eq(indexerCursors.contractAddress, addr)));
}
