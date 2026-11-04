// APPLY 피드백 & 패턴 사전 — 무료·오프라인 규칙 기반 (AI 아님)
// · 규칙으로 확실히 잡을 수 있는 문법/자연스러움만 알려줘요.
// · 선택: LanguageTool 공개 API(무료, 외부 전송) — 사용자가 버튼을 눌렀을 때만 호출
import { tokens } from './compare.js';

// ---------- 패턴 사전 ----------
const P = (re, ko, ex, q, frame) => ({ re, ko, ex, q, frame });
const LIB = [
  P(/\b(i'?ve|have|has|i have) been\b.*(~|ing)|been ~ing/i, '최근부터 지금까지 계속 ~하고 있어', ["I've been studying English.", "I've been listening to music a lot.", "I've been feeling tired lately."], '요즘 계속하고 있는 일이 있나요?', "I've been ______."),
  P(/can'?t wait to/i, '빨리 ~하고 싶어 (너무 기대돼)', ["I can't wait to see you.", "I can't wait to go home.", "I can't wait to try that cafe."], '요즘 제일 기다려지는 게 뭐예요?', "I can't wait to ______."),
  P(/looking forward to/i, '~를 기대하고 있어', ["I'm looking forward to the weekend.", "I'm looking forward to seeing you.", "I'm looking forward to your new album."], '요즘 기대하고 있는 일이 있나요?', "I'm looking forward to ______."),
  P(/\bused to\b/i, '예전엔 ~하곤 했어 (지금은 아니야)', ['I used to play piano.', 'I used to hate coffee.', 'I used to live in Busan.'], '예전엔 자주 했지만 지금은 안 하는 게 있나요?', 'I used to ______.'),
  P(/\b(i'?m|am|be) used to\b/i, '~에 익숙해', ["I'm used to waking up early.", "I'm used to the cold.", "I'm used to it now."], '이제는 익숙해진 일이 있나요?', "I'm used to ______."),
  P(/(going to|gonna)/i, '~할 거야 (계획)', ["I'm going to meet my friend tonight.", "I'm going to study after dinner.", "I'm going to sleep early."], '이번 주말에 뭐 할 거예요?', "I'm going to ______."),
  P(/want to|wanna/i, '~하고 싶어', ['I want to travel to Japan.', 'I want to sleep early tonight.', 'I want to see your concert.'], '요즘 하고 싶은 게 뭐예요?', 'I want to ______.'),
  P(/need to/i, '~해야 해', ['I need to finish my homework.', 'I need to drink more water.', 'I need to take a break.'], '오늘 꼭 해야 하는 일이 있나요?', 'I need to ______.'),
  P(/trying to/i, '~하려고 노력 중이야', ["I'm trying to sleep earlier.", "I'm trying to eat healthy.", "I'm trying to speak English every day."], '요즘 노력하고 있는 게 있나요?', "I'm trying to ______."),
  P(/feel like/i, '~한 기분이야 / ~하고 싶은 기분', ['I feel like eating something sweet.', 'I feel like I can do it.', 'I feel like staying home today.'], '지금 어떤 게 하고 싶은 기분이에요?', 'I feel like ______.'),
  P(/have you ever/i, '~해 본 적 있어?', ['Have you ever been to Jeju?', 'Have you ever tried mint chocolate?', 'Have you ever seen the ocean at night?'], '친구에게 어떤 경험을 물어보고 싶나요?', 'Have you ever ______?'),
  P(/\binto\b/i, '요즘 ~에 빠져 있어', ["I'm really into baking these days.", "I'm into this song.", "I'm so into this drama."], '요즘 빠져 있는 게 뭐예요?', "I'm really into ______."),
  P(/thank(s| you) for/i, '~해줘서 고마워', ['Thank you for waiting.', 'Thanks for listening to me.', 'Thank you for always being there.'], '최근에 누군가에게 고마웠던 일은?', 'Thank you for ______.'),
  P(/it'?s been .*since|it'?s been/i, '~한 지 (시간이) 됐어', ["It's been a long time since I saw you.", "It's been two years since I started.", "It's been a while."], '오랜만에 한 일이 있나요?', "It's been ______ since ______."),
  P(/^let'?s\b|\blet'?s ~/i, '~하자', ["Let's grab some food.", "Let's take a picture.", "Let's do our best."], '친구에게 같이 하자고 하고 싶은 게 있나요?', "Let's ______."),
  P(/not sure (if|whether)/i, '~인지 잘 모르겠어', ["I'm not sure if I can make it.", "I'm not sure if it's right.", "I'm not sure if he knows."], '요즘 확신이 안 서는 일이 있나요?', "I'm not sure if ______."),
  P(/ended up/i, '결국 ~하게 됐어', ['I ended up staying home.', 'I ended up eating too much.', 'I ended up watching the whole series.'], '계획과 달리 결국 하게 된 일이 있나요?', 'I ended up ______.'),
  P(/don'?t have to/i, '~ 안 해도 돼', ["You don't have to worry.", "You don't have to be perfect.", "You don't have to come."], '누군가에게 “괜찮아, 안 해도 돼”라고 말하고 싶은 것은?', "You don't have to ______."),
  P(/make sure/i, '꼭 ~해 / 확실히 ~해', ['Make sure to eat well.', 'Make sure you get some rest.', 'Make sure to drink water.'], '친구에게 꼭 챙기라고 하고 싶은 게 있나요?', 'Make sure to ______.'),
  P(/\bmiss\b/i, '~가 그리워 / 보고 싶어', ['I miss my family.', 'I miss summer.', 'I miss you guys.'], '요즘 그리운 게 있나요?', 'I miss ______.'),
  P(/about to/i, '막 ~하려던 참이야', ['I was about to call you.', "I'm about to leave.", 'I was about to sleep.'], '방금 하려던 일이 있었나요?', 'I was about to ______.'),
  P(/\bi hope\b/i, '~하면 좋겠어', ['I hope you sleep well.', 'I hope it doesn\'t rain tomorrow.', 'I hope we meet again soon.'], '요즘 바라는 게 있나요?', 'I hope ______.'),
  P(/\bi think\b/i, '내 생각엔 ~인 것 같아', ["I think it's going to rain.", 'I think you look great today.', 'I think I need a break.'], '오늘 하루에 대해 어떻게 생각해요?', 'I think ______.'),
  P(/\b(i'?m|i am) (so|really)\b/i, '나 너무 ~해', ["I'm so happy right now.", "I'm really tired today.", "I'm so excited for tomorrow."], '지금 기분을 한 단어로 말하면?', "I'm so ______."),
  P(/\bi love\b/i, '~하는 게 정말 좋아', ['I love walking at night.', 'I love this song so much.', 'I love it when it snows.'], '정말 좋아하는 순간이 있나요?', 'I love ______.')
];
export function patternInfo(u) {
  const pat = (u.pattern || '').trim();
  const hit = pat ? LIB.find(p => p.re.test(pat)) : null;
  const ownEx = (u.examples || []).filter(Boolean);
  const src = [u.en?.easy, u.en?.natural, u.en?.advanced].filter(Boolean);
  const frame = u.frame || hit?.frame || (pat ? framify(pat) : (src[0] ? src[0].split(/\s+/).slice(0, 2).join(' ') + ' ______.' : '______'));
  return {
    pattern: pat || (src[0] ? frame.replace('______', '~').replace(/\.$/, '') : ''),
    ko: u.patternKo || hit?.ko || '',
    sample: u.en?.natural || u.en?.easy || u.text || '',
    examples: ownEx.length ? ownEx : (hit?.ex || []),
    question: u.question || hit?.q || '이 패턴으로 내 이야기를 한 문장 만들어 볼까요?',
    frame, known: !!(hit || u.patternKo), hasPattern: !!pat
  };
}
const framify = p => {
  let f = p.replace(/\s*(~|\.\.\.|…|\(.*?\)|\[.*?\]|\bsomething\b|\bsomeone\b|\bA\b|\bB\b)\s*/g, ' ______ ').replace(/\s+/g, ' ').trim();
  f = f.replace(/\s+([,.?!])/g, '$1');
  if (!f.includes('______')) f += ' ______';
  return /[.?!]$/.test(f) ? f : f + (/^(have|do|did|are|is|can|what|how|why|where|when|who)\b/i.test(f) ? '?' : '.');
};
// 패턴의 고정 단어 (예: "I've been ~ing" → ["i've been"])
export function patternParts(pattern) {
  return String(pattern || '').split(/~|\.\.\.|…|_{2,}|\(.*?\)|\[.*?\]|\bsomething\b|\bsomeone\b|\bA\b|\bB\b/).map(s => s.replace(/[.?!]/g, '').trim()).filter(s => s.length > 1 && !/^ing$/i.test(s));
}
const canon = t => tokens(t).join(' ');
export function usesPattern(text, pattern) {
  const parts = patternParts(pattern); if (!parts.length) return null;
  const c = ' ' + canon(text) + ' ';
  return parts.every(p => c.includes(' ' + canon(p) + ' ') || c.includes(canon(p)));
}

// ---------- 규칙 기반 점검 ----------
const ING = w => { w = w.toLowerCase(); if (/ie$/.test(w)) return w.slice(0, -2) + 'ying'; if (/[^aeiou]e$/.test(w) && w !== 'be' && w !== 'see') return w.slice(0, -1) + 'ing'; if (/^(run|sit|swim|stop|get|put|shop|plan|hit|cut|begin|chat)$/.test(w)) return w + w.slice(-1) + 'ing'; return w + 'ing'; };
const BASE = { went: 'go', ate: 'eat', saw: 'see', did: 'do', came: 'come', took: 'take', got: 'get', made: 'make', bought: 'buy', slept: 'sleep', wrote: 'write', spoke: 'speak', had: 'have', met: 'meet', felt: 'feel', heard: 'hear', knew: 'know', thought: 'think', told: 'tell', said: 'say' };
const VERBS = 'go|eat|see|watch|do|make|be|have|get|buy|sleep|study|learn|travel|meet|visit|play|listen|talk|say|know|take|come|try|start|stop|work|rest|sing|dance|read|write|cook|drink|call|tell|show|hear|feel|live|stay|leave|move|practice|exercise|run|walk|swim|relax|change|join|help|share|finish';
const TOV = 'go|eat|see|watch|do|make|be|get|buy|sleep|study|learn|travel|meet|visit|play|listen|talk|say|know|take|come|sing|dance|read|write|cook|tell|hear|feel|live|stay|leave|move|exercise|swim|relax|join';
const ADJ_AFTER_BEEN = /^(so|really|very|too|busy|tired|sick|good|great|fine|okay|ok|happy|sad|stressed|bored|there|here|a|an|the|to|in|at|on|with|such|pretty|super|quite|kind|lonely|nervous|excited|worried|sleepy|exhausted|better|worse)$/;
const RULES = [
  // [정규식, 바꿀말(문자열|함수), 설명, 종류]
  [/\bi\b/g, 'I', '“I(나)”는 항상 대문자', 'style'],
  [/\b(I|i) (am|'m) agree\b/gi, 'I agree', 'agree는 동사라서 am이 필요 없어요', 'grammar'],
  [/\b(I|i)'?m agree\b/gi, 'I agree', 'agree는 동사라서 am이 필요 없어요', 'grammar'],
  [/\b(I|we|you|they) (is)\b/gi, (m, s) => `${s} ${s.toLowerCase() === 'i' ? 'am' : 'are'}`, '주어에 맞는 be동사', 'grammar'],
  [/\b(he|she|it) (are)\b/gi, (m, s) => `${s} is`, '3인칭 단수는 is', 'grammar'],
  [/\b(he|she|it) (don't|do not)\b/gi, (m, s) => `${s} doesn't`, '3인칭 단수는 doesn\'t', 'grammar'],
  [/\b(he|she) have\b/gi, (m, s) => `${s} has`, '3인칭 단수는 has', 'grammar'],
  [/\bvery like\b/gi, 'really like', '좋아한다를 강조할 땐 really like', 'grammar'],
  [/\b(I|i) very (\w+)/g, (m, s, w) => `I really ${w}`, '동사를 꾸밀 땐 very 대신 really', 'grammar'],
  [/\bmore better\b/gi, 'better', 'better 자체가 비교급', 'grammar'],
  [/\bdiscuss about\b/gi, 'discuss', 'discuss 뒤엔 about 없이', 'grammar'],
  [/\benjoy to (\w+)/gi, (m, w) => `enjoy ${ING(w)}`, 'enjoy 뒤엔 ~ing', 'grammar'],
  [/\b(I|i)('m| am) (so )?boring\b/g, (m, s, a, so) => `I'm ${so || ''}bored`, '내가 지루할 땐 bored (boring은 “지루하게 만드는”)', 'grammar'],
  [/\binteresting in\b/gi, 'interested in', '관심 있다 = interested in', 'grammar'],
  [/\b(I|i)('m| am| was) (so |very |really )?(excite|bore|interest|tire|surprise|confuse)\b/g, (m, s, be, adv, w) => `I${be} ${adv || ''}${w}d`, '감정 형용사는 -ed', 'grammar'],
  [/\bexplain me\b/gi, 'explain to me', 'explain은 to가 필요해요', 'grammar'],
  [/\bmany informations?\b/gi, 'a lot of information', 'information은 셀 수 없는 명사', 'grammar'],
  [/\b(I|i) have (\d+) years old\b/g, (m, s, n) => `I'm ${n} years old`, '나이는 be동사', 'grammar'],
  [new RegExp(`\\b(want|wants|wanted|need|needs|needed|hope|hoped|plan|planned|decide|decided|tried|forgot|like|love|have) (${TOV})\\b`, 'gi'), (m, a, b) => /^(like|love|have)$/i.test(a) && !/^(go|eat|see|watch|sleep|study|travel|play|sing|cook|read|swim)$/i.test(b) ? m : `${a} to ${b}`, '“~하고 싶다/해야 한다” 뒤엔 to + 동사', 'grammar'],
  [new RegExp(`\\bcan'?t wait (${VERBS})\\b`, 'gi'), (m, w) => `can't wait to ${w}`, 'can\'t wait 뒤엔 to + 동사', 'grammar'],
  [new RegExp(`\\blooking forward to (${VERBS})\\b`, 'gi'), (m, w) => `looking forward to ${ING(w)}`, 'look forward to 뒤엔 ~ing', 'grammar'],
  [/\b(didn't|did not|don't|doesn't|do not|does not) (went|ate|saw|did|came|took|got|made|bought|slept|wrote|spoke|had|met|felt|heard|knew|thought|told|said)\b/gi, (m, a, b) => `${a} ${BASE[b.toLowerCase()]}`, 'didn\'t/don\'t 뒤엔 동사원형', 'grammar'],
  [/\b(can|could|will|would|should|must|might) (went|ate|saw|came|took|got|made|bought|slept)\b/gi, (m, a, b) => `${a} ${BASE[b.toLowerCase()]}`, '조동사 뒤엔 동사원형', 'grammar'],
  [/\b(english|korean|japanese|chinese|korea|japan|china|seoul|busan|jeju|baekhyun|exo|christmas|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|april|june|july|august|september|october|november|december)\b/g, w => w === 'exo' ? 'EXO' : w[0].toUpperCase() + w.slice(1), '고유명사·언어·요일은 대문자로 시작해요', 'style'],
  [/\ba (?!one\b|once\b|uni|use|euro|u\b)([aeio]\w*)/gi, (m, w) => `an ${w}`, '모음 소리 앞엔 an', 'grammar'],
  [/\bvery very\b/gi, 'really', 'very very보다 really가 자연스러워요', 'natural'],
  [/\b(I) am\b(?! (not )?sure\b)/g, "I'm", '말할 땐 축약형(I\'m)이 더 자연스러워요', 'natural'],
  [/\b(I) have been\b/g, "I've been", '말할 땐 I\'ve been이 더 자연스러워요', 'natural'],
  [/\b(do|does|did|is|are|was|were|can|could|would|should|have|has) not\b/gi, (m, a) => a.toLowerCase() === 'can' ? "can't" : `${a}n't`, '말할 땐 축약형이 더 자연스러워요', 'natural'],
  [/\b(I) will\b/g, "I'll", '말할 땐 I\'ll이 더 자연스러워요', 'natural'],
  [/\b(it|that|what) is\b/gi, (m, a) => `${a}'s`, '말할 땐 축약형이 더 자연스러워요', 'natural']
];
export function checkSentence(text, pattern = '') {
  let s = String(text || '').trim().replace(/\s+/g, ' ');
  if (!s) return null;
  const issues = [];
  for (const [re, to, why, type] of RULES) {
    re.lastIndex = 0;
    const m = s.match(re); if (!m) continue;
    const before = s;
    s = s.replace(re, to);
    if (s !== before) {
      if (type === 'style' && issues.some(i => i.type === 'style')) continue;
      const from = m[0]; re.lastIndex = 0; const toStr = typeof to === 'string' ? to : from.replace(re, to);
      issues.push({ type, from, to: toStr, why });
    }
  }
  // 패턴 사용 여부 + ~ing 패턴 점검
  let uses = usesPattern(s, pattern);
  if (pattern && /~\s*ing|~ing/i.test(pattern)) {
    const lead = patternParts(pattern)[0];
    if (lead) {
      const re = new RegExp('\\b' + lead.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]?").replace(/\s+/g, '\\s+') + '\\s+(\\w+)', 'i');
      const m = s.match(re);
      if (m && !/ing$/i.test(m[1])) {
        if (ADJ_AFTER_BEEN.test(m[1].toLowerCase())) issues.push({ type: 'pattern', from: m[0], to: '', why: `문법은 맞아요. 이번 패턴(${pattern})으로 말하려면 동사 ~ing를 넣어보세요.` });
        else { const fixed = m[0].replace(new RegExp(m[1] + '$'), ING(m[1])); issues.push({ type: 'pattern', from: m[0], to: fixed, why: `${pattern} 패턴은 동사에 ~ing를 붙여요` }); s = s.replace(m[0], fixed); }
      }
    }
  }
  // 첫 글자 대문자 + 문장부호 (조용히 다듬기)
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (!/[.?!]$/.test(s)) s += /^(do|does|did|are|is|am|can|could|would|will|have|has|what|how|why|where|when|who|which)\b/i.test(s) ? '?' : '.';
  uses = usesPattern(s, pattern);
  return { fixed: s, issues, usesPattern: uses, changed: canonLoose(s) !== canonLoose(text) };
}
const canonLoose = t => String(t || '').toLowerCase().replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim();

// ---------- 선택: LanguageTool 공개 API (무료 · 문장이 외부 서버로 전송됨) ----------
export async function languageTool(text) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const body = new URLSearchParams({ text, language: 'en-US', enabledOnly: 'false' });
    const r = await fetch('https://api.languagetool.org/v2/check', { method: 'POST', body, signal: ctl.signal, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    let fixed = text;
    const matches = (j.matches || []).filter(m => m.replacements?.length);
    [...matches].sort((a, b) => b.offset - a.offset).forEach(m => { fixed = fixed.slice(0, m.offset) + m.replacements[0].value + fixed.slice(m.offset + m.length); });
    return { ok: true, fixed, issues: (j.matches || []).map(m => ({ from: text.substr(m.offset, m.length), to: m.replacements?.[0]?.value || '', why: m.message })) };
  } catch (e) { return { ok: false, error: e.name === 'AbortError' ? '시간 초과' : '연결 실패' }; }
  finally { clearTimeout(t); }
}

// ---------- Claude(무료 채팅)에 붙여넣을 피드백 요청문 ----------
export function claudePrompt({ text, pattern, intent }) {
  return `영어 문장 피드백을 부탁해. 내가 원래 하려던 의미는 최대한 유지해줘.
${intent ? `하려던 말(한국어): ${intent}\n` : ''}${pattern ? `연습 중인 패턴: ${pattern}\n` : ''}내 문장: ${text}

아래 형식으로 짧게 답해줘.
1) 문법적으로 맞는지 (맞다/틀리다 + 한 줄 이유)
2) 고친 문장
3) 원어민이 일상 대화에서 더 자연스럽게 말하는 버전 1~2개
4) 개선 포인트 한 줄 (한국어)`;
}
