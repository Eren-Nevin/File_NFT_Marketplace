<script lang="ts">
  import { ipfsToHttp, formatUsdc } from '@nftm/ui';
  import { env } from '$env/dynamic/public';

  let { data } = $props();
  const gateway = env.PUBLIC_PINATA_GATEWAY_URL ?? 'https://gateway.pinata.cloud';
</script>

<section class="space-y-2">
  <h1 class="text-3xl font-semibold tracking-tight">Latest drops</h1>
  <p class="text-neutral-600">Curated, multi-edition NFTs on Base. Pay with USDC.</p>
</section>

<section class="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
  {#each data.nfts as { nft, collection, media }}
    <a href={`/n/${nft.id}`} class="card group">
      <div class="aspect-square bg-neutral-100 overflow-hidden">
        <img
          src={ipfsToHttp(`ipfs://${media.previewCid}`, gateway)}
          alt={nft.name}
          class="w-full h-full object-cover transition group-hover:scale-[1.02]"
          loading="lazy"
        />
      </div>
      <div class="p-4 space-y-1">
        <div class="text-xs text-neutral-500">{collection.name} · {media.mediaType}</div>
        <div class="font-medium">{nft.name}</div>
        <div class="text-sm text-neutral-600">
          Edition of {nft.maxSupply} · {nft.mintedSupply} minted
        </div>
      </div>
    </a>
  {:else}
    <div class="col-span-full text-neutral-500">No drops yet. Check back soon.</div>
  {/each}
</section>
