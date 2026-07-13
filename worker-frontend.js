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

    return env.ASSETS.fetch(request);
  },
};