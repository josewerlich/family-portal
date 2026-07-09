import { getVerifiedEmail, mintIdentityToken } from '../_lib/identity.js';

export async function onRequest(context) {
  const email = getVerifiedEmail(context.request);
  if (!email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const secret = context.env.IDENTITY_SIGNING_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ error: 'Server not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = await mintIdentityToken(email, secret);
  return new Response(JSON.stringify({ email, token }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
