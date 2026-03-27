// /compare → compare.html 서빙
export async function onRequest(context) {
  const url = new URL(context.request.url);
  url.pathname = '/compare.html';
  return context.env.ASSETS.fetch(url.toString());
}
