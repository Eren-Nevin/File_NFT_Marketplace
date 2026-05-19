import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.session?.role !== 'SUPER_ADMIN') throw error(403, 'Forbidden');
  const sales = await locals.api.admin.treasury.sales().catch(() => ({ items: [] }));
  return { sales: sales.items };
};
