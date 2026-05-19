<script lang="ts">
  import { goto } from '$app/navigation';

  let { data } = $props();

  let collectionId = $state(data.collections[0]?.id ?? '');
  let name = $state('');
  let description = $state('');
  let maxSupply = $state(10);
  let mediaAssetId = $state<string | null>(null);
  let uploading = $state(false);
  let saving = $state(false);
  let err = $state<string | null>(null);

  async function onFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    uploading = true;
    err = null;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        err = (await res.json()).message ?? `Upload failed (${res.status})`;
        return;
      }
      const media = await res.json();
      mediaAssetId = media.id;
    } finally {
      uploading = false;
    }
  }

  async function save() {
    if (!mediaAssetId) {
      err = 'Upload a media file first.';
      return;
    }
    saving = true;
    err = null;
    try {
      const res = await fetch('/api/admin/nfts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          collectionId,
          name,
          description,
          attributes: [],
          mediaAssetId,
          maxSupply: Number(maxSupply),
        }),
      });
      if (!res.ok) {
        err = (await res.json()).message ?? `Save failed (${res.status})`;
        return;
      }
      goto('/nfts');
    } finally {
      saving = false;
    }
  }
</script>

<h1 class="text-2xl font-semibold mb-6">New NFT</h1>

<div class="panel p-6 max-w-xl space-y-4">
  <label class="block text-sm">
    <span class="text-neutral-400">Collection</span>
    <select class="select mt-1" bind:value={collectionId}>
      {#each data.collections as c}
        <option value={c.id}>{c.name} ({c.symbol})</option>
      {/each}
    </select>
  </label>

  <label class="block text-sm">
    <span class="text-neutral-400">Media file (max 100 MB)</span>
    <input type="file" class="input mt-1" onchange={onFile} />
    {#if uploading}<div class="text-xs text-neutral-500 mt-1">Pinning to IPFS…</div>{/if}
    {#if mediaAssetId}
      <div class="text-xs text-green-400 mt-1 font-mono">media: {mediaAssetId}</div>
    {/if}
  </label>

  <label class="block text-sm">
    <span class="text-neutral-400">Name</span>
    <input class="input mt-1" bind:value={name} />
  </label>

  <label class="block text-sm">
    <span class="text-neutral-400">Description</span>
    <textarea class="input mt-1" rows="4" bind:value={description}></textarea>
  </label>

  <label class="block text-sm">
    <span class="text-neutral-400">Max supply (edition size)</span>
    <input type="number" min="1" class="input mt-1" bind:value={maxSupply} />
  </label>

  <button class="btn btn-primary w-full justify-center" onclick={save} disabled={saving || !name}>
    {saving ? 'Saving…' : 'Create NFT'}
  </button>
  {#if err}<div class="text-sm text-red-400">{err}</div>{/if}
</div>
