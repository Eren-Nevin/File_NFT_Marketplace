<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import { shortAddress } from '@nftm/ui';
  import { goto } from '$app/navigation';

  let { data, children } = $props();

  const navItems = [
    { href: '/', label: 'Overview' },
    { href: '/collections', label: 'Collections' },
    { href: '/nfts', label: 'NFTs' },
    { href: '/vouchers', label: 'Vouchers' },
    { href: '/treasury', label: 'Treasury', superOnly: true },
    { href: '/admins', label: 'Admins', superOnly: true },
  ];

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    goto('/login');
  }
</script>

{#if data.session}
  <div class="grid min-h-dvh grid-cols-[220px_1fr]">
    <aside class="border-r border-[var(--color-line)] p-4 flex flex-col gap-2">
      <div class="px-2 pb-4 flex flex-col">
        <span class="text-xs uppercase tracking-widest text-neutral-500">NFTM Admin</span>
        <span class="text-sm font-mono">{shortAddress(data.session.address)}</span>
        <span class="text-xs text-neutral-500">{data.session.role}</span>
      </div>
      {#each navItems as item}
        {#if !item.superOnly || data.session.role === 'SUPER_ADMIN'}
          {@const active =
            page.url.pathname === item.href ||
            (item.href !== '/' && page.url.pathname.startsWith(item.href))}
          <a
            href={item.href}
            class="rounded px-3 py-2 text-sm transition hover:bg-[var(--color-panel)] {active
              ? 'bg-[var(--color-panel)]'
              : ''}"
          >
            {item.label}
          </a>
        {/if}
      {/each}
      <button class="btn btn-ghost mt-auto justify-center" onclick={signOut}>Sign out</button>
    </aside>
    <main class="p-8">
      {@render children?.()}
    </main>
  </div>
{:else}
  {@render children?.()}
{/if}
