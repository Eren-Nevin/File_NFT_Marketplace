<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { shortAddress } from '@nftm/ui';

  let { data } = $props();

  let newAddr = $state('');
  let newRole = $state<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  let busy = $state(false);
  let err = $state<string | null>(null);

  async function add() {
    busy = true;
    err = null;
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address: newAddr, role: newRole }),
      });
      if (!res.ok) {
        err = (await res.json()).message ?? `Failed (${res.status})`;
        return;
      }
      newAddr = '';
      await invalidateAll();
    } finally {
      busy = false;
    }
  }

  async function remove(address: string) {
    if (!confirm(`Remove ${shortAddress(address)}?`)) return;
    const res = await fetch(`/api/admin/admins/${address}`, { method: 'DELETE' });
    if (res.ok) await invalidateAll();
  }
</script>

<h1 class="text-2xl font-semibold mb-6">Admin allowlist</h1>

<div class="panel p-5 max-w-2xl space-y-3 mb-8">
  <div class="grid grid-cols-[1fr_180px_120px] gap-3 items-end">
    <label class="block text-sm">
      <span class="text-neutral-400">Wallet address</span>
      <input class="input mt-1" placeholder="0x…" bind:value={newAddr} />
    </label>
    <label class="block text-sm">
      <span class="text-neutral-400">Role</span>
      <select class="select mt-1" bind:value={newRole}>
        <option value="ADMIN">ADMIN</option>
        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
      </select>
    </label>
    <button class="btn btn-primary justify-center" onclick={add} disabled={busy || !newAddr}>
      Add / update
    </button>
  </div>
  {#if err}<div class="text-sm text-red-400">{err}</div>{/if}
</div>

<table class="w-full text-sm">
  <thead class="text-left text-neutral-500 text-xs uppercase tracking-widest">
    <tr>
      <th class="pb-2">Address</th>
      <th class="pb-2">Role</th>
      <th class="pb-2">Added</th>
      <th></th>
    </tr>
  </thead>
  <tbody>
    {#each data.admins as a}
      <tr class="border-t border-[var(--color-line)]">
        <td class="py-3 font-mono">{a.address}</td>
        <td class="py-3">{a.role}</td>
        <td class="py-3 text-neutral-500">—</td>
        <td class="py-3 text-right">
          <button class="btn btn-ghost text-red-400" onclick={() => remove(a.address)}>Remove</button>
        </td>
      </tr>
    {/each}
  </tbody>
</table>
