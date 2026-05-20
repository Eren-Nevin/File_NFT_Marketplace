import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { items } = await locals.api.admin.collections.list();
  // Don't offer archived collections as a destination for new NFTs.
  return { collections: items.filter((c) => !c.archivedAt) };
};
