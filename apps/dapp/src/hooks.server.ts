import type { Handle } from '@sveltejs/kit';
import { makeApi } from '$lib/server/api.js';

export const handle: Handle = async ({ event, resolve }) => {
  const cookie = event.request.headers.get('cookie') ?? undefined;
  const api = makeApi({ cookie, fetch: event.fetch });
  event.locals.api = api;

  try {
    const me = await api.auth.me();
    event.locals.session = me.address
      ? { address: me.address as `0x${string}`, role: me.role as 'USER' | 'ADMIN' | 'SUPER_ADMIN' }
      : null;
  } catch {
    event.locals.session = null;
  }

  return resolve(event);
};
