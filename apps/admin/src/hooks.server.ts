import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { makeApi } from '$lib/server/api.js';

const PUBLIC_PATHS = new Set(['/login', '/api']);

export const handle: Handle = async ({ event, resolve }) => {
  const cookie = event.request.headers.get('cookie') ?? undefined;
  const api = makeApi({ cookie, fetch: event.fetch });
  event.locals.api = api;

  try {
    const me = await api.auth.me();
    event.locals.session =
      me.address && (me.role === 'ADMIN' || me.role === 'SUPER_ADMIN')
        ? { address: me.address as `0x${string}`, role: me.role }
        : null;
  } catch {
    event.locals.session = null;
  }

  const path = event.url.pathname;
  const isPublic =
    path === '/login' || path.startsWith('/api/') || path === '/favicon.svg';
  if (!event.locals.session && !isPublic) {
    throw redirect(303, '/login');
  }

  return resolve(event);
};
