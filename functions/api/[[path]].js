export async function onRequest(context) {
  const url = new URL(context.request.url);
  const apiUrl = 'https://api.familyfinances.uk' + url.pathname + url.search;

  const init = {
    method: context.request.method,
    headers: context.request.headers,
  };

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
