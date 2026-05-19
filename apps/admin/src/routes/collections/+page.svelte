<script lang="ts">
  import { shortAddress } from '@nftm/ui';
  let { data } = $props();
</script>

<div class="flex items-end justify-between mb-6">
  <h1 class="text-2xl font-semibold">Collections</h1>
  <a href="/collections/new" class="btn btn-primary">New collection</a>
</div>

<div class="panel divide-y divide-[var(--color-line)]">
  {#each data.collections as c}
    <div class="p-4 grid grid-cols-[1fr_auto_auto] gap-4 items-center">
      <div>
        <div class="font-medium">{c.name} <span class="text-neutral-500 text-sm">({c.symbol})</span></div>
        <div class="text-xs text-neutral-500 font-mono">{shortAddress(c.contractAddress)}</div>
      </div>
      <div class="text-xs text-neutral-400">
        royalty {c.royaltyBps / 100}% · platform {c.platformFeeBps / 100}%
      </div>
      <a href={`/collections/${c.id}`} class="btn btn-ghost">Open</a>
    </div>
  {:else}
    <div class="p-6 text-neutral-500 text-sm">No collections yet.</div>
  {/each}
</div>
