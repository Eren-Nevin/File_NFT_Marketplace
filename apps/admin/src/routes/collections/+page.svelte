<script lang="ts">
  import { shortAddress } from '@nftm/ui';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
  let busy = $state<string | null>(null);
  let err = $state<string | null>(null);

  async function archive(id: string, name: string) {
    if (!confirm(`Archive "${name}"? It will be hidden from the dapp and no new vouchers can be signed. Existing buyers keep access. You can unarchive later.`)) return;
    busy = id;
    err = null;
    try {
      const res = await fetch(`/api/admin/collections/${id}/archive`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        err = body?.message ?? `Archive failed (${res.status})`;
        return;
      }
      await invalidateAll();
    } catch (e) {
      err = `Archive failed: ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      busy = null;
    }
  }

  async function unarchive(id: string) {
    busy = id;
    err = null;
    try {
      const res = await fetch(`/api/admin/collections/${id}/unarchive`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        err = body?.message ?? `Unarchive failed (${res.status})`;
        return;
      }
      await invalidateAll();
    } catch (e) {
      err = `Unarchive failed: ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      busy = null;
    }
  }
</script>

<div class="flex items-end justify-between mb-6">
  <h1 class="text-2xl font-semibold">Collections</h1>
  <a href="/collections/new" class="btn btn-primary">New collection</a>
</div>

{#if err}
  <div class="panel p-4 mb-4 text-sm text-red-400">{err}</div>
{/if}

<div class="panel divide-y divide-[var(--color-line)]">
  {#each data.collections as c}
    <div class="p-4 grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center">
      <div class="min-w-0">
        <div class="font-medium truncate">
          {c.name} <span class="text-neutral-500 text-sm">({c.symbol})</span>
          {#if c.archivedAt}
            <span class="ml-2 text-[10px] uppercase tracking-wide bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded">archived</span>
          {/if}
        </div>
        <div class="text-xs text-neutral-500 font-mono">{shortAddress(c.contractAddress)}</div>
      </div>
      <div class="text-xs text-neutral-400 shrink-0">
        royalty {c.royaltyBps / 100}% · platform {c.platformFeeBps / 100}%
      </div>
      {#if c.archivedAt}
        <button class="btn btn-ghost text-xs" onclick={() => unarchive(c.id)} disabled={busy === c.id}>
          {busy === c.id ? '…' : 'Unarchive'}
        </button>
      {:else}
        <button class="btn btn-ghost text-xs" onclick={() => archive(c.id, c.name)} disabled={busy === c.id}>
          {busy === c.id ? '…' : 'Archive'}
        </button>
      {/if}
      <a href={`/collections/${c.id}`} class="btn btn-ghost">Open</a>
    </div>
  {:else}
    <div class="p-6 text-neutral-500 text-sm">No collections yet.</div>
  {/each}
</div>
