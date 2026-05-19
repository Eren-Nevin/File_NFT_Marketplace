import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const { items } = await locals.api.admin.nfts.list();
  const preselect = url.searchParams.get('nft');
  return { nfts: items, preselect };
};
