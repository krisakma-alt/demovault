// GitHub API 프록시 — Pages Function
// GET /api/github-compare?repos=owner1/repo1,owner2/repo2

const GITHUB_API = 'https://api.github.com';

function buildHeaders(env) {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'DemoVault-Compare',
  };
  if (env.GITHUB_PAT) {
    headers['Authorization'] = `Bearer ${env.GITHUB_PAT}`;
  }
  return headers;
}

async function fetchRepo(owner, repo, headers) {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers });
  if (res.status === 404) throw new Error(`Repository not found: ${owner}/${repo}`);
  if (res.status === 403 || res.status === 429) throw new Error('GitHub API rate limit exceeded');
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

async function fetchCommitActivity(owner, repo, headers) {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/stats/commit_activity`, { headers });
  if (res.status === 202 || !res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function fetchLatestRelease(owner, repo, headers) {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/releases/latest`, { headers });
  if (res.status === 404 || !res.ok) return null;
  return res.json();
}

function formatRepo(data, activity, release) {
  return {
    full_name: data.full_name,
    description: data.description || null,
    stars: data.stargazers_count,
    forks: data.forks_count,
    open_issues: data.open_issues_count,
    language: data.language || null,
    license: data.license?.spdx_id || null,
    created_at: data.created_at,
    pushed_at: data.pushed_at,
    watchers: data.subscribers_count,
    topics: data.topics || [],
    homepage: data.homepage || null,
    size_kb: data.size,
    commit_activity: activity.map(w => ({ week: w.week, total: w.total })),
    latest_release: release ? {
      version: release.tag_name,
      date: release.published_at,
      name: release.name || null,
    } : null,
  };
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const reposParam = url.searchParams.get('repos');

  // CORS 헤더
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (!reposParam) {
    return new Response(JSON.stringify({ error: 'Missing repos parameter' }), {
      status: 400, headers: corsHeaders,
    });
  }

  const parts = reposParam.split(',').map(r => r.trim());
  if (parts.length !== 2) {
    return new Response(JSON.stringify({ error: 'Exactly 2 repos required' }), {
      status: 400, headers: corsHeaders,
    });
  }

  const parsed = parts.map(p => {
    const m = p.match(/^([^/\s]+)\/([^/\s]+)$/);
    return m ? { owner: m[1], repo: m[2] } : null;
  });

  if (!parsed[0] || !parsed[1]) {
    return new Response(JSON.stringify({ error: 'Invalid format. Use owner/repo' }), {
      status: 400, headers: corsHeaders,
    });
  }

  try {
    const headers = buildHeaders(context.env);
    const [repoA, repoB, actA, actB, relA, relB] = await Promise.all([
      fetchRepo(parsed[0].owner, parsed[0].repo, headers),
      fetchRepo(parsed[1].owner, parsed[1].repo, headers),
      fetchCommitActivity(parsed[0].owner, parsed[0].repo, headers),
      fetchCommitActivity(parsed[1].owner, parsed[1].repo, headers),
      fetchLatestRelease(parsed[0].owner, parsed[0].repo, headers),
      fetchLatestRelease(parsed[1].owner, parsed[1].repo, headers),
    ]);

    return new Response(JSON.stringify({
      repos: [
        formatRepo(repoA, actA, relA),
        formatRepo(repoB, actB, relB),
      ],
      compared_at: new Date().toISOString(),
    }), { headers: corsHeaders });

  } catch (err) {
    const msg = err.message || 'Unknown error';
    const status = msg.includes('not found') ? 404 : msg.includes('rate limit') ? 429 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: corsHeaders,
    });
  }
}
