// CHAT — 백현이 말을 듣고 영어로 ‘대답’하는 회화 학습 (CALL은 듣고 ‘번역’)
import * as D from './store.js';
import * as S from './speech.js';
import { thumb, Player } from './yt.js';
import { esc, $, $$, ic, toast, h, ytLink, natOf, hintBox, unitHTML, verdictHTML, correctionHTML, naturalHTML, exprChips, bindSaves } from './ui.js';
import { improve } from './feedback.js';
import { isQuestion } from './compare.js';
import { judgeTranslation, judgeReply, keyExpressions, bestReply } from './judge.js';
import { koHelp, helpHTML, isKo } from './kohelp.js';
import { isLive, avatarStyle } from './scene.js';

// 듣기(영어 자막) → 영어로 대답 → 내 문장 교정·자연스러운 표현 → 보고 따라 말하기 → 안 보고 말하기
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

// ---------- CHAT: 백현이랑 카톡하듯 대화 ----------
const canon = t => String(t || '').toLowerCase().replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim();
const splitSent = t => String(t || '').match(/[^.?!]+[.?!]*\s*/g)?.map(x => x.trim()).filter(Boolean) || [t];
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
    <div class="cv-player"><div class="player clean" id="pl"></div><button class="yt-shield" id="ysh" aria-label="재생/일시정지"></button><div class="cv-sub en" id="sub"></div></div>
    <div class="thread" id="th"></div>
    <div class="quick" id="qk"></div>
    <div class="composer on" id="cp">
      <button class="cp-mic" id="cpm" aria-label="말하기">${ic('mic')}</button>
      <textarea id="cpt" rows="1" placeholder="영어로 대답 · 한국어 질문 OK" autocapitalize="sentences" spellcheck="false"></textarea>
      <button class="cp-send" id="cps" aria-label="보내기">${ic('send')}</button>
    </div>
  </div>`;
  const th = $('#th', root), qk = $('#qk', root), cp = $('#cp', root), ta = $('#cpt', root), micB = $('#cpm', root), sendB = $('#cps', root), sub = $('#sub', root);
  const pl = new Player($('#pl', root), { controls: 0 });
  pl.cue(v.ytId, u.start);
  // ----- 영어 자막: 문장 단위로 바뀜 -----
  let segU = null, subs = [], subK = -1;
  const showSub = k => { if (k === subK) return; subK = k; sub.innerHTML = subs[k] ? `<span>${esc(subs[k])}</span>` : ''; };
  pl.onTime = t => {
    if (!segU || !subs.length) return;
    const f = Math.max(0, Math.min(.999, (t - segU.start) / Math.max(.5, segU.end - segU.start)));
    const tot = subs.reduce((n, s) => n + s.length, 0); let acc = 0, k = 0;
    for (; k < subs.length; k++) { acc += subs[k].length / tot; if (f < acc) break; }
    showSub(Math.min(k, subs.length - 1));
  };
  const playU = x => {
    segU = x; subs = splitSent(natOf(x)); subK = -1; showSub(0); D.markStep(x.id, 'listen');
    return pl.playSegment(v.ytId, x.start, x.end).then(r => { if (segU === x) { segU = null; showSub(-1); } if (r === 'ended') onEnded?.(x); return r; });
  };
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
  async function bh(html, cls) { const t = add('bh', '<span class="typing3"><i></i><i></i><i></i></span>', 'typing'); await wait(360); if (dead) return h('<div></div>'); t.remove(); lastWho = ''; return add('bh', html, cls); }
  const me = t => add('me', `<span class="en">${esc(t)}</span>`);
  const sys = t => { lastWho = ''; th.appendChild(h(`<p class="m-sys">${t}</p>`)); scroll(); };

  // ----- 빠른 답장 칩 (말하기 칩은 누르는 순간 녹음 · 다음 칩은 누르는 순간 영상 재생) -----
  let chipRes = null, chipList = [], chipOpt = {};
  const drawChips = () => {
    qk.innerHTML = chipList.map(([l, k, cls]) => `<button class="qchip ${cls || ''}" data-q="${k}">${k === 'replay' ? ic('replay') : ''}${l}</button>`).join('');
    $$('[data-q]', qk).forEach(b => b.onclick = () => {
      const it = chipList.find(c => c[1] === b.dataset.q), o = it?.[3] || {};
      o.tap?.(); if (o.mic) { soon = true; startMic(o.targets || []); }
      if (o.stay) return;
      qk.innerHTML = ''; const r = chipRes; chipRes = null; r?.(b.dataset.q);
    });
  };
  const chips = (list, opt = {}) => new Promise(res => { chipRes = res; chipList = list; chipOpt = opt; drawChips(); });
  const addChip = c => { if (chipRes && chipOpt.replay && !chipList.some(x => x[1] === c[1])) { chipList = [c, ...chipList]; drawChips(); } };

  // ----- 입력: 마이크 또는 키보드 → 보내기 한 번 · 한국어면 ‘영어로 어떻게 해?’ 도움 -----
  const askInput = (placeholder = '영어로 대답해요', targets = []) => new Promise(res => { soon = false; if (early != null) { const t = early; early = null; return res(t); } ta.placeholder = placeholder; if (!cap) ta.value = ''; fit(); waiting = { res, targets }; });
  function fit() { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; sendB.classList.toggle('on', !!ta.value.trim() || !!cap); }
  ta.oninput = fit;
  function startMic(targets = waiting?.targets || []) {
    if (cap) return;
    if (!S.support.stt) { ta.focus(); toast('키보드의 받아쓰기(🎤)로 말해도 돼요'); return; }
    if (D.get().settings.autoPause !== false && pl.playing) pl.pause();
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
  const doSend = async () => {
    const t = ta.value.trim(); if (!t) return;
    if (isKo(t)) { ta.value = ''; fit(); me(t); const el = await bh(helpHTML(koHelp(t)), 'wide'); bindSaves(el); return; }
    if (!waiting) { if (soon) { early = t; ta.value = ''; fit(); me(t); return; } toast('아래 버튼을 눌러 진행해요'); return; }
    const w = waiting; waiting = null; ta.value = ''; fit(); me(t); w.res(t);
  };
  const send = () => { if (cap) { sendAfter = true; cap.stop(); return; } doSend(); };
  sendB.onclick = send;
  ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } };
  micB.onclick = () => { if (cap) { cap.stop(); return; } startMic(); };

  // ----- 다음 문장: 누르는 순간 그 구간을 재생 -----
  const idxOf = x => list.findIndex(y => y.id === x.id);
  const nextOf = x => list[idxOf(x) + 1] || null;
  const nextChip = x => { const nx = nextOf(x); return nx ? ['다음 문장 →', 'next', 'pri', { tap: () => { pending = { u: nx, p: playU(nx) }; } }] : ['목록으로', 'list', 'pri']; };
  const saveItem = (x, said) => t => ({ kind: 'mine', level: 'mine', uttId: x.id, ko: '', text: t, before: said || '', en: { easy: '', natural: t, advanced: '' }, note: natOf(x), ytId: v.ytId, start: x.start, videoId: v.id, videoTitle: v.title });

  // 한 문장
  async function run(x) {
    u = x; const i = idxOf(x); const en = natOf(x);
    $('#cvi', root).textContent = `${i + 1} / ${list.length}`;
    if (location.hash !== `#/study/${x.id}`) history.replaceState(null, '', `#/study/${x.id}`);
    if (th.children.length) sys(`${i + 1} / ${list.length}`);
    // 백현이가 말하는 중 → 끝나면 한국어 + 영어 전체 문장
    const typing = add('bh', '<span class="typing3"><i></i><i></i><i></i></span>', 'typing'); let shown = false, played = false;
    const show = () => { if (shown || dead) return; shown = true; typing.remove(); lastWho = ''; add('bh', `<span class="ko">${esc(x.ko)}</span><span class="en line">${esc(en)}</span>`); };
    onEnded = y => { if (y !== x) return; played = true; show(); addChip(['다시 듣기', 'replay', 'line', { tap: () => playU(x), stay: true }]); };
    if (pending?.u === x) pending = null; else playU(x);
    const k0 = await chips([...(played ? [['다시 듣기', 'replay', 'line', { tap: () => playU(x), stay: true }]] : []), ['대답하기', 'go', 'pri', { mic: true }]], { replay: true });
    if (dead) return; show();
    // 대답 → 교정 · 자연스러운 표현
    let said = await askInput('영어로 대답 · 한국어 질문 OK'); if (dead) return;
    let best = '';
    const feedback = async t => {
      D.addAttempt({ uttId: x.id, step: 'speak', text: t }); D.markStep(x.id, 'speak');
      const ev = judgeReply(t, { question: en, strict: isQuestion(en) });
      const r = await improve(t, { pattern: x.pattern, useLT: D.get().settings.autoLT !== false }); if (dead) return;
      const br = bestReply(t, x.replies);
      const alts = br && canon(br) !== canon(r.after) ? [br] : [];
      best = alts[0] && !ev.ok ? alts[0] : r.after;
      const xs = keyExpressions(alts[0] || r.after, { pattern: x.pattern, said: t });
      const el = await bh(`${verdictHTML(ev)}${correctionHTML(r)}${naturalHTML(alts)}${exprChips(xs)}`, 'wide'); if (dead) return;
      bindSaves(el, saveItem(x, t));
      D.markStep(x.id, 'check');
    };
    await feedback(said);
    for (;;) {
      const k = await chips([['다시 말하기', 'again', 'line', { mic: true }], ['보면서 따라 말해볼게', 'read', 'pri', { mic: true, targets: [best] }], ['다음', 'skip', 'line', nextChip(x)[3] ? { tap: nextChip(x)[3].tap } : {}]]); if (dead) return;
      if (k === 'again') { said = await askInput('다시 대답해요'); if (dead) return; await feedback(said); continue; }
      if (k === 'skip') return goOn(x);
      break;
    }
    // 보고 따라 말하기
    await bh(`<span class="bub-tag">보면서 따라 말해봐</span><span class="en big">${unitHTML(best)}</span>`); if (dead) return;
    const t1 = await askInput('보면서 말해봐요', [best]); if (dead) return;
    D.addAttempt({ uttId: x.id, step: 'read', text: t1 }); D.markStep(x.id, 'read');
    const e1 = judgeTranslation(t1, best);
    if (e1.ok) th.lastElementChild?.classList.add('okmark'); else await bh(verdictHTML(e1), 'wide');
    const k2 = await chips([['다음', 'skip', 'line', { tap: nextChip(x)[3]?.tap }], ['안 보고 말해볼게', 'recall', 'pri', { mic: true, targets: [best] }]]); if (dead) return;
    if (k2 === 'skip') return goOn(x);
    // 안 보고 말하기 (앞의 영어는 흐리게)
    for (;;) {
      th.classList.add('veil');
      const nm = D.callName();
      const el = await bh(`<span class="bub-tag">${nm ? `${esc(nm)}, ` : ''}이번엔 안 보고!</span><div class="bub-hint"></div>`); if (dead) return;
      hintBox($('.bub-hint', el), best, { pattern: x.pattern });
      const t2 = await askInput('기억해서 말해봐요', [best]); if (dead) return;
      th.classList.remove('veil');
      D.addAttempt({ uttId: x.id, step: 'recall', text: t2 }); D.markStep(x.id, 'recall');
      const e2 = judgeTranslation(t2, best);
      await bh(`${verdictHTML(e2)}${e2.level === 'great' ? '' : `<span class="en big">${unitHTML(best)}</span>`}`, 'wide'); if (dead) return;
      const k3 = await chips([['한 번 더', 'again', 'line', { mic: true, targets: [best] }], nextChip(x)]); if (dead) return;
      if (k3 !== 'again') return goOn(x, k3);
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
