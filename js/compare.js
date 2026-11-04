// 텍스트 비교 — 단어 단위 비교만 수행 (발음·억양 채점 아님)
const CONTRACTIONS = [
  [/\bwon't\b/g, 'will not'], [/\bcan't\b/g, 'can not'], [/\bcannot\b/g, 'can not'], [/\bain't\b/g, 'is not'], [/\blet's\b/g, 'let us'],
  [/n't\b/g, ' not'], [/'re\b/g, ' are'], [/'ve\b/g, ' have'], [/'ll\b/g, ' will'], [/'d\b/g, ' would'], [/'m\b/g, ' am'],
  [/\b(it|that|what|there|he|she|who|here|how|where)'s\b/g, '$1 is'], [/\bgonna\b/g, 'going to'], [/\bwanna\b/g, 'want to'], [/\bgotta\b/g, 'got to']
];
const STOP = new Set('a an the to of and or but so is am are was were be been being i you he she it we they me my your his her its our their this that these those in on at for with do does did not just very really oh um uh like yeah well okay ok'.split(' '));
const SYN = { great: 'good', nice: 'good', awesome: 'good', fine: 'good', glad: 'happy', delighted: 'happy', sad: 'unhappy', tired: 'exhausted', sleepy: 'exhausted', huge: 'big', large: 'big', little: 'small', tiny: 'small', begin: 'start', finish: 'end', yummy: 'delicious', tasty: 'delicious', film: 'movie', fans: 'fan', guys: 'everyone', everybody: 'everyone', pal: 'friend', buddy: 'friend', want: 'like', hey: 'hi', hello: 'hi', thanks: 'thank', glad: 'happy' };

export function normalize(t) {
  let s = (t || '').toLowerCase().replace(/[’‘`]/g, "'");
  CONTRACTIONS.forEach(([r, v]) => (s = s.replace(r, v)));
  return s.replace(/[^a-z0-9'\s]/g, ' ').replace(/'/g, '').replace(/\s+/g, ' ').trim();
}
export const tokens = t => normalize(t).split(' ').filter(Boolean);
export function stem(w) {
  w = SYN[w] || w;
  if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ied')) w = w.slice(0, -3) + 'y';
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('es') && !w.endsWith('ses')) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  return SYN[w] || w;
}

// 단어 LCS diff → [{w, op:'same'|'miss'|'extra'}]
export function diff(user, target) {
  const a = tokens(user), b = tokens(target);
  const as = a.map(stem), bs = b.map(stem);
  const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = as[i] === bs[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const ops = []; let i = 0, j = 0;
  while (i < n && j < m) {
    if (as[i] === bs[j]) { ops.push({ w: b[j], op: 'same' }); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) { ops.push({ w: a[i], op: 'extra' }); i++; }
    else { ops.push({ w: b[j], op: 'miss' }); j++; }
  }
  while (i < n) ops.push({ w: a[i++], op: 'extra' });
  while (j < m) ops.push({ w: b[j++], op: 'miss' });
  const lcs = L[0][0];
  const overlap = n + m ? (2 * lcs) / (n + m) : 0;
  const content = b.filter(w => !STOP.has(w)).map(stem);
  const uset = new Set(as);
  const hit = content.filter(w => uset.has(w)).length;
  const keyRecall = content.length ? hit / content.length : overlap;
  const missingKeys = [...new Set(b.filter(w => !STOP.has(w) && !uset.has(stem(w))))];
  return { ops, overlap, keyRecall, missingKeys, score: Math.round((overlap * 0.5 + keyRecall * 0.5) * 100) };
}

// 여러 예시 중 가장 가까운 문장
export function best(user, candidates) {
  let top = null;
  candidates.filter(c => c && c.text).forEach(c => { const d = diff(user, c.text); if (!top || d.score > top.d.score) top = { ...c, d }; });
  return top;
}

export function verdict(score) {
  if (score >= 85) return { label: '거의 그대로예요!', tone: 'great' };
  if (score >= 60) return { label: '핵심 단어가 잘 들어갔어요', tone: 'good' };
  if (score >= 35) return { label: '다른 표현 같아요 — 뜻이 통하는지 확인해봐요', tone: 'mid' };
  return { label: '예시와 많이 달라요 — 뜻이 같다면 그것도 정답!', tone: 'low' };
}

// 자주 하는 실수 — 확실한 패턴만 (일부 규칙 기반)
const RULES = [
  [/\bi am agree\b/i, 'I am agree', 'I agree', 'agree는 동사라서 am이 필요 없어요'],
  [/\bvery like\b/i, 'very like', 'really like', '좋아한다를 강조할 땐 really like'],
  [/\bmore better\b/i, 'more better', 'better', 'better 자체가 비교급'],
  [/\bdiscuss about\b/i, 'discuss about', 'discuss', 'discuss 뒤엔 about 없이'],
  [/\benjoy to \w+/i, 'enjoy to ~', 'enjoy ~ing', 'enjoy 뒤엔 동명사'],
  [/\bi am (so )?boring\b/i, 'I am boring', 'I am bored', '내가 지루함을 느낄 땐 bored'],
  [/\bi am (so )?interesting in\b/i, 'interesting in', 'interested in', '관심 있다 = interested in'],
  [/\bexplain me\b/i, 'explain me', 'explain to me', 'explain은 to가 필요해요'],
  [/\bhe (don't|do not)\b/i, 'he don\'t', 'he doesn\'t', '3인칭 단수는 doesn\'t'],
  [/\bshe (don't|do not)\b/i, 'she don\'t', 'she doesn\'t', '3인칭 단수는 doesn\'t'],
  [/\bi (was|am) (very )?(excite|bore|interest|tire)\b/i, 'I am excite', 'I am excited', '감정 형용사는 -ed'],
  [/\bhow about you\?? how about you\b/i, '', '', ''],
  [/\bmany informations?\b/i, 'many information', 'a lot of information', 'information은 셀 수 없는 명사'],
  [/\bi have \d+ years old\b/i, 'I have N years old', 'I am N years old', '나이는 be동사'],
  [/\bsee you later later\b/i, '', '', '']
];
export function mistakes(text) {
  return RULES.filter(r => r[1] && r[0].test(text || '')).map(r => ({ from: r[1], to: r[2], why: r[3] }));
}

// 패턴 하이라이트: "I've been ~ing" → 고정 단어 부분을 <mark>
export function markPattern(sentence, pattern, esc) {
  const safe = esc(sentence);
  if (!pattern) return safe;
  const parts = pattern.split(/~|\.\.\.|…|\(.*?\)|\[.*?\]|\bsomething\b|\bsomeone\b|\bA\b|\bB\b/).map(s => s.trim()).filter(s => s.length > 1);
  let out = safe;
  parts.forEach(p => {
    const re = new RegExp('(' + esc(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]") + ')', 'i');
    out = out.replace(re, '<mark>$1</mark>');
  });
  return out;
}

export const isQuestion = t => /\?\s*$/.test(t || '') || /^(what|how|why|when|where|who|which|do|does|did|are|is|can|could|would|will|have|have you|any)\b/i.test((t || '').trim());
export { STOP };
