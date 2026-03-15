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

// ===== 테이블 렌더링 =====
function renderTable(demos) {
  const tbody = document.getElementById('demo-tbody');
  tbody.innerHTML = '';

  demos.forEach(demo => {
    const { id, name, url, category, scanResult, createdAt } = demo;
    const overall = scanResult?.overall ?? 'pending';
    const date = createdAt ? new Date(createdAt).toLocaleDateString('en-CA') : '—';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(name)}</td>
      <td><a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a></td>
      <td>${escapeHtml(category ?? 'other')}</td>
      <td>${date}</td>
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

// ===== 진입점 =====
document.addEventListener('DOMContentLoaded', () => {
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
