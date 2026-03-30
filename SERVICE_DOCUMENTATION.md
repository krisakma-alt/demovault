# DemoVault 서비스 설명서

> **AI 데모 갤러리 — 안전 검증 기반 AI 프로젝트 디스커버리 플랫폼**
>
> 운영 URL: https://demovault.org

---

## 목차

1. [서비스 개요](#1-서비스-개요)
2. [기술 스택](#2-기술-스택)
3. [프로젝트 구조](#3-프로젝트-구조)
4. [핵심 기능 상세](#4-핵심-기능-상세)
5. [보안 스캔 파이프라인](#5-보안-스캔-파이프라인)
6. [API 명세](#6-api-명세)
7. [데이터베이스 스키마](#7-데이터베이스-스키마-cloudflare-kv)
8. [프론트엔드 페이지 구성](#8-프론트엔드-페이지-구성)
9. [다국어 지원 (i18n)](#9-다국어-지원-i18n)
10. [배포 및 인프라](#10-배포-및-인프라)
11. [관리자 시스템](#11-관리자-시스템)
12. [외부 연동 서비스](#12-외부-연동-서비스)
13. [개발 규칙 및 컨벤션](#13-개발-규칙-및-컨벤션)

---

## 1. 서비스 개요

### 1.1 서비스 정의

DemoVault는 AI 데모 프로젝트를 등록, 검증, 공유하는 플랫폼이다. 개발자가 자신의 AI 데모 URL을 등록하면, 4개의 보안 엔진이 자동으로 안전성을 검사한 뒤 갤러리에 게시한다. 방문자는 안전 검증 결과를 확인한 후 데모를 탐색할 수 있다.

### 1.2 핵심 가치

| 가치 | 설명 |
|------|------|
| **안전성** | Google Web Risk, Safe Browsing, URLScan, VirusTotal 4중 보안 검사 |
| **접근성** | 회원가입 없이 URL만으로 데모 등록 가능 |
| **디스커버리** | 카테고리 필터, 검색, 정렬을 통한 AI 데모 탐색 |
| **신뢰성** | 방문 전 스캔 결과 확인, 리뷰 및 피드백 시스템 |

### 1.3 사용자 흐름

```
[개발자]
  1. 데모 URL 등록 (이름, URL, 카테고리, 설명)
  2. 4개 보안 엔진 자동 스캔 (병렬 실행)
  3. 스캔 통과 시 갤러리에 자동 게시

[방문자]
  1. 갤러리에서 카테고리/검색/정렬로 데모 탐색
  2. 카드에서 안전 배지(✓ Safe / ✗ Unsafe / ⏳ Pending) 확인
  3. "Visit Demo" 클릭 → Safety Gate 모달에서 스캔 결과 재확인
  4. 안전한 경우 새 탭에서 데모 방문
  5. 리뷰 작성 및 피드백(👍 유용해요, 🧪 써봤어요, 🔧 개선 필요) 제출
```

---

## 2. 기술 스택

| 계층 | 기술 | 용도 |
|------|------|------|
| **프론트엔드** | HTML / CSS / Vanilla JS | SPA 없이 순수 웹 기술로 구성 |
| **백엔드** | Cloudflare Workers | Serverless API (Edge Runtime) |
| **데이터베이스** | Cloudflare KV | Key-Value 저장소 |
| **호스팅** | Cloudflare Pages | 프론트엔드 정적 호스팅 + Functions |
| **보안 검사** | Google Web Risk, Safe Browsing, URLScan.io, VirusTotal | URL 안전성 4중 검증 |
| **결제** | LemonSqueezy | Pro 티어 결제 (현재 비활성) |
| **인증** | Cloudflare Access | 관리자 대시보드 접근 제어 |
| **DNS** | Cloudflare | demovault.org 도메인 관리 |

---

## 3. 프로젝트 구조

```
demovault/
├── worker/                          # 백엔드 API (Cloudflare Worker)
│   ├── index.js                     # 메인 라우터 — 모든 API 엔드포인트
│   ├── scan.js                      # 4-엔진 보안 스캔 로직
│   ├── wrangler.toml                # Worker 배포 설정
│   └── package.json
│
├── frontend/                        # 프론트엔드 (Cloudflare Pages)
│   ├── index.html                   # 메인 갤러리 페이지
│   ├── gallery.js                   # 갤러리 렌더링, 검색, 정렬, 피드백
│   ├── style.css                    # 다크 테마 글로벌 스타일
│   ├── i18n.js                      # 한국어/영어 번역 데이터
│   ├── demo.html / demo.js          # 데모 상세 페이지 + 리뷰 시스템
│   ├── submit.html / submit.js      # 데모 등록 폼
│   ├── request.html / request.js    # 기능 요청 / 버그 리포트
│   ├── admin.html / admin.js        # 관리자 대시보드
│   ├── compare.html / compare.js    # Repo vs Repo 비교 도구
│   ├── privacy.html                 # 개인정보처리방침
│   ├── terms.html                   # 이용약관
│   ├── _headers                     # 커스텀 HTTP 헤더 (COOP 등)
│   └── functions/                   # Cloudflare Pages Functions
│       ├── demo/[[id]].js           # /demo/:id 동적 라우팅
│       ├── submit.js                # Cloudflare Access 인증 게이트
│       ├── admin.js                 # 관리자 COOP 헤더 미들웨어
│       └── api/github-compare.js    # GitHub API 프록시
│
├── scripts/                         # 시드 및 유틸리티 스크립트
│   ├── seed-demos.js                # HuggingFace Spaces/GitHub 자동 수확
│   └── seed-indie.js                # 인디 도구 시드 데이터
│
└── launch/                          # 런칭 마케팅 자료
    ├── README.md
    └── posts.md
```

---

## 4. 핵심 기능 상세

### 4.1 갤러리 (메인 페이지)

메인 갤러리는 등록된 모든 AI 데모를 카드 그리드로 표시한다.

**구성 섹션:**
- **Hero 영역**: 서비스 소개 + "내 데모 등록하기" CTA 버튼
- **How it Works**: 3단계 시각적 플로우 (URL 등록 → 안전 스캔 → 갤러리 게시)
- **Free Tools**: 외부 무료 도구 4종 링크 (Repo vs Repo, Repo Radar, Deploy Checker, AIreply)
- **Trending**: 클릭수 기반 인기 데모
- **Just Launched**: 최신 등록 데모
- **메인 갤러리 그리드**: 전체 데모 목록

**검색 및 필터링:**

| 기능 | 동작 |
|------|------|
| **실시간 검색** | 데모 이름 + 설명 기반 전문 검색, 300ms 디바운스 |
| **정렬** | Most Reviewed (기본) / Most Popular (클릭수) / Newest |
| **카테고리 필터** | All / Image Gen / Text AI / Code AI / Voice AI / Video AI / Utility / Other |

**갤러리 그리드 반응형 레이아웃:**

| 화면 크기 | 열 수 |
|-----------|-------|
| 데스크톱 (1200px 이상) | 5열 |
| 중간 (960~1200px) | 4열 |
| 태블릿 (640~960px) | 3열 |
| 모바일 (640px 이하) | 1열 |

**카드 표시 정보:**
- 데모 이름 + URL
- 카테고리 태그
- 설명 (최대 3줄, 초과 시 말줄임)
- 안전 배지: `✓ Safe` / `✗ Unsafe` / `⏳ Pending`
- 통계: 💬 리뷰 수, 👁 클릭 수
- "Visit Demo →" 버튼

### 4.2 Safety Gate 모달

방문자가 "Visit Demo" 클릭 시 즉시 이동하지 않고 Safety Gate 모달이 먼저 표시된다.

```
┌─────────────────────────────────────┐
│  🔒 Safety Check                    │
│                                     │
│  URL: https://example.com           │
│                                     │
│  Google Web Risk:    ✓ Safe         │
│  Safe Browsing:      ✓ Safe         │
│  URLScan:            ✓ Safe         │
│  VirusTotal:         ⏳ Pending     │
│                                     │
│  Overall: ✓ Safe                    │
│                                     │
│  [ Visit → ]   [ Cancel ]          │
└─────────────────────────────────────┘
```

- **Safe / Pending**: "Visit →" 버튼 활성화 → 새 탭에서 데모 열림
- **Unsafe**: 경고 메시지 표시, 방문 차단
- 클릭 카운터 실시간 업데이트

### 4.3 데모 상세 페이지 (`/demo/:id`)

개별 데모의 전체 정보를 보여주는 상세 페이지이다.

**표시 정보:**
- 데모 이름, 카테고리, 등록일
- 전체 설명
- 4개 엔진 스캔 결과 상세
- 통계: 총 클릭수, 👍 유용해요, 🧪 써봤어요, 🔧 개선 필요
- 리뷰 목록
- 임베드 배지 (SVG + 복사 코드)

**리뷰 시스템:**

| 항목 | 상세 |
|------|------|
| CAPTCHA | 수학 문제 기반, HMAC 서명 토큰, 5분 TTL |
| 작성자 | 선택 입력, 최대 50자 |
| 내용 | 최대 200자, 실시간 글자 수 카운터 |
| 속도 제한 | IP 기반, 데모당 5분 간격 |
| 최대 수 | 데모당 200개 (FIFO — 초과 시 오래된 리뷰 삭제) |
| 정렬 | 최신순 |

**임베드 배지:**
- Shields.io 스타일 SVG 배지 자동 생성
- 안전 상태 표시 (Safe / Unsafe / Pending)
- Markdown / HTML 스니펫 제공
- 원클릭 복사 버튼

### 4.4 데모 등록 (`/submit`)

**폼 필드:**

| 필드 | 필수 | 제한 |
|------|------|------|
| Project Name | ✅ | - |
| Demo URL | ✅ | URL 형식 검증 |
| Category | ✅ | 7개 중 선택 (Image Gen / Text AI / Code AI / Voice AI / Video AI / Utility / Other) |
| Description | ❌ | - |

**등록 흐름:**
1. 폼 작성 → POST `/api/submit`
2. Worker가 4개 보안 엔진으로 URL 병렬 스캔
3. 스캔 결과 + 데모 정보를 KV에 저장
4. 성공 시 1.5초 후 갤러리로 리다이렉트
5. 실패 시 에러 메시지 표시, 재시도 가능

### 4.5 피드백 시스템

데모별 3가지 이모지 반응을 지원한다.

| 반응 | 의미 |
|------|------|
| 👍 Useful | 유용한 데모 |
| 🧪 Tried it | 직접 사용해봄 |
| 🔧 Needs work | 개선이 필요함 |

- 클릭 즉시 POST `/api/feedback`로 카운트 증가
- 별도 인증/제한 없이 자유롭게 참여 가능

### 4.6 기능 요청 (`/request`)

사용자가 기능 제안, 버그 리포트, 기타 의견을 제출할 수 있다.

**폼 구성:**
- 유형 선택: Feature / Bug / Other (토글 버튼)
- 메시지: 10~1,000자, 실시간 카운터
- 이름: 선택, 최대 100자
- 이메일: 선택, 최대 200자

**저장:** KV에 `req_{timestamp}_{randomId}` 키로 저장
**상태 관리:** new → reviewing → planned → done / declined

---

## 5. 보안 스캔 파이프라인

### 5.1 스캔 엔진 상세

4개 보안 엔진이 `Promise.allSettled`로 병렬 실행된다.

#### Google Web Risk
- **검사 항목**: Malware, Social Engineering, Unwanted Software
- **API**: `webrisk.googleapis.com/v1/uris:search`
- **판정**: 위협 감지 시 `unsafe`, 없으면 `safe`

#### Google Safe Browsing
- **검사 항목**: Malware, Social Engineering
- **API**: `safebrowsing.googleapis.com/v4/threatMatches:find`
- **판정**: 매치 발견 시 `unsafe`, 없으면 `safe`

#### URLScan.io
- **동작**: URL 제출 → 5초 간격 폴링 (최대 30초)
- **판정**: `malicious` 판정 시 `unsafe`, 아니면 `safe`
- **타임아웃**: 30초 초과 시 `pending`

#### VirusTotal
- **동작**: 기존 분석 조회 또는 새 스캔 제출 → 5초 간격 폴링 (최대 20초)
- **판정**: (malicious + suspicious) ≥ 2 → `unsafe`
- **타임아웃**: 20초 초과 시 `pending`

### 5.2 종합 판정 로직

```
하나라도 unsafe → 전체 "unsafe"
모두 safe 또는 pending → 전체 "safe"
(pending은 통과로 처리)
```

### 5.3 스캔 결과 구조

```json
{
  "overall": "safe | unsafe | pending",
  "details": {
    "webRisk": "safe | unsafe | pending",
    "safeBrowsing": "safe | unsafe | pending",
    "urlscan": "safe | unsafe | pending",
    "virusTotal": "safe | unsafe | pending"
  }
}
```

---

## 6. API 명세

### 6.1 데모 관리

| 경로 | 메서드 | 설명 | 인증 |
|------|--------|------|------|
| `/api/submit` | POST | 새 데모 등록 (자동 4-엔진 스캔) | 없음 |
| `/api/demos` | GET | 전체 데모 목록 조회 (리뷰수 → 최신순 정렬) | 없음 |
| `/api/demo/:id` | GET | 단일 데모 상세 조회 | 없음 |
| `/api/click` | POST | 클릭 카운트 증가 + 캐시된 스캔 결과 반환 | 없음 |
| `/api/rescan` | GET | 데모 URL 재스캔 | 없음 |

### 6.2 리뷰 및 피드백

| 경로 | 메서드 | 설명 | 인증 |
|------|--------|------|------|
| `/api/reviews` | GET | 데모별 리뷰 목록 조회 | 없음 |
| `/api/reviews` | POST | 리뷰 작성 (CAPTCHA 필수) | CAPTCHA 토큰 |
| `/api/feedback` | POST | 이모지 피드백 제출 | 없음 |
| `/api/captcha` | GET | 수학 CAPTCHA 생성 (질문 + 토큰) | 없음 |

### 6.3 기능 요청

| 경로 | 메서드 | 설명 | 인증 |
|------|--------|------|------|
| `/api/request` | POST | 기능 요청 / 버그 리포트 제출 | 없음 |

### 6.4 관리자 전용

| 경로 | 메서드 | 설명 | 인증 |
|------|--------|------|------|
| `/api/admin/demos` | GET | 관리용 전체 데모 목록 | CF Access |
| `/api/admin/update` | PATCH | 데모 정보 수정 (이름, 카테고리, 설명) | CF Access |
| `/api/admin/delete` | DELETE | 데모 삭제 | CF Access |
| `/api/admin/requests` | GET | 기능 요청 목록 조회 | CF Access |
| `/api/admin/req-status` | PATCH | 기능 요청 상태 변경 | CF Access |

### 6.5 결제 (비활성)

| 경로 | 메서드 | 설명 | 인증 |
|------|--------|------|------|
| `/api/ls/checkout` | POST | LemonSqueezy 결제 세션 생성 | 없음 |
| `/api/ls/webhook` | POST | LemonSqueezy 주문 완료 웹훅 | 웹훅 시크릿 |

### 6.6 SEO 및 기타

| 경로 | 메서드 | 설명 |
|------|--------|------|
| `/sitemap.xml` | GET | XML 사이트맵 (전체 데모 + 정적 페이지) |
| `/badge/:id.svg` | GET | Shields.io 스타일 안전 배지 SVG |

---

## 7. 데이터베이스 스키마 (Cloudflare KV)

### 7.1 Demo 객체

**키**: UUID (예: `a1b2c3d4-e5f6-...`)

```javascript
{
  id: string,                    // UUID
  name: string,                  // 프로젝트 이름
  url: string,                   // 데모 URL
  desc: string,                  // 설명 (선택)
  category: string,              // image-gen | text-ai | code-ai | voice-ai
                                 // | video-ai | utility | other
  scanResult: {
    overall: "safe | unsafe | pending",
    details: {
      webRisk: "safe | unsafe | pending",
      safeBrowsing: "safe | unsafe | pending",
      urlscan: "safe | unsafe | pending",
      virusTotal: "safe | unsafe | pending"
    }
  },
  createdAt: number,             // Unix timestamp (ms)
  clickCount: number,            // 기본값 0
  reviewCount: number,           // 기본값 0
  feedback: {
    tried_it: number,            // 🧪 써봤어요
    useful: number,              // 👍 유용해요
    needs_work: number           // 🔧 개선 필요
  },
  tier: "free | pro | team",     // 기본값 없음 (free)
  tierActivatedAt: number        // Pro 활성화 시점
}
```

### 7.2 Reviews 배열

**키**: `reviews_{demoId}`

```javascript
[
  {
    rid: string,                 // "r_{timestamp}_{randomId}"
    author: string,              // 작성자명 (최대 50자)
    text: string,                // 리뷰 내용 (최대 200자)
    createdAt: number            // Unix timestamp
  }
]
// 데모당 최대 200개 (초과 시 FIFO 삭제)
```

### 7.3 Feature Request 객체

**키**: `req_{timestamp}_{randomId}`

```javascript
{
  id: string,
  type: "feature | bug | other",
  message: string,               // 10~1,000자
  email: string,                 // 선택, 최대 200자
  name: string,                  // 선택, 최대 100자
  status: "new | reviewing | planned | done | declined",
  createdAt: number
}
```

### 7.4 Rate Limiting

**키**: `rl_{ipHash}`
- 값: `"1"`
- TTL: 300초 (5분)
- 데모 + IP 조합으로 중복 리뷰 방지

---

## 8. 프론트엔드 페이지 구성

| 페이지 | 경로 | 파일 | 설명 |
|--------|------|------|------|
| 메인 갤러리 | `/` | `index.html` + `gallery.js` | 데모 목록, 검색, 필터, 정렬 |
| 데모 상세 | `/demo/:id` | `demo.html` + `demo.js` | 상세 정보, 리뷰, 임베드 배지 |
| 데모 등록 | `/submit` | `submit.html` + `submit.js` | 등록 폼 + 자동 스캔 |
| 기능 요청 | `/request` | `request.html` + `request.js` | 기능/버그/의견 제출 |
| 관리자 | `/admin` | `admin.html` + `admin.js` | CRUD + 통계 대시보드 |
| Repo 비교 | `/compare` | `compare.html` + `compare.js` | GitHub 저장소 비교 도구 |
| 개인정보처리방침 | `/privacy` | `privacy.html` | 개인정보 보호 정책 |
| 이용약관 | `/terms` | `terms.html` | 서비스 이용 약관 |

### 8.1 동적 라우팅 (Cloudflare Pages Functions)

```
/demo/:id  → functions/demo/[[id]].js  → demo.html (SSR 메타 태그 주입)
/submit    → functions/submit.js       → Cloudflare Access 인증 게이트
/admin     → functions/admin.js        → COOP 헤더 미들웨어
/api/*     → functions/api/*.js        → GitHub API 프록시 등
```

### 8.2 디자인 시스템

**테마**: 다크 테마 기반

**CSS 변수:**

| 변수 | 값 | 용도 |
|------|-----|------|
| `--bg-primary` | `#0a0e1a` | 기본 배경 |
| `--bg-secondary` | `#111827` | 보조 배경 |
| `--bg-card` | `#161b2e` | 카드 배경 |
| `--bg-card-hover` | `#1c2240` | 카드 호버 |
| `--accent` | `#00d4aa` | 주요 강조색 (민트 그린) |
| `--border` | 반투명 | 테두리 |
| `--max-width` | `1320px` | 최대 콘텐츠 너비 |
| `--radius` | - | 기본 라운딩 |

---

## 9. 다국어 지원 (i18n)

### 9.1 지원 언어

| 코드 | 언어 |
|------|------|
| `en` | English |
| `kr` | 한국어 |

### 9.2 구현 방식

`i18n.js`에 `TRANSLATIONS` 객체로 모든 번역 텍스트를 관리한다.

**HTML 속성 바인딩:**

| 속성 | 용도 | 예시 |
|------|------|------|
| `data-i18n="key"` | 텍스트 콘텐츠 교체 | `<p data-i18n="hero_title">` |
| `data-i18n-html="key"` | HTML 콘텐츠 교체 (`<br>` 등) | `<h2 data-i18n-html="hero_heading">` |
| `data-i18n-placeholder="key"` | input placeholder 교체 | `<input data-i18n-placeholder="search">` |

**언어 전환:**
- 헤더의 "KR / EN" 토글 버튼
- `localStorage`에 선택 저장
- 페이지 로드 시 저장된 언어 자동 적용

**번역 커버리지:**
- 네비게이션, Hero, How it Works
- 폼 라벨, 버튼, 에러 메시지
- 카드 배지, 모달, 카테고리, 정렬 옵션
- 리뷰, 피드백, 빈 상태 메시지

---

## 10. 배포 및 인프라

### 10.1 Cloudflare Workers (백엔드 API)

**설정 파일**: `worker/wrangler.toml`

```toml
[kv_namespaces]
binding = "DEMOS"
id = "e499c031e193498f9933fbfceb8298dc"
preview_id = "93b91220d60f45ff99f3371d9e0555c1"

[vars]
LEMONSQUEEZY_STORE_ID = "278930"
LEMONSQUEEZY_VARIANT_PRO = "1439828"
LEMONSQUEEZY_VARIANT_TEAM = "1439849"

[dev]
port = 8787
```

**환경 시크릿** (`wrangler secret put`으로 설정):

| 시크릿 | 용도 |
|--------|------|
| `GOOGLE_API_KEY` | Google Web Risk + Safe Browsing API |
| `URLSCAN_API_KEY` | URLScan.io API |
| `VIRUSTOTAL_API_KEY` | VirusTotal API |
| `LEMONSQUEEZY_API_KEY` | LemonSqueezy 결제 API |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | LemonSqueezy 웹훅 검증 |

**배포 명령:**
```bash
cd worker && npx wrangler deploy
```

### 10.2 Cloudflare Pages (프론트엔드)

**배포 명령:**
```bash
cd frontend && npx wrangler pages deploy . --project-name demovault --commit-dirty=true
```

**커스텀 헤더** (`_headers`):
```
/admin
  Cross-Origin-Opener-Policy: unsafe-none
```

**캐시 버스팅:**
- CSS/JS 파일에 `?v=YYYYMMDD{suffix}` 쿼리 파라미터 사용
- 변경 시 버전 문자열 업데이트 필수

### 10.3 도메인 구성

| 도메인 | 서비스 |
|--------|--------|
| `demovault.org` | Cloudflare Pages (프론트엔드) |
| Worker 엔드포인트 | Cloudflare Workers (백엔드 API) |

---

## 11. 관리자 시스템

### 11.1 접근 제어

Cloudflare Access JWT 인증을 통해 관리자만 접근 가능하다.

### 11.2 대시보드 탭

#### 📋 Demos 탭

**통계 카드:**
- Total Demos (전체 등록 수)
- Today (오늘 등록 수)
- Total Clicks (전체 클릭 수)
- Total Reviews (전체 리뷰 수)
- Total Feedback (전체 피드백 수)
- Total Requests (전체 요청 수)

**데모 관리 테이블:**

| 컬럼 | 내용 |
|------|------|
| # | 번호 |
| Name | 데모 이름 |
| Category | 카테고리 |
| Date | 등록일 |
| Clicks | 클릭 수 |
| Reviews | 리뷰 수 |
| Status | 스캔 상태 |
| Actions | 수정 / 삭제 버튼 |

**동작:**
- **수정**: 모달 팝업에서 이름, 카테고리, 설명 편집 → PATCH 저장
- **삭제**: 확인 다이얼로그 후 DELETE

#### 💡 Requests 탭

**기능 요청 목록:**
- 유형별 표시 (Feature / Bug / Other)
- 상태 배지: 🆕 New / 👀 Reviewing / 📅 Planned / ✅ Done / ❌ Declined
- 인라인 드롭다운으로 상태 즉시 변경

---

## 12. 외부 연동 서비스

### 12.1 Free Tools 섹션

메인 페이지에 4개의 무료 개발자 도구 링크를 제공한다.

| 도구 | URL | 설명 |
|------|-----|------|
| Repo vs Repo | `clickvolt.app/tools/compare` | GitHub 저장소 비교 (스타, 커밋, 기술 스택) |
| Repo Radar | `clickvolt.app/tools/radar` | 트렌딩 오픈소스 도구 디스커버리 |
| Deploy Checker | `clickvolt.app/tools/deploy-check` | 프로덕션 준비 상태 감사 (SSL, 헤더, 성능) |
| AIreply | `aireply.youngri.org` | AI 기반 구글 리뷰 답변 생성기 |

### 12.2 Repo vs Repo 비교 도구 (내장)

`/compare` 경로에서 직접 사용 가능한 GitHub 저장소 비교 도구이다.

**기능:**
- 두 GitHub 저장소를 owner/name 형식으로 입력
- 인기 비교 조합 프리셋 제공
- 비교 항목: 스타, 포크, 커밋, 릴리스, 사용 언어
- 나란히 비교 테이블
- 공유 버튼

### 12.3 시드 스크립트

| 스크립트 | 용도 |
|---------|------|
| `seed-demos.js` | HuggingFace Spaces + GitHub에서 AI 데모 자동 수확 |
| `seed-indie.js` | 인디 개발자 도구 시드 데이터 일괄 등록 |

---

## 13. 개발 규칙 및 컨벤션

### 13.1 코드 작성 규칙

| 규칙 | 상세 |
|------|------|
| 언어 | 주석 및 응답은 한국어, 변수/함수명은 영어 |
| 스타일 | 간결한 코드, 함수 단일 책임 원칙 |
| 파일 수정 | 반드시 기존 파일을 먼저 읽은 후 수정 |
| 대규모 기능 | 계획 먼저 수립 → 코드 작성 |
| 보안 | API 키는 코드에 포함 금지 (환경 변수 사용) |
| 캐시 | CSS/JS 변경 시 `?v=` 쿼리 파라미터 업데이트 필수 |
| i18n | EN + KR 번역을 동시에 추가 |

### 13.2 배포 체크리스트

1. 코드 변경 완료
2. 캐시 버스팅 버전 업데이트 (`?v=YYYYMMDD{suffix}`)
3. 프론트엔드 배포: `npx wrangler pages deploy .`
4. (필요 시) Worker 배포: `npx wrangler deploy`
5. 라이브 사이트에서 변경 사항 확인

---

## 부록: 기능 상태 요약

| 기능 | 상태 | 비고 |
|------|------|------|
| 갤러리 + 검색/필터/정렬 | ✅ 운영 중 | 5열 반응형 그리드 |
| 4-엔진 보안 스캔 | ✅ 운영 중 | 병렬 실행 |
| 데모 등록 | ✅ 운영 중 | 회원가입 불필요 |
| 리뷰 시스템 | ✅ 운영 중 | CAPTCHA + 속도 제한 |
| 피드백 (이모지) | ✅ 운영 중 | 3종 반응 |
| 관리자 대시보드 | ✅ 운영 중 | CF Access 인증 |
| 다국어 (KR/EN) | ✅ 운영 중 | localStorage 저장 |
| 임베드 배지 | ✅ 운영 중 | SVG 자동 생성 |
| 사이트맵 | ✅ 운영 중 | XML 자동 생성 |
| 기능 요청 | ✅ 운영 중 | 상태 관리 포함 |
| Repo 비교 도구 | ✅ 운영 중 | GitHub API 연동 |
| Pro 티어 결제 | ⏸ 비활성 | LemonSqueezy 연동 코드 존재, CTA 숨김 |
| 크리에이터 분석 대시보드 | 📋 계획 | 미구현 |
| 즉시 재스캔 버튼 | 📋 계획 | 미구현 |

---

*마지막 업데이트: 2026-03-28*
