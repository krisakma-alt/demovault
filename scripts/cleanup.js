#!/usr/bin/env node
// DemoVault — 데드 링크 자동 정리 스크립트
// 모든 등록 데모 URL에 HEAD 요청 → 응답 실패 시 비활성 표시

const API_BASE = 'https://demovault-worker.krisakma.workers.dev';
const TIMEOUT_MS = 15000;
const DELAY_MS = 1000;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function checkAlive(url) {
  try {
    const r = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return r.status < 500;
  } catch {
    return false;
  }
}

async function main() {
  console.log('=== DemoVault Dead Link Cleanup ===\n');

  const res = await fetch(`${API_BASE}/api/demos`);
  if (!res.ok) { console.error('데모 목록 로드 실패'); process.exit(1); }
  const demos = await res.json();

  console.log(`[총] ${demos.length}개 데모 검사\n`);

  let alive = 0, dead = 0, deleted = 0;
  const deadList = [];

  for (const demo of demos) {
    process.stdout.write(`  ${demo.name.slice(0, 40).padEnd(42)} `);

    const ok = await checkAlive(demo.url);
    if (ok) {
      console.log('✅ 활성');
      alive++;
    } else {
      // 2차 확인 (GET으로 재시도)
      let retryOk = false;
      try {
        const r2 = await fetch(demo.url, {
          redirect: 'follow',
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        retryOk = r2.status < 500;
      } catch { /* 무시 */ }

      if (retryOk) {
        console.log('✅ 활성 (GET 재시도)');
        alive++;
      } else {
        console.log('💀 비활성');
        dead++;
        deadList.push(demo);
      }
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n=== 검사 결과 ===`);
  console.log(`활성: ${alive}개`);
  console.log(`비활성: ${dead}개`);

  // --delete 플래그가 있으면 실제 삭제
  if (process.argv.includes('--delete') && deadList.length > 0) {
    console.log(`\n[삭제 모드] ${deadList.length}개 비활성 데모 삭제 중...`);
    for (const demo of deadList) {
      try {
        const r = await fetch(`${API_BASE}/api/admin/delete?id=${demo.id}`, { method: 'DELETE' });
        if (r.ok) {
          console.log(`  🗑️  ${demo.name} 삭제 완료`);
          deleted++;
        } else {
          console.log(`  ❌ ${demo.name} 삭제 실패 (${r.status})`);
        }
      } catch (e) {
        console.log(`  ❌ ${demo.name} 오류: ${e.message}`);
      }
      await sleep(500);
    }
    console.log(`\n삭제 완료: ${deleted}개`);
  } else if (deadList.length > 0) {
    console.log(`\n💡 실제 삭제하려면: node scripts/cleanup.js --delete`);
    console.log('비활성 목록:');
    deadList.forEach(d => console.log(`  - ${d.name} (${d.url})`));
  }
}

main().catch(console.error);
