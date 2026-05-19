import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { ApiError, ERROR_CODES } from '@nftm/shared/errors';
import { ZodError } from 'zod';
import { getDeps } from './deps.js';
import auth from './routes/auth.js';
import catalog from './routes/catalog.js';
import admins from './routes/admin/admins.js';
import media from './routes/admin/media.js';
import collections from './routes/admin/collections.js';
import nftsAdmin from './routes/admin/nfts.js';
import vouchers from './routes/admin/vouchers.js';
import treasury from './routes/admin/treasury.js';

const deps = getDeps();
const app = new Hono();

app.use('*', honoLogger((msg) => deps.log.info({ msg }, 'http')));
app.use(
  '*',
  cors({
    origin: [deps.env.DAPP_PUBLIC_ORIGIN, deps.env.ADMIN_PUBLIC_ORIGIN],
    credentials: true,
    allowHeaders: ['content-type', 'authorization'],
  }),
);

app.get('/health', (c) => c.json({ ok: true, chainId: deps.env.CHAIN_ID }));

app.route('/auth', auth);
app.route('/', catalog);
app.route('/admin/admins', admins);
app.route('/admin/media', media);
app.route('/admin/collections', collections);
app.route('/admin/nfts', nftsAdmin);
app.route('/admin/vouchers', vouchers);
app.route('/admin/treasury', treasury);

app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json({ code: err.code, message: err.message, details: err.details }, err.status as 400);
  }
  if (err instanceof ZodError) {
    return c.json(
      { code: ERROR_CODES.VALIDATION, message: 'invalid input', details: err.flatten() },
      400,
    );
  }
  deps.log.error({ err }, 'unhandled');
  return c.json({ code: ERROR_CODES.INTERNAL, message: 'internal error' }, 500);
});

const port = deps.env.PORT;
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  deps.log.info({ port: info.port }, 'api listening');
});
