// 답변 평가 · 단계별 힌트 · 복습 질문 — 무료·오프라인 규칙 기반 (AI 아님)
// · 문법만 보지 않고: 뜻이 맞는지(통역), 질문에 맞는 대답인지(대화), 연습할 표현을 썼는지까지 확인
// · 확신이 없으면 칭찬하지 않고 “이렇게 말하면 더 정확해요”로 안내
import { diff, tokens, stem, STOP, splitPatterns, diffWords } from './compare.js';
import { checkSentence, patternParts, usesPattern, libFor } from './feedback.js';
import { detectTopics, appQuestion } from './talk-engine.js';

const HANGUL = /[가-힣]/;
const wc = t => String(t || '').trim().split(/\s+/).filter(Boolean).length;
const AUX = new Set(['have', 'has', 'had', 'will', 'would', 'can', 'could', 'should', 'does', 'did', 'not', 'going', 'got', 'get', 'there', 'here', 'all', 'some', 'any', 'one', 'lot', 'much', 'many', 'thing', 'things']);
const content = t => tokens(t).filter(w => !STOP.has(w) && !AUX.has(w) && w.length > 2).map(stem);
const grammarOf = (t, pattern = '') => { const r = checkSentence(t, pattern); return r ? r.issues.filter(i => i.type === 'grammar' || i.type === 'pattern') : []; };
const fixedOf = (t, pattern = '') => checkSentence(t, pattern)?.fixed || t;

// level: great(완벽) · good(뜻이 통함) · fix(고칠 곳 있음) · off(뜻·질문과 다름) · none(말 없음)
const R = (level, title, msg = '', extra = {}) => ({ level, title, msg, ok: level === 'great' || level === 'good', ...extra });

// ---------- 1) 통역: 백현이 말(한국어)을 영어로 ----------
export function judgeTranslation(said, target) {
  said = String(said || '').trim();
  if (!said) return R('none', '말한 문장이 없어요');
  if (HANGUL.test(said)) return R('off', '영어로 말해볼까요?', '한국어가 섞여 있어요');
  const d = diff(said, target), gram = grammarOf(said);
  const miss = d.missingKeys.filter(w => !AUX.has(w) && w.length > 2).slice(0, 2);
  if (d.score >= 88 && d.keyRecall >= 0.9 && !gram.length) return R('great', '완벽해요', '원래 뜻이 그대로 살아 있어요', { d });
  if (gram.length) { const d2 = diff(fixedOf(said), target); if (d2.score >= 85 && d2.keyRecall >= 0.85) return R('good', '뜻은 맞아요 · 문법 하나만', gram[0].why, { d: d2, gram }); }
  if (d.keyRecall >= 0.7 && d.score >= 55) {
    if (gram.length) return R('good', '뜻은 잘 통해요', gram[0].why, { d, gram });
    return R('good', '뜻이 잘 통해요', miss.length ? `‘${miss.join(', ')}’까지 넣으면 더 정확해요` : '추천 문장처럼 말하면 더 자연스러워요', { d });
  }
  if (d.keyRecall >= 0.4) return R('fix', '조금 빠졌어요', miss.length ? `‘${miss.join(', ')}’ 부분이 빠졌거나 다르게 들렸어요` : '핵심 내용이 조금 달라요', { d, gram });
  return R('off', '뜻이 달라요', '핵심 단어를 다시 떠올려보고 문장을 따라 말해봐요', { d, gram });
}

// ---------- 2) 대화: 질문·말에 맞는 대답인지 ----------
const YESNO = /^(do|does|did|are|is|was|were|have|has|can|could|will|would|should|shall|may)\b/i;
const QWORD = q => {
  const s = String(q || '').toLowerCase();
  if (/\bhow (many|much|long|often|old)\b/.test(s)) return 'howmuch';
  for (const w of ['why', 'when', 'where', 'who', 'what', 'which', 'how']) if (new RegExp(`(^|[^a-z])${w}\\b`).test(s)) return w;
  if (YESNO.test(s.trim()) || /\?\s*$/.test(s)) return 'yesno';
  return '';
};
const EXPECT = {
  yesno: /\b(yes|yeah|yep|no|nope|nah|of course|sure|definitely|maybe|not really|i (do|did|am|was|have|can|will|would|haven't|don't|didn't|can't|won't)|kind of|sort of|totally|absolutely|never|sometimes)\b/i,
  why: /\b(because|since|so|cause|'cause|that's why|the reason|to)\b/i,
  when: /\b(today|yesterday|tomorrow|tonight|morning|afternoon|evening|night|week|weekend|month|year|ago|later|soon|now|always|usually|sometimes|often|never|after|before|when|o'?clock|\d+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|spring|summer|fall|autumn|winter|last|next)\b/i,
  where: /\b(at|in|to|from|near|home|here|there|school|work|office|cafe|park|seoul|korea|outside|inside|room|place|city|country)\b/i,
  who: /\b(my|friend|friends|mom|mother|dad|father|family|sister|brother|he|she|they|alone|myself|with|someone|everyone|nobody|you)\b/i,
  howmuch: /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a lot|lots|many|much|few|little|every|once|twice|times|hours?|minutes?|days?|years?)\b/i,
  how: /\b(good|great|fine|okay|ok|not bad|tired|happy|sad|excited|busy|stressed|bored|amazing|so-so|well|better|worse|by|with|feel|felt|it was|it's)\b/i
};
const REACT = /\b(really|wow|oh|me too|same|cool|nice|awesome|that's|sounds|haha|lol|right|i see|i know|agree|true|thank|thanks|congrat|good|great|love|miss|sorry|aw+|cute|funny|interesting|yeah|yes|no way|of course|i hope)\b/i;

// opt: {question: 백현이 말(영어), expr: 꼭 넣을 표현/패턴, strict: 질문 대답 여부를 엄격히}
export function judgeReply(said, { question = '', expr = '', strict = true } = {}) {
  said = String(said || '').trim();
  if (!said) return R('none', '말한 문장이 없어요');
  if (HANGUL.test(said)) return R('off', '영어로 말해볼까요?', '한국어가 섞여 있어요');
  const n = wc(said), gram = grammarOf(said, expr), fixed = fixedOf(said, expr);
  // 표현 사용
  let usedExpr = true;
  if (expr) {
    const u = usesPattern(said, expr);
    usedExpr = u === null ? true : u;
    if (!usedExpr) { const parts = splitPatterns(expr).flatMap(patternParts).map(x => x.toLowerCase()); usedExpr = parts.length ? parts.some(p => content(p).every(w => content(said).includes(w)) && content(p).length) : true; }
  }
  // 질문과의 관련성
  let rel = 1, why = '';
  if (question) {
    const qt = QWORD(question), isQ = /\?\s*$/.test(question) || !!qt;
    const qWords = new Set(content(question)), aWords = content(said);
    const overlap = aWords.filter(w => qWords.has(w)).length;
    const qTop = new Set(detectTopics(question).map(x => x.t)), topic = detectTopics(said).some(x => qTop.has(x.t));
    const typeHit = qt && EXPECT[qt] ? EXPECT[qt].test(said) : false;
    rel = (typeHit ? 2 : 0) + Math.min(2, overlap) + (topic ? 1 : 0) + (expr && usedExpr ? 2 : 0);
    if (!isQ) rel += REACT.test(said) ? 2 : 1; // 질문이 아닌 말엔 반응·이어가기도 자연스러운 대답
    if (isQ && strict && rel === 0 && (['why', 'when', 'where', 'who', 'yesno', 'howmuch'].includes(qt) || qTop.size)) {
      why = ({ why: '이유(because …)가 들어가면 질문에 딱 맞는 대답이 돼요', when: '언제인지(시간·때)가 들어가야 질문에 맞는 대답이에요', where: '어디인지(장소)가 들어가야 질문에 맞는 대답이에요', who: '누구인지가 들어가야 질문에 맞는 대답이에요', yesno: 'Yes / No로 먼저 대답하고 이어서 말해봐요', howmuch: '얼마나·몇 번인지가 들어가야 질문에 맞는 대답이에요' })[qt] || '질문에서 물어본 내용으로 대답해봐요';
    }
  }
  if (n < 2) return R('fix', '조금만 더 길게', '한 문장으로 끝까지 말해봐요', { fixed, gram });
  if (why) return R('off', '질문과 조금 달라요', why, { fixed, gram });
  // 과거 질문(Did you …?)에 현재형으로 대답
  if (question && /^(did|were|was)\b|\b(yesterday|last night|last week|today)\b.*\?$/i.test(question.trim())) {
    const m = said.match(new RegExp(`\\b(I|we) (${Object.keys(PAST).join('|')})\\b`, 'i'));
    if (m && !/\b(usually|always|every|often|will|going to|want|can)\b/i.test(said)) {
      const fx = fixed.replace(new RegExp(`\\b(I|we) ${m[2]}\\b`, 'i'), (x, p) => `${p} ${PAST[m[2].toLowerCase()]}`);
      gram.unshift({ type: 'grammar', why: `질문이 과거라서 과거형(${PAST[m[2].toLowerCase()]})으로 대답해요` }); return R('fix', '뜻은 통해요 · 시제 하나만', gram[0].why, { fixed: fx, gram });
    }
  }
  if (!usedExpr) return R('fix', '표현이 빠졌어요', `‘${expr}’을 넣어서 다시 말해볼까요?`, { fixed, gram });
  if (gram.length) return R('fix', '뜻은 통해요 · 문법 하나만', gram[0].why, { fixed, gram });
  if (n < 4 && question) return R('good', '뜻이 잘 통해요', '이유나 한 마디를 더 붙이면 대화가 이어져요', { fixed });
  return R(rel >= 2 || !question ? 'great' : 'good', rel >= 2 || !question ? '자연스러워요' : '뜻이 잘 통해요', rel >= 2 || !question ? '' : '질문에 맞는 내용인지 한 번 더 확인해봐요', { fixed });
}

const PAST = { eat: 'ate', go: 'went', have: 'had', see: 'saw', do: 'did', sleep: 'slept', watch: 'watched', play: 'played', buy: 'bought', meet: 'met', make: 'made', take: 'took', get: 'got', listen: 'listened', study: 'studied', drink: 'drank', cook: 'cooked', work: 'worked', feel: 'felt', come: 'came', read: 'read', sing: 'sang', practice: 'practiced', stay: 'stayed', visit: 'visited' };
// ---------- 추천 문장: 원어민 답변 예시 중 내 말과 가장 가까운 것 (yes/no 방향 맞춤) ----------
export function bestReply(said, replies = []) {
  const list = (replies || []).filter(Boolean);
  if (!list.length) return '';
  if (!said) return list[0];
  let top = list[0], ts = -1;
  const pol = t => /^(yes|yeah|yep|sure|of course|i did|i have)\b/i.test(t.trim()) ? 1 : /^(no|nope|nah|not)\b|\bnot yet\b/i.test(t.trim()) ? -1 : 0;
  const ps = pol(said);
  for (const r of list) { const s = diff(said, r).score + (ps && pol(r) === ps ? 40 : ps && pol(r) === -ps ? -40 : 0); if (s > ts) { ts = s; top = r; } }
  return top;
}
// 추천 문장에서 저장할 만한 표현: 패턴 → 내가 놓친 덩어리 (최대 3개)
export function keyExpressions(rec, { pattern = '', said = '' } = {}) {
  const out = [];
  splitPatterns(pattern).forEach(p => { const t = p.trim(); if (t && t.split(/\s+/).length <= 6) out.push(t); });
  if (said) diffWords(said, rec).hunks.forEach(h => { const t = h.to.replace(/^[^\w']+|[^\w']+$/g, ''); const w = t.split(/\s+/).filter(Boolean); if (w.length >= 2 && w.length <= 5 && w.some(x => !STOP.has(x.toLowerCase().replace(/[^a-z']/g, '')))) out.push(t); });
  const seen = new Set();
  return out.filter(x => { const k = x.toLowerCase().replace(/[~…]|\.\.\./g, '').replace(/\s+/g, ' ').trim(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 3);
}

// ---------- 단계별 힌트: 처음엔 작은 단서 → 3~4단계에 핵심 단어·표현 (정답 전체는 절대 안 보여줌) ----------
export function hintSteps(en, { pattern = '', keywords = [] } = {}) {
  const W = String(en || '').trim().split(/\s+/).filter(Boolean);
  if (!W.length) return [];
  const bare = w => w.replace(/^[^\w']+|[^\w']+$/g, '');
  const low = w => bare(w).toLowerCase();
  const pat = new Set(splitPatterns(pattern).flatMap(patternParts).flatMap(p => p.toLowerCase().split(/\s+/)));
  const kw = (keywords || []).map(k => String(k).toLowerCase());
  const idx = W.map((w, i) => i).filter(i => !STOP.has(low(W[i])) && low(W[i]).length > 2 && !pat.has(low(W[i])));
  const rank = idx.sort((a, b) => (kw.some(k => low(W[b]).startsWith(k.slice(0, 4))) - kw.some(k => low(W[a]).startsWith(k.slice(0, 4)))) || (bare(W[b]).length - bare(W[a]).length));
  const keys = rank.slice(0, W.length <= 5 ? 1 : 2).sort((a, b) => a - b);
  const mask = w => { const b = bare(w); return b[0] + '_'.repeat(Math.max(2, Math.min(6, b.length - 1))); };
  const steps = [];
  steps.push(`${bare(W[0])} … · ${W.length}단어`);
  if (keys.length) steps.push(keys.map(i => mask(W[i])).join('  ·  '));
  const patTxt = splitPatterns(pattern).map(p => p.trim()).filter(Boolean)[0];
  const s3 = [patTxt, ...keys.map(i => bare(W[i]))].filter(Boolean);
  if (s3.length) steps.push(s3.join('  ·  '));
  // 4단계: 뼈대 — 첫 단어 · 패턴 · 핵심 단어만 보이고 나머지는 빈칸 (최소 2개는 가림)
  if (W.length >= 5) {
    const show = new Set([0, ...keys]); W.forEach((w, i) => { if (pat.has(low(w))) show.add(i); });
    const hidden = W.map((w, i) => i).filter(i => !show.has(i));
    if (hidden.length < 2) [...keys].reverse().slice(0, 2 - hidden.length).forEach(i => show.delete(i));
    steps.push(W.map((w, i) => show.has(i) ? w : '___' + (w.match(/[.,?!]+$/) || [''])[0]).join(' '));
  }
  return steps.filter((s, i, a) => s && a.indexOf(s) === i);
}

// ---------- 복습 질문: 이 표현/문장으로 대답할 수 있는 질문 ----------
// 반환 {en, ko}
export function questionFor({ expr = '', sentence = '', pattern = '', ko = '', note = '' } = {}) {
  const lib = libFor(pattern) || libFor(expr) || libFor(sentence);
  if (lib?.qEn) return { en: lib.qEn, ko: lib.q };
  if (note && /\?\s*$/.test(note)) return HANGUL.test(note) ? { en: '', ko: note } : { en: note, ko: '' };
  const topics = detectTopics(`${expr} ${sentence}`);
  if (topics.length) return { en: appQuestion(topics, new Set()), ko: '' };
  const G = ['How was your day?', 'What did you do today?', 'What are you doing these days?', 'Tell me about something fun you did recently.'];
  const h = [...(expr + sentence)].reduce((a, c) => a + c.charCodeAt(0), 0);
  return { en: G[h % G.length], ko: '' };
}
