// DemoVault — 3종 외부 보안 API 검사 로직

const SAFE     = 'safe';
const UNSAFE   = 'unsafe';
const PENDING  = 'pending';

// 메인 함수: 3종 API 병렬 실행 후 결과 집계
export async function scanUrl(targetUrl, env) {
  const [webRisk, safeBrowsing, urlscan] = await Promise.allSettled([
    checkGoogleWebRisk(targetUrl, env.GOOGLE_API_KEY),
    checkGoogleSafeBrowsing(targetUrl, env.GOOGLE_API_KEY),
    checkUrlscan(targetUrl, env.URLSCAN_API_KEY),
  ]);

  const results = {
    webRisk:      extractResult(webRisk),
    safeBrowsing: extractResult(safeBrowsing),
    urlscan:      extractResult(urlscan),
  };

  // 하나라도 unsafe이면 전체 unsafe
  const overall = Object.values(results).includes(UNSAFE) ? UNSAFE : SAFE;

  return { overall, details: results };
}

// ===== Google Web Risk =====
async function checkGoogleWebRisk(targetUrl, apiKey) {
  const THREAT_TYPES = ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'];
  const endpoint = 'https://webrisk.googleapis.com/v1/uris:search';

  // threatTypes는 동일 키를 반복해야 함
  // URLSearchParams에 객체로 배열을 넣으면 쉼표 합산되어 400 발생
  const params = new URLSearchParams({ key: apiKey, uri: targetUrl });
  THREAT_TYPES.forEach(t => params.append('threatTypes', t));

  const res = await fetch(`${endpoint}?${params}`);
  if (!res.ok) {
    const errBody = await res.text();
    console.error(`[WebRisk] ${res.status} 응답 본문:`, errBody);
    throw new Error(`Web Risk API error: ${res.status}`);
  }

  const data = await res.json();
  // 위협 없으면 응답 바디가 {} (빈 객체)
  return data.threat ? UNSAFE : SAFE;
}

// ===== Google Safe Browsing =====
async function checkGoogleSafeBrowsing(targetUrl, apiKey) {
  const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;

  const body = {
    client: { clientId: 'demovault', clientVersion: '1.0' },
    threatInfo: {
      threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING'],
      platformTypes: ['ANY_PLATFORM'],
      threatEntryTypes: ['URL'],
      threatEntries: [{ url: targetUrl }],
    },
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Safe Browsing API error: ${res.status}`);

  const data = await res.json();
  return data.matches?.length > 0 ? UNSAFE : SAFE;
}

// ===== urlscan.io =====
async function checkUrlscan(targetUrl, apiKey) {
  // 1단계: 스캔 제출
  const submitRes = await fetch('https://urlscan.io/api/v1/scan/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-Key': apiKey,
    },
    body: JSON.stringify({ url: targetUrl, visibility: 'public' }),
  });
  if (!submitRes.ok) throw new Error(`urlscan submit error: ${submitRes.status}`);

  const { uuid } = await submitRes.json();

  // 2단계: 결과 폴링 (최대 30초 대기)
  const MAX_WAIT_MS  = 30_000;
  const POLL_INTERVAL_MS = 5_000;
  const deadline = Date.now() + MAX_WAIT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const resultRes = await fetch(`https://urlscan.io/api/v1/result/${uuid}/`);
    if (resultRes.status === 404) continue; // 아직 처리 중
    if (!resultRes.ok) throw new Error(`urlscan result error: ${resultRes.status}`);

    const data = await resultRes.json();
    const malicious = data.verdicts?.overall?.malicious ?? false;
    return malicious ? UNSAFE : SAFE;
  }

  // 시간 초과 시 pending 반환
  return PENDING;
}

// ===== 헬퍼 =====
function extractResult(settled) {
  if (settled.status === 'fulfilled') return settled.value;
  console.error('스캔 API 오류:', settled.reason);
  return PENDING; // API 실패 시 pending 처리
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
