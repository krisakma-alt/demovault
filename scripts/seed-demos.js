#!/usr/bin/env node
// DemoVault — 다중 소스 자동 수집 + 등록 스크립트 v3
// 소스: Hugging Face Spaces + GitHub AI 프로젝트 (라이브 데모 URL)

const API_BASE = 'https://demovault-worker.krisakma.workers.dev';
const HF_API = 'https://huggingface.co/api/spaces';
const DELAY_MS = 6000;

// 카테고리 분류 (이름+설명 기반)
const CATEGORY_RULES = [
  { cat: 'image-gen', keywords: ['image gen', 'diffusion', 'stable diffusion', 'dall-e', 'dalle', 'flux', 'sdxl', 'text-to-image', 'txt2img', 'image creator', 'art gen', 'illusion', 'enhancer', 'upscal', 'inpaint', 'outpaint', 'controlnet', 'dreambooth'] },
  { cat: 'text-ai', keywords: ['llm', 'chat', 'gpt', 'text gen', 'language model', 'leaderboard', 'arena', 'writing', 'summariz', 'translat', 'question answer', 'rag', 'embedding', 'mteb', 'prompt', 'copilot'] },
  { cat: 'code-ai', keywords: ['code', 'coding', 'program', 'debug', 'compiler', 'deepsite', 'website build', 'devtool', 'github', 'ide'] },
  { cat: 'voice-ai', keywords: ['voice', 'speech', 'tts', 'text-to-speech', 'whisper', 'audio', 'music', 'sound', 'asr', 'transcri', 'sing', 'bark', 'coqui'] },
  { cat: 'video-ai', keywords: ['video', 'animate', 'motion', 'text-to-video', 'runway', 'pika', 'luma'] },
  { cat: 'utility', keywords: ['segment', 'detect', 'ocr', 'background remov', 'classify', 'depth', 'face', 'try-on', 'virtual try', 'comic', 'lottie', 'remove bg', 'pdf', 'convert', 'extract', 'tool'] },
];

function classifyCategory(name, desc, tags) {
  const text = `${name} ${desc} ${(tags || []).join(' ')}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => text.includes(k))) return rule.cat;
  }
  return 'other';
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getExistingUrls() {
  const res = await fetch(`${API_BASE}/api/demos`);
  return new Set((await res.json()).map(d => d.url));
}

async function checkAlive(url) {
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(10000) });
    return r.status < 500;
  } catch { return false; }
}

async function registerDemo(d) {
  const r = await fetch(`${API_BASE}/api/submit`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(d),
  });
  return r.json();
}

// ===== Hugging Face Spaces 수집 =====
async function collectHFSpaces() {
  const allSpaces = new Map();
  for (const sort of ['likes', 'modified', 'created']) {
    try {
      const res = await fetch(`${HF_API}?sort=${sort}&limit=100&full=true`);
      if (!res.ok) { console.log(`  [HF] ${sort} → ${res.status} 스킵`); continue; }
      const spaces = await res.json();
      spaces.forEach(s => { if (!allSpaces.has(s.id)) allSpaces.set(s.id, s); });
      console.log(`  [HF] ${sort}: ${spaces.length}개 (누적 ${allSpaces.size}개)`);
    } catch (e) {
      console.log(`  [HF] ${sort} → 오류: ${e.message}`);
    }
  }

  const candidates = [];
  for (const [, space] of allSpaces) {
    if (space.private || space.disabled) continue;
    const sdk = space.sdk || '';
    if (!['gradio', 'streamlit', 'docker', 'static'].includes(sdk)) continue;

    const title = space.cardData?.title || space.id.split('/').pop();
    const desc = space.cardData?.short_description || '';
    const tags = space.tags || [];
    const category = classifyCategory(title, desc, tags);

    candidates.push({
      name: title.slice(0, 80),
      url: `https://huggingface.co/spaces/${space.id}`,
      category,
      desc: (desc || `${title} — AI demo on Hugging Face`).slice(0, 200),
      likes: space.likes || 0,
      source: 'hf',
    });
  }

  return candidates;
}

// ===== 수동 큐레이션: 유명 AI 데모 + GitHub 호스팅 프로젝트 =====
function getCuratedDemos() {
  return [
    // 이미지 생성
    { name: 'Stable Diffusion Web UI', url: 'https://huggingface.co/spaces/stabilityai/stable-diffusion', category: 'image-gen', desc: 'Generate images from text prompts using Stable Diffusion' },
    { name: 'Playground v2.5', url: 'https://huggingface.co/spaces/playgroundai/playground-v2.5', category: 'image-gen', desc: 'High-quality text-to-image generation playground' },
    { name: 'InstantID', url: 'https://huggingface.co/spaces/InstantX/InstantID', category: 'image-gen', desc: 'Zero-shot Identity-Preserving Generation' },
    { name: 'IP-Adapter FaceID', url: 'https://huggingface.co/spaces/multimodalart/Ip-Adapter-FaceID', category: 'image-gen', desc: 'Generate images preserving facial identity with text prompts' },

    // 텍스트 AI
    { name: 'HuggingChat', url: 'https://huggingface.co/chat/', category: 'text-ai', desc: 'Open-source AI chat assistant powered by the best open models' },
    { name: 'Open Playground', url: 'https://huggingface.co/spaces/huggingface-projects/llm-benchmarks', category: 'text-ai', desc: 'Compare and benchmark open-source LLMs side by side' },
    { name: 'Phind', url: 'https://www.phind.com', category: 'text-ai', desc: 'AI search engine for developers — get instant answers with code' },
    { name: 'Perplexity Labs', url: 'https://labs.perplexity.ai', category: 'text-ai', desc: 'Experimental AI playground from Perplexity — test latest models' },

    // 코드 AI
    { name: 'Codeium Live', url: 'https://codeium.com/playground', category: 'code-ai', desc: 'Free AI code completion — try the playground in your browser' },
    { name: 'Regex101', url: 'https://regex101.com', category: 'code-ai', desc: 'Build, test, and debug regex with real-time explanation' },
    { name: 'Replit', url: 'https://replit.com', category: 'code-ai', desc: 'Browser-based IDE with AI coding assistant — build and deploy instantly' },
    { name: 'v0 by Vercel', url: 'https://v0.dev', category: 'code-ai', desc: 'Generate UI components from text descriptions using AI' },
    { name: 'bolt.new', url: 'https://bolt.new', category: 'code-ai', desc: 'Prompt, run, edit, and deploy full-stack web apps in browser' },
    { name: 'Cursor Editor', url: 'https://cursor.sh', category: 'code-ai', desc: 'AI-first code editor built on VSCode — pair program with AI' },

    // 음성 AI
    { name: 'Bark TTS', url: 'https://huggingface.co/spaces/suno/bark', category: 'voice-ai', desc: 'Text-to-audio model — generate speech, music, and sound effects' },
    { name: 'Whisper Web', url: 'https://huggingface.co/spaces/Xenova/whisper-web', category: 'voice-ai', desc: 'OpenAI Whisper running in your browser — transcribe audio to text' },
    { name: 'ElevenLabs', url: 'https://elevenlabs.io', category: 'voice-ai', desc: 'AI voice generator — create natural-sounding speech and voice cloning' },
    { name: 'Suno AI', url: 'https://suno.com', category: 'voice-ai', desc: 'Create songs with AI — generate music from text prompts' },

    // 비디오 AI
    { name: 'Runway Gen-2', url: 'https://runwayml.com', category: 'video-ai', desc: 'Generate and edit videos with AI — text/image to video' },
    { name: 'Pika Labs', url: 'https://pika.art', category: 'video-ai', desc: 'Create and edit videos with AI in seconds' },
    { name: 'Luma Dream Machine', url: 'https://lumalabs.ai/dream-machine', category: 'video-ai', desc: 'Create high-quality video from text and images with AI' },
    { name: 'HeyGen', url: 'https://www.heygen.com', category: 'video-ai', desc: 'AI video generation platform for creating talking avatar videos' },
    { name: 'Synthesia', url: 'https://www.synthesia.io', category: 'video-ai', desc: 'Create AI videos from text — 150+ AI avatars and 120+ languages' },

    // 유틸리티
    { name: 'Remove.bg', url: 'https://www.remove.bg', category: 'utility', desc: 'Remove image backgrounds automatically with AI — free and instant' },
    { name: 'Cleanup.pictures', url: 'https://cleanup.pictures', category: 'utility', desc: 'Remove unwanted objects from photos with AI inpainting' },
    { name: 'Upscayl', url: 'https://www.upscayl.org', category: 'utility', desc: 'Free open-source AI image upscaler — enhance resolution' },
    { name: 'Unscreen', url: 'https://www.unscreen.com', category: 'utility', desc: 'Remove video backgrounds automatically — no green screen needed' },
    { name: 'Gamma', url: 'https://gamma.app', category: 'utility', desc: 'Create beautiful presentations, documents, and webpages with AI' },
    { name: 'Napkin AI', url: 'https://www.napkin.ai', category: 'utility', desc: 'Turn text into visual diagrams and infographics with AI' },
    { name: 'tl;dv', url: 'https://tldv.io', category: 'utility', desc: 'AI meeting recorder — transcribe, summarize, and search meetings' },
    { name: 'Notion AI', url: 'https://www.notion.so/product/ai', category: 'utility', desc: 'AI-powered writing, summarizing, and brainstorming inside Notion' },

    // 기타
    { name: 'Replicate', url: 'https://replicate.com/explore', category: 'other', desc: 'Run open-source AI models in the cloud — explore thousands of demos' },
    { name: 'Civitai', url: 'https://civitai.com', category: 'other', desc: 'Community platform for sharing and discovering AI art models' },
    { name: 'Hugging Face Spaces', url: 'https://huggingface.co/spaces', category: 'other', desc: 'Discover and try thousands of AI demos built by the community' },
  ];
}

async function main() {
  console.log('=== DemoVault Multi-Source Seed v3 ===\n');

  const existing = await getExistingUrls();
  console.log(`[기존] ${existing.size}개\n`);

  // 소스 1: HF Spaces
  console.log('[1] Hugging Face Spaces 수집...');
  const hfCandidates = await collectHFSpaces();
  console.log(`  → ${hfCandidates.length}개 후보\n`);

  // 소스 2: 큐레이션
  console.log('[2] 큐레이션 데모 로드...');
  const curated = getCuratedDemos().map(d => ({ ...d, source: 'curated', likes: 0 }));
  console.log(`  → ${curated.length}개\n`);

  // 합치기 + 중복 제거
  const urlSet = new Set();
  const allCandidates = [];

  // 큐레이션 우선 (더 다양한 소스)
  for (const c of [...curated, ...hfCandidates]) {
    if (existing.has(c.url) || urlSet.has(c.url)) continue;
    urlSet.add(c.url);
    allCandidates.push(c);
  }

  // 카테고리 균형 제한
  const catCount = {};
  const balanced = allCandidates.filter(c => {
    catCount[c.category] = (catCount[c.category] || 0) + 1;
    return catCount[c.category] <= 12;
  });

  console.log(`[총] ${balanced.length}개 후보 (중복/기존 제거 후)`);
  const catSummary = {};
  balanced.forEach(c => { catSummary[c.category] = (catSummary[c.category] || 0) + 1; });
  Object.entries(catSummary).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}개`));
  console.log();

  // 등록
  let registered = 0, skipped = 0, failed = 0;
  const TARGET = 50;

  for (const c of balanced) {
    if (registered >= TARGET) break;

    process.stdout.write(`[${registered+1}/${TARGET}] ${c.name.slice(0,38).padEnd(40)} `);

    const alive = await checkAlive(c.url);
    if (!alive) {
      console.log('⚠️  비활성');
      skipped++;
      continue;
    }

    try {
      const result = await registerDemo({ name: c.name, url: c.url, category: c.category, desc: c.desc });
      if (result.id) {
        console.log(`✅ ${c.category}`);
        registered++;
      } else {
        console.log(`❌ ${result.error || '?'}`);
        failed++;
      }
    } catch (e) {
      console.log(`❌ ${e.message}`);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  console.log('\n=== 최종 결과 ===');
  console.log(`등록: ${registered}개`);
  console.log(`스킵: ${skipped}개 / 실패: ${failed}개`);
  console.log(`총 데모: ${existing.size + registered}개`);
}

main().catch(console.error);
