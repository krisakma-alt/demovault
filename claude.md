# DemoVault — 프로젝트 가이드

## 서비스 개요
인디 개발자가 AI 도구를 무료로 등록·홍보하는 갤러리. 모든 URL은 4종 보안 엔진으로 자동 검사 후 게시.
- 사이트: https://demovault.org
- 상태: 런칭 완료 (Product Hunt, Reddit, X)

## 기술 스택
| 역할 | 기술 |
|------|------|
| API 백엔드 | Cloudflare Workers (`worker/index.js`) |
| 데이터 저장 | Cloudflare KV (namespace: `DEMOS`) |
| 프론트엔드 | Cloudflare Pages (`frontend/`) — 순수 HTML/CSS/JS |
| 보안 스캔 | Google Web Risk, Safe Browsing, URLScan, VirusTotal (`worker/scan.js`) |
| 결제 | LemonSqueezy (현재 비활성) |
| 도메인 | Cloudflare Pages Custom Domain |
| 어드민 인증 | Cloudflare Access |

## 파일 구조
```
demovault/
├── worker/
│   ├── index.js          # 메인 Worker 라우터 (모든 API 엔드포인트)
│   ├── scan.js           # 4종 보안 스캔 로직
│   └── wrangler.toml     # Worker 설정
├── frontend/
│   ├── index.html        # 메인 갤러리 페이지
│   ├── gallery.js        # 갤러리 렌더링 + 검색 + 정렬 + 피드백
│   ├── i18n.js           # 한/영 번역 (data-i18n, data-i18n-html, data-i18n-placeholder)
│   ├── style.css         # 전체 스타일
│   ├── demo.html         # 데모 상세 페이지
│   ├── demo.js           # 상세 페이지 로직 + 리뷰 시스템
│   ├── submit.html       # 데모 등록 폼
│   ├── submit.js         # 등록 폼 제출
│   ├── request.html      # 피처 리퀘스트 폼
│   ├── request.js        # 리퀘스트 제출
│   ├── admin.html        # 어드민 대시보드
│   ├── admin.js          # 어드민 로직 (통계 + CRUD + 리퀘스트 관리)
│   └── functions/
│       ├── submit.js     # Cloudflare Access 인증 라우트
│       ├── admin.js      # COOP 헤더
│       └── demo/[[id]].js # /demo/:id → demo.html 라우팅
├── scripts/
│   ├── seed-demos.js     # HF Spaces 자동 수집 스크립트
│   └── seed-indie.js     # 인디 도구 시드 스크립트
└── launch/
    ├── README.md         # 런칭 자료 (소개, 플랫폼 리스트)
    └── posts.md          # 채널별 홍보 글
```

## KV 데이터 구조
- 데모: `{UUID}` → `{ id, name, url, desc, category, scanResult, createdAt, clickCount, feedback, reviewCount, tier }`
- 리뷰: `reviews_{demoId}` → `[{ rid, author, text, createdAt }]`
- 피처 리퀘스트: `req_{timestamp}_{random}` → `{ id, type, message, email, name, status, createdAt }`
- 레이트리밋: `rl_{ipHash}` → `'1'` (TTL 300초)

## API 엔드포인트
| Route | Method | 설명 |
|-------|--------|------|
| /api/submit | POST | 데모 등록 (자동 스캔) |
| /api/demos | GET | 데모 목록 (reviewCount DESC 정렬) |
| /api/demo/:id | GET | 단일 데모 조회 |
| /api/click | POST | 클릭 카운트 + 스캔결과 반환 |
| /api/feedback | POST | 이모지 피드백 (tried_it/useful/needs_work) |
| /api/captcha | GET | 수학 CAPTCHA 생성 |
| /api/reviews | GET/POST | 리뷰 조회/등록 |
| /api/rescan | GET | 재스캔 |
| /api/request | POST | 피처 리퀘스트 제출 |
| /api/ls/checkout | POST | LemonSqueezy 결제 세션 |
| /api/ls/webhook | POST | 결제 웹훅 |
| /badge/:id.svg | GET | 임베드 뱃지 SVG |
| /sitemap.xml | GET | SEO 사이트맵 |
| /api/admin/* | GET/DELETE/PATCH | 어드민 CRUD |

## 배포
```bash
# Worker 배포
cd worker && npx wrangler deploy

# Frontend 배포
cd frontend && npx wrangler pages deploy . --project-name demovault --commit-dirty=true
```

## Worker Secrets (wrangler secret put)
- GOOGLE_API_KEY
- URLSCAN_API_KEY
- VIRUSTOTAL_API_KEY
- LEMONSQUEEZY_API_KEY
- LEMONSQUEEZY_WEBHOOK_SECRET

## 개발 규칙
- 모든 답변과 주석은 **한국어**로 작성
- 코드는 간결하게, 함수 하나는 한 가지 역할만
- 변수명/함수명은 영어, 뜻 명확하게
- 기존 파일 수정 전 반드시 읽기 먼저
- 큰 기능은 플랜 먼저 → 승인 후 코딩
- 물어보지 않은 기능 임의 추가 금지
- 환경변수(API 키)는 코드에 직접 작성 금지
- 캐시 버스팅: CSS/JS 변경 시 ?v= 파라미터 업데이트 필수
- i18n: 새 텍스트 추가 시 en/kr 둘 다 반드시 추가
