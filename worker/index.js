// DemoVault — Cloudflare Worker 메인 라우터

import { scanUrl } from './scan.js';

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return corsResponse();
    }

    const start = Date.now();
    const { pathname } = new URL(request.url);

    try {
      const response = await route(request, env);
      const duration = Date.now() - start;

      // 느린 요청 로깅 (500ms 이상)
      if (duration > 500) {
        console.warn(`[SLOW] ${request.method} ${pathname} — ${duration}ms (status: ${response.status})`);
      }

      return response;
    } catch (err) {
      const duration = Date.now() - start;
      console.error(`[ERROR] ${request.method} ${pathname} — ${duration}ms`, {
        message: err.message,
        stack: err.stack,
      });

      // Discord 에러 알림
      if (env.DISCORD_WEBHOOK_URL) {
        ctx.waitUntil(sendDiscordNotification(env.DISCORD_WEBHOOK_URL,
          `🚨 **DemoVault 오류**\n\`${request.method} ${pathname}\` — ${duration}ms\n\`\`\`${err.message}\`\`\``
        ));
      }

      return jsonResponse({ error: '서버 내부 오류가 발생했습니다.' }, 500);
    }
  },

  // ===== Cron Trigger: 주간 자동 재스캔 =====
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduledRescan(env));
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
  if (pathname === '/api/ls/checkout'      && method === 'POST')   return handleLsCheckout(request, env);
  if (pathname === '/api/ls/webhook'       && method === 'POST')   return handleLsWebhook(request, env);
  if (pathname === '/api/request'          && method === 'POST')   return handleRequest(request, env);
  if (pathname === '/api/admin/requests'   && method === 'GET')    return handleAdminRequests(env);
  if (pathname === '/api/admin/req-status' && method === 'PATCH')  return handleReqStatus(request, searchParams, env);
  if (pathname === '/api/captcha'          && method === 'GET')    return handleCaptcha(env);
  if (pathname === '/api/reviews'          && method === 'GET')    return handleGetReviews(searchParams, env);
  if (pathname === '/api/reviews'          && method === 'POST')   return handlePostReview(request, searchParams, env);

  return jsonResponse({ error: '존재하지 않는 경로입니다.' }, 404);
}

// ===== GET /api/admin/demos =====
async function handleAdminDemos(env) {
  const { keys } = await env.DEMOS.list();
  const demoKeys = keys.filter(({ name }) => !name.startsWith('req_') && !name.startsWith('reviews_') && !name.startsWith('rl_'));
  const demos = (await Promise.all(
    demoKeys.map(({ name: key }) =>
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
  const demoKeys = keys.filter(({ name }) => !name.startsWith('req_') && !name.startsWith('reviews_') && !name.startsWith('rl_'));
  const demos = (await Promise.all(
    demoKeys.map(({ name: key }) =>
      env.DEMOS.get(key).then(raw => raw ? JSON.parse(raw) : null)
    )
  )).filter(Boolean);
  // 기본 정렬: 리뷰 많은 순 → 최신순
  demos.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0) || b.createdAt - a.createdAt);
  return jsonResponse(demos, 200, { 'Cache-Control': 'public, max-age=60, s-maxage=120' });
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

  const staticUrls = ['/', '/submit', '/request'].map(path => `
  <url>
    <loc>${BASE_URL}${path}</loc>
    <changefreq>daily</changefreq>
  </url>`).join('');

  // req_ prefix 제외한 데모 개별 페이지
  const demoKeys = keys.filter(({ name }) => !name.startsWith('req_'));
  const demoUrls = demoKeys.map(({ name: id }) => `
  <url>
    <loc>${BASE_URL}/demo/${id}</loc>
    <changefreq>weekly</changefreq>
  </url>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${demoUrls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600, s-maxage=7200',
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

// ===== POST /api/ls/checkout =====
// LemonSqueezy 결제 세션 생성
async function handleLsCheckout(request, env) {
  if (!env.LEMONSQUEEZY_API_KEY) {
    return jsonResponse({ error: '결제 시스템이 설정되지 않았습니다.' }, 503);
  }

  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ error: '요청 본문이 올바르지 않습니다.' }, 400);
  }

  const { plan, demoId } = body;
  const VARIANT_IDS = {
    pro:  env.LEMONSQUEEZY_VARIANT_PRO,
    team: env.LEMONSQUEEZY_VARIANT_TEAM,
  };

  const variantId = VARIANT_IDS[plan];
  if (!variantId) return jsonResponse({ error: '올바르지 않은 플랜입니다. pro 또는 team을 선택하세요.' }, 400);

  const BASE = 'https://demovault.youngri.org';
  const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.LEMONSQUEEZY_API_KEY}`,
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            custom: { demo_id: demoId ?? '', plan },
          },
          product_options: {
            redirect_url: `${BASE}/demo/${demoId}?upgraded=1`,
          },
        },
        relationships: {
          store:   { data: { type: 'stores',   id: String(env.LEMONSQUEEZY_STORE_ID) } },
          variant: { data: { type: 'variants', id: String(variantId) } },
        },
      },
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    const msg = json.errors?.[0]?.detail ?? 'LemonSqueezy 오류';
    return jsonResponse({ error: msg }, 500);
  }

  return jsonResponse({ url: json.data?.attributes?.url });
}

// ===== POST /api/ls/webhook =====
// LemonSqueezy 결제 완료 후 KV에 Pro 상태 기록
async function handleLsWebhook(request, env) {
  const rawBody = await request.text();

  // HMAC-SHA256 서명 검증
  const signature = request.headers.get('X-Signature') ?? '';
  if (env.LEMONSQUEEZY_WEBHOOK_SECRET) {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(env.LEMONSQUEEZY_WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
    const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    if (expected !== signature) {
      return new Response('invalid signature', { status: 401 });
    }
  }

  let event;
  try { event = JSON.parse(rawBody); } catch {
    return new Response('bad json', { status: 400 });
  }

  // order_created 이벤트 처리
  if (event.meta?.event_name === 'order_created') {
    const custom  = event.meta?.custom_data ?? {};
    const demoId  = custom.demo_id;
    const plan    = custom.plan ?? 'pro';

    if (demoId) {
      const raw = await env.DEMOS.get(demoId);
      if (raw) {
        const demo = JSON.parse(raw);
        demo.tier            = plan;
        demo.tierActivatedAt = Date.now();
        await env.DEMOS.put(demoId, JSON.stringify(demo));
      }
    }
  }

  return new Response('ok', { status: 200 });
}

// ===== POST /api/request =====
// 개발자 피처 리퀘스트 / 버그 제보 접수
const VALID_REQ_TYPES = ['feature', 'bug', 'other'];

async function handleRequest(request, env) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ error: '요청 본문이 올바르지 않습니다.' }, 400);
  }

  const { type, message, email = '', name = '' } = body;

  if (!VALID_REQ_TYPES.includes(type)) {
    return jsonResponse({ error: 'type은 feature | bug | other 중 하나여야 합니다.' }, 400);
  }
  if (!message || message.trim().length < 10) {
    return jsonResponse({ error: '내용을 10자 이상 입력해주세요.' }, 400);
  }
  if (message.trim().length > 1000) {
    return jsonResponse({ error: '내용은 1000자 이내로 입력해주세요.' }, 400);
  }

  const id = `req_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const req = {
    id,
    type,
    message: message.trim(),
    email:   email.trim().slice(0, 200),
    name:    name.trim().slice(0, 100),
    status:  'new',       // new | reviewing | planned | done | declined
    createdAt: Date.now(),
  };

  await env.DEMOS.put(id, JSON.stringify(req));
  return jsonResponse({ success: true, id }, 201);
}

// ===== GET /api/admin/requests =====
async function handleAdminRequests(env) {
  const { keys } = await env.DEMOS.list({ prefix: 'req_' });
  const requests = (await Promise.all(
    keys.map(({ name: key }) =>
      env.DEMOS.get(key).then(raw => raw ? JSON.parse(raw) : null)
    )
  )).filter(Boolean);
  requests.sort((a, b) => b.createdAt - a.createdAt);
  return jsonResponse(requests);
}

// ===== PATCH /api/admin/req-status?id= =====
async function handleReqStatus(request, searchParams, env) {
  const id = searchParams.get('id');
  if (!id) return jsonResponse({ error: 'id가 필요합니다.' }, 400);

  const raw = await env.DEMOS.get(id);
  if (!raw) return jsonResponse({ error: '해당 요청을 찾을 수 없습니다.' }, 404);

  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ error: '요청 본문이 올바르지 않습니다.' }, 400);
  }

  const VALID_STATUSES = ['new', 'reviewing', 'planned', 'done', 'declined'];
  if (!VALID_STATUSES.includes(body.status)) {
    return jsonResponse({ error: '올바르지 않은 status입니다.' }, 400);
  }

  const req = JSON.parse(raw);
  req.status = body.status;
  await env.DEMOS.put(id, JSON.stringify(req));
  return jsonResponse({ success: true, req });
}

// ===== GET /api/captcha =====
// 간단 수학 CAPTCHA 생성 (토큰 기반)
async function handleCaptcha(env) {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  const answer = a + b;
  const question = `${a} + ${b} = ?`;

  // 토큰: answer를 암호화하여 전달 (HMAC 서명으로 위변조 방지)
  const secret = env.LEMONSQUEEZY_WEBHOOK_SECRET || 'demovault-captcha-secret';
  const payload = `${answer}:${Date.now()}`;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const token = btoa(payload) + '.' + Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

  return jsonResponse({ question, token });
}

// CAPTCHA 토큰 검증
async function verifyCaptcha(token, answer, env) {
  if (!token || answer == null) return false;

  const secret = env.LEMONSQUEEZY_WEBHOOK_SECRET || 'demovault-captcha-secret';
  const [payloadB64, sigHex] = token.split('.');
  if (!payloadB64 || !sigHex) return false;

  let payload;
  try { payload = atob(payloadB64); } catch { return false; }

  const [correctStr, tsStr] = payload.split(':');
  const correct = parseInt(correctStr, 10);
  const ts = parseInt(tsStr, 10);

  // 토큰 5분 만료
  const CAPTCHA_TTL_MS = 5 * 60 * 1000;
  if (Date.now() - ts > CAPTCHA_TTL_MS) return false;

  // 서명 검증
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  if (expected !== sigHex) return false;

  return parseInt(answer, 10) === correct;
}

// ===== GET /api/reviews?id= =====
async function handleGetReviews(searchParams, env) {
  const id = searchParams.get('id');
  if (!id) return jsonResponse({ error: 'id 파라미터가 필요합니다.' }, 400);

  const raw = await env.DEMOS.get(`reviews_${id}`);
  const reviews = raw ? JSON.parse(raw) : [];
  // 최신순 정렬
  reviews.sort((a, b) => b.createdAt - a.createdAt);
  return jsonResponse(reviews);
}

// ===== POST /api/reviews?id= =====
const MAX_REVIEWS_PER_DEMO = 200;
const RATE_LIMIT_TTL = 300; // 5분

async function handlePostReview(request, searchParams, env) {
  const demoId = searchParams.get('id');
  if (!demoId) return jsonResponse({ error: 'id 파라미터가 필요합니다.' }, 400);

  // 데모 존재 확인
  const demoRaw = await env.DEMOS.get(demoId);
  if (!demoRaw) return jsonResponse({ error: '해당 데모를 찾을 수 없습니다.' }, 404);

  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ error: '요청 본문이 올바르지 않습니다.' }, 400);
  }

  const { author = '', text, captcha } = body;

  // 텍스트 검증
  if (!text || typeof text !== 'string' || text.trim().length < 1) {
    return jsonResponse({ error: '리뷰 내용을 입력해주세요.' }, 400);
  }
  if (text.trim().length > 200) {
    return jsonResponse({ error: '리뷰는 200자 이내로 작성해주세요.' }, 400);
  }

  // CAPTCHA 검증
  if (!captcha || !captcha.token || captcha.answer == null) {
    return jsonResponse({ error: 'CAPTCHA 인증이 필요합니다.' }, 400);
  }
  const captchaValid = await verifyCaptcha(captcha.token, captcha.answer, env);
  if (!captchaValid) {
    return jsonResponse({ error: 'CAPTCHA 답이 틀렸거나 만료되었습니다.' }, 403);
  }

  // IP 기반 레이트리밋
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await hashString(ip + demoId);
  const rlKey = `rl_${ipHash}`;
  const rlHit = await env.DEMOS.get(rlKey);
  if (rlHit) {
    return jsonResponse({ error: '잠시 후에 다시 시도해주세요.' }, 429);
  }
  // 5분간 레이트리밋 키 설정
  await env.DEMOS.put(rlKey, '1', { expirationTtl: RATE_LIMIT_TTL });

  // 리뷰 저장
  const reviewsRaw = await env.DEMOS.get(`reviews_${demoId}`);
  const reviews = reviewsRaw ? JSON.parse(reviewsRaw) : [];

  const review = {
    rid: `r_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    author: (author.trim() || 'Anonymous').slice(0, 50),
    text: text.trim().slice(0, 200),
    createdAt: Date.now(),
  };

  reviews.push(review);

  // 최대 200개 제한 (오래된 것 제거)
  while (reviews.length > MAX_REVIEWS_PER_DEMO) {
    reviews.shift();
  }

  await env.DEMOS.put(`reviews_${demoId}`, JSON.stringify(reviews));

  // 데모 객체에 reviewCount 갱신
  const demo = JSON.parse(demoRaw);
  demo.reviewCount = reviews.length;
  await env.DEMOS.put(demoId, JSON.stringify(demo));

  return jsonResponse({ success: true, review, reviewCount: demo.reviewCount }, 201);
}

// IP 해싱 (개인정보 보호)
async function hashString(str) {
  const data = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

// ===== 헬퍼 =====
function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders,
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

// ===== Cron: 30일 이상 지난 데모 자동 재스캔 =====
async function handleScheduledRescan(env) {
  const RESCAN_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30일
  const MAX_RESCAN = 10; // 한 번에 최대 10개 (Worker CPU 제한)
  const now = Date.now();

  const { keys } = await env.DEMOS.list();
  const demoKeys = keys.filter(({ name }) =>
    !name.startsWith('req_') && !name.startsWith('reviews_') && !name.startsWith('rl_')
  );

  let rescanned = 0;

  for (const { name: key } of demoKeys) {
    if (rescanned >= MAX_RESCAN) break;

    const raw = await env.DEMOS.get(key);
    if (!raw) continue;

    const demo = JSON.parse(raw);
    const lastScan = demo.lastScanAt ?? demo.createdAt ?? 0;

    if (now - lastScan < RESCAN_AGE_MS) continue;

    try {
      const scanResult = await scanUrl(demo.url, env);
      demo.scanResult = scanResult;
      demo.lastScanAt = now;
      await env.DEMOS.put(key, JSON.stringify(demo));
      rescanned++;
      console.log(`[CRON] 재스캔 완료: ${demo.name} → ${scanResult.overall}`);
    } catch (err) {
      console.error(`[CRON] 재스캔 실패: ${demo.name}`, err.message);
    }
  }

  console.log(`[CRON] 재스캔 완료: ${rescanned}개`);

  // Discord 웹훅 알림 (설정된 경우)
  if (env.DISCORD_WEBHOOK_URL && rescanned > 0) {
    await sendDiscordNotification(env.DISCORD_WEBHOOK_URL,
      `🔄 **DemoVault 주간 재스캔 완료**\n재스캔: ${rescanned}개 / 전체: ${demoKeys.length}개`
    );
  }
}

// ===== Discord 웹훅 알림 =====
async function sendDiscordNotification(webhookUrl, content) {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  } catch (err) {
    console.error('[Discord] 알림 전송 실패:', err.message);
  }
}
