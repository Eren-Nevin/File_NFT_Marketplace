<script lang="ts">
  let { data } = $props();

  let revoking = $state<string | null>(null);
  let err = $state<string | null>(null);

  // Display USDC base units (6 decimals) as a human-readable string.
  function fmtUsdc(base: string): string {
    const n = BigInt(base);
    const whole = n / 1_000_000n;
    const frac = (n % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
    return frac ? `${whole}.${frac}` : whole.toString();
  }

  function fmtExpiry(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this voucher? It will no longer be redeemable.')) return;
    revoking = id;
    err = null;
    try {
      const res = await fetch(`/api/admin/vouchers/${id}/revoke`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        err = body?.message ?? `Revoke failed (${res.status})`;
        return;
      }
      location.reload();
    } catch (e) {
      err = `Revoke failed: ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      revoking = null;
    }
  }
</script>

<div class="flex items-end justify-between mb-6">
  <h1 class="text-2xl font-semibold">Vouchers</h1>
  <a class="btn btn-primary" href="/vouchers/new">New voucher</a>
</div>

{#if err}
  <div class="panel p-4 mb-4 text-sm text-red-400">{err}</div>
{/if}

{#if data.vouchers.length === 0}
  <div class="panel p-6 text-sm text-neutral-500">
    No vouchers yet.
    {#if data.nfts.length > 0}
      <a class="text-[var(--color-accent)] underline" href="/vouchers/new">Sign your first voucher</a>.
    {:else}
      Create an NFT first, then sign a voucher for it.
    {/if}
  </div>
{:else}
  <div class="panel divide-y divide-[var(--color-line)]">
    {#each data.vouchers as v}
      <div class="p-4 flex items-center justify-between gap-4">
        <div class="min-w-0">
          <div class="font-medium truncate">
            {v.nftName}
            <span class="text-xs text-neutral-500 ml-2">{v.collectionSymbol} · token #{v.tokenId}</span>
          </div>
          <div class="text-xs text-neutral-500 mt-0.5">
            {fmtUsdc(v.pricePerUnit)} USDC · {v.soldAmount}/{v.maxAmount} sold · expires {fmtExpiry(v.expiresAt)}
          </div>
          <div class="text-[10px] text-neutral-600 font-mono truncate mt-1">{v.voucherHash}</div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span
            class="text-xs px-2 py-0.5 rounded"
            class:bg-green-900={v.status === 'active'}
            class:text-green-300={v.status === 'active'}
            class:bg-neutral-800={v.status !== 'active'}
            class:text-neutral-400={v.status !== 'active'}
          >{v.status}</span>
          {#if v.status === 'active'}
            <button
              class="btn btn-ghost text-xs"
              onclick={() => revoke(v.id)}
              disabled={revoking === v.id}
            >
              {revoking === v.id ? 'Revoking…' : 'Revoke'}
            </button>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}

{#if data.nfts.length > 0}
  <h2 class="text-lg font-semibold mt-10 mb-3">Sign new voucher for…</h2>
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
{/if}
