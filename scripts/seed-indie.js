#!/usr/bin/env node
// DemoVault — 인디 AI 도구 시드 스크립트
// TAAFT + Product Hunt + 직접 큐레이션한 실제 인디 개발자 AI 도구

const API_BASE = 'https://demovault-worker.krisakma.workers.dev';
const DELAY_MS = 6000;

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

// 인디 개발자 AI 도구 큐레이션 리스트
// 기준: 자체 도메인, 소규모 팀/1인 개발, 실제 작동, 무료 또는 프리미엄
const INDIE_TOOLS = [
  // === 이미지 생성/편집 ===
  { name: 'Pixel Dojo', url: 'https://pixeldojo.ai/', category: 'image-gen', desc: 'AI playground for image and video creation — generate, remix, upscale with multiple models' },
  { name: 'Clipdrop', url: 'https://clipdrop.co/', category: 'image-gen', desc: 'AI-powered image editing suite — remove backgrounds, upscale, relight, and generate images' },
  { name: 'Leonardo.Ai', url: 'https://leonardo.ai/', category: 'image-gen', desc: 'AI image generator with fine-tuned models — create production-quality art and assets' },
  { name: 'Ideogram', url: 'https://ideogram.ai/', category: 'image-gen', desc: 'AI image generator that excels at text rendering in images — free tier available' },
  { name: 'Krea AI', url: 'https://www.krea.ai/', category: 'image-gen', desc: 'Real-time AI image generation and enhancement — draw and watch AI interpret instantly' },
  { name: 'Magnific AI', url: 'https://magnific.ai/', category: 'image-gen', desc: 'AI image upscaler and enhancer — add incredible detail to any image' },
  { name: 'PhotoAI', url: 'https://photoai.com/', category: 'image-gen', desc: 'Generate photorealistic AI photos of yourself — train a model on your selfies' },

  // === 텍스트/챗봇 AI ===
  { name: 'Poe', url: 'https://poe.com/', category: 'text-ai', desc: 'Chat with multiple AI models in one place — GPT-4, Claude, Llama, and custom bots' },
  { name: 'You.com', url: 'https://you.com/', category: 'text-ai', desc: 'AI search engine with chat — get answers with cited sources, code, and images' },
  { name: 'Devv', url: 'https://devv.ai/en', category: 'text-ai', desc: 'AI search engine built specifically for developers — code-aware answers' },
  { name: 'Typing Mind', url: 'https://www.typingmind.com/', category: 'text-ai', desc: 'Better UI for ChatGPT — use your own API key, prompt library, plugins' },
  { name: 'ChatPDF', url: 'https://www.chatpdf.com/', category: 'text-ai', desc: 'Chat with any PDF document — ask questions and get instant answers from your files' },
  { name: 'Liner', url: 'https://getliner.com/', category: 'text-ai', desc: 'AI copilot for research — highlight, summarize, and chat with web pages and PDFs' },
  { name: 'Elicit', url: 'https://elicit.com/', category: 'text-ai', desc: 'AI research assistant — automate literature review, find papers, extract data' },

  // === 코드 AI ===
  { name: 'Meku', url: 'https://meku.dev/', category: 'code-ai', desc: 'AI web app and site builder for developers — generate and deploy full-stack apps from prompts' },
  { name: 'AppDeploy', url: 'https://appdeploy.ai/', category: 'code-ai', desc: 'Deploy real apps directly from ChatGPT or Claude conversations — one click to production' },
  { name: 'Lovable', url: 'https://lovable.dev/', category: 'code-ai', desc: 'AI app builder for startups — describe your idea and get a working full-stack app' },
  { name: 'Cline', url: 'https://cline.bot/', category: 'code-ai', desc: 'Autonomous AI coding agent in VS Code — reads, writes, and runs code for you' },
  { name: 'Windsurf', url: 'https://windsurf.com/', category: 'code-ai', desc: 'AI-powered IDE — code flows between you and AI with deep codebase understanding' },
  { name: 'Ticket Artisan', url: 'https://ticketartisan.com/', category: 'code-ai', desc: 'Turn your designs into development tickets — AI converts mockups to structured tasks' },
  { name: 'CodeRabbit', url: 'https://coderabbit.ai/', category: 'code-ai', desc: 'AI-powered code review — catches bugs, security issues, and suggests improvements on PRs' },

  // === 음성/음악 AI ===
  { name: 'Musicful', url: 'https://www.musicful.ai/', category: 'voice-ai', desc: 'Turn any vocals into full songs with AI — upload, set a vibe, and generate music' },
  { name: 'Udio', url: 'https://www.udio.com/', category: 'voice-ai', desc: 'AI music creation — generate songs from text descriptions with realistic vocals' },
  { name: 'Speechify', url: 'https://speechify.com/', category: 'voice-ai', desc: 'Text to speech reader — listen to articles, PDFs, and docs with natural AI voices' },
  { name: 'Podcastle', url: 'https://podcastle.ai/', category: 'voice-ai', desc: 'AI-powered podcast studio — record, edit, and enhance audio with one click' },
  { name: 'Descript', url: 'https://www.descript.com/', category: 'voice-ai', desc: 'Edit audio/video by editing text — AI transcription, filler word removal, voice cloning' },

  // === 비디오 AI ===
  { name: 'CapCut', url: 'https://www.capcut.com/', category: 'video-ai', desc: 'Free AI video editor — auto-captions, background removal, effects, and templates' },
  { name: 'OpusClip', url: 'https://www.opus.pro/', category: 'video-ai', desc: 'AI video repurposing — turn long videos into viral short clips automatically' },
  { name: 'D-ID', url: 'https://www.d-id.com/', category: 'video-ai', desc: 'Create AI-generated videos with talking avatars from text or audio' },
  { name: 'Lumen5', url: 'https://lumen5.com/', category: 'video-ai', desc: 'Turn blog posts into videos with AI — automatic scene generation and stock footage' },
  { name: 'Fliki', url: 'https://fliki.ai/', category: 'video-ai', desc: 'Text to video with AI voices — create videos from scripts with lifelike narration' },
  { name: 'Invideo AI', url: 'https://invideo.io/', category: 'video-ai', desc: 'Generate videos from text prompts — AI creates script, scenes, voiceover, and music' },

  // === 유틸리티 ===
  { name: 'Guidejar', url: 'https://www.guidejar.com/', category: 'utility', desc: 'Create interactive how-to guides and product tours — AI-powered step-by-step documentation' },
  { name: 'FaceShape Detector', url: 'https://www.faceshapedetector.net/', category: 'utility', desc: 'AI face shape analysis — get hairstyle and glasses recommendations based on your photo' },
  { name: 'BigIdeasDB', url: 'https://www.bigideasdb.com/', category: 'utility', desc: 'Find product ideas from Reddit pain points, G2 reviews, and app store complaints with AI' },
  { name: 'Tally', url: 'https://tally.so/', category: 'utility', desc: 'Free form builder with AI — create beautiful forms, surveys, and quizzes in seconds' },
  { name: 'Taskade', url: 'https://www.taskade.com/', category: 'utility', desc: 'AI-powered productivity workspace — tasks, notes, mind maps, and chat with AI agents' },
  { name: 'Mem', url: 'https://mem.ai/', category: 'utility', desc: 'AI-powered note-taking — self-organizing notes that surface relevant info when you need it' },
  { name: 'Krisp', url: 'https://krisp.ai/', category: 'utility', desc: 'AI noise cancellation for calls — removes background noise, records, and transcribes' },
  { name: 'FantasyGen', url: 'https://fantasygen.net/', category: 'utility', desc: 'AI generator for fantasy maps, character portraits, concept art, and lore names' },

  // === 기타/마케팅 ===
  { name: 'The AI CMO', url: 'https://theaicmo.com/', category: 'other', desc: 'AI marketing system that learns your brand — automates content, SEO, and campaigns' },
  { name: 'Astrocade', url: 'https://www.astrocade.com/', category: 'other', desc: 'Create games with AI in minutes — describe your game and play it instantly' },
  { name: 'MonoDesk', url: 'https://www.monodesk.com/', category: 'other', desc: 'Creative project workspace for freelancers — AI assistant for tasks and client management' },
  { name: 'Copy.ai', url: 'https://www.copy.ai/', category: 'other', desc: 'AI copywriting tool — generate marketing copy, blog posts, and social media content' },
  { name: 'Jasper', url: 'https://www.jasper.ai/', category: 'other', desc: 'AI content platform for marketing teams — create on-brand content at scale' },
  { name: 'Writesonic', url: 'https://writesonic.com/', category: 'other', desc: 'AI writer and SEO optimizer — create blog posts, ads, and product descriptions' },
];

async function main() {
  console.log('=== DemoVault 인디 AI 도구 시드 ===\n');

  const existing = await getExistingUrls();
  console.log(`[기존] ${existing.size}개\n`);

  // 중복 제거
  const candidates = INDIE_TOOLS.filter(t => !existing.has(t.url));
  console.log(`[후보] ${candidates.length}개 (중복 제거 후)\n`);

  const catCount = {};
  candidates.forEach(c => { catCount[c.category] = (catCount[c.category] || 0) + 1; });
  Object.entries(catCount).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}개`));
  console.log();

  let registered = 0, skipped = 0, failed = 0;

  for (const c of candidates) {
    process.stdout.write(`[${registered+1}] ${c.name.slice(0,35).padEnd(37)} `);

    const alive = await checkAlive(c.url);
    if (!alive) {
      console.log('⚠️  비활성');
      skipped++;
      continue;
    }

    try {
      const result = await registerDemo(c);
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

  console.log('\n=== 결과 ===');
  console.log(`등록: ${registered}개`);
  console.log(`스킵: ${skipped}개 / 실패: ${failed}개`);
  console.log(`총 데모: ${existing.size + registered}개`);
}

main().catch(console.error);
