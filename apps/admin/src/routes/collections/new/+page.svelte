<script lang="ts">
  import { env } from '$env/dynamic/public';
  import { wallet } from '$lib/wallet.svelte.js';
  import { FACTORY_ABI } from '$lib/factoryAbi.js';
  import { goto } from '$app/navigation';
  import { decodeEventLog, keccak256, stringToBytes, type Hex } from 'viem';

  const factory = env.PUBLIC_FACTORY_ADDRESS as `0x${string}` | undefined;
  const chainId = Number(env.PUBLIC_CHAIN_ID);

  let name = $state('');
  let symbol = $state('');
  let royaltyReceiver = $state('');
  let royaltyBps = $state(500);
  let platformFeeBps = $state(250);
  let busy = $state(false);
  let err = $state<string | null>(null);
  let txHash = $state<Hex | null>(null);
  let newAddress = $state<string | null>(null);

  async function deploy() {
    if (!factory) {
      err = 'PUBLIC_FACTORY_ADDRESS not configured';
      return;
    }
    busy = true;
    err = null;
    try {
      await wallet.connect(chainId as 8453 | 84532 | 31337);

      // Persist a draft + audit trail
      await fetch('/api/admin/collections/draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          symbol,
          royaltyReceiver,
          royaltyBps,
          platformFeeBps,
        }),
      });

      const salt = keccak256(stringToBytes(`${name}|${symbol}|${Date.now()}`));
      const hash = await wallet.walletClient!.writeContract({
        address: factory,
        abi: FACTORY_ABI,
        functionName: 'createCollection',
        args: [
          name,
          symbol,
          royaltyReceiver as `0x${string}`,
          BigInt(royaltyBps),
          platformFeeBps,
          salt,
        ],
        account: wallet.state.address!,
        chain: wallet.walletClient!.chain,
      });
      txHash = hash;
      const receipt = await wallet.publicClient!.waitForTransactionReceipt({ hash });

      // Pull the CollectionCreated event for the new address
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({ abi: FACTORY_ABI, data: log.data, topics: log.topics });
          if (decoded.eventName === 'CollectionCreated') {
            newAddress = decoded.args.collection as string;
            await fetch('/api/admin/collections/confirm', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                chainId,
                contractAddress: newAddress,
                name,
                symbol,
                royaltyReceiver,
                royaltyBps,
                platformFeeBps,
                txHash,
              }),
            });
            break;
          }
        } catch {
          // Not our event; ignore.
        }
      }
      goto('/collections');
    } catch (e) {
      err = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<h1 class="text-2xl font-semibold mb-6">New collection</h1>

<div class="panel p-6 max-w-xl space-y-4">
  <label class="block text-sm">
    <span class="text-neutral-400">Name</span>
    <input class="input mt-1" bind:value={name} placeholder="Genesis Drop" />
  </label>
  <label class="block text-sm">
    <span class="text-neutral-400">Symbol</span>
    <input class="input mt-1" bind:value={symbol} placeholder="GEN" />
  </label>
  <label class="block text-sm">
    <span class="text-neutral-400">Royalty receiver</span>
    <input class="input mt-1 font-mono" bind:value={royaltyReceiver} placeholder="0x…" />
  </label>
  <div class="grid grid-cols-2 gap-4">
    <label class="block text-sm">
      <span class="text-neutral-400">Royalty bps (max 1000 = 10%)</span>
      <input type="number" min="0" max="1000" class="input mt-1" bind:value={royaltyBps} />
    </label>
    <label class="block text-sm">
      <span class="text-neutral-400">Platform fee bps (max 500 = 5%)</span>
      <input type="number" min="0" max="500" class="input mt-1" bind:value={platformFeeBps} />
    </label>
  </div>
  <button class="btn btn-primary w-full justify-center" onclick={deploy} disabled={busy}>
    {busy ? 'Deploying…' : 'Deploy collection'}
  </button>
  {#if txHash}<div class="text-xs text-neutral-500 break-all">Tx: {txHash}</div>{/if}
  {#if newAddress}<div class="text-xs text-green-400 break-all">New collection: {newAddress}</div>{/if}
  {#if err}<div class="text-sm text-red-400">{err}</div>{/if}
</div>
