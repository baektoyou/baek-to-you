// WATCH — WATCH → SPEAK → CHECK → SHADOW → RETRY → APPLY
import * as D from './store.js';
import * as S from './speech.js';
import { thumb, Player } from './yt.js';
import { esc, $, $$, ic, toast, micBlock, ytLink, flashcard, compareRows, natOf } from './ui.js';
import { patternSpeak } from './apply.js';

// 영상 듣기 → 영어로 말하기 → 추천 문장 확인 → 보고 말하기 → 안 보고 말하기 → 패턴으로 새 문장
const STEPS = ['listen', 'speak', 'check', 'read', 'recall', 'apply'];
const LABEL = { listen: '영상 듣기', speak: '영어로 말하기', check: '추천 문장 확인', read: '보고 말하기', recall: '안 보고 말하기', apply: '패턴으로 말하기' };
// 예전 단계 기록도 인정 (watch→listen, shadow→read, retry→recall)
const LEGACY = { listen: 'watch', read: 'shadow', recall: 'retry' };
export const stepDone = (st, k) => !!(st?.[k] || st?.[LEGACY[k]]);
export const WORDMARK = `<h1 class="logo" aria-label="BAEK TO YOU"><b>BAEK</b> TO YOU</h1>`;

export function videoList(root) {
  const db = D.get();
  const vids = db.videos;
  const studied = Object.keys(db.progress).filter(id => D.utt(id)).length;
  const due = D.dueList().length;
  root.innerHTML = `<div class="screen">
    <header class="top">${WORDMARK}<a class="icon-btn" href="#/settings" aria-label="영상 추가">${ic('plus')}</a></header>
    <div class="stats-strip">
      <div><b>${db.utts.length}</b><span>문장</span></div>
      <div><b>${studied}</b><span>학습한 문장</span></div>
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

export function study(root, uttId, startStep) {
  const u = D.utt(uttId); if (!u) { location.hash = '#/video'; return () => { }; }
  const v = D.video(u.videoId); const list = D.uttsOf(u.videoId); const idx = list.findIndex(x => x.id === u.id);
  const en = natOf(u);
  const ans = { speak: D.attemptsOf(u.id, 'speak').slice(-1)[0]?.text || '', read: '', recall: '' };
  let step = STEPS.includes(startStep) ? startStep : 'listen';
  let stops = [];
  root.innerHTML = `<div class="screen study">
    <header class="top"><a class="icon-btn" href="#/video/${v.id}" aria-label="뒤로">${ic('back')}</a><h2 class="ttl-sm">${idx + 1} / ${list.length}</h2>
      <button class="icon-btn save-btn" aria-label="SAVED에 저장">${ic('bookmark')}</button></header>
    <div class="player" id="pl"><div class="tap-hint hide">영상을 한 번 탭해서 재생해주세요</div></div>
    <div class="pctl">
      <button class="pbtn main" data-p="play">${ic('play')}<span>구간 재생</span></button>
      <button class="pbtn" data-p="toggle" aria-label="일시정지">${ic('pause')}</button>
      <span class="time">${D.fmt(u.start)} – ${D.fmt(u.end)}</span>
      <a class="pbtn" href="${ytLink(v.ytId, u.start)}" target="_blank" rel="noopener" aria-label="YouTube 앱에서 열기">${ic('external')}</a>
    </div>
    <nav class="flow">${STEPS.map((s, i) => `<button data-s="${s}" aria-label="${LABEL[s]}"><i></i></button>`).join('')}<span class="flow-l"></span></nav>
    <div id="card"></div>
    <div id="zone"></div>
    <button class="btn block next-btn" id="next"></button>
  </div>`;
  const tog = $('[data-p=toggle]', root);
  const paintTog = () => { const p = pl.playing; tog.innerHTML = ic(p ? 'pause' : 'play'); tog.setAttribute('aria-label', p ? '일시정지' : '이어보기'); };
  const pl = new Player($('#pl', root), { onState: s => { if (s === 'blocked') $('.tap-hint', root).classList.remove('hide'); if (s === 'playing') $('.tap-hint', root).classList.add('hide'); paintTog(); } });
  pl.cue(v.ytId, u.start);
  const play = () => { D.markStep(u.id, 'listen'); return pl.playSegment(v.ytId, u.start, u.end); };
  const autoPause = () => { if (D.get().settings.autoPause !== false && pl.playing) pl.pause(); };
  $$('[data-p]', root).forEach(b => b.onclick = () => {
    if (b.dataset.p === 'play') play();
    if (b.dataset.p === 'toggle') { if (pl.playing) pl.pause(); else if (pl.seg) pl.resume(); else play(); }
  });
  const saveBtn = $('.save-btn', root);
  const paintSave = () => saveBtn.classList.toggle('on', D.isSavedUtt(u.id));
  saveBtn.onclick = () => {
    if (D.isSavedUtt(u.id)) return toast('이미 SAVED에 있어요');
    const r = D.saveExpr({ kind: 'utt', level: 'natural', uttId: u.id, ko: u.ko, en: { ...u.en }, text: en, pattern: u.pattern });
    toast(r.dup ? '이미 SAVED에 있어요' : 'SAVED에 저장했어요'); paintSave();
  };
  paintSave();
  $$('.flow [data-s]', root).forEach(b => b.onclick = () => go(b.dataset.s));
  $('#next', root).onclick = () => {
    const i = STEPS.indexOf(step);
    record();
    if (i < STEPS.length - 1) go(STEPS[i + 1], true);
    else if (list[idx + 1]) location.hash = `#/study/${list[idx + 1].id}`;
    else { toast('이 영상의 마지막 문장이에요'); location.hash = `#/video/${v.id}`; }
  };
  function record() {
    const t = ans[step];
    if (t && ['speak', 'read', 'recall'].includes(step)) D.addAttempt({ uttId: u.id, step, text: t });
    if (step !== 'apply') D.markStep(u.id, step);
  }
  const card = (flipped) => flashcard($('#card', root), { ko: u.ko, en, pattern: u.pattern, flipped });
  const mic = key => {
    const z = $('#zone', root);
    const m = micBlock(z, { targets: () => [en], onStart: autoPause, onResult: t => (ans[key] = t), onEdit: t => (ans[key] = t) });
    if (ans[key]) m.text = ans[key];
    stops.push(() => m.stop());
  };
  function go(s, fromNext) {
    stops.forEach(f => f()); stops = [];
    step = s; const i = STEPS.indexOf(s);
    const st = D.get().progress[u.id]?.steps || {};
    $$('.flow [data-s]', root).forEach((b, j) => { b.classList.toggle('on', j === i); b.classList.toggle('done', j !== i && stepDone(st, STEPS[j])); });
    $('.flow-l', root).textContent = `${i + 1}. ${LABEL[s]}`;
    const cardEl = $('#card', root), zone = $('#zone', root);
    cardEl.classList.remove('hide'); zone.innerHTML = '';
    if (s === 'listen') { card(false); if (fromNext) play(); }
    if (s === 'speak') { card(false); mic('speak'); }
    if (s === 'check') { cardEl.innerHTML = ''; cardEl.classList.add('hide'); zone.innerHTML = compareRows({ ko: u.ko, mine: ans.speak, rec: en, pattern: u.pattern }); }
    if (s === 'read') { card(true); mic('read'); }
    if (s === 'recall') { card(false); mic('recall'); }
    if (s === 'apply') {
      cardEl.innerHTML = ''; cardEl.classList.add('hide');
      const p = patternSpeak(zone, { ...u, text: en, ytId: v.ytId, videoId: v.id, videoTitle: v.title, uttId: u.id }, { onStart: autoPause, onSaved: () => D.markStep(u.id, 'apply') });
      stops.push(p.stop);
    }
    $('#next', root).textContent = i < STEPS.length - 1 ? `${LABEL[STEPS[i + 1]]} →` : (list[idx + 1] ? '다음 문장 →' : '완료');
    if (fromNext && s !== 'listen') $('.flow', root).scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  go(step);
  return () => { stops.forEach(f => f()); pl.destroy(); };
}
