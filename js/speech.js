// 음성: STT(Web Speech API) · TTS(speechSynthesis) · 녹음(MediaRecorder) · 녹음 분석(Web Audio)
import { get } from './store.js';
import { diff } from './compare.js';

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const ua = navigator.userAgent;
export const support = {
  stt: !!SR,
  tts: 'speechSynthesis' in window,
  rec: !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder),
  standalone: window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
  ios: /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  android: /Android/.test(ua),
  browser: /CriOS/.test(ua) ? 'Chrome(iOS)' : /EdgA?\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : '기타'
};

// ---------- TTS ----------
// 목표: 부드럽고 차분한 젊은 남성 영어 음성 우선. 기기에 있는 음성 중에서만 고름 (실제 인물 목소리 복제 없음)
let voices = [];
function loadVoices() { voices = support.tts ? speechSynthesis.getVoices() : []; }
if (support.tts) { loadVoices(); speechSynthesis.addEventListener?.('voiceschanged', loadVoices); }
const MALE = /\b(Aaron|Arthur|Daniel|Evan|Nathan|Tom|Alex|Oliver|Gordon|Lee|Rishi|Andrew|Brian|Guy|Christopher|Eric|Roger|Steffan|Ryan|Thomas|Liam|William|Davis|Jason|Tony|Noah|Elliot|Jacob|Brandon|Kai|Male)\b|en-us-x-(iom|iol|tpd)|en-gb-x-(gbd|rjs)/i;
const SOFT = /\b(Aaron|Evan|Nathan|Andrew|Brian|Oliver|Arthur|Elliot)\b/i;
const NOVELTY = /\b(Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Zarvox|Trinoids|Whisper|Jester|Organ|Superstar|Albert|Bad News|Good News|Fred|Ralph|Junior|Kathy|Princess|Hysterical|Deranged)\b/i;
export const isMale = v => MALE.test(v.name + ' ' + v.voiceURI);
function score(v) {
  let s = 0;
  if (NOVELTY.test(v.name)) return -50;
  if (isMale(v)) s += 6;
  if (SOFT.test(v.name)) s += 2;
  if (/enhanced|premium|natural|neural|online/i.test(v.name)) s += 4;
  if (/en[-_]US/i.test(v.lang)) s += 1.5; else if (/en[-_](GB|AU|CA|IE|NZ)/i.test(v.lang)) s += 0.8;
  if (v.localService) s += 0.3;
  return s;
}
export function enVoices() {
  loadVoices();
  return voices.filter(v => /^en([-_]|$)/i.test(v.lang)).sort((a, b) => score(b) - score(a));
}
export function pickVoice() {
  const want = get().settings.voiceURI;
  const list = enVoices();
  return list.find(v => v.voiceURI === want) || list[0] || null; // 저장한 음성이 없으면 추천 1순위로 대체
}

// speak(text, {rate, onWord(i), onEnd}) → {stop, done:Promise<durationMs>}
export function speak(text, opt = {}) {
  if (!support.tts || !text) { opt.onEnd?.(0); return { stop() { }, done: Promise.resolve(0) }; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
  const st = get().settings;
  u.rate = opt.rate || st.rate || 0.92;
  u.pitch = opt.pitch || st.pitch || 1;
  const words = [...text.matchAll(/\S+/g)].map(m => ({ i: m.index, len: m[0].length }));
  let t0 = 0, gotBoundary = false, est, stopped = false;
  let resolve; const done = new Promise(r => (resolve = r));
  u.onstart = () => {
    t0 = performance.now();
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
  let fired = false;
  const fin = () => { if (fired) return; fired = true; clearTimeout(est); const d = t0 ? performance.now() - t0 : 0; opt.onEnd?.(d); resolve(d); };
  u.onend = fin; u.onerror = fin;
  speechSynthesis.speak(u);
  return { stop() { stopped = true; speechSynthesis.cancel(); fin(); }, done };
}
export const stopSpeak = () => support.tts && speechSynthesis.cancel();

// ---------- 인식 보정 사전 ----------
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

// ---------- 마이크 캡처 ----------
// capture({stt, record, onInterim, onState, targets, autoStop, prefix})
//  · 기본(수동 모드): 사용자가 '끝내기'를 누를 때까지 계속 들어요.
//    잠깐 멈춰도 자동 종료하지 않고, 브라우저가 인식을 끊으면 이어서 다시 시작합니다.
//  · autoStop: 말이 끝나면 자동 종료 (쉐도잉 전용)
//  · onState: 'starting' | 'listening' | 'hearing' | 'reconnecting' | 'processing' | 'done'
//  · targets: 예시 문장 → 인식 후보 여러 개 중 예시와 가장 가까운 걸 고름
const FATAL = new Set(['not-allowed', 'service-not-allowed', 'audio-capture', 'network', 'language-not-supported', 'bad-grammar']);
export function capture(opt = {}) {
  const wantStt = opt.stt !== false && support.stt;
  const wantRec = !!opt.record && support.rec;
  const manual = !opt.autoStop;
  const targets = (opt.targets || []).filter(Boolean);
  let committed = opt.prefix || '', session = '', conf = 0, sttError = null, userStop = false, restarts = 0, rapid = 0, sessT0 = 0, endedBy = null;
  let rec, mr, stream, chunks = [], t0 = performance.now(), ended = false, silT;
  let resolve; const result = new Promise(r => (resolve = r));
  let sttDone = !wantStt, recDone = !wantRec, blob = null;
  const setState = s => opt.onState?.(s);
  const maxT = setTimeout(() => { endedBy = 'max'; stop(); }, opt.maxMs || (manual ? 180000 : 20000));
  const full = () => (committed + ' ' + session).replace(/\s+/g, ' ').trim();

  const finish = () => {
    if (!sttDone || !recDone || ended) return; ended = true; clearTimeout(maxT); clearTimeout(silT);
    setState('done');
    resolve({ text: fixText(full()), confidence: conf, blob, url: blob ? URL.createObjectURL(blob) : null, durationMs: performance.now() - t0, sttError, recUsed: !!blob, endedBy: endedBy || (userStop ? 'user' : 'browser') });
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
      if (!wantStt) setState('listening');
    } catch (e) { sttError = sttError || (e?.name === 'NotAllowedError' ? 'mic-denied' : 'mic-fail'); recDone = true; finish(); }
  }
  function startStt() {
    try {
      rec = new SR(); rec.lang = get().settings.sttLang || 'en-US'; rec.interimResults = true; rec.continuous = manual; rec.maxAlternatives = targets.length ? 5 : 1;
      rec.onstart = () => setState('listening');
      rec.onaudiostart = () => setState('listening');
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
        setState('hearing');
        opt.onInterim?.(fixText(full()));
        if (!manual) { clearTimeout(silT); if (full()) silT = setTimeout(() => !userStop && stop(), opt.silenceMs || 1600); }
      };
      rec.onerror = e => {
        if (e.error === 'no-speech' || e.error === 'aborted') return; // 조용함/중단 → onend에서 재시작
        if (FATAL.has(e.error)) sttError = e.error; else sttError = sttError || e.error;
      };
      rec.onend = () => {
        // 수동 모드: 사용자가 끝내기 전까지 계속 이어서 듣기
        if (manual && !userStop && !FATAL.has(sttError)) {
          committed = full(); session = '';
          const quick = performance.now() - sessT0 < 600; rapid = quick ? rapid + 1 : 0; restarts++;
          if (rapid < 8) {
            setState('reconnecting');
            setTimeout(() => {
              if (userStop) { sttDone = true; finish(); return; }
              try { sessT0 = performance.now(); rec.start(); } catch { sttError = sttError || 'restart-fail'; endStt(); }
            }, quick ? 250 : 60);
            return;
          }
          sttError = sttError || 'restart-fail';
        }
        endStt();
      };
      sessT0 = performance.now(); rec.start(); setState('starting');
    } catch (e) { sttError = 'stt-start'; sttDone = true; finish(); }
  }
  function endStt() {
    sttDone = true;
    // 인식이 끝났는데 녹음만 남아 있으면: 수동 모드는 녹음 계속(사용자가 끝냄), 자동 모드는 같이 종료
    if (mr && mr.state === 'recording') { if (!manual || userStop) setTimeout(() => mr.state === 'recording' && mr.stop(), 300); else setState('rec-only'); }
    finish();
  }
  (async () => {
    setState('starting');
    if (wantRec) await startRec();
    if (wantStt) startStt();
    if (!wantStt && !wantRec) { sttError = 'unsupported'; finish(); }
  })();

  function stop() {
    if (userStop) return; userStop = true; clearTimeout(silT); setState('processing');
    try { rec && rec.stop(); } catch { }
    try { mr && mr.state === 'recording' && mr.stop(); } catch { }
    // 브라우저가 onend를 안 주는 경우 대비
    setTimeout(() => { sttDone = true; recDone = recDone || !mr || mr.state === 'inactive'; if (!recDone) { try { mr.stop(); } catch { } recDone = true; } finish(); }, 1600);
  }
  return { stop, result, get text() { return fixText(full()); } };
}

export function sttErrorText(e) {
  const ios = support.ios;
  return ({
    'not-allowed': ios ? '마이크 권한이 꺼져 있어요. 설정 › Safari › 마이크(또는 주소창 aA › 웹 사이트 설정)에서 허용해주세요.' : '마이크 권한이 꺼져 있어요. 주소창의 사이트 설정에서 마이크를 허용해주세요.',
    'service-not-allowed': ios ? '음성 인식을 쓸 수 없어요. 설정 › 일반 › 키보드 › 받아쓰기 켜기, 또는 설정 › Siri를 확인해주세요.' : '이 브라우저에서 음성 인식 서비스가 막혀 있어요.',
    'mic-denied': '마이크 권한이 거부됐어요. 브라우저 설정에서 허용해주세요.',
    'mic-fail': '마이크를 열지 못했어요. 다른 앱이 마이크를 쓰고 있는지 확인해주세요.',
    'audio-capture': '마이크 입력을 받지 못했어요. 녹음과 인식이 충돌했을 수 있어요.',
    'network': '음성 인식 서버에 연결하지 못했어요. 네트워크를 확인해주세요.',
    'language-not-supported': '선택한 인식 언어를 지원하지 않아요. SETTINGS › 인식 언어를 바꿔보세요.',
    'restart-fail': '브라우저가 음성 인식을 멈췄어요. 이어서 말하려면 “이어 말하기”를 눌러주세요.',
    'unsupported': '이 브라우저는 음성 인식을 지원하지 않아요. 키보드의 받아쓰기(🎤)로 입력해주세요.',
    'stt-start': '음성 인식을 시작하지 못했어요. 잠시 후 다시 눌러주세요.'
  })[e] || (e ? `음성 인식 오류: ${e}` : '');
}

// ---------- 녹음 분석 (실제 측정 가능한 항목만) ----------
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
