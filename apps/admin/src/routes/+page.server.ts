import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const [collections, nfts] = await Promise.all([
    locals.api.admin.collections.list().catch(() => ({ items: [] })),
    locals.api.admin.nfts.list().catch(() => ({ items: [] })),
  ]);
  return {
    collectionsCount: collections.items.length,
    nftsCount: nfts.items.length,
  };
};
