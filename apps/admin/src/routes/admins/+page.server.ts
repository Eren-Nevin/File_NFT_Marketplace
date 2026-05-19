import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.session?.role !== 'SUPER_ADMIN') throw error(403, 'Forbidden');
  const { items } = await locals.api.admin.admins.list();
  return { admins: items };
};
