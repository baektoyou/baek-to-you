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
const PROD = new Set(['speak', 'recall', 'review', 'review-retry', 'apply', 'express-recall', 'sp-call', 'sp-retry', 'sp-long']);
const START_KEY = 'gramSince';

// 분석할 문장: 내가 직접 만든 영어(따라 읽기 제외) · 영어 단어 2개 이상 · 아직 분석 안 한 것
const words = t => (String(t || '').match(/[A-Za-z']+/g) || []).length;
export function pending() { return D.get().attempts.filter(a => !a.g && PROD.has(a.step) && words(a.text) >= 2); }
export function since() { let s = D.get().settings[START_KEY]; if (!s) { s = Date.now(); D.setSetting(START_KEY, s); } return s; }
export const pendingNew = () => { const s = since(); return pending().filter(a => (a.at || 0) >= s); };
export const pendingOld = () => { const s = since(); return pending().filter(a => (a.at || 0) < s); };

let running = null;
export const isRunning = () => !!running;
// list: 분석할 시도들 · onStep(done, total)
export async function analyze(list, onStep) {
  if (running || !aiOn() || !list.length) return { error: !aiOn() ? 'off' : running ? 'busy' : '', done: 0 };
  let done = 0, error = '';
  running = (async () => {
    for (let i = 0; i < list.length; i += 8) {
      const chunk = list.slice(i, i + 8);
      const items = chunk.map(a => { const u = a.uttId && D.utt(a.uttId); return { aid: a.id, said: a.text, ko: u?.ko || '' }; });
      const r = await aiGrammar(items);
      if (r.error) { error = r.error; break; }
      D.saveGrammar(r.results);
      done += chunk.length; onStep?.(done, list.length);
    }
  })();
  try { await running; } finally { running = null; }
  window.dispatchEvent(new Event('b2u:grammar'));
  return { error, done };
}
// 새로 말한 문장: 6개 이상 모이면 조용히 분석
let t = null;
window.addEventListener('b2u:attempt', () => { clearTimeout(t); t = setTimeout(() => { const p = pendingNew(); if (p.length >= 6 && aiOn()) analyze(p.slice(0, 24)); }, 8000); });

// 통계: 종류별 실수 수 · 최근 2주 vs 그 전 2주 · 연습 연속 성공(새 실수가 생기면 0부터)
export function stats() {
  const ms = D.get().mistakes, now = Date.now(), W2 = 14 * 864e5;
  const by = new Map();
  ms.forEach(m => { if (!TAG[m.tag]) return; if (!by.has(m.tag)) by.set(m.tag, []); by.get(m.tag).push(m); });
  return [...by.entries()].map(([tag, list]) => {
    const ev = [];
    list.forEach(m => { ev.push({ at: m.at || 0, ok: false }); (m.practice || []).forEach(p => ev.push(p)); });
    ev.sort((a, b) => a.at - b.at);
    let streak = 0; ev.forEach(e => { streak = e.ok ? streak + 1 : 0; });
    const recent = list.filter(m => now - (m.at || 0) < W2).length, before = list.filter(m => { const d = now - (m.at || 0); return d >= W2 && d < 2 * W2; }).length;
    return { tag, ...TAG[tag], n: list.length, recent, before, streak, fixed: streak >= 3, list: list.slice().sort((a, b) => (b.at || 0) - (a.at || 0)) };
  }).sort((a, b) => (a.fixed - b.fixed) || (b.recent - a.recent) || (b.n - a.n));
}
export const mistakeCount = () => D.get().mistakes.filter(m => TAG[m.tag]).length; // 지금 쓰는 문법 종류만
export const analyzedCount = () => D.get().attempts.filter(a => a.g).length;
