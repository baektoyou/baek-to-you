// BAEK TO YOU — AI 피드백 중계 서버 (Cloudflare Workers 무료)
// · API 키를 여기(서버)에 숨겨 두고, 앱은 이 주소로만 요청해요. 키는 GitHub에 절대 올라가지 않아요.
// · 환경 변수
//   GEMINI_API_KEY (Secret)  — Gemini 무료 등급 키   ┐ 둘 중 하나 이상
//   OPENAI_API_KEY (Secret)  — ChatGPT(OpenAI) 키    ┘ (OpenAI는 유료 크레딧 필요)
//   PROVIDER (선택)          — gemini | openai  (비우면 Gemini 키가 있으면 gemini)
//   APP_TOKEN (권장, Secret) — 앱 SETTINGS의 앱 토큰과 같은 값
//   ALLOWED_ORIGINS (선택)   — 기본 https://kangseonwoo.github.io (쉼표로 여러 개)
//   MODEL (선택)             — 기본 gemini-flash-latest / gpt-4o-mini
const SYS = `You are a warm, precise native-English speaking coach for a Korean learner.
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

const json = (o, h, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', ...h } });
const clip = (t, n) => String(t || '').slice(0, n);
const parse = t => { try { return JSON.parse(String(t || '').replace(/^\s*```(json)?|```\s*$/g, '').trim()); } catch { return null; } };

export default {
  async fetch(req, env) {
    const origin = req.headers.get('origin') || '';
    const allowed = String(env.ALLOWED_ORIGINS || 'https://kangseonwoo.github.io').split(',').map(s => s.trim()).filter(Boolean);
    const okOrigin = allowed.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const cors = { 'Access-Control-Allow-Origin': okOrigin ? origin : allowed[0] || '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'content-type, x-app-token', 'Vary': 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(req.url);
    const prov = env.PROVIDER || (env.GEMINI_API_KEY ? 'gemini' : 'openai');
    if (req.method === 'GET' && url.pathname === '/ping') return json({ ok: true, provider: prov }, cors);
    if (req.method !== 'POST' || url.pathname !== '/feedback') return json({ error: 'not_found' }, cors, 404);
    if (!okOrigin) return json({ error: 'origin' }, cors, 403);
    if (env.APP_TOKEN && req.headers.get('x-app-token') !== env.APP_TOKEN) return json({ error: 'token' }, cors, 401);
    const key = prov === 'openai' ? env.OPENAI_API_KEY : env.GEMINI_API_KEY;
    if (!key) return json({ error: 'no_key' }, cors, 500);
    const b = await req.json().catch(() => null);
    if (!b || !b.said) return json({ error: 'bad_request' }, cors, 400);
    const mode = ['translate', 'reply', 'long', 'review'].includes(b.mode) ? b.mode : 'reply';
    const user = [
      `Mode: ${mode}`,
      b.ko ? `Baekhyun's Korean line: ${clip(b.ko, 300)}` : '',
      b.target ? `Reference / target English: ${clip(b.target, 300)}` : '',
      b.expr ? `Target expression to use: ${clip(b.expr, 80)}` : '',
      b.question ? `Question (English): ${clip(b.question, 300)}` : '',
      b.qko ? `Question (Korean): ${clip(b.qko, 300)}` : '',
      b.pattern ? `Target pattern to practice: ${clip(b.pattern, 80)}` : '',
      `Learner said: ${clip(b.said, 800)}`
    ].filter(Boolean).join('\n');
    let text = '';
    if (prov === 'openai') {
      const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: env.MODEL || 'gpt-4o-mini', temperature: 0.3, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: SYS }, { role: 'user', content: user }] }) });
      if (!r.ok) return json({ error: 'openai', status: r.status, detail: clip(await r.text(), 300) }, cors, 502);
      text = (await r.json()).choices?.[0]?.message?.content || '';
    } else {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.MODEL || 'gemini-flash-latest'}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: SYS }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { temperature: 0.3, responseMimeType: 'application/json' } }) });
      if (!r.ok) return json({ error: 'gemini', status: r.status, detail: clip(await r.text(), 300) }, cors, 502);
      text = ((await r.json()).candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
    }
    const out = parse(text);
    return out ? json(out, cors) : json({ error: 'parse' }, cors, 502);
  }
};
