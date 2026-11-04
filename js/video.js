// WATCH — WATCH → SPEAK → CHECK → SHADOW → RETRY → APPLY
import * as D from './store.js';
import * as S from './speech.js';
import { thumb, Player } from './yt.js';
import { esc, $, $$, ic, toast, micBlock, levelBoard, shadowBlock, levelsOf, targetsOf, diffHTML, hintBlock, ytLink, distinctLevels } from './ui.js';
import { best } from './compare.js';
import { applyFlow } from './apply.js';

const STEPS = ['watch', 'speak', 'check', 'shadow', 'retry', 'apply'];
const STEP_INFO = {
  watch: ['WATCH', '백현이 목소리로 먼저 들어봐요'],
  speak: ['SPEAK', '정답을 보기 전에 영어로 먼저 말해봐요'],
  check: ['CHECK', '내 답과 Easy · Natural · Advanced 비교'],
  shadow: ['SHADOW', '듣고 리듬 그대로 따라 말하기'],
  retry: ['RETRY', '정답 없이 한 번 더'],
  apply: ['APPLY', '배운 패턴으로 내 이야기 하기']
};
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
      const st = db.progress[u.id]?.steps || {}; const n = STEPS.filter(s => st[s]).length;
      return `<a class="uitem" href="#/study/${u.id}"><span class="t">${D.fmt(u.start)}</span><div class="grow"><div class="ko">${esc(u.ko)}</div>
      <div class="dots">${STEPS.map(s => `<i class="${st[s] ? 'on' : ''}"></i>`).join('')}</div></div>${n === STEPS.length ? `<span class="done-badge">${ic('check')}</span>` : D.isSavedUtt(u.id) ? `<span class="mark-saved">${ic('bookmark')}</span>` : ''}</a>`;
    }).join('')}</div>` : `<div class="empty"><b>등록된 문장이 없어요</b><p>영상 관리에서 JSON으로 문장을 추가해주세요</p><a class="btn" href="#/settings/video/${v.id}">문장 추가</a></div>`}
  </div>`;
}

export function study(root, uttId, startStep) {
  const u = D.utt(uttId); if (!u) { location.hash = '#/video'; return () => { }; }
  const v = D.video(u.videoId); const list = D.uttsOf(u.videoId); const idx = list.findIndex(x => x.id === u.id);
  const ctx = { first: '', shadow: null, retry: '' };
  const lastSpeak = D.attemptsOf(u.id, 'speak').slice(-1)[0]; if (lastSpeak) ctx.first = lastSpeak.text;
  let step = STEPS.includes(startStep) ? startStep : 'watch';
  let cleanup = [];
  const nat = u.en.natural || u.en.easy || u.en.advanced || '';
  root.innerHTML = `<div class="screen study">
    <header class="top"><a class="icon-btn" href="#/video/${v.id}" aria-label="뒤로">${ic('back')}</a><h2 class="ttl-sm">${idx + 1} / ${list.length}</h2>
      <a class="icon-btn" href="${ytLink(v.ytId, u.start)}" target="_blank" rel="noopener" aria-label="YouTube 앱에서 이 구간 열기">${ic('external')}</a></header>
    <div class="player" id="pl"><div class="tap-hint hide">영상을 한 번 탭해서 재생해주세요</div></div>
    <div class="pctl">
      <button class="pbtn main" data-p="play">${ic('play')}<span>구간 재생</span></button>
      <button class="pbtn" data-p="toggle" aria-label="일시정지">${ic('pause')}</button>
      <button class="pbtn" data-p="loop" aria-label="구간 반복">${ic('loop')}</button>
      <button class="pbtn" data-p="slow">0.75x</button>
      <span class="time">${D.fmt(u.start)} – ${D.fmt(u.end)}</span>
    </div>
    <div class="subtitle"><span class="sub-tag">한국어 원문</span><p class="sub-ko">${esc(u.ko)}</p></div>
    <nav class="stepper">${STEPS.map(s => `<button data-s="${s}"><i></i><span>${STEP_INFO[s][0]}</span></button>`).join('')}</nav>
    <div id="body"></div>
    <div class="nav-steps"><button class="btn soft" data-n="prev" aria-label="이전">${ic('back')}</button><button class="btn grow" data-n="next">다음</button></div>
  </div>`;
  const tog = $('[data-p=toggle]', root);
  const paintTog = () => { const p = pl.playing; tog.innerHTML = ic(p ? 'pause' : 'play'); tog.setAttribute('aria-label', p ? '일시정지' : '이어보기'); tog.classList.toggle('on', !p && !!pl.seg); };
  const pl = new Player($('#pl', root), { onState: s => { if (s === 'blocked') $('.tap-hint', root).classList.remove('hide'); if (s === 'playing') $('.tap-hint', root).classList.add('hide'); paintTog(); } });
  pl.cue(v.ytId, u.start);
  let slow = false;
  const play = () => { S.stopSpeak(); D.markStep(u.id, 'watch'); return pl.playSegment(v.ytId, u.start, u.end); };
  // 말하기 시작 → 영상 자동 일시정지 (마이크 종료와는 별개, 이어보기는 ⏯ 버튼)
  const autoPause = () => { if (D.get().settings.autoPause !== false && pl.playing) { pl.pause(); toast('말하는 동안 영상을 멈췄어요 · ⏯로 이어보기'); } };
  $$('[data-p]', root).forEach(b => b.onclick = () => {
    const a = b.dataset.p;
    if (a === 'play') { play(); paintSteps(); }
    if (a === 'toggle') { if (pl.playing) pl.pause(); else if (pl.seg) pl.resume(); else play(); }
    if (a === 'loop') { pl.loop = !pl.loop; b.classList.toggle('on', pl.loop); toast(pl.loop ? '구간 반복 켬' : '구간 반복 끔'); if (pl.loop && !pl.seg) play(); }
    if (a === 'slow') { slow = !slow; pl.rate(slow ? 0.75 : 1); b.classList.toggle('on', slow); }
  });
  const saveLevel = level => {
    if (D.isSavedUtt(u.id, level)) { toast('이미 SAVED에 있어요'); return; }
    const r = D.saveExpr({ kind: 'utt', level, uttId: u.id, ko: u.ko, en: { ...u.en }, text: u.en[level], pattern: u.pattern });
    toast(r.dup ? '같은 문장이 이미 SAVED에 있어요' : `${level[0].toUpperCase() + level.slice(1)} 표현을 SAVED에 저장했어요`);
  };

  function paintSteps() {
    const st = D.get().progress[u.id]?.steps || {};
    $$('.stepper button', root).forEach(b => { b.classList.toggle('on', b.dataset.s === step); b.classList.toggle('done', !!st[b.dataset.s]); });
    const i = STEPS.indexOf(step);
    $('[data-n=prev]', root).disabled = i === 0;
    $('[data-n=next]', root).classList.toggle('soft', step === 'speak');
    $('.nav-steps', root).classList.toggle('sub', step === 'apply');
    $('[data-n=next]', root).textContent = i === STEPS.length - 1 ? (list[idx + 1] ? '다음 문장 →' : '완료') : `${STEP_INFO[STEPS[i + 1]][0]} →`;
    // CHECK 이후엔 자막 영역에 Natural 영어도 표시
    const sub = $('.subtitle', root);
    sub.querySelector('.sub-en')?.remove();
    if (i >= 2 && nat && step !== 'retry') sub.insertAdjacentHTML('beforeend', `<div class="sub-en"><span class="sub-tag en-tag">English · Natural</span><p class="en">${esc(nat)}</p></div>`);
  }
  $$('.stepper button', root).forEach(b => b.onclick = () => go(b.dataset.s));
  $('[data-n=prev]', root).onclick = () => { const i = STEPS.indexOf(step); if (i > 0) go(STEPS[i - 1]); };
  $('[data-n=next]', root).onclick = () => {
    const i = STEPS.indexOf(step);
    if (step !== 'speak' && step !== 'retry' && step !== 'apply') D.markStep(u.id, step);
    if (i < STEPS.length - 1) go(STEPS[i + 1]);
    else if (list[idx + 1]) location.hash = `#/study/${list[idx + 1].id}`;
    else { toast('이 영상의 마지막 문장이에요'); location.hash = `#/video/${v.id}`; }
  };

  function go(s) {
    cleanup.forEach(f => f()); cleanup = []; S.stopSpeak();
    step = s; const body = $('#body', root);
    body.innerHTML = `<p class="step-desc">${STEP_INFO[s][1]}</p><div id="sb" class="step-body"></div>`;
    const sb = $('#sb', body);
    ({ watch, speak, check, shadow, retry, apply })[s](sb);
    paintSteps();
  }

  function watch(el) {
    el.innerHTML = `<button class="btn block" id="w-play">${ic('play')} 백현이 목소리로 듣기</button>
      <p class="tiny muted center-t">들은 뒤 SPEAK에서 영어로 먼저 말해봐요</p>`;
    $('#w-play', el).onclick = () => { play(); paintSteps(); };
  }
  function speak(el) {
    el.innerHTML = `<div id="hint"></div><div id="m"></div>
      <div class="row"><button class="btn soft" id="re" aria-label="구간 다시 듣기">${ic('replay')}</button><button class="btn grow" id="ok" ${ctx.first ? '' : 'disabled'}>정답 확인</button></div>
      <button class="link-sm skip" id="skip">모르겠어요 · 정답 먼저 보기</button>`;
    hintBlock($('#hint', el), { text: nat, pattern: u.pattern });
    const m = micBlock($('#m', el), { targets: () => targetsOf(u), onStart: autoPause, onResult: t => setFirst(t), onEdit: t => setFirst(t) });
    cleanup.push(() => m.stop());
    if (ctx.first) m.text = ctx.first;
    function setFirst(t) { ctx.first = t; $('#ok', el).disabled = !t; }
    $('#re', el).onclick = play;
    $('#ok', el).onclick = () => { if (!ctx.first) return; D.addAttempt({ uttId: u.id, step: 'speak', text: ctx.first }); D.markStep(u.id, 'speak'); go('check'); };
    $('#skip', el).onclick = () => go('check');
  }
  function check(el) {
    el.innerHTML = `<div id="fc"></div>${ctx.first ? '' : `<button class="btn soft block" id="try">${ic('mic')} 먼저 말해보기</button>`}
      <p class="tiny muted">마음에 드는 표현은 ${ic('bookmark')}로 레벨별 저장할 수 있어요</p>`;
    levelBoard($('#fc', el), u, { answer: ctx.first, isSaved: k => D.isSavedUtt(u.id, k), onSave: saveLevel, onShadow: t => { ctx.shadowText = t; go('shadow'); } });
    D.markStep(u.id, 'check');
    $('#try', el) && ($('#try', el).onclick = () => go('speak'));
  }
  function shadow(el) {
    const lv = distinctLevels(u);
    let text = ctx.shadowText || nat || lv[0]?.text;
    if (!text) { el.innerHTML = '<div class="note">쉐도잉할 영어 예시가 없어요.</div>'; return; }
    el.innerHTML = `${lv.length > 1 ? `<div class="seg mini-seg">${lv.map(l => `<button data-k="${esc(l.text)}" class="${l.text === text ? 'on' : ''}">${l.label}</button>`).join('')}</div>` : ''}<div id="sh"></div>`;
    const mount = () => { const s = shadowBlock($('#sh', el), text, { onResult: r => { ctx.shadow = r; D.addAttempt({ uttId: u.id, step: 'shadow', text: r.text, score: r.recall }); D.markStep(u.id, 'shadow'); paintSteps(); } }); cleanup.push(s.stop); };
    $$('[data-k]', el).forEach(b => b.onclick = () => { text = b.dataset.k; ctx.shadowText = text; $$('[data-k]', el).forEach(x => x.classList.toggle('on', x === b)); cleanup.forEach(f => f()); mount(); });
    if (pl.playing) pl.pause();
    mount();
  }
  function retry(el) {
    el.innerHTML = `<div id="hint"></div><div id="m"></div><div id="rc"></div>`;
    hintBlock($('#hint', el), { text: nat, pattern: u.pattern });
    const m = micBlock($('#m', el), { targets: () => targetsOf(u), onStart: autoPause, onResult: t => show(t), onEdit: t => show(t, true) });
    cleanup.push(() => m.stop());
    function show(t, quiet) {
      ctx.retry = t; if (!t) { $('#rc', el).innerHTML = ''; return; }
      const cands = levelsOf(u);
      const now = best(t, cands), before = ctx.first ? best(ctx.first, cands) : null;
      if (!now) return;
      const delta = before ? now.d.score - before.d.score : null;
      $('#rc', el).innerHTML = `<div class="cmp">
        <div class="cmp-head"><span class="label">RETRY · ${esc(now.label)} 기준</span><span class="score">${now.d.score}<small>%</small>${delta != null ? `<em class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'}${Math.abs(delta)}</em>` : ''}</span></div>
        ${diffHTML(now.d)}
        ${before ? `<div class="tiny muted">처음 ${before.d.score}% · “${esc(ctx.first)}”</div>` : ''}
      </div>`;
      if (!quiet) { D.addAttempt({ uttId: u.id, step: 'retry', text: t, score: now.d.score }); D.markStep(u.id, 'retry'); paintSteps(); }
    }
  }
  function apply(el) {
    if (pl.playing) pl.pause();
    const f = applyFlow(el, { ...u, text: nat, ytId: v.ytId, videoId: v.id, videoTitle: v.title, uttId: u.id }, { onSaved: () => { D.markStep(u.id, 'apply'); paintSteps(); } });
    cleanup.push(f.stop);
  }

  go(step);
  return () => { cleanup.forEach(f => f()); pl.destroy(); S.stopSpeak(); };
}
