import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { items } = await locals.api.admin.collections.list();
  return { collections: items };
};
