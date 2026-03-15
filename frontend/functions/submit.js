export async function onRequest(context) {
  const jwt = context.request.headers.get('Cf-Access-Jwt-Assertion');

  if (!jwt) {
    const loginUrl = `https://krisakma.cloudflareaccess.com/cdn-cgi/access/login/${context.request.url}`;
    return Response.redirect(loginUrl, 302);
  }

  // 인증 통과 → submit.html 서빙
  const url = new URL(context.request.url);
  url.pathname = '/submit.html';
  return context.env.ASSETS.fetch(new Request(url.toString(), context.request));
}
