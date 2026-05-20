import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const [{ items: nfts }, { items: collections }] = await Promise.all([
    locals.api.admin.nfts.list(),
    locals.api.admin.collections.list(),
  ]);
  const archivedIds = new Set(collections.filter((c) => c.archivedAt).map((c) => c.id));
  const liveNfts = nfts.filter((n) => !archivedIds.has(n.collectionId));
  const preselect = url.searchParams.get('nft');
  return { nfts: liveNfts, preselect };
};
