// DemoVault — 관리자 페이지 로직

const API_BASE = 'https://demovault-worker.krisakma.workers.dev';

let editingId = null;

// ===== 데모 목록 불러오기 =====
async function loadDemos() {
  showLoading(true);
  showError(false);
  document.getElementById('demo-table-wrap').hidden = true;

  try {
    const res = await fetch(`${API_BASE}/api/admin/demos`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const demos = await res.json();
    renderTable(demos);
  } catch (err) {
    showError(true, err.message);
  } finally {
    showLoading(false);
  }
}

// ===== 대시보드 통계 =====
function renderStats(demos) {
  const today = new Date().toLocaleDateString('en-CA');
  const todayCount = demos.filter(d => d.createdAt && new Date(d.createdAt).toLocaleDateString('en-CA') === today).length;
  const totalClicks = demos.reduce((s, d) => s + (d.clickCount ?? 0), 0);
  const totalReviews = demos.reduce((s, d) => s + (d.reviewCount ?? 0), 0);
  const totalFeedback = demos.reduce((s, d) => {
    const fb = d.feedback ?? {};
    return s + (fb.tried_it ?? 0) + (fb.useful ?? 0) + (fb.needs_work ?? 0);
  }, 0);

  document.getElementById('s-total').textContent = demos.length;
  document.getElementById('s-today').textContent = todayCount;
  document.getElementById('s-clicks').textContent = totalClicks;
  document.getElementById('s-reviews').textContent = totalReviews;
  document.getElementById('s-feedback').textContent = totalFeedback;

  // 피처 리퀘스트 수는 별도 API
  fetch(`${API_BASE}/api/admin/requests`)
    .then(r => r.json())
    .then(reqs => { document.getElementById('s-requests').textContent = reqs.length; })
    .catch(() => { document.getElementById('s-requests').textContent = '?'; });
}

// ===== 테이블 렌더링 =====
function renderTable(demos) {
  const tbody = document.getElementById('demo-tbody');
  tbody.innerHTML = '';

  renderStats(demos);

  demos.forEach((demo, idx) => {
    const { id, name, url, category, scanResult, createdAt, clickCount = 0, reviewCount = 0 } = demo;
    const overall = scanResult?.overall ?? 'pending';
    const date = createdAt ? new Date(createdAt).toLocaleDateString('en-CA') : '—';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:#aaa;font-size:0.8rem">#${idx + 1}</td>
      <td><a href="/demo/${id}" target="_blank" style="color:#1a1a2e;font-weight:600">${escapeHtml(name)}</a></td>
      <td>${escapeHtml(category ?? 'other')}</td>
      <td>${date}</td>
      <td style="text-align:center">${clickCount}</td>
      <td style="text-align:center">${reviewCount}</td>
      <td><span class="badge ${overall}">${overall}</span></td>
      <td>
        <button class="btn-edit" data-id="${id}">수정</button>
        <button class="btn-delete" data-id="${id}">삭제</button>
      </td>
    `;

    tr.querySelector('.btn-edit').addEventListener('click', () => openEditModal(demo));
    tr.querySelector('.btn-delete').addEventListener('click', () => confirmDelete(id, name));

    tbody.appendChild(tr);
  });

  document.getElementById('demo-table-wrap').hidden = false;
}

// ===== 삭제 =====
async function confirmDelete(id, name) {
  if (!confirm(`"${name}" 을(를) 삭제할까요?`)) return;

  try {
    const res = await fetch(`${API_BASE}/api/admin/delete?id=${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    loadDemos();
  } catch (err) {
    alert('삭제 실패: ' + err.message);
  }
}

// ===== 수정 모달 =====
function openEditModal(demo) {
  editingId = demo.id;
  document.getElementById('edit-name').value = demo.name;
  document.getElementById('edit-category').value = demo.category ?? 'other';
  document.getElementById('edit-desc').value = demo.desc ?? '';
  document.getElementById('edit-modal').hidden = false;
}

// ===== UI 헬퍼 =====
function showLoading(show) {
  document.getElementById('state-loading').hidden = !show;
}

function showError(show, msg = '') {
  document.getElementById('state-error').hidden = !show;
  if (msg) document.getElementById('error-msg').textContent = msg;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== 피처 리퀘스트 목록 =====
const REQ_STATUS_LABELS = {
  new:       '🆕 New',
  reviewing: '👀 Reviewing',
  planned:   '📅 Planned',
  done:      '✅ Done',
  declined:  '❌ Declined',
};

const REQ_TYPE_LABELS = { feature: '✨ Feature', bug: '🐛 Bug', other: '💬 Other' };

async function loadRequests() {
  document.getElementById('req-loading').hidden = false;
  document.getElementById('req-empty').hidden   = true;
  document.getElementById('req-list').innerHTML = '';

  try {
    const res = await fetch(`${API_BASE}/api/admin/requests`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const requests = await res.json();

    document.getElementById('req-loading').hidden = true;

    if (!requests.length) {
      document.getElementById('req-empty').hidden = false;
      return;
    }

    renderRequests(requests);
  } catch (err) {
    document.getElementById('req-loading').hidden = true;
    document.getElementById('req-list').innerHTML =
      `<p style="color:#e00;text-align:center">오류: ${err.message}</p>`;
  }
}

function renderRequests(requests) {
  const list = document.getElementById('req-list');
  list.innerHTML = '';

  requests.forEach(req => {
    const date = new Date(req.createdAt).toLocaleDateString('en-CA');
    const card = document.createElement('div');
    card.className = 'req-card';
    card.innerHTML = `
      <div class="req-card-header">
        <span class="req-type">${REQ_TYPE_LABELS[req.type] ?? req.type}</span>
        <span class="req-date">${date}</span>
        <select class="req-status-select" data-id="${req.id}">
          ${Object.entries(REQ_STATUS_LABELS).map(([val, label]) =>
            `<option value="${val}" ${req.status === val ? 'selected' : ''}>${label}</option>`
          ).join('')}
        </select>
      </div>
      <p class="req-message">${escapeHtml(req.message)}</p>
      ${req.name  ? `<p class="req-meta">👤 ${escapeHtml(req.name)}</p>`  : ''}
      ${req.email ? `<p class="req-meta">📧 <a href="mailto:${escapeHtml(req.email)}">${escapeHtml(req.email)}</a></p>` : ''}
    `;

    card.querySelector('.req-status-select').addEventListener('change', async e => {
      const status = e.target.value;
      try {
        const res = await fetch(`${API_BASE}/api/admin/req-status?id=${req.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error();
      } catch {
        alert('상태 변경 실패');
        e.target.value = req.status; // 롤백
      }
    });

    list.appendChild(card);
  });
}

// ===== 탭 전환 =====
function initTabs() {
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tab;
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      document.getElementById('tab-demos').hidden    = (name !== 'demos');
      document.getElementById('tab-requests').hidden = (name !== 'requests');

      if (name === 'requests') loadRequests();
    });
  });
}

// ===== 진입점 =====
document.addEventListener('DOMContentLoaded', () => {
  initTabs();

  document.getElementById('edit-cancel').addEventListener('click', () => {
    document.getElementById('edit-modal').hidden = true;
    editingId = null;
  });

  document.getElementById('edit-save').addEventListener('click', async () => {
    if (!editingId) return;

    const body = {
      name:     document.getElementById('edit-name').value.trim(),
      category: document.getElementById('edit-category').value,
      desc:     document.getElementById('edit-desc').value.trim(),
    };

    try {
      const res = await fetch(`${API_BASE}/api/admin/update?id=${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      document.getElementById('edit-modal').hidden = true;
      editingId = null;
      loadDemos();
    } catch (err) {
      alert('수정 실패: ' + err.message);
    }
  });

  loadDemos();
});
