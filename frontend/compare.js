// Repo vs Repo — 클라이언트 로직

const POPULAR = [
  { a: 'facebook/react', b: 'vuejs/vue', label: 'React vs Vue' },
  { a: 'vercel/next.js', b: 'remix-run/remix', label: 'Next.js vs Remix' },
  { a: 'expressjs/express', b: 'fastify/fastify', label: 'Express vs Fastify' },
  { a: 'prisma/prisma', b: 'drizzle-team/drizzle-orm', label: 'Prisma vs Drizzle' },
  { a: 'supabase/supabase', b: 'appwrite/appwrite', label: 'Supabase vs Appwrite' },
  { a: 'denoland/deno', b: 'nodejs/node', label: 'Deno vs Node.js' },
  { a: 'sveltejs/svelte', b: 'vuejs/vue', label: 'Svelte vs Vue' },
  { a: 'django/django', b: 'pallets/flask', label: 'Django vs Flask' },
];

const $ = (sel) => document.querySelector(sel);
const $form = $('#compare-form');
const $repoA = $('#repo-a');
const $repoB = $('#repo-b');
const $btn = $('#compare-btn');
const $error = $('#compare-error');
const $loading = $('#compare-loading');
const $popular = $('#popular-section');
const $result = $('#compare-result');
const $grid = $('#popular-grid');

// 유틸: owner/repo 파싱
function parseInput(val) {
  const trimmed = val.trim();
  const urlMatch = trimmed.match(/(?:https?:\/\/)?github\.com\/([^/\s]+)\/([^/\s]+)/);
  if (urlMatch) return `${urlMatch[1]}/${urlMatch[2].replace(/\.git$/, '')}`;
  const slashMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (slashMatch) return trimmed;
  return null;
}

// 유틸: 숫자 포맷
function fmt(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
}

// 유틸: 상대 시간
function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days >= 365) return Math.floor(days / 365) + 'y ago';
  if (days >= 30) return Math.floor(days / 30) + 'mo ago';
  if (days >= 1) return days + 'd ago';
  const hrs = Math.floor(diff / 3600000);
  if (hrs >= 1) return hrs + 'h ago';
  return 'just now';
}

// 인기 비교 렌더링
function renderPopular() {
  $grid.innerHTML = POPULAR.map(({ a, b, label }) =>
    `<a class="popular-link" data-a="${a}" data-b="${b}" href="#">⚡ ${label}</a>`
  ).join('');

  $grid.addEventListener('click', (e) => {
    const link = e.target.closest('.popular-link');
    if (!link) return;
    e.preventDefault();
    $repoA.value = link.dataset.a;
    $repoB.value = link.dataset.b;
    doCompare(link.dataset.a, link.dataset.b);
  });
}

// 비교 실행
async function doCompare(repoA, repoB) {
  $error.hidden = true;
  $result.hidden = true;
  $popular.hidden = true;
  $loading.hidden = false;
  $btn.disabled = true;

  // URL 해시 업데이트
  window.location.hash = `${repoA}/vs/${repoB}`;
  document.title = `${repoA} vs ${repoB} — Repo vs Repo | DemoVault`;

  try {
    const res = await fetch(`/api/github-compare?repos=${encodeURIComponent(repoA)},${encodeURIComponent(repoB)}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch data');
    }

    renderResult(data.repos[0], data.repos[1]);
  } catch (err) {
    $error.textContent = err.message;
    $error.hidden = false;
    $popular.hidden = false;
  } finally {
    $loading.hidden = true;
    $btn.disabled = false;
  }
}

// 결과 렌더링
function renderResult(a, b) {
  const rows = [
    { icon: '⭐', label: 'Stars', va: fmt(a.stars), vb: fmt(b.stars), wa: a.stars, wb: b.stars, higher: true },
    { icon: '🍴', label: 'Forks', va: fmt(a.forks), vb: fmt(b.forks), wa: a.forks, wb: b.forks, higher: true },
    { icon: '🐛', label: 'Open Issues', va: fmt(a.open_issues), vb: fmt(b.open_issues), wa: a.open_issues, wb: b.open_issues, higher: false },
    { icon: '📝', label: 'Language', va: a.language || '—', vb: b.language || '—', neutral: true },
    { icon: '📜', label: 'License', va: a.license || '—', vb: b.license || '—', neutral: true },
    { icon: '📅', label: 'Created', va: new Date(a.created_at).toLocaleDateString(), vb: new Date(b.created_at).toLocaleDateString(), neutral: true },
    { icon: '🔄', label: 'Last Push', va: timeAgo(a.pushed_at), vb: timeAgo(b.pushed_at), wa: new Date(a.pushed_at).getTime(), wb: new Date(b.pushed_at).getTime(), higher: true },
    { icon: '👀', label: 'Watchers', va: fmt(a.watchers), vb: fmt(b.watchers), wa: a.watchers, wb: b.watchers, higher: true },
    { icon: '📦', label: 'Latest Release', va: a.latest_release?.version || '—', vb: b.latest_release?.version || '—', neutral: true },
  ];

  function cellClass(row, side) {
    if (row.neutral) return '';
    const aWins = row.higher ? row.wa > row.wb : row.wa < row.wb;
    const bWins = row.higher ? row.wb > row.wa : row.wb < row.wa;
    if (side === 'a' && aWins) return 'class="winner"';
    if (side === 'b' && bWins) return 'class="winner"';
    return '';
  }

  const tableRows = rows.map(r =>
    `<tr>
      <td>${r.icon} ${r.label}</td>
      <td ${cellClass(r, 'a')}>${r.va}</td>
      <td ${cellClass(r, 'b')}>${r.vb}</td>
    </tr>`
  ).join('');

  const topicsA = (a.topics || []).slice(0, 5).map(t => `<span class="topic-tag">${t}</span>`).join('');
  const topicsB = (b.topics || []).slice(0, 5).map(t => `<span class="topic-tag">${t}</span>`).join('');

  $result.innerHTML = `
    <div class="result-header">
      <p>GitHub Repository Comparison</p>
      <h2>${a.full_name} <span style="color:#aaa; font-weight:400;">vs</span> ${b.full_name}</h2>
    </div>

    <div class="repo-cards">
      <div class="repo-card">
        <div class="repo-card-name"><a href="https://github.com/${a.full_name}" target="_blank" rel="noopener">${a.full_name} ↗</a></div>
        ${a.description ? `<div class="repo-card-desc">${escHtml(a.description)}</div>` : ''}
        <div class="repo-card-stats">
          <span>⭐ ${fmt(a.stars)}</span>
          <span>🍴 ${fmt(a.forks)}</span>
          <span>${a.language || ''}</span>
        </div>
        ${topicsA ? `<div class="repo-card-topics">${topicsA}</div>` : ''}
      </div>
      <div class="vs-divider">VS</div>
      <div class="repo-card">
        <div class="repo-card-name"><a href="https://github.com/${b.full_name}" target="_blank" rel="noopener">${b.full_name} ↗</a></div>
        ${b.description ? `<div class="repo-card-desc">${escHtml(b.description)}</div>` : ''}
        <div class="repo-card-stats">
          <span>⭐ ${fmt(b.stars)}</span>
          <span>🍴 ${fmt(b.forks)}</span>
          <span>${b.language || ''}</span>
        </div>
        ${topicsB ? `<div class="repo-card-topics">${topicsB}</div>` : ''}
      </div>
    </div>

    <table class="compare-table">
      <thead><tr><th>Metric</th><th>${a.full_name}</th><th>${b.full_name}</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>

    <div class="chart-section">
      <h3>Weekly Commit Activity (last 26 weeks)</h3>
      <canvas id="commit-chart"></canvas>
    </div>

    <div class="share-bar">
      <span>Share this comparison</span>
      <div class="share-btns">
        <button onclick="copyLink()">📋 Copy Link</button>
        <button onclick="shareX('${a.full_name}','${b.full_name}')">Share on X</button>
      </div>
    </div>

    <div class="cta-section">
      <p>Check if links from these projects are safe</p>
      <a class="cta-btn" href="https://clickvolt.app" target="_blank" rel="noopener">⚡ Check URL Safety with ClickVolt</a>
    </div>
  `;

  $result.hidden = false;
  drawChart(a, b);
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// 간단한 Canvas 차트 (외부 라이브러리 없이)
function drawChart(a, b) {
  const canvas = document.getElementById('commit-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const actA = (a.commit_activity || []).slice(-26);
  const actB = (b.commit_activity || []).slice(-26);
  if (actA.length === 0 && actB.length === 0) {
    canvas.style.display = 'flex';
    canvas.parentElement.innerHTML += '<p style="text-align:center;color:#888;font-size:0.85rem;">No commit activity data available</p>';
    canvas.style.display = 'none';
    return;
  }

  const len = Math.max(actA.length, actB.length);
  const maxVal = Math.max(
    ...actA.map(w => w.total),
    ...actB.map(w => w.total),
    1
  );

  // Canvas 크기 설정
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 250;
  const W = canvas.width;
  const H = canvas.height;
  const padL = 45;
  const padR = 20;
  const padT = 20;
  const padB = 35;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // 배경
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  // 그리드
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W - padR, y);
    ctx.stroke();

    ctx.fillStyle = '#aaa';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(maxVal * (1 - i / 4)), padL - 8, y + 4);
  }

  // 라인 그리기 함수
  function drawLine(data, color) {
    if (data.length === 0) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    data.forEach((w, i) => {
      const x = padL + (chartW / (len - 1)) * i;
      const y = padT + chartH - (w.total / maxVal) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  drawLine(actA, '#6366f1');
  drawLine(actB, '#f59e0b');

  // 범례
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#6366f1';
  ctx.fillRect(padL, H - 18, 12, 12);
  ctx.fillStyle = '#333';
  ctx.textAlign = 'left';
  ctx.fillText(a.full_name, padL + 16, H - 8);

  const labelAWidth = ctx.measureText(a.full_name).width;
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(padL + labelAWidth + 30, H - 18, 12, 12);
  ctx.fillStyle = '#333';
  ctx.fillText(b.full_name, padL + labelAWidth + 46, H - 8);
}

// 공유 기능
function copyLink() {
  navigator.clipboard.writeText(window.location.href);
  const btns = document.querySelectorAll('.share-btns button');
  if (btns[0]) { btns[0].textContent = '✓ Copied!'; setTimeout(() => btns[0].textContent = '📋 Copy Link', 2000); }
}

function shareX(repoA, repoB) {
  const text = encodeURIComponent(`I compared ${repoA} vs ${repoB} on DemoVault!`);
  const url = encodeURIComponent(window.location.href);
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer');
}

// 폼 제출
$form.addEventListener('submit', (e) => {
  e.preventDefault();
  const a = parseInput($repoA.value);
  const b = parseInput($repoB.value);
  if (!a || !b) {
    $error.textContent = 'Invalid format. Use owner/repo or a GitHub URL.';
    $error.hidden = false;
    return;
  }
  doCompare(a, b);
});

// 해시에서 비교 로드
function loadFromHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;
  const match = hash.match(/^(.+?)\/vs\/(.+)$/);
  if (match) {
    $repoA.value = match[1];
    $repoB.value = match[2];
    doCompare(match[1], match[2]);
  }
}

// 초기화
renderPopular();
loadFromHash();
