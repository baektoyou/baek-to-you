// TALK(예전 WATCH) — 영상 목록 · 백현이랑 한 문장씩 카톡처럼
import * as D from './store.js';
import * as S from './speech.js';
import { thumb, Player } from './yt.js';
import { esc, $, $$, ic, toast, h, ytLink, natOf, beforeAfter, hintBox, phrasePicker } from './ui.js';
import { markPattern } from './compare.js';
import { improve, patternInfo } from './feedback.js';
import { patternSpeak } from './apply.js';
import { isLive, avatarStyle, randomPhoto } from './scene.js';

// 영상 듣기 → 영어로 말하기 → 추천 문장 확인 → 보고 말하기 → 안 보고 말하기 → 패턴으로 새 문장
const STEPS = ['listen', 'speak', 'check', 'read', 'recall', 'apply'];
const LABEL = { listen: '영상 듣기', speak: '영어로 말하기', check: '추천 문장 확인', read: '보고 말하기', recall: '안 보고 말하기', apply: '패턴으로 말하기' };
// 예전 단계 기록도 인정 (watch→listen, shadow→read, retry→recall)
const LEGACY = { listen: 'watch', read: 'shadow', recall: 'retry' };
export const stepDone = (st, k) => !!(st?.[k] || st?.[LEGACY[k]]);
export const WORDMARK = `<h1 class="logo" aria-label="BAEK TO YOU"><b>BAEK</b> TO YOU</h1>`;

export function videoList(root) {
  const db = D.get();
  const vids = db.videos.filter(v => !isLive(v)); // 라이브 영상은 TALK 전화 전용
    const due = D.dueList().length;
  root.innerHTML = `<div class="screen">
    <header class="top">${WORDMARK}<a class="icon-btn" href="#/settings" aria-label="영상 추가">${ic('plus')}</a></header>
    <div class="stats-strip">
      <div><b>${db.utts.filter(u => vids.some(v => v.id === u.videoId)).length}</b><span>문장</span></div>
      <div><b>${Object.keys(db.progress).filter(id => vids.some(v => v.id === D.utt(id)?.videoId)).length}</b><span>학습한 문장</span></div>
      <a href="#/saved"><b class="${due ? 'accent' : ''}">${due}</b><span>오늘 복습</span></a>
    </div>
    ${vids.length ? `<div class="sec-title label">VIDEOS</div><div class="vgrid">${vids.map(v => {
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
    <div class="row between sub-row"><span class="label">SENTENCES · ${us.length}</span><a class="link-sm" href="${ytLink(v.ytId)}" target="_blank" rel="noopener">${ic('external')} YouTube 앱에서 보기</a></div>
    ${us.length ? `<div class="ulist">${us.map(u => {
      const st = db.progress[u.id]?.steps || {}; const n = STEPS.filter(s => stepDone(st, s)).length;
      return `<a class="uitem" href="#/study/${u.id}"><span class="t">${D.fmt(u.start)}</span><div class="grow"><div class="ko">${esc(u.ko)}</div>
      <div class="dots">${STEPS.map(s => `<i class="${stepDone(st, s) ? 'on' : ''}"></i>`).join('')}</div></div>${n === STEPS.length ? `<span class="done-badge">${ic('check')}</span>` : D.isSavedUtt(u.id) ? `<span class="mark-saved">${ic('bookmark')}</span>` : ''}</a>`;
    }).join('')}</div>` : `<div class="empty"><b>등록된 문장이 없어요</b><p>영상 관리에서 JSON으로 문장을 추가해주세요</p><a class="btn" href="#/settings/video/${v.id}">문장 추가</a></div>`}
  </div>`;
}

// ---------- TALK: 백현이랑 카톡하듯 한 문장씩 ----------
// 듣기 → 영어로 말하기 → Before/After → 보고 말하기 → 안 보고 말하기 → 패턴으로 내 문장
export function study(root, uttId, startStep) {
  const u = D.utt(uttId); if (!u) { location.hash = '#/video'; return () => { }; }
  const v = D.video(u.videoId); const list = D.uttsOf(u.videoId); const idx = list.findIndex(x => x.id === u.id);
  const en = natOf(u);
  let dead = false, cap = null, waiting = null;
  const ph = randomPhoto(); // 들어올 때마다 프사가 바뀜
  const AV = s => `<span class="m-av ph" style="${avatarStyle(ph, s)}"></span>`;
  document.body.classList.add('no-tab');
  root.innerHTML = `<div class="chatv">
    <header class="cv-top"><a class="icon-btn" href="#/video/${v.id}" aria-label="뒤로">${ic('back')}</a>
      <div class="cv-title">${AV(28)}<div><b>백현이</b><small>${idx + 1} / ${list.length}</small></div></div>
      <button class="icon-btn save-btn" aria-label="SAVED에 저장">${ic('bookmark')}</button></header>
    <div class="cv-player"><div class="player clean" id="pl"><div class="tap-hint hide">영상을 한 번 탭해서 재생해주세요</div></div><button class="yt-shield hide" id="ysh" aria-label="재생/일시정지"><span>${ic('play')}</span></button></div>
    <div class="thread" id="th"></div>
    <div class="quick" id="qk"></div>
    <div class="composer" id="cp">
      <button class="cp-mic" id="cpm" aria-label="말하기">${ic('mic')}</button>
      <textarea id="cpt" rows="1" placeholder="영어로 말하거나 입력해요" autocapitalize="sentences" spellcheck="false"></textarea>
      <button class="cp-send" id="cps" aria-label="보내기">${ic('send')}</button>
    </div>
  </div>`;
  const th = $('#th', root), qk = $('#qk', root), cp = $('#cp', root), ta = $('#cpt', root), micB = $('#cpm', root);
  // YouTube 컨트롤 숨김 + 처음 재생된 뒤엔 투명 덮개로 탭을 받아서, 일시정지 때 YouTube 흰 화면·버튼이 안 보이게
  const ysh = $('#ysh', root);
  const pl = new Player($('#pl', root), { controls: 0, onState: s => {
    if (s === 'blocked') $('.tap-hint', root).classList.remove('hide');
    if (s === 'playing') { $('.tap-hint', root).classList.add('hide'); ysh.classList.remove('hide'); }
    ysh.classList.toggle('paused', s !== 'playing' && s !== 'buffering');
  } });
  ysh.onclick = () => { if (pl.playing) pl.pause(); else play(); };
  pl.cue(v.ytId, u.start);
  const play = () => { D.markStep(u.id, 'listen'); return pl.playSegment(v.ytId, u.start, u.end); };
  const scroll = () => requestAnimationFrame(() => th.scrollTo({ top: th.scrollHeight, behavior: 'smooth' }));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // 말풍선
  let lastWho = '';
  const add = (who, html, cls = '') => {
    const first = who !== lastWho; lastWho = who;
    const el = h(`<div class="msg2 ${who} ${first ? 'first' : ''} ${cls}">${who === 'bh' && first ? AV(34) : who === 'bh' ? '<span class="m-av sp"></span>' : ''}<div class="m-col">${who === 'bh' && first ? '<span class="m-name">백현이</span>' : ''}<div class="m-bub">${html}</div></div></div>`);
    th.appendChild(el); scroll(); return el;
  };
  const sys = t => { lastWho = ''; const el = h(`<p class="m-sys">${t}</p>`); th.appendChild(el); scroll(); };
  async function bh(html, cls) { const t = add('bh', '<span class="typing3"><i></i><i></i><i></i></span>', 'typing'); await wait(420); if (dead) return; t.remove(); lastWho = ''; return add('bh', html, cls); }
  const me = t => add('me', `<span class="en">${esc(t)}</span>`);
  const chips = list => { qk.innerHTML = list.map(([l, k, cls]) => `<button class="qchip ${cls || ''}" data-q="${k}">${l}</button>`).join(''); return new Promise(res => $$('[data-q]', qk).forEach(b => b.onclick = () => { qk.innerHTML = ''; res(b.dataset.q); })); };
  // 입력: 마이크 또는 키보드 → 보내기
  const askInput = (placeholder = '영어로 말하거나 입력해요', targets = []) => new Promise(res => {
    cp.classList.add('on'); ta.placeholder = placeholder; ta.value = ''; fit();
    waiting = { res, targets };
  });
  function fit() { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; $('#cps', root).classList.toggle('on', !!ta.value.trim()); }
  ta.oninput = fit;
  const send = () => {
    if (cap) { cap.stop(); return; }
    const t = ta.value.trim(); if (!t || !waiting) return;
    const w = waiting; waiting = null; ta.value = ''; fit(); cp.classList.remove('on'); me(t); w.res(t);
  };
  $('#cps', root).onclick = send;
  ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } };
  micB.onclick = async () => {
    if (cap) { cap.stop(); return; }
    if (!S.support.stt) { ta.focus(); toast('키보드의 받아쓰기(🎤)로 말해도 돼요'); return; }
    if (D.get().settings.autoPause !== false && pl.playing) pl.pause();
    micB.classList.add('live'); const prefix = ta.value.trim();
    cap = S.capture({ stt: true, prefix, targets: waiting?.targets || [], onInterim: t => { ta.value = t; fit(); } });
    const r = await cap.result; cap = null; micB.classList.remove('live');
    if (r.text) { ta.value = r.text; fit(); } else if (r.sttError) toast(S.sttErrorText(r.sttError));
  };
  // 저장 버튼
  const saveBtn = $('.save-btn', root);
  const paintSave = () => saveBtn.classList.toggle('on', D.isSavedUtt(u.id));
  const saveUtt = () => D.saveExpr({ kind: 'utt', level: 'natural', uttId: u.id, ko: u.ko, en: { ...u.en }, text: en, pattern: u.pattern });
  saveBtn.onclick = () => { if (D.isSavedUtt(u.id)) return toast('이미 SAVED에 있어요'); const r = saveUtt(); toast(r.dup ? '이미 SAVED에 있어요' : 'SAVED에 저장했어요'); paintSave(); };
  paintSave();

  const order = STEPS; const from = Math.max(0, order.indexOf(startStep));
  (async () => {
    let said = D.attemptsOf(u.id, 'speak').slice(-1)[0]?.text || '';
    // 듣기
    await bh(`<span class="ko">${esc(u.ko)}</span>`);
    if (from === 0) play();
    if (from <= 1) {
      const k = await chips([['다시 듣기', 'replay'], ['영어로 말해볼게', 'go', 'pri']]);
      if (k === 'replay') { play(); await chips([['영어로 말해볼게', 'go', 'pri']]); }
      if (dead) return;
      // 영어로 말하기
      sys('들은 말을 영어로 말해봐요');
      said = await askInput('영어로 말해봐요', [en]); if (dead) return;
      D.addAttempt({ uttId: u.id, step: 'speak', text: said }); D.markStep(u.id, 'speak');
    }
    if (from <= 2) {
      const r = said ? await improve(said, { useLT: false }) : null;
      await bh(`<span class="bub-tag">이렇게 말하면 더 자연스러워</span>${beforeAfter({ before: said, after: en, pattern: u.pattern, changes: r?.changes || [] })}`, 'wide');
      D.markStep(u.id, 'check');
      const k = await chips([['보면서 말해볼게', 'go', 'pri'], ['표현 고르기', 'pick']]);
      if (k === 'pick') {
        const el = await bh('<div class="pk"></div>', 'wide');
        phrasePicker($('.pk', el), en, {
          marks: (D.get().saved.find(x => x.uttId === u.id)?.marks) || [],
          onSave: (p, { asWord }) => { const r2 = saveUtt(); D.toggleMark(r2.item.id, p, true); D.saveWord({ text: p, srcId: r2.item.id, kind: asWord ? 'word' : 'expr' }); paintSave(); toast(`‘${p}’ 저장했어요`); },
          onUnmark: p => { const it = D.get().saved.find(x => x.uttId === u.id); it && D.toggleMark(it.id, p, false); }
        });
        await chips([['보면서 말해볼게', 'go', 'pri']]);
      }
      if (dead) return;
    }
    if (from <= 3) {
      await bh(`<span class="bub-tag">보면서 따라 말해봐</span><span class="en big">${markPattern(en, u.pattern, esc)}</span>`);
      const t = await askInput('보면서 말해봐요', [en]); if (dead) return;
      D.addAttempt({ uttId: u.id, step: 'read', text: t }); D.markStep(u.id, 'read');
    }
    if (from <= 4) {
      const el = await bh(`<span class="bub-tag">이번엔 안 보고!</span><span class="ko">${esc(u.ko)}</span><div class="bub-hint"></div>`);
      hintBox($('.bub-hint', el), en, { pattern: u.pattern, keywords: u.keywords });
      const t = await askInput('기억해서 영어로 말해봐요', [en]); if (dead) return;
      D.addAttempt({ uttId: u.id, step: 'recall', text: t }); D.markStep(u.id, 'recall');
      await bh(beforeAfter({ before: t, after: en, pattern: u.pattern }), 'wide');
    }
    // 패턴으로 내 문장
    const info = patternInfo(u);
    if (info.hasPattern) {
      const k = await chips([['내 얘기로 말해볼게', 'go', 'pri'], ['다음 문장', 'skip']]);
      if (k === 'go') {
        await bh(`<span class="bub-tag">${esc(info.pattern)}${info.ko ? ` · ${esc(info.ko)}` : ''}</span><span class="ko">${esc(info.question)}</span><span class="en frame">${esc(info.frame)}</span>`);
        const t = await askInput(info.frame); if (dead) return;
        const r = await improve(t, { pattern: info.pattern, useLT: D.get().settings.autoLT !== false });
        await bh(`<span class="bub-tag">이렇게 다듬어봤어</span>${beforeAfter({ before: t, after: r.after, changes: r.changes, pattern: info.pattern })}`, 'wide');
        D.markStep(u.id, 'apply'); D.addAttempt({ uttId: u.id, step: 'apply', text: t });
        const k2 = await chips([['추천 문장 저장', 'save'], ['다음 문장', 'next', 'pri']]);
        if (k2 === 'save') { const s2 = D.saveExpr({ kind: 'mine', level: 'mine', uttId: u.id, ko: '', text: r.after, before: t, en: { easy: '', natural: r.after, advanced: '' }, pattern: info.pattern, note: info.question, ytId: v.ytId, start: u.start, videoId: v.id, videoTitle: v.title }); toast(s2.dup ? '이미 SAVED에 있어요' : 'SAVED › 내 문장에 저장했어요'); }
      }
    }
    if (dead) return;
    const nx = list[idx + 1];
    const k = await chips(nx ? [['목록', 'list'], ['다음 문장 →', 'next', 'pri']] : [['목록으로', 'list', 'pri']]);
    location.hash = k === 'next' && nx ? `#/study/${nx.id}` : `#/video/${v.id}`;
  })();
  return () => { dead = true; cap?.stop(); pl.destroy(); document.body.classList.remove('no-tab'); };
}
