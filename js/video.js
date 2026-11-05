// CHAT(예전 WATCH·TALK) — 영상 목록 · 백현이랑 한 문장씩 카톡처럼
import * as D from './store.js';
import * as S from './speech.js';
import { thumb, Player } from './yt.js';
import { esc, $, $$, ic, toast, h, ytLink, natOf, hintBox, unitHTML, verdictHTML } from './ui.js';
import { patternInfo, improve, libFor, patternParts } from './feedback.js';
import { splitPatterns } from './compare.js';
import { judgeTranslation, judgeReply, keyExpressions } from './judge.js';
import { isLive, avatarStyle } from './scene.js';

// 영상 듣기 → 영어로 말하기 → 추천 문장 → 보고 말하기 → 안 보고 말하기 → 패턴 질문에 대답
const STEPS = ['listen', 'speak', 'check', 'read', 'recall', 'apply'];
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
export function study(root, uttId, startStep) {
  const u = D.utt(uttId); if (!u) { location.hash = '#/video'; return () => { }; }
  const v = D.video(u.videoId); const list = D.uttsOf(u.videoId); const idx = list.findIndex(x => x.id === u.id);
  const en = natOf(u);
  let dead = false, cap = null, waiting = null, sendAfter = false, played = false;
  const AV = s => `<span class="m-av ph" style="${avatarStyle(BH_PROFILE, s)}"></span>`;
  document.body.classList.add('no-tab');
  root.innerHTML = `<div class="chatv">
    <header class="cv-top"><a class="icon-btn" href="#/video/${v.id}" aria-label="뒤로">${ic('back')}</a>
      <div class="cv-title">${AV(28)}<div><b>백현이</b><small>${idx + 1} / ${list.length}</small></div></div>
      <span class="icon-sp"></span></header>
    <div class="cv-player"><div class="player clean" id="pl"></div><button class="yt-shield" id="ysh" aria-label="재생/일시정지"></button></div>
    <div class="thread" id="th"></div>
    <div class="quick" id="qk"></div>
    <div class="composer" id="cp">
      <button class="cp-mic" id="cpm" aria-label="말하기">${ic('mic')}</button>
      <textarea id="cpt" rows="1" placeholder="영어로 말하거나 입력해요" autocapitalize="sentences" spellcheck="false"></textarea>
      <button class="cp-send" id="cps" aria-label="보내기">${ic('send')}</button>
    </div>
  </div>`;
  const th = $('#th', root), qk = $('#qk', root), cp = $('#cp', root), ta = $('#cpt', root), micB = $('#cpm', root), sendB = $('#cps', root);
  // 영상: YouTube 컨트롤 숨김 + 투명 덮개로 탭 받기 (안내 오버레이 없음)
  const pl = new Player($('#pl', root), { controls: 0 });
  $('#ysh', root).onclick = () => { if (pl.playing) pl.pause(); else play(); };
  pl.cue(v.ytId, u.start);
  const play = () => {
    D.markStep(u.id, 'listen');
    return pl.playSegment(v.ytId, u.start, u.end).then(r => { if (r === 'ended') { played = true; addChip(['다시 듣기', 'replay', 'line']); } return r; });
  };
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
  async function bh(html, cls) { const t = add('bh', '<span class="typing3"><i></i><i></i><i></i></span>', 'typing'); await wait(380); if (dead) return h('<div></div>'); t.remove(); lastWho = ''; return add('bh', html, cls); }
  const me = t => add('me', `<span class="en">${esc(t)}</span>`);

  // ----- 빠른 답장 칩 (말하기 칩은 누르는 순간 바로 녹음 시작) -----
  let chipRes = null, chipList = [], chipOpt = {};
  const drawChips = () => {
    qk.innerHTML = chipList.map(([l, k, cls]) => `<button class="qchip ${cls || ''}" data-q="${k}">${k === 'replay' ? ic('replay') : ''}${l}</button>`).join('');
    $$('[data-q]', qk).forEach(b => b.onclick = () => {
      const it = chipList.find(c => c[1] === b.dataset.q);
      if (it?.[3]?.mic) { cp.classList.add('on'); startMic(it[3].targets || []); }
      qk.innerHTML = ''; const r = chipRes; chipRes = null; r?.(b.dataset.q);
    });
  };
  const chips = (list, opt = {}) => new Promise(res => { chipRes = res; chipList = list; chipOpt = opt; drawChips(); });
  const addChip = c => { if (chipRes && chipOpt.replay && !chipList.some(x => x[1] === c[1])) { chipList = [c, ...chipList]; drawChips(); } };

  // ----- 입력: 마이크 또는 키보드 → 보내기 (한 번에 전송) -----
  const askInput = (placeholder = '영어로 말하거나 입력해요', targets = []) => new Promise(res => {
    cp.classList.add('on'); ta.placeholder = placeholder; if (!cap) ta.value = ''; fit();
    waiting = { res, targets };
  });
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
  const doSend = () => {
    const t = ta.value.trim(); if (!t || !waiting) return;
    const w = waiting; waiting = null; ta.value = ''; fit(); cp.classList.remove('on'); me(t); w.res(t);
  };
  const send = () => { if (cap) { sendAfter = true; cap.stop(); return; } doSend(); };
  sendB.onclick = send;
  ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } };
  micB.onclick = () => { if (cap) { cap.stop(); return; } startMic(); };

  // ----- 저장: 추천 문장(카드를 누르면 저장) · 표현(누르면 저장) -----
  const saveSentence = (text, ex = {}) => text === en
    ? D.saveExpr({ kind: 'utt', level: 'natural', uttId: u.id, ko: u.ko, en: { ...u.en }, text: en, pattern: u.pattern })
    : D.saveExpr({ kind: 'mine', level: 'mine', uttId: u.id, ko: ex.ko || '', text, before: ex.said || '', en: { easy: '', natural: text, advanced: '' }, pattern: ex.pattern || '', note: ex.note || '', ytId: v.ytId, start: u.start, videoId: v.id, videoTitle: v.title });
  const recCard = (rec, ex = {}) => {
    const xs = keyExpressions(rec, ex);
    return `<div class="rec"><button class="rec-s en" type="button" data-rs aria-label="추천 문장 저장"><span class="rec-t">${unitHTML(rec, ex.pattern)}</span><i class="rec-bm">${ic('bookmark')}</i></button>
      ${xs.length ? `<div class="rec-x">${xs.map(x => `<button class="xp en" type="button" data-xp="${esc(x)}">${ic('plus')}<span>${esc(x)}</span></button>`).join('')}</div>` : ''}</div>`;
  };
  const bindRec = (el, rec, ex = {}) => {
    const bs = $('[data-rs]', el); if (!bs) return;
    if (D.get().saved.some(s => (s.text || '').trim() === rec.trim())) bs.classList.add('on');
    bs.onclick = () => { const r = saveSentence(rec, ex); bs.classList.add('on'); toast(r.dup ? '이미 SAVED에 있어요' : '문장을 저장했어요'); };
    $$('[data-xp]', el).forEach(b => b.onclick = () => {
      if (b.classList.contains('on')) return;
      const p = b.dataset.xp; const r = saveSentence(rec, ex);
      (splitPatterns(p).flatMap(patternParts).length ? splitPatterns(p).flatMap(patternParts) : [p]).forEach(m => D.toggleMark(r.item.id, m, true));
      const w = D.saveWord({ text: p, srcId: r.item.id, kind: p.trim().split(/\s+/).length > 1 || /~/.test(p) ? 'expr' : 'word' });
      b.classList.add('on'); b.innerHTML = `${ic('check')}<span>${esc(p)}</span>`; bs.classList.add('on');
      toast(w.dup ? '이미 저장한 표현이에요' : '표현을 저장했어요');
    });
  };

  const order = STEPS; const from = Math.max(0, order.indexOf(startStep));
  (async () => {
    let said = D.attemptsOf(u.id, 'speak').slice(-1)[0]?.text || '';
    await bh(`<span class="ko">${esc(u.ko)}</span>`);
    if (from === 0) play();
    if (from <= 1) {
      for (;;) {
        const k = await chips([...(played ? [['다시 듣기', 'replay', 'line']] : []), ['영어로 말해볼게', 'go', 'pri', { mic: true, targets: [en] }]], { replay: true });
        if (dead) return; if (k === 'replay') { play(); continue; } break;
      }
      said = await askInput('영어로 말해봐요', [en]); if (dead) return;
      D.addAttempt({ uttId: u.id, step: 'speak', text: said }); D.markStep(u.id, 'speak');
    }
    if (from <= 2) {
      const ev = said ? judgeTranslation(said, en) : null;
      const el = await bh(`${verdictHTML(ev)}${recCard(en, { said, pattern: u.pattern })}`, 'wide'); if (dead) return;
      bindRec(el, en, { said, pattern: u.pattern });
      D.markStep(u.id, 'check');
    }
    if (from <= 3) {
      if (from === 3) { const el = await bh(recCard(en, { pattern: u.pattern }), 'wide'); bindRec(el, en, { pattern: u.pattern }); }
      await chips([['보면서 따라 말해볼게', 'go', 'pri', { mic: true, targets: [en] }]]); if (dead) return;
      const t = await askInput('보면서 말해봐요', [en]); if (dead) return;
      D.addAttempt({ uttId: u.id, step: 'read', text: t }); D.markStep(u.id, 'read');
      const ev = judgeTranslation(t, en);
      if (ev.ok) th.lastElementChild?.classList.add('okmark');
    }
    if (from <= 4) {
      th.classList.add('veil'); // 앞에서 본 영어(내 답변·추천 문장)는 흐리게
      const nm = D.callName();
      const el = await bh(`<span class="bub-tag">${nm ? `${esc(nm)}, ` : ''}이번엔 안 보고!</span><span class="ko">${esc(u.ko)}</span><div class="bub-hint"></div>`); if (dead) return;
      hintBox($('.bub-hint', el), en, { pattern: u.pattern, keywords: u.keywords });
      await chips([['안 보고 말해볼게', 'go', 'pri', { mic: true, targets: [en] }]]); if (dead) return;
      const t = await askInput('기억해서 영어로 말해봐요', [en]); if (dead) return;
      th.classList.remove('veil');
      D.addAttempt({ uttId: u.id, step: 'recall', text: t }); D.markStep(u.id, 'recall');
      const ev = judgeTranslation(t, en);
      await bh(`${verdictHTML(ev)}${ev.level === 'great' ? '' : `<span class="en big">${unitHTML(en, u.pattern)}</span>`}`, 'wide'); if (dead) return;
    }
    // 패턴 질문에 내 이야기로 대답
    const info = patternInfo(u);
    let goNext = false;
    if (info.hasPattern) {
      const lib = libFor(info.pattern); const qEn = lib?.qEn || '';
      await bh(`<span class="bub-tag">${esc(info.pattern)}${info.ko ? ` · ${esc(info.ko)}` : ''}</span>${qEn ? `<span class="en big">${esc(qEn)}</span><span class="ko sub">${esc(lib.q)}</span>` : `<span class="ko">${esc(info.question)}</span>`}`); if (dead) return;
      const k = await chips([['다음 문장', 'next', 'line'], ['대답해볼게', 'go', 'pri', { mic: true }]]); if (dead) return;
      if (k === 'go') {
        const t = await askInput(info.frame); if (dead) return;
        const ev = judgeReply(t, { question: qEn, expr: info.pattern, strict: !!qEn });
        const r = await improve(t, { pattern: info.pattern, useLT: D.get().settings.autoLT !== false }); if (dead) return;
        const ex = { said: t, pattern: info.pattern, note: qEn || info.question };
        const el = await bh(`${verdictHTML(ev)}${recCard(r.after, ex)}`, 'wide'); if (dead) return;
        bindRec(el, r.after, ex);
        D.markStep(u.id, 'apply'); D.addAttempt({ uttId: u.id, step: 'apply', text: t });
      } else goNext = true;
    }
    if (dead) return;
    const nx = list[idx + 1];
    const k = goNext && nx ? 'next' : await chips(nx ? [['목록', 'list', 'line'], ['다음 문장 →', 'next', 'pri']] : [['목록으로', 'list', 'pri']]);
    if (dead) return;
    location.hash = k === 'next' && nx ? `#/study/${nx.id}` : `#/video/${v.id}`;
  })();
  return () => { dead = true; cap?.stop(); pl.destroy(); document.body.classList.remove('no-tab'); };
}
