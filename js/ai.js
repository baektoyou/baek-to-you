// AI 피드백 (선택) — 연결 방법 3가지
//  · worker : 내 Cloudflare Worker (키는 Worker에만 · AI_SETUP.md)
//  · gemini : Gemini API 키 직접 입력 (무료 등급)
//  · openai : ChatGPT(OpenAI) API 키 직접 입력 (유료 크레딧 필요)
// 직접 입력한 키는 ‘이 기기’에만 저장 (동기화·JSON 백업에 안 들어감)
// 안 되면(꺼짐 · 키 없음 · 한도 초과 · 오프라인 · 12초 초과) 앱 안의 규칙 피드백으로 자동 전환
import * as D from './store.js';
import { improve } from './feedback.js';
import { judgeTranslation, judgeReply, keyExpressions, bestReply } from './judge.js';

const KEYS = 'baek-to-you:aikeys';
export const aiKeys = () => { try { return JSON.parse(localStorage.getItem(KEYS) || '{}'); } catch { return {}; } };
export const setAiKeys = p => { try { localStorage.setItem(KEYS, JSON.stringify({ ...aiKeys(), ...p })); } catch { } };
export const PROVIDERS = [['worker', 'Worker'], ['gemini', 'Gemini 키'], ['openai', 'ChatGPT 키']];
export const DEFAULT_MODEL = { gemini: 'gemini-flash-latest', openai: 'gpt-4o-mini' };
export const provider = () => D.get().settings.aiProvider || 'worker';
export const aiOn = () => {
  const s = D.get().settings; if (s.aiOn === false) return false;
  const p = provider(), k = aiKeys();
  return p === 'worker' ? !!(s.aiUrl || '').trim() : p === 'gemini' ? !!k.gemini : !!k.openai;
};

export const SYS = `You are a warm, precise native-English speaking coach for a Korean learner.
The learner practices by watching K-pop idol Baekhyun's video clips and speaking English.
The learner's sentence comes from speech recognition, so ignore capitalization/punctuation and obvious recognition glitches.

Return ONLY a JSON object:
{
 "verdict": "great" | "good" | "fix" | "off",
 "title": one of ["완벽해요","자연스러워요","뜻이 잘 통해요","뜻은 맞아요 · 문법 하나만","조금 빠졌어요","질문과 조금 달라요","뜻이 달라요","표현이 빠졌어요","영어로 말해볼까요?"],
 "corrected": the learner's sentence with ONLY grammar/word errors fixed, keeping their own words and structure,
 "natural": how a native speaker would naturally say the SAME thing in casual spoken conversation (keep the learner's meaning and the context; do not add new facts),
 "why": Korean, max 40 characters, the single most useful tip (empty string if nothing to fix),
 "expressions": up to 3 objects {"en": a short reusable chunk taken from "natural" (not the whole sentence), "ko": Korean meaning}
}

Mode "translate": the learner tried to say the Korean line in English. A reference translation is given, but other correct wordings are fine.
 great = meaning complete and natural; good = meaning conveyed with small issues; fix = part of the meaning missing or a clear grammar error; off = different meaning.
Mode "reply" / "long": the learner answered Baekhyun's question in English.
 great = natural, on-topic answer; good = on-topic with small issues; fix = grammar errors; off = does not answer the question.
Mode "review": the learner answered a review question and should use the target expression or sentence.
 great/good only if the answer fits the question AND uses the target expression (or the target sentence's meaning) correctly; if the target is missing use verdict "fix" and title "표현이 빠졌어요". In "natural", answer the question using the target expression.
Never praise a wrong or off-topic answer. If the learner used Korean, verdict "off" and title "영어로 말해볼까요?".`;

const clip = (t, n) => String(t || '').slice(0, n);
export function userPrompt(b) {
  return [
    `Mode: ${b.mode}`,
    b.ko ? `Baekhyun's Korean line: ${clip(b.ko, 300)}` : '',
    b.target ? `Reference / target English: ${clip(b.target, 300)}` : '',
    b.expr ? `Target expression to use: ${clip(b.expr, 80)}` : '',
    b.question ? `Question (English): ${clip(b.question, 300)}` : '',
    b.qko ? `Question (Korean): ${clip(b.qko, 300)}` : '',
    b.pattern ? `Target pattern to practice: ${clip(b.pattern, 80)}` : '',
    `Learner said: ${clip(b.said, 800)}`
  ].filter(Boolean).join('\n');
}
const parse = t => { try { return JSON.parse(String(t || '').replace(/^\s*```(json)?|```\s*$/g, '').trim()); } catch { return null; } };
const errOf = s => s === 401 || s === 403 ? 'key' : s === 429 ? 'quota' : s === 404 ? 'model' : `http_${s}`;

export async function askAI(payload, ms = 12000) {
  if (!aiOn()) return null;
  const s = D.get().settings, p = provider(), k = aiKeys();
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  try {
    if (p === 'worker') {
      const r = await fetch(s.aiUrl.trim().replace(/\/+$/, '') + '/feedback', { method: 'POST', headers: { 'content-type': 'application/json', ...(s.aiToken ? { 'x-app-token': s.aiToken } : {}) }, body: JSON.stringify(payload), signal: ctl.signal });
      const j = await r.json().catch(() => null);
      if (!r.ok) return { error: j?.error || errOf(r.status), status: j?.status || r.status };
      return j && typeof j === 'object' ? j : { error: 'parse' };
    }
    if (p === 'gemini') {
      const model = (k.geminiModel || '').trim() || DEFAULT_MODEL.gemini;
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json', 'x-goog-api-key': k.gemini },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: SYS }] }, contents: [{ role: 'user', parts: [{ text: userPrompt(payload) }] }], generationConfig: { temperature: 0.3, responseMimeType: 'application/json' } })
      });
      if (!r.ok) return { error: errOf(r.status), status: r.status };
      const j = await r.json();
      return parse((j.candidates?.[0]?.content?.parts || []).map(x => x.text || '').join('')) || { error: 'parse' };
    }
    const model = (k.openaiModel || '').trim() || DEFAULT_MODEL.openai;
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json', authorization: `Bearer ${k.openai}` },
      body: JSON.stringify({ model, temperature: 0.3, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: SYS }, { role: 'user', content: userPrompt(payload) }] })
    });
    if (!r.ok) return { error: errOf(r.status), status: r.status };
    const j = await r.json();
    return parse(j.choices?.[0]?.message?.content) || { error: 'parse' };
  } catch (e) { return { error: e.name === 'AbortError' ? 'timeout' : 'network' }; } finally { clearTimeout(t); }
}
export const AI_ERR = {
  token: '앱 토큰이 Worker와 달라요', origin: '이 주소에서 온 요청은 막혀 있어요 (ALLOWED_ORIGINS 확인)', no_key: 'Worker에 API 키가 없어요',
  gemini: 'Gemini 응답 오류 (키·한도·모델 확인)', openai: 'ChatGPT 응답 오류 (키·크레딧·모델 확인)', key: 'API 키가 맞지 않아요', quota: '사용 한도를 넘었어요 (잠시 뒤 다시 · ChatGPT는 크레딧 확인)',
  model: '모델 이름을 확인해주세요', parse: 'AI 응답을 읽지 못했어요', timeout: '응답이 너무 늦어요', network: '연결할 수 없어요 (주소·인터넷 확인)', not_found: 'Worker 주소를 확인해주세요'
};

const LV = ['great', 'good', 'fix', 'off'];
// mode: 'translate'(CHAT·전화하기) | 'reply'(질문하기) | 'long'(오래 이야기하기) | 'review'(SAVED 복습)
// 반환 {ev, fixed, natural, why, xs, ai}
export async function smartFeedback({ mode, said, target = '', ko = '', question = '', qko = '', pattern = '', expr = '', replies = [] }) {
  const aiP = askAI({ mode, said, target, ko, question, qko, pattern, expr });
  const ev0 = mode === 'translate' ? judgeTranslation(said, target) : judgeReply(said, { question, expr: mode === 'review' ? expr : '', strict: mode === 'reply' || (mode === 'review' && !!question) });
  const imp = await improve(said, { pattern: pattern || expr, useLT: D.get().settings.autoLT !== false && !aiOn() });
  const br = mode === 'reply' || mode === 'long' ? bestReply(said, replies) : '';
  const nat0 = mode === 'translate' ? target : mode === 'review' ? imp.after : br;
  const base = { ev: ev0, fixed: imp.after, natural: nat0, why: imp.changes?.[0]?.why || '', xs: keyExpressions(mode === 'translate' ? target : (br || imp.after), { pattern, said }), ai: false };
  const a = await aiP;
  if (!a || a.error || !(a.natural || a.corrected)) return base;
  const level = LV.includes(a.verdict) ? a.verdict : ev0.level;
  return {
    ev: { level, title: String(a.title || ev0.title).slice(0, 20), ok: level === 'great' || level === 'good', msg: '', gram: level === 'fix' ? [{}] : [] },
    fixed: String(a.corrected || imp.after), natural: String(a.natural || ''), why: String(a.why || '').slice(0, 60),
    xs: (Array.isArray(a.expressions) ? a.expressions : []).filter(x => x && x.en).slice(0, 3).map(x => ({ text: String(x.en), ko: String(x.ko || '') })), ai: true
  };
}
