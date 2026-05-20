<script lang="ts">
  import { shortAddress } from '@nftm/ui';
  import { invalidateAll, goto } from '$app/navigation';

  let { data } = $props();

  let busy = $state(false);
  let err = $state<string | null>(null);

  function fmtUsdc(base: string): string {
    const n = BigInt(base);
    const whole = n / 1_000_000n;
    const frac = (n % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
    return frac ? `${whole}.${frac}` : whole.toString();
  }

  async function toggleArchive() {
    const archived = !!data.collection.archivedAt;
    if (!archived) {
      if (!confirm(`Archive "${data.collection.name}"? Hidden from dapp, no new vouchers. Reversible.`)) return;
    }
    busy = true;
    err = null;
    try {
      const path = archived ? 'unarchive' : 'archive';
      const res = await fetch(`/api/admin/collections/${data.collection.id}/${path}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        err = body?.message ?? `Request failed (${res.status})`;
        return;
      }
      await invalidateAll();
    } catch (e) {
      err = `Request failed: ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      busy = false;
    }
  }
</script>

<div class="flex items-center gap-3 mb-6">
  <a href="/collections" class="text-neutral-500 hover:text-neutral-300 text-sm">← Collections</a>
</div>

<div class="flex items-end justify-between mb-6 gap-4">
  <div class="min-w-0">
    <div class="text-xs text-neutral-500 uppercase tracking-wide">{data.collection.symbol}</div>
    <h1 class="text-2xl font-semibold flex items-center gap-3">
      {data.collection.name}
      {#if data.collection.archivedAt}
        <span class="text-[10px] uppercase tracking-wide bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded">archived</span>
      {/if}
    </h1>
  </div>
  <div class="flex items-center gap-2 shrink-0">
    <button class="btn btn-ghost text-xs" onclick={toggleArchive} disabled={busy}>
      {busy ? '…' : data.collection.archivedAt ? 'Unarchive' : 'Archive'}
    </button>
    {#if !data.collection.archivedAt}
      <button class="btn btn-primary" onclick={() => goto(`/vouchers/new`)}>Sign voucher</button>
    {/if}
  </div>
</div>

{#if err}
  <div class="panel p-4 mb-4 text-sm text-red-400">{err}</div>
{/if}

<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
  <div class="panel p-5">
    <h2 class="text-sm font-medium mb-3">On-chain</h2>
    <dl class="text-xs space-y-2">
      <div class="flex items-center justify-between gap-3">
        <dt class="text-neutral-500">Contract</dt>
        <dd class="font-mono" title={data.collection.contractAddress}>{shortAddress(data.collection.contractAddress)}</dd>
      </div>
      <div class="flex items-center justify-between gap-3">
        <dt class="text-neutral-500">Chain</dt>
        <dd>{data.collection.chainId}</dd>
      </div>
      <div class="flex items-center justify-between gap-3">
        <dt class="text-neutral-500">Deployer</dt>
        <dd class="font-mono" title={data.collection.deployer}>{shortAddress(data.collection.deployer)}</dd>
      </div>
      <div class="flex items-center justify-between gap-3">
        <dt class="text-neutral-500">Deploy tx</dt>
        <dd class="font-mono" title={data.collection.txHash}>{shortAddress(data.collection.txHash)}</dd>
      </div>
    </dl>
  </div>

  <div class="panel p-5">
    <h2 class="text-sm font-medium mb-3">Fees</h2>
    <dl class="text-xs space-y-2">
      <div class="flex items-center justify-between gap-3">
        <dt class="text-neutral-500">Royalty</dt>
        <dd>{data.collection.royaltyBps / 100}% → <span class="font-mono">{shortAddress(data.collection.royaltyReceiver)}</span></dd>
      </div>
      <div class="flex items-center justify-between gap-3">
        <dt class="text-neutral-500">Platform fee</dt>
        <dd>{data.collection.platformFeeBps / 100}%</dd>
      </div>
      <div class="flex items-center justify-between gap-3">
        <dt class="text-neutral-500">Created</dt>
        <dd>{new Date(data.collection.createdAt).toLocaleString()}</dd>
      </div>
      {#if data.collection.archivedAt}
        <div class="flex items-center justify-between gap-3">
          <dt class="text-neutral-500">Archived</dt>
          <dd>{new Date(data.collection.archivedAt).toLocaleString()}</dd>
        </div>
      {/if}
    </dl>
  </div>
</div>

<h2 class="text-lg font-semibold mb-3">NFTs ({data.nfts.length})</h2>
{#if data.nfts.length === 0}
  <div class="panel p-6 text-sm text-neutral-500 mb-8">
    No NFTs in this collection yet.
    {#if !data.collection.archivedAt}
      <a class="text-[var(--color-accent)] underline" href="/nfts/new">Create one</a>.
    {/if}
  </div>
{:else}
  <div class="panel divide-y divide-[var(--color-line)] mb-8">
    {#each data.nfts as n}
      <div class="p-4 flex items-center justify-between gap-4">
        <div class="min-w-0">
          <div class="font-medium truncate">{n.name}</div>
          <div class="text-xs text-neutral-500">
            {n.mintedSupply}/{n.maxSupply} minted{n.tokenId ? ` · token #${n.tokenId}` : ' · token id pending'}
          </div>
        </div>
        {#if !data.collection.archivedAt}
          <a class="btn btn-ghost text-xs shrink-0" href={`/vouchers/new?nft=${n.id}`}>Sign voucher</a>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<h2 class="text-lg font-semibold mb-3">Vouchers ({data.vouchers.length})</h2>
{#if data.vouchers.length === 0}
  <div class="panel p-6 text-sm text-neutral-500">No vouchers signed for this collection yet.</div>
{:else}
  <div class="panel divide-y divide-[var(--color-line)]">
    {#each data.vouchers as v}
      <div class="p-4 flex items-center justify-between gap-4">
        <div class="min-w-0">
          <div class="font-medium truncate">{v.nftName} <span class="text-xs text-neutral-500">token #{v.tokenId}</span></div>
          <div class="text-xs text-neutral-500 mt-0.5">
            {fmtUsdc(v.pricePerUnit)} USDC · {v.soldAmount}/{v.maxAmount} sold · expires {new Date(v.expiresAt).toLocaleString()}
          </div>
        </div>
        <span
          class="text-xs px-2 py-0.5 rounded shrink-0"
          class:bg-green-900={v.status === 'active'}
          class:text-green-300={v.status === 'active'}
          class:bg-neutral-800={v.status !== 'active'}
          class:text-neutral-400={v.status !== 'active'}
        >{v.status}</span>
      </div>
    {/each}
  </div>
{/if}
