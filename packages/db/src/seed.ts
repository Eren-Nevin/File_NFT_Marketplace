import { getDb, closeDb } from './client.js';
import { admins, users } from './schema.js';
import { sql } from 'drizzle-orm';

async function main() {
  const addr = process.env.INITIAL_SUPER_ADMIN_ADDRESS;
  if (!addr) {
    console.log('[seed] INITIAL_SUPER_ADMIN_ADDRESS not set — skipping');
    return;
  }
  const address = addr.toLowerCase();
  const db = getDb();
  await db
    .insert(users)
    .values({ address })
    .onConflictDoNothing({ target: users.address });
  await db
    .insert(admins)
    .values({ address, role: 'SUPER_ADMIN', addedBy: address })
    .onConflictDoUpdate({
      target: admins.address,
      set: { role: sql`'SUPER_ADMIN'::admin_role` },
    });
  console.log(`[seed] SUPER_ADMIN ensured: ${address}`);
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  })
  .finally(() => closeDb());
