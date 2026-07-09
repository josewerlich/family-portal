// Shared helpers for turning a Cloudflare Access-verified identity into a
// short-lived signed token the worker (api.familyfinances.uk) can check
// without needing to talk to Cloudflare Access itself.

function toBase64Url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return toBase64Url(new Uint8Array(sigBuf));
}

// Cloudflare Access sets/overwrites this header at the edge when Access
// protects the hostname the request came in on. A client cannot forge it
// as long as Access is enforced for that route.
export function getVerifiedEmail(request) {
  return request.headers.get('CF-Access-Authenticated-User-Email') || null;
}

export async function mintIdentityToken(email, secret, ttlMs = 5 * 60 * 1000) {
  const expiry = Date.now() + ttlMs;
  const payload = `${email}:${expiry}`;
  const sig = await hmac(secret, payload);
  return `${payload}:${sig}`;
}
