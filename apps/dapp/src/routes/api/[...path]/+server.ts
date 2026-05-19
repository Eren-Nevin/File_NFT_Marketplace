import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

/* Transparent proxy: forwards browser → internal API across the compose
 * network. Preserves cookies in both directions so SIWE / session works. */
async function proxy(event: Parameters<RequestHandler>[0]) {
  const base = (env.API_INTERNAL_URL ?? 'http://api:8080').replace(/\/$/, '');
  const url = `${base}/${event.params.path}${event.url.search}`;

  const headers = new Headers(event.request.headers);
  headers.delete('host');
  headers.delete('content-length');

  const res = await fetch(url, {
    method: event.request.method,
    headers,
    body:
      event.request.method === 'GET' || event.request.method === 'HEAD'
        ? undefined
        : await event.request.arrayBuffer(),
  });

  const outHeaders = new Headers(res.headers);
  outHeaders.delete('content-encoding');
  outHeaders.delete('transfer-encoding');

  return new Response(res.body, { status: res.status, headers: outHeaders });
}

export const GET: RequestHandler = (e) => proxy(e);
export const POST: RequestHandler = (e) => proxy(e);
export const PUT: RequestHandler = (e) => proxy(e);
export const PATCH: RequestHandler = (e) => proxy(e);
export const DELETE: RequestHandler = (e) => proxy(e);
