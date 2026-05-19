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

  async connect(expectedChainId: SupportedChainId): Promise<Address> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No injected wallet found.');
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
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${expectedChainId.toString(16)}` }],
        });
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
}

export const wallet = new Wallet();
