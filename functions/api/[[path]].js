import { getVerifiedEmail, mintIdentityToken } from '../_lib/identity.js';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const apiUrl = 'https://api.familyfinances.uk' + url.pathname + url.search;

  // Build headers explicitly — never forward the incoming request's headers
  // wholesale, since a client could otherwise set its own copy of any
  // identity-carrying header we care about.
  const headers = new Headers({ 'Content-Type': 'application/json' });

  const email = getVerifiedEmail(context.request);
  const secret = context.env.IDENTITY_SIGNING_SECRET;
  if (email && secret) {
    headers.set('X-Identity-Token', await mintIdentityToken(email, secret));
  }

  const init = { method: context.request.method, headers };
  if (!['GET', 'HEAD'].includes(context.request.method)) {
    init.body = context.request.body;
  }

  const response = await fetch(apiUrl, init);
  const data = await response.text();

  return new Response(data, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
