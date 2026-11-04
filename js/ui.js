// 공통 UI 헬퍼 + 재사용 컴포넌트 (마이크 · 힌트 · 레벨 비교 · 쉐도잉)
import * as S from './speech.js';
import { diff, best, verdict, markPattern, mistakes, STOP, tokens } from './compare.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
export function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

const P = {
  video: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M10.5 9.8v4.4l3.8-2.2z"/>',
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
  phoneoff: '<path d="M3 13.5c5-4.5 13-4.5 18 0l-2.5 2.5-3-1.5v-3a12 12 0 0 0-7 0v3l-3 1.5z"/>',
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
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/>'
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
  idle: '탭해서 영어로 말하기', starting: '마이크 준비 중…', listening: '듣는 중 · 멈춰도 계속 들어요', hearing: '인식 중…',
  reconnecting: '듣는 중 · 인식 다시 연결', 'rec-only': '녹음 중 · 음성 인식은 멈춤', processing: '정리하는 중…', done: '완료 · 텍스트를 확인하고 고쳐도 돼요'
};
export function micBlock(el, opt = {}) {
  const mode = S.support.stt ? 'stt' : S.support.rec ? 'rec' : 'none';
  const sub = mode === 'stt' ? '끝내기를 누를 때까지 녹음돼요' : mode === 'rec' ? '이 브라우저는 음성 인식 미지원 · 녹음 후 아래에 직접 입력' : '음성 인식·녹음 미지원 · 아래에 직접 입력';
  el.innerHTML = `<div class="mic-block">
    <div class="mic-row">
      <button class="mic" aria-label="말하기 시작" ${mode === 'none' ? 'disabled' : ''}>${ic('mic')}</button>
      <div class="mic-info"><div class="mic-status" data-s="idle"><i></i><span>${mode === 'none' ? '직접 입력' : STATE_TEXT.idle}</span><em class="mic-time"></em></div><div class="mic-sub">${sub}</div></div>
    </div>
    <textarea class="textarea live en" rows="2" placeholder="${esc(opt.placeholder || '인식된 문장 · 직접 고쳐도 돼요')}" autocapitalize="sentences" spellcheck="false"></textarea>
    <div class="mic-extra hide"><button class="chip line" data-x="cont">${ic('plus')} 이어 말하기</button><button class="chip line" data-x="mine">${ic('play')} 내 녹음</button><button class="chip line" data-x="clear">${ic('x')} 지우기</button></div>
  </div>`;
  const btn = $('.mic', el), stEl = $('.mic-status', el), stT = $('.mic-status span', el), tm = $('.mic-time', el), ta = $('textarea', el), extra = $('.mic-extra', el);
  let cap = null, lastRes = null, timer = null, t0 = 0;
  const setState = (s, text) => { stEl.dataset.s = s; stT.textContent = text || STATE_TEXT[s] || ''; };
  const showExtra = () => {
    extra.classList.toggle('hide', !ta.value && !lastRes?.url);
    $('[data-x=cont]', extra).classList.toggle('hide', !(mode === 'stt' && ta.value));
    $('[data-x=mine]', extra).classList.toggle('hide', !lastRes?.url);
    $('[data-x=clear]', extra).classList.toggle('hide', !ta.value);
  };
  async function start(prefix = '') {
    S.stopSpeak(); opt.onStart?.();
    btn.classList.add('live'); btn.innerHTML = ic('stop'); btn.setAttribute('aria-label', '끝내기');
    t0 = Date.now(); tm.textContent = '0:00'; clearInterval(timer);
    timer = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); tm.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 500);
    extra.classList.add('hide');
    cap = S.capture({ stt: mode === 'stt', record: mode === 'rec' || !!opt.record, prefix, targets: opt.targets?.(), onState: s => s !== 'done' && setState(s), onInterim: t => (ta.value = t) });
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
    if (x === 'mine' && lastRes?.url) S.playUrl(lastRes.url);
    if (x === 'clear') { ta.value = ''; showExtra(); opt.onEdit?.(''); setState('idle'); }
  };
  ta.oninput = () => { opt.onEdit?.(ta.value.trim()); showExtra(); };
  return { get text() { return ta.value.trim(); }, set text(v) { ta.value = v || ''; showExtra(); }, get res() { return lastRes; }, focus: () => ta.focus(), stop: () => cap?.stop(), get busy() { return !!cap; } };
}

// ---------- 힌트 (단계별) ----------
// 1 핵심 단어 → 2 문장 시작 → 3 핵심 패턴 → 4 첫 글자 빈칸
export function hintBlock(el, { text, pattern } = {}) {
  if (!text) { el.innerHTML = ''; return; }
  const words = text.split(/\s+/).filter(Boolean);
  const keys = [...new Set(tokens(text).filter(w => !STOP.has(w) && w.length > 2))].slice(0, 4);
  const steps = [];
  if (keys.length) steps.push(['핵심 단어', keys.map(k => `<span class="chip">${esc(k)}</span>`).join(' ')]);
  steps.push(['문장 시작', `<span class="en">${esc(words.slice(0, Math.min(words.length > 5 ? 3 : 2, words.length - 1) || 1).join(' '))} …</span>`]);
  if (pattern) steps.push(['핵심 패턴', `<span class="en">${esc(pattern)}</span>`]);
  steps.push(['첫 글자', `<span class="en blanks">${words.map(w => esc(w.replace(/^([^A-Za-z]*[A-Za-z])([A-Za-z']*)(.*)$/, (m, a, b, c) => a + b.replace(/[A-Za-z]/g, '_') + c))).join(' ')}</span>`]);
  let n = 0;
  el.innerHTML = `<div class="hint"><button class="hint-btn">${ic('bulb')}<span>힌트 보기</span><em>0/${steps.length}</em></button><ol class="hint-list"></ol></div>`;
  const btn = $('.hint-btn', el), list = $('.hint-list', el);
  btn.onclick = () => {
    if (n >= steps.length) return;
    const [l, v] = steps[n++];
    list.insertAdjacentHTML('beforeend', `<li><span class="hint-l">${l}</span><div>${v}</div></li>`);
    $('span', btn).textContent = n >= steps.length ? '힌트 끝' : '다음 힌트';
    $('em', btn).textContent = `${n}/${steps.length}`;
    btn.disabled = n >= steps.length;
  };
}

// ---------- 비교 결과 ----------
export function diffHTML(d) {
  return `<div class="diff">${d.ops.map(o => `<span class="${o.op}"${o.heard ? ` title="들린 말: ${esc(o.heard)}"` : ''}>${esc(o.w)}</span>`).join(' ')}</div>`;
}
export function compareCard(user, cands, { title = '내 답변' } = {}) {
  if (!user) return '';
  const b = best(user, cands); if (!b) return '';
  const v = verdict(b.d.score); const m = mistakes(user);
  return `<div class="cmp">
    <div class="cmp-head"><span class="label">${esc(title)}</span><span class="score ${v.tone}">${b.d.score}<small>% 단어 일치</small></span></div>
    <div class="cmp-mine en">“${esc(user)}”</div>
    ${diffHTML(b.d)}
    ${b.d.missingKeys.length ? `<div class="row wrap gap4"><span class="tiny muted">빠진 단어</span>${b.d.missingKeys.slice(0, 5).map(w => `<span class="chip accent en">${esc(w)}</span>`).join('')}</div>` : ''}
    ${m.length ? `<div class="note warn">${m.map(x => `<b>${esc(x.from)}</b> → <b>${esc(x.to)}</b> · ${esc(x.why)}`).join('<br>')}</div>` : ''}
    <div class="tiny muted">${esc(b.label)} 기준 · ${esc(v.label)}</div>
  </div>`;
}
export const LEVELS = [['easy', 'Easy', '초보자도 쉽게'], ['natural', 'Natural', '원어민 일상 대화'], ['advanced', 'Advanced', '조금 더 풍부하게']];
export const levelsOf = u => LEVELS.filter(([k]) => u.en?.[k]).map(([k, l]) => ({ key: k, label: l, text: u.en[k] })).concat((u.alts || []).map((t, i) => ({ key: 'alt' + i, label: '다른 표현', text: t })));
export const targetsOf = u => levelsOf(u).map(l => l.text);
const same = (a, b) => tokens(a).join(' ') === tokens(b).join(' ');
// 중복 레벨 정리: 같은 문장이면 한 칸으로 합쳐 보여줌
export function distinctLevels(u) {
  const out = [];
  LEVELS.forEach(([k, l, d]) => {
    const t = u.en?.[k]; if (!t) return;
    const dup = out.find(o => same(o.text, t));
    if (dup) dup.also.push(l); else out.push({ key: k, label: l, desc: d, text: t, also: [] });
  });
  return out;
}

// ---------- 레벨 비교 보드 (CHECK) ----------
// levelBoard(el, u, {answer, isSaved(level), onSave(level), onShadow(text)})
export function levelBoard(el, u, { answer, isSaved, onSave, onShadow } = {}) {
  const lv = distinctLevels(u);
  const alts = (u.alts || []).filter(Boolean);
  if (!lv.length) { el.innerHTML = `<div class="note">영어 예시가 없어요. SETTINGS에서 문장을 편집해주세요.</div>`; return {}; }
  let cur = lv.find(l => l.key === 'natural') || lv[0];
  const paint = () => {
    el.innerHTML = `${compareCard(answer, levelsOf(u))}
    <div class="levels">${lv.map(l => `<div class="lv ${l.key === cur.key ? 'on' : ''}" data-k="${l.key}">
        <div class="lv-head"><span class="lv-tag ${l.key}">${l.label}${l.also.length ? ` · ${l.also.join(' · ')}` : ''}</span><span class="lv-desc">${l.desc}</span>
          <span class="lv-act"><button class="mini" data-tts="${esc(l.text)}" aria-label="듣기">${ic('speaker')}</button>${onSave ? `<button class="mini ${isSaved?.(l.key) ? 'on' : ''}" data-save="${l.key}" aria-label="저장">${ic('bookmark')}</button>` : ''}</span></div>
        <div class="lv-text en">${markPattern(l.text, u.pattern, esc)}</div>
      </div>`).join('')}
      ${lv.length < 3 && lv.some(l => l.also.length) ? `<div class="tiny muted lv-note">같은 문장인 레벨은 하나로 합쳐 보여줘요 · SETTINGS에서 레벨별 표현을 다르게 고칠 수 있어요</div>` : ''}
    </div>
    ${u.pattern ? `<div class="pattern"><b>PATTERN</b><span class="en">${esc(u.pattern)}</span></div>` : ''}
    ${alts.length ? `<div class="alts"><span class="label">이렇게도 말해요</span>${alts.map(t => `<button class="alt en" data-tts="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
    <div class="row ans-act"><button class="btn sm soft" data-a="slow">${ic('speaker')} 천천히 듣기</button>${onShadow ? `<button class="btn sm grow" data-a="sh">${ic('wave')} ${esc(cur.label)} 따라 말하기</button>` : ''}</div>`;
  };
  el.onclick = e => {
    const sv = e.target.closest('[data-save]'); if (sv) { onSave?.(sv.dataset.save); sv.classList.toggle('on', !!isSaved?.(sv.dataset.save)); return; }
    const t = e.target.closest('[data-tts]'); if (t) { S.speak(t.dataset.tts); return; }
    const k = e.target.closest('.lv[data-k]'); if (k) { cur = lv.find(l => l.key === k.dataset.k); paint(); return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'slow') S.speak(cur.text, { rate: 0.72 });
    if (a === 'sh') onShadow?.(cur.text);
  };
  paint();
  return { get level() { return cur; } };
}
export const answerCard = (el, u, o = {}) => levelBoard(el, u, o);

// ---------- 쉐도잉 ----------
export function shadowBlock(el, text, { onResult } = {}) {
  let rate = 0.9, playing = null, mine = null, nativeMs = 0, loops = 1;
  const words = text.split(/\s+/).filter(Boolean);
  el.innerHTML = `
    <div class="card tint karaoke-card"><div class="karaoke en">${words.map((w, i) => `<span data-i="${i}">${esc(w)}</span>`).join(' ')}</div></div>
    <div class="row sh-ctl">
      <button class="btn sm soft" data-a="native">${ic('speaker')} 듣기</button>
      <div class="seg grow">${[0.7, 0.9, 1].map(r => `<button data-r="${r}" class="${r === rate ? 'on' : ''}">${r}x</button>`).join('')}</div>
      <button class="btn sm soft" data-a="loop" aria-label="반복 횟수">${ic('loop')}<span class="lp">1</span></button>
    </div>
    <div class="mic-row center"><button class="mic" data-a="rec" aria-label="따라 말하기">${ic('mic')}</button><div class="mic-info"><div class="mic-status" data-s="idle"><i></i><span>듣고 바로 따라 말하기</span></div><div class="mic-sub">따라 말하기는 말이 끝나면 자동으로 멈춰요</div></div></div>
    <div class="row mine-row hide"><button class="btn sm soft" data-a="mine">${ic('play')} 내 녹음</button><button class="btn sm soft" data-a="alt">${ic('shuffle')} 번갈아 듣기</button></div>
    <div class="sh-res"></div>`;
  const kar = $('.karaoke', el), spans = $$('.karaoke span', el), st = $('.mic-status span', el), stEl = $('.mic-status', el), recBtn = $('[data-a=rec]', el);
  const hl = i => spans.forEach((s, j) => { s.classList.toggle('on', j === i); s.classList.toggle('past', j < i); });
  const playNative = () => new Promise(res => {
    kar.classList.add('playing');
    playing = S.speak(text, { rate, onWord: hl, onEnd: d => { nativeMs = d || nativeMs; kar.classList.remove('playing'); hl(-1); res(); } });
  });
  const playLoops = async () => { for (let i = 0; i < loops; i++) { await playNative(); if (i < loops - 1) await new Promise(r => setTimeout(r, 600)); } };
  $$('[data-r]', el).forEach(b => b.onclick = () => { rate = +b.dataset.r; $$('[data-r]', el).forEach(x => x.classList.toggle('on', x === b)); });
  let cap = null;
  el.onclick = async e => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'native') playLoops();
    if (a === 'loop') { loops = loops >= 5 ? 1 : loops + 1; $('.lp', el).textContent = loops; }
    if (a === 'mine' && mine) S.playUrl(mine.url);
    if (a === 'alt' && mine) { await playNative(); await new Promise(r => setTimeout(r, 400)); await S.playUrl(mine.url); }
    if (a === 'rec') {
      if (cap) { cap.stop(); st.textContent = '분석 중…'; return; }
      S.stopSpeak();
      if (!S.support.rec && !S.support.stt) { st.textContent = '이 브라우저는 녹음·음성 인식 미지원'; return; }
      recBtn.classList.add('live'); recBtn.innerHTML = ic('stop'); stEl.dataset.s = 'listening'; st.textContent = '따라 말하는 중 · 끝나면 자동 종료';
      cap = S.capture({ stt: true, record: true, autoStop: true, targets: [text] });
      const res = await cap.result; cap = null;
      recBtn.classList.remove('live'); recBtn.innerHTML = ic('mic');
      if (res.url) { mine = res; $('.mine-row', el).classList.remove('hide'); }
      stEl.dataset.s = res.sttError && !res.text ? 'error' : 'done';
      st.textContent = res.sttError && !res.text ? S.sttErrorText(res.sttError) : '다시 녹음하려면 탭';
      const an = res.blob ? await S.analyze(res.blob) : null;
      renderRes(res, an);
    }
  };
  function renderRes(res, an) {
    const d = res.text ? diff(res.text, text) : null;
    const recall = d ? Math.round(d.keyRecall * 100) : null;
    const ratio = an?.speechSec && nativeMs ? (an.speechSec * 1000) / nativeMs : null;
    const pace = ratio ? (ratio > 1.25 ? '조금 느려요' : ratio < 0.8 ? '조금 빨라요' : '속도 비슷해요') : null;
    $('.sh-res', el).innerHTML = `<div class="cmp">
      <div class="cmp-head"><span class="label">내 쉐도잉</span>${recall != null ? `<span class="score">${recall}<small>% 단어</small></span>` : ''}</div>
      ${d ? diffHTML(d) : `<div class="small muted">인식된 말이 없어요 · 녹음을 들으며 비교해보세요</div>`}
      ${an?.peaks ? waveHTML(an.peaks) : ''}
      ${ratio || an?.speechSec ? `<div class="stats">${ratio ? `<div><b>${ratio.toFixed(2)}배</b><span>길이 · ${pace}</span></div>` : ''}${an?.speechSec ? `<div><b>${an.pauses}번</b><span>0.3초+ 끊김</span></div>` : ''}</div>` : ''}
      <div class="tiny muted">발음·억양 점수는 무료 환경에서 제공하지 않아요 · 번갈아 듣기로 비교해요</div>
    </div>`;
    onResult?.({ text: res.text, recall, ratio, pauses: an?.pauses ?? null });
  }
  return { stop: () => { playing?.stop(); cap?.stop(); } };
}

export function waveHTML(peaks) { return `<div class="wave">${peaks.map(p => `<i style="height:${Math.max(4, p * 100)}%"></i>`).join('')}</div>`; }
