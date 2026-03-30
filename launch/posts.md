# DemoVault — Launch Posts (Copy & Paste Ready)

---

## 1. Product Hunt (Maker Comment)

**Title:** DemoVault — Safety-checked AI tool gallery
**Tagline:** Every AI tool scanned by 4 security engines before you click

**Maker Comment:**
Hey everyone! I built DemoVault because I was tired of clicking sketchy AI tool links.

Every URL submitted to DemoVault gets scanned by 4 security engines (Google Web Risk, Safe Browsing, URLScan, and VirusTotal) before it goes live. Users see the scan results and can browse with confidence.

It's completely free — no account needed to submit or browse. If you're an indie developer with an AI tool, you can get it listed in 30 seconds.

Would love your feedback!

---

## 2. Reddit — r/SideProject

**Title:** I built a safety-checked AI tool gallery — every link scanned by 4 security engines before publishing

**Body:**
I kept running into random AI tools online and wondering "is this safe to click?" So I built DemoVault.

**What it does:**
- Submit any AI tool URL → auto-scanned by Google Web Risk, Safe Browsing, URLScan, and VirusTotal
- Only published after passing safety checks
- Search by category (Image Gen, Code AI, Voice AI, etc.)
- Leave reviews, see what's trending
- No account needed

**Tech stack:** Cloudflare Workers + KV + Pages (basically free to run)

**For indie devs:** If you built an AI tool, submit it for free and get an embeddable safety badge.

Link: https://demovault.org

Feedback welcome!

---

## 3. Reddit — r/webdev

**Title:** Built a gallery that scans AI tools with 4 security engines before listing them — Cloudflare Workers + vanilla JS

**Body:**
Side project I've been working on. DemoVault is a gallery for AI tools where every submitted URL goes through 4 automated security scans before it gets published.

**Stack:**
- Backend: Cloudflare Workers (serverless)
- Storage: Cloudflare KV
- Frontend: Cloudflare Pages, vanilla HTML/CSS/JS
- Scans: Google Web Risk API, Safe Browsing API, URLScan.io API, VirusTotal API
- Payments: LemonSqueezy (not active yet, focused on free usage first)
- i18n: English/Korean bilingual

All scans run in parallel via Promise.allSettled(). The safety gate modal shows scan results before letting users visit external links.

Happy to answer questions about the architecture.

https://demovault.org

---

## 4. Hacker News (Show HN)

**Title:** Show HN: DemoVault – AI tool gallery with 4-engine security scanning

**Body:**
DemoVault scans every submitted AI tool URL with Google Web Risk, Safe Browsing, URLScan, and VirusTotal before publishing it to the gallery. Users see the scan results and decide whether to visit.

No account needed. Free to submit and browse. Built on Cloudflare Workers + KV + Pages.

https://demovault.org

---

## 5. GeekNews (Korean — news.hada.io)

**Title:** DemoVault — 4종 보안 검사를 거치는 AI 도구 갤러리

**Body:**
AI 도구 링크를 클릭하기 전에 안전한지 확인할 수 있는 갤러리를 만들었습니다.

등록된 모든 URL은 Google Web Risk, Safe Browsing, URLScan, VirusTotal 4종 보안 엔진으로 자동 검사 후 게시됩니다. 방문자는 검사 결과를 확인하고 안심하고 클릭할 수 있어요.

- 계정 없이 무료 등록/탐색
- 7개 카테고리 (이미지 생성, 텍스트 AI, 코드 AI, 음성 AI 등)
- 검색 + 리뷰 기능
- 한국어/영어 지원

인디 개발자가 만든 AI 도구를 홍보할 수 있는 무료 플랫폼입니다.

https://demovault.org

---

## 6. X/Twitter

**EN:**
I built DemoVault — a gallery where every AI tool is scanned by 4 security engines before you click.

Google Web Risk + Safe Browsing + URLScan + VirusTotal

No account needed. Free for indie devs.

https://demovault.org

**KR:**
AI 도구 갤러리를 만들었습니다.

등록된 모든 링크는 4종 보안 엔진(Google Web Risk, Safe Browsing, URLScan, VirusTotal)으로 자동 검사 후 게시됩니다.

무료. 계정 불필요. 인디 개발자 환영.

https://demovault.org

---

## 7. Indie Hackers

**Title:** DemoVault — Free AI tool gallery with 4-engine security scanning

**Body:**
Problem: There are thousands of AI tools out there, and clicking unknown links feels risky.

Solution: DemoVault scans every submitted URL with 4 security engines before publishing. Users see the results and browse with confidence.

- Completely free, no account needed
- Built on Cloudflare (Workers + KV + Pages) — near-zero operating cost
- Revenue model: planned Pro tier for featured placement (not active yet, focused on user base first)
- 45 tools listed, 7 categories, search + reviews

Looking for feedback and early users. If you built an AI tool, submit it!

https://demovault.org

---

## 8. X/Twitter Thread (EN)

**Tweet 1:**
I built a gallery where every AI tool is safety-checked before you click.

4 security engines. Zero accounts needed. Free for everyone.

Meet DemoVault:

https://demovault.org

**Tweet 2:**
The problem? Thousands of AI tools. No way to know if a link is safe.

DemoVault scans every submitted URL with:
- Google Web Risk
- Google Safe Browsing
- URLScan.io
- VirusTotal

Results are shown BEFORE you visit.

**Tweet 3:**
For indie developers:

Submit your AI tool in 30 seconds (no account needed).

You get:
→ 4-engine safety verification
→ Listed in a searchable gallery
→ Embeddable safety badge for your README
→ User reviews and feedback

All free.

**Tweet 4:**
Built with:
- Cloudflare Workers (serverless API)
- Cloudflare KV (database)
- Cloudflare Pages (frontend)
- Vanilla HTML/CSS/JS (no framework)
- Vitest (46 tests)
- GitHub Actions CI/CD

Running cost: basically $0.

**Tweet 5:**
If you built an AI tool and want free exposure + a trust badge, submit it here:

https://demovault.org/submit

Looking for feedback. What features would you want to see next?

---

## 9. X/Twitter Thread (KR)

**트윗 1:**
AI 도구 갤러리를 만들었습니다.

등록된 모든 링크는 4종 보안 엔진으로 자동 검사 후 게시.
계정 불필요. 완전 무료.

https://demovault.org

**트윗 2:**
문제: AI 도구가 넘쳐나는데, 링크가 안전한지 알 수 없음.

DemoVault는 모든 URL을 검사합니다:
- Google Web Risk
- Google Safe Browsing
- URLScan.io
- VirusTotal

검사 결과를 확인하고 안심하고 방문하세요.

**트윗 3:**
인디 개발자라면:

30초만에 AI 도구 등록 가능 (계정 불필요)

받을 수 있는 것:
→ 4종 보안 인증
→ 검색 가능한 갤러리에 노출
→ README용 안전 뱃지
→ 사용자 리뷰

전부 무료입니다.

**트윗 4:**
기술 스택:
- Cloudflare Workers + KV + Pages
- 순수 HTML/CSS/JS (프레임워크 없음)
- Vitest 46개 테스트
- GitHub Actions CI/CD

운영 비용: 거의 $0

**트윗 5:**
AI 도구를 만들었다면 여기서 무료로 등록하세요:

https://demovault.org/submit

피드백 환영합니다. 어떤 기능이 필요한가요?

---

## 10. Product Hunt — First Comment (Detailed)

Hey Product Hunters! 👋

I built DemoVault because I got tired of wondering "is this AI tool link safe to click?"

**The core idea is simple:**
Every URL submitted to DemoVault gets scanned by 4 different security engines — Google Web Risk, Google Safe Browsing, URLScan.io, and VirusTotal — before it appears in the gallery. Users see the scan results and decide with confidence.

**Why I built it:**
- There are thousands of AI tools launching every week
- Many share links on Twitter/Reddit with no verification
- Users have no way to know if a link is malicious
- Developers building legit tools have no trust signal

**What's included:**
- 7 categories (Image Gen, Text AI, Code AI, Voice AI, Video AI, Utility, Other)
- Full-text search + sort (Most Reviewed / Popular / Newest)
- User reviews with spam protection (math CAPTCHA)
- Embeddable safety badge for your GitHub README
- Bilingual: English + Korean
- Feature request system for community feedback

**What's next:**
- Screenshot previews for each tool
- Weekly "Top 5 Safe AI Tools" newsletter
- API for developers to integrate safety checks

**Tech:** Cloudflare Workers + KV + Pages. Near-zero operating cost.

Would love your feedback! If you built an AI tool, submit it for free — takes 30 seconds.

https://demovault.org
