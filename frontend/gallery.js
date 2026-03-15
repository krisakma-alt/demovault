// DemoVault — 갤러리 데이터 fetch + 카드 렌더링

const API_BASE = 'https://demovault-worker.krisakma.workers.dev';

const BADGE_CLASS = { safe: 'safe', unsafe: 'unsafe', pending: 'pending' };

// ===== 진입점: DOMContentLoaded 후 실행 =====
document.addEventListener('DOMContentLoaded', () => {
  loadGallery();

  document.getElementById('retry-btn')?.addEventListener('click', () => {
    showError(false);
    loadGallery();
  });

  document.getElementById('lang-toggle')?.addEventListener('click', () => {
    rerenderBadgesAndButtons();
  });

  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
});

// ===== API fetch + 렌더링 =====
async function loadGallery() {
  showLoading(true);
  showError(false);
  showEmpty(false);

  let demos;
  try {
    const res = await fetch(`${API_BASE}/api/demos`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    demos = await res.json();
  } catch (err) {
    console.error('[Gallery] fetch 실패:', err);
    showLoading(false);
    showError(true);
    return;
  }

  showLoading(false);

  if (!demos.length) {
    showEmpty(true);
    return;
  }

  renderGallery(demos);
}

// ===== 카드 목록 렌더링 =====
function renderGallery(demos) {
  const gallery = document.getElementById('gallery');
  gallery.innerHTML = '';
  demos.forEach(demo => gallery.appendChild(createCard(demo)));
}

// ===== 카드 DOM 생성 =====
function createCard(demo) {
  const { id, name, url, desc, category, scanResult, createdAt } = demo;
  const overall  = scanResult?.overall ?? 'pending';
  const details  = scanResult?.details ?? {};

  const dateObj = createdAt ? new Date(createdAt) : null;
  const date = (dateObj && !isNaN(dateObj)) ? dateObj.toLocaleDateString('en-CA') : '—';

  const descText = (desc && typeof desc === 'string' && desc.trim()) ? desc.trim() : '';

  const catKey = `cat.${category ?? 'other'}`;
  const catLabel = TRANSLATIONS[currentLang]?.[catKey] ?? (category ?? 'other');

  const article = document.createElement('article');
  article.className = 'card';
  article.dataset.url = url;

  article.innerHTML = `
    <div class="card-header">
      <h3 class="card-name">${escapeHtml(name)}</h3>
      <button
        class="badge ${BADGE_CLASS[overall] ?? 'pending'}"
        data-badge="${overall}"
        data-open="false"
        aria-expanded="false"
        aria-label="검사 결과 상세 보기"
      >${getBadgeLabel(overall)}</button>
    </div>
    <p class="card-desc">${escapeHtml(descText)}</p>
    <span class="card-category" data-category="${category ?? 'other'}">${catLabel}</span>

    <div class="scan-detail">
      ${buildScanRow('Google Web Risk', details.webRisk)}
      ${buildScanRow('Safe Browsing', details.safeBrowsing)}
      ${buildScanRow('urlscan.io',    details.urlscan)}
    </div>

    <div class="card-footer">
      <span class="card-date">${date}</span>
      <button
        class="card-visit-btn"
        data-i18n-btn="card.visit"
        data-id="${id}"
        data-url="${url}"
      >${getVisitLabel()}</button>
    </div>
  `;

  const badge  = article.querySelector('[data-badge]');
  const detail = article.querySelector('.scan-detail');
  badge.addEventListener('click', () => {
    const isOpen = detail.classList.toggle('open');
    badge.dataset.open = String(isOpen);
    badge.setAttribute('aria-expanded', String(isOpen));
  });

  const visitBtn = article.querySelector('.card-visit-btn');
  visitBtn.addEventListener('click', () => {
    openGateModal(id, url);
  });

  return article;
}

// ===== 안전 게이트 모달 =====
function openGateModal(id, url) {
  const modal      = document.getElementById('gate-modal');
  const urlText    = document.getElementById('modal-url-text');
  const status     = document.getElementById('modal-status');
  const result     = document.getElementById('modal-result');
  const proceedBtn = document.getElementById('modal-proceed');

  urlText.textContent = url;
  status.hidden  = false;
  result.hidden  = true;
  result.className = 'modal-result';
  result.textContent = '';
  proceedBtn.hidden = true;
  proceedBtn.onclick = null;

  modal.hidden = false;

  fetch(`${API_BASE}/api/rescan?id=${id}`)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      status.hidden = true;
      const overall = data.scanResult?.overall ?? 'error';

      if (overall === 'safe') {
        result.className = 'modal-result safe';
        result.textContent = TRANSLATIONS[currentLang]?.['modal.resultSafe'] ?? '✓ 안전한 사이트입니다.';
        proceedBtn.hidden = false;
        proceedBtn.onclick = () => {
          window.open(url, '_blank', 'noopener,noreferrer');
          closeModal();
        };
      } else {
        result.className = 'modal-result unsafe';
        result.textContent = TRANSLATIONS[currentLang]?.['modal.resultUnsafe'] ?? '✗ 위험한 사이트로 감지되었습니다.';
      }

      result.hidden = false;
    })
    .catch(() => {
      status.hidden = true;
      result.className = 'modal-result error';
      result.textContent = TRANSLATIONS[currentLang]?.['modal.resultError'] ?? '⚠️ 검사 중 오류가 발생했습니다.';
      result.hidden = false;
    });
}

function closeModal() {
  document.getElementById('gate-modal').hidden = true;
}

// 검사 항목 한 줄 HTML 생성
const SCAN_ICON = { safe: '✓', unsafe: '✗', pending: '⏳' };

function buildScanRow(label, result) {
  const r    = result ?? 'pending';
  const icon = SCAN_ICON[r] ?? '⏳';
  return `
    <div class="scan-row">
      <span class="scan-label">🔍 ${label}</span>
      <span class="scan-icon ${r}">${icon}</span>
    </div>
  `;
}

// ===== 언어 변경 시 배지·버튼 텍스트만 갱신 =====
function rerenderBadgesAndButtons() {
  document.querySelectorAll('[data-badge]').forEach(el => {
    el.textContent = getBadgeLabel(el.dataset.badge);
  });
  document.querySelectorAll('[data-i18n-btn="card.visit"]').forEach(el => {
    el.textContent = getVisitLabel();
  });
  document.querySelectorAll('[data-category]').forEach(el => {
    const catKey = `cat.${el.dataset.category}`;
    el.textContent = TRANSLATIONS[currentLang]?.[catKey] ?? el.dataset.category;
  });
}

// ===== 상태 표시/숨김 =====
function showLoading(show) {
  document.getElementById('state-loading').hidden = !show;
}
function showError(show) {
  document.getElementById('state-error').hidden = !show;
}
function showEmpty(show) {
  document.getElementById('state-empty').hidden = !show;
}

// ===== i18n 헬퍼 =====
function getBadgeLabel(overall) {
  const key = `card.${overall}`;
  return TRANSLATIONS[currentLang]?.[key] ?? overall;
}

function getVisitLabel() {
  return TRANSLATIONS[currentLang]?.['card.visit'] ?? 'Visit Demo →';
}

// ===== XSS 방지용 HTML 이스케이프 =====
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}