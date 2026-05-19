<script lang="ts">
  let { data } = $props();
</script>

<div class="flex items-end justify-between mb-6">
  <h1 class="text-2xl font-semibold">NFTs</h1>
  <a href="/nfts/new" class="btn btn-primary">New NFT</a>
</div>

<div class="panel divide-y divide-[var(--color-line)]">
  {#each data.nfts as n}
    <div class="p-4 grid grid-cols-[1fr_auto_auto] items-center gap-4">
      <div>
        <div class="font-medium">{n.name}</div>
        <div class="text-xs text-neutral-500">cid: {n.metadataCid}</div>
      </div>
      <div class="text-xs text-neutral-400">
        {n.mintedSupply}/{n.maxSupply} minted
      </div>
      <a class="btn btn-ghost" href={`/vouchers/new?nft=${n.id}`}>Create voucher</a>
    </div>
  {:else}
    <div class="p-6 text-neutral-500 text-sm">No NFTs yet.</div>
  {/each}
</div>
