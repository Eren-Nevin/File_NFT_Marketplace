import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const [collections, nfts] = await Promise.all([
    locals.api.catalog.collections().catch(() => ({ items: [] })),
    locals.api.catalog.nfts().catch(() => ({ items: [] })),
  ]);
  return { collections: collections.items, nfts: nfts.items };
};
