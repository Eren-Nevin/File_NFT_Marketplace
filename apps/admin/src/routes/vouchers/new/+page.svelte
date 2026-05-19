<script lang="ts">
  import { goto } from '$app/navigation';

  let { data } = $props();

  let nftId = $state(data.preselect ?? data.nfts[0]?.id ?? '');
  let priceUsdc = $state('10'); // human units
  let maxAmount = $state('5');
  let expiresAt = $state(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16));
  let busy = $state(false);
  let err = $state<string | null>(null);
  let success = $state<string | null>(null);

  async function create() {
    busy = true;
    err = null;
    try {
      // priceUsdc is in human units; convert to 6-decimal base units.
      const [whole, frac = ''] = String(priceUsdc).split('.');
      const fracPadded = (frac + '000000').slice(0, 6);
      const pricePerUnit = BigInt(`${whole}${fracPadded}`).toString();

      const res = await fetch('/api/admin/vouchers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nftId,
          pricePerUnit,
          maxAmount: String(maxAmount),
          expiresAt: new Date(expiresAt).toISOString(),
        }),
      });
      if (!res.ok) {
        err = (await res.json()).message ?? `Failed (${res.status})`;
        return;
      }
      const body = await res.json();
      success = `Voucher signed. Hash ${body.voucherHash}`;
      setTimeout(() => goto('/vouchers'), 1500);
    } finally {
      busy = false;
    }
  }
</script>

<h1 class="text-2xl font-semibold mb-6">New voucher</h1>

<div class="panel p-6 max-w-xl space-y-4">
  <label class="block text-sm">
    <span class="text-neutral-400">NFT</span>
    <select class="select mt-1" bind:value={nftId}>
      {#each data.nfts as n}
        <option value={n.id}>{n.name}</option>
      {/each}
    </select>
  </label>
  <div class="grid grid-cols-2 gap-4">
    <label class="block text-sm">
      <span class="text-neutral-400">Price per unit (USDC)</span>
      <input class="input mt-1" inputmode="decimal" bind:value={priceUsdc} />
    </label>
    <label class="block text-sm">
      <span class="text-neutral-400">Max amount</span>
      <input class="input mt-1" type="number" min="1" bind:value={maxAmount} />
    </label>
  </div>
  <label class="block text-sm">
    <span class="text-neutral-400">Expires at</span>
    <input class="input mt-1" type="datetime-local" bind:value={expiresAt} />
  </label>
  <button class="btn btn-primary w-full justify-center" onclick={create} disabled={busy || !nftId}>
    {busy ? 'Signing…' : 'Create & sign voucher'}
  </button>
  {#if err}<div class="text-sm text-red-400">{err}</div>{/if}
  {#if success}<div class="text-sm text-green-400 break-all">{success}</div>{/if}
</div>
