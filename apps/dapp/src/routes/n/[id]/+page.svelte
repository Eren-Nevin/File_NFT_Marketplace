<script lang="ts">
  import { ipfsToHttp, formatUsdc } from '@nftm/ui';
  import { env } from '$env/dynamic/public';
  import { wallet } from '$lib/wallet.svelte.js';
  import { MARKETPLACE_ABI, ERC20_APPROVE_ABI } from '$lib/marketplaceAbi.js';
  import type { Hex } from 'viem';

  let { data } = $props();
  const { nft, collection, media, voucher } = data.nft;
  const gateway = env.PUBLIC_PINATA_GATEWAY_URL ?? 'https://gateway.pinata.cloud';
  const marketplace = env.PUBLIC_MARKETPLACE_ADDRESS as `0x${string}` | undefined;
  const usdc = env.PUBLIC_USDC_ADDRESS as `0x${string}` | undefined;

  let qty = $state(1);
  let buying = $state(false);
  let txHash = $state<Hex | null>(null);
  let error = $state<string | null>(null);
  let watchMsg = $state<string | null>(null);
  let copied = $state(false);

  function shortAddr(a: string): string {
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(collection.contractAddress);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      // no-op
    }
  }

  async function addToWallet() {
    if (!nft.tokenId) {
      watchMsg = 'Token id not assigned yet — try again after the first sale.';
      return;
    }
    watchMsg = null;
    try {
      if (!wallet.isConnected) {
        await wallet.connect(Number(env.PUBLIC_CHAIN_ID) as 8453 | 84532 | 31337);
      }
      const ok = await wallet.watchAsset({
        address: collection.contractAddress as `0x${string}`,
        tokenId: String(nft.tokenId),
        symbol: collection.symbol,
        image: media.previewCid ? `${gateway}/ipfs/${media.previewCid}` : undefined,
      });
      watchMsg = ok ? 'Added to your wallet.' : 'Wallet declined the request.';
    } catch (e) {
      watchMsg = (e as Error).message;
    }
  }

  const totalUsdc = $derived(voucher ? BigInt(voucher.pricePerUnit) * BigInt(qty) : 0n);

  async function buy() {
    if (!voucher || !marketplace || !usdc) return;
    if (!wallet.walletClient || !wallet.publicClient || !wallet.state.address) {
      error = 'Connect your wallet first.';
      return;
    }
    buying = true;
    error = null;
    try {
      // 1) Approve USDC if needed
      const allowance = (await wallet.publicClient.readContract({
        address: usdc,
        abi: ERC20_APPROVE_ABI,
        functionName: 'allowance',
        args: [wallet.state.address, marketplace],
      })) as bigint;
      if (allowance < totalUsdc) {
        const hash = await wallet.walletClient.writeContract({
          address: usdc,
          abi: ERC20_APPROVE_ABI,
          functionName: 'approve',
          args: [marketplace, totalUsdc],
          account: wallet.state.address,
          chain: wallet.walletClient.chain,
        });
        await wallet.publicClient.waitForTransactionReceipt({ hash });
      }

      // 2) buyVoucher. `expiresAt` is an ISO string on the wire; the contract
      // (and the admin's signed payload) uses unix seconds — convert back the
      // same way the admin did, otherwise the EIP-712 signature won't verify.
      const expiresAtSec = BigInt(Math.floor(new Date(voucher.expiresAt).getTime() / 1000));
      const hash = await wallet.walletClient.writeContract({
        address: marketplace,
        abi: MARKETPLACE_ABI,
        functionName: 'buyVoucher',
        args: [
          {
            collection: voucher.collection,
            tokenId: BigInt(voucher.tokenId),
            maxAmount: BigInt(voucher.maxAmount),
            pricePerUnit: BigInt(voucher.pricePerUnit),
            tokenURI: voucher.tokenURI,
            expiresAt: expiresAtSec,
            nonce: BigInt(voucher.nonce),
          },
          voucher.signature,
          BigInt(qty),
        ],
        account: wallet.state.address,
        chain: wallet.walletClient.chain,
      });
      txHash = hash;
      await wallet.publicClient.waitForTransactionReceipt({ hash });
    } catch (e) {
      error = (e as Error).message;
    } finally {
      buying = false;
    }
  }
</script>

<div class="grid grid-cols-1 lg:grid-cols-5 gap-10">
  <div class="lg:col-span-3 card overflow-hidden">
    {#if media.mediaType === 'image'}
      <img src={ipfsToHttp(`ipfs://${media.fileCid}`, gateway)} alt={nft.name} class="w-full" />
    {:else if media.mediaType === 'video'}
      <video src={ipfsToHttp(`ipfs://${media.fileCid}`, gateway)} controls class="w-full"></video>
    {:else if media.mediaType === 'audio'}
      <div class="p-6 space-y-3">
        <img src={ipfsToHttp(`ipfs://${media.previewCid}`, gateway)} alt="" class="w-full" />
        <audio src={ipfsToHttp(`ipfs://${media.fileCid}`, gateway)} controls class="w-full"></audio>
      </div>
    {:else}
      <div class="p-6 space-y-3">
        <img src={ipfsToHttp(`ipfs://${media.previewCid}`, gateway)} alt="" class="w-full" />
        <a class="btn btn-ghost" href={ipfsToHttp(`ipfs://${media.fileCid}`, gateway)} target="_blank">
          Open {media.mediaType.toUpperCase()}
        </a>
      </div>
    {/if}
  </div>

  <aside class="lg:col-span-2 space-y-4">
    <div>
      <div class="text-xs text-neutral-500">{collection.name}</div>
      <h1 class="text-2xl font-semibold tracking-tight">{nft.name}</h1>
    </div>
    <p class="text-neutral-700 whitespace-pre-wrap">{nft.description}</p>

    {#if voucher}
      <div class="card p-5 space-y-3">
        <div class="flex items-baseline justify-between">
          <span class="text-sm text-neutral-500">Price</span>
          <span class="text-xl font-semibold">{formatUsdc(voucher.pricePerUnit)} USDC</span>
        </div>
        <label class="flex items-center justify-between text-sm">
          <span>Quantity</span>
          <input
            type="number"
            min="1"
            max={Number(BigInt(voucher.maxAmount) - BigInt(voucher.soldAmount ?? '0'))}
            bind:value={qty}
            class="w-24 border rounded px-2 py-1 text-right"
          />
        </label>
        <div class="flex items-baseline justify-between text-sm text-neutral-600">
          <span>Total</span>
          <span class="font-medium text-neutral-900">{formatUsdc(totalUsdc)} USDC</span>
        </div>
        <button class="btn btn-primary w-full justify-center" onclick={buy} disabled={buying}>
          {buying ? 'Confirming…' : 'Buy now'}
        </button>
        {#if txHash}
          <div class="text-xs text-neutral-500 break-all">Tx: {txHash}</div>
        {/if}
        {#if error}
          <div class="text-xs text-red-600">{error}</div>
        {/if}
      </div>
    {:else}
      <div class="card p-5 text-sm text-neutral-500">No active listing for this NFT.</div>
    {/if}

    <div class="card p-5 space-y-3">
      <div class="flex items-baseline justify-between">
        <h3 class="text-sm font-medium">Token info</h3>
        <span class="text-[10px] text-neutral-500 uppercase tracking-wide">ERC-1155</span>
      </div>
      <dl class="text-xs space-y-2">
        <div class="flex items-center justify-between gap-3">
          <dt class="text-neutral-500 shrink-0">Contract</dt>
          <dd class="font-mono truncate">
            <button
              class="hover:underline"
              onclick={copyAddress}
              title={collection.contractAddress}
            >{shortAddr(collection.contractAddress)}</button>
            {#if copied}<span class="ml-1 text-green-600">copied</span>{/if}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-3">
          <dt class="text-neutral-500 shrink-0">Token ID</dt>
          <dd class="font-mono">{nft.tokenId ?? '—'}</dd>
        </div>
        <div class="flex items-center justify-between gap-3">
          <dt class="text-neutral-500 shrink-0">Network</dt>
          <dd>Chain {collection.chainId}</dd>
        </div>
      </dl>
      <button
        class="btn btn-ghost w-full justify-center text-sm"
        onclick={addToWallet}
        disabled={!nft.tokenId}
      >Add to wallet</button>
      {#if watchMsg}
        <div class="text-xs text-neutral-600 text-center break-all">{watchMsg}</div>
      {/if}
    </div>

    {#if nft.attributes && nft.attributes.length > 0}
      <div class="card p-5">
        <h3 class="text-sm font-medium mb-3">Properties</h3>
        <div class="flex flex-wrap gap-2">
          {#each nft.attributes as attr}
            <div class="px-3 py-1.5 rounded border border-neutral-200 bg-neutral-50 min-w-[100px]">
              <div class="text-[10px] uppercase tracking-wide text-neutral-500">{attr.trait_type}</div>
              <div class="text-sm font-medium text-neutral-900">{attr.value}</div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <details class="text-sm">
      <summary class="cursor-pointer text-neutral-600">On-chain metadata</summary>
      <div class="mt-2 space-y-2">
        <div class="text-xs text-neutral-500">
          The contract's <code>uri({nft.tokenId ?? '?'})</code> returns this immutable IPFS pointer:
        </div>
        <a
          href={`${gateway}/ipfs/${nft.metadataCid}`}
          target="_blank"
          rel="noopener"
          class="font-mono text-xs break-all text-[var(--color-accent)] hover:underline block"
        >ipfs://{nft.metadataCid}</a>
        <details class="text-xs">
          <summary class="cursor-pointer text-neutral-500">Raw attributes JSON</summary>
          <pre class="mt-2 overflow-auto bg-neutral-50 p-3 rounded">{JSON.stringify(
            nft.attributes,
            null,
            2,
          )}</pre>
        </details>
      </div>
    </details>
  </aside>
</div>
