import { z } from 'zod';

// Treat empty strings the same as missing (Zod's .optional() only accepts undefined).
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
const optHex32 = z.preprocess(
  emptyToUndef,
  z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/)
    .transform((v) => v as `0x${string}`)
    .optional(),
);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().default(8080),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  // Origins for SIWE statement + CORS pruning
  DAPP_PUBLIC_ORIGIN: z.string().url(),
  ADMIN_PUBLIC_ORIGIN: z.string().url(),

  // JWT secret used to sign session cookies (>=32 bytes)
  JWT_SECRET: z.string().min(32),
  SESSION_COOKIE_DOMAIN: z.preprocess(emptyToUndef, z.string().optional()),
  TRUST_PROXY: z.coerce.boolean().default(true),

  // Chain
  CHAIN_ID: z.coerce.number().int().positive(),
  BASE_RPC_URL: optUrl,
  BASE_SEPOLIA_RPC_URL: optUrl,
  ANVIL_RPC_URL: optUrl,

  USDC_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .transform((v) => v as `0x${string}`),
  FACTORY_ADDRESS: optAddress,
  MARKETPLACE_ADDRESS: optAddress,

  // Voucher signer (EIP-712). Plain hex private key in .env. Holds MINTER_ROLE
  // on every NFTCollection deployed via the factory.
  VOUCHER_SIGNER_PRIVATE_KEY: optHex32,

  // IPFS
  PINATA_JWT: z.preprocess(emptyToUndef, z.string().min(1).optional()),
  PINATA_GATEWAY_URL: z.string().url().default('https://gateway.pinata.cloud'),

  // Limits
  MEDIA_MAX_BYTES: z.coerce.number().int().positive().default(100 * 1024 * 1024),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;
export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error('[env] invalid environment:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment');
  }
  cached = parsed.data;
  return cached;
}
