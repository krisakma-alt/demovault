const TRANSLATIONS = {
  en: {
    'nav.submit':           'Submit Demo',
    // Hero 섹션
    'hero.eyebrow':         'AI Demo Gallery',
    'hero.title':           'Share your AI demo.<br>Let the world discover it.',
    'hero.sub':             'Just paste your URL. Auto-scanned with 4 safety tools before going live.<br>Visitors see the scan results before clicking.',
    'hero.btn':             'Submit My Demo →',
    // How it works
    'hiw.step1.title':      '1. Register URL',
    'hiw.step1.desc':       'Just enter your demo URL and a short description. No account needed.',
    'hiw.step2.title':      '2. Auto Safety Scan',
    'hiw.step2.desc':       'Google Web Risk, Safe Browsing, URLScan, and VirusTotal check your link instantly.',
    'hiw.step3.title':      '3. Published to Gallery',
    'hiw.step3.desc':       'Once cleared, your demo goes live. Developers discover it and leave feedback.',
    'submit.title':         'Submit Your Demo',
    'submit.name':          'Project Name',
    'submit.url':           'Demo URL',
    'submit.category':      'Category',
    'submit.desc':          'Description',
    'submit.button':        'Submit & Scan',
    'gallery.loading':      'Loading demos...',
    'gallery.error':        'Failed to load demos. Is the Worker running?',
    'gallery.retry':        'Retry',
    'gallery.empty':        'No demos yet. Be the first to submit!',
    'submit.badgeLabel':    'Add this badge to your README:',
    'submit.copy':          'Copy',
    'submit.viewDemo':      'View My Demo →',
    'submit.sending':       'Submitting...',
    'submit.success':       '✓ Registered! Redirecting to gallery...',
    'submit.errorGeneric':  'Submission failed. Please try again.',
    'submit.errorNetwork':  'Network error. Please check your connection.',
    'card.visit':           'Visit Demo →',
    'card.safe':            '✓ Safe',
    'card.unsafe':          '✗ Unsafe',
    'card.pending':         '⏳ Pending',
    'modal.title':          '🔍 Safety Check',
    'modal.scanning':       'Checking...',
    'modal.cancel':         'Cancel',
    'modal.proceed':        'Visit →',
    'modal.resultSafe':     '✓ This site passed all 4 safety checks.',
    'modal.resultUnsafe':   '✗ This site has been flagged as dangerous.',
    'modal.resultPending':  '⏳ Scan still in progress. Proceed with caution.',
    'modal.resultError':    '⚠️ An error occurred during the scan.',
    'cat.image-gen':        'Image Gen',
    'cat.text-ai':          'Text AI',
    'cat.code-ai':          'Code AI',
    'cat.voice-ai':         'Voice AI',
    'cat.video-ai':         'Video AI',
    'cat.utility':          'Utility',
    'cat.other':            'Other',
    // 구 카테고리 하위 호환
    'cat.productivity':     'Productivity',
    'cat.marketing':        'Marketing',
    'cat.ecommerce':        'E-Commerce',
    // 검색
    'search.placeholder':   'Search demos by name or description...',
    'search.recent':        'Recent',
    'gallery.noResults':    'No demos found. Try a different search or filter.',
    'gallery.clearSearch':  'Clear Search',
    // 등록 단계
    'submit.step1':         'Info',
    'submit.step2':         'Details',
    'submit.step3':         'Submit',
    'submit.next':          'Next →',
    'submit.back':          '← Back',
    'submit.preview':       'Review & Submit',
    // 정렬
    'sort.reviews':         'Most Reviewed',
    'sort.popular':         'Most Popular',
    'sort.newest':          'Newest',
    // 리뷰
    'review.sectionTitle':  'Reviews',
    'review.authorPlaceholder': 'Your name (optional)',
    'review.textPlaceholder':   'Write a short review...',
    'review.submit':        'Post Review',
    'review.empty':         'No reviews yet. Be the first!',
    'review.success':       '✓ Review posted!',
    'review.error':         'Failed to post review.',
    'review.rateLimit':     'Please wait a few minutes before posting again.',
    'review.captchaWrong':  'Wrong answer. Please try again.',
    // Compare 도구
    'compare.title':        'Repo vs Repo',
    'compare.subtitle':     'Compare any two GitHub repositories side by side',
    'compare.cta':          'Compare',
    'compare.loading':      'Fetching repository data...',
    'compare.popular':      'Popular Comparisons',
    // Free Tools
    'nav.freeTools':        'Free Tools ▾',
    'freeTools.title':      'Free Tools',
    'freeTools.sub':        'Useful developer tools — 100% free, no sign-up needed.',
    'freeTools.compare':    'Compare two GitHub repos side by side — stars, commits, tech stack',
    'freeTools.radar':      'Discover trending open-source tools by category',
    'freeTools.deploy':     'Check if your site is production-ready (SSL, headers, performance)',
    'freeTools.aireply':    'AI-powered Google review reply generator for businesses',
    // Trust logos
    'trust.label':          'Powered by',
    // Submit benefits
    'benefits.title':       'Why submit to DemoVault?',
    'benefit.badge':        'Verified Badge',
    'benefit.badgeDesc':    'Get a safety-verified badge for your README',
    'benefit.exposure':     'Free Exposure',
    'benefit.exposureDesc': 'Developers discover your project in our gallery',
    'benefit.security':     'Security Proof',
    'benefit.securityDesc': '4-engine scan result builds trust with visitors',
  },
  kr: {
    'nav.submit':           '데모 등록',
    // Hero 섹션
    'hero.eyebrow':         'AI 데모 갤러리',
    'hero.title':           '내가 만든 AI 데모,<br>세상에 안전하게 공개하기',
    'hero.sub':             'URL만 있으면 등록 끝. 4가지 보안 도구로 자동 검사 후 갤러리에 게시됩니다.<br>방문자는 검사 결과를 확인하고 안심하고 클릭할 수 있어요.',
    'hero.btn':             '내 데모 등록하기 →',
    // How it works
    'hiw.step1.title':      '1. URL 등록',
    'hiw.step1.desc':       '데모 URL과 간단한 설명만 입력하세요. 계정 없이도 등록 가능합니다.',
    'hiw.step2.title':      '2. 자동 안전 검사',
    'hiw.step2.desc':       'Google Web Risk, Safe Browsing, URLScan, VirusTotal 4가지 도구로 즉시 검사합니다.',
    'hiw.step3.title':      '3. 갤러리 게시',
    'hiw.step3.desc':       '검사 통과 후 갤러리에 공개됩니다. 개발자들이 발견하고 피드백을 남깁니다.',
    'submit.title':         '내 데모 등록하기',
    'submit.name':          '프로젝트 이름',
    'submit.url':           '데모 URL',
    'submit.category':      '카테고리',
    'submit.desc':          '설명',
    'submit.button':        '등록 & 검사 시작',
    'gallery.loading':      '데모를 불러오는 중...',
    'gallery.error':        '데모를 불러오지 못했습니다. Worker가 실행 중인지 확인하세요.',
    'gallery.retry':        '다시 시도',
    'gallery.empty':        '아직 등록된 데모가 없습니다. 첫 번째로 등록해보세요!',
    'submit.badgeLabel':    'README에 이 뱃지를 추가하세요:',
    'submit.copy':          '복사',
    'submit.viewDemo':      '내 데모 보기 →',
    'submit.sending':       '등록 중...',
    'submit.success':       '✓ 등록 완료! 갤러리로 이동합니다...',
    'submit.errorGeneric':  '등록에 실패했습니다. 다시 시도해주세요.',
    'submit.errorNetwork':  '네트워크 오류가 발생했습니다. 연결을 확인해주세요.',
    'card.visit':           '데모 보기 →',
    'card.safe':            '✓ 안전',
    'card.unsafe':          '✗ 위험',
    'card.pending':         '⏳ 검사 중',
    'modal.title':          '🔍 안전 검사',
    'modal.scanning':       '확인 중...',
    'modal.cancel':         '취소',
    'modal.proceed':        '이동하기 →',
    'modal.resultSafe':     '✓ 4종 안전 검사를 모두 통과했습니다.',
    'modal.resultUnsafe':   '✗ 위험한 사이트로 감지되었습니다.',
    'modal.resultPending':  '⏳ 검사가 아직 진행 중입니다. 주의 후 이동하세요.',
    'modal.resultError':    '⚠️ 검사 중 오류가 발생했습니다.',
    'cat.image-gen':        '이미지 생성',
    'cat.text-ai':          '텍스트 AI',
    'cat.code-ai':          '코드 AI',
    'cat.voice-ai':         '음성 AI',
    'cat.video-ai':         '영상 AI',
    'cat.utility':          '유틸리티',
    'cat.other':            '기타',
    // 구 카테고리 하위 호환
    'cat.productivity':     '업무도구',
    'cat.marketing':        '마케팅',
    'cat.ecommerce':        '쇼핑',
    // 검색
    'search.placeholder':   '이름이나 설명으로 검색...',
    'search.recent':        '최근 검색',
    'gallery.noResults':    '검색 결과가 없습니다. 다른 검색어나 필터를 시도해보세요.',
    'gallery.clearSearch':  '검색 초기화',
    // 등록 단계
    'submit.step1':         '기본 정보',
    'submit.step2':         '상세 정보',
    'submit.step3':         '등록',
    'submit.next':          '다음 →',
    'submit.back':          '← 이전',
    'submit.preview':       '확인 후 등록',
    // 정렬
    'sort.reviews':         '리뷰 많은 순',
    'sort.popular':         '인기순',
    'sort.newest':          '최신순',
    // 리뷰
    'review.sectionTitle':  '리뷰',
    'review.authorPlaceholder': '이름 (선택)',
    'review.textPlaceholder':   '짧은 리뷰를 남겨주세요...',
    'review.submit':        '리뷰 등록',
    'review.empty':         '아직 리뷰가 없습니다. 첫 번째로 남겨보세요!',
    'review.success':       '✓ 리뷰가 등록되었습니다!',
    'review.error':         '리뷰 등록에 실패했습니다.',
    'review.rateLimit':     '잠시 후에 다시 시도해주세요.',
    'review.captchaWrong':  '답이 틀렸습니다. 다시 시도해주세요.',
    // Compare 도구
    'compare.title':        'Repo vs Repo',
    'compare.subtitle':     '두 GitHub 레포지토리를 한눈에 비교하세요',
    'compare.cta':          '비교하기',
    'compare.loading':      '레포지토리 데이터를 가져오는 중...',
    'compare.popular':      '인기 비교',
    // Free Tools
    'nav.freeTools':        '무료 도구 ▾',
    'freeTools.title':      '무료 도구',
    'freeTools.sub':        '개발자를 위한 유용한 도구 — 100% 무료, 가입 불필요.',
    'freeTools.compare':    '두 GitHub 레포를 나란히 비교 — 스타, 커밋, 기술 스택',
    'freeTools.radar':      '카테고리별 트렌딩 오픈소스 도구 발견',
    'freeTools.deploy':     '사이트가 배포 준비되었는지 확인 (SSL, 헤더, 성능)',
    'freeTools.aireply':    'AI 기반 구글 리뷰 답변 생성기',
    // Trust logos
    'trust.label':          'Powered by',
    // Submit benefits
    'benefits.title':       'DemoVault에 등록하면?',
    'benefit.badge':        '인증 뱃지',
    'benefit.badgeDesc':    'README에 안전 인증 뱃지를 달 수 있어요',
    'benefit.exposure':     '무료 노출',
    'benefit.exposureDesc': '개발자들이 갤러리에서 프로젝트를 발견합니다',
    'benefit.security':     '보안 증명',
    'benefit.securityDesc': '4종 검사 결과가 방문자 신뢰를 높여줍니다',
  },
};

let currentLang = localStorage.getItem('lang') || 'en';

function applyTranslations() {
  // 일반 텍스트 번역 (data-i18n)
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = TRANSLATIONS[currentLang]?.[key];
    if (text) el.textContent = text;
  });
  // HTML 포함 번역 (data-i18n-html) — <br> 등 태그가 필요한 경우
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    const html = TRANSLATIONS[currentLang]?.[key];
    if (html) el.innerHTML = html;
  });
  // placeholder 번역 (data-i18n-placeholder) — input/textarea
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const text = TRANSLATIONS[currentLang]?.[key];
    if (text) el.placeholder = text;
  });
}

function toggleLang() {
  currentLang = currentLang === 'en' ? 'kr' : 'en';
  localStorage.setItem('lang', currentLang);
  applyTranslations();
}

document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
  document.getElementById('lang-toggle')?.addEventListener('click', toggleLang);
});
