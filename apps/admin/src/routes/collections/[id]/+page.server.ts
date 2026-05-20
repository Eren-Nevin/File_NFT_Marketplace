import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
  let collection;
  try {
    collection = await locals.api.admin.collections.get(params.id);
  } catch {
    throw error(404, 'Collection not found');
  }
  const [{ items: allNfts }, { items: allVouchers }] = await Promise.all([
    locals.api.admin.nfts.list(),
    locals.api.admin.vouchers.list(),
  ]);
  const nfts = allNfts.filter((n) => n.collectionId === collection.id);
  const contract = collection.contractAddress.toLowerCase();
  const vouchers = allVouchers.filter((v) => v.collection.toLowerCase() === contract);
  return { collection, nfts, vouchers };
};
