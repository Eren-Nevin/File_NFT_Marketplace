import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const [{ items: vouchers }, { items: nfts }] = await Promise.all([
    locals.api.admin.vouchers.list(),
    locals.api.admin.nfts.list(),
  ]);
  return { vouchers, nfts };
};
