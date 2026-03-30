// DemoVault — AI 분석 엔진 (크롤링 + Claude API)

const AI_GATEWAY_BASE = 'https://gateway.ai.cloudflare.com/v1/8021ce77db3b9c877b47fdedb464d94c/demovault-gateway';
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const CRAWL_TIMEOUT_MS = 5000;
const MAX_BODY_LENGTH = 3000;

// ===== 메인: 분석 실행 + KV 저장 =====
export async function runAnalysis(demoId, url, env) {
  try {
    const crawlData = await crawlUrl(url);
    console.log(JSON.stringify({ type: 'crawl_done', demoId, title: crawlData.title, bodyLen: crawlData.body_text?.length }));

    const analysis = await analyzeWithClaude(crawlData, env);
    analysis.analyzed_at = new Date().toISOString();
    await env.DEMOS.put(`analysis_${demoId}`, JSON.stringify(analysis));
    console.log(JSON.stringify({ type: 'analysis', demoId, summary: analysis.summary }));
  } catch (err) {
    console.error(JSON.stringify({ type: 'analysis_error', demoId, error: err.message, stack: err.stack?.split('\n')[0] }));
    // 실패 시 기본값 저장
    await env.DEMOS.put(`analysis_${demoId}`, JSON.stringify({
      summary: 'Analysis pending',
      categories: [],
      target_users: 'Unknown',
      tech_stack: [],
      ux_score: 0,
      ux_comment: 'Analysis failed — will retry on next scan.',
      analyzed_at: new Date().toISOString(),
      error: true,
      error_msg: err.message,
    }));
  }
}

// ===== 크롤링: URL에서 메타데이터 추출 =====
export async function crawlUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CRAWL_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'DemoVault-Analyzer/1.0' },
      redirect: 'follow',
    });

    if (!res.ok) {
      return { url, title: '', meta_description: '', body_text: '', og_image: '' };
    }

    const html = await res.text();
    return parseHtml(url, html);
  } catch (err) {
    return { url, title: '', meta_description: '', body_text: '', og_image: '' };
  } finally {
    clearTimeout(timeout);
  }
}

// ===== HTML 파싱 (정규식 기반 — Workers에서 DOM parser 없음) =====
function parseHtml(url, html) {
  const title = extractTag(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || '';
  const meta_description = extractMeta(html, 'description') || extractOg(html, 'description') || '';
  const og_image = extractOg(html, 'image') || '';

  // body 텍스트 추출: script/style 제거 → HTML 태그 제거 → 공백 정리
  let bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let body_text = bodyMatch ? bodyMatch[1] : html;
  body_text = body_text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_BODY_LENGTH);

  return { url, title: title.trim(), meta_description: meta_description.trim(), body_text, og_image };
}

function extractTag(html, regex) {
  const m = html.match(regex);
  return m ? m[1] : null;
}

function extractMeta(html, name) {
  const regex = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*?)["']`, 'i');
  const m = html.match(regex);
  if (m) return m[1];
  // 순서 반대 (content 먼저)
  const regex2 = new RegExp(`<meta[^>]+content=["']([^"']*?)["'][^>]+name=["']${name}["']`, 'i');
  const m2 = html.match(regex2);
  return m2 ? m2[1] : null;
}

function extractOg(html, prop) {
  const regex = new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']*?)["']`, 'i');
  const m = html.match(regex);
  if (m) return m[1];
  const regex2 = new RegExp(`<meta[^>]+content=["']([^"']*?)["'][^>]+property=["']og:${prop}["']`, 'i');
  const m2 = html.match(regex2);
  return m2 ? m2[1] : null;
}

// ===== Claude API 호출 (AI Gateway Provider Keys 사용) =====
export async function analyzeWithClaude(crawlData, env) {
  const prompt = `Analyze this AI demo and respond ONLY with JSON, no other text.

URL: ${crawlData.url}
Title: ${crawlData.title}
Description: ${crawlData.meta_description}
Body text (first 3000 chars): ${crawlData.body_text}

Respond with this exact JSON structure:
{
  "summary": "One-line summary of what this demo does (under 50 chars, in English)",
  "categories": ["up to 3 category tags from: Productivity, Image Generation, Coding, Writing, Data Analysis, Education, Entertainment, Music, Video, Design, Chatbot, Research, Other"],
  "target_users": "Target user description in English (e.g. 'Developers', 'Content creators', 'Students')",
  "tech_stack": ["up to 3 estimated technologies"],
  "ux_score": 7,
  "ux_comment": "One-line UX first impression in English"
}`;

  if (!env.CLAUDE_API_KEY) {
    throw new Error('CLAUDE_API_KEY not configured');
  }

  // AI Gateway 경유 + x-api-key 직접 전달
  const apiUrl = `${AI_GATEWAY_BASE}/anthropic/v1/messages`;

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const rawText = await res.text();

  if (!res.ok) {
    throw new Error(`Claude API error: ${res.status} — ${rawText.slice(0, 500)}`);
  }

  const data = JSON.parse(rawText);
  const text = data.content?.[0]?.text ?? '';

  // JSON 추출 (코드 블록 안에 있을 수도 있음)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Claude response is not valid JSON');
  }

  const analysis = JSON.parse(jsonMatch[0]);

  // 유효성 검증 + 기본값
  return {
    summary: String(analysis.summary || 'AI demo').slice(0, 100),
    categories: Array.isArray(analysis.categories) ? analysis.categories.slice(0, 3) : [],
    target_users: String(analysis.target_users || 'General users').slice(0, 100),
    tech_stack: Array.isArray(analysis.tech_stack) ? analysis.tech_stack.slice(0, 3) : [],
    ux_score: Math.min(10, Math.max(0, parseInt(analysis.ux_score) || 5)),
    ux_comment: String(analysis.ux_comment || '').slice(0, 200),
  };
}
