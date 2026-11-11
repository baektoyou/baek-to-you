// 표현 카테고리 (SAVED › 표현): 쓰임별로 AI가 자동 분류 · 내가 눌러서 바꿀 수 있음 · 영상별 보기는 AI 없이
// · 새로 저장한 표현은 조금 뒤 자동 분류 · 예전 표현은 ‘예전 표현 분류하기’(20개씩 묶어서) · AI 키 없으면 ‘분류 전’
import * as D from './store.js';
import { aiOn, aiExprCat } from './ai.js';

export const CATS = [
  ['react', '리액션', 'omg, no way, that makes sense'],
  ['feel', '감정', "I'm so excited, it hit different"],
  ['daily', '일상', 'grab a bite, call it a day'],
  ['cheer', '칭찬', "you nailed it, I'm proud of you"],
  ['ask', '질문', 'how was your day, what do you think'],
  ['suggest', '부탁', 'why don\'t we, could you'],
  ['link', '연결', 'because of that, by the way, anyway'],
  ['phrasal', '구동사', 'look forward to, end up, figure out'],
  ['fans', '에리에게', 'thank you for waiting, I missed you'],
  ['etc', '기타', '']
];
export const CAT = Object.fromEntries(CATS.map(([k, l]) => [k, l]));
// 기본 10개에 안 맞으면 새 카테고리가 생김: words[].cat 에 이름(한글) 그대로 저장 · AI가 만들거나 내가 직접
export const MAX_CUSTOM = 12;
export const cleanCat = t => { const s = String(t || '').trim().replace(/\s+/g, ' '); if (CAT[s]) return s; const k = CATS.find(c => c[1] === s)?.[0]; if (k) return k; return /^[가-힣A-Za-z·/ ]{1,8}$/.test(s) && !['all', 'video', 'none', '전체', '영상별', '분류 전'].includes(s) ? s : ''; };
export const label = c => CAT[c] || String(c || '');
export const customs = () => [...new Set(D.get().words.map(w => w.cat).filter(c => c && !CAT[c]))];
export const isExpr = w => !!w; // 단어·표현 구분 없이 전부 표현 (예전 ‘단어’도 카테고리 분류)
export const uncats = () => D.get().words.filter(w => !w.cat);

let running = null;
export const catRunning = () => !!running;
export async function classify(list, onStep) {
  if (running || !aiOn() || !list.length) return { error: !aiOn() ? 'off' : running ? 'busy' : '', done: 0 };
  let done = 0, error = '';
  running = (async () => {
    for (let i = 0; i < list.length; i += 20) {
      const chunk = list.slice(i, i + 20);
      const r = await aiExprCat(chunk.map(w => ({ text: w.text, ko: w.ko || '' })), customs());
      if (r.error) { error = r.error; break; }
      chunk.forEach((w, j) => { let c = cleanCat(r.cats[j]); if (c && !CAT[c] && !customs().includes(c) && customs().length >= MAX_CUSTOM) c = 'etc'; if (c) D.updateWord(w.id, { cat: c }); });
      done += chunk.length; onStep?.(done, list.length);
    }
  })();
  try { await running; } finally { running = null; }
  window.dispatchEvent(new Event('b2u:excat'));
  return { error, done };
}
// 새로 저장한 표현: 저장하고 몇 초 뒤 조용히 분류 (최근 하루 안에 저장한 것만 · 예전 것은 버튼으로)
let t = null;
window.addEventListener('b2u:words', () => {
  clearTimeout(t);
  t = setTimeout(() => { const fresh = uncats().filter(w => Date.now() - (w.createdAt || 0) < 864e5); if (fresh.length && aiOn()) classify(fresh.slice(0, 20)); }, 5000);
});
