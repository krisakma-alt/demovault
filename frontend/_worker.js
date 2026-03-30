// DemoVault — Cloudflare Pages Worker (라우팅)

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    // /demo/:id → demo.html 서빙
    if (pathname.startsWith('/demo/') && pathname.length > 6) {
      // Assets에서 demo.html을 직접 가져와 원래 URL 유지
      const assetUrl = new URL(request.url);
      assetUrl.pathname = '/demo.html';
      let res = await env.ASSETS.fetch(assetUrl.toString());
      // CF Pages가 301 redirect를 반환하면 따라감
      if (res.status === 301 || res.status === 308) {
        const loc = res.headers.get('Location');
        if (loc) {
          res = await env.ASSETS.fetch(new URL(loc, assetUrl).toString());
        }
      }
      return new Response(res.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // /submit → Cloudflare Access 인증 + submit.html
    if (pathname === '/submit') {
      const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
      if (!jwt) {
        const loginUrl = `https://krisakma.cloudflareaccess.com/cdn-cgi/access/login/${request.url}`;
        return Response.redirect(loginUrl, 302);
      }
      const assetUrl = new URL(request.url);
      assetUrl.pathname = '/submit.html';
      const res = await env.ASSETS.fetch(assetUrl);
      return new Response(res.body, {
        status: res.status,
        headers: res.headers,
      });
    }

    // /admin → COOP 헤더 추가
    if (pathname === '/admin') {
      const assetUrl = new URL(request.url);
      assetUrl.pathname = '/admin.html';
      const res = await env.ASSETS.fetch(assetUrl);
      const newRes = new Response(res.body, {
        status: res.status,
        headers: res.headers,
      });
      newRes.headers.set('Cross-Origin-Opener-Policy', 'unsafe-none');
      return newRes;
    }

    // /sitemap.xml → Worker API 프록시
    if (pathname === '/sitemap.xml') {
      return fetch('https://demovault-worker.krisakma.workers.dev/sitemap.xml');
    }

    // /compare → compare.html
    if (pathname === '/compare') {
      const assetUrl = new URL(request.url);
      assetUrl.pathname = '/compare.html';
      const res = await env.ASSETS.fetch(assetUrl);
      return new Response(res.body, {
        status: res.status,
        headers: res.headers,
      });
    }

    // 그 외 → 정적 파일 서빙
    return env.ASSETS.fetch(request);
  },
};
