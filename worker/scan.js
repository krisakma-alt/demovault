// DemoVault — 3종 외부 보안 API 검사 로직

const SAFE     = 'safe';
const UNSAFE   = 'unsafe';
const PENDING  = 'pending';

// 메인 함수: 4종 API 병렬 실행 후 결과 집계
export async function scanUrl(targetUrl, env) {
  const scanners = [
    checkGoogleWebRisk(targetUrl, env.GOOGLE_API_KEY),
    checkGoogleSafeBrowsing(targetUrl, env.GOOGLE_API_KEY),
    checkUrlscan(targetUrl, env.URLSCAN_API_KEY),
  ];

  // VirusTotal은 API 키가 있을 때만 실행
  if (env.VIRUSTOTAL_API_KEY) {
    scanners.push(checkVirusTotal(targetUrl, env.VIRUSTOTAL_API_KEY));
  }

  const start = Date.now();
  const [webRisk, safeBrowsing, urlscan, virusTotal] = await Promise.allSettled(scanners);

  const results = {
    webRisk:      extractResult(webRisk, 'webRisk'),
    safeBrowsing: extractResult(safeBrowsing, 'safeBrowsing'),
    urlscan:      extractResult(urlscan, 'urlscan'),
  };

  // VirusTotal 결과 추가 (API 키가 있는 경우)
  if (env.VIRUSTOTAL_API_KEY && virusTotal) {
    results.virusTotal = extractResult(virusTotal, 'virusTotal');
  }

  // 하나라도 unsafe이면 전체 unsafe
  const overall = Object.values(results).includes(UNSAFE) ? UNSAFE : SAFE;
  const duration = Date.now() - start;

  // 스캔 결과 로깅
  const failedEngines = Object.entries(results).filter(([, v]) => v === PENDING).map(([k]) => k);
  if (failedEngines.length > 0) {
    console.warn(`[SCAN] ${targetUrl} — ${duration}ms | overall: ${overall} | failed: ${failedEngines.join(', ')}`);
  }

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

// ===== VirusTotal =====
async function checkVirusTotal(targetUrl, apiKey) {
  // URL을 base64로 인코딩 (패딩 제거)
  const urlId = btoa(targetUrl).replace(/=/g, '');

  // 먼저 기존 분석 결과 조회
  const lookupRes = await fetch(`https://www.virustotal.com/api/v3/urls/${urlId}`, {
    headers: { 'x-apikey': apiKey },
  });

  if (lookupRes.ok) {
    const data = await lookupRes.json();
    const stats = data.data?.attributes?.last_analysis_stats;
    if (stats) {
      // malicious 또는 suspicious가 2개 이상이면 unsafe
      const bad = (stats.malicious ?? 0) + (stats.suspicious ?? 0);
      return bad >= 2 ? UNSAFE : SAFE;
    }
  }

  // 기존 결과 없으면 새로 스캔 제출
  const submitRes = await fetch('https://www.virustotal.com/api/v3/urls', {
    method: 'POST',
    headers: {
      'x-apikey': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `url=${encodeURIComponent(targetUrl)}`,
  });

  if (!submitRes.ok) throw new Error(`VirusTotal submit error: ${submitRes.status}`);

  const { data } = await submitRes.json();
  const analysisId = data?.id;
  if (!analysisId) return PENDING;

  // 결과 폴링 (최대 20초)
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    await sleep(5_000);
    const pollRes = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
      headers: { 'x-apikey': apiKey },
    });
    if (!pollRes.ok) continue;

    const pollData = await pollRes.json();
    const status = pollData.data?.attributes?.status;
    if (status === 'completed') {
      const stats = pollData.data.attributes.stats;
      const bad = (stats.malicious ?? 0) + (stats.suspicious ?? 0);
      return bad >= 2 ? UNSAFE : SAFE;
    }
  }

  return PENDING;
}

// ===== 헬퍼 =====
function extractResult(settled, engineName = 'unknown') {
  if (settled.status === 'fulfilled') return settled.value;
  console.error(`[SCAN:${engineName}] 오류:`, settled.reason?.message ?? settled.reason);
  return PENDING; // API 실패 시 pending 처리
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
