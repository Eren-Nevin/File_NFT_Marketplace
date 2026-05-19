import { createClient, type ApiClient } from '@nftm/sdk';
import { env } from '$env/dynamic/private';

export function makeApi(opts: { cookie?: string; fetch?: typeof fetch }): ApiClient {
  const baseUrl = env.API_INTERNAL_URL ?? 'http://api:8080';
  return createClient({ baseUrl, fetch: opts.fetch, cookie: opts.cookie });
}
