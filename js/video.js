// CHAT — 백현이 한국어를 듣고 영어로 ‘번역’해서 말하기 (CALL › 질문하기는 영어로 ‘대답’)
import * as D from './store.js';
import * as S from './speech.js';
import { thumb, Player } from './yt.js';
import { esc, $, $$, ic, toast, h, ytLink, natOf, hintBox, compareHTML, bindCompare, lpHTML, bindLongPress } from './ui.js';
import { improve } from './feedback.js';
import { diff } from './compare.js';
import { judgeTranslation, keyExpressions } from './judge.js';
import { smartFeedback } from './ai.js';
import { banmal } from './banmal.js';
import { isLive, avatarStyle } from './scene.js';

// 듣기(한국어) → 영어로 번역 → 내 문장·교정·추천 비교 → 보면서 따라 말하기(정답) → 안 보고 말하기(정확도)
const STEPS = ['listen', 'speak', 'check', 'read', 'recall'];
// 예전 단계 기록도 인정 (watch→listen, shadow→read, retry→recall)
const LEGACY = { listen: 'watch', read: 'shadow', recall: 'retry' };
export const stepDone = (st, k) => !!(st?.[k] || st?.[LEGACY[k]]);
export const WORDMARK = `<h1 class="logo" aria-label="BAEK TO YOU"><b>BAEK</b> TO YOU<span class="logo-heart">${ic('heartF')}</span></h1>`;
// CHAT 프로필 사진: 강아지 사진으로 고정 (icons/bh-profile.jpg · 원 부분만 잘라 둠)
export const BH_PROFILE = { id: 'bh-profile', src: 'icons/bh-profile.jpg', w: 480, h: 480, box: [.054, .054, .946, .946] };

export function videoList(root) {
  const db = D.get();
  const vids = db.videos.filter(v => !isLive(v)); // 라이브 영상은 CALL 전용
  const due = D.dueList().length;
  root.innerHTML = `<div class="screen">
    <header class="top">${WORDMARK}<a class="icon-btn" href="#/settings" aria-label="영상 추가">${ic('plus')}</a></header>
    <div class="stats-strip">
      <div><b>${db.utts.filter(u => vids.some(v => v.id === u.videoId)).length}</b><span>문장</span></div>
      <div><b>${Object.keys(db.progress).filter(id => vids.some(v => v.id === D.utt(id)?.videoId)).length}</b><span>학습한 문장</span></div>
      <a href="#/saved"><b class="${due ? 'accent' : ''}">${due}</b><span>오늘 복습</span></a>
    </div>
    ${vids.length ? `<div class="sec-title label">VIDEOS · ${vids.length}</div><div class="vgrid two">${vids.map(v => {
      const us = D.uttsOf(v.id); const done = us.filter(u => db.progress[u.id]?.steps?.check).length;
      return `<a class="vcard" href="#/video/${v.id}"><div class="vthumb" style="background-image:url('${thumb(v.ytId)}')">${us.length ? `<div class="prog"><i style="width:${done / us.length * 100}%"></i></div>` : ''}</div>
      <div class="vmeta"><b>${esc(v.title)}</b><span class="cnt">${done}/${us.length}</span></div></a>`;
    }).join('')}</div>`
      : `<div class="empty"><b>아직 영상이 없어요</b><p>백현이 YouTube 영상을 추가해보세요</p><a class="btn" href="#/settings">${ic('plus')} 영상 추가</a></div>`}
  </div>`;
}

export function videoDetail(root, vid) {
  const v = D.video(vid); if (!v) { location.hash = '#/video'; return; }
  const us = D.uttsOf(vid), db = D.get();
  root.innerHTML = `<div class="screen">
    <header class="top"><a class="icon-btn" href="#/video" aria-label="뒤로">${ic('back')}</a><h2>${esc(v.title)}</h2><a class="icon-btn" href="#/settings/video/${v.id}" aria-label="영상 관리">${ic('edit')}</a></header>
    <div class="vthumb hero-thumb" style="background-image:url('${thumb(v.ytId)}')"></div>
    <div class="row between sub-row"><span class="label">SENTENCES · ${us.length}</span><a class="link-sm" href="${ytLink(v.ytId)}" target="_blank" rel="noopener">${ic('external')} YouTube</a></div>
    ${us.length ? `<div class="ulist">${us.map(u => {
      const st = db.progress[u.id]?.steps || {}; const n = STEPS.filter(s => stepDone(st, s)).length;
      return `<a class="uitem" href="#/study/${u.id}"><span class="t">${D.fmt(u.start)}</span><div class="grow"><div class="ko">${esc(u.ko)}</div>
      <div class="dots">${STEPS.map(s => `<i class="${stepDone(st, s) ? 'on' : ''}"></i>`).join('')}</div></div>${n === STEPS.length ? `<span class="done-badge">${ic('check')}</span>` : D.isSavedUtt(u.id) ? `<span class="mark-saved">${ic('bookmark')}</span>` : ''}</a>`;
    }).join('')}</div>` : `<div class="empty"><b>등록된 문장이 없어요</b><p>영상 관리에서 JSON으로 문장을 넣어주세요</p><a class="btn" href="#/settings/video/${v.id}">문장 넣기</a></div>`}
  </div>`;
}

// ---------- CHAT: 백현이랑 카톡하듯 한 문장씩 ----------

// ---------- CHAT: 백현이 한국어 → 내가 영어로 ----------
const isKoT = t => /[가-힣]/.test(t || '');
export function study(root, uttId) {
  let u = D.utt(uttId); if (!u) { location.hash = '#/video'; return () => { }; }
  const v = D.video(u.videoId); const list = D.uttsOf(u.videoId);
  let dead = false, cap = null, waiting = null, sendAfter = false, pending = null, onEnded = null, soon = false, early = null;
  const AV = s => `<span class="m-av ph" style="${avatarStyle(BH_PROFILE, s)}"></span>`;
  document.body.classList.add('no-tab');
  root.innerHTML = `<div class="chatv">
    <header class="cv-top"><a class="icon-btn" href="#/video/${v.id}" aria-label="뒤로">${ic('back')}</a>
      <div class="cv-title">${AV(28)}<div><b>백현이</b><small id="cvi"></small></div></div>
      <span class="icon-sp"></span></header>
    <div class="cv-player"><div class="player clean" id="pl"></div><button class="yt-shield" id="ysh" aria-label="재생/일시정지"></button></div>
    <div class="thread" id="th"></div>
    <div class="quick" id="qk"></div>
    <div class="composer on" id="cp">
      <button class="cp-mic" id="cpm" aria-label="말하기">${ic('mic')}</button>
      <textarea id="cpt" rows="1" placeholder="영어로 말하거나 입력해요" autocapitalize="sentences" spellcheck="false"></textarea>
      <button class="cp-send" id="cps" aria-label="보내기">${ic('send')}</button>
    </div>
  </div>`;
  const th = $('#th', root), qk = $('#qk', root), cp = $('#cp', root), ta = $('#cpt', root), micB = $('#cpm', root), sendB = $('#cps', root);
  const pl = new Player($('#pl', root), { controls: 0 });
  pl.cue(v.ytId, u.start);
  const playU = x => { D.markStep(x.id, 'listen'); return pl.playSegment(v.ytId, x.start, x.end).then(r => { if (r === 'ended') onEnded?.(x); return r; }); };
  $('#ysh', root).onclick = () => { if (pl.playing) pl.pause(); else playU(u); };
  const scroll = () => requestAnimationFrame(() => th.scrollTo({ top: th.scrollHeight, behavior: 'smooth' }));
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // ----- 말풍선 -----
  let lastWho = '';
  const add = (who, html, cls = '') => {
    const first = who !== lastWho; lastWho = who;
    const el = h(`<div class="msg2 ${who} ${first ? 'first' : ''} ${cls}">${who === 'bh' && first ? AV(34) : who === 'bh' ? '<span class="m-av sp"></span>' : ''}<div class="m-col">${who === 'bh' && first ? '<span class="m-name">백현이</span>' : ''}<div class="m-bub">${html}</div></div></div>`);
    if (th.classList.contains('veil')) el.classList.add('keep');
    th.appendChild(el); scroll(); return el;
  };
  async function bh(html, cls) { const t = add('bh', '<span class="typing3"><i></i><i></i><i></i></span>', 'typing'); await wait(320); if (dead) return h('<div></div>'); t.remove(); lastWho = ''; return add('bh', html, cls); }
  const me = t => add('me', `<span class="en">${esc(t)}</span>`);
  const sys = t => { lastWho = ''; th.appendChild(h(`<p class="m-sys">${t}</p>`)); scroll(); };

  // ----- 칩: 왼쪽 = 말하기(누르면 바로 녹음) · 오른쪽 = 다음(누르면 다음 구간 재생) -----
  let chipRes = null, chipList = [], chipOpt = {};
  const drawChips = () => {
    qk.innerHTML = chipList.map(([l, k, cls]) => `<button class="qchip ${cls || ''}" data-q="${k}">${k === 'replay' ? ic('replay') : ''}${l}${cls === 'nx' ? ic('next') : ''}</button>`).join('');
    $$('[data-q]', qk).forEach(b => b.onclick = () => pick(b.dataset.q));
  };
  const pick = k => {
    const o = chipList.find(c => c[1] === k)?.[3] || {};
    o.tap?.(); if (o.mic) { soon = true; startMic(o.targets || []); }
    if (o.stay) return;
    qk.innerHTML = ''; const r = chipRes; chipRes = null; r?.(k);
  };
  const chips = (list, opt = {}) => new Promise(res => { chipRes = res; chipList = list; chipOpt = opt; drawChips(); });
  const addChip = c => { if (chipRes && chipOpt.replay && !chipList.some(x => x[1] === c[1])) { chipList = [c, ...chipList]; drawChips(); } };

  // ----- 입력 -----
  const askInput = (placeholder = '영어로 말하거나 입력해요', targets = []) => new Promise(res => { soon = false; if (early != null) { const t = early; early = null; return res(t); } ta.placeholder = placeholder; if (!cap) ta.value = ''; fit(); waiting = { res, targets }; });
  function fit() { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; sendB.classList.toggle('on', !!ta.value.trim() || !!cap); }
  ta.oninput = fit;
  function startMic(targets = waiting?.targets || []) {
    if (cap) return;
    if (!S.support.stt) { ta.focus(); toast('키보드의 받아쓰기(🎤)로 말해도 돼요'); return; }
    if (pl.playing) pl.pause();
    micB.classList.add('live'); cp.classList.add('rec'); micB.innerHTML = ic('stop');
    const prefix = ta.value.trim();
    const c = cap = S.capture({ stt: true, prefix, targets, onInterim: t => { ta.value = t; fit(); } });
    fit();
    c.result.then(r => {
      if (cap === c) cap = null;
      micB.classList.remove('live'); cp.classList.remove('rec'); micB.innerHTML = ic('mic');
      if (r.text) ta.value = r.text; else if (r.sttError && !sendAfter) toast(S.sttErrorText(r.sttError));
      fit();
      if (sendAfter) { sendAfter = false; doSend(); }
    });
  }
  const doSend = () => {
    const t = ta.value.trim(); if (!t) return;
    if (isKoT(t)) { toast('영어로 말해볼까?'); return; }
    if (!waiting) { if (soon) { early = t; ta.value = ''; fit(); me(t); return; } toast('아래 버튼을 눌러 진행해요'); return; }
    const w = waiting; waiting = null; ta.value = ''; fit(); me(t); w.res(t);
  };
  const send = () => { if (cap) { sendAfter = true; cap.stop(); return; } doSend(); };
  sendB.onclick = send;
  ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } };
  // 마이크: 백현이가 말하는 중이어도 누르면 바로 내 차례로
  micB.onclick = () => {
    if (cap) { cap.stop(); return; }
    const mc = chipRes && chipList.find(c => c[3]?.mic);
    if (mc) { pick(mc[1]); return; }
    startMic();
  };

  // ----- 다음 문장: 누르는 순간 그 구간 재생 -----
  const idxOf = x => list.findIndex(y => y.id === x.id);
  const nextOf = x => list[idxOf(x) + 1] || null;
  const NEXT = x => { const nx = nextOf(x); return nx ? ['다음', 'next', 'nx', { tap: () => { pending = { u: nx, p: playU(nx) }; } }] : ['목록', 'list', 'nx']; };
  const saveItem = (x, said) => t => t === natOf(x)
    ? { kind: 'utt', level: 'natural', uttId: x.id, ko: x.ko, en: { ...x.en }, text: t, pattern: x.pattern }
    : { kind: 'mine', level: 'mine', uttId: x.id, ko: x.ko, text: t, before: said || '', en: { easy: '', natural: t, advanced: '' }, ytId: v.ytId, start: x.start, videoId: v.id, videoTitle: v.title };
  const accBadge = (el, a) => { const b = $('.m-bub', el); b && b.insertAdjacentHTML('beforeend', `<em class="acc-b ${a >= 85 ? 'hi' : ''}">${a}%</em>`); };

  async function run(x) {
    u = x; const i = idxOf(x); const target = natOf(x), ko = banmal(x.ko); ta.placeholder = '영어로 말하거나 입력해요';
    $('#cvi', root).textContent = `${i + 1} / ${list.length}`;
    if (location.hash !== `#/study/${x.id}`) history.replaceState(null, '', `#/study/${x.id}`);
    if (th.children.length) sys(`${i + 1} / ${list.length}`);
    // 재생과 동시에 한국어 대사
    if (pending?.u === x) pending = null; else playU(x);
    lastWho = ''; add('bh', `<span class="ko">${esc(ko)}</span>`);
    onEnded = y => { if (y === x) addChip(['다시 듣기', 'replay', 'line', { tap: () => playU(x), stay: true }]); };
    await chips([['영어로 말해볼게', 'go', 'pri', { mic: true, targets: [target] }]], { replay: true }); if (dead) return;
    const said = await askInput('영어로 말해봐요', [target]); if (dead) return;
    D.addAttempt({ uttId: x.id, step: 'speak', text: said }); D.markStep(x.id, 'speak');
    const typ = add('bh', '<span class="typing3"><i></i><i></i><i></i></span>', 'typing');
    const f = await smartFeedback({ mode: 'translate', said, target, ko: x.ko, pattern: x.pattern }); typ.remove(); lastWho = ''; if (dead) return;
    const el = add('bh', compareHTML({ said, fixed: f.fixed, target: f.natural, answer: target, label: '추천', ev: f.ev, acc: diff(said, target).score, why: f.why, xs: f.xs, ai: f.ai }), 'wide');
    bindCompare(el, saveItem(x, said)); D.markStep(x.id, 'check');
    // 보면서 따라 말하기 — 정답 영어 문장
    let k = await chips([['보면서 따라 말해볼게', 'read', 'pri', { mic: true, targets: [target] }], NEXT(x)]); if (dead) return;
    if (k !== 'read') return goOn(x, k);
    const re = await bh(`<span class="bub-tag">보면서 따라 말해봐</span><span class="en big lp">${lpHTML(target)}</span>`); bindLongPress(re); if (dead) return;
    const t1 = await askInput('보면서 말해봐요', [target]); if (dead) return;
    D.addAttempt({ uttId: x.id, step: 'read', text: t1 }); D.markStep(x.id, 'read');
    accBadge([...$$('.msg2.me', th)].pop(), diff(t1, target).score);
    // 안 보고 말하기 (몇 번이든) — 앞의 영어·내 발화는 흐리게
    for (;;) {
      k = await chips([['안 보고 말해볼게', 'recall', 'pri', { mic: true, targets: [target] }], NEXT(x)]); if (dead) return;
      if (k !== 'recall') return goOn(x, k);
      th.classList.add('veil');
      const nm = D.callName();
      const rl = await bh(`<span class="bub-tag">${nm ? `${esc(nm)}, ` : ''}이번엔 안 보고!</span><span class="ko">${esc(ko)}</span><div class="bub-hint"></div>`); if (dead) return;
      hintBox($('.bub-hint', rl), target, { pattern: x.pattern, keywords: x.keywords });
      const t2 = await askInput('기억해서 말해봐요', [target]); if (dead) return;
      th.classList.remove('veil');
      D.addAttempt({ uttId: x.id, step: 'recall', text: t2 }); D.markStep(x.id, 'recall');
      const e2 = judgeTranslation(t2, target);
      const fl = await bh(compareHTML({ said: t2, target, label: '정답', ev: e2, acc: diff(t2, target).score }), 'wide'); if (dead) return;
      bindCompare(fl, saveItem(x, t2));
    }
  }
  function goOn(x, k = 'next') {
    const nx = nextOf(x);
    if (k === 'list' || !nx) { location.hash = `#/video/${v.id}`; return; }
    if (!pending) pending = { u: nx, p: playU(nx) };
    run(nx);
  }
  run(u);
  return () => { dead = true; cap?.stop(); pl.destroy(); document.body.classList.remove('no-tab'); };
}
