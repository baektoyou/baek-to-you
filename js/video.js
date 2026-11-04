// VIDEO — WATCH → SPEAK → CHECK → SHADOW → FEEDBACK → RETRY → APPLY
import * as D from './store.js';
import * as S from './speech.js';
import { thumb, Player } from './yt.js';
import { esc, $, $$, ic, toast, micBlock, flashcard, shadowBlock, compareCard, levelsOf, diffHTML } from './ui.js';
import { diff, best } from './compare.js';

const STEPS = ['watch', 'speak', 'check', 'shadow', 'feedback', 'retry', 'apply'];
const STEP_INFO = {
  watch: ['WATCH', '백현이의 실제 발화를 들어봐요. 영어 정답은 아직 숨겨져 있어요.'],
  speak: ['SPEAK', '이 말을 자연스러운 영어로 먼저 말해보세요.'],
  check: ['CHECK', '카드를 뒤집어 Easy · Natural · Advanced 표현과 비교해요.'],
  shadow: ['SHADOW', '원어민 음성의 억양·리듬·속도를 그대로 따라 말해요.'],
  feedback: ['FEEDBACK', '측정 가능한 항목만 보여드려요.'],
  retry: ['RETRY', '정답을 가리고 한 번 더. 처음보다 나아졌는지 확인해요.'],
  apply: ['APPLY', '배운 패턴으로 내 이야기를 말하고 저장해요.']
};

export function videoList(root) {
  const db = D.get();
  const vids = db.videos;
  const studied = Object.keys(db.progress).length;
  const due = D.dueList().length;
  root.innerHTML = `<div class="screen">
    <div class="top"><div class="logo"><i>♡</i><h1>BAEK TO YOU</h1></div><a class="icon-btn" href="#/settings" aria-label="설정">${ic('plus')}</a></div>
    <p class="sub en">Learn English by talking with Baekhyun.</p>
    <div class="hero"><div class="stat"><div class="big">${db.utts.length}</div><span>등록 문장</span></div><div class="stat"><div class="big">${studied}</div><span>학습한 문장</span></div><a class="stat" href="#/saved" style="color:inherit;text-decoration:none"><div class="big">${due}</div><span>오늘 복습</span></a></div>
    ${vids.length ? `<div class="vgrid">${vids.map(v => {
      const us = D.uttsOf(v.id); const done = us.filter(u => db.progress[u.id]?.steps?.check).length;
      return `<a class="vcard" href="#/video/${v.id}"><div class="vthumb" style="background-image:url('${thumb(v.ytId)}')"><span class="cnt">${us.length}문장</span>${us.length ? `<div class="prog"><i style="width:${done / us.length * 100}%"></i></div>` : ''}</div>
      <div class="vmeta"><b>${esc(v.title)}</b>${ic('next')}</div></a>`;
    }).join('')}</div>`
      : `<div class="empty"><div class="emo">🎬</div><b>아직 영상이 없어요</b>SETTINGS에서 백현이 YouTube 영상을 추가하고<br>한국어 발화와 영어 표현을 등록해주세요.<div style="margin-top:18px"><a class="btn" href="#/settings">영상 추가하기</a></div></div>`}
  </div>`;
}

export function videoDetail(root, vid) {
  const v = D.video(vid); if (!v) { location.hash = '#/video'; return; }
  const us = D.uttsOf(vid), db = D.get();
  root.innerHTML = `<div class="screen">
    <div class="top"><a class="icon-btn" href="#/video">${ic('back')}</a><h2>${esc(v.title)}</h2><a class="icon-btn" href="#/settings/video/${v.id}">${ic('edit')}</a></div>
    <div class="vthumb" style="background-image:url('${thumb(v.ytId)}');border-radius:var(--r-lg);margin-bottom:16px"></div>
    ${us.length ? `<div class="ulist">${us.map(u => {
      const st = db.progress[u.id]?.steps || {};
      return `<a class="uitem" href="#/study/${u.id}"><span class="t">${D.fmt(u.start)}</span><div class="grow"><div class="ko">${esc(u.ko)}</div>
      <div class="dots">${STEPS.map(s => `<i class="${st[s] ? 'on' : ''}"></i>`).join('')}</div></div>${D.isSavedUtt(u.id) ? `<span style="color:var(--pink4)">♥</span>` : ''}</a>`;
    }).join('')}</div>` : `<div class="empty"><div class="emo">📝</div><b>등록된 문장이 없어요</b>영상의 발화 구간과 영어 표현을 추가해주세요.<div style="margin-top:18px"><a class="btn" href="#/settings/video/${v.id}">문장 등록하기</a></div></div>`}
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
    <div class="top"><a class="icon-btn" href="#/video/${v.id}">${ic('back')}</a><h2 class="small" style="font-size:14px">${esc(v.title)}</h2>
      <button class="icon-btn save-btn" aria-label="저장">${ic('heart')}</button></div>
    <div class="player" id="pl"><div class="tap-hint hide">▶ 영상을 한 번 탭해서 재생해주세요</div></div>
    <div class="pctl"><button class="btn sm" data-p="play">${ic('play')} 구간 재생</button><button class="btn sm soft" data-p="loop">${ic('loop')} 반복</button><button class="btn sm soft" data-p="slow">0.75x</button><span class="time">${D.fmt(u.start)}–${D.fmt(u.end)}</span></div>
    <div class="steps">${STEPS.map(s => `<button data-s="${s}">${STEP_INFO[s][0]}</button>`).join('')}</div>
    <div id="body"></div>
    <div class="nav-steps"><button class="btn soft" data-n="prev">${ic('back')}</button><button class="btn grow" data-n="next">다음 단계</button></div>
  </div>`;
  const pl = new Player($('#pl', root), { onState: s => { if (s === 'blocked') $('.tap-hint', root).classList.remove('hide'); if (s === 'playing') $('.tap-hint', root).classList.add('hide'); } });
  pl.cue(v.ytId, u.start);
  let slow = false;
  const play = () => { S.stopSpeak(); return pl.playSegment(v.ytId, u.start, u.end); };
  $$('[data-p]', root).forEach(b => b.onclick = () => {
    const a = b.dataset.p;
    if (a === 'play') { play(); D.markStep(u.id, 'watch'); paintSteps(); }
    if (a === 'loop') { pl.loop = !pl.loop; b.classList.toggle('pink', pl.loop); b.classList.toggle('soft', !pl.loop); toast(pl.loop ? '구간 반복 ON' : '구간 반복 OFF'); if (pl.loop && !pl.seg) play(); }
    if (a === 'slow') { slow = !slow; pl.rate(slow ? 0.75 : 1); b.classList.toggle('pink', slow); b.classList.toggle('soft', !slow); }
  });
  const saveBtn = $('.save-btn', root);
  const paintSave = () => { saveBtn.style.background = D.isSavedUtt(u.id) ? 'var(--pink)' : ''; saveBtn.style.color = D.isSavedUtt(u.id) ? 'var(--pink4)' : ''; };
  saveBtn.onclick = () => { const r = D.saveExpr({ kind: 'utt', uttId: u.id, ko: u.ko, en: { ...u.en }, pattern: u.pattern }); toast(r.dup ? '이미 SAVED에 있어요' : 'SAVED에 저장했어요 ♡'); paintSave(); };
  paintSave();

  function paintSteps() {
    const st = D.get().progress[u.id]?.steps || {};
    $$('.steps button', root).forEach(b => { b.classList.toggle('on', b.dataset.s === step); b.classList.toggle('done', !!st[b.dataset.s]); });
    $('.steps button.on', root)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    const i = STEPS.indexOf(step);
    $('[data-n=next]', root).textContent = i === STEPS.length - 1 ? (list[idx + 1] ? '다음 문장 →' : '완료 ✓') : `${STEP_INFO[STEPS[i + 1]][0]} →`;
  }
  $$('.steps button', root).forEach(b => b.onclick = () => go(b.dataset.s));
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
    step = s; const body = $('#body', root); const [t, d] = STEP_INFO[s];
    body.innerHTML = `<div class="step-title">${t}</div><p class="step-desc">${d}</p><div id="sb"></div>`;
    const sb = $('#sb', body);
    ({ watch, speak, check, shadow, feedback, retry, apply })[s](sb);
    paintSteps();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function watch(el) {
    el.innerHTML = `<div class="card pink stack"><span class="label">KOREAN · 실제 발화</span><div class="ko-big">${esc(u.ko)}</div>
      ${u.topics.length || u.emotion ? `<div class="row wrap">${u.topics.map(t => `<span class="chip line">#${esc(t)}</span>`).join('')}${u.emotion ? `<span class="chip line">${esc(u.emotion)}</span>` : ''}</div>` : ''}</div>
      <div class="row" style="margin-top:12px"><button class="btn block" id="w-play">${ic('play')} 백현이 목소리 듣기</button></div>
      <div class="note" style="margin-top:10px">영어 정답은 CHECK 단계에서 공개돼요. 먼저 스스로 떠올려보세요.</div>`;
    $('#w-play', el).onclick = () => { play(); D.markStep(u.id, 'watch'); paintSteps(); };
  }
  function speak(el) {
    el.innerHTML = `<div class="card pink"><div class="ko-big">${esc(u.ko)}</div></div><div id="m" style="margin-top:14px"></div>
      <div class="row" style="margin-top:4px"><button class="btn sm soft" id="re">${ic('replay')} 영상 다시</button><button class="btn sm pink grow" id="ok" ${ctx.first ? '' : 'disabled'}>이 답변으로 확인하기</button></div>`;
    const m = micBlock($('#m', el), { onStart: () => pl.stop(), onResult: t => setFirst(t), onEdit: t => setFirst(t, true) });
    if (ctx.first) m.text = ctx.first;
    function setFirst(t, quiet) { ctx.first = t; $('#ok', el).disabled = !t; }
    $('#re', el).onclick = play;
    $('#ok', el).onclick = () => { if (!ctx.first) return; D.addAttempt({ uttId: u.id, step: 'speak', text: ctx.first }); D.markStep(u.id, 'speak'); go('check'); };
  }
  function check(el) {
    el.innerHTML = `<div id="fc"></div>`;
    flashcard($('#fc', el), u, { getAnswer: () => ctx.first, onFlip: () => D.markStep(u.id, 'check'), onShadow: t => { ctx.shadowText = t; go('shadow'); } });
  }
  function shadow(el) {
    const lv = levelsOf(u).filter(l => !l.key.startsWith('alt'));
    let text = ctx.shadowText || u.en.natural || lv[0]?.text;
    if (!text) { el.innerHTML = '<div class="note">쉐도잉할 영어 예시가 없어요.</div>'; return; }
    el.innerHTML = `<div class="levels">${lv.map(l => `<button data-k="${esc(l.text)}" class="${l.text === text ? 'on' : ''}">${l.label}</button>`).join('')}</div><div id="sh"></div>`;
    const mount = () => { const s = shadowBlock($('#sh', el), text, { onResult: r => { ctx.shadow = r; D.addAttempt({ uttId: u.id, step: 'shadow', text: r.text, score: r.recall }); D.markStep(u.id, 'shadow'); paintSteps(); } }); cleanup.push(s.stop); };
    $$('.levels button', el).forEach(b => b.onclick = () => { text = b.dataset.k; ctx.shadowText = text; $$('.levels button', el).forEach(x => x.classList.toggle('on', x === b)); cleanup.forEach(f => f()); mount(); });
    mount();
  }
  function feedback(el) {
    const tries = D.attemptsOf(u.id);
    const sp = tries.filter(a => a.step === 'speak'), shd = tries.filter(a => a.step === 'shadow' && a.score != null);
    el.innerHTML = `${compareCard(ctx.first, levelsOf(u), { title: 'SPEAK 답변 비교' })}
      <div class="card stack" style="margin-top:12px"><span class="label">측정 항목</span>
        <div class="metric"><span>SPEAK 시도</span><b>${sp.length}회</b></div>
        <div class="metric"><span>최근 쉐도잉 단어 재현율</span><b>${ctx.shadow?.recall != null ? ctx.shadow.recall + '%' : (shd.slice(-1)[0]?.score != null ? shd.slice(-1)[0].score + '%' : '—')}</b></div>
        ${ctx.shadow?.ratio ? `<div class="metric"><span>말한 길이 (원어민 대비)</span><b>${ctx.shadow.ratio.toFixed(2)}배</b></div>` : ''}
        ${ctx.shadow?.pauses != null ? `<div class="metric"><span>끊김 (0.3초 이상)</span><b>${ctx.shadow.pauses}번</b></div>` : ''}
        ${shd.length > 1 ? `<div><div class="small muted" style="margin-bottom:6px">쉐도잉 재현율 기록</div><div class="wave" style="height:56px">${shd.slice(-16).map(a => `<i style="height:${Math.max(6, a.score)}%"></i>`).join('')}</div></div>` : ''}
        <div><div class="unsupported"><span>발음 정확도</span><span class="chip">분석 미지원</span></div><div class="unsupported"><span>억양 · 유창성 점수</span><span class="chip">분석 미지원</span></div></div>
      </div>`;
    D.markStep(u.id, 'feedback');
  }
  function retry(el) {
    el.innerHTML = `<div class="card pink"><span class="label">정답 숨김</span><div class="ko-big" style="margin-top:6px">${esc(u.ko)}</div></div><div id="m" style="margin-top:14px"></div><div id="rc"></div>`;
    micBlock($('#m', el), {
      onResult: t => show(t), onEdit: t => show(t, true)
    });
    function show(t, quiet) {
      ctx.retry = t; if (!t) return;
      const cands = levelsOf(u);
      const now = best(t, cands), before = ctx.first ? best(ctx.first, cands) : null;
      const delta = before ? now.d.score - before.d.score : null;
      $('#rc', el).innerHTML = `<div class="card stack"><span class="label">처음 vs 지금</span>
        ${before ? `<div class="small muted">처음</div><div class="en">“${esc(ctx.first)}” <b>${before.d.score}%</b></div>` : ''}
        <div class="small muted">지금 · ${esc(now.label)}과 비교</div>${diffHTML(now.d)}
        <div class="metric"><span>단어 일치도</span><b>${now.d.score}% ${delta != null ? `<span class="small" style="color:${delta >= 0 ? 'var(--ok)' : 'var(--miss)'}">${delta >= 0 ? '▲' : '▼'}${Math.abs(delta)}</span>` : ''}</b></div>
        <div class="meter"><i style="width:${now.d.score}%"></i></div>
        <div class="note">뜻이 같은 다른 표현이면 일치도가 낮아도 괜찮아요.</div></div>`;
      if (!quiet) { D.addAttempt({ uttId: u.id, step: 'retry', text: t, score: now.d.score }); D.markStep(u.id, 'retry'); paintSteps(); }
    }
  }
  function apply(el) {
    const mine = D.get().saved.filter(s => s.kind === 'mine' && s.uttId === u.id);
    el.innerHTML = `<div class="card pink stack"><span class="label">이 표현으로 내 이야기</span><div class="en-big" style="font-size:18px">${esc(u.en.natural || u.en.easy || '')}</div>
      ${u.pattern ? `<div class="pattern"><b>PATTERN</b><span class="en">${esc(u.pattern)}</span></div>` : '<div class="small muted">문장 구조를 빌려 내 상황으로 바꿔 말해보세요.</div>'}</div>
      <div id="m" style="margin-top:14px"></div>
      <label class="field"><span>한국어 메모 (선택)</span><input class="input" id="memo" placeholder="예: 요즘 나는 매일 연습하고 있어"></label>
      <button class="btn block" id="sv" disabled>${ic('heart')} 내 문장 저장</button>
      ${mine.length ? `<div class="sec-title label">저장한 내 문장</div><div class="stack">${mine.map(s => `<div class="sitem"><div class="en">${esc(s.text)}</div>${s.ko ? `<div class="small muted">${esc(s.ko)}</div>` : ''}</div>`).join('')}</div>` : ''}`;
    let rec = null;
    const m = micBlock($('#m', el), { record: true, placeholder: '배운 패턴으로 내 문장을 말해보세요', onResult: (t, r) => { rec = r; $('#sv', el).disabled = !t; }, onEdit: t => ($('#sv', el).disabled = !t) });
    $('#sv', el).onclick = async () => {
      const text = m.text; if (!text) return;
      let audioId = null;
      if (rec?.blob) { audioId = D.uid(); try { await D.AudioStore.put(audioId, rec.blob); } catch { audioId = null; } }
      D.saveExpr({ kind: 'mine', uttId: u.id, ko: $('#memo', el).value.trim(), text, en: { easy: '', natural: text, advanced: '' }, pattern: u.pattern, audioId });
      D.addAttempt({ uttId: u.id, step: 'apply', text }); D.markStep(u.id, 'apply');
      toast('내 문장을 SAVED에 저장했어요 ✦'); go('apply');
    };
  }

  go(step);
  return () => { cleanup.forEach(f => f()); pl.destroy(); S.stopSpeak(); };
}
