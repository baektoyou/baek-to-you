// VIDEO — WATCH → SPEAK → CHECK → SHADOW → RETRY → APPLY
import * as D from './store.js';
import * as S from './speech.js';
import { thumb, Player } from './yt.js';
import { esc, $, $$, ic, toast, micBlock, answerCard, shadowBlock, compareCard, levelsOf, targetsOf, diffHTML } from './ui.js';
import { best } from './compare.js';

const STEPS = ['watch', 'speak', 'check', 'shadow', 'retry', 'apply'];
const STEP_INFO = {
  watch: ['WATCH', '백현이 목소리로 먼저 들어봐요'],
  speak: ['SPEAK', '정답 보기 전에 영어로 말해봐요'],
  check: ['CHECK', '내 답과 예시 표현 비교'],
  shadow: ['SHADOW', '듣고 리듬 그대로 따라 말하기'],
  retry: ['RETRY', '정답 없이 한 번 더'],
  apply: ['APPLY', '이 패턴으로 내 이야기 하기']
};
export const WORDMARK = `<h1 class="wordmark">baek<i>to</i>you</h1>`;

export function videoList(root) {
  const db = D.get();
  const vids = db.videos;
  const studied = Object.keys(db.progress).length;
  const due = D.dueList().length;
  root.innerHTML = `<div class="screen">
    <div class="top">${WORDMARK}<a class="icon-btn" href="#/settings" aria-label="영상 추가">${ic('plus')}</a></div>
    <div class="hero">
      <div class="stat"><div class="big">${db.utts.length}</div><span>문장</span></div>
      <div class="stat"><div class="big">${studied}</div><span>학습</span></div>
      <a class="stat" href="#/saved"><div class="big">${due}</div><span>오늘 복습</span></a>
    </div>
    ${vids.length ? `<div class="vgrid">${vids.map(v => {
      const us = D.uttsOf(v.id); const done = us.filter(u => db.progress[u.id]?.steps?.check).length;
      return `<a class="vcard" href="#/video/${v.id}"><div class="vthumb" style="background-image:url('${thumb(v.ytId)}')">${us.length ? `<div class="prog"><i style="width:${done / us.length * 100}%"></i></div>` : ''}</div>
      <div class="vmeta"><b>${esc(v.title)}</b><span class="cnt">${done}/${us.length}</span></div></a>`;
    }).join('')}</div>`
      : `<div class="empty"><div class="emo">🎬</div><b>아직 영상이 없어요</b>백현이 YouTube 영상을 추가해보세요<div style="margin-top:18px"><a class="btn" href="#/settings">${ic('plus')} 영상 추가</a></div></div>`}
  </div>`;
}

export function videoDetail(root, vid) {
  const v = D.video(vid); if (!v) { location.hash = '#/video'; return; }
  const us = D.uttsOf(vid), db = D.get();
  root.innerHTML = `<div class="screen">
    <div class="top"><a class="icon-btn" href="#/video">${ic('back')}</a><h2>${esc(v.title)}</h2><a class="icon-btn" href="#/settings/video/${v.id}" aria-label="영상 관리">${ic('edit')}</a></div>
    <div class="vthumb hero-thumb" style="background-image:url('${thumb(v.ytId)}')"></div>
    ${us.length ? `<div class="ulist">${us.map(u => {
      const st = db.progress[u.id]?.steps || {}; const n = STEPS.filter(s => st[s]).length;
      return `<a class="uitem" href="#/study/${u.id}"><span class="t">${D.fmt(u.start)}</span><div class="grow"><div class="ko">${esc(u.ko)}</div>
      <div class="dots">${STEPS.map(s => `<i class="${st[s] ? 'on' : ''}"></i>`).join('')}</div></div>${n === STEPS.length ? `<span class="done-badge">${ic('check')}</span>` : D.isSavedUtt(u.id) ? `<span class="mark-saved">${ic('bookmark')}</span>` : ''}</a>`;
    }).join('')}</div>` : `<div class="empty"><div class="emo">📝</div><b>등록된 문장이 없어요</b>영상 관리에서 JSON으로 문장을 추가해주세요<div style="margin-top:18px"><a class="btn" href="#/settings/video/${v.id}">문장 추가</a></div></div>`}
  </div>`;
}

export function study(root, uttId, startStep) {
  const u = D.utt(uttId); if (!u) { location.hash = '#/video'; return () => { }; }
  const v = D.video(u.videoId); const list = D.uttsOf(u.videoId); const idx = list.findIndex(x => x.id === u.id);
  const ctx = { first: '', shadow: null, retry: '' };
  const lastSpeak = D.attemptsOf(u.id, 'speak').slice(-1)[0]; if (lastSpeak) ctx.first = lastSpeak.text;
  let step = STEPS.includes(startStep) ? startStep : 'watch';
  let cleanup = [];
  root.innerHTML = `<div class="screen">
    <div class="top"><a class="icon-btn" href="#/video/${v.id}">${ic('back')}</a><h2 class="ttl-sm">${idx + 1} / ${list.length}</h2>
      <button class="icon-btn save-btn" aria-label="저장">${ic('bookmark')}</button></div>
    <div class="player" id="pl"><div class="tap-hint hide">▶ 영상을 한 번 탭해서 재생</div></div>
    <div class="pctl">
      <button class="pbtn main" data-p="play">${ic('play')}<span>구간 재생</span></button>
      <button class="pbtn" data-p="loop" aria-label="구간 반복">${ic('loop')}</button>
      <button class="pbtn" data-p="slow">0.75x</button>
      <span class="time">${D.fmt(u.start)} – ${D.fmt(u.end)}</span>
    </div>
    <div class="stepper">${STEPS.map(s => `<button data-s="${s}"><i></i><span>${STEP_INFO[s][0]}</span></button>`).join('')}</div>
    <div id="body"></div>
    <div class="nav-steps"><button class="btn soft" data-n="prev" aria-label="이전">${ic('back')}</button><button class="btn grow" data-n="next">다음</button></div>
  </div>`;
  const pl = new Player($('#pl', root), { onState: s => { if (s === 'blocked') $('.tap-hint', root).classList.remove('hide'); if (s === 'playing') $('.tap-hint', root).classList.add('hide'); } });
  pl.cue(v.ytId, u.start);
  let slow = false;
  const play = () => { S.stopSpeak(); return pl.playSegment(v.ytId, u.start, u.end); };
  $$('[data-p]', root).forEach(b => b.onclick = () => {
    const a = b.dataset.p;
    if (a === 'play') { play(); D.markStep(u.id, 'watch'); paintSteps(); }
    if (a === 'loop') { pl.loop = !pl.loop; b.classList.toggle('on', pl.loop); toast(pl.loop ? '구간 반복 ON' : '구간 반복 OFF'); if (pl.loop && !pl.seg) play(); }
    if (a === 'slow') { slow = !slow; pl.rate(slow ? 0.75 : 1); b.classList.toggle('on', slow); }
  });
  const saveBtn = $('.save-btn', root);
  const paintSave = () => saveBtn.classList.toggle('on', D.isSavedUtt(u.id));
  saveBtn.onclick = () => { const r = D.saveExpr({ kind: 'utt', uttId: u.id, ko: u.ko, en: { ...u.en }, pattern: u.pattern }); toast(r.dup ? '이미 SAVED에 있어요' : 'SAVED에 저장했어요'); paintSave(); };
  paintSave();

  function paintSteps() {
    const st = D.get().progress[u.id]?.steps || {};
    $$('.stepper button', root).forEach(b => { b.classList.toggle('on', b.dataset.s === step); b.classList.toggle('done', !!st[b.dataset.s]); });
    const i = STEPS.indexOf(step);
    $('[data-n=prev]', root).disabled = i === 0;
    $('[data-n=next]', root).classList.toggle('soft', step === 'speak');
    $('[data-n=next]', root).textContent = i === STEPS.length - 1 ? (list[idx + 1] ? '다음 문장' : '완료') : `${STEP_INFO[STEPS[i + 1]][0]}`;
  }
  $$('.stepper button', root).forEach(b => b.onclick = () => go(b.dataset.s));
  $('[data-n=prev]', root).onclick = () => { const i = STEPS.indexOf(step); if (i > 0) go(STEPS[i - 1]); };
  $('[data-n=next]', root).onclick = () => {
    const i = STEPS.indexOf(step);
    if (step !== 'speak' && step !== 'retry' && step !== 'apply') D.markStep(u.id, step);
    if (i < STEPS.length - 1) go(STEPS[i + 1]);
    else if (list[idx + 1]) location.hash = `#/study/${list[idx + 1].id}`;
    else { toast('이 영상의 마지막 문장이에요 ✦'); location.hash = `#/video/${v.id}`; }
  };

  function go(s) {
    cleanup.forEach(f => f()); cleanup = []; S.stopSpeak();
    step = s; const body = $('#body', root);
    body.innerHTML = `<p class="step-desc">${STEP_INFO[s][1]}</p><div id="sb" class="step-body"></div>`;
    const sb = $('#sb', body);
    ({ watch, speak, check, shadow, retry, apply })[s](sb);
    paintSteps();
  }
  const koCard = (label = '') => `<div class="card pink ko-card">${label ? `<span class="label">${label}</span>` : ''}<div class="ko-big">${esc(u.ko)}</div></div>`;

  function watch(el) {
    el.innerHTML = `${koCard()}
      ${u.topics.length || u.emotion ? `<div class="row wrap tags">${u.topics.map(t => `<span class="chip line">#${esc(t)}</span>`).join('')}${u.emotion ? `<span class="chip line">${esc(u.emotion)}</span>` : ''}</div>` : ''}
      <button class="btn block" id="w-play" style="margin-top:14px">${ic('play')} 백현이 목소리 듣기</button>`;
    $('#w-play', el).onclick = () => { play(); D.markStep(u.id, 'watch'); paintSteps(); };
  }
  function speak(el) {
    el.innerHTML = `${koCard()}<div id="m"></div>
      <div class="row"><button class="btn soft" id="re" aria-label="영상 다시">${ic('replay')}</button><button class="btn grow" id="ok" ${ctx.first ? '' : 'disabled'}>정답 확인</button></div>`;
    const m = micBlock($('#m', el), { targets: () => targetsOf(u), onStart: () => pl.stop(), onResult: t => setFirst(t), onEdit: t => setFirst(t) });
    if (ctx.first) m.text = ctx.first;
    function setFirst(t) { ctx.first = t; $('#ok', el).disabled = !t; }
    $('#re', el).onclick = play;
    $('#ok', el).onclick = () => { if (!ctx.first) return; D.addAttempt({ uttId: u.id, step: 'speak', text: ctx.first }); D.markStep(u.id, 'speak'); go('check'); };
  }
  function check(el) {
    el.innerHTML = `<div class="ko-line">${esc(u.ko)}</div><div id="fc"></div>
      ${ctx.first ? '' : `<button class="btn soft block" id="try" style="margin-top:12px">${ic('mic')} 먼저 말해보기</button>`}`;
    answerCard($('#fc', el), u, { answer: ctx.first, onShadow: t => { ctx.shadowText = t; go('shadow'); } });
    D.markStep(u.id, 'check');
    $('#try', el) && ($('#try', el).onclick = () => go('speak'));
  }
  function shadow(el) {
    const lv = levelsOf(u).filter(l => !l.key.startsWith('alt'));
    let text = ctx.shadowText || u.en.natural || lv[0]?.text;
    if (!text) { el.innerHTML = '<div class="note">쉐도잉할 영어 예시가 없어요.</div>'; return; }
    el.innerHTML = `${lv.length > 1 ? `<div class="seg mini-seg">${lv.map(l => `<button data-k="${esc(l.text)}" class="${l.text === text ? 'on' : ''}">${l.label}</button>`).join('')}</div>` : ''}<div id="sh"></div>`;
    const mount = () => { const s = shadowBlock($('#sh', el), text, { onResult: r => { ctx.shadow = r; D.addAttempt({ uttId: u.id, step: 'shadow', text: r.text, score: r.recall }); D.markStep(u.id, 'shadow'); paintSteps(); } }); cleanup.push(s.stop); };
    $$('[data-k]', el).forEach(b => b.onclick = () => { text = b.dataset.k; ctx.shadowText = text; $$('[data-k]', el).forEach(x => x.classList.toggle('on', x === b)); cleanup.forEach(f => f()); mount(); });
    mount();
  }
  function retry(el) {
    el.innerHTML = `${koCard()}<div id="m"></div><div id="rc"></div>`;
    micBlock($('#m', el), { targets: () => targetsOf(u), onResult: t => show(t), onEdit: t => show(t, true) });
    function show(t, quiet) {
      ctx.retry = t; if (!t) return;
      const cands = levelsOf(u);
      const now = best(t, cands), before = ctx.first ? best(ctx.first, cands) : null;
      if (!now) return;
      const delta = before ? now.d.score - before.d.score : null;
      $('#rc', el).innerHTML = `<div class="cmp">
        <div class="cmp-head"><span class="label">RETRY</span><span class="score">${now.d.score}<small>%</small>${delta != null ? `<em class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'}${Math.abs(delta)}</em>` : ''}</span></div>
        ${diffHTML(now.d)}
        ${before ? `<div class="tiny muted">처음 ${before.d.score}% · “${esc(ctx.first)}”</div>` : ''}
      </div>`;
      if (!quiet) { D.addAttempt({ uttId: u.id, step: 'retry', text: t, score: now.d.score }); D.markStep(u.id, 'retry'); paintSteps(); }
    }
  }
  function apply(el) {
    const mine = D.get().saved.filter(s => s.kind === 'mine' && s.uttId === u.id);
    el.innerHTML = `<div class="card pink ko-card"><div class="en-big">${esc(u.en.natural || u.en.easy || '')}</div>
      ${u.pattern ? `<div class="pattern"><b>PATTERN</b><span class="en">${esc(u.pattern)}</span></div>` : ''}</div>
      <div id="m"></div>
      <input class="input" id="memo" placeholder="한국어 메모 (선택)" style="margin-bottom:10px">
      <button class="btn block" id="sv" disabled>${ic('bookmark')} 내 문장 저장</button>
      ${mine.length ? `<div class="sec-title label">MY SENTENCES</div><div class="stack">${mine.map(s => `<div class="sitem"><div class="en">${esc(s.text)}</div>${s.ko ? `<div class="small muted">${esc(s.ko)}</div>` : ''}</div>`).join('')}</div>` : ''}`;
    let rec = null;
    const m = micBlock($('#m', el), { record: true, placeholder: '배운 패턴으로 내 문장 말하기', onResult: (t, r) => { rec = r; $('#sv', el).disabled = !t; }, onEdit: t => ($('#sv', el).disabled = !t) });
    $('#sv', el).onclick = async () => {
      const text = m.text; if (!text) return;
      let audioId = null;
      if (rec?.blob) { audioId = D.uid(); try { await D.AudioStore.put(audioId, rec.blob); } catch { audioId = null; } }
      D.saveExpr({ kind: 'mine', uttId: u.id, ko: $('#memo', el).value.trim(), text, en: { easy: '', natural: text, advanced: '' }, pattern: u.pattern, audioId });
      D.addAttempt({ uttId: u.id, step: 'apply', text }); D.markStep(u.id, 'apply');
      toast('내 문장을 SAVED에 저장했어요'); go('apply');
    };
  }

  go(step);
  return () => { cleanup.forEach(f => f()); pl.destroy(); S.stopSpeak(); };
}
