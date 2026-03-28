// DemoVault — Worker API CRUD + 비즈니스 로직 테스트
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Worker 모듈 import
import worker from '../index.js';

// ===== KV Mock 생성 =====
function createKVMock(initialData = {}) {
  const store = new Map(Object.entries(initialData));

  return {
    get: vi.fn(async (key) => store.get(key) ?? null),
    put: vi.fn(async (key, value) => { store.set(key, value); }),
    delete: vi.fn(async (key) => { store.delete(key); }),
    list: vi.fn(async ({ prefix } = {}) => {
      const keys = [...store.keys()]
        .filter(k => !prefix || k.startsWith(prefix))
        .map(name => ({ name }));
      return { keys };
    }),
    _store: store,
  };
}

// ===== 헬퍼 =====
function makeRequest(path, options = {}) {
  const {
    method = 'GET',
    body = null,
    headers = {},
    ip = '1.2.3.4',
  } = options;

  const url = `https://worker.test${path}`;
  const reqHeaders = new Headers({
    'Content-Type': 'application/json',
    'CF-Connecting-IP': ip,
    ...headers,
  });

  return new Request(url, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : null,
  });
}

async function callWorker(request, env) {
  const response = await worker.fetch(request, env);
  const data = response.headers.get('Content-Type')?.includes('json')
    ? await response.json()
    : await response.text();
  return { status: response.status, data, response };
}

// scan.js 모킹 — 모든 테스트에서 스캔을 즉시 safe로 반환
vi.mock('../scan.js', () => ({
  scanUrl: vi.fn(async () => ({
    overall: 'safe',
    details: { webRisk: 'safe', safeBrowsing: 'safe', urlscan: 'safe' },
  })),
}));

// ===== 테스트 =====
describe('Worker API', () => {
  let env;

  beforeEach(() => {
    env = {
      DEMOS: createKVMock(),
      GOOGLE_API_KEY: 'test-key',
      URLSCAN_API_KEY: 'test-key',
      LEMONSQUEEZY_WEBHOOK_SECRET: 'test-secret',
    };
  });

  // ===== CORS =====
  describe('OPTIONS (CORS)', () => {
    it('OPTIONS 요청에 CORS 헤더 반환', async () => {
      const req = makeRequest('/api/demos', { method: 'OPTIONS' });
      const { status, response } = await callWorker(req, env);

      expect(status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
  });

  // ===== 404 =====
  describe('라우팅', () => {
    it('존재하지 않는 경로는 404', async () => {
      const req = makeRequest('/api/nonexistent');
      const { status, data } = await callWorker(req, env);

      expect(status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });

  // ===== POST /api/submit =====
  describe('POST /api/submit', () => {
    it('정상 등록', async () => {
      const req = makeRequest('/api/submit', {
        method: 'POST',
        body: { name: 'TestDemo', url: 'https://example.com', category: 'utility' },
      });

      const { status, data } = await callWorker(req, env);

      expect(status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.scanResult.overall).toBe('safe');
      expect(env.DEMOS.put).toHaveBeenCalled();
    });

    it('name 누락 시 400', async () => {
      const req = makeRequest('/api/submit', {
        method: 'POST',
        body: { url: 'https://example.com' },
      });

      const { status, data } = await callWorker(req, env);
      expect(status).toBe(400);
      expect(data.error).toContain('name');
    });

    it('url 누락 시 400', async () => {
      const req = makeRequest('/api/submit', {
        method: 'POST',
        body: { name: 'TestDemo' },
      });

      const { status } = await callWorker(req, env);
      expect(status).toBe(400);
    });

    it('잘못된 URL 형식 시 400', async () => {
      const req = makeRequest('/api/submit', {
        method: 'POST',
        body: { name: 'TestDemo', url: 'not-a-url' },
      });

      const { status, data } = await callWorker(req, env);
      expect(status).toBe(400);
      expect(data.error).toContain('url');
    });

    it('잘못된 JSON 바디 시 400', async () => {
      const req = new Request('https://worker.test/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{{{',
      });

      const { status } = await callWorker(req, env);
      expect(status).toBe(400);
    });
  });

  // ===== GET /api/demos =====
  describe('GET /api/demos', () => {
    it('데모 목록 반환 (리뷰 많은 순 → 최신순)', async () => {
      const demo1 = JSON.stringify({ id: 'a', name: 'Old', createdAt: 1000, reviewCount: 0 });
      const demo2 = JSON.stringify({ id: 'b', name: 'Popular', createdAt: 2000, reviewCount: 5 });
      const demo3 = JSON.stringify({ id: 'c', name: 'New', createdAt: 3000, reviewCount: 0 });

      env.DEMOS = createKVMock({ a: demo1, b: demo2, c: demo3 });

      const req = makeRequest('/api/demos');
      const { status, data } = await callWorker(req, env);

      expect(status).toBe(200);
      expect(data).toHaveLength(3);
      expect(data[0].name).toBe('Popular'); // 리뷰 많은 순
      expect(data[1].name).toBe('New');     // 리뷰 같으면 최신순
    });

    it('req_, reviews_, rl_ prefix 키는 제외', async () => {
      env.DEMOS = createKVMock({
        'abc': JSON.stringify({ id: 'abc', name: 'Demo' }),
        'req_123': JSON.stringify({ id: 'req_123', type: 'feature' }),
        'reviews_abc': JSON.stringify([]),
        'rl_hash': '1',
      });

      const req = makeRequest('/api/demos');
      const { data } = await callWorker(req, env);

      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('Demo');
    });
  });

  // ===== GET /api/demo/:id =====
  describe('GET /api/demo/:id', () => {
    it('존재하는 데모 조회', async () => {
      const demo = { id: 'test-id', name: 'TestDemo' };
      env.DEMOS = createKVMock({ 'test-id': JSON.stringify(demo) });

      const req = makeRequest('/api/demo/test-id');
      const { status, data } = await callWorker(req, env);

      expect(status).toBe(200);
      expect(data.name).toBe('TestDemo');
    });

    it('존재하지 않는 데모 404', async () => {
      const req = makeRequest('/api/demo/nonexistent');
      const { status } = await callWorker(req, env);
      expect(status).toBe(404);
    });
  });

  // ===== POST /api/click =====
  describe('POST /api/click', () => {
    it('클릭 카운트 증가', async () => {
      const demo = { id: 'demo1', clickCount: 5, scanResult: { overall: 'safe' } };
      env.DEMOS = createKVMock({ demo1: JSON.stringify(demo) });

      const req = makeRequest('/api/click?id=demo1', { method: 'POST' });
      const { status, data } = await callWorker(req, env);

      expect(status).toBe(200);
      expect(data.clickCount).toBe(6);
      expect(data.scanResult.overall).toBe('safe');
    });

    it('id 없으면 400', async () => {
      const req = makeRequest('/api/click', { method: 'POST' });
      const { status } = await callWorker(req, env);
      expect(status).toBe(400);
    });

    it('존재하지 않는 데모 404', async () => {
      const req = makeRequest('/api/click?id=nope', { method: 'POST' });
      const { status } = await callWorker(req, env);
      expect(status).toBe(404);
    });
  });

  // ===== POST /api/feedback =====
  describe('POST /api/feedback', () => {
    it('피드백 증가 (useful)', async () => {
      const demo = { id: 'd1', feedback: { tried_it: 0, useful: 3, needs_work: 0 } };
      env.DEMOS = createKVMock({ d1: JSON.stringify(demo) });

      const req = makeRequest('/api/feedback?id=d1&type=useful', { method: 'POST' });
      const { status, data } = await callWorker(req, env);

      expect(status).toBe(200);
      expect(data.feedback.useful).toBe(4);
    });

    it('feedback 필드 없는 데모에도 정상 동작', async () => {
      const demo = { id: 'd2' };
      env.DEMOS = createKVMock({ d2: JSON.stringify(demo) });

      const req = makeRequest('/api/feedback?id=d2&type=tried_it', { method: 'POST' });
      const { status, data } = await callWorker(req, env);

      expect(status).toBe(200);
      expect(data.feedback.tried_it).toBe(1);
    });

    it('잘못된 type 시 400', async () => {
      const req = makeRequest('/api/feedback?id=d1&type=invalid', { method: 'POST' });
      const { status } = await callWorker(req, env);
      expect(status).toBe(400);
    });
  });

  // ===== POST /api/request =====
  describe('POST /api/request', () => {
    it('정상 기능 요청 등록', async () => {
      const req = makeRequest('/api/request', {
        method: 'POST',
        body: { type: 'feature', message: '이런 기능이 있으면 좋겠습니다' },
      });

      const { status, data } = await callWorker(req, env);

      expect(status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.id).toMatch(/^req_/);
    });

    it('잘못된 type 시 400', async () => {
      const req = makeRequest('/api/request', {
        method: 'POST',
        body: { type: 'invalid', message: '테스트 메시지입니다 10자이상' },
      });

      const { status } = await callWorker(req, env);
      expect(status).toBe(400);
    });

    it('메시지 10자 미만 시 400', async () => {
      const req = makeRequest('/api/request', {
        method: 'POST',
        body: { type: 'feature', message: '짧음' },
      });

      const { status } = await callWorker(req, env);
      expect(status).toBe(400);
    });

    it('메시지 1000자 초과 시 400', async () => {
      const req = makeRequest('/api/request', {
        method: 'POST',
        body: { type: 'bug', message: 'a'.repeat(1001) },
      });

      const { status } = await callWorker(req, env);
      expect(status).toBe(400);
    });
  });

  // ===== Admin CRUD =====
  describe('Admin API', () => {
    let demoData;

    beforeEach(() => {
      demoData = {
        demo1: JSON.stringify({ id: 'demo1', name: 'Demo1', category: 'utility', desc: '', createdAt: 1000 }),
        demo2: JSON.stringify({ id: 'demo2', name: 'Demo2', category: 'text-ai', desc: '', createdAt: 2000 }),
      };
      env.DEMOS = createKVMock(demoData);
    });

    it('GET /api/admin/demos — 전체 목록 (최신순)', async () => {
      const req = makeRequest('/api/admin/demos');
      const { status, data } = await callWorker(req, env);

      expect(status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe('Demo2'); // 최신순
    });

    it('PATCH /api/admin/update — 데모 수정', async () => {
      const req = makeRequest('/api/admin/update?id=demo1', {
        method: 'PATCH',
        body: { name: 'Updated', category: 'code-ai' },
      });

      const { status, data } = await callWorker(req, env);

      expect(status).toBe(200);
      expect(data.demo.name).toBe('Updated');
      expect(data.demo.category).toBe('code-ai');
    });

    it('PATCH /api/admin/update — 존재하지 않는 데모 404', async () => {
      const req = makeRequest('/api/admin/update?id=nope', {
        method: 'PATCH',
        body: { name: 'Test' },
      });

      const { status } = await callWorker(req, env);
      expect(status).toBe(404);
    });

    it('DELETE /api/admin/delete — 데모 삭제', async () => {
      const req = makeRequest('/api/admin/delete?id=demo1', { method: 'DELETE' });
      const { status, data } = await callWorker(req, env);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(env.DEMOS.delete).toHaveBeenCalledWith('demo1');
    });

    it('DELETE /api/admin/delete — id 없으면 400', async () => {
      const req = makeRequest('/api/admin/delete', { method: 'DELETE' });
      const { status } = await callWorker(req, env);
      expect(status).toBe(400);
    });

    it('DELETE /api/admin/delete — 존재하지 않는 데모 404', async () => {
      const req = makeRequest('/api/admin/delete?id=nope', { method: 'DELETE' });
      const { status } = await callWorker(req, env);
      expect(status).toBe(404);
    });
  });

  // ===== Feature Request Admin =====
  describe('Admin Requests', () => {
    beforeEach(() => {
      env.DEMOS = createKVMock({
        'req_1000_abc': JSON.stringify({ id: 'req_1000_abc', type: 'feature', status: 'new', createdAt: 1000 }),
        'req_2000_def': JSON.stringify({ id: 'req_2000_def', type: 'bug', status: 'new', createdAt: 2000 }),
      });
    });

    it('GET /api/admin/requests — 요청 목록 (최신순)', async () => {
      const req = makeRequest('/api/admin/requests');
      const { status, data } = await callWorker(req, env);

      expect(status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].createdAt).toBe(2000);
    });

    it('PATCH /api/admin/req-status — 상태 변경', async () => {
      const req = makeRequest('/api/admin/req-status?id=req_1000_abc', {
        method: 'PATCH',
        body: { status: 'planned' },
      });

      const { status, data } = await callWorker(req, env);

      expect(status).toBe(200);
      expect(data.req.status).toBe('planned');
    });

    it('PATCH /api/admin/req-status — 잘못된 status 400', async () => {
      const req = makeRequest('/api/admin/req-status?id=req_1000_abc', {
        method: 'PATCH',
        body: { status: 'invalid' },
      });

      const { status } = await callWorker(req, env);
      expect(status).toBe(400);
    });
  });

  // ===== GET /api/reviews =====
  describe('Reviews API', () => {
    it('GET /api/reviews — 리뷰 목록 조회', async () => {
      const reviews = [
        { rid: 'r1', author: 'A', text: 'Good', createdAt: 1000 },
        { rid: 'r2', author: 'B', text: 'Great', createdAt: 2000 },
      ];
      env.DEMOS = createKVMock({
        'reviews_demo1': JSON.stringify(reviews),
      });

      const req = makeRequest('/api/reviews?id=demo1');
      const { status, data } = await callWorker(req, env);

      expect(status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].createdAt).toBe(2000); // 최신순
    });

    it('GET /api/reviews — 리뷰 없는 데모는 빈 배열', async () => {
      const req = makeRequest('/api/reviews?id=demo-no-reviews');
      const { status, data } = await callWorker(req, env);

      expect(status).toBe(200);
      expect(data).toEqual([]);
    });

    it('GET /api/reviews — id 없으면 400', async () => {
      const req = makeRequest('/api/reviews');
      const { status } = await callWorker(req, env);
      expect(status).toBe(400);
    });
  });

  // ===== Badge SVG =====
  describe('GET /badge/:id.svg', () => {
    it('safe 데모의 배지 SVG 반환', async () => {
      const demo = { id: 'b1', scanResult: { overall: 'safe' } };
      env.DEMOS = createKVMock({ b1: JSON.stringify(demo) });

      const req = makeRequest('/badge/b1.svg');
      const response = await worker.fetch(req, env);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      const svg = await response.text();
      expect(svg).toContain('verified');
    });

    it('존재하지 않는 데모는 unknown 배지', async () => {
      const req = makeRequest('/badge/nonexistent.svg');
      const { status } = await callWorker(req, env);
      expect(status).toBe(200); // 배지는 항상 200
    });
  });

  // ===== Sitemap =====
  describe('GET /sitemap.xml', () => {
    it('XML 사이트맵 생성', async () => {
      env.DEMOS = createKVMock({
        'demo1': JSON.stringify({ id: 'demo1' }),
        'req_123': JSON.stringify({ type: 'feature' }),
      });

      const req = makeRequest('/sitemap.xml');
      const { status, response } = await callWorker(req, env);

      expect(status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/xml');
    });
  });
});
