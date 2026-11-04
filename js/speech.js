// 음성: STT(Web Speech API) · TTS(speechSynthesis) · 녹음(MediaRecorder) · 녹음 분석(Web Audio)
import { get } from './store.js';
import { diff } from './compare.js';

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const support = {
  stt: !!SR,
  tts: 'speechSynthesis' in window,
  rec: !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder),
  standalone: window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
  ios: /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
};

// ---------- TTS ----------
let voices = [];
function loadVoices() { voices = support.tts ? speechSynthesis.getVoices() : []; }
if (support.tts) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
export function enVoices() {
  loadVoices();
  return voices.filter(v => /^en[-_]/i.test(v.lang)).sort((a, b) => score(b) - score(a));
  function score(v) { let s = 0; if (/en[-_]US/i.test(v.lang)) s += 3; if (/Samantha|Ava|Allison|Zoe|Nicky|Google US|Aaron|Evan|Nathan/i.test(v.name)) s += 2; if (/enhanced|premium|natural/i.test(v.name)) s += 3; if (/Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Zarvox|Trinoids|Whisper|Jester|Organ|Superstar|Albert|Bad News|Good News/i.test(v.name)) s -= 6; return s; }
}
function pickVoice() {
  const want = get().settings.voiceURI;
  const list = enVoices();
  return list.find(v => v.voiceURI === want) || list[0] || null;
}

// speak(text, {rate, onWord(i), onEnd}) → {stop, done:Promise<durationMs>}
export function speak(text, opt = {}) {
  if (!support.tts) { opt.onEnd?.(0); return { stop() { }, done: Promise.resolve(0) }; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
  u.rate = opt.rate || get().settings.rate || 0.95;
  const words = [...text.matchAll(/\S+/g)].map(m => ({ i: m.index, len: m[0].length }));
  let t0 = 0, gotBoundary = false, est, stopped = false;
  let resolve; const done = new Promise(r => (resolve = r));
  u.onstart = () => {
    t0 = performance.now();
    // 경계 이벤트가 없는 브라우저용 추정 하이라이트
    const cps = 13.5 * u.rate; let k = 0;
    const tick = () => {
      if (gotBoundary || stopped || k >= words.length) return;
      opt.onWord?.(k);
      const next = words[k + 1] ? (words[k + 1].i - words[k].i) : words[k].len + 1;
      k++; est = setTimeout(tick, (next / cps) * 1000);
    };
    est = setTimeout(tick, 60);
  };
  u.onboundary = e => {
    if (e.name && e.name !== 'word') return;
    gotBoundary = true; clearTimeout(est);
    const k = words.findIndex((w, j) => e.charIndex >= w.i && (!words[j + 1] || e.charIndex < words[j + 1].i));
    if (k >= 0) opt.onWord?.(k);
  };
  const fin = () => { clearTimeout(est); const d = t0 ? performance.now() - t0 : 0; opt.onEnd?.(d); resolve(d); };
  u.onend = fin; u.onerror = fin;
  speechSynthesis.speak(u);
  return { stop() { stopped = true; speechSynthesis.cancel(); }, done };
}
export const stopSpeak = () => support.tts && speechSynthesis.cancel();

// ---------- 인식 보정 사전 ----------
// 기본: 자주 틀리는 고유명사 / 사용자: SETTINGS › 인식 보정 단어 ("들린 말 = 원래 단어")
const BUILTIN_FIX = [
  [/\b(?:back|bag|bak|baek|bake|beck|pack|bike)[\s-]?(?:hyun|hyon|hyeon|hyan|hun|hin|young|yun|human|hum)\b/gi, 'Baekhyun'],
  [/\b(?:exo|x\s?o|echo)[\s-]?(?:l|el|elle)\b/gi, 'EXO-L']
];
export function parseFixes(text) {
  return String(text || '').split('\n').map(l => l.split('=').map(x => x.trim())).filter(p => p.length === 2 && p[0] && p[1]);
}
export function fixText(t) {
  if (!t) return t;
  BUILTIN_FIX.forEach(([r, v]) => (t = t.replace(r, v)));
  parseFixes(get().settings.sttFix).forEach(([from, to]) => {
    const re = new RegExp('\\b' + from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '[\\s-]*') + '\\b', 'gi');
    t = t.replace(re, to);
  });
  return t;
}

// ---------- 마이크 캡처: 녹음 + STT 동시 시도 ----------
// capture({stt, record, onInterim, maxMs, targets, autoStop})
//  · 기본은 사용자가 탭할 때까지 계속 들음 (중간에 쉬어도 안 끊김)
//  · autoStop: 말이 끝나면 자동 종료 (쉐도잉)
//  · targets: 예시 문장 → 인식 후보 여러 개 중 예시와 가장 가까운 걸 고름
export function capture(opt = {}) {
  const wantStt = opt.stt !== false && support.stt;
  const wantRec = !!opt.record && support.rec;
  const keep = !opt.autoStop;
  const targets = (opt.targets || []).filter(Boolean);
  let silT, committed = '', session = '', conf = 0, sttError = null, userStop = false, restarts = 0, sessT0 = 0;
  let rec, mr, stream, chunks = [], t0 = performance.now(), ended = false;
  let resolve; const result = new Promise(r => (resolve = r));
  let sttDone = !wantStt, recDone = !wantRec, blob = null;
  const maxT = setTimeout(() => stop(), opt.maxMs || 30000);
  const full = () => (committed + ' ' + session).replace(/\s+/g, ' ').trim();

  const finish = () => {
    if (!sttDone || !recDone || ended) return; ended = true; clearTimeout(maxT); clearTimeout(silT);
    resolve({ text: fixText(full()), confidence: conf, blob, url: blob ? URL.createObjectURL(blob) : null, durationMs: performance.now() - t0, sttError, recUsed: !!blob });
  };
  const pickAlt = r => {
    if (!targets.length || r.length < 2) return r[0].transcript;
    let top = r[0].transcript, ts = -1;
    for (let k = 0; k < r.length; k++) {
      const t = r[k].transcript; const sc = Math.max(...targets.map(x => diff(fixText(t), x).score)) - k * 2;
      if (sc > ts) { ts = sc; top = t; }
    }
    return top;
  };

  async function startRec() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(t => MediaRecorder.isTypeSupported?.(t));
      mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      mr.ondataavailable = e => e.data.size && chunks.push(e.data);
      mr.onstop = () => { blob = chunks.length ? new Blob(chunks, { type: mr.mimeType || 'audio/mp4' }) : null; stream.getTracks().forEach(t => t.stop()); recDone = true; finish(); };
      mr.start(); t0 = performance.now();
    } catch (e) { sttError = sttError || 'mic-denied'; recDone = true; finish(); }
  }
  function startStt() {
    try {
      rec = new SR(); rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = keep; rec.maxAlternatives = targets.length ? 5 : 1;
      rec.onresult = e => {
        // 매번 전체 결과로 다시 조립 (iOS의 누적·중복 결과 대응)
        let acc = '';
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i]; const t = (r.isFinal ? pickAlt(r) : r[0].transcript).trim();
          if (!t) continue;
          const al = acc.toLowerCase(), tl = t.toLowerCase();
          if (acc && tl.startsWith(al)) acc = t;
          else if (!al.endsWith(tl)) acc = (acc + ' ' + t).trim();
          if (r.isFinal) conf = r[0].confidence || conf;
        }
        session = acc;
        opt.onInterim?.(fixText(full()));
        // 말을 멈추고 잠시 조용하면 자동 종료 (탭해도 종료)
        clearTimeout(silT); if (keep && full()) silT = setTimeout(() => !userStop && stop(), opt.silenceMs || 2200);
      };
      rec.onerror = e => { if (e.error !== 'no-speech' && e.error !== 'aborted') sttError = e.error; };
      rec.onend = () => {
        // 탭하기 전엔 계속 듣기: 브라우저가 침묵으로 끊어도 이어서 다시 시작
        if (keep && !userStop && !sttError && restarts < 6 && performance.now() - sessT0 > 400) {
          committed = full(); session = ''; restarts++;
          try { sessT0 = performance.now(); rec.start(); return; } catch { }
        }
        sttDone = true;
        if (mr && mr.state === 'recording' && !keep) setTimeout(() => mr.state === 'recording' && mr.stop(), 350);
        finish();
      };
      sessT0 = performance.now(); rec.start();
    } catch (e) { sttError = 'stt-start'; sttDone = true; finish(); }
  }
  (async () => { if (wantRec) await startRec(); if (wantStt) startStt(); if (!wantStt && !wantRec) { sttError = 'unsupported'; finish(); } })();

  function stop() {
    if (userStop) return; userStop = true; clearTimeout(silT);
    try { rec && rec.stop(); } catch { }
    try { mr && mr.state === 'recording' && mr.stop(); } catch { }
    setTimeout(() => { sttDone = true; recDone = recDone || !mr; finish(); }, 1800);
  }
  return { stop, result };
}

export function sttErrorText(e) {
  return ({
    'not-allowed': '마이크/음성 인식 권한이 꺼져 있어요. 설정 > Safari > 마이크를 허용해주세요.',
    'service-not-allowed': '음성 인식을 쓸 수 없어요. iPhone 설정 > Siri에서 Siri(받아쓰기)를 켜주세요.',
    'mic-denied': '마이크 권한이 거부됐어요.',
    'audio-capture': '녹음과 음성 인식이 동시에 안 돼서 녹음만 했어요.',
    'network': '음성 인식 서버에 연결하지 못했어요.',
    'unsupported': '이 브라우저는 음성 인식을 지원하지 않아요. 키보드 받아쓰기(🎤)로 입력해주세요.',
    'stt-start': '음성 인식을 시작하지 못했어요.'
  })[e] || (e ? `음성 인식 오류: ${e}` : '');
}

// ---------- 녹음 분석 (실제 측정 가능한 항목만) ----------
// 파형 · 발화 길이 · 쉼(0.3초 이상 무음) 횟수
export async function analyze(blob) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ac = new AC();
    const buf = await new Promise((res, rej) => blob.arrayBuffer().then(ab => ac.decodeAudioData(ab, res, rej)));
    const ch = buf.getChannelData(0), sr = buf.sampleRate;
    const win = Math.floor(sr * 0.02); const env = [];
    for (let i = 0; i < ch.length; i += win) { let s = 0; for (let j = i; j < Math.min(i + win, ch.length); j++) s += ch[j] * ch[j]; env.push(Math.sqrt(s / win)); }
    ac.close?.();
    const max = Math.max(...env, 1e-6);
    const norm = env.map(v => v / max);
    const th = 0.12;
    let first = norm.findIndex(v => v > th), last = norm.length - 1 - [...norm].reverse().findIndex(v => v > th);
    if (first < 0) return { ok: true, silent: true, peaks: bucket(norm, 64) };
    let pauses = 0, run = 0;
    for (let i = first; i <= last; i++) { if (norm[i] < th) run++; else { if (run * 0.02 >= 0.3) pauses++; run = 0; } }
    return { ok: true, peaks: bucket(norm, 64), speechSec: (last - first + 1) * 0.02, pauses };
  } catch (e) { return { ok: false }; }
  function bucket(a, n) { const out = []; const k = a.length / n; for (let i = 0; i < n; i++) { const sl = a.slice(Math.floor(i * k), Math.floor((i + 1) * k) || Math.floor(i * k) + 1); out.push(Math.max(0, ...sl)); } return out; }
}

export function playUrl(url) {
  return new Promise(res => { const a = new Audio(url); a.playsInline = true; a.onended = res; a.onerror = res; a.play().catch(res); });
}
