// SAVED — 저장한 문장을 플래시카드로 복습 + 패턴으로 새 문장 말하기 + 복습 주기
import * as D from './store.js';
import { esc, $, $$, ic, toast, sheet, micBlock, confirmSheet, ytLink, flashcard, compareRows, natOf } from './ui.js';
import { markPattern } from './compare.js';
import { patternSpeak } from './apply.js';

let filter = 'due';
const KIND = { utt: '영상', talk: 'SPEAK', mine: '내 문장' };
const ST = { new: ['새 문장', ''], again: ['연습 필요', 'warn'], okay: ['어느 정도', 'mid'], mastered: ['익숙해짐', 'ok'] };
// 영상 문장은 Natural 하나만 보여줌 (예전에 Easy/Advanced로 저장했어도 Natural로 표시)
const enOf = s => s.kind === 'utt' ? (natOf(s) || s.text) : (s.text || natOf(s));

export function saved(root) {
  const db = D.get(); const due = D.dueList(); const done = D.doneToday();
  const lists = {
    due, all: db.saved,
    again: db.saved.filter(s => s.status === 'again' || s.status === 'new'),
    known: db.saved.filter(s => s.status === 'okay' || s.status === 'mastered'),
    mine: db.saved.filter(s => s.kind === 'mine' || s.kind === 'talk')
  };
  const items = lists[filter] || lists.all;
  const doneN = done.filter(s => !due.includes(s)).length, total = due.length + doneN;
  root.innerHTML = `<div class="screen">
    <header class="top"><h1 class="page-title">Saved</h1></header>
    <section class="today">
      <div class="row between"><div class="today-n"><b>${due.length}</b><span>개 복습할 차례</span></div>
        <button class="btn" id="go" ${due.length ? '' : 'disabled'}>${ic('play')} 복습 시작</button></div>
      <div class="meter"><i style="width:${total ? Math.round(doneN / total * 100) : 0}%"></i></div>
      <div class="tiny muted">오늘 ${doneN}/${total} 완료 · 익힌 문장 ${db.saved.filter(s => s.status === 'mastered').length}/${db.saved.length}</div>
    </section>
    <div class="tabs-scroll"><div class="seg">${[['due', `오늘 ${due.length}`], ['all', `전체 ${db.saved.length}`], ['again', `연습 필요 ${lists.again.length}`], ['known', `익숙해진 ${lists.known.length}`], ['mine', `내 문장 ${lists.mine.length}`]].map(([k, l]) => `<button data-f="${k}" class="${filter === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    ${items.length ? `${filter !== 'due' && items.length > 1 ? `<button class="link-sm practice-all" id="pa">${ic('play')} 이 목록 ${items.length}개 복습하기</button>` : ''}<div class="stack">${items.map(itemHTML).join('')}</div>`
      : `<div class="empty"><b>${filter === 'due' ? '지금 복습할 문장이 없어요' : '아직 여기에 문장이 없어요'}</b><p>${filter === 'due' ? '다음 복습 시간이 되면 여기에 나타나요.' : 'WATCH에서 북마크로 저장하거나 패턴으로 내 문장을 만들어보세요.'}</p></div>`}
  </div>`;
  $$('[data-f]', root).forEach(b => b.onclick = () => { filter = b.dataset.f; saved(root); });
  $('#go', root).onclick = () => practice(root, due.map(s => s.id));
  $('#pa', root) && ($('#pa', root).onclick = () => practice(root, items.map(s => s.id)));
  root.onclick = async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const id = b.closest('[data-id]').dataset.id, s = D.get().saved.find(x => x.id === id); if (!s) return;
    const a = b.dataset.act;
    if (a === 'one') practice(root, [id]);
    if (a === 'edit') editSheet(s, () => saved(root));
    if (a === 'del' && await confirmSheet('이 문장을 삭제할까요?', '삭제', '학습 기록도 함께 사라져요.')) { D.deleteSaved(id); saved(root); }
  };
}
function srcLink(s) {
  const u = s.uttId ? D.utt(s.uttId) : null;
  if (u) return { href: `#/study/${u.id}`, ext: false, label: `원본 영상 ${D.fmt(u.start)}` };
  if (s.ytId) return { href: ytLink(s.ytId, s.start || 0), ext: true, label: `YouTube ${s.start != null ? D.fmt(s.start) : ''}` };
  return null;
}
function itemHTML(s) {
  const link = srcLink(s); const [stL, stC] = ST[s.status] || ST.new;
  const dueTxt = s.srs.due <= Date.now() ? '지금' : relTime(s.srs.due);
  return `<article class="sitem" data-id="${s.id}">
    <div class="row tags-row"><span class="chip">${KIND[s.kind] || '문장'}</span><span class="chip st ${stC}">${stL}</span><span class="due grow">복습 ${esc(dueTxt)}</span></div>
    ${s.ko ? `<div class="ko">${esc(s.ko)}</div>` : ''}<div class="en">${markPattern(enOf(s), s.pattern, esc)}</div>
    <div class="foot">
      <button class="btn xs" data-act="one">${ic('mic')} 복습</button>
      ${link ? `<a class="mini" href="${link.href}" ${link.ext ? 'target="_blank" rel="noopener"' : ''} aria-label="${esc(link.label)}">${ic(link.ext ? 'external' : 'video')}</a>` : ''}
      <span class="grow"></span>
      <button class="mini" data-act="edit" aria-label="수정">${ic('edit')}</button>
      <button class="mini" data-act="del" aria-label="삭제">${ic('trash')}</button></div></article>`;
}
function relTime(t) { const d = t - Date.now(); const h = d / 36e5; if (h < 1) return `${Math.max(1, Math.round(d / 6e4))}분 후`; if (h < 24) return `${Math.round(h)}시간 후`; return `${Math.round(h / 24)}일 후`; }

function editSheet(s, done) {
  const sh = sheet(`<h3>문장 수정</h3>
    <label class="field"><span>한국어</span><input class="input" id="e-ko" value="${esc(s.ko)}"></label>
    <label class="field"><span>영어 문장</span><textarea class="textarea en" id="e-en" rows="2">${esc(enOf(s))}</textarea></label>
    <label class="field"><span>패턴</span><input class="input en" id="e-pat" value="${esc(s.pattern)}" placeholder="예: I've been ~ing"></label>
    <div class="field"><span>학습 상태</span><div class="seg">${Object.entries({ again: '연습 필요', okay: '어느 정도', mastered: '익숙해짐' }).map(([k, l]) => `<button data-st="${k}" class="${s.status === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    <button class="btn block" id="e-sv">저장</button>`);
  let st = s.status;
  $$('[data-st]', sh).forEach(b => b.onclick = () => { st = b.dataset.st; $$('[data-st]', sh).forEach(x => x.classList.toggle('on', x === b)); });
  $('#e-sv', sh).onclick = () => {
    const text = $('#e-en', sh).value.trim(); if (!text) return toast('영어 문장을 입력해주세요');
    const patch = { ko: $('#e-ko', sh).value.trim(), text, pattern: $('#e-pat', sh).value.trim() };
    patch.en = s.kind === 'utt' ? { ...s.en, natural: text } : { easy: '', natural: text, advanced: '' };
    if (s.kind === 'utt') patch.level = 'natural';
    D.updateSaved(s.id, patch);
    if (st !== s.status) { s.status = st; s.hard = st === 'again'; if (st === 'again') s.srs.due = Date.now(); D.save(); }
    toast('수정했어요'); sh.close(); done();
  };
}

// ---------- 플래시카드 복습: 말하기 → 확인 → 패턴으로 새 문장 → 익숙함 선택 ----------
function practice(root, ids) {
  let queue = [...ids], i = 0, stops = [], result = { again: [], okay: 0, mastered: 0 }, requeued = new Set();
  document.body.classList.add('no-tab');
  const end = () => { stops.forEach(f => f()); document.body.classList.remove('no-tab'); saved(root); };
  const next = () => { stops.forEach(f => f()); stops = []; i++; if (i >= queue.length) summary(); else card(); };

  function card() {
    const s = D.get().saved.find(x => x.id === queue[i]); if (!s) return next();
    const en = enOf(s); let mine = '', step = 'say';
    const hasPat = !!s.pattern;
    const steps = [['say', '말하기'], ['check', '확인'], ...(hasPat ? [['apply', '패턴으로 말하기']] : [])];
    root.innerHTML = `<div class="screen full practice">
      <header class="top"><button class="icon-btn" id="x" aria-label="닫기">${ic('x')}</button><h2 class="ttl-sm">${i + 1} / ${queue.length}${requeued.has(s.id) ? ' · 다시' : ''}</h2><span class="icon-sp"></span></header>
      <div class="meter"><i style="width:${(i / queue.length) * 100}%"></i></div>
      <nav class="flow">${steps.map(([k, l]) => `<button data-s="${k}" aria-label="${l}"><i></i></button>`).join('')}<span class="flow-l"></span></nav>
      <div id="card"></div><div id="zone"></div>
      <div id="act"></div></div>`;
    $('#x', root).onclick = end;
    const link = srcLink(s);
    const go = st => {
      stops.forEach(f => f()); stops = []; step = st;
      const k = steps.findIndex(x => x[0] === st);
      $$('.flow [data-s]', root).forEach((b, j) => { b.classList.toggle('on', j === k); b.classList.toggle('done', j < k); });
      $('.flow-l', root).textContent = `${k + 1}. ${steps[k][1]}`;
      const cardEl = $('#card', root), zone = $('#zone', root), act = $('#act', root);
      cardEl.classList.remove('hide'); zone.innerHTML = ''; act.innerHTML = '';
      if (st === 'say') {
        flashcard(cardEl, { ko: s.ko || '(한국어 없음 · 영어 문장을 떠올려보세요)', en, pattern: s.pattern });
        const m = micBlock(zone, { targets: () => [en], onResult: t => (mine = t), onEdit: t => (mine = t) });
        if (mine) m.text = mine; stops.push(() => m.stop());
        act.innerHTML = `<button class="btn block next-btn" id="n">추천 문장 확인 →</button>`;
        $('#n', act).onclick = () => { if (mine) D.addAttempt({ uttId: s.uttId, step: 'review', text: mine }); go('check'); };
      }
      if (st === 'check') {
        cardEl.innerHTML = ''; cardEl.classList.add('hide');
        zone.innerHTML = compareRows({ ko: s.ko, mine, rec: en, pattern: s.pattern }) + (link ? `<a class="link-sm src-link" href="${link.href}" ${link.ext ? 'target="_blank" rel="noopener"' : ''}>${ic(link.ext ? 'external' : 'video')} ${esc(link.label)}</a>` : '');
        act.innerHTML = hasPat ? `<button class="btn block next-btn" id="n">패턴으로 말하기 →</button><div class="row ap-nav"><button class="link-sm skip" id="sk">건너뛰기</button></div>` : grades(s);
        if (hasPat) { $('#n', act).onclick = () => go('apply'); $('#sk', act).onclick = () => { act.innerHTML = grades(s); bindGrades(s); }; }
        else bindGrades(s);
      }
      if (st === 'apply') {
        cardEl.innerHTML = ''; cardEl.classList.add('hide');
        const p = patternSpeak(zone, { ...s, text: en }); stops.push(p.stop);
        act.innerHTML = grades(s); bindGrades(s);
      }
      window.scrollTo({ top: 0 });
    };
    $$('.flow [data-s]', root).forEach(b => b.onclick = () => go(b.dataset.s));
    go('say');
  }
  const grades = s => `<p class="grade-q">이 문장, 얼마나 익숙해요?</p><div class="grades">${Object.entries(D.STATUS).map(([k, l]) => `<button data-q="${k}" class="${k}"><b>${l}</b><small>${nextLabel(s, k)}</small></button>`).join('')}</div>`;
  function bindGrades(s) {
    $$('[data-q]', root).forEach(b => b.onclick = () => {
      const q = b.dataset.q; D.rate(s.id, q);
      if (q === 'again') { if (!result.again.includes(s.id)) result.again.push(s.id); if (!requeued.has(s.id)) { requeued.add(s.id); queue.push(s.id); } }
      else result[q]++;
      next();
    });
  }
  function summary() {
    stops.forEach(f => f());
    const againList = result.again.filter(id => D.get().saved.find(x => x.id === id));
    root.innerHTML = `<div class="screen full">
      <header class="top"><span class="icon-sp"></span><h2>복습 완료</h2><button class="icon-btn" id="x" aria-label="닫기">${ic('x')}</button></header>
      <div class="sum"><div><b>${result.mastered}</b><span>완전히 익힘</span></div><div><b>${result.okay}</b><span>어느 정도</span></div><div><b>${againList.length}</b><span>다시 연습</span></div></div>
      ${againList.length ? `<button class="btn block" id="again">${ic('refresh')} 어려웠던 문장 다시 복습</button>` : ''}
      <button class="btn soft block mt8" id="done">SAVED로 돌아가기</button></div>`;
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
