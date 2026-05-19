<script lang="ts">
  import { wallet } from '$lib/wallet.svelte.js';
  import { buildSiwe } from '$lib/siwe.js';
  import { env } from '$env/dynamic/public';
  import { invalidateAll } from '$app/navigation';

  let { session } = $props<{ session: { address: string; role: string } | null }>();

  let busy = $state(false);
  let err = $state<string | null>(null);

  async function signIn() {
    busy = true;
    err = null;
    try {
      const chainId = Number(env.PUBLIC_CHAIN_ID);
      const address = await wallet.connect(chainId as 8453 | 84532 | 31337);

      const origin = window.location.origin;
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address }),
      }).then((r) => r.json());

      const message = buildSiwe({ address, chainId, origin, nonce: nonceRes.nonce });
      const signature = await wallet.signMessage(message);

      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      });
      if (!verifyRes.ok) {
        err = `Sign-in failed (${verifyRes.status})`;
        return;
      }
      await invalidateAll();
    } catch (e) {
      err = (e as Error).message;
    } finally {
      busy = false;
    }
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    wallet.disconnect();
    await invalidateAll();
  }
</script>

{#if session}
  <button class="btn btn-ghost" onclick={signOut} disabled={busy}>Sign out</button>
{:else}
  <button class="btn btn-primary" onclick={signIn} disabled={busy}>
    {busy ? 'Signing in…' : 'Connect wallet'}
  </button>
{/if}

{#if err}
  <span class="text-xs text-red-600 ml-2">{err}</span>
{/if}
