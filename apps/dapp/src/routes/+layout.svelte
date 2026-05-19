<script lang="ts">
  import '../app.css';
  import { BRAND, shortAddress } from '@nftm/ui';
  import SignInButton from '$lib/components/SignInButton.svelte';

  let { data, children } = $props();
</script>

<div class="mx-auto max-w-6xl px-6 py-8">
  <header class="flex items-center justify-between">
    <a href="/" class="flex flex-col leading-tight">
      <span class="text-xl font-semibold tracking-tight">{BRAND.name}</span>
      <span class="text-xs text-neutral-500">{BRAND.tagline}</span>
    </a>
    <nav class="flex items-center gap-3 text-sm">
      <a href="/" class="btn btn-ghost">Drops</a>
      {#if data.session}
        <a href="/me" class="btn btn-ghost">{shortAddress(data.session.address)}</a>
      {/if}
      <SignInButton session={data.session} />
    </nav>
  </header>

  <main class="py-10">
    {@render children?.()}
  </main>

  <footer class="mt-16 border-t border-neutral-200 pt-6 text-sm text-neutral-500 flex items-center justify-between">
    <span>&copy; {new Date().getFullYear()} FreedomFi</span>
    <a href="/legal/terms" class="hover:text-neutral-900">Terms of Service</a>
  </footer>
</div>
