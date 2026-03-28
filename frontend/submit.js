// DemoVault — 데모 등록 폼 제출 로직 (단계별 플로우)

const API_BASE = 'https://demovault-worker.krisakma.workers.dev';

let currentStep = 1;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('submit-form').addEventListener('submit', handleSubmit);

  // Next 버튼
  document.querySelectorAll('.btn-next').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = Number(btn.dataset.next);
      if (!validateStep(currentStep)) return;
      if (next === 3) buildPreview();
      goToStep(next);
    });
  });

  // Back 버튼
  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => goToStep(Number(btn.dataset.back)));
  });

  // URL 실시간 유효성 피드백
  const urlInput = document.getElementById('url');
  if (urlInput) {
    urlInput.addEventListener('input', () => {
      const val = urlInput.value.trim();
      if (!val) { urlInput.style.borderColor = ''; return; }
      try {
        const u = new URL(val);
        urlInput.style.borderColor = u.protocol.startsWith('http') ? 'var(--safe-badge)' : 'var(--unsafe-badge)';
      } catch {
        urlInput.style.borderColor = 'var(--unsafe-badge)';
      }
    });
    urlInput.addEventListener('blur', () => { urlInput.style.borderColor = ''; });
  }
});

// ===== 단계 이동 =====
function goToStep(step) {
  currentStep = step;

  // 폼 단계 표시/숨김
  document.querySelectorAll('.form-step').forEach(el => {
    el.hidden = Number(el.dataset.formStep) !== step;
  });

  // 상단 인디케이터 업데이트
  document.querySelectorAll('.step-indicator .step').forEach(el => {
    const s = Number(el.dataset.step);
    el.classList.toggle('active', s === step);
    el.classList.toggle('done', s < step);
  });
}

// ===== 단계별 유효성 검사 =====
function validateStep(step) {
  if (step === 1) {
    const name = document.getElementById('name');
    const url  = document.getElementById('url');
    if (!name.value.trim()) { name.focus(); return false; }
    if (!url.value.trim() || !url.validity.valid) { url.focus(); return false; }
    return true;
  }
  return true; // Step 2는 카테고리 기본값 있으므로 항상 유효
}

// ===== 제출 전 미리보기 =====
function buildPreview() {
  const form = document.getElementById('submit-form');
  const dl   = document.getElementById('preview-data');
  const cat  = form.category.options[form.category.selectedIndex];
  const catLabel = cat.textContent;

  dl.innerHTML = `
    <div class="preview-row"><dt>${getMsg('submit.name')}</dt><dd>${escapeHtml(form.name.value.trim())}</dd></div>
    <div class="preview-row"><dt>${getMsg('submit.url')}</dt><dd>${escapeHtml(form.url.value.trim())}</dd></div>
    <div class="preview-row"><dt>${getMsg('submit.category')}</dt><dd>${catLabel}</dd></div>
    <div class="preview-row"><dt>${getMsg('submit.desc')}</dt><dd>${escapeHtml(form.desc.value.trim()) || '—'}</dd></div>
  `;
}

// ===== 제출 =====
async function handleSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  const payload = {
    name:     form.name.value.trim(),
    url:      form.url.value.trim(),
    category: form.category.value,
    desc:     form.desc.value.trim(),
  };

  setLoading(submitBtn, true);
  clearResult();

  try {
    const res = await fetch(`${API_BASE}/api/submit`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showResult('error', err.error || getMsg('submit.errorGeneric'));
      return;
    }

    const data = await res.json().catch(() => ({}));
    showResult('success', getMsg('submit.success'));
    form.reset();
    goToStep(1);

    // 뱃지 코드 표시
    if (data.id) {
      showBadgeCode(data.id);
    } else {
      setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    }

  } catch {
    showResult('error', getMsg('submit.errorNetwork'));
  } finally {
    setLoading(submitBtn, false);
  }
}

// ===== UI 헬퍼 =====
function setLoading(btn, isLoading) {
  btn.disabled = isLoading;
  btn.textContent = isLoading ? getMsg('submit.sending') : getMsg('submit.button');
}

function showResult(type, message) {
  const el = document.getElementById('result');
  el.className = `result-box ${type}`;
  el.textContent = message;
  el.hidden = false;
}

function clearResult() {
  const el = document.getElementById('result');
  el.hidden = true;
  el.textContent = '';
}

function getMsg(key) {
  return TRANSLATIONS[currentLang]?.[key] ?? key;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== 뱃지 코드 표시 =====
function showBadgeCode(demoId) {
  const BADGE_BASE = 'https://demovault-worker.krisakma.workers.dev';
  const SITE_BASE = 'https://demovault.youngri.org';
  const badgeUrl = `${BADGE_BASE}/badge/${demoId}.svg`;
  const demoUrl = `${SITE_BASE}/demo/${demoId}`;

  const markdown = `[![DemoVault Verified](${badgeUrl})](${demoUrl})`;
  const html = `<a href="${demoUrl}"><img src="${badgeUrl}" alt="DemoVault Verified"></a>`;

  const el = document.getElementById('result');
  el.innerHTML = `
    <div class="badge-success">
      <p class="badge-success-title">${getMsg('submit.success')}</p>
      <div class="badge-preview">
        <img src="${escapeHtml(badgeUrl)}" alt="DemoVault Badge" />
      </div>
      <p class="badge-label">${getMsg('submit.badgeLabel')}</p>
      <div class="badge-code-block">
        <label>Markdown</label>
        <div class="badge-copy-row">
          <code>${escapeHtml(markdown)}</code>
          <button type="button" class="btn-copy" onclick="copyText(this, '${escapeHtml(markdown)}')">${getMsg('submit.copy')}</button>
        </div>
      </div>
      <div class="badge-code-block">
        <label>HTML</label>
        <div class="badge-copy-row">
          <code>${escapeHtml(html)}</code>
          <button type="button" class="btn-copy" onclick="copyText(this, '${escapeHtml(html)}')">${getMsg('submit.copy')}</button>
        </div>
      </div>
      <a href="${escapeHtml(demoUrl)}" class="btn-view-demo">${getMsg('submit.viewDemo')}</a>
    </div>
  `;
  el.className = 'result-box';
  el.hidden = false;
}

function copyText(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const original = btn.textContent;
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = original; }, 1500);
  });
}
