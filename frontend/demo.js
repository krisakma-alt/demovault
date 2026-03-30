// DemoVault — 데모 상세 페이지

const API_BASE  = 'https://demovault-worker.krisakma.workers.dev';
const BADGE_URL = id => `${API_BASE}/badge/${id}.svg`;
const SITE_URL  = 'https://demovault.org';

const SCAN_ICON = { safe: '✓', unsafe: '✗', pending: '⏳' };
const SCAN_PROVIDERS = [
  ['Google Web Risk',  'webRisk'],
  ['Safe Browsing',    'safeBrowsing'],
  ['urlscan.io',       'urlscan'],
  ['VirusTotal',       'virusTotal'],
];

// URL에서 demo ID 추출: /demo/abc123 또는 ?id=abc123
function getDemoId() {
  const parts = location.pathname.split('/');
  const fromPath = parts[parts.length - 1];
  if (fromPath && fromPath.length > 8) return fromPath;
  return new URLSearchParams(location.search).get('id');
}

// ===== 진입점 =====
document.addEventListener('DOMContentLoaded', async () => {
  const id = getDemoId();
  if (!id) { showError(); return; }

  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);

  try {
    const res = await fetch(`${API_BASE}/api/demo/${id}`);
    if (!res.ok) throw new Error();
    const demo = await res.json();
    renderDemo(demo);
  } catch {
    showError();
  }
});

// ===== 렌더링 =====
function renderDemo(demo) {
  const { id, name, url, desc, category, scanResult, createdAt, clickCount = 0, feedback, tier } = demo;
  const overall = scanResult?.overall ?? 'pending';
  const details = scanResult?.details ?? {};
  const fb      = feedback ?? { tried_it: 0, useful: 0, needs_work: 0 };

  // 페이지 메타 동적 업데이트
  document.title = `${name} — DemoVault`;
  document.querySelector('meta[name="description"]')
    ?.setAttribute('content', desc || `${name} — Safety-checked AI demo on DemoVault`);

  // 헤더
  document.getElementById('d-name').textContent = name;
  document.getElementById('d-desc').textContent = desc || '';

  const dateStr = createdAt ? new Date(createdAt).toLocaleDateString('en-CA') : '—';
  document.getElementById('d-date').textContent = dateStr;

  const catEl = document.getElementById('d-category');
  catEl.textContent     = category ?? 'other';
  catEl.dataset.category = category ?? 'other';

  const badgeEl = document.getElementById('d-badge');
  badgeEl.textContent = overall === 'safe' ? '✓ Safe' : overall === 'unsafe' ? '✗ Unsafe' : '⏳ Scanning';
  badgeEl.className   = `badge ${overall}`;

  // 안전검사 행
  const scanRows = document.getElementById('d-scan-rows');
  scanRows.innerHTML = SCAN_PROVIDERS.map(([label, key]) => {
    const r = details[key] ?? 'pending';
    return `<div class="scan-row">
      <span class="scan-label">🔍 ${label}</span>
      <span class="scan-icon ${r}">${SCAN_ICON[r] ?? '⏳'}</span>
    </div>`;
  }).join('');

  // 통계
  document.getElementById('stat-clicks').textContent = clickCount;
  document.getElementById('stat-useful').textContent = fb.useful;
  document.getElementById('stat-tried').textContent  = fb.tried_it;
  document.getElementById('stat-needs').textContent  = fb.needs_work;

  // 업보트
  const upvoteBtn = document.getElementById('upvote-btn');
  const upvoteCountEl = document.getElementById('upvote-count');
  upvoteCountEl.textContent = fb.useful;

  if (localStorage.getItem(`dv_upvoted_${id}`)) {
    upvoteBtn.classList.add('voted');
    upvoteBtn.querySelector('.upvote-label').textContent = 'Upvoted';
  } else {
    upvoteBtn.addEventListener('click', async () => {
      if (localStorage.getItem(`dv_upvoted_${id}`)) return;
      try {
        const res = await fetch(`${API_BASE}/api/feedback?id=${id}&type=useful`, { method: 'POST' });
        if (!res.ok) throw new Error();
        const data = await res.json();
        localStorage.setItem(`dv_upvoted_${id}`, '1');
        upvoteBtn.classList.add('voted');
        upvoteBtn.querySelector('.upvote-label').textContent = 'Upvoted';
        upvoteCountEl.textContent = data.feedback.useful ?? 0;
      } catch { /* 실패 시 무시 */ }
    });
  }

  // Visit 버튼
  document.getElementById('visit-btn').addEventListener('click', () => openGateModal(id, url));

  // 임베드 뱃지
  const badgeSrc  = BADGE_URL(id);
  const demoLink  = `${SITE_URL}/demo/${id}`;
  const embedHtml = `<a href="${demoLink}">\n  <img src="${badgeSrc}" alt="DemoVault Verified" />\n</a>`;

  document.getElementById('badge-preview').innerHTML =
    `<a href="${demoLink}" target="_blank"><img src="${badgeSrc}" alt="DemoVault badge" style="height:20px"/></a>`;
  document.getElementById('embed-code').textContent = embedHtml;

  document.getElementById('copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(embedHtml).then(() => {
      const btn = document.getElementById('copy-btn');
      btn.textContent = '✓ Copied!';
      setTimeout(() => { btn.textContent = 'Copy Code'; }, 2000);
    });
  });

  // Pro CTA — 현재 비활성 (초기 단계에서는 무료 사용에 집중)
  // TODO: 유저 베이스 확보 후 활성화
  // if (!tier || tier === 'free') {
  //   const ctaEl = document.getElementById('pro-cta');
  //   ctaEl.hidden = false;
  //   document.getElementById('pro-btn').addEventListener('click', () => startCheckout(id, 'pro'));
  // }

  // 표시
  document.getElementById('state-loading').hidden = true;
  document.getElementById('demo-detail').hidden   = false;

  // 리뷰 로드 + CAPTCHA 초기화
  loadReviews(id);
  loadCaptcha();
  setupReviewForm(id);
}

// ===== 리뷰 로드 =====
async function loadReviews(demoId) {
  try {
    const res = await fetch(`${API_BASE}/api/reviews?id=${demoId}`);
    if (!res.ok) return;
    const reviews = await res.json();
    renderReviews(reviews);
  } catch { /* 실패 시 무시 */ }
}

function renderReviews(reviews) {
  const count = document.getElementById('review-count');
  const list  = document.getElementById('review-list');
  const empty = document.getElementById('review-empty');

  count.textContent = reviews.length;

  if (!reviews.length) {
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  // 기존 리뷰 아이템 제거 (empty는 유지)
  list.querySelectorAll('.review-item').forEach(el => el.remove());

  reviews.forEach(r => {
    const date = new Date(r.createdAt).toLocaleDateString('en-CA');
    const item = document.createElement('div');
    item.className = 'review-item';
    item.innerHTML = `
      <div class="review-item-header">
        <span class="review-author">${escapeHtml(r.author)}</span>
        <span class="review-date">${date}</span>
      </div>
      <p class="review-text">${escapeHtml(r.text)}</p>
    `;
    list.appendChild(item);
  });
}

// ===== CAPTCHA =====
let captchaToken = '';

async function loadCaptcha() {
  try {
    const res = await fetch(`${API_BASE}/api/captcha`);
    const data = await res.json();
    document.getElementById('captcha-question').textContent = data.question;
    captchaToken = data.token;
  } catch {
    document.getElementById('captcha-question').textContent = 'CAPTCHA 로드 실패';
  }
}

// ===== 리뷰 폼 =====
function setupReviewForm(demoId) {
  const textarea = document.getElementById('review-text');
  const charSpan = document.getElementById('review-chars');

  textarea.addEventListener('input', () => {
    charSpan.textContent = textarea.value.length;
  });

  document.getElementById('review-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('review-submit-btn');
    const msg = document.getElementById('review-msg');

    const author = document.getElementById('review-author').value.trim();
    const text   = textarea.value.trim();
    const answer = document.getElementById('captcha-answer').value;

    if (!text) return;

    btn.disabled = true;
    msg.hidden = true;

    try {
      const res = await fetch(`${API_BASE}/api/reviews?id=${demoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author, text,
          captcha: { token: captchaToken, answer: parseInt(answer, 10) },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        msg.textContent = data.error || '리뷰 등록 실패';
        msg.className = 'review-msg error';
        msg.hidden = false;
        btn.disabled = false;
        // CAPTCHA 갱신
        loadCaptcha();
        document.getElementById('captcha-answer').value = '';
        return;
      }

      msg.textContent = '✓ 리뷰가 등록되었습니다!';
      msg.className = 'review-msg success';
      msg.hidden = false;

      // 폼 초기화 + 리뷰 리로드
      textarea.value = '';
      charSpan.textContent = '0';
      document.getElementById('review-author').value = '';
      document.getElementById('captcha-answer').value = '';
      loadCaptcha();
      loadReviews(demoId);

      btn.disabled = false;
    } catch {
      msg.textContent = '네트워크 오류';
      msg.className = 'review-msg error';
      msg.hidden = false;
      btn.disabled = false;
    }
  });
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== Stripe Checkout =====
async function startCheckout(demoId, plan) {
  try {
    const res = await fetch(`${API_BASE}/api/ls/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, demoId }),
    });
    const data = await res.json();
    if (data.url) {
      location.href = data.url;
    } else {
      alert('결제 페이지 생성에 실패했습니다: ' + (data.error ?? '알 수 없는 오류'));
    }
  } catch {
    alert('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
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
  proceedBtn.hidden   = true;
  proceedBtn.onclick  = null;
  modal.hidden        = false;

  fetch(`${API_BASE}/api/click?id=${id}`, { method: 'POST' })
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(data => {
      status.hidden = true;
      const overall = data.scanResult?.overall ?? 'error';

      // 클릭 카운트 업데이트
      const el = document.getElementById('stat-clicks');
      if (el && data.clickCount != null) el.textContent = data.clickCount;

      if (overall === 'safe') {
        result.className   = 'modal-result safe';
        result.textContent = '✓ 4종 안전 검사 통과';
        proceedBtn.hidden  = false;
        proceedBtn.onclick = () => { window.open(url, '_blank', 'noopener,noreferrer'); closeModal(); };
      } else if (overall === 'unsafe') {
        result.className   = 'modal-result unsafe';
        result.textContent = '✗ 위험 사이트 감지 — 이동이 차단되었습니다.';
      } else {
        result.className   = 'modal-result pending';
        result.textContent = '⏳ 검사 진행 중. 주의 후 이동하세요.';
        proceedBtn.hidden  = false;
        proceedBtn.onclick = () => { window.open(url, '_blank', 'noopener,noreferrer'); closeModal(); };
      }
      result.hidden = false;
    })
    .catch(() => {
      status.hidden      = true;
      result.className   = 'modal-result error';
      result.textContent = '⚠️ 오류가 발생했습니다.';
      result.hidden      = false;
    });
}

function closeModal() {
  document.getElementById('gate-modal').hidden = true;
}

// ===== 상태 헬퍼 =====
function showError() {
  document.getElementById('state-loading').hidden = true;
  document.getElementById('state-error').hidden   = false;
}
