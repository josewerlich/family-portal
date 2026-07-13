// Frontend Worker for the family-portal site.
// Serves the built static SPA AND runs /api/whoami, which turns the
// Cloudflare Access-verified email into a short-lived HMAC token that the
// finance-api worker trusts. This is the server-side half of the July 2026
// security fix that never ran because this project deploys as a static-
// assets Worker (not Pages), so functions/ was ignored.
import { getVerifiedEmail, mintIdentityToken } from './functions/_lib/identity.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/whoami') {
      const email = getVerifiedEmail(request);
      if (!email) return json({ error: 'Unauthorized' }, 401);

      const secret = env.IDENTITY_SIGNING_SECRET;
      if (!secret) return json({ error: 'Server not configured' }, 500);

      const token = await mintIdentityToken(email, secret);
      return json({ email, token });
    }

    // Same-origin proxy for every other /api/* route: forward to the
    // finance-api worker over the service binding (worker-to-worker, so it
    // bypasses Cloudflare Access on api.familyfinances.uk and the browser
    // never makes a cross-origin call — no CORS, no preflights).
    if (url.pathname.startsWith('/api/')) {
      const email = getVerifiedEmail(request);
      if (!email) return json({ error: 'Unauthorized' }, 401);

      const secret = env.IDENTITY_SIGNING_SECRET;
      if (!secret) return json({ error: 'Server not configured' }, 500);

      // Build headers explicitly — never forward the incoming request's
      // headers wholesale, since a client could set its own copy of any
      // identity-carrying header. The Origin header is set from our own
      // origin so finance-api's getFamilyId() keeps resolving the family
      // subdomain (e.g. johnson.familyfinances.uk -> johnson).
      const headers = new Headers({
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
        'X-Identity-Token': await mintIdentityToken(email, secret),
        'Origin': url.origin,
      });

      const init = { method: request.method, headers };
      if (!['GET', 'HEAD'].includes(request.method)) {
        init.body = request.body;
      }

      const apiUrl = 'https://api.familyfinances.uk' + url.pathname + url.search;
      return env.API.fetch(new Request(apiUrl, init));
    }

    return env.ASSETS.fetch(request);
  },
};