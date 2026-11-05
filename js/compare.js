// 텍스트 비교 — 단어 단위 비교만 수행 (발음·억양 채점 아님)
const CONTRACTIONS = [
  [/\bwon't\b/g, 'will not'], [/\bcan't\b/g, 'can not'], [/\bcannot\b/g, 'can not'], [/\bain't\b/g, 'is not'], [/\blet's\b/g, 'let us'],
  [/n't\b/g, ' not'], [/'re\b/g, ' are'], [/'ve\b/g, ' have'], [/'ll\b/g, ' will'], [/'d\b/g, ' would'], [/'m\b/g, ' am'],
  [/\b(it|that|what|there|he|she|who|here|how|where)'s\b/g, '$1 is'], [/\bgonna\b/g, 'going to'], [/\bwanna\b/g, 'want to'], [/\bgotta\b/g, 'got to'], [/\ball right\b/g, 'alright'], [/'cause\b/g, 'because'], [/\bcuz\b/g, 'because'], [/\bokay\b/g, 'ok'], [/\bya\b/g, 'you']
];
const STOP = new Set('a an the to of and or but so is am are was were be been being i you he she it we they me my your his her its our their this that these those in on at for with do does did not just very really oh um uh like yeah well okay ok'.split(' '));
const SYN = { great: 'good', nice: 'good', awesome: 'good', fine: 'good', glad: 'happy', delighted: 'happy', sad: 'unhappy', tired: 'exhausted', sleepy: 'exhausted', huge: 'big', large: 'big', little: 'small', tiny: 'small', begin: 'start', finish: 'end', yummy: 'delicious', tasty: 'delicious', film: 'movie', fans: 'fan', guys: 'everyone', everybody: 'everyone', pal: 'friend', buddy: 'friend', want: 'like', hey: 'hi', hello: 'hi', thanks: 'thank', glad: 'happy' };

const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
export function normalize(t) {
  let s = (t || '').toLowerCase().replace(/[’‘`]/g, "'");
  CONTRACTIONS.forEach(([r, v]) => (s = s.replace(r, v)));
  s = s.replace(/&/g, ' and ').replace(/\b(\d{1,2})\b/g, (m, n) => NUM[+n] || m);
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

// ---------- 유사 발음 매칭 (STT가 고유명사·신조어를 다르게 받아 적어도 맞은 걸로) ----------
export function lev(a, b) {
  const m = a.length, n = b.length; if (!m || !n) return m || n;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
// 대략적인 소리 키: 철자 차이(ph/f, c/k, 모음 등)를 뭉개서 비교
export function phon(w) {
  return w.toLowerCase().replace(/[^a-z]/g, '')
    .replace(/ph/g, 'f').replace(/gh/g, 'g').replace(/ck|q/g, 'k').replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k')
    .replace(/x/g, 'ks').replace(/z/g, 's').replace(/wh/g, 'w').replace(/v/g, 'b').replace(/th/g, 't')
    .replace(/(?!^)[aeiouyhw]+/g, '').replace(/(.)\1+/g, '$1');
}
export function near(a, b) {
  if (a === b) return true;
  if (Math.min(a.length, b.length) === 3 && Math.max(a.length, b.length) === 4 && a[0] === b[0] && !STOP.has(a) && !STOP.has(b) && lev(a, b) === 1) return true;
  if (a.length < 4 || b.length < 4) return false;
  const sim = 1 - lev(a, b) / Math.max(a.length, b.length);
  const pa = phon(a), pb = phon(b);
  if (Math.max(a.length, b.length) <= 5) return sim >= 0.75 && pa === pb; // 짧은 단어는 엄격하게 (were/where 등 문법 차이 보존)
  if (sim >= 0.75) return true;
  return pa.length >= 3 && (pa === pb || (pa.length >= 4 && 1 - lev(pa, pb) / Math.max(pa.length, pb.length) >= 0.75 && sim >= 0.5));
}
// "back hyun" → "baekhyun" 처럼 띄어 받아 적은 단어를 예시 단어에 맞춰 합치기
function mergeSplits(a, b) {
  const bs = new Set(b.map(stem)), out = [];
  for (let i = 0; i < a.length; i++) {
    let hit = null;
    for (const n of [3, 2]) {
      if (i + n > a.length) continue;
      const parts = a.slice(i, i + n);
      if (parts.filter(p => bs.has(stem(p))).length > 0) continue;
      const j = parts.join('');
      const t = b.find(w => w.length >= 5 && !a.includes(w) && (w === j || near(j, w)));
      if (t) { hit = { t, n, heard: parts.join(' ') }; break; }
    }
    if (hit) { out.push({ w: hit.t, heard: hit.heard }); i += hit.n - 1; }
    else out.push({ w: a[i] });
  }
  return out;
}

// 단어 LCS diff → [{w, op:'same'|'near'|'miss'|'extra', heard?}]
export function diff(user, target) {
  const b = tokens(target);
  const ua = mergeSplits(tokens(user), b);
  const a = ua.map(x => x.w);
  const as = a.map(stem), bs = b.map(stem);
  const n = a.length, m = b.length;
  const eq = (i, j) => as[i] === bs[j] ? (ua[i].heard ? 2 : 1) : (near(a[i], b[j]) || near(as[i], bs[j]) ? 2 : 0);
  const E = Array.from({ length: n }, (_, i) => Array.from({ length: m }, (_, j) => eq(i, j)));
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = E[i][j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const ops = []; let i = 0, j = 0;
  const matched = new Set();
  while (i < n && j < m) {
    if (E[i][j] && L[i][j] === L[i + 1][j + 1] + 1) {
      ops.push(E[i][j] === 2 ? { w: b[j], op: 'near', heard: ua[i].heard || a[i] } : { w: b[j], op: 'same' });
      matched.add(j); i++; j++;
    }
    else if (L[i + 1][j] >= L[i][j + 1]) { ops.push({ w: a[i], op: 'extra' }); i++; }
    else { ops.push({ w: b[j], op: 'miss' }); j++; }
  }
  while (i < n) ops.push({ w: a[i++], op: 'extra' });
  while (j < m) ops.push({ w: b[j++], op: 'miss' });
  const lcs = L[0][0];
  const overlap = n + m ? (2 * lcs) / (n + m) : 0;
  // 핵심 단어: 순서와 상관없이 비슷하게라도 말했으면 인정
  const hitWord = w => as.some((x, k) => x === stem(w) || near(a[k], w));
  const content = b.filter(w => !STOP.has(w));
  const hit = content.filter(hitWord).length;
  const keyRecall = content.length ? hit / content.length : overlap;
  const missingKeys = [...new Set(content.filter(w => !hitWord(w)))];
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
// 패턴은 쉼표로 여러 개 등록할 수 있어요: "I've been ~ing, can't wait to ~"
export const splitPatterns = p => String(p || '').split(/\s*[,，]\s*/).map(x => x.trim()).filter(Boolean);
export function markPattern(sentence, pattern, esc, extra = []) {
  const safe = esc(sentence);
  const pats = Array.isArray(pattern) ? pattern : splitPatterns(pattern);
  if (!pats.length && !extra.length) return safe;
  const parts = pats.flatMap(p => p.split(/~|\.\.\.|…|_{2,}|\(.*?\)|\[.*?\]|\bsomething\b|\bsomeone\b|\bA\b|\bB\b/)).map(s => s.replace(/[.?!]+$/, '').trim()).filter(s => s.length > 1)
    .concat(extra.filter(Boolean)).sort((a, b) => b.length - a.length);
  let out = safe;
  parts.forEach(p => {
    const body = esc(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/&#39;|'/g, "(?:'|’|&#39;)");
    const re = new RegExp('(^|[^\\w>])(' + body + ')(?![^<]*</mark>)', 'i');
    out = out.replace(re, (m, a, b) => `${a}<mark>${b}</mark>`);
  });
  return out;
}

// ---------- Before → After 비교 (표시용 단어 단위 diff) ----------
// 원래 문장 표기(대소문자·문장부호)를 그대로 두고, 비교만 정규화해서 해요.
const wkey = w => { const n = normalize(w); return n.replace(/\s+/g, ' '); };
export function splitWords(t) { return String(t || '').trim().split(/\s+/).filter(Boolean); }
export function diffWords(before, after) {
  const A = splitWords(before), B = splitWords(after);
  const a = A.map(wkey), b = B.map(wkey);
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] && a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const ops = []; let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] && a[i] === b[j]) { ops.push({ op: 'same', a: A[i], b: B[j] }); i++; j++; }
    else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) { ops.push({ op: 'add', b: B[j] }); j++; }
    else { ops.push({ op: 'del', a: A[i] }); i++; }
  }
  // 바뀐 부분 묶음: [빠진 말, 들어간 말]
  const hunks = []; let cur = null;
  ops.forEach(o => {
    if (o.op === 'same') { if (cur) { hunks.push(cur); cur = null; } return; }
    cur = cur || { from: [], to: [] };
    if (o.op === 'del') cur.from.push(o.a); else cur.to.push(o.b);
  });
  if (cur) hunks.push(cur);
  const same = ops.filter(o => o.op === 'same').length;
  const sim = n + m ? (2 * same) / (n + m) : 1;
  return {
    ops, sim,
    hunks: hunks.map(h => ({ from: h.from.join(' '), to: h.to.join(' ') })).filter(h => wkey(h.from) !== wkey(h.to) && (h.from || h.to).replace(/[^\w]/g, '')),
    before: A.map((w, k) => ({ w, changed: false })), after: B
  };
}

export const isQuestion = t => /\?\s*$/.test(t || '') || /^(what|how|why|when|where|who|which|do|does|did|are|is|can|could|would|will|have|have you|any)\b/i.test((t || '').trim());
export { STOP };
