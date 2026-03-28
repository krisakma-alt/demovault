// DemoVault — 갤러리 데이터 fetch + 카드 렌더링

const API_BASE = 'https://demovault-worker.krisakma.workers.dev';

const BADGE_CLASS = { safe: 'safe', unsafe: 'unsafe', pending: 'pending' };

// 현재 필터 / 검색 / 정렬 상태
let currentFilter = 'all';
let currentSearch = '';
let currentSort   = 'reviews'; // reviews | popular | newest
let allDemos = [];

// 검색 디바운스 타이머
let searchTimer = null;
const SEARCH_DEBOUNCE_MS = 300;
const MAX_RECENT_SEARCHES = 5;
const RECENT_SEARCHES_KEY = 'dv_recent_searches';

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

  // 검색 입력 이벤트
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    // URL ?q= 파라미터로 프리필
    const urlQ = new URLSearchParams(location.search).get('q');
    if (urlQ) { searchInput.value = urlQ; currentSearch = urlQ.toLowerCase(); }

    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        currentSearch = searchInput.value.trim().toLowerCase();
        applyFilter();
      }, SEARCH_DEBOUNCE_MS);
    });

    // 최근 검색어: 포커스 시 표시, 검색 실행 시 저장
    searchInput.addEventListener('focus', showRecentSearches);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && searchInput.value.trim()) {
        saveRecentSearch(searchInput.value.trim());
        hideRecentSearches();
      }
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-wrapper')) hideRecentSearches();
    });
  }

  // 검색 초기화 버튼
  document.getElementById('clear-search-btn')?.addEventListener('click', () => {
    const si = document.getElementById('search-input');
    if (si) si.value = '';
    currentSearch = '';
    currentFilter = 'all';
    document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-filter="all"]')?.classList.add('active');
    applyFilter();
  });

  // 정렬 드롭다운
  document.getElementById('sort-select')?.addEventListener('change', (e) => {
    currentSort = e.target.value;
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

// ===== 필터 + 검색 + 정렬 적용 =====
function applyFilter() {
  let filtered = allDemos;

  // 카테고리 필터
  if (currentFilter !== 'all') {
    filtered = filtered.filter(d => (d.category ?? 'other') === currentFilter);
  }

  // 텍스트 검색 (name + desc)
  if (currentSearch) {
    filtered = filtered.filter(d => {
      const name = (d.name || '').toLowerCase();
      const desc = (d.desc || '').toLowerCase();
      return name.includes(currentSearch) || desc.includes(currentSearch);
    });
  }

  // 정렬
  filtered = [...filtered];
  if (currentSort === 'reviews') {
    filtered.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0) || b.createdAt - a.createdAt);
  } else if (currentSort === 'popular') {
    filtered.sort((a, b) => (b.clickCount ?? 0) - (a.clickCount ?? 0) || b.createdAt - a.createdAt);
  } else {
    filtered.sort((a, b) => b.createdAt - a.createdAt);
  }

  if (!filtered.length) {
    document.getElementById('gallery').innerHTML = '';
    // 검색/필터 결과 없음 vs 데모 자체 없음 구분
    if (currentSearch || currentFilter !== 'all') {
      showEmpty(false);
      showNoResults(true);
    } else {
      showNoResults(false);
      showEmpty(true);
    }
    return;
  }

  showEmpty(false);
  showNoResults(false);
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
  const { id, name, url, desc, category, scanResult, clickCount = 0 } = demo;
  const overall  = scanResult?.overall ?? 'pending';
  const details  = scanResult?.details ?? {};

  const descText = (desc && typeof desc === 'string' && desc.trim()) ? desc.trim() : '';

  const catKey   = `cat.${category ?? 'other'}`;
  const catLabel = TRANSLATIONS[currentLang]?.[catKey] ?? (category ?? 'other');

  const article = document.createElement('article');
  article.className = 'card';
  article.dataset.id = id;

  const upvoteCount = demo.feedback?.useful ?? 0;
  const hasVoted = localStorage.getItem(`dv_upvoted_${id}`);

  article.innerHTML = `
    <div class="card-header">
      <div class="card-upvote-display">
        <span class="upvote-arrow">▲</span>
        <span class="upvote-count">${upvoteCount}</span>
      </div>
      <div class="card-header-text">
        <h3 class="card-name"><a href="/demo/${id}" class="card-name-link">${escapeHtml(name)}</a></h3>
        <button class="badge ${BADGE_CLASS[overall] ?? 'pending'}"
          data-badge="${overall}" data-open="false"
          aria-expanded="false" aria-label="검사 결과 보기"
        >${getBadgeLabel(overall)}</button>
      </div>
    </div>
    <p class="card-desc">${escapeHtml(descText)}</p>
    <span class="card-category" data-category="${category ?? 'other'}">${catLabel}</span>

    <div class="scan-detail">
      ${buildScanRow('Google Web Risk', details.webRisk)}
      ${buildScanRow('Safe Browsing',  details.safeBrowsing)}
      ${buildScanRow('urlscan.io',     details.urlscan)}
      ${details.virusTotal ? buildScanRow('VirusTotal', details.virusTotal) : ''}
    </div>

    <div class="card-footer">
      <div class="card-meta">
        <span class="card-reviews">💬 ${demo.reviewCount ?? 0}</span>
        <span class="card-clicks" data-clicks="${id}">👁 ${clickCount}</span>
      </div>
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

  return article;
}

// ===== 업보트 전송 =====
async function handleUpvote(id, btn) {
  if (localStorage.getItem(`dv_upvoted_${id}`)) return;
  try {
    const res = await fetch(`${API_BASE}/api/feedback?id=${id}&type=useful`, { method: 'POST' });
    if (!res.ok) throw new Error();
    const data = await res.json();
    localStorage.setItem(`dv_upvoted_${id}`, '1');
    btn.classList.add('voted');
    btn.querySelector('.upvote-count').textContent = data.feedback.useful ?? 0;
  } catch { /* 실패 시 무시 */ }
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
        result.textContent = TRANSLATIONS[currentLang]?.['modal.resultSafe'] ?? '✓ 4종 안전 검사 통과';
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

function showLoading(show)   { document.getElementById('state-loading').hidden = !show; }
function showError(show)     { document.getElementById('state-error').hidden   = !show; }
function showEmpty(show)     { document.getElementById('state-empty').hidden   = !show; }
function showNoResults(show) { document.getElementById('state-no-results').hidden = !show; }

// ===== 최근 검색어 =====
function getRecentSearches() {
  try { return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)) || []; }
  catch { return []; }
}

function saveRecentSearch(query) {
  const q = query.trim();
  if (!q) return;
  let recent = getRecentSearches().filter(s => s !== q);
  recent.unshift(q);
  if (recent.length > MAX_RECENT_SEARCHES) recent = recent.slice(0, MAX_RECENT_SEARCHES);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
}

function showRecentSearches() {
  const container = document.getElementById('recent-searches');
  if (!container) return;
  const recent = getRecentSearches();
  if (!recent.length) { container.hidden = true; return; }

  const label = TRANSLATIONS[currentLang]?.['search.recent'] ?? 'Recent';
  container.innerHTML = `<div class="recent-header"><span>${label}</span></div>` +
    recent.map(q => `<button class="recent-item" type="button">${escapeHtml(q)}</button>`).join('');

  container.querySelectorAll('.recent-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('search-input');
      input.value = btn.textContent;
      currentSearch = btn.textContent.toLowerCase();
      applyFilter();
      hideRecentSearches();
    });
  });

  container.hidden = false;
}

function hideRecentSearches() {
  const container = document.getElementById('recent-searches');
  if (container) container.hidden = true;
}

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
