import { createHash } from 'node:crypto';
import { loadEnv } from '../env.js';

// Stable hash for an IP so we can rate-limit without storing the raw address.
export function hashIp(ip: string): string {
  return createHash('sha256').update(`${loadEnv().JWT_SECRET}:${ip}`).digest('hex').slice(0, 32);
}
