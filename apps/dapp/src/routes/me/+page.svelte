<script lang="ts">
  import { shortAddress, ipfsToHttp } from '@nftm/ui';
  import { env } from '$env/dynamic/public';
  import { wallet } from '$lib/wallet.svelte.js';

  let { data } = $props();
  const gateway = env.PUBLIC_PINATA_GATEWAY_URL ?? 'https://gateway.pinata.cloud';

  let copiedId = $state<string | null>(null);
  let watchMsg = $state<Record<string, string>>({});

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      copiedId = key;
      setTimeout(() => (copiedId = null), 1500);
    } catch {
      // no-op
    }
  }

  async function addToWallet(item: typeof data.owned[number]) {
    const key = `${item.collection.contractAddress}:${item.nft.tokenId}`;
    watchMsg = { ...watchMsg, [key]: '' };
    try {
      if (!wallet.isConnected) {
        await wallet.connect(Number(env.PUBLIC_CHAIN_ID) as 8453 | 84532 | 31337);
      }
      const ok = await wallet.watchAsset({
        address: item.collection.contractAddress as `0x${string}`,
        tokenId: String(item.nft.tokenId),
        symbol: item.collection.symbol,
        image: item.media.previewCid ? `${gateway}/ipfs/${item.media.previewCid}` : undefined,
      });
      watchMsg = { ...watchMsg, [key]: ok ? 'Added to your wallet.' : 'Wallet declined the request.' };
    } catch (e) {
      watchMsg = { ...watchMsg, [key]: (e as Error).message };
    }
  }
</script>

<section class="space-y-6">
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">My wallet</h1>
    <p class="text-neutral-600 text-sm">
      Signed in as <span class="font-mono">{shortAddress(data.session!.address)}</span>
      · role: {data.session!.role}
    </p>
  </div>

  <div>
    <h2 class="text-lg font-medium mb-3">Owned NFTs</h2>
    {#if data.owned.length === 0}
      <div class="card p-6 text-sm text-neutral-500">
        Nothing here yet. Once your purchase is indexed on chain, your NFTs and their contract
        addresses will appear here so you can import them into your wallet.
      </div>
    {:else}
      <div class="grid gap-4 sm:grid-cols-2">
        {#each data.owned as item (item.collection.contractAddress + ':' + item.nft.tokenId)}
          {@const key = `${item.collection.contractAddress}:${item.nft.tokenId}`}
          <div class="card overflow-hidden">
            <a href={`/n/${item.nft.id}`} class="block">
              {#if item.media.mediaType === 'image'}
                <img
                  src={ipfsToHttp(`ipfs://${item.media.previewCid ?? item.media.fileCid}`, gateway)}
                  alt={item.nft.name}
                  class="w-full aspect-square object-cover"
                />
              {:else}
                <div class="w-full aspect-square bg-neutral-100 flex items-center justify-center text-xs text-neutral-500 uppercase">
                  {item.media.mediaType}
                </div>
              {/if}
            </a>
            <div class="p-4 space-y-3">
              <div>
                <div class="text-[11px] text-neutral-500 uppercase tracking-wide">{item.collection.name}</div>
                <a href={`/n/${item.nft.id}`} class="font-medium hover:underline">{item.nft.name}</a>
              </div>
              <dl class="text-xs space-y-1.5">
                <div class="flex items-center justify-between gap-2">
                  <dt class="text-neutral-500">Balance</dt>
                  <dd class="font-mono">×{item.balance}</dd>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <dt class="text-neutral-500">Contract</dt>
                  <dd class="font-mono truncate">
                    <button
                      class="hover:underline"
                      onclick={() => copy(item.collection.contractAddress, key + ':addr')}
                      title={item.collection.contractAddress}
                    >{shortAddress(item.collection.contractAddress)}</button>
                    {#if copiedId === key + ':addr'}<span class="ml-1 text-green-600">copied</span>{/if}
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <dt class="text-neutral-500">Token ID</dt>
                  <dd class="font-mono">{item.nft.tokenId}</dd>
                </div>
              </dl>
              <button class="btn btn-ghost w-full justify-center text-sm" onclick={() => addToWallet(item)}>
                Add to wallet
              </button>
              {#if watchMsg[key]}
                <div class="text-xs text-neutral-600 text-center break-all">{watchMsg[key]}</div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</section>
