// DemoVault — 피처 리퀘스트 폼

const API_BASE = 'https://demovault-worker.krisakma.workers.dev';
let selectedType = 'feature';

document.addEventListener('DOMContentLoaded', () => {
  // 유형 버튼
  document.getElementById('type-btns').addEventListener('click', e => {
    const btn = e.target.closest('.type-btn');
    if (!btn) return;
    selectedType = btn.dataset.type;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });

  // 글자수 카운터
  const textarea = document.getElementById('req-message');
  const counter  = document.getElementById('char-count');
  textarea.addEventListener('input', () => {
    counter.textContent = textarea.value.length;
  });

  // 폼 제출
  document.getElementById('request-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.textContent = '제출 중...';

    const message = textarea.value.trim();
    const name    = document.getElementById('req-name').value.trim();
    const email   = document.getElementById('req-email').value.trim();

    try {
      const res = await fetch(`${API_BASE}/api/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, message, name, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error ?? '제출에 실패했습니다. 다시 시도해주세요.');
        btn.disabled = false;
        btn.textContent = '제출하기 →';
        return;
      }

      // 성공
      document.getElementById('form-wrap').hidden = true;
      document.getElementById('result-box').hidden = false;
    } catch {
      alert('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      btn.disabled = false;
      btn.textContent = '제출하기 →';
    }
  });
});
