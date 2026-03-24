const TRANSLATIONS = {
  en: {
    'nav.submit':           'Submit Demo',
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
    'modal.resultSafe':     '✓ This site passed all 3 safety checks.',
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
  },
  kr: {
    'nav.submit':           '데모 등록',
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
    'modal.resultSafe':     '✓ 3종 안전 검사를 모두 통과했습니다.',
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
  },
};

let currentLang = localStorage.getItem('lang') || 'en';

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = TRANSLATIONS[currentLang]?.[key];
    if (text) el.textContent = text;
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
