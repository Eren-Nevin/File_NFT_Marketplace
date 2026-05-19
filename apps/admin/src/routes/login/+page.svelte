<script lang="ts">
  import { wallet } from '$lib/wallet.svelte.js';
  import { buildAdminSiwe } from '$lib/siwe.js';
  import { env } from '$env/dynamic/public';
  import { goto } from '$app/navigation';

  let busy = $state(false);
  let err = $state<string | null>(null);

  async function signIn() {
    busy = true;
    err = null;
    try {
      const chainId = Number(env.PUBLIC_CHAIN_ID);
      const address = await wallet.connect(chainId as 8453 | 84532 | 31337);
      const origin = window.location.origin;
      const { nonce } = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address }),
      }).then((r) => r.json());

      const message = buildAdminSiwe({ address, chainId, origin, nonce });
      const signature = await wallet.signMessage(message);

      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        err = body.message ?? `Sign-in failed (${res.status})`;
        return;
      }
      goto('/');
    } catch (e) {
      err = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<div class="min-h-dvh flex items-center justify-center p-6">
  <div class="panel p-8 w-full max-w-sm space-y-5">
    <div>
      <h1 class="text-xl font-semibold">NFTM Admin</h1>
      <p class="text-sm text-neutral-400">
        Sign in with an allowlisted admin wallet to continue.
      </p>
    </div>
    <button class="btn btn-primary w-full justify-center" onclick={signIn} disabled={busy}>
      {busy ? 'Signing in…' : 'Connect wallet & sign in'}
    </button>
    {#if err}<div class="text-sm text-red-400">{err}</div>{/if}
  </div>
</div>
