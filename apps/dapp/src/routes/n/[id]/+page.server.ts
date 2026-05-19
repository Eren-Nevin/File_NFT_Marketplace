import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
  try {
    const nft = await locals.api.catalog.nft(params.id);
    // fire-and-forget view increment from the server is fine here
    locals.api.catalog.countView(params.id).catch(() => {});
    return { nft };
  } catch (e) {
    throw error(404, 'Not found');
  }
};
