// /demo/:id → demo.html 서빙 (SPA 라우팅)
export async function onRequest(context) {
  const url = new URL(context.request.url);
  url.pathname = '/demo.html';
  return context.env.ASSETS.fetch(url.toString());
}
