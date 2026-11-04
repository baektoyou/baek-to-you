// 공통 UI 헬퍼 + 재사용 컴포넌트 (마이크 · 정답 카드 · 쉐도잉 · 비교)
import * as S from './speech.js';
import { diff, best, verdict, markPattern, mistakes } from './compare.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
export function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

const P = {
  video: '<rect x="3" y="5" width="18" height="14" rx="4"/><path d="M10 9.5v5l4.5-2.5z"/>',
  talk: '<path d="M4 6.5A3.5 3.5 0 0 1 7.5 3h9A3.5 3.5 0 0 1 20 6.5v6a3.5 3.5 0 0 1-3.5 3.5H11l-4.5 4v-4A3.5 3.5 0 0 1 4 12.5z"/><path d="M9 9.5h.01M12 9.5h.01M15 9.5h.01"/>',
  saved: '<path d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v15.5L12 16.2l-6.5 4.3V5A1.5 1.5 0 0 1 7 3.5z"/>',
  bookmark: '<path d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v15.5L12 16.2l-6.5 4.3V5A1.5 1.5 0 0 1 7 3.5z"/>',
  paste: '<rect x="6" y="4" width="12" height="17" rx="2.5"/><path d="M9.5 4V3h5v1M9.5 10h5M9.5 14h5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="2.5"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  replay: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  speaker: '<path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  kbd: '<rect x="2.5" y="6" width="19" height="12" rx="3"/><path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M7 14h10"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  phoneoff: '<path d="M3 13.5c5-4.5 13-4.5 18 0l-2.5 2.5-3-1.5v-3a12 12 0 0 0-7 0v3l-3 1.5z"/>',
  cam: '<rect x="3" y="7" width="13" height="10" rx="3"/><path d="M16 11l5-3v8l-5-3z"/>',
  cc: '<rect x="3" y="5" width="18" height="14" rx="4"/><path d="M10.5 10.5a2 2 0 1 0 0 3M16.5 10.5a2 2 0 1 0 0 3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  shuffle: '<path d="M4 7h3l10 10h3M4 17h3l3-3M14 10l3-3h3M18 4l2 3-2 3M18 14l2 3-2 3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  wave: '<path d="M3 12h2M7 8v8M11 5v14M15 8v8M19 10v4M21 12h0"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
  loop: '<path d="M17 2l3 3-3 3M3 11V9a4 4 0 0 1 4-4h13M7 22l-3-3 3-3M21 13v2a4 4 0 0 1-4 4H4"/>'
};
export const ic = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;

let toastT;
export function toast(msg) {
  let t = $('.toast'); if (!t) { t = h('<div class="toast"></div>'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200);
}
export function sheet(html, { onClose } = {}) {
  const bg = h('<div class="sheet-bg"></div>'); const sh = h(`<div class="sheet"><div class="grab"></div>${html}</div>`);
  document.body.append(bg, sh); requestAnimationFrame(() => { bg.classList.add('on'); sh.classList.add('on'); });
  let closed = false;
  const close = () => { if (closed) return; closed = true; bg.classList.remove('on'); sh.classList.remove('on'); setTimeout(() => { bg.remove(); sh.remove(); }, 320); onClose?.(); };
  bg.onclick = close; sh.close = close; return sh;
}
export function confirmSheet(msg, okLabel = '삭제') {
  return new Promise(res => {
    let v = false; // 버튼 선택값 → 닫힐 때 한 번만 resolve
    const s = sheet(`<h3>${esc(msg)}</h3><div class="row"><button class="btn soft grow" data-a="0">취소</button><button class="btn danger grow" data-a="1">${esc(okLabel)}</button></div>`, { onClose: () => res(v) });
    $$('[data-a]', s).forEach(b => b.onclick = () => { v = b.dataset.a === '1'; s.close(); });
  });
}

// ---------- 마이크 블록 ----------
// mount(el, {placeholder, record, targets, onResult(text, res)}) — STT 미지원 시 키보드 입력으로 대체
export function micBlock(el, opt = {}) {
  const idle = S.support.stt ? '탭하고 영어로 말하기' : '음성 인식 미지원 · 아래에 입력';
  el.innerHTML = `
    <div class="mic-wrap"><button class="mic" aria-label="말하기">${ic('mic')}</button><div class="mic-state">${idle}</div></div>
    <textarea class="textarea live en" rows="2" placeholder="${esc(opt.placeholder || '인식된 문장 · 직접 고쳐도 돼요')}"></textarea>`;
  const btn = $('.mic', el), st = $('.mic-state', el), ta = $('textarea', el);
  let cap = null, lastRes = null;
  btn.onclick = async () => {
    if (cap) { cap.stop(); st.textContent = '정리하는 중…'; return; }
    S.stopSpeak(); opt.onStart?.();
    btn.classList.add('live'); btn.innerHTML = ic('stop'); st.textContent = '듣는 중 · 끝나면 탭';
    cap = S.capture({ stt: true, record: !!opt.record, targets: opt.targets?.(), onInterim: t => (ta.value = t) });
    const res = await cap.result; cap = null; lastRes = res;
    btn.classList.remove('live'); btn.innerHTML = ic('mic');
    if (res.text) ta.value = res.text;
    st.textContent = res.sttError ? S.sttErrorText(res.sttError) : (res.text ? '다시 말하려면 탭' : '잘 안 들렸어요 · 다시 탭');
    opt.onResult?.(ta.value.trim(), res);
  };
  ta.oninput = () => opt.onEdit?.(ta.value.trim());
  return { get text() { return ta.value.trim(); }, set text(v) { ta.value = v; }, get res() { return lastRes; }, focus: () => ta.focus() };
}

// ---------- 비교 결과 ----------
export function diffHTML(d) {
  return `<div class="diff">${d.ops.map(o => `<span class="${o.op}"${o.heard ? ` title="들린 말: ${esc(o.heard)}"` : ''}>${esc(o.w)}</span>`).join(' ')}</div>`;
}
export function compareCard(user, cands, { title = 'MY ANSWER' } = {}) {
  if (!user) return '';
  const b = best(user, cands); if (!b) return '';
  const v = verdict(b.d.score); const m = mistakes(user);
  return `<div class="cmp">
    <div class="cmp-head"><span class="label">${esc(title)}</span><span class="score ${v.tone}">${b.d.score}<small>%</small></span></div>
    ${diffHTML(b.d)}
    ${b.d.missingKeys.length ? `<div class="row wrap" style="gap:4px"><span class="tiny muted">빠진 단어</span>${b.d.missingKeys.slice(0, 5).map(w => `<span class="chip pink en">${esc(w)}</span>`).join('')}</div>` : ''}
    ${m.length ? `<div class="note warn">${m.map(x => `<b>${esc(x.from)}</b> → <b>${esc(x.to)}</b> · ${esc(x.why)}`).join('<br>')}</div>` : ''}
    <div class="tiny muted">${esc(b.label)} 기준 · ${esc(v.label)}</div>
  </div>`;
}
export const levelsOf = u => [['easy', 'Easy'], ['natural', 'Natural'], ['advanced', 'Advanced']].filter(([k]) => u.en?.[k]).map(([k, l]) => ({ key: k, label: l, text: u.en[k] })).concat((u.alts || []).map((t, i) => ({ key: 'alt' + i, label: '다른 표현', text: t })));
export const targetsOf = u => levelsOf(u).map(l => l.text);

// ---------- 정답 카드 (CHECK) — 뒤집기 없이 바로 공개 ----------
export function answerCard(el, u, { answer, onShadow } = {}) {
  const lv = levelsOf(u).filter(l => !l.key.startsWith('alt'));
  const alts = (u.alts || []).filter(Boolean);
  let cur = lv.find(l => l.key === 'natural') || lv[0];
  if (!cur) { el.innerHTML = `<div class="note">영어 예시가 없어요.</div>`; return; }
  el.innerHTML = `${compareCard(answer, levelsOf(u))}
    <div class="ans">
      ${lv.length > 1 ? `<div class="seg mini-seg">${lv.map(l => `<button data-k="${l.key}">${l.label}</button>`).join('')}</div>` : ''}
      <div class="en-big" id="ans-t"></div>
      ${u.pattern ? `<div class="pattern"><b>PATTERN</b><span class="en">${esc(u.pattern)}</span></div>` : ''}
      <div class="row ans-act">
        <button class="btn sm" data-a="play">${ic('speaker')} 듣기</button>
        <button class="btn sm soft" data-a="slow">0.7x</button>
        ${onShadow ? `<button class="btn sm pink grow" data-a="sh">${ic('wave')} 따라 말하기</button>` : ''}
      </div>
      ${alts.length ? `<div class="alts"><span class="tiny muted">이렇게도 말해요</span>${alts.map(t => `<button class="alt en" data-tts="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
    </div>`;
  const render = () => {
    $$('[data-k]', el).forEach(b => b.classList.toggle('on', b.dataset.k === cur.key));
    $('#ans-t', el).innerHTML = markPattern(cur.text, u.pattern, esc);
  };
  el.onclick = e => {
    const k = e.target.closest('[data-k]'); if (k) { cur = lv.find(l => l.key === k.dataset.k); render(); return; }
    const t = e.target.closest('[data-tts]'); if (t) { S.speak(t.dataset.tts); return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'play') S.speak(cur.text); if (a === 'slow') S.speak(cur.text, { rate: 0.7 });
    if (a === 'sh') onShadow?.(cur.text);
  };
  render();
  return { get level() { return cur; } };
}

// ---------- 쉐도잉 ----------
export function shadowBlock(el, text, { onResult } = {}) {
  let rate = 0.9, playing = null, mine = null, nativeMs = 0, loops = 1;
  const words = text.split(/\s+/).filter(Boolean);
  el.innerHTML = `
    <div class="card pink karaoke-card"><div class="karaoke">${words.map((w, i) => `<span data-i="${i}">${esc(w)}</span>`).join(' ')}</div></div>
    <div class="row sh-ctl">
      <button class="btn sm" data-a="native">${ic('speaker')} 듣기</button>
      <div class="seg grow">${[0.7, 0.9, 1].map(r => `<button data-r="${r}" class="${r === rate ? 'on' : ''}">${r}x</button>`).join('')}</div>
      <button class="btn sm soft" data-a="loop" aria-label="반복 횟수">${ic('loop')}<span class="lp">1</span></button>
    </div>
    <div class="mic-wrap"><button class="mic" data-a="rec">${ic('mic')}</button><div class="mic-state">듣고 바로 따라 말하기</div></div>
    <div class="row mine-row hide" style="justify-content:center"><button class="btn sm soft" data-a="mine">${ic('play')} 내 녹음</button><button class="btn sm pink" data-a="alt">${ic('shuffle')} 번갈아 듣기</button></div>
    <div class="sh-res"></div>`;
  const kar = $('.karaoke', el), spans = $$('.karaoke span', el), st = $('.mic-state', el), recBtn = $('[data-a=rec]', el);
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
      recBtn.classList.add('live'); recBtn.innerHTML = ic('stop'); st.textContent = '따라 말하는 중 · 끝나면 탭';
      cap = S.capture({ stt: true, record: true, autoStop: true, targets: [text] });
      const res = await cap.result; cap = null;
      recBtn.classList.remove('live'); recBtn.innerHTML = ic('mic');
      if (res.url) { mine = res; $('.mine-row', el).classList.remove('hide'); }
      st.textContent = res.sttError ? S.sttErrorText(res.sttError) : '다시 녹음하려면 탭';
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
      <div class="cmp-head"><span class="label">MY SHADOW</span>${recall != null ? `<span class="score">${recall}<small>%</small></span>` : ''}</div>
      ${d ? diffHTML(d) : `<div class="small muted">인식된 말이 없어요 · 녹음을 들으며 비교해보세요</div>`}
      ${an?.peaks ? waveHTML(an.peaks) : ''}
      ${ratio || an?.speechSec ? `<div class="stats">${ratio ? `<div><b>${ratio.toFixed(2)}배</b><span>길이 · ${pace}</span></div>` : ''}${an?.speechSec ? `<div><b>${an.pauses}번</b><span>0.3초+ 끊김</span></div>` : ''}</div>` : ''}
      <div class="tiny muted">발음·억양 점수는 무료 환경에서 미지원 · 번갈아 듣기로 비교해요</div>
    </div>`;
    onResult?.({ text: res.text, recall, ratio, pauses: an?.pauses ?? null });
  }
  return { stop: () => { playing?.stop(); cap?.stop(); } };
}

export function waveHTML(peaks) { return `<div class="wave">${peaks.map(p => `<i style="height:${Math.max(4, p * 100)}%"></i>`).join('')}</div>`; }
