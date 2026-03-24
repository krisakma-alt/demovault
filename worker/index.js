// DemoVault — Cloudflare Worker 메인 라우터

import { scanUrl } from './scan.js';

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return corsResponse();
    }

    try {
      return await route(request, env);
    } catch (err) {
      console.error('[Worker] 처리되지 않은 오류:', err);
      return jsonResponse({ error: '서버 내부 오류가 발생했습니다.' }, 500);
    }
  },
};

// ===== 라우터 =====
async function route(request, env) {
  const { pathname, searchParams } = new URL(request.url);
  const method = request.method;

  if (pathname === '/api/submit'       && method === 'POST')   return handleSubmit(request, env);
  if (pathname === '/api/demos'        && method === 'GET')    return handleListDemos(env);
  if (pathname === '/api/click'        && method === 'POST')   return handleClick(searchParams, env);
  if (pathname === '/api/feedback'     && method === 'POST')   return handleFeedback(searchParams, env);
  if (pathname === '/api/rescan'       && method === 'GET')    return handleRescan(searchParams, env);
  if (pathname === '/sitemap.xml'      && method === 'GET')    return handleSitemap(env);
  if (pathname === '/api/admin/demos'  && method === 'GET')    return handleAdminDemos(env);
  if (pathname === '/api/admin/delete' && method === 'DELETE') return handleAdminDelete(searchParams, env);
  if (pathname === '/api/admin/update' && method === 'PATCH')  return handleAdminUpdate(request, searchParams, env);
  if (pathname.startsWith('/badge/')   && method === 'GET')    return handleBadge(pathname, env);
  if (pathname.startsWith('/api/demo/') && method === 'GET')  return handleGetDemo(pathname, env);
  if (pathname === '/api/stripe/checkout' && method === 'POST') return handleStripeCheckout(request, env);
  if (pathname === '/api/stripe/webhook'  && method === 'POST') return handleStripeWebhook(request, env);

  return jsonResponse({ error: '존재하지 않는 경로입니다.' }, 404);
}

// ===== GET /api/admin/demos =====
async function handleAdminDemos(env) {
  const { keys } = await env.DEMOS.list();
  const demos = (await Promise.all(
    keys.map(({ name: key }) =>
      env.DEMOS.get(key).then(raw => raw ? JSON.parse(raw) : null)
    )
  )).filter(Boolean);
  demos.sort((a, b) => b.createdAt - a.createdAt);
  return jsonResponse(demos);
}

// ===== DELETE /api/admin/delete?id= =====
async function handleAdminDelete(searchParams, env) {
  const id = searchParams.get('id');
  if (!id) return jsonResponse({ error: 'id 파라미터가 필요합니다.' }, 400);

  const raw = await env.DEMOS.get(id);
  if (!raw) return jsonResponse({ error: '해당 데모를 찾을 수 없습니다.' }, 404);

  await env.DEMOS.delete(id);
  return jsonResponse({ success: true });
}

// ===== PATCH /api/admin/update?id= =====
async function handleAdminUpdate(request, searchParams, env) {
  const id = searchParams.get('id');
  if (!id) return jsonResponse({ error: 'id 파라미터가 필요합니다.' }, 400);

  const raw = await env.DEMOS.get(id);
  if (!raw) return jsonResponse({ error: '해당 데모를 찾을 수 없습니다.' }, 404);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, 400);
  }

  const demo = JSON.parse(raw);
  if (body.name)     demo.name     = body.name;
  if (body.category) demo.category = body.category;
  if (body.desc !== undefined) demo.desc = body.desc;

  await env.DEMOS.put(id, JSON.stringify(demo));
  return jsonResponse({ success: true, demo });
}

// ===== 기존 핸들러 (변경 없음) =====
async function handleSubmit(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, 400);
  }

  const { name, url: demoUrl, category = 'other', desc = '' } = body;

  if (!name || !demoUrl) {
    return jsonResponse({ error: 'name과 url은 필수 항목입니다.' }, 400);
  }

  try {
    new URL(demoUrl);
  } catch {
    return jsonResponse({ error: 'url 형식이 올바르지 않습니다.' }, 400);
  }

  const scanResult = await scanUrl(demoUrl, env);

  const id = crypto.randomUUID();
  const demo = { id, name, url: demoUrl, category, desc, scanResult, createdAt: Date.now() };
  await env.DEMOS.put(id, JSON.stringify(demo));

  return jsonResponse({ id, scanResult }, 201);
}

async function handleListDemos(env) {
  const { keys } = await env.DEMOS.list();
  const demos = await Promise.all(
    keys.map(({ name: key }) =>
      env.DEMOS.get(key).then(raw => JSON.parse(raw))
    )
  );
  demos.sort((a, b) => b.createdAt - a.createdAt);
  return jsonResponse(demos);
}

// ===== POST /api/click?id= =====
// 클릭수 카운트 증가 + 캐시된 스캔 결과 즉시 반환 (API 재호출 없음)
async function handleClick(searchParams, env) {
  const id = searchParams.get('id');
  if (!id) return jsonResponse({ error: 'id 파라미터가 필요합니다.' }, 400);

  const raw = await env.DEMOS.get(id);
  if (!raw) return jsonResponse({ error: '해당 데모를 찾을 수 없습니다.' }, 404);

  const demo = JSON.parse(raw);
  demo.clickCount = (demo.clickCount ?? 0) + 1;
  await env.DEMOS.put(id, JSON.stringify(demo));

  return jsonResponse({ scanResult: demo.scanResult, clickCount: demo.clickCount });
}

// ===== POST /api/feedback?id=&type= =====
// type: tried_it | useful | needs_work
const VALID_FEEDBACK_TYPES = ['tried_it', 'useful', 'needs_work'];

async function handleFeedback(searchParams, env) {
  const id   = searchParams.get('id');
  const type = searchParams.get('type');

  if (!id)   return jsonResponse({ error: 'id 파라미터가 필요합니다.' }, 400);
  if (!VALID_FEEDBACK_TYPES.includes(type)) {
    return jsonResponse({ error: 'type은 tried_it | useful | needs_work 중 하나여야 합니다.' }, 400);
  }

  const raw = await env.DEMOS.get(id);
  if (!raw) return jsonResponse({ error: '해당 데모를 찾을 수 없습니다.' }, 404);

  const demo = JSON.parse(raw);
  demo.feedback = demo.feedback ?? { tried_it: 0, useful: 0, needs_work: 0 };
  demo.feedback[type] = (demo.feedback[type] ?? 0) + 1;
  await env.DEMOS.put(id, JSON.stringify(demo));

  return jsonResponse({ feedback: demo.feedback });
}

// ===== GET /sitemap.xml =====
async function handleSitemap(env) {
  const { keys } = await env.DEMOS.list();
  const BASE_URL = 'https://demovault.youngri.org';

  const staticUrls = ['/', '/submit'].map(path => `
  <url>
    <loc>${BASE_URL}${path}</loc>
    <changefreq>daily</changefreq>
  </url>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

async function handleRescan(searchParams, env) {
  const id = searchParams.get('id');
  if (!id) return jsonResponse({ error: 'id 파라미터가 필요합니다.' }, 400);

  const raw = await env.DEMOS.get(id);
  if (!raw) return jsonResponse({ error: '해당 데모를 찾을 수 없습니다.' }, 404);

  const demo = JSON.parse(raw);
  const scanResult = await scanUrl(demo.url, env);

  demo.scanResult = scanResult;
  demo.lastScannedAt = Date.now();
  await env.DEMOS.put(id, JSON.stringify(demo));

  return jsonResponse({ id, scanResult, lastScannedAt: demo.lastScannedAt });
}

// ===== GET /badge/:id.svg =====
// shields.io 스타일 SVG 뱃지 반환
async function handleBadge(pathname, env) {
  // /badge/abc123.svg → abc123
  const id = pathname.replace('/badge/', '').replace('.svg', '');
  const raw = await env.DEMOS.get(id);

  let label  = 'DemoVault';
  let status = 'unknown';
  let color  = '#9e9e9e';

  if (raw) {
    const demo = JSON.parse(raw);
    const overall = demo.scanResult?.overall ?? 'pending';
    if (overall === 'safe') {
      status = 'verified ✓';
      color  = '#4caf50';
    } else if (overall === 'unsafe') {
      status = 'unsafe ✗';
      color  = '#f44336';
    } else {
      status = 'scanning…';
      color  = '#ff9800';
    }
  }

  const labelW  = 90;
  const statusW = status.length * 7 + 16;
  const totalW  = labelW + statusW;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="20">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalW}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="20" fill="#555"/>
    <rect x="${labelW}" width="${statusW}" height="20" fill="${color}"/>
    <rect width="${totalW}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelW / 2}" y="14" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelW / 2}" y="13">${label}</text>
    <text x="${labelW + statusW / 2}" y="14" fill="#010101" fill-opacity=".3">${status}</text>
    <text x="${labelW + statusW / 2}" y="13">${status}</text>
  </g>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// ===== GET /api/demo/:id =====
async function handleGetDemo(pathname, env) {
  const id = pathname.replace('/api/demo/', '');
  if (!id) return jsonResponse({ error: 'id가 필요합니다.' }, 400);

  const raw = await env.DEMOS.get(id);
  if (!raw) return jsonResponse({ error: '해당 데모를 찾을 수 없습니다.' }, 404);

  return jsonResponse(JSON.parse(raw));
}

// ===== POST /api/stripe/checkout =====
// Pro/Team 플랜 결제 세션 생성
async function handleStripeCheckout(request, env) {
  if (!env.STRIPE_SECRET_KEY) {
    return jsonResponse({ error: 'Stripe가 설정되지 않았습니다.' }, 503);
  }

  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ error: '요청 본문이 올바르지 않습니다.' }, 400);
  }

  const { plan, demoId } = body;
  const PRICE_IDS = {
    pro:  env.STRIPE_PRICE_PRO,
    team: env.STRIPE_PRICE_TEAM,
  };

  const priceId = PRICE_IDS[plan];
  if (!priceId) return jsonResponse({ error: '올바르지 않은 플랜입니다. pro 또는 team을 선택하세요.' }, 400);

  const BASE = 'https://demovault.youngri.org';
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price]':   priceId,
      'line_items[0][quantity]': '1',
      'mode': 'subscription',
      'success_url': `${BASE}/demo/${demoId}?upgraded=1`,
      'cancel_url':  `${BASE}/demo/${demoId}`,
      'metadata[demo_id]': demoId ?? '',
      'metadata[plan]':    plan,
    }),
  });

  const session = await res.json();
  if (!res.ok) return jsonResponse({ error: session.error?.message ?? 'Stripe 오류' }, 500);

  return jsonResponse({ url: session.url });
}

// ===== POST /api/stripe/webhook =====
// 결제 완료 후 KV에 Pro 상태 기록
async function handleStripeWebhook(request, env) {
  // 실제 운영: Stripe-Signature 검증 필요
  // 현재는 구조만 구축 (STRIPE_WEBHOOK_SECRET 설정 후 활성화)
  let event;
  try { event = await request.json(); } catch {
    return new Response('bad json', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const { demo_id, plan } = event.data?.object?.metadata ?? {};
    if (demo_id) {
      const raw = await env.DEMOS.get(demo_id);
      if (raw) {
        const demo = JSON.parse(raw);
        demo.tier = plan ?? 'pro';
        demo.tierActivatedAt = Date.now();
        await env.DEMOS.put(demo_id, JSON.stringify(demo));
      }
    }
  }

  return new Response('ok', { status: 200 });
}

// ===== 헬퍼 =====
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function corsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
