// DemoVault — 갤러리 데이터 fetch + 카드 렌더링

const API_BASE = 'https://demovault-worker.krisakma.workers.dev';

const BADGE_CLASS = { safe: 'safe', unsafe: 'unsafe', pending: 'pending' };

// 현재 필터 상태
let currentFilter = 'all';
let allDemos = [];

// ===== 진입점 =====
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

  document.getElementById('category-filters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    currentFilter = btn.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilter();
  });
});

// ===== API fetch + 렌더링 =====
async function loadGallery() {
  showLoading(true);
  showError(false);
  showEmpty(false);

  try {
    const res = await fetch(`${API_BASE}/api/demos`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allDemos = await res.json();
  } catch (err) {
    console.error('[Gallery] fetch 실패:', err);
    showLoading(false);
    showError(true);
    return;
  }

  showLoading(false);

  if (!allDemos.length) {
    showEmpty(true);
    return;
  }

  renderFeaturedSections(allDemos);
  applyFilter();
}

// ===== Trending / Just Launched 섹션 =====
function renderFeaturedSections(demos) {
  const trending = [...demos]
    .filter(d => (d.clickCount ?? 0) >= 1)
    .sort((a, b) => (b.clickCount ?? 0) - (a.clickCount ?? 0))
    .slice(0, 4);

  const justLaunched = [...demos]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 4);

  renderSection('trending-list', trending);
  renderSection('just-launched-list', justLaunched);

  document.getElementById('section-trending')?.toggleAttribute('hidden', trending.length === 0);
  document.getElementById('section-just-launched')?.toggleAttribute('hidden', justLaunched.length === 0);
}

function renderSection(containerId, demos) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  demos.forEach(demo => container.appendChild(createMiniCard(demo)));
}

function createMiniCard(demo) {
  const { id, name, url, category, clickCount = 0, scanResult } = demo;
  const overall  = scanResult?.overall ?? 'pending';
  const catKey   = `cat.${category ?? 'other'}`;
  const catLabel = TRANSLATIONS[currentLang]?.[catKey] ?? (category ?? 'other');

  const el = document.createElement('div');
  el.className = 'mini-card';
  el.innerHTML = `
    <div class="mini-card-header">
      <span class="mini-card-name">${escapeHtml(name)}</span>
      <span class="badge ${BADGE_CLASS[overall] ?? 'pending'} mini">${getBadgeLabel(overall)}</span>
    </div>
    <div class="mini-card-meta">
      <span class="card-category" data-category="${category ?? 'other'}">${catLabel}</span>
      <span class="card-clicks">👁 ${clickCount}</span>
    </div>
    <button class="card-visit-btn mini-visit" data-id="${id}" data-url="${url}">${getVisitLabel()}</button>
  `;
  el.querySelector('.mini-visit').addEventListener('click', () => openGateModal(id, url));
  return el;
}

// ===== 필터 적용 =====
function applyFilter() {
  const filtered = currentFilter === 'all'
    ? allDemos
    : allDemos.filter(d => (d.category ?? 'other') === currentFilter);

  if (!filtered.length) {
    document.getElementById('gallery').innerHTML = '';
    showEmpty(true);
    return;
  }

  showEmpty(false);
  renderGallery(filtered);
}

// ===== 카드 목록 렌더링 =====
function renderGallery(demos) {
  const gallery = document.getElementById('gallery');
  gallery.innerHTML = '';
  demos.forEach(demo => gallery.appendChild(createCard(demo)));
}

// ===== 카드 DOM 생성 =====
function createCard(demo) {
  const { id, name, url, desc, category, scanResult, createdAt, clickCount = 0, feedback } = demo;
  const overall  = scanResult?.overall ?? 'pending';
  const details  = scanResult?.details ?? {};
  const fb       = feedback ?? { tried_it: 0, useful: 0, needs_work: 0 };

  const dateObj  = createdAt ? new Date(createdAt) : null;
  const date     = (dateObj && !isNaN(dateObj)) ? dateObj.toLocaleDateString('en-CA') : '—';
  const descText = (desc && typeof desc === 'string' && desc.trim()) ? desc.trim() : '';

  const catKey   = `cat.${category ?? 'other'}`;
  const catLabel = TRANSLATIONS[currentLang]?.[catKey] ?? (category ?? 'other');

  const voted = localStorage.getItem(`dv_voted_${id}`);

  const article = document.createElement('article');
  article.className = 'card';
  article.dataset.id = id;

  article.innerHTML = `
    <div class="card-header">
      <h3 class="card-name">${escapeHtml(name)}</h3>
      <button class="badge ${BADGE_CLASS[overall] ?? 'pending'}"
        data-badge="${overall}" data-open="false"
        aria-expanded="false" aria-label="검사 결과 보기"
      >${getBadgeLabel(overall)}</button>
    </div>
    <p class="card-desc">${escapeHtml(descText)}</p>
    <span class="card-category" data-category="${category ?? 'other'}">${catLabel}</span>

    <div class="scan-detail">
      ${buildScanRow('Google Web Risk', details.webRisk)}
      ${buildScanRow('Safe Browsing',  details.safeBrowsing)}
      ${buildScanRow('urlscan.io',     details.urlscan)}
    </div>

    <div class="feedback-bar" data-demo-id="${id}">
      <button class="fb-btn ${voted === 'tried_it'   ? 'voted' : ''}" data-type="tried_it">🧪 <span class="fb-count">${fb.tried_it}</span></button>
      <button class="fb-btn ${voted === 'useful'     ? 'voted' : ''}" data-type="useful">👍 <span class="fb-count">${fb.useful}</span></button>
      <button class="fb-btn ${voted === 'needs_work' ? 'voted' : ''}" data-type="needs_work">🔧 <span class="fb-count">${fb.needs_work}</span></button>
    </div>

    <div class="card-footer">
      <span class="card-date">${date}</span>
      <span class="card-clicks" data-clicks="${id}">👁 ${clickCount}</span>
      <button class="card-visit-btn" data-id="${id}" data-url="${url}">${getVisitLabel()}</button>
    </div>
  `;

  const badge  = article.querySelector('[data-badge]');
  const detail = article.querySelector('.scan-detail');
  badge.addEventListener('click', () => {
    const isOpen = detail.classList.toggle('open');
    badge.dataset.open = String(isOpen);
    badge.setAttribute('aria-expanded', String(isOpen));
  });

  article.querySelector('.card-visit-btn')
    .addEventListener('click', () => openGateModal(id, url));

  article.querySelectorAll('.fb-btn').forEach(btn => {
    btn.addEventListener('click', () => submitFeedback(id, btn.dataset.type, article));
  });

  return article;
}

// ===== 피드백 전송 =====
async function submitFeedback(id, type, cardEl) {
  if (localStorage.getItem(`dv_voted_${id}`)) return; // 이미 투표

  try {
    const res = await fetch(`${API_BASE}/api/feedback?id=${id}&type=${type}`, { method: 'POST' });
    if (!res.ok) throw new Error();
    const data = await res.json();

    localStorage.setItem(`dv_voted_${id}`, type);

    const fb  = data.feedback;
    const bar = cardEl.querySelector('.feedback-bar');
    bar.querySelectorAll('.fb-btn').forEach(btn => {
      btn.querySelector('.fb-count').textContent = fb[btn.dataset.type] ?? 0;
      if (btn.dataset.type === type) btn.classList.add('voted');
    });
  } catch {
    // 실패 시 조용히 무시
  }
}

// ===== 안전 게이트 모달 =====
function openGateModal(id, url) {
  const modal      = document.getElementById('gate-modal');
  const urlText    = document.getElementById('modal-url-text');
  const status     = document.getElementById('modal-status');
  const result     = document.getElementById('modal-result');
  const proceedBtn = document.getElementById('modal-proceed');

  urlText.textContent = url;
  status.hidden       = false;
  result.hidden       = true;
  result.className    = 'modal-result';
  result.textContent  = '';
  proceedBtn.hidden   = true;
  proceedBtn.onclick  = null;
  modal.hidden        = false;

  fetch(`${API_BASE}/api/click?id=${id}`, { method: 'POST' })
    .then(res => { if (!res.ok) throw new Error(); return res.json(); })
    .then(data => {
      status.hidden = true;
      const overall = data.scanResult?.overall ?? 'error';

      const clickEl = document.querySelector(`[data-clicks="${id}"]`);
      if (clickEl && data.clickCount != null) clickEl.textContent = `👁 ${data.clickCount}`;

      if (overall === 'safe') {
        result.className   = 'modal-result safe';
        result.textContent = TRANSLATIONS[currentLang]?.['modal.resultSafe'] ?? '✓ 3종 안전 검사 통과';
        proceedBtn.hidden  = false;
        proceedBtn.onclick = () => { window.open(url, '_blank', 'noopener,noreferrer'); closeModal(); };
      } else if (overall === 'unsafe') {
        result.className   = 'modal-result unsafe';
        result.textContent = TRANSLATIONS[currentLang]?.['modal.resultUnsafe'] ?? '✗ 위험 사이트 감지';
      } else {
        result.className   = 'modal-result pending';
        result.textContent = TRANSLATIONS[currentLang]?.['modal.resultPending'] ?? '⏳ 검사 진행 중. 주의 후 이동하세요.';
        proceedBtn.hidden  = false;
        proceedBtn.onclick = () => { window.open(url, '_blank', 'noopener,noreferrer'); closeModal(); };
      }
      result.hidden = false;
    })
    .catch(() => {
      status.hidden      = true;
      result.className   = 'modal-result error';
      result.textContent = TRANSLATIONS[currentLang]?.['modal.resultError'] ?? '⚠️ 오류 발생';
      result.hidden      = false;
    });
}

function closeModal() {
  document.getElementById('gate-modal').hidden = true;
}

// ===== 헬퍼 =====
const SCAN_ICON = { safe: '✓', unsafe: '✗', pending: '⏳' };

function buildScanRow(label, result) {
  const r = result ?? 'pending';
  return `
    <div class="scan-row">
      <span class="scan-label">🔍 ${label}</span>
      <span class="scan-icon ${r}">${SCAN_ICON[r] ?? '⏳'}</span>
    </div>`;
}

function rerenderBadgesAndButtons() {
  document.querySelectorAll('[data-badge]').forEach(el => {
    el.textContent = getBadgeLabel(el.dataset.badge);
  });
  document.querySelectorAll('.card-visit-btn').forEach(el => {
    el.textContent = getVisitLabel();
  });
  document.querySelectorAll('[data-category]').forEach(el => {
    const catKey = `cat.${el.dataset.category}`;
    el.textContent = TRANSLATIONS[currentLang]?.[catKey] ?? el.dataset.category;
  });
}

function showLoading(show) { document.getElementById('state-loading').hidden = !show; }
function showError(show)   { document.getElementById('state-error').hidden   = !show; }
function showEmpty(show)   { document.getElementById('state-empty').hidden   = !show; }

function getBadgeLabel(overall) {
  return TRANSLATIONS[currentLang]?.[`card.${overall}`] ?? overall;
}
function getVisitLabel() {
  return TRANSLATIONS[currentLang]?.['card.visit'] ?? 'Visit Demo →';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
