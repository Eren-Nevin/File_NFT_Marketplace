/* Svelte 5 wallet store using runes. Browser-only. Talks to `window.ethereum`
 * directly via viem — no WalletConnect / no third-party SDK. */
import {
  createWalletClient,
  custom,
  createPublicClient,
  http,
  type Address,
  type Hex,
  type WalletClient,
  type PublicClient,
} from 'viem';
import { getChain, type SupportedChainId } from '@nftm/shared/chain';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

type State = {
  address: Address | null;
  chainId: number | null;
  connecting: boolean;
  error: string | null;
};

class Wallet {
  state = $state<State>({ address: null, chainId: null, connecting: false, error: null });

  walletClient: WalletClient | null = null;
  publicClient: PublicClient | null = null;

  get isConnected() {
    return this.state.address !== null;
  }

  async connect(expectedChainId: SupportedChainId): Promise<Address> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No injected wallet. Install MetaMask or Coinbase Wallet.');
    }
    this.state.connecting = true;
    this.state.error = null;
    try {
      const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
      const address = accounts[0] as Address | undefined;
      if (!address) throw new Error('No account returned');

      let chainIdHex = (await window.ethereum.request({ method: 'eth_chainId' })) as string;
      let chainId = Number.parseInt(chainIdHex, 16);

      if (chainId !== expectedChainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${expectedChainId.toString(16)}` }],
          });
        } catch {
          throw new Error(`Please switch your wallet to chain ${expectedChainId}`);
        }
        chainIdHex = (await window.ethereum.request({ method: 'eth_chainId' })) as string;
        chainId = Number.parseInt(chainIdHex, 16);
      }

      const chain = getChain(chainId);
      this.walletClient = createWalletClient({ chain, transport: custom(window.ethereum), account: address });
      this.publicClient = createPublicClient({ chain, transport: http() }) as PublicClient;

      this.state.address = address;
      this.state.chainId = chainId;
      return address;
    } catch (err) {
      this.state.error = (err as Error).message;
      throw err;
    } finally {
      this.state.connecting = false;
    }
  }

  disconnect() {
    this.state.address = null;
    this.state.chainId = null;
    this.walletClient = null;
    this.publicClient = null;
  }

  async signMessage(message: string): Promise<Hex> {
    if (!this.walletClient || !this.state.address) {
      throw new Error('Wallet not connected');
    }
    return this.walletClient.signMessage({ account: this.state.address, message });
  }

  /// Prompt the wallet to track an ERC-1155 token (contract + tokenId).
  /// Returns true if the user accepted, false otherwise.
  /// MetaMask and most modern wallets support ERC1155 here; older versions may
  /// fall back to ERC721 — we try 1155 first then 721.
  async watchAsset(opts: { address: Address; tokenId: string; symbol?: string; image?: string }): Promise<boolean> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No injected wallet.');
    }
    const base = { address: opts.address, tokenId: opts.tokenId, symbol: opts.symbol, image: opts.image };
    for (const type of ['ERC1155', 'ERC721'] as const) {
      try {
        const ok = (await window.ethereum.request({
          method: 'wallet_watchAsset',
          // The EIP-747 shape passes a single object, not an array.
          params: { type, options: base } as unknown as unknown[],
        })) as boolean;
        return Boolean(ok);
      } catch (err) {
        const msg = (err as Error).message ?? '';
        // If the wallet rejects the asset type, try the next one; otherwise rethrow.
        if (!/unsupported|invalid|not supported|type/i.test(msg)) throw err;
      }
    }
    throw new Error('Your wallet does not support adding this NFT type.');
  }
}

export const wallet = new Wallet();
