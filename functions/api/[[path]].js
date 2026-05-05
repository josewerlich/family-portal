export async function onRequest(context) {
  const url = new URL(context.request.url);
  const apiUrl = 'https://api.familyfinances.uk' + url.pathname + url.search;
  
  const req = new Request(apiUrl, {
    method: context.request.method,
    headers: context.request.headers,
    body: context.request.method !== 'GET' && context.request.method !== 'HEAD' 
      ? context.request.body 
      : undefined,
  });

  const response = await fetch(req);
  const data = await response.text();
  
  return new Response(data, {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}
