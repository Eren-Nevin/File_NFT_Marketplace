<script lang="ts">
  let { data } = $props();
</script>

<div class="flex items-end justify-between mb-6">
  <h1 class="text-2xl font-semibold">Vouchers</h1>
  <a class="btn btn-primary" href="/vouchers/new">New voucher</a>
</div>

<div class="panel divide-y divide-[var(--color-line)]">
  {#each data.nfts as n}
    <div class="p-4 flex items-center justify-between">
      <div>
        <div class="font-medium">{n.name}</div>
        <div class="text-xs text-neutral-500">{n.mintedSupply}/{n.maxSupply} minted</div>
      </div>
      <a class="btn btn-ghost" href={`/vouchers/new?nft=${n.id}`}>Sign voucher</a>
    </div>
  {/each}
</div>
