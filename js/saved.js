// SAVED — 나만의 표현 모음 + 반복 말하기 (Recall → Speak → Check → Apply → Review) + 복습 주기
import * as D from './store.js';
import * as S from './speech.js';
import { esc, $, $$, ic, toast, sheet, micBlock, compareCard, levelsOf, shadowBlock, confirmSheet, hintBlock, ytLink } from './ui.js';
import { markPattern } from './compare.js';
import { applyFlow } from './apply.js';

let filter = 'due';
const KIND = { utt: '영상 표현', talk: 'TALK 답변', mine: '내 문장' };
const LV = { easy: 'Easy', natural: 'Natural', advanced: 'Advanced' };
const ST = { new: ['새 표현', ''], again: ['연습 필요', 'warn'], okay: ['어느 정도', 'mid'], mastered: ['익숙해짐', 'ok'] };
const enOf = s => s.text || s.en?.[s.level] || s.en?.natural || s.en?.easy || s.en?.advanced || '';

export function saved(root) {
  const db = D.get(); const due = D.dueList(); const done = D.doneToday();
  const lists = {
    due, all: db.saved,
    again: db.saved.filter(s => s.status === 'again' || s.status === 'new'),
    known: db.saved.filter(s => s.status === 'okay' || s.status === 'mastered'),
    mine: db.saved.filter(s => s.kind === 'mine' || s.kind === 'talk')
  };
  const items = lists[filter] || lists.all;
  const days = [...Array(28)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 27 + i); return db.days[D.today(d)] || 0; });
  const streak = (() => { let s = 0; for (let i = 0; i < 400; i++) { const d = new Date(); d.setDate(d.getDate() - i); if (db.days[D.today(d)]) s++; else if (i > 0) break; } return s; })();
  const total = due.length + done.filter(s => !due.includes(s)).length;
  const pct = total ? Math.round((done.filter(s => !due.includes(s)).length / total) * 100) : 0;
  const mastered = db.saved.filter(s => s.status === 'mastered').length;
  root.innerHTML = `<div class="screen">
    <header class="top"><h1 class="page-title">Saved</h1>${streak ? `<span class="chip">${streak}일 연속</span>` : ''}</header>
    <section class="today">
      <div class="row between"><div><span class="label">TODAY</span><div class="today-n"><b>${due.length}</b><span>개 복습할 차례</span></div></div>
        <button class="btn" id="go" ${due.length ? '' : 'disabled'}>${ic('play')} 복습 시작</button></div>
      <div class="meter"><i style="width:${pct}%"></i></div>
      <div class="row between tiny muted"><span>오늘 ${total - due.length}/${total} 완료</span><span>익힌 표현 ${mastered}/${db.saved.length}</span></div>
      <div class="cal">${days.map(n => `<i class="${n >= 12 ? 'l3' : n >= 5 ? 'l2' : n ? 'l1' : ''}"></i>`).join('')}</div>
      <div class="tiny muted">최근 4주 · 총 ${db.attempts.length}번 말했어요</div>
    </section>
    <div class="tabs-scroll"><div class="seg">${[['due', `오늘 ${due.length}`], ['all', `전체 ${db.saved.length}`], ['again', `연습 필요 ${lists.again.length}`], ['known', `익숙해진 ${lists.known.length}`], ['mine', `내 문장 ${lists.mine.length}`]].map(([k, l]) => `<button data-f="${k}" class="${filter === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    ${items.length ? `${filter !== 'due' && items.length > 1 ? `<button class="link-sm practice-all" id="pa">${ic('play')} 이 목록 ${items.length}개 연습하기</button>` : ''}<div class="stack">${items.map(itemHTML).join('')}</div>`
      : `<div class="empty"><b>${filter === 'due' ? '지금 복습할 표현이 없어요' : '아직 여기에 표현이 없어요'}</b><p>${filter === 'due' ? '다음 복습 시간이 되면 여기에 나타나요.' : 'WATCH의 CHECK에서 원하는 레벨을 저장하거나, APPLY에서 내 문장을 만들어보세요.'}</p></div>`}
    ${filter === 'all' && db.talkLogs.length ? `<div class="sec-title label">최근 TALK 기록</div><div class="list">${db.talkLogs.slice(0, 5).map(l => `<div class="li"><div class="ic">${ic('talk')}</div><div class="grow"><b>${new Date(l.at).toLocaleDateString('ko-KR')} · ${Math.floor(l.sec / 60)}분 ${l.sec % 60}초</b><small>영어 답변 ${l.turns}번 · 클립 ${l.clips}개</small></div></div>`).join('')}</div>` : ''}
  </div>`;
  $$('[data-f]', root).forEach(b => b.onclick = () => { filter = b.dataset.f; saved(root); });
  $('#go', root).onclick = () => practice(root, due.map(s => s.id));
  $('#pa', root) && ($('#pa', root).onclick = () => practice(root, items.map(s => s.id)));
  root.onclick = async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const id = b.closest('[data-id]').dataset.id, s = D.get().saved.find(x => x.id === id); if (!s) return;
    const a = b.dataset.act;
    if (a === 'tts') S.speak(enOf(s));
    if (a === 'mine' && s.audioId) { const blob = await D.AudioStore.get(s.audioId); if (blob) S.playUrl(URL.createObjectURL(blob)); else toast('녹음이 없어요'); }
    if (a === 'one') practice(root, [id]);
    if (a === 'edit') editSheet(s, () => saved(root));
    if (a === 'del' && await confirmSheet('이 표현을 삭제할까요?', '삭제', '학습 기록도 함께 사라져요.')) { D.deleteSaved(id); saved(root); }
  };
}
function srcLink(s) {
  const u = s.uttId ? D.utt(s.uttId) : null;
  if (u) return { href: `#/study/${u.id}`, ext: false, label: `원본 ${D.fmt(u.start)}` };
  if (s.ytId) return { href: ytLink(s.ytId, s.start || 0), ext: true, label: `YouTube ${s.start != null ? D.fmt(s.start) : ''}` };
  return null;
}
function itemHTML(s) {
  const en = enOf(s);
  const dueTxt = s.srs.due <= Date.now() ? '지금 복습' : relTime(s.srs.due) + ' 복습';
  const link = srcLink(s); const [stL, stC] = ST[s.status] || ST.new;
  return `<article class="sitem" data-id="${s.id}">
    <div class="row tags-row"><span class="chip">${KIND[s.kind] || '표현'}${s.kind === 'utt' && LV[s.level] ? ` · ${LV[s.level]}` : ''}</span><span class="chip st ${stC}">${stL}</span><span class="due grow">${esc(dueTxt)}</span></div>
    ${s.ko ? `<div class="ko">${esc(s.ko)}</div>` : ''}<div class="en">${markPattern(en, s.pattern, esc)}</div>
    ${s.pattern ? `<div class="tiny muted pat-line">PATTERN <span class="en">${esc(s.pattern)}</span></div>` : ''}
    <div class="foot">
      <button class="btn xs" data-act="one">${ic('mic')} 연습</button>
      <button class="mini" data-act="tts" aria-label="듣기">${ic('speaker')}</button>
      ${s.audioId ? `<button class="mini" data-act="mine" aria-label="내 녹음">${ic('wave')}</button>` : ''}
      ${link ? `<a class="mini" href="${link.href}" ${link.ext ? 'target="_blank" rel="noopener"' : ''} aria-label="${esc(link.label)}">${ic(link.ext ? 'external' : 'video')}</a>` : ''}
      <span class="grow"></span>
      <button class="mini" data-act="edit" aria-label="수정">${ic('edit')}</button>
      <button class="mini" data-act="del" aria-label="삭제">${ic('trash')}</button></div></article>`;
}
function relTime(t) { const d = t - Date.now(); const h = d / 36e5; if (h < 1) return `${Math.max(1, Math.round(d / 6e4))}분 후`; if (h < 24) return `${Math.round(h)}시간 후`; return `${Math.round(h / 24)}일 후`; }

function editSheet(s, done) {
  const sh = sheet(`<h3>표현 수정</h3>
    <label class="field"><span>한국어 뜻</span><input class="input" id="e-ko" value="${esc(s.ko)}"></label>
    <label class="field"><span>영어 표현</span><textarea class="textarea en" id="e-en" rows="2">${esc(enOf(s))}</textarea></label>
    <label class="field"><span>핵심 패턴</span><input class="input en" id="e-pat" value="${esc(s.pattern)}" placeholder="예: I've been ~ing"></label>
    <label class="field"><span>메모</span><input class="input" id="e-note" value="${esc(s.note)}"></label>
    <div class="field"><span>학습 상태</span><div class="seg">${Object.entries({ again: '연습 필요', okay: '어느 정도', mastered: '익숙해짐' }).map(([k, l]) => `<button data-st="${k}" class="${s.status === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    <button class="btn block" id="e-sv">저장</button>`);
  let st = s.status;
  $$('[data-st]', sh).forEach(b => b.onclick = () => { st = b.dataset.st; $$('[data-st]', sh).forEach(x => x.classList.toggle('on', x === b)); });
  $('#e-sv', sh).onclick = () => {
    const text = $('#e-en', sh).value.trim(); if (!text) return toast('영어 표현을 입력해주세요');
    const patch = { ko: $('#e-ko', sh).value.trim(), text, pattern: $('#e-pat', sh).value.trim(), note: $('#e-note', sh).value.trim() };
    if (s.kind === 'utt' && s.level && LV[s.level]) patch.en = { ...s.en, [s.level]: text }; else patch.en = { easy: '', natural: text, advanced: '' };
    D.updateSaved(s.id, patch);
    if (st !== s.status) { s.status = st; s.hard = st === 'again'; if (st === 'again') s.srs.due = Date.now(); D.save(); }
    toast('수정했어요'); sh.close(); done();
  };
}

// ---------- 반복 말하기 세션 ----------
const PSTEPS = [['recall', 'Recall'], ['speak', 'Speak'], ['check', 'Check'], ['apply', 'Apply'], ['review', 'Review']];
function practice(root, ids) {
  let queue = [...ids], i = 0, stopFns = [], result = { again: [], okay: 0, mastered: 0 }, requeued = new Set();
  document.body.classList.add('no-tab');
  const end = () => { stopFns.forEach(f => f()); document.body.classList.remove('no-tab'); saved(root); };
  const next = () => { stopFns.forEach(f => f()); stopFns = []; i++; if (i >= queue.length) summary(); else card(); };

  function card() {
    const s = D.get().saved.find(x => x.id === queue[i]); if (!s) return next();
    const u = s.uttId ? D.utt(s.uttId) : null;
    const target = enOf(s);
    const cands = s.kind === 'utt' ? levelsOf({ en: s.en, alts: u?.alts || [] }) : [{ label: '내 문장', text: target }];
    if (!cands.some(c => c.text === target)) cands.unshift({ label: '저장한 표현', text: target });
    const link = srcLink(s);
    let answer = '', step = 'recall';
    root.innerHTML = `<div class="screen full practice">
      <header class="top"><button class="icon-btn" id="x" aria-label="닫기">${ic('x')}</button><h2 class="ttl-sm">${i + 1} / ${queue.length}${requeued.has(s.id) ? ' · 다시' : ''}</h2><span class="icon-sp"></span></header>
      <div class="meter"><i style="width:${(i / queue.length) * 100}%"></i></div>
      <nav class="pstep">${PSTEPS.map(([k, l]) => `<span data-ps="${k}">${l}</span>`).join('')}</nav>
      <div class="card tint recall-card"><span class="label">한국어 뜻</span><div class="ko-big">${esc(s.ko || '(한국어 뜻이 없어요 · 영어 문장을 떠올려보세요)')}</div>
        ${link ? `<a class="link-sm" href="${link.href}" ${link.ext ? 'target="_blank" rel="noopener"' : ''}>${ic(link.ext ? 'external' : 'video')} ${esc(link.label)}</a>` : ''}</div>
      <div id="pb"></div></div>`;
    $('#x', root).onclick = end;
    const pb = $('#pb', root);
    const mark = () => { const k = PSTEPS.findIndex(p => p[0] === step); $$('[data-ps]', root).forEach((e, j) => { e.classList.toggle('on', j === k); e.classList.toggle('done', j < k); }); };
    const go = s2 => { stopFns.forEach(f => f()); stopFns = []; S.stopSpeak(); step = s2; mark(); ({ recall, speak, check, apply, review })[s2](); window.scrollTo({ top: 0 }); };
    pb.onclick = e => { const t = e.target.closest('[data-tts]'); if (t) S.speak(t.dataset.tts); };

    function recall() {
      pb.innerHTML = `<p class="step-desc">영어 표현을 머릿속으로 먼저 떠올려봐요</p><div id="hint"></div>
        <div class="row ap-nav"><button class="btn grow" id="n">${ic('mic')} 떠올렸어요 · 말하기</button></div>`;
      hintBlock($('#hint', pb), { text: target, pattern: s.pattern });
      $('#n', pb).onclick = () => go('speak');
    }
    function speak() {
      pb.innerHTML = `<p class="step-desc">마이크로 직접 말해봐요 · 다시 누르면 다시 말하기</p><div id="m"></div>
        <div class="row ap-nav"><button class="btn soft" id="p" aria-label="이전">${ic('back')}</button><button class="btn grow" id="n">확인하기</button></div>`;
      const m = micBlock($('#m', pb), { targets: () => cands.map(c => c.text), onResult: t => (answer = t), onEdit: t => (answer = t) });
      if (answer) m.text = answer;
      stopFns.push(() => m.stop());
      $('#p', pb).onclick = () => go('recall');
      $('#n', pb).onclick = () => { answer = m.text; if (answer) D.addAttempt({ uttId: s.uttId, step: 'review', text: answer }); go('check'); };
    }
    function check() {
      pb.innerHTML = `<p class="step-desc">내가 말한 영어와 저장한 표현 비교</p>
        ${answer ? compareCard(answer, cands) : `<div class="note">말한 내용이 없어요. 저장한 표현을 듣고 따라 해봐요.</div>`}
        <div class="levels">${cands.filter(c => c.text).map(c => `<div class="lv ${c.text === target ? 'on' : ''}"><div class="lv-head"><span class="lv-tag">${esc(c.label)}</span><span class="lv-act"><button class="mini" data-tts="${esc(c.text)}" aria-label="듣기">${ic('speaker')}</button></span></div><div class="lv-text en">${markPattern(c.text, s.pattern, esc)}</div></div>`).join('')}</div>
        <details class="adv"><summary>따라 말하기 (쉐도잉)</summary><div id="sh"></div></details>
        <div class="row ap-nav"><button class="btn soft" id="p">${ic('mic')} 다시 말하기</button><button class="btn grow" id="n">${s.pattern ? 'Apply →' : 'Review →'}</button></div>`;
      $('details', pb).addEventListener('toggle', e => { if (e.target.open && !$('#sh .karaoke', pb)) { const sh = shadowBlock($('#sh', pb), target); stopFns.push(sh.stop); } });
      $('#p', pb).onclick = () => go('speak');
      $('#n', pb).onclick = () => go(s.pattern ? 'apply' : 'review');
    }
    function apply() {
      pb.innerHTML = `<p class="step-desc">이 패턴으로 내 경험을 말해봐요 <button class="link-sm" id="skip">건너뛰기 →</button></p><div id="ap"></div>
        <div class="row ap-nav"><button class="btn line grow" id="n">Review →</button></div>`;
      const f = applyFlow($('#ap', pb), { ...s, text: target, ytId: s.ytId, uttId: s.uttId }, { start: 'make' });
      stopFns.push(f.stop);
      $('#skip', pb).onclick = () => go('review');
      $('#n', pb).onclick = () => go('review');
    }
    function review() {
      pb.innerHTML = `<p class="step-desc">이 표현, 지금 얼마나 익숙해요?</p>
        <div class="grades">${Object.entries(D.STATUS).map(([k, l]) => `<button data-q="${k}" class="${k}"><b>${l}</b><small>${nextLabel(s, k)}</small></button>`).join('')}</div>
        <p class="tiny muted">어려운 표현은 짧은 간격으로, 익숙한 표현은 점점 긴 간격으로 다시 나와요.</p>`;
      $$('[data-q]', pb).forEach(b => b.onclick = () => {
        const q = b.dataset.q; D.rate(s.id, q);
        if (q === 'again') { if (!result.again.includes(s.id)) result.again.push(s.id); if (!requeued.has(s.id)) { requeued.add(s.id); queue.push(s.id); } }
        else result[q]++;
        next();
      });
    }
    go('recall');
  }
  function summary() {
    stopFns.forEach(f => f());
    const againList = result.again.filter(id => D.get().saved.find(x => x.id === id));
    root.innerHTML = `<div class="screen full">
      <header class="top"><span class="icon-sp"></span><h2>복습 완료</h2><button class="icon-btn" id="x" aria-label="닫기">${ic('x')}</button></header>
      <div class="sum">
        <div><b>${result.mastered}</b><span>완전히 익힘</span></div><div><b>${result.okay}</b><span>어느 정도</span></div><div><b>${againList.length}</b><span>다시 연습</span></div>
      </div>
      ${againList.length ? `<p class="small muted center-t">어려웠던 표현은 10분 뒤 다시 복습 목록에 나타나요.</p><button class="btn block" id="again">${ic('refresh')} 어려웠던 표현 지금 다시 연습</button>` : `<p class="small muted center-t">잘했어요. 다음 복습 때 다시 만나요.</p>`}
      <button class="btn soft block" id="done" style="margin-top:8px">SAVED로 돌아가기</button></div>`;
    toast('복습 완료');
    $('#x', root).onclick = end; $('#done', root).onclick = end;
    $('#again', root) && ($('#again', root).onclick = () => practice(root, againList));
  }
  card();
}
function nextLabel(s, k) {
  if (k === 'again') return '10분 후';
  const iv = D.nextInterval(s, k);
  return iv === 1 ? '내일' : `${iv}일 후`;
}
