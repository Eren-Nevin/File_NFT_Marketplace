import { z } from 'zod';

const emptyToUndef = (v: unknown) => (v === '' ? undefined : v);
const optUrl = z.preprocess(emptyToUndef, z.string().url().optional());
const optAddress = z.preprocess(
  emptyToUndef,
  z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .transform((v) => v as `0x${string}`)
    .optional(),
);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  CHAIN_ID: z.coerce.number().int().positive(),
  BASE_RPC_URL: optUrl,
  BASE_SEPOLIA_RPC_URL: optUrl,
  ANVIL_RPC_URL: optUrl,

  FACTORY_ADDRESS: optAddress,
  MARKETPLACE_ADDRESS: optAddress,

  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
});

export type IndexerEnv = z.infer<typeof schema>;

let cached: IndexerEnv | undefined;
export function loadEnv(): IndexerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error('[env] invalid environment:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment');
  }
  cached = parsed.data;
  return cached;
}
