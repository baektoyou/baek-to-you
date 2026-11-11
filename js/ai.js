// AI (Gemini 무료 키 · 또는 ChatGPT 키) — 사용자가 SETTINGS에 넣은 자기 키로 브라우저에서 바로 요청
// · 키는 이 기기에만 저장 (동기화·JSON 백업 제외)
// · 쓰는 곳: 영어 교정·의미 평가·표현 추천(CHAT·CALL·SAVED) / 영어 질문 답변 / 대화하기 질문·표현 / 다음 질문 고르기
// · 안 되면(꺼짐 · 키 없음 · 한도 초과 · 오프라인) 앱 안의 규칙 피드백으로 자동 전환
import * as D from './store.js';
import { parseFixes } from './speech.js';
import { improve } from './feedback.js';
import { judgeTranslation, judgeReply, bestReply } from './judge.js';

// 키는 계정마다 따로 (같은 기기에서 다른 계정으로 로그인해도 서로의 키가 보이지 않음)
const LEGACY = 'baek-to-you:aikeys';
const KEYS = () => 'baek-to-you:aikeys:' + D.accountKey();
(() => { try { const old = localStorage.getItem(LEGACY); if (old) { const k = 'baek-to-you:aikeys:' + (localStorage.getItem('b2u:acct') || localStorage.getItem('b2u:lastUid') || 'guest'); if (!localStorage.getItem(k)) localStorage.setItem(k, old); localStorage.removeItem(LEGACY); } } catch { } })();
export const aiKeys = () => { try { return JSON.parse(localStorage.getItem(KEYS()) || '{}'); } catch { return {}; } };
export const setAiKeys = p => { try { localStorage.setItem(KEYS(), JSON.stringify({ ...aiKeys(), ...p })); } catch { } };
export const clearAiKeys = (acct = D.accountKey()) => { try { localStorage.removeItem('baek-to-you:aikeys:' + acct); } catch { } };
export const PROVIDERS = [['gemini', 'Gemini'], ['openai', 'ChatGPT']];
export const DEFAULT_MODEL = { gemini: 'gemini-3.5-flash-lite', openai: 'gpt-4o-mini' };
const GEMINI_FALLBACK = 'gemini-3.1-flash-lite'; // 기본 모델이 이 키에서 안 될 때 한 번 더 시도
let geminiOk = null;
export const provider = () => { const p = D.get().settings.aiProvider; return p === 'openai' ? 'openai' : 'gemini'; };
export const aiOn = () => D.get().settings.aiOn !== false && !!aiKeys()[provider()];

const parse = t => { try { return JSON.parse(String(t || '').replace(/^\s*```(json)?|```\s*$/g, '').trim()); } catch { return null; } };
const errOf = s => s === 400 || s === 401 || s === 403 ? 'key' : s === 429 ? 'quota' : s === 404 ? 'model' : `http_${s}`;
// 시스템 지시 + 사용자 내용 → JSON
// AI 오류(한도 초과·키 오류·연결 끊김)는 화면에 한 번 알려줌 (그동안은 앱 규칙 피드백)
const errSeen = {};
function noteErr(r) {
  if (r && r.error && ['quota', 'key', 'network', 'model'].includes(r.error) && Date.now() - (errSeen[r.error] || 0) > 600000) {
    errSeen[r.error] = Date.now();
    window.dispatchEvent(new CustomEvent('b2u:aierr', { detail: r.error }));
  }
  return r;
}
export async function callAI(sys, user, opt) { return noteErr(await callAI0(sys, user, opt)); }
async function callAI0(sys, user, { ms = 15000, temp = 0.35 } = {}) {
  if (!aiOn()) return null;
  const p = provider(), k = aiKeys(), ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  try {
    if (p === 'gemini') {
      const own = (k.geminiModel || '').trim();
      const models = own ? [own] : [geminiOk || DEFAULT_MODEL.gemini, GEMINI_FALLBACK].filter((x, i, l) => l.indexOf(x) === i);
      let r;
      for (const model of models) { // 기본 모델이 없다고(404) 하면 다른 Flash-Lite로 한 번 더
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json', 'x-goog-api-key': k.gemini },
          body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { temperature: temp, responseMimeType: 'application/json' } })
        });
        if (r.ok) { if (!own) geminiOk = model; break; }
        if (r.status !== 404) break;
      }
      if (!r.ok) return { error: errOf(r.status), status: r.status };
      const j = await r.json();
      return parse((j.candidates?.[0]?.content?.parts || []).map(x => x.text || '').join('')) || { error: 'parse' };
    }
    const model = (k.openaiModel || '').trim() || DEFAULT_MODEL.openai;
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json', authorization: `Bearer ${k.openai}` },
      body: JSON.stringify({ model, temperature: temp, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }] })
    });
    if (!r.ok) return { error: errOf(r.status), status: r.status };
    return parse((await r.json()).choices?.[0]?.message?.content) || { error: 'parse' };
  } catch (e) { return { error: e.name === 'AbortError' ? 'timeout' : 'network' }; } finally { clearTimeout(t); }
}
export const AI_ERR = { key: 'API 키가 맞지 않아요', quota: '사용 한도를 넘었어요 · 잠시 뒤 다시', model: '모델 이름을 확인해주세요', parse: 'AI 응답을 읽지 못했어요', timeout: '응답이 너무 늦어요', network: '연결할 수 없어요 · 인터넷 확인' };
const ok = a => a && !a.error;
const clip = (t, n = 300) => String(t || '').slice(0, n);
const COACH = `You are a warm, friendly native-English speaking coach for a Korean learner (casual, encouraging, never stiff).
The learner practices by watching K-pop idol Baekhyun's video clips and speaking English. Their sentence comes from speech recognition (accent, intonation, speed and short pauses can cause sound-alike mistakes), so ignore capitalization, punctuation and obvious recognition glitches (e.g. "to to").`;
// 호칭: 'ladies' → 에리 (영어 문장에서는 Aeri) — 콘텐츠·AI가 만든 문장 모두
export const fixAddr = t => String(t ?? '').replace(/\bladies\b/gi, 'Aeri');
// 백현이 말투 (AI가 만든 대사 · 실제 발언처럼 꾸미지 않음) — 2026.11.09 (ac) 말투 규칙
const BH_VOICE = `KOREAN CHAT LINES IN BAEKHYUN'S VOICE (an AI practice voice — never claim these are his real words):
Style
- Cute, playful but sweet close-friend 반말, like real messenger texts: short and spontaneous. Vary length, structure and emotion with the situation — never the same stock line twice in a row.
- Learning tips stay easy to understand, said in his relaxed way. No forced aegyo, no repeated praise. "잘했어"/"아까워" alone is not enough — react to the ACTUAL result.
- Call the learner "에리"/"우리 에리" only sometimes. Never "ladies" (in English use "Aeri").
Punctuation & spelling
- Allowed: ㅎㅎ, ㅎㅎㅎㅎㅎ, ㅜㅜ, !, ?!, !!!, ..., .., ㅋㅋㅋㅋㅋ, ~~~~, ?...., !ㅎㅎ, ~~~>< (~~~>< only rarely).
- NEVER write ㅠㅠ — always ㅜㅜ. When a sentence continues after "..." or "ㅜㅜ", put one space ("아까워.. ㅜㅜ 근데 …").
- Spelling and spacing need not be perfect. Natural playful variants are welcome: 몬가, 쪼꼼, 나왔더, 안해버린다~~, 해버릴거야!!!, 몬가 좋은데?!ㅎㅎ, run-together words like 와집와서기절해서자다깼는뎀.
- ❤️ ONLY for the very best result (perfect and natural). No other emoji, no ♡/♥, no 뿌잉.
- No counselor tone, no mechanical empathy, no teacher jargon. Never invent facts about his life, schedule or other people.
- English lines stay natural, casual conversational English.`;

// ---------- 1) 피드백 ----------
// 기능별 평가 기준과 응답 형식 (README ‘AI 응답 형식’과 같음)
const FB_SYS = `${COACH}
${BH_VOICE}

Return ONLY this JSON:
{
 "level": "perfect" | "good" | "partial" | "off",
 "correct": true if level is perfect or good,
 "awkward": true ONLY if a native speaker would find the learner's sentence clearly unnatural,
 "feedback": Baekhyun's Korean chat reply — 1–2 SHORT separate messages (each ≤ 40 chars) joined with "\\n". The correction explanation lives HERE (there is no separate explanation box): if anything needs fixing, name the actual English word(s) and say the single most important point simply (e.g. "근데 could 말고 couldn't!!\\n못 잤다는 거니까ㅎㅎ"). If nothing needs fixing, no correction at all.
 "said_ko": a faithful natural Korean translation of the learner's sentence AS THEY SAID IT (what it actually means — even if it is wrong; use the meant words for speech-recognition glitches),
 "fixes": ONLY clear errors (wrong tense/agreement/verb form, wrong preposition, a word that changes the meaning, missing key meaning) — [{"wrong": EXACT substring of the learner's sentence, "right": replacement, "why": Korean ≤ 24 chars}]. NOT fixes: synonyms, optional words, contractions, fine article/word-order choices, style preferences, speech-recognition glitches. [] if none.
 "asr": likely speech-recognition errors (sound-alikes like eight/ate, their/there, a dropped a/the/to, a misheard name) — [{"heard": EXACT substring, "meant": what they probably said}]. Judge as if they said the meant words.
 "natural": see the mode rules ("" when the mode says so),
 "rec_marks": EXACT substrings of the recommended sentence (see modes) that correspond to what the learner got wrong or left out — only those words, never the whole sentence. [] if nothing needed fixing.
 "rec_ko": an ACCURATE natural Korean translation of the recommended sentence (same meaning, same tense — do not add or drop anything),
 "expressions": 0–2 chunks worth saving ONLY if genuinely useful (a chunk the learner missed or got wrong, or the key pattern). [] for simple sentences or when the learner already used it well. Copy EXACTLY from the recommended sentence (2–6 words). Each MUST have all three fields: {"en": "...", "ko": Korean meaning in this context, "use": Baekhyun-voice casual Korean 반말 ≤ 36 chars — when/how to use it (e.g. "요즘 얘기할 때 딱이야!")} — never 존댓말/해요체.
 "used_target": true/false (review/answer modes only)
}

MODE translate — CHAT and CALL 전화하기
The learner plays Baekhyun: they translate HIS real Korean line (from a video) into English as if they were him. Their sentence is NOT a message to Baekhyun: never answer its content, never ask a new question, never continue the conversation — only evaluate the translation.
The reference English was written by the app owner and is shown as the recommended sentence as-is; never rewrite it. Recommended sentence = the reference.
Evaluate step by step:
 1) Meaning — every key piece of information in the Korean line conveyed? (who, what, negation, quantity, feeling, question vs statement)
 2) Tense & person — same time (past / present / ongoing / future) and the same subject?
 3) Grammar — clear errors only.
 4) Naturalness — would a native speaker say it like this?
 Level: perfect = 1–4 all fine (any wording with the same meaning counts) · good = meaning right, one small grammar slip or slightly awkward · partial = main idea there but key info missing/wrong or wrong tense · off = different meaning, Korean, or unrelated.
 "natural" = "" unless the learner's own sentence is awkward or has fixes — then their own sentence minimally fixed (never copy the reference).
 "feedback" by level — perfect: specific delight (❤️ allowed only here, sparingly) · good: praise + the one small point · partial: what they got right + what was missing/wrong · off: a kind nudge about what the line actually means.

If a "Target expression" is given (SAVED expression review): focus "feedback" on that expression — did the learner use it (or say that part naturally)? Name the expression in the feedback. correct still needs the whole meaning; using a different natural phrase for that part is OK but gently show the saved expression.

MODE long — CALL 백현이랑 대화하기 (free conversation)
The learner answered Baekhyun's question in their own words. correct = an on-topic, sensible answer (grammar slips are fixes, not "incorrect").
 "natural" = the BEST natural way a native speaker would actually say WHAT THE LEARNER MEANT — casual, idiomatic, spoken English (not textbook). Keep their meaning, content, facts and opinion exactly (never invent details or give a different answer); keep their own words where they are already natural, and replace awkward or Korean-style phrasing with the expression a native would really use. Break long run-on speech into natural sentences. ALWAYS give it. Recommended sentence = "natural". "rec_marks" = the words of "natural" that differ from what the learner said.
 "feedback" = Baekhyun's Korean chat: one short reaction to what they told him + the key fix in plain words if any. Do NOT ask the next question here (that is generated separately).

MODE reply — the learner answered a question; same rules as long.

MODE review — SAVED: the learner answered a review question and should use the target expression/sentence. correct only if it fits the question AND uses the target (or its meaning). "natural" = their answer using the target. Recommended sentence = "natural".

MODE answer — SAVED 답장: the learner replied to Baekhyun's practice message, asked to use the target expression. No single right answer: correct = the reply makes sense and the meaning comes across (grammar slips are fixes; not using the target is NOT wrong). "natural" = the learner's OWN reply kept as close as possible, fixed only where needed, using the target if it fits naturally. If their reply is already natural, return it unchanged — do not over-correct. Recommended sentence = "natural".

SAVED (review/answer): keep Baekhyun's current warm, playful SAVED tone. Never correct a sentence that is already fine.
If the learner used Korean: level "off", correct=false, feedback "이번엔 영어로 해볼까!?ㅎㅎ".`;
function fbUser(b) {
  return [`Mode: ${b.mode}`, b.notReal ? 'Note: the reference sentence is an AI-polished version of the learner\'s own answer, NOT Baekhyun\'s real line — explain it as a suggestion.' : '', b.ko ? `Baekhyun's Korean line: ${clip(b.ko)}` : '', b.target ? `Reference / target English: ${clip(b.target)}` : '', b.expr ? `Target expression: ${clip(b.expr, 80)}` : '',
    b.question ? `Baekhyun's question/message (English): ${clip(b.question)}` : '', b.qko ? `(Korean: ${clip(b.qko)})` : '', b.use?.length ? `Suggested expressions: ${b.use.slice(0, 6).join(' | ')}` : '', b.words ? `Registered names/words (speech recognition may mishear these, e.g. "Back" for "Baekhyun"): ${clip(b.words, 200)}` : '', `Learner said: ${clip(b.said, 900)}`].filter(Boolean).join('\n');
}
// 추천 표현을 썼는지 (단어 형태가 조금 달라도: like → liked, be into → I'm into)
export function usedIn(said, expr) {
  const stem = w => w.replace(/(ing|ed|es|s)$/, '');
  const S = String(said || '').toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean).map(stem);
  const E = String(expr || '').toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(w => w && !/^(be|am|is|are|was|were|someone|something|sb|sth|one's|my|your|a|an|the)$/.test(w)).map(stem);
  if (!E.length) return false;
  for (let i = 0; i < S.length; i++) { let j = 0, k = i; while (k < S.length && j < E.length && k - i < E.length + 2) { if (S[k] === E[j]) j++; k++; } if (j === E.length) return true; }
  return false;
}
const cleanX = x => fixAddr(String(x || '').replace(/\s+/g, ' ').trim());
const expand = t => t.replace(/\b(i|you|we|they|he|she|it|that|there|what)'(m|re|s|ve|ll|d)\b/g, (m, a, b) => a + ' ' + ({ m: 'am', re: 'are', s: 'is', ve: 'have', ll: 'will', d: 'would' })[b]).replace(/\b(do|does|did|is|are|was|were|have|has|can|could|would|should|won)n't\b/g, (m, a) => (a === 'won' ? 'will' : a === 'can' ? 'can' : a) + ' not').replace(/\bcan not\b/g, 'cannot');
// 말투 규칙 강제: ㅠㅠ → ㅜㅜ · ‘…’, ‘ㅜㅜ’ 뒤에 말이 이어지면 한 칸
export const bhTone = t => String(t || '').replace(/ㅠ/g, 'ㅜ').replace(/♡|♥/g, '').replace(/(\.{2,}|ㅜ{2,})(?=[가-힣A-Za-z0-9])/g, '$1 ');
const cleanF = x => bhTone(fixAddr(String(x || '').replace(/\\n/g, '\n'))).split(/\n+/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean).filter((l, i, a) => a.indexOf(l) === i).slice(0, 3).join('\n'); // 줄바꿈 유지 · 같은 문장 반복 제거
const goodX = t => /^[A-Za-z~(][A-Za-z' ,.!?~…/()-]*$/.test(t) && t.split(' ').length <= 8; // 표현 (패턴 ~ 허용)
const goodChunk = t => /^[A-Za-z][A-Za-z' ,.!?-]*$/.test(t) && t.split(' ').length <= 8 && !/[a-z][.!?][A-Za-z]/.test(t) && t.split(' ').every(w => w.length <= 16);
// AI 비교(cmp) 검사: 내 문장 조각을 이어 붙이면 실제로 말한 문장이 되는지 · 축약형(it's = it is)은 고친 걸로 보지 않음
const normC = t => expand(String(t || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim());
// 추천 문장에서 고친·빠뜨린 부분만 (rec_marks) → 하이라이트
function recMarks(m, rec) {
  const r = String(rec || '').toLowerCase();
  const marks = (Array.isArray(m) ? m : []).map(cleanX).filter(x => x && r.includes(x.toLowerCase()) && x.length < rec.length * 0.8).slice(0, 4);
  return { marks, idx: null };
}
function cleanCmp(c, said, rec) {
  if (!c || !Array.isArray(c.mine)) return null;
  const mine = c.mine.map(x => ({ t: cleanX(x?.t), k: ['ok', 'wrong', 'extra', 'add'].includes(x?.k) ? x.k : 'ok', to: x?.k === 'wrong' ? cleanX(x?.to) : '' })).filter(x => x.t);
  if (!mine.length || normC(mine.filter(x => x.k !== 'add').map(x => x.t).join(' ')) !== normC(said)) return null;
  for (let i = 0; i < mine.length - 1; i++) { // wrong "it's" + add "it is" 같은 축약형 차이 → 그대로 맞음
    const a = mine[i], b = mine[i + 1];
    const pair = (a.k === 'wrong' || a.k === 'extra') && b.k === 'add' ? [a, b] : a.k === 'add' && (b.k === 'wrong' || b.k === 'extra') ? [b, a] : null;
    if (pair && normC(pair[0].t) === normC(pair[1].t)) { pair[0].k = 'ok'; mine.splice(mine.indexOf(pair[1]), 1); i--; }
  }
  const changed = mine.some(x => x.k !== 'ok');
  const rl = String(rec || '').toLowerCase(), ns = ' ' + normC(said) + ' ';
  const marks = !changed ? [] : (Array.isArray(c.rec_marks) ? c.rec_marks : []).map(cleanX).filter(m => m && rl.includes(m.toLowerCase()) && m.length < rl.length * 0.8)
    .filter(m => !(/'/.test(m) && ns.includes(' ' + normC(m) + ' '))).slice(0, 5);
  return { mine, marks, reason: cleanX(c.reason).slice(0, 70) };
}
// 반환 {correct, feedback, fixes:[{wrong,right,why}], natural, xs:[{text,ko}], ai}
export async function smartFeedback({ mode, said, target = '', ko = '', question = '', qko = '', pattern = '', expr = '', replies = [], use = [], notReal = false }) {
  const words = parseFixes(D.get().settings.sttFix).terms.concat(['Baekhyun', 'Aeri']).filter((x, i, a) => a.indexOf(x) === i).join(', ');
  // 긴 말(대화하기 3라운드 등)은 시간이 더 걸려서 여유 있게 · 시간 초과·한도·연결 문제면 잠깐 뒤 한 번 더
  const long = said.length > 220 || mode === 'long';
  const ask = () => callAI(FB_SYS, fbUser({ mode, said, target, ko, question, qko, expr, words, use, notReal }), { temp: 0.2, ms: long ? 30000 : 15000 });
  let a = await ask();
  if (a?.error && ['timeout', 'quota', 'network', 'parse'].includes(a.error)) { await new Promise(r => setTimeout(r, 1800)); a = await ask(); }
  if (ok(a) && typeof a.feedback === 'string') {
    const sl = said.toLowerCase();
    const minor = f => { const n = x => String(x || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim(); const w = n(f.wrong), r = n(f.right); return !w || w === r || expand(w) === expand(r); };
    const asr = (Array.isArray(a.asr) ? a.asr : []).filter(x => x && x.heard && x.meant && sl.includes(String(x.heard).toLowerCase()) && cleanX(x.heard).toLowerCase() !== cleanX(x.meant).toLowerCase()).slice(0, 2).map(x => ({ heard: cleanX(x.heard), meant: cleanX(x.meant) }));
    const asrSet = new Set(asr.map(x => x.heard.toLowerCase()));
    const fixes = (Array.isArray(a.fixes) ? a.fixes : []).filter(f => f && f.wrong && sl.includes(String(f.wrong).toLowerCase()) && !asrSet.has(String(f.wrong).toLowerCase()) && !minor(f)).slice(0, 3).map(f => ({ wrong: cleanX(f.wrong), right: cleanX(f.right), why: cleanX(f.why).slice(0, 50) }));
    // 맞게 말했고 어색하지 않으면 ‘더 자연스럽게’를 억지로 보여주지 않음
    const own = mode === 'reply' || mode === 'long' || mode === 'answer'; // 질문하기·대화하기: 내 대답을 원어민처럼 다듬은 문장
    const nat = (own || a.awkward === true || fixes.length || !a.correct) ? cleanX(a.natural) : '';
    const usedAI = new Set((Array.isArray(a.used) ? a.used : []).map(x => cleanX(x).toLowerCase()));
    const natF = nat && nat.toLowerCase().replace(/[^a-z ]/g, '') !== sl.replace(/[^a-z ]/g, '') ? nat : '';
    const recShown = mode === 'translate' ? target : (natF || (own ? said : ''));
    return {
      correct: a.level ? (a.level === 'perfect' || a.level === 'good') : !!a.correct, level: ['perfect', 'good', 'partial', 'off'].includes(a.level) ? a.level : '', feedback: cleanF(a.feedback).slice(0, 160), asr, fixes, cmp: recShown ? recMarks(a.rec_marks ?? a.cmp?.rec_marks, recShown) : null, used: use.filter(u => usedAI.has(u.toLowerCase()) || usedIn(said, u)),
      saidKo: cleanX(a.said_ko).slice(0, 160),
      natural: natF,
      xs: (Array.isArray(a.expressions) ? a.expressions : []).map(x => ({ text: cleanX(x?.en), ko: cleanX(x?.ko), use: cleanX(x?.use).slice(0, 80) })).filter(x => goodX(x.text) && x.ko).slice(0, 2),
      why: '', recKo: cleanX(a.rec_ko).slice(0, 120),
      usedTarget: a.used_target === true || (!!expr && usedIn(said, expr)),
      ai: true
    };
  }
  // ---- 규칙 피드백 (AI 꺼짐·실패) ----
  const ev = mode === 'translate' ? judgeTranslation(said, target) : judgeReply(said, { question, expr: mode === 'review' ? expr : '', strict: mode === 'reply' || (mode === 'review' && !!question) });
  // 답장 연습은 정답이 하나가 아니라서, 규칙 판정으로는 영어로 답했으면 틀렸다고 하지 않음
  if (mode === 'answer' && !/[가-힣]/.test(said) && said.trim().split(/\s+/).length >= 2) ev.ok = true;
  const imp = await improve(said, { pattern: pattern || expr, useLT: true });
  const fixes = (imp.changes || []).filter(c => c.from && said.toLowerCase().includes(c.from.toLowerCase())).slice(0, 3).map(c => ({ wrong: c.from, right: c.to, why: c.why || '' }));
  // 규칙 피드백: 질문하기·대화하기는 내 문장을 고친 것만 (다른 사람 예시 답변은 추천하지 않음)
  const nat = !imp.same ? imp.after : '';
  const msg = ev.ok ? '오오~~~ 잘했어!!ㅎㅎ' : ev.level === 'off' && ev.title === '영어로 말해볼까요?' ? '이번엔 영어로 해볼까!?ㅎㅎ' : '아까워어.. ㅜㅜ\n이 문장도 한번 봐봐!!'; // 규칙 판정은 표현이 다르면 틀리게 볼 수 있어서 단정하지 않음
  return { correct: ev.ok, feedback: msg, fixes, asr: [], usedTarget: !!expr && usedIn(said, expr), used: use.filter(u => usedIn(said, u)), natural: mode === 'translate' ? (imp.same ? '' : imp.after) : nat && nat.toLowerCase() !== said.toLowerCase() ? nat : '', xs: [], ai: false };
}

// ---------- 2) 영어 질문하기 (채팅) ----------
const QA_SYS = `${COACH}
${BH_VOICE}
The learner asks a question about English (meaning, nuance, how to say something, grammar). Answer as Baekhyun would to a close friend: casual Korean 반말, warm and a little playful, but the English explanation must be accurate and useful. Short (max 5 lines), with 1–2 natural English example sentences.
Return ONLY JSON: {"answer": "...", "expressions": [{"en": short useful chunk, "ko": meaning}] (0–3)}`;
export async function aiAsk(q, ctx = {}) {
  if (!aiOn()) return { error: 'off' };
  const a = await callAI(QA_SYS, [ctx.ko ? `Current Baekhyun line (Korean): ${clip(ctx.ko)}` : '', ctx.en ? `Its English: ${clip(ctx.en)}` : '', `Learner question: ${clip(q, 600)}`].filter(Boolean).join('\n'), { temp: 0.5 });
  if (!ok(a) || !a.answer) return { error: a?.error || 'parse' };
  return { answer: bhTone(String(a.answer)), xs: (a.expressions || []).map(x => ({ text: cleanX(x?.en), ko: cleanX(x?.ko) })).filter(x => goodChunk(x.text)).slice(0, 3) };
}

// ---------- 드래그 저장: 문맥에 맞는 한국어 뜻 ----------
export async function aiGloss({ phrase, sentence = '', ko = '' }) {
  if (!aiOn()) return null;
  const a = await callAI(`You give the Korean meaning of an English word or phrase AS USED in the given sentence (its meaning in this context, not a dictionary list). Natural, short Korean (max 20 characters). Return ONLY JSON {"ko": "..."}.`,
    [`Phrase: ${clip(phrase, 80)}`, `Sentence: ${clip(sentence, 300)}`, ko ? `Korean context (what the sentence means): ${clip(ko, 200)}` : ''].filter(Boolean).join('\n'), { ms: 10000, temp: 0.2 });
  return ok(a) && a.ko ? cleanX(a.ko).slice(0, 40) : null;
}

// ---------- 3) 대화하기: 질문에 맞는 추천 표현 + 다음 질문 ----------
const KIT_SYS = `${COACH}
${BH_VOICE}
You help the learner keep a real conversation going with Baekhyun. Expressions must change with the conversation: read the WHOLE dialog so far and suggest what the learner could say NEXT.
Return ONLY JSON:
{"next": Baekhyun's follow-up that gets the learner to SAY MORE in English: first a short, playful or caring reaction to THEIR details, then ONE open question that invites them to explain, describe an experience, give a reason or add an opinion (why / how / what was it like / tell me more about …) — never a yes/no question. Casual spoken English, 1–2 short sentences {"en": "...", "ko": Baekhyun-voice Korean 반말 following the voice rules} — or null if the learner has not answered yet,
 "mine": 0–3 expressions copied EXACTLY from the learner's studied list that would fit naturally in their answer to the question they will answer next (the "next" question, or the current question if next is null). Empty if none really fit — never force one,
 "expressions": 4–6 NEW real English expressions for answering that question, built from THIS dialog — the learner's own topic, people, places, feelings and details (e.g. if they said they love ballads, suggest things like "hits different at night", "gives me chills"). Mix: reacting/agreeing, adding detail or reason, giving an example, asking Baekhyun back. Not generic fillers, nothing the learner already used, nothing in "Already suggested". Each {"en": 2–7 words, "ko": short Korean meaning}}`;
// dialog: [{q: 백현이 질문(영어), a: 내 대답}] · learned: SAVED 표현·단어 [{text, ko}]
export async function aiKit({ question, qko, history = [], dialog = null, avoid = [], learned = [] }) {
  if (!aiOn()) return null;
  const dl = dialog || history.map(h => ({ q: '', a: h }));
  const a = await callAI(KIT_SYS, [`Current question from Baekhyun: ${clip(question)}`, qko ? `(Korean: ${clip(qko)})` : '',
    dl.length ? `Dialog so far:\n${dl.map(d => `${d.q ? `Baekhyun: ${clip(d.q, 200)}\n` : ''}Learner: ${clip(d.a, 400)}`).join('\n')}` : 'The learner has not answered yet — suggest expressions for answering the current question.',
    learned.length ? `Learner's studied expressions: ${learned.slice(0, 40).map(x => x.text).join(' | ')}` : '', avoid.length ? `Already suggested (do not repeat): ${avoid.slice(-30).join(' | ')}` : ''].filter(Boolean).join('\n'), { temp: 0.8, ms: 20000 });
  if (!ok(a)) return null;
  const said = dl.map(d => d.a).join(' ').toLowerCase(), av = new Set(avoid.map(x => String(x).toLowerCase()));
  const lmap = new Map(learned.map(x => [x.text.toLowerCase(), x]));
  const mine = (Array.isArray(a.mine) ? a.mine : []).map(t => lmap.get(cleanX(t?.en || t).toLowerCase())).filter(Boolean).filter(x => !av.has(x.text.toLowerCase())).slice(0, 3).map(x => ({ text: x.text, ko: x.ko || '', mine: true }));
  const fresh = (a.expressions || []).map(x => ({ text: cleanX(x?.en), ko: cleanX(x?.ko) })).filter(x => goodChunk(x.text) && !av.has(x.text.toLowerCase()) && !said.includes(x.text.toLowerCase()) && !lmap.has(x.text.toLowerCase()));
  return {
    xs: [...mine, ...fresh].filter((x, i, l) => l.findIndex(y => y.text.toLowerCase() === x.text.toLowerCase()) === i).slice(0, 8),
    next: a.next && a.next.en ? { en: cleanX(a.next.en), ko: bhTone(cleanX(a.next.ko)) } : null
  };
}
// ---------- 4) 질문하기: 대화 흐름에 맞는 다음 질문 고르기 ----------
export async function aiPickNext(history, cands) {
  if (!aiOn() || cands.length < 2) return 0;
  const a = await callAI(`${COACH}\nPick the question Baekhyun should ask next so the conversation flows naturally from what was just said. Return ONLY JSON {"index": number}.`,
    `Conversation so far:\n${history.slice(-6).map(h => '- ' + clip(h, 200)).join('\n')}\n\nCandidate questions:\n${cands.map((c, i) => `${i}: ${clip(c, 160)}`).join('\n')}`, { ms: 8000, temp: 0.2 });
  const i = ok(a) ? +a.index : 0;
  return Number.isInteger(i) && i >= 0 && i < cands.length ? i : 0;
}

// ---------- 5) SAVED 답장 연습: 백현이가 먼저 건네는 연습용 메시지 (저장한 표현으로 답하기 좋게) ----------
const REPLY_SYS = `${COACH}
${BH_VOICE}
The learner saved an English expression and wants to practice using it by replying to Baekhyun in a chat.
Write ONE short chat message from Baekhyun that ASKS THE LEARNER A QUESTION (casual spoken English, 1–2 short sentences, MUST end with "?") — a question whose most natural answer uses the saved expression.
Check before answering: write the sample reply first in your head — it must answer the question directly AND contain the expression naturally (same meaning and grammar as the expression). If the expression would feel forced in the answer, change the question.
Analyse the expression's meaning, grammar and the original context first, then pick an everyday situation where replying with it would feel natural (e.g. "can't wait to" → he mentions something coming up and asks what the learner is looking forward to).
Never force it: no quiz-like or awkward questions ("Use X in a sentence", "What does X mean?"), never mention the expression itself, no made-up facts about his real life.
Return ONLY JSON {"en": the question, "ko": "자연스러운 반말 번역", "sample": a natural reply that answers the question and contains the expression exactly}`;
export async function aiReplyLine({ expr, ko = '', context = '', avoid = [] }) {
  if (!aiOn()) return null;
  const user = [`Saved expression: ${clip(expr, 80)}`, ko ? `Meaning (Korean): ${clip(ko, 80)}` : '', context ? `Original sentence/context: ${clip(context, 240)}` : '', avoid.length ? `Do not repeat: ${avoid.slice(-6).map(x => clip(x, 120)).join(' | ')}` : ''].filter(Boolean).join('\n');
  // 질문인지 · 예시 답에 표현이 들어가는지 확인 → 아니면 한 번 더
  const core = String(expr).toLowerCase().split(/~|\.\.\.|…|\(|\bsomething\b|\bsomeone\b|\bsb\b|\bsth\b/)[0].replace(/[^a-z' ]/g, '').trim();
  for (let t = 0; t < 2; t++) {
    const a = await callAI(REPLY_SYS, user + (t ? '\nYour last try was not a direct question or the sample did not use the expression. Fix that.' : ''), { temp: t ? 0.5 : 0.8, ms: 15000 });
    if (!ok(a) || !a.en) continue;
    const en = cleanX(a.en).slice(0, 220), sample = cleanX(a.sample).slice(0, 200);
    if (!/\?\s*$/.test(en) || (core && !sample.toLowerCase().includes(core.split(' ').slice(0, 2).join(' ')))) continue;
    return { en, ko: bhTone(cleanX(a.ko)).slice(0, 160), sample };
  }
  return null;
}

// ---------- 6) 즉석 영어 표현: 한국어로 하고 싶은 말 → 자연스러운 영어 ----------
const EX_SYS = `${COACH}
${BH_VOICE}
MODE 백현아 도와줘 — the learner says or types in KOREAN something they want to say in English (to a friend or to Baekhyun).
Return ONLY JSON:
{"en": the most natural thing a native speaker would actually say — casual and spoken, conveying the Korean meaning EXACTLY (nothing added or dropped), 1–2 short sentences. If it calls fans "에리"/"사랑들", keep that sense ("Aeri", "my loves").
 "bh": Baekhyun's Korean chat line (≤ 60 chars, 1–2 short messages joined with "\n") explaining the key point or how to use the English — playful and sweet, following the voice rules,
 "ko": short faithful Korean meaning of "en"}`;
export async function aiExpress(ko) {
  if (!aiOn()) return { error: 'off' };
  const a = await callAI(EX_SYS, `Korean: ${clip(ko, 400)}`, { temp: 0.4, ms: 15000 });
  if (!ok(a) || !a.en) return { error: a?.error || 'parse' };
  const en = cleanX(a.en).slice(0, 240);
  return { en, ko: cleanX(a.ko).slice(0, 160), alt: '', bh: cleanF(a.bh || a.tip).slice(0, 120) };
}

// ---------- 7) 표현·단어 복습: 그 표현을 쓴 백현이가 말할 법한 한국어 문장 ----------
// 화면엔 한국어만(표현에 해당하는 부분 밑줄) → 사용자가 영어로 번역 → en이 정답(표현 포함)
const EXSAY_SYS = `${COACH}
${BH_VOICE}
The learner saved an English expression and now reviews it by TRANSLATING a Korean line into English.
Write ONE short Korean chat line (1 sentence, ≤ 40 chars) that Baekhyun might naturally say in his voice — everyday life, feelings, work, fans — whose most natural English translation USES the saved expression exactly (same meaning and grammar).
Return ONLY JSON {"ko": the Korean line, "mark": the EXACT substring of "ko" that corresponds to the expression (a few words), "en": the natural casual English translation that contains the expression}`;
export async function aiExprSay({ expr, ko = '', avoid = [] }) {
  if (!aiOn()) return null;
  const core = String(expr).toLowerCase().split(/~|\.\.\.|…|\(|\bsomething\b|\bsomeone\b|\bsb\b|\bsth\b|\bone's\b/)[0].replace(/[^a-z' ]/g, '').trim().split(' ').slice(0, 2).join(' ');
  const user = [`Saved expression: ${clip(expr, 80)}`, ko ? `Meaning (Korean): ${clip(ko, 80)}` : '', avoid.length ? `Do not repeat: ${avoid.slice(-6).map(x => clip(x, 80)).join(' | ')}` : ''].filter(Boolean).join('\n');
  for (let t = 0; t < 2; t++) {
    const a = await callAI(EXSAY_SYS, user + (t ? '\nLast try failed: "en" must contain the expression and "mark" must be an exact part of "ko".' : ''), { temp: t ? 0.5 : 0.85, ms: 15000 });
    if (!ok(a) || !a.ko || !a.en) continue;
    const k = bhTone(cleanX(a.ko)).slice(0, 80), en = cleanX(a.en).slice(0, 200), mark = cleanX(a.mark);
    if (core && !en.toLowerCase().includes(core)) continue;
    return { ko: k, en, mark: mark && k.includes(mark) ? mark : '' };
  }
  return null;
}

// 영상 대사(한국어 자막)에서 저장한 영어 표현에 해당하는 부분 찾기 → 한국어 문장에 밑줄
const KOMARK_SYS = `You align an English expression with its Korean translation.
Given a Korean subtitle line, its English original, and an English expression used in it, return ONLY JSON {"mark": the EXACT shortest substring of the Korean line that expresses that English expression (copy characters exactly, no paraphrase), or "" if none}`;
const koMarkCache = new Map();
export async function aiKoMark({ ko, en, expr }) {
  ko = String(ko || ''); if (!ko || !expr) return '';
  const key = ko + '|' + String(expr).toLowerCase();
  if (koMarkCache.has(key)) return koMarkCache.get(key);
  if (!aiOn()) return '';
  const a = await callAI(KOMARK_SYS, `Korean: ${clip(ko, 160)}\nEnglish: ${clip(en, 200)}\nExpression: ${clip(expr, 80)}`, { temp: 0.1, ms: 12000 });
  const m = ok(a) ? cleanX(a.mark) : '';
  const r = m && ko.includes(m) && m.length < ko.length ? m : '';
  if (ok(a)) koMarkCache.set(key, r);
  return r;
}


// 저장한 영어 문장의 자연스러운 한국어 뜻 (복습: 한국어 보고 영어로 말하기)
const KO_SYS = `Translate the English sentence into natural casual Korean (반말, how a close friend would say it). Return ONLY JSON {"ko": "..."}`;
export async function aiKo(en) {
  if (!aiOn() || !en) return '';
  const a = await callAI(KO_SYS, clip(en, 400), { temp: 0.2, ms: 12000 });
  return ok(a) ? cleanX(a.ko) : '';
}

// ---------- 문법 노트: 내가 말한 문장들의 문법 실수만 (여러 문장을 한 번에) ----------
import { TAGS as GTAGS, fixTag } from './grammar.js';
const GRAM_SYS = () => `You are a strict but fair English grammar checker for a Korean learner's SPOKEN English (speech-to-text, so ignore capitalization, punctuation and obvious filler like "um").
For EACH numbered sentence: find only real GRAMMAR / FORM mistakes (tense, agreement, articles, prepositions, word order, missing/extra words, wrong verb form, etc.).
Do NOT report a generic "missing word" — if a word is missing, tag it by its grammar (article, be verb, subject, preposition, etc.) or skip it.
Do NOT report word choice / vocabulary (a different or better word, make vs do, say vs tell) — this is a GRAMMAR note only; leave such words unchanged in "fixed".
Do NOT count: a different but correct way to say it, style or naturalness upgrades, casual but correct speech ("gonna", "wanna", dropping "I" in very casual replies is still a mistake only if it makes the sentence ungrammatical), Korean words or names.
"fixed" = the user's own sentence with the MINIMUM changes needed to be grammatical (keep their words and meaning; do not rewrite to a fancier sentence). If no mistakes, fixed = the sentence as-is and errors = [].
Each error: {"tag": one key from the list, "wrong": exact wrong part copied from the sentence ("" if something is missing), "right": the corrected part as it appears in fixed, "why": ONE short Korean 반말 explanation under 40 chars}. Use the MOST SPECIFIC tag. One error per mistake (max 4 per sentence).
Choose the tag by WHAT KIND of word changed between "wrong" and "right", never by which letters are involved:
- article_a / article_the ONLY when the separate WORD a / an / the is missing, extra, or swapped (e.g. "I have cat" → "a cat"). A letter "a" inside another word is NOT an article.
- spelling ONLY when the same word is intended but its letters are wrong ("beutiful" → "beautiful"). Because this is speech-to-text, SKIP misspellings that are just a recognition glitch or sound identical (their/there is a real mistake only if the grammar is wrong).
- If an ending changes (-s, -ed, -ing), tag the grammar reason (plural, agreement, past, verb_form…), not spelling.
"why" must explain the same thing the tag says.
Tags: ${GTAGS.map(t => `${t[0]}=${t[1]}`).join(', ')}
"Meaning" (Korean) is only a hint of what they wanted to say.
Return ONLY JSON {"results": [{"i": number, "fixed": "...", "errors": [...]}, ...]}`;
export async function aiGrammar(items) {
  if (!aiOn()) return { error: 'off' };
  const user = items.map((x, i) => `${i + 1}. ${clip(x.said, 240)}${x.ko ? `\n   Meaning: ${clip(x.ko, 120)}` : ''}`).join('\n');
  let a = await callAI(GRAM_SYS(), user, { temp: 0.1, ms: 30000 });
  if (!ok(a) && ['timeout', 'network', 'parse'].includes(a?.error)) a = await callAI(GRAM_SYS(), user, { temp: 0.1, ms: 30000 });
  if (!ok(a)) return { error: a?.error || 'parse' };
  const keys = new Set(GTAGS.map(t => t[0]));
  const res = Array.isArray(a.results) ? a.results : [];
  return {
    results: items.map((x, i) => {
      const r = res.find(y => +y.i === i + 1) || {};
      const fixed = String(r.fixed || x.said).trim();
      const errors = (Array.isArray(r.errors) ? r.errors : []).filter(e => e && keys.has(e.tag) && String(e.right || '').trim())
        .slice(0, 4).map(e => ({ tag: e.tag, wrong: String(e.wrong || '').trim(), right: String(e.right || '').trim(), why: String(e.why || '').trim() }))
        .map(e => ({ ...e, tag: fixTag(e) })).filter(e => keys.has(e.tag)); // 바뀐 단어와 안 맞는 종류는 바로잡거나 버림
      return { aid: x.aid, said: x.said, ko: x.ko, fixed, errors: fixed.toLowerCase().replace(/[^a-z']/g, '') === String(x.said).toLowerCase().replace(/[^a-z']/g, '') ? [] : errors };
    })
  };
}

// ---------- 표현 카테고리: 저장한 영어 표현을 쓰임별로 (여러 개를 한 번에) ----------
import { CATS as XCATS } from './excat.js';
const XCAT_SYS = () => `Classify each saved English expression (from a K-pop idol's casual talk, saved by a Korean learner) into ONE category by how it is USED in conversation.
Categories: ${XCATS.map(c => `${c[0]} = ${c[1]}${c[2] ? ` (e.g. ${c[2]})` : ''}`).join('; ')}.
Prefer the most useful specific category; use "phrasal" for phrasal verbs / verb+preposition chunks; use "etc" only if nothing fits.
Return ONLY JSON {"cats": [{"i": number, "cat": "key"}, ...]}`;
export async function aiExprCat(items) {
  if (!aiOn()) return { error: 'off' };
  const user = items.map((x, i) => `${i + 1}. ${clip(x.text, 120)}${x.ko ? ` (뜻: ${clip(x.ko, 60)})` : ''}`).join('\n');
  let a = await callAI(XCAT_SYS(), user, { temp: 0.1, ms: 25000 });
  if (!ok(a) && ['timeout', 'network', 'parse'].includes(a?.error)) a = await callAI(XCAT_SYS(), user, { temp: 0.1, ms: 25000 });
  if (!ok(a)) return { error: a?.error || 'parse' };
  const keys = new Set(XCATS.map(c => c[0])); const res = Array.isArray(a.cats) ? a.cats : [];
  return { cats: items.map((_, i) => { const c = (res.find(y => +y.i === i + 1) || {}).cat; return keys.has(c) ? c : ''; }) };
}
