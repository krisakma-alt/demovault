# DemoVault

> AI Demo Gallery with Automated Safety Scanning

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Cloudflare KV](https://img.shields.io/badge/Cloudflare-KV-F38020?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/kv/)
[![Vitest](https://img.shields.io/badge/Tested_with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

DemoVault is a curated gallery where developers submit AI demo URLs, which are automatically scanned by **4 security engines** before going live. Visitors can discover demos with full transparency on safety status.

**Live:** [demovault.youngri.org](https://demovault.youngri.org)

---

## How It Works

```
1. Register URL        2. Auto Safety Scan       3. Published to Gallery
 ┌─────────────┐       ┌─────────────────┐       ┌─────────────────┐
 │ Name         │       │ Google Web Risk  │       │ ✓ Safe Badge    │
 │ Demo URL     │  ──>  │ Safe Browsing    │  ──>  │ Gallery Card    │
 │ Category     │       │ URLScan.io       │       │ Reviews & Stats │
 │ Description  │       │ VirusTotal       │       │ Visit Demo →    │
 └─────────────┘       └─────────────────┘       └─────────────────┘
```

## Architecture

```
┌──────────────┐         ┌──────────────────┐
│   Browser    │  ──>    │ Cloudflare Pages  │  (Frontend: HTML/CSS/JS)
└──────────────┘         └────────┬─────────┘
                                  │
                         ┌────────▼─────────┐
                         │ Cloudflare Worker │  (Backend API)
                         └────────┬─────────┘
                                  │
               ┌──────────────────┼──────────────────┐
               │                  │                   │
      ┌────────▼──────┐  ┌───────▼────────┐  ┌──────▼──────────┐
      │ Cloudflare KV  │  │ Security APIs  │  │ LemonSqueezy    │
      │ (Data Store)   │  │ (4 Engines)    │  │ (Payments)      │
      └───────────────┘  └────────────────┘  └─────────────────┘
```

## Features

- **4-Engine Safety Scanning** — Google Web Risk, Safe Browsing, URLScan.io, VirusTotal
- **Safety Gate Modal** — Visitors see scan results before clicking through
- **Gallery with Search & Filters** — By category (Image Gen, Text AI, Code AI, etc.)
- **Review System** — Math CAPTCHA + IP rate limiting
- **Emoji Feedback** — Useful / Tried it / Needs work
- **Embed Badge** — SVG safety badge for projects (`/badge/:id.svg`)
- **i18n** — Korean / English toggle
- **Admin Dashboard** — CRUD + statistics (Cloudflare Access)
- **Feature Requests** — Users can submit bugs and ideas
- **Auto Sitemap** — SEO-optimized XML sitemap

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML / CSS / Vanilla JS |
| Backend API | Cloudflare Workers |
| Database | Cloudflare KV |
| Hosting | Cloudflare Pages |
| Security | Google Web Risk, Safe Browsing, URLScan, VirusTotal |
| Auth | Cloudflare Access (admin) |
| Testing | Vitest (46 tests) |
| CI/CD | GitHub Actions |

## Quick Start

### Prerequisites
- Node.js 20+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- Cloudflare account

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/your-username/demovault.git
cd demovault

# 2. Install worker dependencies
cd worker && npm install

# 3. Set up secrets
wrangler secret put GOOGLE_API_KEY
wrangler secret put URLSCAN_API_KEY
wrangler secret put VIRUSTOTAL_API_KEY

# 4. Create KV namespace
wrangler kv:namespace create DEMOS
# Update wrangler.toml with the returned ID

# 5. Run locally
npm run dev          # Worker on :8787
```

### Environment Variables

| Secret | Purpose |
|--------|---------|
| `GOOGLE_API_KEY` | Google Web Risk + Safe Browsing |
| `URLSCAN_API_KEY` | URLScan.io submissions |
| `VIRUSTOTAL_API_KEY` | VirusTotal lookups (optional) |
| `LEMONSQUEEZY_API_KEY` | Payment sessions (optional) |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Webhook verification (optional) |

### Testing

```bash
cd worker
npm test          # Run all tests
npm run test:watch  # Watch mode
```

### Deployment

```bash
# Deploy Worker (API)
cd worker && npx wrangler deploy

# Deploy Frontend (Pages)
cd frontend && npx wrangler pages deploy . --project-name demovault --commit-dirty=true
```

## Project Structure

```
demovault/
├── worker/
│   ├── index.js          # API router (19 endpoints)
│   ├── scan.js           # 4-engine security scanner
│   ├── tests/            # Vitest test suite (46 tests)
│   └── wrangler.toml     # Worker config
├── frontend/
│   ├── index.html        # Gallery page
│   ├── gallery.js        # Gallery rendering + search + sort
│   ├── demo.html/js      # Demo detail + reviews
│   ├── submit.html/js    # Demo registration
│   ├── admin.html/js     # Admin dashboard
│   ├── i18n.js           # KR/EN translations
│   └── style.css         # Dark theme styles
├── .github/workflows/
│   └── ci.yml            # Test + deploy pipeline
└── scripts/
    └── seed-demos.js     # Auto-harvest from HuggingFace
```

## API Endpoints

| Route | Method | Description |
|-------|--------|-------------|
| `/api/submit` | POST | Register demo (auto-scan) |
| `/api/demos` | GET | List all demos |
| `/api/demo/:id` | GET | Get demo details |
| `/api/click` | POST | Track click + return scan |
| `/api/feedback` | POST | Emoji feedback |
| `/api/reviews` | GET/POST | Reviews (CAPTCHA required) |
| `/api/captcha` | GET | Math CAPTCHA generation |
| `/api/request` | POST | Feature request / bug report |
| `/api/admin/*` | Various | Admin CRUD operations |
| `/badge/:id.svg` | GET | Embed safety badge |
| `/sitemap.xml` | GET | Auto-generated sitemap |

## License

MIT
