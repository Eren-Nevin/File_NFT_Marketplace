import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { items } = await locals.api.admin.nfts.list();
  return { nfts: items };
};
