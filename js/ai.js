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

// ---------- 1) 피드백: 의미 평가 · 꼭 고칠 부분 · 더 자연스러운 문장 · 내가 안 쓴 유용한 표현 ----------
const FB_SYS = `${COACH}
Return ONLY JSON:
{
 "correct": true/false — judge by MEANING, not wording. True if the meaning/answer is right, even if it is phrased very differently from the reference; if the meaning roughly matches, it is correct. Different words, word order, synonyms, contractions or a more casual/formal tone with the same meaning ARE correct. Grammatical, natural English that conveys the meaning is ALWAYS correct even if it differs from the reference.
 "awkward": true ONLY if a native speaker would find the sentence clearly unnatural or confusing; false if it sounds fine (even if other phrasings exist).
 "feedback": Korean, 1–2 short friendly sentences (max 80 chars), each sentence on its own line ("\n"). If correct, acknowledge it first (e.g. "뜻이 정확하게 전달돼요."), then at most one nuance tip. If not, say kindly what is missing. Do NOT repeat what "fixes" already explain. No scores, no headings, never just "자연스러워요".
 "fixes": ONLY clear errors a native teacher would mark wrong (wrong tense/agreement, wrong preposition, wrong word that changes the meaning, missing key meaning). NOT fixes: synonyms, optional words (really, lately, so), contractions, article choices that are both fine, US/UK variants, word order that is fine, style or "sounds more natural" preferences — [{"wrong": EXACT substring copied from the learner's sentence, "right": replacement, "why": Korean ≤ 24 chars}]. Empty if none. Never list style preferences or speech-recognition errors as mistakes.
 "asr": words that are most likely speech-recognition errors, not English mistakes (sound-alike words like eight/ate, their/there, for/four, a dropped "a/the/to" at a pause, a name heard wrongly) — [{"heard": EXACT substring from the learner's sentence, "meant": what they probably said}]. Judge "correct" as if they said the meant words. Empty if none.
 "natural": a natural version of the LEARNER'S OWN sentence ONLY if "awkward" is true or "fixes" is not empty; otherwise "". Never rewrite a sentence that is already fine. In translate mode never copy the reference.
If the learner's sentence is correct and fine: correct=true, awkward=false, fixes=[], natural="", and feedback just says it is right (no "but you could say…").
 "rec": the RECOMMENDED sentence — in translate mode the reference exactly as given; in reply/long modes the same as "natural"; in review mode "natural".
 "why": Korean, 1–2 short friendly lines (each ≤ 45 chars, separated by "\n") explaining why the recommended sentence is said this way and why it is good (nuance, natural structure, what a key word adds). Concrete, not generic.
 "rec_ko": natural Korean meaning of the recommended sentence (casual, short).
 "expressions": 2–3 key reusable expressions taken from the recommended sentence (2–6 words, complete chunks, correctly spaced; a pattern like "have been ~ing" is fine) — [{"en": "...", "ko": Korean meaning in this context, "use": Korean ≤ 60 chars — why this expression is used here and when to use it (e.g. "요즘까지 계속해온 일을 말할 때 · 지금도 하고 있다는 느낌")}]. ALWAYS give at least 2. No whole sentences, no made-up phrases.
}
Modes:
 translate — the learner tried to say Baekhyun's Korean line in English. The reference translation was written by the app owner and is shown to the learner as-is; never rewrite or replace it. Any wording with the same meaning and natural grammar is correct.
 reply / long — the learner answered Baekhyun's question in their own words. Correct = on-topic, sensible answer (grammar slips are fixes, not "incorrect").
  In these modes "natural" = the learner's OWN answer rewritten the way a native speaker would say it: keep exactly their content, facts and opinion (never invent details, never answer differently, never use a sample answer). Fix grammar and make it sound natural. ALWAYS give it (if their answer is already natural, return it with only light polishing).
  "feedback": 1 short friendly Korean line — what was good about their answer. No grammar lecture (grammar is not shown to the learner here).
 review — the learner answered a review question and should use the target expression/sentence. Correct only if it fits the question AND uses the target (or the target sentence's meaning). In "natural", answer the question using the target.
If the learner used Korean, correct=false and feedback "영어로 말해볼까?".`;
function fbUser(b) {
  return [`Mode: ${b.mode}`, b.ko ? `Baekhyun's Korean line: ${clip(b.ko)}` : '', b.target ? `Reference / target English: ${clip(b.target)}` : '', b.expr ? `Target expression: ${clip(b.expr, 80)}` : '',
    b.question ? `Question (English): ${clip(b.question)}` : '', b.qko ? `Question (Korean): ${clip(b.qko)}` : '', b.use?.length ? `Suggested expressions: ${b.use.slice(0, 6).join(' | ')}` : '', b.words ? `Registered names/words (speech recognition may mishear these, e.g. "Back" for "Baekhyun"): ${clip(b.words, 200)}` : '', `Learner said: ${clip(b.said, 900)}`].filter(Boolean).join('\n');
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
const cleanX = x => String(x || '').replace(/\s+/g, ' ').trim();
const expand = t => t.replace(/\b(i|you|we|they|he|she|it|that|there|what)'(m|re|s|ve|ll|d)\b/g, (m, a, b) => a + ' ' + ({ m: 'am', re: 'are', s: 'is', ve: 'have', ll: 'will', d: 'would' })[b]).replace(/\b(do|does|did|is|are|was|were|have|has|can|could|would|should|won)n't\b/g, (m, a) => (a === 'won' ? 'will' : a === 'can' ? 'can' : a) + ' not').replace(/\bcan not\b/g, 'cannot');
const cleanF = x => String(x || '').split(/\n+/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean).filter((l, i, a) => a.indexOf(l) === i).slice(0, 3).join('\n'); // 줄바꿈 유지 · 같은 문장 반복 제거
const goodX = t => /^[A-Za-z~(][A-Za-z' ,.!?~…/()-]*$/.test(t) && t.split(' ').length <= 8; // 표현 (패턴 ~ 허용)
const goodChunk = t => /^[A-Za-z][A-Za-z' ,.!?-]*$/.test(t) && t.split(' ').length <= 8 && !/[a-z][.!?][A-Za-z]/.test(t) && t.split(' ').every(w => w.length <= 16);
// 반환 {correct, feedback, fixes:[{wrong,right,why}], natural, xs:[{text,ko}], ai}
export async function smartFeedback({ mode, said, target = '', ko = '', question = '', qko = '', pattern = '', expr = '', replies = [], use = [] }) {
  const words = parseFixes(D.get().settings.sttFix).terms.concat(['Baekhyun']).filter((x, i, a) => a.indexOf(x) === i).join(', ');
  const aiP = callAI(FB_SYS, fbUser({ mode, said, target, ko, question, qko, expr, words, use }), { temp: 0.2 });
  const a = await aiP;
  if (ok(a) && typeof a.feedback === 'string') {
    const sl = said.toLowerCase();
    const minor = f => { const n = x => String(x || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim(); const w = n(f.wrong), r = n(f.right); return !w || w === r || expand(w) === expand(r); };
    const asr = (Array.isArray(a.asr) ? a.asr : []).filter(x => x && x.heard && x.meant && sl.includes(String(x.heard).toLowerCase()) && cleanX(x.heard).toLowerCase() !== cleanX(x.meant).toLowerCase()).slice(0, 2).map(x => ({ heard: cleanX(x.heard), meant: cleanX(x.meant) }));
    const asrSet = new Set(asr.map(x => x.heard.toLowerCase()));
    const fixes = (Array.isArray(a.fixes) ? a.fixes : []).filter(f => f && f.wrong && sl.includes(String(f.wrong).toLowerCase()) && !asrSet.has(String(f.wrong).toLowerCase()) && !minor(f)).slice(0, 3).map(f => ({ wrong: cleanX(f.wrong), right: cleanX(f.right), why: cleanX(f.why).slice(0, 50) }));
    // 맞게 말했고 어색하지 않으면 ‘더 자연스럽게’를 억지로 보여주지 않음
    const own = mode === 'reply' || mode === 'long'; // 질문하기·대화하기: 내 대답을 원어민처럼 다듬은 문장
    const nat = (own || a.awkward === true || fixes.length || !a.correct) ? cleanX(a.natural) : '';
    const usedAI = new Set((Array.isArray(a.used) ? a.used : []).map(x => cleanX(x).toLowerCase()));
    return {
      correct: !!a.correct, feedback: cleanF(a.feedback).slice(0, 140), asr, fixes, used: use.filter(u => usedAI.has(u.toLowerCase()) || usedIn(said, u)),
      natural: nat && nat.toLowerCase().replace(/[^a-z ]/g, '') !== sl.replace(/[^a-z ]/g, '') ? nat : '',
      xs: (Array.isArray(a.expressions) ? a.expressions : []).map(x => ({ text: cleanX(x?.en), ko: cleanX(x?.ko), use: cleanX(x?.use).slice(0, 80) })).filter(x => goodX(x.text)).slice(0, 3),
      why: cleanF(a.why).slice(0, 140), recKo: cleanX(a.rec_ko).slice(0, 120),
      ai: true
    };
  }
  // ---- 규칙 피드백 (AI 꺼짐·실패) ----
  const ev = mode === 'translate' ? judgeTranslation(said, target) : judgeReply(said, { question, expr: mode === 'review' ? expr : '', strict: mode === 'reply' || (mode === 'review' && !!question) });
  const imp = await improve(said, { pattern: pattern || expr, useLT: true });
  const fixes = (imp.changes || []).filter(c => c.from && said.toLowerCase().includes(c.from.toLowerCase())).slice(0, 3).map(c => ({ wrong: c.from, right: c.to, why: c.why || '' }));
  // 규칙 피드백: 질문하기·대화하기는 내 문장을 고친 것만 (다른 사람 예시 답변은 추천하지 않음)
  const nat = !imp.same ? imp.after : '';
  const msg = ev.ok ? '뜻이 잘 통해요.' : ev.level === 'off' ? (ev.title === '영어로 말해볼까요?' ? '영어로 말해볼까?' : '추천 문장이랑 비교해봐요.') : '추천 문장이랑 비교해봐요.'; // 규칙 판정은 표현이 다르면 틀리게 볼 수 있어서 단정하지 않음
  return { correct: ev.ok, feedback: msg, fixes, asr: [], used: use.filter(u => usedIn(said, u)), natural: mode === 'translate' ? (imp.same ? '' : imp.after) : nat && nat.toLowerCase() !== said.toLowerCase() ? nat : '', xs: [], ai: false };
}

// ---------- 2) 영어 질문하기 (채팅) ----------
const QA_SYS = `${COACH}
The learner asks a question about English (meaning, nuance, how to say something, grammar). Answer in friendly Korean, short (max 5 lines), with 1–2 natural English example sentences.
Return ONLY JSON: {"answer": "...", "expressions": [{"en": short useful chunk, "ko": meaning}] (0–3)}`;
export async function aiAsk(q, ctx = {}) {
  if (!aiOn()) return { error: 'off' };
  const a = await callAI(QA_SYS, [ctx.ko ? `Current Baekhyun line (Korean): ${clip(ctx.ko)}` : '', ctx.en ? `Its English: ${clip(ctx.en)}` : '', `Learner question: ${clip(q, 600)}`].filter(Boolean).join('\n'), { temp: 0.5 });
  if (!ok(a) || !a.answer) return { error: a?.error || 'parse' };
  return { answer: String(a.answer), xs: (a.expressions || []).map(x => ({ text: cleanX(x?.en), ko: cleanX(x?.ko) })).filter(x => goodChunk(x.text)).slice(0, 3) };
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
You help the learner keep a real conversation going with Baekhyun. Expressions must change with the conversation: read the WHOLE dialog so far and suggest what the learner could say NEXT.
Return ONLY JSON:
{"next": Baekhyun's natural follow-up question that reacts to what the learner just said (casual, short) {"en": "...", "ko": "자연스러운 반말"} — or null if the learner has not answered yet,
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
    next: a.next && a.next.en ? { en: cleanX(a.next.en), ko: cleanX(a.next.ko) } : null
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
