<script lang="ts">
  import { shortAddress } from '@nftm/ui';
  let { data } = $props();
</script>

<section class="space-y-6">
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">My wallet</h1>
    <p class="text-neutral-600 text-sm">
      Signed in as <span class="font-mono">{shortAddress(data.session!.address)}</span>
      · role: {data.session!.role}
    </p>
  </div>

  <div class="card p-6">
    <h2 class="text-lg font-medium mb-1">Owned NFTs</h2>
    <p class="text-sm text-neutral-500">
      Owned NFT listing is read off-chain from the indexer; nothing to show yet — make a purchase to populate this view.
    </p>
  </div>
</section>
