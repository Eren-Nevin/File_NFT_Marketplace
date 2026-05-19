<script lang="ts">
  let { data } = $props();
</script>

<h1 class="text-2xl font-semibold tracking-tight mb-6">Overview</h1>

<div class="grid grid-cols-2 gap-4 max-w-xl">
  <div class="panel p-5">
    <div class="text-sm text-neutral-400">Collections</div>
    <div class="text-3xl font-semibold mt-1">{data.collectionsCount}</div>
  </div>
  <div class="panel p-5">
    <div class="text-sm text-neutral-400">NFT drafts</div>
    <div class="text-3xl font-semibold mt-1">{data.nftsCount}</div>
  </div>
</div>
