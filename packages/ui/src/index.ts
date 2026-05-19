export const BRAND = {
  name: 'FreedomFi NFT',
  tagline: 'Curated drops on Base',
};

export function formatUsdc(amount: bigint | string | number): string {
  const n = typeof amount === 'bigint' ? amount : BigInt(amount);
  const whole = n / 1_000_000n;
  const frac = n % 1_000_000n;
  const fracStr = frac.toString().padStart(6, '0').replace(/0+$/, '');
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

export function shortAddress(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function ipfsToHttp(uri: string, gateway = 'https://gateway.pinata.cloud'): string {
  if (uri.startsWith('ipfs://')) {
    return `${gateway.replace(/\/$/, '')}/ipfs/${uri.slice(7)}`;
  }
  return uri;
}
