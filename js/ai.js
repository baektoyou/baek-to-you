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
 "correct": true/false — true if the meaning/answer is right. Different words, word order, synonyms, contractions or a more casual/formal tone with the same meaning ARE correct. Grammatical, natural English that conveys the meaning is ALWAYS correct even if it differs from the reference.
 "awkward": true ONLY if a native speaker would find the sentence clearly unnatural or confusing; false if it sounds fine (even if other phrasings exist).
 "feedback": Korean, 1–2 short friendly sentences (max 80 chars), each sentence on its own line ("\n"). If correct, acknowledge it first (e.g. "뜻이 정확하게 전달돼요."), then at most one nuance tip. If not, say kindly what is missing. Do NOT repeat what "fixes" already explain. No scores, no headings, never just "자연스러워요".
 "fixes": ONLY clear errors a native teacher would mark wrong (wrong tense/agreement, wrong preposition, wrong word that changes the meaning, missing key meaning). NOT fixes: synonyms, optional words (really, lately, so), contractions, article choices that are both fine, US/UK variants, word order that is fine, style or "sounds more natural" preferences — [{"wrong": EXACT substring copied from the learner's sentence, "right": replacement, "why": Korean ≤ 24 chars}]. Empty if none. Never list style preferences or speech-recognition errors as mistakes.
 "asr": words that are most likely speech-recognition errors, not English mistakes (sound-alike words like eight/ate, their/there, for/four, a dropped "a/the/to" at a pause, a name heard wrongly) — [{"heard": EXACT substring from the learner's sentence, "meant": what they probably said}]. Judge "correct" as if they said the meant words. Empty if none.
 "natural": a natural version of the LEARNER'S OWN sentence ONLY if "awkward" is true or "fixes" is not empty; otherwise "". Never rewrite a sentence that is already fine. In translate mode never copy the reference.
If the learner's sentence is correct and fine: correct=true, awkward=false, fixes=[], natural="", and feedback just says it is right (no "but you could say…").
 "expressions": up to 3 useful, real, commonly used English expressions the learner did NOT use but could use here — [{"en": short chunk (2–6 words, complete and correctly spaced), "ko": Korean meaning}]. No whole sentences, no made-up phrases, nothing the learner already said.
}
Modes:
 translate — the learner tried to say Baekhyun's Korean line in English. The reference translation was written by the app owner and is shown to the learner as-is; never rewrite or replace it. Any wording with the same meaning and natural grammar is correct.
 reply / long — the learner answered Baekhyun's question. Correct = on-topic, sensible answer (grammar slips are fixes, not "incorrect").
 review — the learner answered a review question and should use the target expression/sentence. Correct only if it fits the question AND uses the target (or the target sentence's meaning). In "natural", answer the question using the target.
If the learner used Korean, correct=false and feedback "영어로 말해볼까?".`;
function fbUser(b) {
  return [`Mode: ${b.mode}`, b.ko ? `Baekhyun's Korean line: ${clip(b.ko)}` : '', b.target ? `Reference / target English: ${clip(b.target)}` : '', b.expr ? `Target expression: ${clip(b.expr, 80)}` : '',
    b.question ? `Question (English): ${clip(b.question)}` : '', b.qko ? `Question (Korean): ${clip(b.qko)}` : '', b.words ? `Registered names/words (speech recognition may mishear these, e.g. "Back" for "Baekhyun"): ${clip(b.words, 200)}` : '', `Learner said: ${clip(b.said, 900)}`].filter(Boolean).join('\n');
}
const cleanX = x => String(x || '').replace(/\s+/g, ' ').trim();
const expand = t => t.replace(/\b(i|you|we|they|he|she|it|that|there|what)'(m|re|s|ve|ll|d)\b/g, (m, a, b) => a + ' ' + ({ m: 'am', re: 'are', s: 'is', ve: 'have', ll: 'will', d: 'would' })[b]).replace(/\b(do|does|did|is|are|was|were|have|has|can|could|would|should|won)n't\b/g, (m, a) => (a === 'won' ? 'will' : a === 'can' ? 'can' : a) + ' not').replace(/\bcan not\b/g, 'cannot');
const cleanF = x => String(x || '').split(/\n+/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean).filter((l, i, a) => a.indexOf(l) === i).slice(0, 3).join('\n'); // 줄바꿈 유지 · 같은 문장 반복 제거
const goodChunk = t => /^[A-Za-z][A-Za-z' ,.!?-]*$/.test(t) && t.split(' ').length <= 8 && !/[a-z][.!?][A-Za-z]/.test(t) && t.split(' ').every(w => w.length <= 16);
// 반환 {correct, feedback, fixes:[{wrong,right,why}], natural, xs:[{text,ko}], ai}
export async function smartFeedback({ mode, said, target = '', ko = '', question = '', qko = '', pattern = '', expr = '', replies = [] }) {
  const words = parseFixes(D.get().settings.sttFix).terms.concat(['Baekhyun']).filter((x, i, a) => a.indexOf(x) === i).join(', ');
  const aiP = callAI(FB_SYS, fbUser({ mode, said, target, ko, question, qko, expr, words }), { temp: 0.2 });
  const a = await aiP;
  if (ok(a) && typeof a.feedback === 'string') {
    const sl = said.toLowerCase();
    const minor = f => { const n = x => String(x || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim(); const w = n(f.wrong), r = n(f.right); return !w || w === r || expand(w) === expand(r); };
    const asr = (Array.isArray(a.asr) ? a.asr : []).filter(x => x && x.heard && x.meant && sl.includes(String(x.heard).toLowerCase()) && cleanX(x.heard).toLowerCase() !== cleanX(x.meant).toLowerCase()).slice(0, 2).map(x => ({ heard: cleanX(x.heard), meant: cleanX(x.meant) }));
    const asrSet = new Set(asr.map(x => x.heard.toLowerCase()));
    const fixes = (Array.isArray(a.fixes) ? a.fixes : []).filter(f => f && f.wrong && sl.includes(String(f.wrong).toLowerCase()) && !asrSet.has(String(f.wrong).toLowerCase()) && !minor(f)).slice(0, 3).map(f => ({ wrong: cleanX(f.wrong), right: cleanX(f.right), why: cleanX(f.why).slice(0, 50) }));
    // 맞게 말했고 어색하지 않으면 ‘더 자연스럽게’를 억지로 보여주지 않음
    const nat = (a.awkward === true || fixes.length || !a.correct) ? cleanX(a.natural) : '';
    return {
      correct: !!a.correct, feedback: cleanF(a.feedback).slice(0, 140), asr, fixes,
      natural: nat && nat.toLowerCase().replace(/[^a-z ]/g, '') !== sl.replace(/[^a-z ]/g, '') ? nat : '',
      xs: (Array.isArray(a.expressions) ? a.expressions : []).map(x => ({ text: cleanX(x?.en), ko: cleanX(x?.ko) })).filter(x => goodChunk(x.text) && !said.toLowerCase().includes(x.text.toLowerCase())).slice(0, 3),
      ai: true
    };
  }
  // ---- 규칙 피드백 (AI 꺼짐·실패) ----
  const ev = mode === 'translate' ? judgeTranslation(said, target) : judgeReply(said, { question, expr: mode === 'review' ? expr : '', strict: mode === 'reply' || (mode === 'review' && !!question) });
  const imp = await improve(said, { pattern: pattern || expr, useLT: true });
  const fixes = (imp.changes || []).filter(c => c.from && said.toLowerCase().includes(c.from.toLowerCase())).slice(0, 3).map(c => ({ wrong: c.from, right: c.to, why: c.why || '' }));
  const alt = mode === 'translate' ? target : mode === 'review' ? '' : bestReply(said, replies);
  const nat = !imp.same ? imp.after : alt;
  const msg = ev.ok ? (fixes.length ? '뜻은 잘 통해요. 표시한 부분만 고치면 돼요.' : '뜻이 잘 통해요.') : ev.level === 'off' ? (ev.title === '영어로 말해볼까요?' ? '영어로 말해볼까?' : '뜻이 조금 달라요. 추천 문장을 참고해봐요.') : '조금 빠진 부분이 있어요. 추천 문장을 참고해봐요.';
  return { correct: ev.ok, feedback: msg, fixes, asr: [], natural: mode === 'translate' ? (imp.same ? '' : imp.after) : nat && nat.toLowerCase() !== said.toLowerCase() ? nat : '', xs: [], ai: false };
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

// ---------- 3) 대화하기: 질문에 맞는 추천 표현 + 다음 질문 ----------
const KIT_SYS = `${COACH}
You help the learner keep a conversation going with Baekhyun.
Given the current question and what the learner has said so far, return ONLY JSON:
{"expressions": exactly 3 useful, real English expressions the learner can use in their NEXT answer — tied to this question and to what the learner actually said (their topic, people, feelings, details). Not generic fillers, nothing they already used, nothing in the "Already suggested" list. Each {"en": 2–6 words, "ko": Korean meaning},
 "next": a natural follow-up question Baekhyun could ask next, based on what the learner just said (casual, short) {"en": "...", "ko": "자연스러운 반말"} — or null if nothing was said yet}`;
export async function aiKit({ question, qko, history = [], avoid = [] }) {
  if (!aiOn()) return null;
  const a = await callAI(KIT_SYS, [`Question: ${clip(question)}`, qko ? `(Korean: ${clip(qko)})` : '', history.length ? `Learner said so far:\n${history.map(h => '- ' + clip(h, 400)).join('\n')}` : 'Learner has not answered yet.', avoid.length ? `Already suggested (do not repeat): ${avoid.slice(-12).join(' | ')}` : ''].filter(Boolean).join('\n'), { temp: 0.7 });
  if (!ok(a)) return null;
  const said = history.join(' ').toLowerCase(), av = new Set(avoid.map(x => String(x).toLowerCase()));
  return {
    xs: (a.expressions || []).map(x => ({ text: cleanX(x?.en), ko: cleanX(x?.ko) })).filter(x => goodChunk(x.text) && !av.has(x.text.toLowerCase()) && !said.includes(x.text.toLowerCase())).slice(0, 3),
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
