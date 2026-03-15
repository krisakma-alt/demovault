// DemoVault — 데모 등록 폼 제출 로직

const API_BASE = 'https://demovault-worker.krisakma.workers.dev';

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('submit-form').addEventListener('submit', handleSubmit);
});

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

    showResult('success', getMsg('submit.success'));
    form.reset();
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);

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