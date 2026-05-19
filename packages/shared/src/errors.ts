// Stable error codes used across API responses. Keep these stable;
// clients may key off them. Use UPPER_SNAKE.
export const ERROR_CODES = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION: 'VALIDATION',
  RATE_LIMITED: 'RATE_LIMITED',
  NONCE_INVALID: 'NONCE_INVALID',
  SIWE_INVALID: 'SIWE_INVALID',
  ADMIN_NOT_ALLOWED: 'ADMIN_NOT_ALLOWED',
  MEDIA_TOO_LARGE: 'MEDIA_TOO_LARGE',
  MEDIA_UNSUPPORTED: 'MEDIA_UNSUPPORTED',
  PINATA_FAILED: 'PINATA_FAILED',
  VOUCHER_EXPIRED: 'VOUCHER_EXPIRED',
  VOUCHER_EXHAUSTED: 'VOUCHER_EXHAUSTED',
  CHAIN_TX_PENDING: 'CHAIN_TX_PENDING',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
