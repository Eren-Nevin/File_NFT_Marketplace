<script lang="ts">
  import { goto } from '$app/navigation';

  let { data } = $props();

  type Attribute = { trait_type: string; value: string };

  let collectionId = $state(data.collections[0]?.id ?? '');
  let name = $state('');
  let description = $state('');
  let maxSupply = $state(10);
  let mediaAssetId = $state<string | null>(null);
  let attributes = $state<Attribute[]>([]);
  let uploading = $state(false);
  let saving = $state(false);
  let err = $state<string | null>(null);

  function addAttr() {
    attributes = [...attributes, { trait_type: '', value: '' }];
  }
  function removeAttr(i: number) {
    attributes = attributes.filter((_, idx) => idx !== i);
  }

  // Safely extract a message from a Response whose body may not be JSON
  // (e.g. SvelteKit's HTML 500 page when the request body exceeds BODY_SIZE_LIMIT).
  async function readError(res: Response, fallback: string): Promise<string> {
    const body = await res.json().catch(() => null);
    return body?.message ?? `${fallback} (${res.status})`;
  }

  async function onFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    uploading = true;
    err = null;
    mediaAssetId = null;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        err = await readError(res, 'Upload failed');
        return;
      }
      const media = await res.json().catch(() => null);
      if (!media?.id) {
        err = 'Upload succeeded but server returned no media id.';
        return;
      }
      mediaAssetId = media.id;
    } catch (e) {
      err = `Upload failed: ${e instanceof Error ? e.message : String(e)}`;
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
      const cleanAttrs = attributes
        .map((a) => ({ trait_type: a.trait_type.trim(), value: a.value.trim() }))
        .filter((a) => a.trait_type && a.value);
      const res = await fetch('/api/admin/nfts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          collectionId,
          name,
          description,
          attributes: cleanAttrs,
          mediaAssetId,
          maxSupply: Number(maxSupply),
        }),
      });
      if (!res.ok) {
        err = await readError(res, 'Save failed');
        return;
      }
      goto('/nfts');
    } catch (e) {
      err = `Save failed: ${e instanceof Error ? e.message : String(e)}`;
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

  <div class="text-sm">
    <div class="flex items-center justify-between mb-2">
      <span class="text-neutral-400">Attributes (traits)</span>
      <button type="button" class="text-xs text-[var(--color-accent)] hover:underline" onclick={addAttr}>
        + Add trait
      </button>
    </div>
    {#if attributes.length === 0}
      <div class="text-xs text-neutral-500">No traits. They show as "Properties" in wallets and on explorers.</div>
    {:else}
      <div class="space-y-2">
        {#each attributes as attr, i (i)}
          <div class="flex gap-2">
            <input
              class="input flex-1"
              placeholder="Trait name (e.g. Rarity)"
              bind:value={attr.trait_type}
            />
            <input
              class="input flex-1"
              placeholder="Value (e.g. Rare)"
              bind:value={attr.value}
            />
            <button
              type="button"
              class="btn btn-ghost text-xs"
              onclick={() => removeAttr(i)}
              title="Remove trait"
            >×</button>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <button class="btn btn-primary w-full justify-center" onclick={save} disabled={saving || !name}>
    {saving ? 'Saving…' : 'Create NFT'}
  </button>
  {#if err}<div class="text-sm text-red-400">{err}</div>{/if}
</div>
