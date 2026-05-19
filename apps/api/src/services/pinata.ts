import { ApiError, ERROR_CODES } from '@nftm/shared/errors';

export interface PinataClient {
  pinFile(args: { filename: string; mime: string; data: Uint8Array | Buffer }): Promise<string>;
  pinJson(payload: unknown, name?: string): Promise<string>;
  gatewayUrl(cid: string): string;
}

export function createPinataClient(opts: { jwt: string; gateway: string }): PinataClient {
  const authHeader = `Bearer ${opts.jwt}`;
  const gateway = opts.gateway.replace(/\/$/, '');

  async function pinFile(args: { filename: string; mime: string; data: Uint8Array | Buffer }) {
    const fd = new FormData();
    // Cast around the @types/node Buffer<ArrayBufferLike> vs BlobPart
    // incompatibility — runtime behavior is fine, this is a TS-only mismatch.
    const blob = new Blob([args.data as unknown as BlobPart], { type: args.mime });
    fd.append('file', blob, args.filename);
    fd.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));
    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: fd,
    });
    if (!res.ok) {
      throw new ApiError(
        ERROR_CODES.PINATA_FAILED,
        `pinFile ${res.status}: ${await res.text()}`,
        502,
      );
    }
    const json = (await res.json()) as { IpfsHash: string };
    return json.IpfsHash;
  }

  async function pinJson(payload: unknown, name?: string) {
    const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        pinataContent: payload,
        pinataMetadata: name ? { name } : undefined,
        pinataOptions: { cidVersion: 1 },
      }),
    });
    if (!res.ok) {
      throw new ApiError(
        ERROR_CODES.PINATA_FAILED,
        `pinJSON ${res.status}: ${await res.text()}`,
        502,
      );
    }
    const json = (await res.json()) as { IpfsHash: string };
    return json.IpfsHash;
  }

  function gatewayUrl(cid: string) {
    return `${gateway}/ipfs/${cid}`;
  }

  return { pinFile, pinJson, gatewayUrl };
}
