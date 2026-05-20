import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.session) throw redirect(303, '/');
  const { items } = await locals.api.me.owned();
  return { session: locals.session, owned: items };
};
