import type {
  AddAdminRequest,
  Collection,
  CreateCollectionRequest,
  CreateNftRequest,
  CreateVoucherRequest,
  MediaAsset,
  Nft,
  Voucher,
  SiweVerifyRequest,
} from '@nftm/shared/schemas';

export interface ClientOptions {
  baseUrl: string;
  /** Override fetch (e.g. SvelteKit's locals.fetch). */
  fetch?: typeof fetch;
  /** Cookie header to forward (server-side fetches from SvelteKit). */
  cookie?: string;
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export function createClient(opts: ClientOptions) {
  const f = opts.fetch ?? fetch;
  const base = opts.baseUrl.replace(/\/$/, '');

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {};
    if (body !== undefined && !(body instanceof FormData)) {
      headers['content-type'] = 'application/json';
    }
    if (opts.cookie) headers.cookie = opts.cookie;

    const res = await f(`${base}${path}`, {
      method,
      headers,
      credentials: 'include',
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });

    const contentType = res.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
      const errBody = typeof payload === 'object' && payload ? (payload as Record<string, unknown>) : {};
      throw new ApiClientError(
        res.status,
        (errBody.code as string) ?? 'HTTP_ERROR',
        (errBody.message as string) ?? `HTTP ${res.status}`,
        errBody.details,
      );
    }
    return payload as T;
  }

  return {
    health: () => request<{ ok: true; chainId: number }>('GET', '/health'),
    auth: {
      nonce: (address: `0x${string}`) =>
        request<{ nonce: string }>('POST', '/auth/nonce', { address }),
      verify: (body: SiweVerifyRequest) =>
        request<{ address: `0x${string}`; role: string; expiresAt: string }>(
          'POST',
          '/auth/verify',
          body,
        ),
      logout: () => request<{ ok: true }>('POST', '/auth/logout'),
      me: () =>
        request<
          { address: null; role: null } | { address: `0x${string}`; role: string; expiresAt: string }
        >('GET', '/auth/me'),
    },
    catalog: {
      collections: () => request<{ items: Collection[] }>('GET', '/collections'),
      collection: (id: string) => request<Collection>('GET', `/collections/${id}`),
      nfts: (collectionId?: string) =>
        request<{ items: Array<{ nft: Nft; collection: Collection; media: MediaAsset }> }>(
          'GET',
          `/nfts${collectionId ? `?collection_id=${collectionId}` : ''}`,
        ),
      nft: (id: string) =>
        request<{ nft: Nft; collection: Collection; media: MediaAsset; voucher: Voucher | null }>(
          'GET',
          `/nfts/${id}`,
        ),
      countView: (id: string) => request<{ counted: boolean }>('POST', `/nfts/${id}/view`),
    },
    admin: {
      admins: {
        list: () =>
          request<{ items: Array<{ address: `0x${string}`; role: string }> }>('GET', '/admin/admins'),
        upsert: (body: AddAdminRequest) =>
          request<{ address: `0x${string}`; role: string }>('POST', '/admin/admins', body),
        remove: (address: `0x${string}`) =>
          request<{ ok: true }>('DELETE', `/admin/admins/${address}`),
      },
      media: {
        upload: (form: FormData) => request<MediaAsset>('POST', '/admin/media/upload', form),
      },
      collections: {
        draft: (body: CreateCollectionRequest) =>
          request<{
            factoryAddress: `0x${string}` | null;
            args: CreateCollectionRequest;
          }>('POST', '/admin/collections/draft', body),
        confirm: (body: {
          chainId: number;
          contractAddress: `0x${string}`;
          name: string;
          symbol: string;
          royaltyReceiver: `0x${string}`;
          royaltyBps: number;
          platformFeeBps: number;
          txHash: `0x${string}`;
        }) => request<Collection | { ok: true }>('POST', '/admin/collections/confirm', body),
        list: () => request<{ items: Collection[] }>('GET', '/admin/collections'),
      },
      nfts: {
        create: (body: CreateNftRequest) => request<Nft>('POST', '/admin/nfts', body),
        list: () => request<{ items: Nft[] }>('GET', '/admin/nfts'),
      },
      vouchers: {
        create: (body: CreateVoucherRequest) =>
          request<{
            id: string;
            voucher: {
              collection: `0x${string}`;
              tokenId: string;
              maxAmount: string;
              pricePerUnit: string;
              tokenURI: string;
              expiresAt: string;
              nonce: string;
            };
            signature: `0x${string}`;
            voucherHash: `0x${string}`;
          }>('POST', '/admin/vouchers', body),
        revoke: (id: string) =>
          request<{ id: string; status: 'revoked'; voucherHash: string }>(
            'POST',
            `/admin/vouchers/${id}/revoke`,
          ),
      },
      treasury: {
        balance: (address: `0x${string}`) =>
          request<{ address: `0x${string}`; usdc: string }>(
            'GET',
            `/admin/treasury/balance?address=${address}`,
          ),
        sales: () =>
          request<{ items: Array<Record<string, unknown>> }>('GET', '/admin/treasury/sales'),
      },
    },
  };
}

export type ApiClient = ReturnType<typeof createClient>;
