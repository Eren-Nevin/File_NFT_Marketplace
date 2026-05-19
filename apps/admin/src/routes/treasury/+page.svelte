<script lang="ts">
  import { formatUsdc, shortAddress } from '@nftm/ui';

  let { data } = $props();
  let lookupAddr = $state('');
  let balance = $state<string | null>(null);
  let err = $state<string | null>(null);

  async function lookup() {
    err = null;
    balance = null;
    const res = await fetch(`/api/admin/treasury/balance?address=${lookupAddr}`);
    if (!res.ok) {
      err = (await res.json()).message ?? `Failed (${res.status})`;
      return;
    }
    const body = await res.json();
    balance = body.usdc;
  }
</script>

<h1 class="text-2xl font-semibold mb-6">Treasury</h1>

<div class="panel p-5 max-w-xl mb-8">
  <h2 class="text-sm font-medium text-neutral-300 mb-3">USDC balance lookup</h2>
  <div class="flex gap-2">
    <input class="input flex-1 font-mono" placeholder="0x…" bind:value={lookupAddr} />
    <button class="btn btn-primary" onclick={lookup} disabled={!lookupAddr}>Check</button>
  </div>
  {#if balance !== null}
    <div class="mt-3 text-sm">Balance: <span class="font-semibold">{formatUsdc(balance)} USDC</span></div>
  {/if}
  {#if err}<div class="mt-3 text-sm text-red-400">{err}</div>{/if}
</div>

<h2 class="text-lg font-medium mb-3">Recent sales</h2>
<table class="w-full text-sm">
  <thead class="text-left text-xs uppercase tracking-widest text-neutral-500">
    <tr>
      <th class="pb-2">Kind</th>
      <th class="pb-2">Buyer</th>
      <th class="pb-2">Token</th>
      <th class="pb-2 text-right">Amount</th>
      <th class="pb-2 text-right">Paid</th>
      <th class="pb-2 text-right">Royalty</th>
      <th class="pb-2 text-right">Platform fee</th>
    </tr>
  </thead>
  <tbody>
    {#each data.sales as s}
      <tr class="border-t border-[var(--color-line)]">
        <td class="py-2">{s.kind}</td>
        <td class="py-2 font-mono">{shortAddress(String(s.buyer))}</td>
        <td class="py-2">{String(s.tokenId)}</td>
        <td class="py-2 text-right">{String(s.amount)}</td>
        <td class="py-2 text-right">{formatUsdc(String(s.pricePaid))}</td>
        <td class="py-2 text-right">{formatUsdc(String(s.royaltyAmount ?? '0'))}</td>
        <td class="py-2 text-right">{formatUsdc(String(s.platformFeeAmount ?? '0'))}</td>
      </tr>
    {/each}
  </tbody>
</table>
