// 공통 UI 헬퍼 + 재사용 컴포넌트 (마이크 · 힌트 · 레벨 비교 · 쉐도잉)
import * as S from './speech.js';
import * as D from './store.js';
import { markPattern, diffWords } from './compare.js';
import { hintSteps } from './judge.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
export function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

const P = {
  video: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M10.5 9.8v4.4l3.8-2.2z"/>',
  speak: '<rect x="3" y="6.5" width="12.5" height="11" rx="2.5"/><path d="M15.5 10.5l5-3v9l-5-3z"/>',
  talk: '<path d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 17 16h-6l-4 3.5V16a2.5 2.5 0 0 1-2.5-2.5z"/>',
  saved: '<path d="M7 3.5h10a1 1 0 0 1 1 1v16l-6-4-6 4v-16a1 1 0 0 1 1-1z"/>',
  bookmark: '<path d="M7 3.5h10a1 1 0 0 1 1 1v16l-6-4-6 4v-16a1 1 0 0 1 1-1z"/>',
  paste: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9.5 4V3h5v1M9.5 10h5M9.5 14h5"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="1.5"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  pause: '<path d="M9 5.5v13M15 5.5v13"/>',
  replay: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  speaker: '<path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6"/>',
  kbd: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M7 14h10"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  phoneF: '<path fill="currentColor" stroke="none" d="M6.6 10.8a15.2 15.2 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.58 3.57a1 1 0 0 1-.25 1z"/>',
  phoneoff: '<path fill="currentColor" stroke="none" d="M12 9.2c-1.6 0-3.15.25-4.6.72v3.1c0 .4-.23.74-.56.9-.98.5-1.87 1.12-2.66 1.85a1 1 0 0 1-1.4-.01L.3 13.28a1 1 0 0 1 0-1.41C3.34 8.98 7.46 7.2 12 7.2s8.66 1.78 11.71 4.67a1 1 0 0 1 0 1.41l-2.48 2.48a1 1 0 0 1-1.41.01 11.3 11.3 0 0 0-2.66-1.85 1 1 0 0 1-.56-.9v-3.1A15 15 0 0 0 12 9.2z"/>',
  micF: '<rect x="8.6" y="2.6" width="6.8" height="12" rx="3.4" fill="currentColor" stroke="none"/><path d="M5.2 11.2a6.8 6.8 0 0 0 13.6 0M12 18v3.2"/>',
  heartF: '<path fill="currentColor" stroke="none" d="M12 20.3s-7.8-4.7-7.8-10.4A4.4 4.4 0 0 1 12 7.2a4.4 4.4 0 0 1 7.8 2.7c0 5.7-7.8 10.4-7.8 10.4z"/>',
  cam: '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 11l5-3v8l-5-3z"/>',
  cc: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10.5 10.5a2 2 0 1 0 0 3M16.5 10.5a2 2 0 1 0 0 3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  shuffle: '<path d="M4 7h3l10 10h3M4 17h3l3-3M14 10l3-3h3M18 4l2 3-2 3M18 14l2 3-2 3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  wave: '<path d="M3 12h2M7 8v8M11 5v14M15 8v8M19 10v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  sparkle: '<path d="M12 4l1.8 4.6L18.5 10l-4.7 1.6L12 16l-1.8-4.4L5.5 10l4.7-1.4z"/>',
  loop: '<path d="M17 2l3 3-3 3M3 11V9a4 4 0 0 1 4-4h13M7 22l-3-3 3-3M21 13v2a4 4 0 0 1-4 4H4"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  apply: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/>',
  marker: '<path d="M14.5 4.5l5 5L10 19H5v-5z"/><path d="M4 21h8"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  word: '<path d="M4 6h16M4 12h10M4 18h7"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  chat: '<path d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 17 16h-6l-4 3.5V16a2.5 2.5 0 0 1-2.5-2.5z"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'
};
export const ic = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;

let toastT;
export function toast(msg) {
  let t = $('.toast'); if (!t) { t = h('<div class="toast" role="status"></div>'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400);
}
export function sheet(html, { onClose } = {}) {
  const bg = h('<div class="sheet-bg"></div>'); const sh = h(`<div class="sheet" role="dialog"><div class="grab"></div>${html}</div>`);
  document.body.append(bg, sh); requestAnimationFrame(() => { bg.classList.add('on'); sh.classList.add('on'); });
  let closed = false;
  const close = () => { if (closed) return; closed = true; bg.classList.remove('on'); sh.classList.remove('on'); setTimeout(() => { bg.remove(); sh.remove(); }, 300); onClose?.(); };
  bg.onclick = close; sh.close = close; return sh;
}
export function confirmSheet(msg, okLabel = '삭제', detail = '') {
  return new Promise(res => {
    let v = false;
    const s = sheet(`<h3>${esc(msg)}</h3>${detail ? `<p class="sheet-p">${detail}</p>` : ''}<div class="row"><button class="btn soft grow" data-a="0">취소</button><button class="btn danger grow" data-a="1">${esc(okLabel)}</button></div>`, { onClose: () => res(v) });
    $$('[data-a]', s).forEach(b => b.onclick = () => { v = b.dataset.a === '1'; s.close(); });
  });
}
export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch { return false; }
}
// YouTube 공식 앱/사이트에서 해당 구간 열기 (iPhone에선 YouTube 앱이 설치돼 있으면 앱으로 열림)
export const ytLink = (ytId, start = 0) => `https://youtu.be/${ytId}${start ? `?t=${Math.floor(start)}` : ''}`;

// ---------- 마이크 블록 ----------
// 수동 종료: 사용자가 '끝내기'를 눌러야만 끝나요. 잠깐 멈춰도 계속 들어요.
// micBlock(el, {placeholder, record, targets, onStart, onResult(text,res), onEdit})
const STATE_TEXT = {
  idle: '눌러서 영어로 말하기', starting: '준비 중…', listening: '듣는 중 · 다 말하면 ■', hearing: '듣는 중 · 다 말하면 ■',
  reconnecting: '듣는 중 · 다 말하면 ■', 'rec-only': '녹음 중', processing: '정리하는 중…', done: '다 됐어요 · 글자는 고쳐도 돼요'
};
export function micBlock(el, opt = {}) {
  const mode = S.support.stt ? 'stt' : S.support.rec ? 'rec' : 'none';
  const sub = mode === 'stt' ? '' : '음성 인식이 안 되는 브라우저예요 · 아래에 입력해요';
  el.innerHTML = `<div class="mic-block">
    <div class="mic-row">
      <button class="mic" aria-label="말하기 시작" ${mode === 'none' ? 'disabled' : ''}>${ic('mic')}</button>
      <div class="mic-info"><div class="mic-status" data-s="idle"><i></i><span>${mode === 'none' ? '직접 입력' : STATE_TEXT.idle}</span><em class="mic-time"></em></div>${sub ? `<div class="mic-sub">${sub}</div>` : ''}</div>
    </div>
    <textarea class="textarea live en" rows="2" placeholder="${esc(opt.placeholder || '말한 문장이 여기에 나와요 · 고쳐도 돼요')}" autocapitalize="sentences" spellcheck="false"></textarea>
    <div class="mic-extra hide"><button class="chip line" data-x="cont">${ic('plus')} 이어 말하기</button><button class="chip line" data-x="clear">${ic('x')} 지우기</button></div>
  </div>`;
  const btn = $('.mic', el), stEl = $('.mic-status', el), stT = $('.mic-status span', el), tm = $('.mic-time', el), ta = $('textarea', el), extra = $('.mic-extra', el);
  let cap = null, lastRes = null, timer = null, t0 = 0;
  const setState = (s, text) => { stEl.dataset.s = s; stT.textContent = text || STATE_TEXT[s] || ''; };
  const showExtra = () => {
    extra.classList.toggle('hide', !ta.value);
    $('[data-x=cont]', extra).classList.toggle('hide', !(mode === 'stt' && ta.value));
    $('[data-x=clear]', extra).classList.toggle('hide', !ta.value);
  };
  async function start(prefix = '') {
    S.stopSpeak(); opt.onStart?.();
    btn.classList.add('live'); btn.innerHTML = ic('stop'); btn.setAttribute('aria-label', '끝내기');
    t0 = Date.now(); tm.textContent = '0:00'; clearInterval(timer);
    timer = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); tm.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 500);
    extra.classList.add('hide');
    cap = S.capture({ stt: mode === 'stt', record: mode === 'rec', prefix, targets: opt.targets?.(), onState: s => s !== 'done' && setState(s), onInterim: t => (ta.value = t) });
    const res = await cap.result; cap = null; lastRes = res;
    clearInterval(timer); btn.classList.remove('live'); btn.innerHTML = ic('mic'); btn.setAttribute('aria-label', '말하기 시작');
    if (res.text) ta.value = res.text;
    if (res.sttError && !res.text) setState('error', S.sttErrorText(res.sttError));
    else if (mode === 'rec') setState('done', res.url ? '녹음 완료 · 문장은 아래에 직접 입력해주세요' : '녹음되지 않았어요');
    else if (!res.text) setState('error', '잘 안 들렸어요 · 다시 눌러 말해주세요');
    else if (res.sttError === 'restart-fail' || res.endedBy === 'browser') setState('warn', '브라우저가 인식을 멈췄어요 · 필요하면 “이어 말하기”');
    else if (res.endedBy === 'max') setState('warn', '시간이 길어서 자동으로 멈췄어요');
    else setState('done');
    showExtra();
    opt.onResult?.(ta.value.trim(), res);
  }
  btn.onclick = () => { if (cap) { cap.stop(); setState('processing'); return; } start(); };
  extra.onclick = e => {
    const x = e.target.closest('[data-x]')?.dataset.x;
    if (x === 'cont' && !cap) start(ta.value.trim());
    if (x === 'clear') { ta.value = ''; showExtra(); opt.onEdit?.(''); setState('idle'); }
  };
  ta.oninput = () => { opt.onEdit?.(ta.value.trim()); showExtra(); };
  return { get text() { return ta.value.trim(); }, set text(v) { ta.value = v || ''; showExtra(); }, get res() { return lastRes; }, focus: () => ta.focus(), stop: () => cap?.stop(), start: () => { if (!cap && mode !== 'none') start(); }, get busy() { return !!cap; } };
}

// ---------- 플래시카드 ----------
// 앞면: 한국어 원문 / 뒷면: 추천 영어 문장 하나. 탭하면 뒤집힘.
export function flashcard(el, { ko, en, pattern = '', flipped = false, onFlip } = {}) {
  el.innerHTML = `<button class="fc ${flipped ? 'flip' : ''}" aria-label="카드 뒤집기"><span class="fc-in">
    <span class="face front"><span class="fc-tag">한국어</span><span class="fc-ko">${esc(ko)}</span><span class="fc-tip">탭해서 영어 보기</span></span>
    <span class="face back"><span class="fc-tag en-tag">추천 문장</span><span class="fc-en en">${markPattern(en || '—', pattern, esc)}</span><span class="fc-tip">탭해서 한국어 보기</span></span>
  </span></button>`;
  const c = $('.fc', el);
  c.onclick = () => { c.classList.toggle('flip'); onFlip?.(c.classList.contains('flip')); };
  return { set(f) { c.classList.toggle('flip', !!f); }, get flipped() { return c.classList.contains('flip'); } };
}
// 한국어 · 내 답변 · 추천 문장을 한 화면에서 비교 (점수·취소선 없음)
export function compareRows({ ko, mine, rec, pattern = '' }) {
  return `<div class="cmp3">
    <div class="r"><span class="fc-tag">한국어</span><p>${esc(ko)}</p></div>
    <div class="r mine"><span class="fc-tag">내 답변</span><p class="en ${mine ? '' : 'muted'}">${mine ? esc(mine) : '말한 문장이 없어요'}</p></div>
    <div class="r rec"><span class="fc-tag en-tag">추천 문장</span><p class="en">${markPattern(rec || '—', pattern, esc)}</p></div>
  </div>`;
}
// 추천 문장은 Natural 하나만 사용 (예전 데이터에 natural이 비어 있으면 있는 것으로 대체)
export const natOf = u => u?.en?.natural || u?.en?.easy || u?.en?.advanced || u?.text || '';


// ---------- Before → After ----------
// before: 내가 말한 영어 · after: 추천(개선) 문장 · changes: [{from,to,why}] (규칙이 알려준 이유)
export function beforeAfter({ before = '', after = '', ko = '', changes = [], pattern = '', marks = [], afterLabel = '추천 문장', note = '' } = {}) {
  const b = String(before || '').trim(), a = String(after || '').trim();
  const head = ko ? `<div class="ba-ko"><span class="ba-tag">한국어</span><p>${esc(ko)}</p></div>` : '';
  if (!b) return `<div class="ba">${head}<div class="ba-row before empty"><span class="ba-tag">Before</span><p>말한 문장이 없어요</p></div><div class="ba-arrow">${ic('down')}</div>
    <div class="ba-row after"><span class="ba-tag pink">After · ${esc(afterLabel)}</span><p class="en">${markPattern(a, pattern, esc, marks)}</p></div></div>`;
  const d = diffWords(b, a);
  const loose = d.sim < 0.34; // 거의 다른 문장 → 줄 단위로만 비교
  let bHTML = '', aHTML = '';
  if (loose) { bHTML = esc(b); aHTML = markPattern(a, pattern, esc, marks); }
  else {
    const grp = (list, cls) => { let out = '', run = []; const flush = () => { if (run.length) { out += `<${cls}>${run.map(esc).join(' ')}</${cls}> `; run = []; } }; list.forEach(([t, w]) => { if (t) run.push(w); else { flush(); out += esc(w) + ' '; } }); flush(); return out.trim(); };
    bHTML = grp(d.ops.filter(o => o.op !== 'add').map(o => [o.op === 'del', o.a]), 'del');
    aHTML = grp(d.ops.filter(o => o.op !== 'del').map(o => [o.op === 'add', o.b]), 'ins');
  }
  const same = !loose && !d.hunks.length;
  const why = h => { const c = changes.find(c => c.to && h.to.toLowerCase().includes(String(c.to).toLowerCase().split(' ')[0])) || changes.find(c => c.from && h.from.toLowerCase().includes(String(c.from).toLowerCase().split(' ')[0])); return c?.why || ''; };
  const list = loose ? [] : d.hunks.slice(0, 4);
  return `<div class="ba">${head}
    <div class="ba-row before"><span class="ba-tag">Before · 내가 말한 영어</span><p class="en">${bHTML}</p></div>
    <div class="ba-arrow">${ic('down')}</div>
    <div class="ba-row after ${same ? 'same' : ''}"><span class="ba-tag pink">${same ? '완벽해요 · 고칠 곳이 없어요' : `After · ${esc(afterLabel)}`}</span><p class="en">${aHTML}</p></div>
    ${list.length ? `<ul class="ba-changes">${list.map(h => `<li><span class="from">${h.from ? esc(h.from) : '<i>추가</i>'}</span>${ic('next')}<span class="to">${h.to ? esc(h.to) : '<i>빼기</i>'}</span>${why(h) ? `<small>${esc(why(h))}</small>` : ''}</li>`).join('')}</ul>` : ''}
    ${loose ? `<p class="ba-note">다른 표현으로 말했어요. 뜻이 같다면 그것도 좋은 답이에요.</p>` : ''}
    ${note ? `<p class="ba-note">${note}</p>` : ''}
  </div>`;
}

// ---------- 힌트: 단계별 (작은 단서 → 핵심 단어·표현, 정답 전체는 안 보여줌) ----------
export function hintBox(el, en, opt = {}) {
  const steps = hintSteps(en, opt); let n = 0;
  if (!steps.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="hintbox"><button class="hint-btn" type="button">${ic('bulb')}<span>힌트</span><em>0/${steps.length}</em></button><span class="hint-now en"></span></div>`;
  const btn = $('.hint-btn', el), now = $('.hint-now', el);
  btn.onclick = () => {
    if (n >= steps.length) return;
    now.textContent = steps[n]; now.classList.remove('pop'); void now.offsetWidth; now.classList.add('pop'); n++;
    $('em', btn).textContent = `${n}/${steps.length}`; btn.disabled = n >= steps.length;
  };
}

// ---------- 의미 단위 줄바꿈: 쉼표·접속사 앞에서 끊기도록 덩어리로 묶기 ----------
const CUT = /^(and|but|because|so|when|if|which|who|that's why|then|or|since|while|after|before|until|though|although)$/i;
export function unitHTML(text, pattern = '', marks = []) {
  const t = String(text || '').trim(); if (!t) return '';
  if (t.length < 34) return markPattern(t, pattern, esc, marks);
  const W = t.split(/\s+/), chunks = []; let cur = [];
  W.forEach((w, i) => {
    if (cur.length >= 2 && CUT.test(w.replace(/[^\w']/g, ''))) { chunks.push(cur.join(' ')); cur = []; }
    cur.push(w);
    if (/[,;:.?!]$/.test(w) && i < W.length - 1 && cur.length >= 2) { chunks.push(cur.join(' ')); cur = []; }
  });
  if (cur.length) { if (cur.length === 1 && chunks.length) chunks[chunks.length - 1] += ' ' + cur[0]; else chunks.push(cur.join(' ')); }
  return chunks.map(c => `<span class="u">${markPattern(c, pattern, esc, marks)}</span>`).join(' ');
}

// ---------- 평가 한 줄 (판정 + 자연스러운 피드백) ----------
export function verdictHTML(ev) {
  if (!ev) return '';
  return `<div class="vd ${ev.level}"><b><i></i>${esc(ev.title)}</b>${ev.msg ? `<span>${esc(ev.msg)}</span>` : ''}</div>`;
}

// ---------- 말하기 카드 ----------
// read: 영어를 크게 보고 말하기 · recall: 한국어를 위에 두고 영어로 바꿔 말하기 (+ 힌트)
export function sayCard(el, { ko = '', en = '', pattern = '', keywords = [], mode = 'read', marks = [] } = {}) {
  if (mode === 'read') {
    el.innerHTML = `<div class="say read"><span class="say-tag">보고 말하기</span><p class="say-en en">${unitHTML(en, pattern, marks)}</p>${ko ? `<p class="say-ko">${esc(ko)}</p>` : ''}</div>`;
  } else {
    el.innerHTML = `<div class="say recall"><span class="say-tag">안 보고 말하기</span>${ko ? `<p class="say-ko-big">${esc(ko)}</p>` : ''}<div class="say-hint"></div></div>`;
    hintBox($('.say-hint', el), en, { pattern, keywords });
  }
}

// ---------- 외우고 싶은 표현 고르기 (단어를 눌러 범위 선택) ----------
// onSave(phrase, {asWord}) · marks: 이미 표시한 표현
export function phrasePicker(el, sentence, { marks = [], onSave, onUnmark } = {}) {
  const words = String(sentence || '').split(/\s+/).filter(Boolean);
  let a = -1, b = -1;
  const isMarked = i => marks.some(m => { const mw = m.toLowerCase().split(/\s+/); for (let k = 0; k <= words.length - mw.length; k++) if (mw.every((x, j) => clean(words[k + j]) === clean(x)) && i >= k && i < k + mw.length) return true; return false; });
  const render = () => {
    const lo = Math.min(a, b), hi = Math.max(a, b);
    el.innerHTML = `<div class="picker"><p class="pick-words en">${words.map((w, i) => `<button type="button" data-i="${i}" class="${a >= 0 && i >= lo && i <= hi ? 'sel' : ''} ${isMarked(i) ? 'mk' : ''}">${esc(w)}</button>`).join(' ')}</p>
      <div class="pick-bar ${a >= 0 ? 'on' : ''}">${a >= 0 ? `<span class="pick-cur en">${esc(phrase())}</span><button class="btn sm soft" data-x="word">${ic('word')} 단어로</button><button class="btn sm" data-x="expr">${ic('marker')} 표현 저장</button>` : `<span class="pick-tip">외우고 싶은 단어를 눌러요 · 두 번째로 누른 곳까지 이어서 선택돼요</span>`}</div>
      ${marks.length ? `<div class="pick-marks">${marks.map(m => `<span class="hchip on en">${esc(m)}<button type="button" data-un="${esc(m)}" aria-label="표시 지우기">${ic('x')}</button></span>`).join('')}</div>` : ''}</div>`;
    $$('[data-i]', el).forEach(btn => btn.onclick = () => {
      const i = +btn.dataset.i;
      if (a < 0 || (a >= 0 && b !== a)) { a = b = i; } else if (i === a) { a = b = -1; } else { b = i; }
      render();
    });
    $$('[data-x]', el).forEach(btn => btn.onclick = () => { const p = phrase(); if (!p) return; onSave?.(p, { asWord: btn.dataset.x === 'word' }); marks = [...new Set([...marks, p])]; a = b = -1; render(); });
    $$('[data-un]', el).forEach(btn => btn.onclick = () => { const m = btn.dataset.un; marks = marks.filter(x => x !== m); onUnmark?.(m); render(); });
  };
  const clean = w => String(w).toLowerCase().replace(/[^a-z0-9']/g, '');
  const phrase = () => { if (a < 0) return ''; const lo = Math.min(a, b), hi = Math.max(a, b); return words.slice(lo, hi + 1).join(' ').replace(/^[^\w']+|[^\w']+$/g, ''); };
  render();
}


// ---------- 저장 토글: 누르면 저장 · 다시 누르면 저장 취소 ----------
// btn에 .on 클래스로 상태 표시. make(): saveExpr에 넘길 항목 / word: 단어·표현으로 저장
export function saveToggle(btn, text, make, { word = false, onChange } = {}) {
  const find = () => word ? D.findWordByText(text) : D.findSavedByText(text);
  btn.classList.toggle('on', !!find());
  btn.onclick = e => {
    e.stopPropagation();
    const ex = find();
    if (ex) { word ? D.deleteWord(ex.id) : D.deleteSaved(ex.id); btn.classList.remove('on'); toast('저장을 취소했어요'); }
    else { word ? D.saveWord(make()) : D.saveExpr(make()); btn.classList.add('on'); toast('저장했어요'); }
    onChange?.(!ex);
  };
}

// ---------- 내 문장 교정: 고친 부분만 핑크로 (취소선 없음) + 이유 한 줄 ----------
// r: feedback.improve() 결과 {before, after, changes, same}
export function correctionHTML(r, { save = true } = {}) {
  if (!r) return '';
  if (r.same) return `<div class="cor"><span class="cor-l">내 문장</span><div class="cor-s"><p class="en">${esc(r.after)}</p>${save ? `<button class="sv" type="button" data-sv="${esc(r.after)}" aria-label="저장">${ic('bookmark')}</button>` : ''}</div><p class="cor-ok">${ic('check')} 문법적으로 고칠 곳은 없어요</p></div>`;
  const d = diffWords(r.before, r.after);
  const html = d.ops.filter(o => o.op !== 'del').map(o => o.op === 'add' ? `<ins>${esc(o.b)}</ins>` : esc(o.b)).join(' ').replace(/<\/ins> <ins>/g, ' ');
  const why = (r.changes || []).filter(c => c.why).slice(0, 2);
  return `<div class="cor"><span class="cor-l">내 문장 교정</span><div class="cor-s"><p class="en">${html}</p>${save ? `<button class="sv" type="button" data-sv="${esc(r.after)}" aria-label="저장">${ic('bookmark')}</button>` : ''}</div>
    ${why.length ? `<ul class="cor-why">${why.map(c => `<li>${c.from && c.to ? `<b class="en">${esc(c.from)} → ${esc(c.to)}</b> ` : ''}${esc(c.why)}</li>`).join('')}</ul>` : ''}</div>`;
}

// ---------- 왼쪽으로 밀어서 삭제 ----------
export function swipeDelete(row, onDelete) {
  row.classList.add('swipe');
  row.innerHTML = `<div class="sw-in">${row.innerHTML}</div><button class="sw-del" type="button">삭제</button>`;
  const inner = row.firstElementChild, W = 76; let x0 = 0, y0 = 0, dx = 0, open = false, drag = false, lock = null;
  const set = (x, anim) => { inner.style.transition = anim ? 'transform .25s var(--ease)' : 'none'; inner.style.transform = `translateX(${x}px)`; };
  inner.addEventListener('pointerdown', e => { x0 = e.clientX; y0 = e.clientY; drag = true; lock = null; dx = open ? -W : 0; });
  inner.addEventListener('pointermove', e => {
    if (!drag) return; const mx = e.clientX - x0, my = e.clientY - y0;
    if (lock == null && (Math.abs(mx) > 6 || Math.abs(my) > 6)) lock = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
    if (lock !== 'x') return;
    set(Math.max(-W * 1.4, Math.min(0, (open ? -W : 0) + mx)));
  });
  const end = e => { if (!drag) return; drag = false; if (lock !== 'x') return; const mx = e.clientX - x0; open = (open ? -W : 0) + mx < -W / 2; set(open ? -W : 0, true); };
  inner.addEventListener('pointerup', end); inner.addEventListener('pointercancel', end);
  inner.addEventListener('click', e => { if (open || lock === 'x') { e.preventDefault(); e.stopPropagation(); if (open && lock !== 'x') { open = false; set(0, true); } } }, true);
  row.querySelector('.sw-del').onclick = () => { row.classList.add('gone'); setTimeout(() => onDelete(), 220); };
}

// [data-sv]: 문장 저장 토글 · [data-sw]: 단어·표현 저장 토글
export function bindSaves(el, make = t => ({ kind: 'mine', level: 'mine', ko: '', text: t, en: { easy: '', natural: t, advanced: '' } })) {
  $$('[data-sv]', el).forEach(b => saveToggle(b, b.dataset.sv, () => make(b.dataset.sv)));
  $$('[data-sw]', el).forEach(b => saveToggle(b, b.dataset.sw, () => ({ text: b.dataset.sw, ko: b.dataset.ko || '', kind: b.dataset.sw.trim().split(/\s+/).length > 1 || /[~…]/.test(b.dataset.sw) ? 'expr' : 'word' }), { word: true }));
}
// 더 자연스러운 표현 (원어민 답변 예시 · 추천 문장) — 누르면 저장/취소
export function naturalHTML(list, label = '더 자연스럽게') {
  if (!list?.length) return '';
  return `<div class="nat"><span class="cor-l">${esc(label)}</span>${list.map(t => `<div class="nat-s"><p class="en">${unitHTML(t)}</p><button class="sv" type="button" data-sv="${esc(t)}" aria-label="저장">${ic('bookmark')}</button></div>`).join('')}</div>`;
}
export const exprChips = list => list?.length ? `<div class="rec-x">${list.map(x => `<button class="xp en" type="button" data-sw="${esc(x.text || x)}" data-ko="${esc(x.ko || '')}">${ic('plus')}<span>${esc(x.text || x)}</span>${x.ko ? `<small>${esc(x.ko)}</small>` : ''}</button>`).join('')}</div>` : '';
