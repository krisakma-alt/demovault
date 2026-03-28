// DemoVault — 보안 스캔 파이프라인 테스트
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scanUrl } from '../scan.js';

// fetch 모킹
const originalFetch = globalThis.fetch;
let fetchMock;

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  vi.useRealTimers();
  globalThis.fetch = originalFetch;
});

// 헬퍼: JSON Response 생성
function jsonRes(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function textRes(text, status = 200) {
  return new Response(text, { status });
}

// scanUrl을 실행하면서 sleep을 즉시 소진시키는 헬퍼
async function runScanWithTimers(url, env) {
  const promise = scanUrl(url, env);
  // sleep 폴링을 즉시 해소하기 위해 타이머를 여러 번 전진
  for (let i = 0; i < 20; i++) {
    await vi.advanceTimersByTimeAsync(5_000);
  }
  return promise;
}

// ===== 종합 scanUrl 테스트 =====
describe('scanUrl', () => {
  const env = {
    GOOGLE_API_KEY: 'test-google-key',
    URLSCAN_API_KEY: 'test-urlscan-key',
    VIRUSTOTAL_API_KEY: 'test-vt-key',
  };

  it('모든 엔진이 safe일 때 overall=safe', async () => {
    fetchMock.mockImplementation((url) => {
      if (url.toString().includes('webrisk.googleapis.com')) {
        return Promise.resolve(jsonRes({}));
      }
      if (url.toString().includes('safebrowsing.googleapis.com')) {
        return Promise.resolve(jsonRes({}));
      }
      if (url.toString().includes('urlscan.io/api/v1/scan')) {
        return Promise.resolve(jsonRes({ uuid: 'test-uuid' }));
      }
      if (url.toString().includes('urlscan.io/api/v1/result')) {
        return Promise.resolve(jsonRes({
          verdicts: { overall: { malicious: false } },
        }));
      }
      if (url.toString().includes('virustotal.com/api/v3/urls/')) {
        return Promise.resolve(jsonRes({
          data: { attributes: { last_analysis_stats: { malicious: 0, suspicious: 0 } } },
        }));
      }
      return Promise.resolve(jsonRes({}, 404));
    });

    const result = await runScanWithTimers('https://safe-demo.com', env);

    expect(result.overall).toBe('safe');
    expect(result.details.webRisk).toBe('safe');
    expect(result.details.safeBrowsing).toBe('safe');
    expect(result.details.urlscan).toBe('safe');
    expect(result.details.virusTotal).toBe('safe');
  });

  it('하나라도 unsafe면 overall=unsafe (Web Risk 위협 감지)', async () => {
    fetchMock.mockImplementation((url) => {
      if (url.toString().includes('webrisk.googleapis.com')) {
        return Promise.resolve(jsonRes({ threat: { threatTypes: ['MALWARE'] } }));
      }
      if (url.toString().includes('safebrowsing.googleapis.com')) {
        return Promise.resolve(jsonRes({}));
      }
      if (url.toString().includes('urlscan.io/api/v1/scan')) {
        return Promise.resolve(jsonRes({ uuid: 'test-uuid' }));
      }
      if (url.toString().includes('urlscan.io/api/v1/result')) {
        return Promise.resolve(jsonRes({
          verdicts: { overall: { malicious: false } },
        }));
      }
      if (url.toString().includes('virustotal.com/api/v3/urls/')) {
        return Promise.resolve(jsonRes({
          data: { attributes: { last_analysis_stats: { malicious: 0, suspicious: 0 } } },
        }));
      }
      return Promise.resolve(jsonRes({}, 404));
    });

    const result = await runScanWithTimers('https://malware-site.com', env);

    expect(result.overall).toBe('unsafe');
    expect(result.details.webRisk).toBe('unsafe');
  });

  it('Safe Browsing에서 매치 발견 시 unsafe', async () => {
    fetchMock.mockImplementation((url) => {
      if (url.toString().includes('webrisk.googleapis.com')) {
        return Promise.resolve(jsonRes({}));
      }
      if (url.toString().includes('safebrowsing.googleapis.com')) {
        return Promise.resolve(jsonRes({
          matches: [{ threatType: 'MALWARE' }],
        }));
      }
      if (url.toString().includes('urlscan.io/api/v1/scan')) {
        return Promise.resolve(jsonRes({ uuid: 'test-uuid' }));
      }
      if (url.toString().includes('urlscan.io/api/v1/result')) {
        return Promise.resolve(jsonRes({
          verdicts: { overall: { malicious: false } },
        }));
      }
      if (url.toString().includes('virustotal.com/api/v3/urls/')) {
        return Promise.resolve(jsonRes({
          data: { attributes: { last_analysis_stats: { malicious: 0, suspicious: 0 } } },
        }));
      }
      return Promise.resolve(jsonRes({}, 404));
    });

    const result = await runScanWithTimers('https://phishing.com', env);

    expect(result.overall).toBe('unsafe');
    expect(result.details.safeBrowsing).toBe('unsafe');
  });

  it('VirusTotal API 키 없으면 virusTotal 필드 생략', async () => {
    const envNoVT = {
      GOOGLE_API_KEY: 'test-google-key',
      URLSCAN_API_KEY: 'test-urlscan-key',
    };

    fetchMock.mockImplementation((url) => {
      if (url.toString().includes('webrisk.googleapis.com')) {
        return Promise.resolve(jsonRes({}));
      }
      if (url.toString().includes('safebrowsing.googleapis.com')) {
        return Promise.resolve(jsonRes({}));
      }
      if (url.toString().includes('urlscan.io/api/v1/scan')) {
        return Promise.resolve(jsonRes({ uuid: 'test-uuid' }));
      }
      if (url.toString().includes('urlscan.io/api/v1/result')) {
        return Promise.resolve(jsonRes({
          verdicts: { overall: { malicious: false } },
        }));
      }
      return Promise.resolve(jsonRes({}, 404));
    });

    const result = await runScanWithTimers('https://example.com', envNoVT);

    expect(result.overall).toBe('safe');
    expect(result.details.virusTotal).toBeUndefined();
  });

  it('VirusTotal malicious >= 2 이면 unsafe', async () => {
    fetchMock.mockImplementation((url) => {
      if (url.toString().includes('webrisk.googleapis.com')) {
        return Promise.resolve(jsonRes({}));
      }
      if (url.toString().includes('safebrowsing.googleapis.com')) {
        return Promise.resolve(jsonRes({}));
      }
      if (url.toString().includes('urlscan.io/api/v1/scan')) {
        return Promise.resolve(jsonRes({ uuid: 'test-uuid' }));
      }
      if (url.toString().includes('urlscan.io/api/v1/result')) {
        return Promise.resolve(jsonRes({
          verdicts: { overall: { malicious: false } },
        }));
      }
      if (url.toString().includes('virustotal.com/api/v3/urls/')) {
        return Promise.resolve(jsonRes({
          data: { attributes: { last_analysis_stats: { malicious: 3, suspicious: 1 } } },
        }));
      }
      return Promise.resolve(jsonRes({}, 404));
    });

    const result = await runScanWithTimers('https://bad-site.com', env);

    expect(result.overall).toBe('unsafe');
    expect(result.details.virusTotal).toBe('unsafe');
  });

  it('URLScan에서 malicious 판정 시 unsafe', async () => {
    fetchMock.mockImplementation((url) => {
      if (url.toString().includes('webrisk.googleapis.com')) {
        return Promise.resolve(jsonRes({}));
      }
      if (url.toString().includes('safebrowsing.googleapis.com')) {
        return Promise.resolve(jsonRes({}));
      }
      if (url.toString().includes('urlscan.io/api/v1/scan')) {
        return Promise.resolve(jsonRes({ uuid: 'test-uuid' }));
      }
      if (url.toString().includes('urlscan.io/api/v1/result')) {
        return Promise.resolve(jsonRes({
          verdicts: { overall: { malicious: true } },
        }));
      }
      if (url.toString().includes('virustotal.com/api/v3/urls/')) {
        return Promise.resolve(jsonRes({
          data: { attributes: { last_analysis_stats: { malicious: 0, suspicious: 0 } } },
        }));
      }
      return Promise.resolve(jsonRes({}, 404));
    });

    const result = await runScanWithTimers('https://malicious.com', env);

    expect(result.overall).toBe('unsafe');
    expect(result.details.urlscan).toBe('unsafe');
  });
});

// ===== 스캔 실패 시나리오 =====
describe('scanUrl — 실패 시나리오', () => {
  const env = {
    GOOGLE_API_KEY: 'test-key',
    URLSCAN_API_KEY: 'test-key',
    VIRUSTOTAL_API_KEY: 'test-key',
  };

  it('API 에러 시 해당 엔진 pending 처리, 나머지 정상', async () => {
    fetchMock.mockImplementation((url) => {
      if (url.toString().includes('webrisk.googleapis.com')) {
        return Promise.resolve(textRes('Internal Server Error', 500));
      }
      if (url.toString().includes('safebrowsing.googleapis.com')) {
        return Promise.resolve(jsonRes({}));
      }
      if (url.toString().includes('urlscan.io/api/v1/scan')) {
        return Promise.resolve(jsonRes({ uuid: 'test-uuid' }));
      }
      if (url.toString().includes('urlscan.io/api/v1/result')) {
        return Promise.resolve(jsonRes({
          verdicts: { overall: { malicious: false } },
        }));
      }
      if (url.toString().includes('virustotal.com/api/v3/urls/')) {
        return Promise.resolve(jsonRes({
          data: { attributes: { last_analysis_stats: { malicious: 0, suspicious: 0 } } },
        }));
      }
      return Promise.resolve(jsonRes({}, 404));
    });

    const result = await runScanWithTimers('https://example.com', env);

    expect(result.details.webRisk).toBe('pending');
    expect(result.details.safeBrowsing).toBe('safe');
    expect(result.overall).toBe('safe');
  });

  it('네트워크 에러 시 모든 엔진 pending 처리', async () => {
    fetchMock.mockImplementation(() => {
      return Promise.reject(new Error('Network error'));
    });

    const result = await runScanWithTimers('https://example.com', env);

    expect(result.details.webRisk).toBe('pending');
    expect(result.details.safeBrowsing).toBe('pending');
    expect(result.details.urlscan).toBe('pending');
    expect(result.details.virusTotal).toBe('pending');
    expect(result.overall).toBe('safe'); // pending은 통과
  });

  it('URLScan 제출 실패 시 pending', async () => {
    fetchMock.mockImplementation((url) => {
      if (url.toString().includes('webrisk.googleapis.com')) {
        return Promise.resolve(jsonRes({}));
      }
      if (url.toString().includes('safebrowsing.googleapis.com')) {
        return Promise.resolve(jsonRes({}));
      }
      if (url.toString().includes('urlscan.io/api/v1/scan')) {
        return Promise.resolve(jsonRes({ message: 'Rate limit' }, 429));
      }
      if (url.toString().includes('virustotal.com/api/v3/urls/')) {
        return Promise.resolve(jsonRes({
          data: { attributes: { last_analysis_stats: { malicious: 0, suspicious: 0 } } },
        }));
      }
      return Promise.resolve(jsonRes({}, 404));
    });

    const result = await runScanWithTimers('https://example.com', env);

    expect(result.details.urlscan).toBe('pending');
    expect(result.overall).toBe('safe');
  });

  it('unsafe 엔진이 하나라도 있으면 pending 엔진과 관계없이 overall=unsafe', async () => {
    fetchMock.mockImplementation((url) => {
      if (url.toString().includes('webrisk.googleapis.com')) {
        return Promise.reject(new Error('timeout'));
      }
      if (url.toString().includes('safebrowsing.googleapis.com')) {
        return Promise.resolve(jsonRes({
          matches: [{ threatType: 'SOCIAL_ENGINEERING' }],
        }));
      }
      if (url.toString().includes('urlscan.io/api/v1/scan')) {
        return Promise.resolve(jsonRes({ uuid: 'test-uuid' }));
      }
      if (url.toString().includes('urlscan.io/api/v1/result')) {
        return Promise.resolve(jsonRes({
          verdicts: { overall: { malicious: false } },
        }));
      }
      if (url.toString().includes('virustotal.com/api/v3/urls/')) {
        return Promise.resolve(jsonRes({
          data: { attributes: { last_analysis_stats: { malicious: 0, suspicious: 0 } } },
        }));
      }
      return Promise.resolve(jsonRes({}, 404));
    });

    const result = await runScanWithTimers('https://phishing.com', env);

    expect(result.details.webRisk).toBe('pending');
    expect(result.details.safeBrowsing).toBe('unsafe');
    expect(result.overall).toBe('unsafe');
  });
});
