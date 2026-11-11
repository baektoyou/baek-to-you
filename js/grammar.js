// 문법 노트 (SAVED › 문법): 내가 말한 영어 문장에서 문법 실수만 모아 종류별로 보고 연습
// · 말한 문장(시도 기록)을 AI가 8개씩 묶어 분석 → 실수마다 세부 문법 종류(tag) + 틀린 부분 → 맞는 부분 + 한 줄 설명
// · 표현만 더 자연스럽게 바꾸는 건 실수로 안 셈 (문법만) · AI 키가 없으면 분석하지 않음 (가짜 결과 X)
// · 새로 말한 문장은 몇 개 모이면 자동 분석 · 예전 기록은 ‘예전 기록 분석’ 버튼으로 (무료 사용량 보호: 한 번에 최대 48문장)
// · 같은 문법을 연습에서 3번 연속 맞히면 ‘거의 고쳤어’ (새로 또 틀리면 다시 0)
import * as D from './store.js';
import { aiOn, aiGrammar } from './ai.js';

// [key, 이름, 묶음, 짧은 규칙, 예시] · ‘빠진 단어’·‘단어 선택’ 종류는 안 씀 (예전에 모인 것도 안 보임)
export const TAGS = [
  ['past', '과거형', '시제', '이미 끝난 일은 과거형 (go → went, eat → ate)', 'I went there yesterday.'],
  ['present', '현재형', '시제', '습관·사실은 현재형 (I usually ~ / She likes ~)', 'I usually sleep at 1.'],
  ['progressive', '진행형 (be + ~ing)', '시제', '지금 하는 중이면 be + ~ing — be를 빼먹지 않기', "I'm watching it now."],
  ['perfect', '현재완료 (have p.p.)', '시제', '경험·계속·방금 끝남은 have + p.p.', "I've been there before."],
  ['perfect_prog', '현재완료진행 (have been ~ing)', '시제', '전부터 지금까지 계속하는 중이면 have been ~ing', "I've been practicing all day."],
  ['future', '미래 (will / be going to)', '시제', '앞으로 할 일은 will / be going to', "I'm going to sleep soon."],
  ['tense_mix', '시제 섞임', '시제', '한 문장 안에서 시점을 맞추기', 'I saw it and I loved it.'],
  ['agreement', '3인칭 단수 -s', '동사', 'he/she/it + 현재형이면 동사에 -s', 'She likes it.'],
  ['be_verb', 'be동사 (am/is/are)', '동사', '형용사·명사 앞엔 be동사가 필요 (I am tired)', "I'm so tired."],
  ['verb_form', '동사 모양 (원형·p.p.)', '동사', 'can/will/do 뒤엔 동사원형, have 뒤엔 p.p.', 'I can do it.'],
  ['to_ing', 'to부정사 · ~ing', '동사', 'want to ~ / enjoy ~ing 처럼 동사마다 정해진 꼴', 'I enjoy singing.'],
  ['modal', '조동사 (can·should·have to)', '동사', '조동사 뒤엔 동사원형, 의미에 맞는 조동사 고르기', 'You should try it.'],
  ['passive', '수동태 (be p.p.)', '동사', '~되다·~받다는 be + p.p.', 'It was made by me.'],
  ['phrasal', '구동사 (동사+전치사/부사)', '동사', 'look forward to, pick up 처럼 짝이 정해진 동사', "I'm looking forward to it."],
  ['article_a', '관사 a / an', '명사', '셀 수 있는 명사 하나엔 a/an', 'I have a cat.'],
  ['article_the', '관사 the', '명사', '서로 아는 것·특정한 것엔 the', 'Did you see the video?'],
  ['plural', '복수형 -s', '명사', '둘 이상이면 명사에 -s', 'I have two dogs.'],
  ['countable', '셀 수 있는/없는 명사', '명사', 'much/little = 못 세는 것, many/few = 세는 것', "I don't have much time."],
  ['pronoun', '대명사 (I/me/my)', '명사', '주어 I, 목적어 me, 소유 my 자리 구분', 'Tell me about it.'],
  ['possessive', "소유 ('s)", '명사', "누구의 것 = 's", "It's my friend's song."],
  ['prep_time', '시간 전치사 (at/on/in)', '전치사', 'at 시각 · on 요일·날짜 · in 달·해·아침', "I'll see you on Monday."],
  ['prep_place', '장소 전치사 (at/in/on/to)', '전치사', 'go to 장소 · at 지점 · in 안 · on 위', "I'm at home."],
  ['prep_other', '그 밖의 전치사', '전치사', 'listen to, wait for 처럼 짝이 정해진 전치사', "I'm listening to your song."],
  ['word_order', '어순', '문장', '주어 + 동사 + 목적어 순서, 부사 위치', 'I really like it.'],
  ['question', '의문문 만들기', '문장', '조동사/be를 주어 앞으로 (Do you ~? / Are you ~?)', 'Did you eat?'],
  ['negative', '부정문', '문장', "don't/doesn't/didn't + 동사원형", "I didn't know that."],
  ['missing_subject', '주어 빠짐', '문장', '영어는 주어를 거의 빼지 않아요 (I, it)', "It's so good."],
  ['extra_word', '필요 없는 단어', '문장', '겹치거나 불필요한 단어 빼기', 'I went home.'],
  ['conjunction', '접속사 (because·so·when)', '문장', '두 문장을 이을 땐 접속사 하나로', "I'm tired because I worked a lot."],
  ['relative', '관계사 (who·that·which)', '문장', '명사를 뒤에서 꾸밀 때 who/that/which', 'The song that I like.'],
  ['conditional', 'if 조건문 · 가정', '문장', 'if 뒤엔 현재형으로 미래 / 가정은 과거형', "If it rains, I'll stay home."],
  ['comparative', '비교급 · 최상급', '형용사·부사', '-er than / the -est, 긴 단어는 more/most', "It's better than before."],
  ['adj_adv', '형용사 · 부사', '형용사·부사', '동사를 꾸미면 부사 (-ly), 명사를 꾸미면 형용사', 'You sing so well.'],
  ['adj_ed_ing', '-ed / -ing 형용사', '형용사·부사', '내 기분은 -ed (bored), 원인은 -ing (boring)', "I'm so excited."],
  ['spelling', '철자 · 단어 모양', '단어', '단어 모양 바르게 쓰기', 'I received it.']
];
export const TAG = Object.fromEntries(TAGS.map(([k, l, g, r, e]) => [k, { k, label: l, group: g, rule: r, ex: e }]));
// AI가 붙인 종류 바로잡기: 실제로 바뀐 단어를 보고 판단 (예: 단어 속 글자 a가 틀린 철자 실수가 ‘관사’로 들어가는 것 방지)
// · 관사 = a/an/the 라는 ‘단어’가 빠지거나 더해지거나 바뀐 것만 · 한 단어 안의 글자만 다르면 철자
const ART = new Set(['a', 'an', 'the']);
const toks = t => String(t || '').toLowerCase().match(/[a-z']+/g) || [];
const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] !== b[j - 1])); return d[a.length][b.length]; };
export function fixTag(e) {
  const tag = e.tag, W = toks(e.wrong), R = toks(e.right);
  const only = (A, B) => { const b = B.slice(); return A.filter(x => { const i = b.indexOf(x); if (i < 0) return true; b.splice(i, 1); return false; }); };
  const dw = only(W, R), dr = only(R, W); // 틀린 쪽에만 있는 단어 · 고친 쪽에만 있는 단어
  const artDiff = [...dw, ...dr].filter(x => ART.has(x));
  const isArt = tag === 'article_a' || tag === 'article_the';
  if (isArt && artDiff.length) return artDiff.includes('the') ? 'article_the' : 'article_a';
  // 한 단어가 비슷한 한 단어로 바뀜 (글자만 다름) → 철자 / 어미만 다르면 그 문법
  const near = dw.length === 1 && dr.length === 1 && !ART.has(dw[0]) && !ART.has(dr[0]) && lev(dw[0], dr[0]) <= Math.max(1, Math.floor(Math.max(dw[0].length, dr[0].length) / 3));
  if (isArt && !artDiff.length) {
    if (!near) return (W.length || R.length) && (dw.length || dr.length) ? '' : tag; // 관사가 안 바뀌었는데 관사로 분류 → 알 수 없으면 버림
    const [a, b] = dw[0].length <= dr[0].length ? [dw[0], dr[0]] : [dr[0], dw[0]];
    if (b === a + 's' || b === a + 'es') return 'plural';
    if (b === a + 'ed' || b === a + 'd' || b === a + 'ing') return 'verb_form';
    return 'spelling';
  }
  if (tag === 'spelling' && !dw.filter(x => !ART.has(x)).length && !dr.filter(x => !ART.has(x)).length && artDiff.length) return artDiff.includes('the') ? 'article_the' : 'article_a';
  return tag;
}
const PROD = new Set(['speak', 'recall', 'review', 'review-retry', 'apply', 'express-recall', 'sp-call', 'sp-retry', 'sp-long']);
const START_KEY = 'gramSince';

// 분석할 문장: 내가 직접 만든 영어(따라 읽기 제외) · 영어 단어 2개 이상 · 아직 분석 안 한 것
const words = t => (String(t || '').match(/[A-Za-z']+/g) || []).length;
export function pending() { return D.get().attempts.filter(a => !a.g && PROD.has(a.step) && words(a.text) >= 2); }
export function since() { let s = D.get().settings[START_KEY]; if (!s) { s = Date.now(); D.setSetting(START_KEY, s); } return s; }
export const pendingNew = () => { const s = since(); return pending().filter(a => (a.at || 0) >= s); };
export const pendingOld = () => { const s = since(); return pending().filter(a => (a.at || 0) < s); };

const sleep = ms => new Promise(r => setTimeout(r, ms));
let running = null, lastSay = 0; // lastSay: 방금 말했으면 (CHAT·CALL 피드백이 먼저) 분석은 잠깐 기다림
export const isRunning = () => !!running;
// list: 분석할 시도들 · onStep(done, total)
export async function analyze(list, onStep, { patient = false } = {}) {
  if (running || !aiOn() || !list.length) return { error: !aiOn() ? 'off' : running ? 'busy' : '', done: 0 };
  let done = 0, error = '';
  running = (async () => {
    for (let i = 0; i < list.length; i += 8) {
      const chunk = list.slice(i, i + 8);
      const items = chunk.map(a => { const u = a.uttId && D.utt(a.uttId); return { aid: a.id, said: a.text, ko: u?.ko || '' }; });
      let r = await aiGrammar(items);
      // 전부 분석(patient): 무료 사용량(분당 횟수)에 걸리면 잠깐 쉬었다가 이어서 · 그래도 안 되면 거기까지 저장하고 멈춤
      for (let w = 0; patient && r.error === 'quota' && w < 3; w++) { onStep?.(done, list.length, true); await sleep(25000); r = await aiGrammar(items); }
      if (r.error) { error = r.error; break; }
      D.saveGrammar(r.results);
      done += chunk.length; onStep?.(done, list.length);
      if (patient && i + 8 < list.length) { await sleep(4500); while (Date.now() - lastSay < 15000) await sleep(3000); } // 분당 요청 수를 넘지 않게 천천히 · 말하는 중이면 양보
    }
  })();
  try { await running; } finally { running = null; }
  window.dispatchEvent(new Event('b2u:grammar'));
  return { error, done };
}
// 자동 분석: 버튼 없이 — 앱을 켜면 아직 분석 안 한 문장 전부(예전 기록 포함), 새로 말할 때마다 조금 뒤에 이어서
// · 말하는 중엔 기다렸다가 20초 조용하면 한 번에 묶어서 (AI 요청 수 아끼기) · 사용 한도에 걸리면 10분 쉬고 자동으로 다시
let prog = null, coolUntil = 0, t = null;
export const progress = () => prog; // {done, total, wait} | null
export const cooling = () => Date.now() < coolUntil;
export async function autoRun(force = false) {
  if (running || prog || !aiOn() || (!force && cooling())) return;
  const list = pending().sort((a, b) => (b.at || 0) - (a.at || 0)); if (!list.length) return;
  const tell = () => window.dispatchEvent(new Event('b2u:gramprog'));
  prog = { done: 0, total: list.length, wait: false }; tell();
  const r = await analyze(list, (done, total, wait) => { prog = { done, total, wait: !!wait }; tell(); }, { patient: true });
  if (r.error && r.error !== 'busy') { coolUntil = Date.now() + (r.error === 'quota' ? 600000 : 120000); schedule(coolUntil - Date.now() + 1000); }
  prog = null; tell();
}
function schedule(ms) { clearTimeout(t); t = setTimeout(() => { if (document.visibilityState === 'visible') autoRun(); }, ms); }
window.addEventListener('b2u:attempt', () => { lastSay = Date.now(); schedule(20000); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && pending().length) schedule(6000); });
schedule(6000);

// 통계: 종류별 실수 수 · 최근 2주 vs 그 전 2주 · 연습 연속 성공(새 실수가 생기면 0부터)
export function stats() {
  const ms = D.get().mistakes, now = Date.now(), W2 = 14 * 864e5;
  const by = new Map();
  const seen = new Set(); // 두 기기에서 같은 문장을 각각 분석했을 때 겹친 것은 한 번만
  ms.forEach(m => { const t = fixTag(m); if (!TAG[t]) return; const key = `${m.aid}|${t}|${m.wrong}|${m.right}`; if (m.aid && seen.has(key)) return; seen.add(key); if (!by.has(t)) by.set(t, []); by.get(t).push(m); }); // 예전에 잘못 분류된 것도 볼 때 바로잡음
  return [...by.entries()].map(([tag, list]) => {
    const ev = [];
    list.forEach(m => { ev.push({ at: m.at || 0, ok: false }); (m.practice || []).forEach(p => ev.push(p)); });
    ev.sort((a, b) => a.at - b.at);
    let streak = 0; ev.forEach(e => { streak = e.ok ? streak + 1 : 0; });
    const recent = list.filter(m => now - (m.at || 0) < W2).length, before = list.filter(m => { const d = now - (m.at || 0); return d >= W2 && d < 2 * W2; }).length;
    return { tag, ...TAG[tag], n: list.length, recent, before, streak, fixed: streak >= 3, list: list.slice().sort((a, b) => (b.at || 0) - (a.at || 0)) };
  }).sort((a, b) => (a.fixed - b.fixed) || (b.recent - a.recent) || (b.n - a.n));
}
export const mistakeCount = () => D.get().mistakes.filter(m => TAG[fixTag(m)]).length; // 지금 쓰는 문법 종류만
export const analyzedCount = () => D.get().attempts.filter(a => a.g).length;
