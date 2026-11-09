// CHAT — 백현이 한국어를 듣고 영어로 ‘번역’해서 말하기 (CALL › 질문하기는 영어로 ‘대답’)
import * as D from './store.js';
import * as S from './speech.js';
import { vThumb as thumbOf, Player } from './yt.js';
import { esc, $, $$, ic, toast, h, ytLink, natOf, hintBox, coachHTML, aiAnswerHTML, bindCompare, lpHTML, bindLongPress, setLpCtx, bhLines, AI_MARK, checkRetry, brSent } from './ui.js';
import { improve } from './feedback.js';
import { diff } from './compare.js';
import { judgeTranslation, keyExpressions } from './judge.js';
import { smartFeedback, aiAsk } from './ai.js';
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
    <header class="top">${WORDMARK}</header>
    <div class="stats-strip">
      <div><b>${db.utts.filter(u => vids.some(v => v.id === u.videoId)).length}</b><span>문장</span></div>
      <div><b>${Object.keys(db.progress).filter(id => vids.some(v => v.id === D.utt(id)?.videoId)).length}</b><span>학습한 문장</span></div>
      <a href="#/saved"><b class="${due ? 'accent' : ''}">${due}</b><span>오늘 복습</span></a>
    </div>
    <a class="ex-entry" href="#/express"><span class="ex-face" aria-hidden="true">'ㅅ'</span><span class="grow"><b>백현아 도와줘 <i class="ex-heart">♡</i></b><small>어떤 말이 궁금해!?</small></span>${ic('next')}</a>
    ${vids.length ? `<div class="sec-title label">VIDEOS · ${vids.length}</div><div class="vgrid two">${vids.map(v => {
      const us = D.uttsOf(v.id); const done = us.filter(u => db.progress[u.id]?.steps?.check).length;
      return `<a class="vcard" href="#/video/${v.id}"><div class="vthumb" style="background-image:url('${thumbOf(v)}')">${us.length ? `<div class="prog"><i style="width:${done / us.length * 100}%"></i></div>` : ''}</div>
      <div class="vmeta"><b class="v-title">${esc(v.title)}</b><span class="cnt">${done}/${us.length}</span></div></a>`;
    }).join('')}</div>`
      : `<div class="empty"><b>아직 영상이 없어요</b>${D.canEdit() ? `<p>백현이 YouTube 영상을 추가해보세요</p><a class="btn" href="#/settings">${ic('plus')} 영상 추가</a>` : '<p>곧 영상이 올라올 거예요</p>'}</div>`}
  </div>`;
}

// ---------- 미리 만들어 두는 플레이어 ----------
// 영상 화면에서 플레이어를 미리 준비해 두고(화면 전환에도 살아 있게 body에 붙임), 문장을 누르는 순간(사용자 동작 안에서) 재생 시작
// → CHAT으로 들어가자마자 소리와 함께 바로 재생 (iPhone 자동 재생 제한 대응)
let warm = null;
function warmUp(v, slot, z = 5) {
  if (!warm || warm.vid !== v.id) {
    dropWarm();
    const host = h('<div class="warm-pl"><div class="player clean"></div></div>'); document.body.appendChild(host);
    const pl = new Player(host.firstChild, { controls: 0, blockMs: 1200, onState: (...a) => warm?.on?.(...a) });
    warm = { vid: v.id, host, pl, on: null, slot: null, raf: 0, start: null };
    pl.cue(v.ytId, D.uttsOf(v.id)[0]?.start || 0);
  }
  warm.host.style.zIndex = z; pin(slot); return warm;
}
function pin(slot) {
  const W = warm; W.slot = slot; cancelAnimationFrame(W.raf);
  const tick = () => {
    if (warm !== W || W.slot !== slot) return;
    if (!slot.isConnected) { W.host.style.visibility = 'hidden'; return; }
    const r = slot.getBoundingClientRect();
    const topLim = W.host.style.zIndex < 20 ? ($('.top')?.getBoundingClientRect().bottom || 0) : 0, botLim = W.host.style.zIndex < 20 ? ($('.tabbar')?.getBoundingClientRect().top || innerHeight) : innerHeight;
    const ct = Math.max(0, topLim - r.top), cb = Math.max(0, r.bottom - botLim);
    Object.assign(W.host.style, { visibility: ct + cb >= r.height ? 'hidden' : 'visible', top: r.top + 'px', left: r.left + 'px', width: r.width + 'px', height: r.height + 'px', clipPath: ct || cb ? `inset(${ct}px 0 ${cb}px 0)` : '' });
    W.raf = requestAnimationFrame(tick);
  };
  tick();
}
export function dropWarm() { if (!warm) return; cancelAnimationFrame(warm.raf); warm.pl.destroy(); warm.host.remove(); warm = null; }
// 다음 화면이 같은 영상(영상 화면·CHAT)이면 플레이어 유지
const keepWarm = vid => { const m = location.hash.match(/^#\/(video|study)\/([^/?]+)/); if (!m) return false; return m[1] === 'video' ? m[2] === vid : D.utt(m[2])?.videoId === vid; };

// 이어서 말하기: 마지막으로 하던 문장 (끝냈으면 그다음 문장)
export function resumeOf(vid) {
  const us = D.uttsOf(vid); if (!us.length) return null;
  const r = (D.get().settings.chatResume || {})[vid];
  if (r) { const i = us.findIndex(u => u.id === r.u); if (i >= 0) return r.done ? (us[i + 1] ? { u: us[i + 1], i: i + 1, cont: true } : null) : { u: us[i], i, cont: true }; }
  const p = D.get().progress; let last = -1; us.forEach((u, i) => { if (p[u.id]?.steps?.check || p[u.id]?.steps?.speak) last = i; });
  return last >= 0 && us[last + 1] ? { u: us[last + 1], i: last + 1, cont: true } : null;
}
const setResume = (vid, u, done) => { const all = { ...(D.get().settings.chatResume || {}) }; all[vid] = { u, done, at: Date.now() }; D.setSetting('chatResume', all); };

export function videoDetail(root, vid) {
  const v = D.video(vid); if (!v) { location.hash = '#/video'; return; }
  const us = D.uttsOf(vid), db = D.get();
  const rs = resumeOf(vid);
  const title1 = String(v.title || '').split('\n')[0];
  root.innerHTML = `<div class="screen">
    <header class="top"><a class="icon-btn" href="#/video" aria-label="뒤로">${ic('back')}</a><h2>${esc(title1)}</h2>${D.canEdit() ? `<a class="icon-btn" href="#/settings/video/${v.id}" aria-label="영상 관리">${ic('edit')}</a>` : '<span class="icon-btn ghost"></span>'}</header>
    <div class="vthumb hero-thumb hero-pl" id="hero" style="background-image:url('${thumbOf(v)}')"></div>
    ${String(v.title || '').includes('\n') ? `<p class="vd-title">${esc(v.title)}</p>` : ''}
    ${us.length ? `<button class="resume-btn" id="resume">${ic('play')}<span class="grow"><b>${rs ? '이어서 말하기' : '처음부터 말하기'}</b><small>${rs ? `${rs.i + 1}번째 문장부터 · ${esc(rs.u.ko)}` : `1번째 문장부터 · ${esc(us[0].ko)}`}</small></span>${ic('next')}</button>` : ''}
    <div class="row between sub-row"><span class="label">SENTENCES · ${us.length}</span><a class="link-sm" href="${ytLink(v.ytId)}" target="_blank" rel="noopener">${ic('external')} YouTube</a></div>
    ${us.length ? `<div class="ulist">${us.map(u => {
      const st = db.progress[u.id]?.steps || {}; const n = STEPS.filter(s => stepDone(st, s)).length;
      return `<a class="uitem" href="#/study/${u.id}" data-u="${u.id}"><span class="t">${D.fmt(u.start)}</span><div class="grow"><div class="ko">${esc(u.ko)}</div>
      <div class="dots">${STEPS.map(s => `<i class="${stepDone(st, s) ? 'on' : ''}"></i>`).join('')}</div></div>${n === STEPS.length ? `<span class="done-badge">${ic('check')}</span>` : D.isSavedUtt(u.id) ? `<span class="mark-saved">${ic('bookmark')}</span>` : ''}</a>`;
    }).join('')}</div>` : `<div class="empty"><b>등록된 문장이 없어요</b>${D.canEdit() ? `<p>영상 관리에서 JSON으로 문장을 넣어주세요</p><a class="btn" href="#/settings/video/${v.id}">문장 넣기</a>` : '<p>문장이 준비되면 여기에 보여요</p>'}</div>`}
  </div>`;
  const W = warmUp(v, $('#hero', root), 5);
  // 문장을 누르는 순간 재생 시작 (사용자 동작 안) → CHAT 화면으로
  const go = u => { D.markStep(u.id, 'listen'); W.start = { id: u.id, p: W.pl.playSegment(v.ytId, u.start, u.end) }; location.hash = `#/study/${u.id}`; };
  $$('[data-u]', root).forEach(a => a.onclick = e => { e.preventDefault(); const u = D.utt(a.dataset.u); if (u) go(u); });
  $('#resume', root) && ($('#resume', root).onclick = () => go(rs ? rs.u : us[0]));
  return () => { if (!keepWarm(vid)) dropWarm(); };
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
      <button class="icon-btn snd-tg" id="sndt" aria-label="백현이 목소리 켜기/끄기"></button></header>
    <div class="cv-player"><div class="player clean" id="pl"></div><button class="snd-pill hide" id="sndp">${ic('play')} 탭해서 소리와 함께 재생</button></div>
    <div class="thread" id="th"></div>
    <div class="quick" id="qk"></div>
    <div class="composer on" id="cp">
      <button class="cp-mic" id="cpm" aria-label="말하기">${ic('mic')}</button>
      <button class="cp-q" id="cpq" aria-label="AI에게 영어 질문하기">${ic('chat')}</button>
      <textarea id="cpt" rows="1" placeholder="영어로 말하거나 입력해요" autocapitalize="sentences" spellcheck="false"></textarea>
      <button class="cp-send" id="cps" aria-label="보내기">${ic('send')}</button>
    </div>
  </div>`;
  const th = $('#th', root), qk = $('#qk', root), cp = $('#cp', root), ta = $('#cpt', root), micB = $('#cpm', root), sendB = $('#cps', root);
  // 소리: 백현이 대사가 오면 자동으로 소리와 함께 재생 (설정으로 끄고 켤 수 있음)
  // · 브라우저가 소리 있는 자동 재생을 막으면 소리 없이 먼저 재생 → 화면을 처음 터치하는 순간부터 소리와 함께 자동 재생
  let soundOn = D.get().settings.chatSound !== false, waitTap = false;
  const sndt = $('#sndt', root);
  const drawSnd = () => { sndt.innerHTML = ic(soundOn ? 'volume' : 'mute'); sndt.classList.toggle('off', !soundOn); sndt.classList.toggle('wait', soundOn && waitTap); sndt.setAttribute('aria-pressed', soundOn ? 'true' : 'false'); };
  // 자동 재생이 막히면 음소거로 바꾸지 않고 ‘탭해서 재생’ → 누르는 순간(사용자 동작) 소리와 함께 처음부터 재생
  const sndp = $('#sndp', root);
  const onSt = st => { if (st === 'muted' || st === 'blocked') { waitTap = true; drawSnd(); if (st === 'blocked') sndp.classList.remove('hide'); } if (st === 'unmuted' || st === 'unblocked' || (st === 'playing' && !pl?.mutedAuto)) { waitTap = false; drawSnd(); sndp.classList.add('hide'); } };
  // 영상 화면에서 미리 준비한 플레이어를 이어서 사용 (문장을 누른 순간 이미 재생 시작)
  const W = warmUp(v, $('#pl', root), 25); const pl = W.pl; W.on = onSt;
  const warmStart = W.start?.id === u.id ? W.start : null; W.start = null;
  if (pl.needTap) onSt('blocked');
  sndp.onclick = () => { pl.unmute(); sndp.classList.add('hide'); };
  pl.userMuted = !soundOn; drawSnd();
  sndt.onclick = e => { e.stopPropagation(); soundOn = !soundOn; D.setSetting('chatSound', soundOn); pl.setUserMuted(!soundOn); waitTap = false; drawSnd(); toast(soundOn ? '백현이 목소리 켜짐' : '백현이 목소리 꺼짐'); };
  // 소리 없이 자동재생됐으면 화면 어디든 처음 터치할 때 소리 켜기 (그다음부터는 계속 소리와 함께)
  const unmute = e => { if (e?.target?.closest?.('#sndt')) return; pl.unmute(); };
  root.addEventListener('pointerdown', unmute, { capture: true });
  if (!warmStart) pl.cue(v.ytId, u.start);
  const playU = x => { D.markStep(x.id, 'listen'); return pl.playSegment(v.ytId, x.start, x.end).then(r => { if (r === 'ended') onEnded?.(x); return r; }); };
  // 새 채팅이 올라오면 항상 맨 아래로 (내가 위로 올려 보는 중이 아니면 높이가 바뀔 때도 따라감)
  let follow = true;
  const scroll = () => { follow = true; requestAnimationFrame(() => th.scrollTo({ top: th.scrollHeight, behavior: 'smooth' })); };
  th.addEventListener('scroll', () => { follow = th.scrollHeight - th.scrollTop - th.clientHeight < 90; }, { passive: true });
  const pinBottom = () => { if (follow) th.scrollTop = th.scrollHeight; };
  try { const ro = new ResizeObserver(pinBottom); ro.observe(th); new MutationObserver(() => requestAnimationFrame(pinBottom)).observe(th, { childList: true, subtree: true, characterData: true }); } catch { }
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // ----- 말풍선 -----
  let lastWho = '';
  const bhLike = w => w === 'bh' || w === 'ai'; // 영어 질문 답변(AI)도 백현이 프로필로 · AI 표시
  const add = (who, html, cls = '') => {
    const first = who !== lastWho; lastWho = who;
    const el = h(`<div class="msg2 ${who} ${first ? 'first' : ''} ${cls}">${bhLike(who) && first ? AV(34) : bhLike(who) ? '<span class="m-av sp"></span>' : ''}<div class="m-col">${bhLike(who) && first ? `<span class="m-name">백현이${who === 'ai' ? AI_MARK : ''}</span>` : ''}<div class="m-bub">${html}</div></div></div>`);
    if (th.classList.contains('veil')) el.classList.add('keep');
    th.appendChild(el); scroll(); return el;
  };
  async function bh(html, cls) { const t = add('bh', '<span class="typing3"><i></i><i></i><i></i></span>', 'typing'); await wait(320); if (dead) return h('<div></div>'); t.remove(); lastWho = ''; return add('bh', html, cls); }
  const me = t => add('me', `<span class="en">${esc(t)}</span>`);
  // 백현이 반응 = 짧은 메시지를 연속으로 (AI가 만든 말 · 이름 옆 ✦)
  async function bhSay(text, cls = '') { const ls = bhLines(text); let last = null; for (const l of ls) { if (dead) return last; const t = add('ai', '<span class="typing3"><i></i><i></i><i></i></span>', 'typing'); await wait(last ? 420 : 260); if (dead) return last; t.remove(); lastWho = last ? 'ai' : ''; last = add('ai', `<span class="ko">${brSent(l)}</span>`, `bhl ${cls}`); } return last; }
  // 영어 교정·설명 = 말풍선과 따로 보이는 학습 영역
  const learn = (html, cls = '') => { const el = add('learn', html, `wide ${cls}`); lastWho = ''; return el; };
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
  // 말하는 중에 내가 글자를 고치면 인식 결과로 덮어쓰지 않고, 고친 문장 그대로 보냄
  // 잘못 들린 부분을 지우고 다시 말하면 → 지운 자리(커서 위치)부터 이어서 입력
  let userEdit = false, caret = null;
  const keepCaret = () => { if (!cap) caret = [ta.selectionStart, ta.selectionEnd]; };
  ta.oninput = () => { if (cap) userEdit = true; else keepCaret(); fit(); };
  ['keyup', 'click', 'select', 'blur'].forEach(ev => ta.addEventListener(ev, keepCaret));
  // 말하는 중에 입력창을 누르면 → 받아쓰기를 멈춰 두고 마음대로 고치기 · 마이크(멈춤)를 누르면 고친 문장 그대로
  ['focus', 'pointerdown'].forEach(ev => ta.addEventListener(ev, () => { if (cap) userEdit = true; }));
  function startMic(targets = waiting?.targets || []) {
    if (cap) return;
    userEdit = false;
    if (!S.support.stt) { ta.focus(); toast('키보드의 받아쓰기(🎤)로 말해도 돼요'); return; }
    if (pl.playing) pl.pause();
    micB.classList.add('live'); cp.classList.add('rec'); micB.innerHTML = ic('stop');
    const val = ta.value, at = caret && caret[0] < val.trim().length ? caret : null;
    const prefix = (at ? val.slice(0, at[0]) : val).trim(), suffix = at ? val.slice(at[1]).trim() : '';
    const join = t => [t, suffix].filter(Boolean).join(' ');
    caret = null;
    const c = cap = S.capture({ stt: true, prefix, targets, onInterim: t => { if (!userEdit) { ta.value = join(t); fit(); } } });
    fit();
    c.result.then(r => {
      if (cap === c) cap = null;
      micB.classList.remove('live'); cp.classList.remove('rec'); micB.innerHTML = ic('mic');
      if (userEdit) { /* 고친 글자 유지 */ } else if (r.text) ta.value = join(r.text); else if (r.sttError && !sendAfter) toast(S.sttErrorText(r.sttError));
      fit();
      if (sendAfter) { sendAfter = false; doSend(); }
    });
  }
  // AI에게 영어 질문: ✦ 버튼을 켜거나 한국어로 쓰면 질문으로 보냄
  let qMode = false;
  const qBtn = $('#cpq', root);
  qBtn.onclick = () => { qMode = !qMode; qBtn.classList.toggle('on', qMode); ta.placeholder = qMode ? '영어에 대해 물어봐요' : (waiting ? '영어로 말하거나 입력해요' : '영어로 말하거나 입력해요'); ta.focus(); };
  const ask = async t => {
    ta.value = ''; fit(); me(t); th.lastElementChild?.classList.add('askq');
    const ty = add('bh', '<span class="typing3"><i></i><i></i><i></i></span>', 'typing ai');
    const r = await aiAsk(t, { ko: u.ko, en: natOf(u) }); ty.remove(); lastWho = ''; if (dead) return;
    const el = add('ai', aiAnswerHTML(r), 'wide'); bindCompare(el);
    qMode = false; qBtn.classList.remove('on');
  };
  const doSend = () => {
    const t = ta.value.trim(); if (!t) return;
    if (qMode || isKoT(t)) { ask(t); return; }
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
    u = x; const i = idxOf(x); const target = natOf(x), ko = x.ko; setLpCtx({ ko: x.ko }); setResume(v.id, x.id, false); ta.placeholder = '영어로 말하거나 입력해요';
    $('#cvi', root).textContent = `${i + 1} / ${list.length}`;
    if (location.hash !== `#/study/${x.id}`) history.replaceState(null, '', `#/study/${x.id}`);
    if (th.children.length) sys(`${i + 1} / ${list.length}`);
    // 재생과 동시에 한국어 대사
    if (pending?.u === x) pending = null; else playU(x);
    lastWho = ''; const kb = add('bh', `<span class="ko">${brSent(ko)}</span>`);
    kb.classList.add('replay'); kb.onclick = () => { if (!cap) playU(x); }; // 멘트 누르면 그 장면 바로 재생
    onEnded = y => { if (y === x) addChip(['다시 듣기', 'replay', 'line', { tap: () => playU(x), stay: true }]); };
    await chips([['영어로 말해볼게', 'go', 'pri', { mic: true, targets: [target] }]], { replay: true }); if (dead) return;
    const said = await askInput('영어로 말해봐요', [target]); if (dead) return;
    D.addAttempt({ uttId: x.id, step: 'speak', text: said }); D.markStep(x.id, 'speak');
    const typ = add('bh', '<span class="typing3"><i></i><i></i><i></i></span>', 'typing');
    const f = await smartFeedback({ mode: 'translate', said, target, ko: x.ko, pattern: x.pattern }); typ.remove(); lastWho = ''; if (dead) return;
    // 백현이 반응(교정 설명 포함 · 일반 말풍선) → 학습 카드
    if (f.feedback) await bhSay(f.feedback); if (dead) return;
    const el = learn(coachHTML(f, { rec: target, recKo: x.ko, pattern: x.pattern, patternKo: x.patternKo, said }));
    bindCompare(el, saveItem(x, said)); D.markStep(x.id, 'check');
    const check = s2 => smartFeedback({ mode: 'translate', said: s2, target, ko: x.ko, pattern: x.pattern });
    // 보면서 따라 말하기(정확도 %) → 안 보고 말하기(블러 · 정확도 % + 백현이 멘트) → 맞으면 칭찬하고 다음
    let read = false;
    for (;;) {
      const k = await chips(read
        ? [['안 보고 말하기', 'recall', 'pri', { mic: true, targets: [target], tap: () => th.classList.add('veil') }], NEXT(x)]
        : [['보면서 따라 말하기', 'read', 'pri', { mic: true, targets: [target] }], NEXT(x)]); if (dead) return;
      if (k === 'read') {
        read = true;
        const re = await bh(`<span class="bub-tag">이거 보고 한번 해봐ㅎㅎ</span><span class="en big lp">${lpHTML(target)}</span><span class="say-sub">${esc(x.ko)}</span>`); bindLongPress(re); if (dead) return;
        const t1 = await askInput('보면서 말해봐요', [target]); if (dead) return;
        D.addAttempt({ uttId: x.id, step: 'read', text: t1 }); D.markStep(x.id, 'read');
        accBadge([...$$('.msg2.me', th)].pop(), diff(t1, target).score);
        continue;
      }
      if (k !== 'recall') { setResume(v.id, x.id, true); return goOn(x, k); }
      // 안 보고 말하기: 영어는 가리고(블러) 한국어 자막만 · 마이크는 칩을 누르는 순간 켜짐
      $$('.msg2', th).forEach(m => m.classList.remove('keep'));
      lastWho = ''; add('bh', '<span class="ko">이번엔 안보고 해볼까?!</span>');
      const t2 = await askInput('안 보고 말해봐요', [target]); if (dead) { th.classList.remove('veil'); return; }
      D.addAttempt({ uttId: x.id, step: 'recall', text: t2 });
      const ty2 = add('bh', '<span class="typing3"><i></i><i></i><i></i></span>', 'typing keep');
      const r = await checkRetry(t2, target, { ko, check }); ty2.remove(); lastWho = ''; if (dead) return;
      th.classList.remove('veil');
      if (r.state !== 'unsure') accBadge([...$$('.msg2.me', th)].pop(), r.score);
      await bhSay(r.state === 'retry' ? r.msg.split('\n').join(' ') : r.msg); if (dead) return;
      if (r.state === 'ok') { // 칭찬하고 다음 대화로
        D.markStep(x.id, 'recall'); setResume(v.id, x.id, true);
        const nx = nextOf(x);
        if (nx) { await wait(900); if (dead) return; return goOn(x, 'next'); }
        const k2 = await chips([NEXT(x)]); if (dead) return; return goOn(x, k2);
      }
    }
  }
  function goOn(x, k = 'next') {
    const nx = nextOf(x);
    if (k === 'list' || !nx) { location.hash = `#/video/${v.id}`; return; }
    if (!pending) pending = { u: nx, p: playU(nx) };
    run(nx);
  }
  if (warmStart) pending = { u, p: warmStart.p.then(r => { if (r === 'ended') onEnded?.(u); return r; }) };
  run(u);
  return () => { dead = true; cap?.stop(); W.on = null; pl.stop(); if (!keepWarm(v.id)) dropWarm(); root.removeEventListener('pointerdown', unmute, { capture: true }); document.body.classList.remove('no-tab'); };
}
