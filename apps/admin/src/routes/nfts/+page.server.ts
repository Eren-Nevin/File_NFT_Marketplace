import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const [nfts, collections] = await Promise.all([
    locals.api.admin.nfts.list(),
    locals.api.admin.collections.list(),
  ]);
  return { nfts: nfts.items, collections: collections.items };
};
