import type { Redis } from 'ioredis';

// Fixed-window token bucket via INCR + EXPIRE. Returns true if the request fits.
export async function take(
  redis: Redis,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const k = `rl:${key}`;
  const n = await redis.incr(k);
  if (n === 1) await redis.expire(k, windowSeconds);
  return n <= limit;
}
