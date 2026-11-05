// SAVED — 추천 문장 · 표현/단어 저장 → 복습
// · 문장 복습: 한국어 보고 말하기 → Before/After → 패턴으로 새 문장 → 익숙함
// · 표현 복습: 표현 보기 → 새 문장 만들어 말하기 → 피드백(Before/After) → 추천 문장 저장 → 익숙함
import * as D from './store.js';
import { esc, $, $$, ic, toast, sheet, micBlock, confirmSheet, ytLink, flashcard, natOf, beforeAfter, phrasePicker } from './ui.js';
import { markPattern, splitPatterns } from './compare.js';
import { patternSpeak } from './apply.js';

let filter = 'due';
const KIND = { utt: '영상', talk: 'TALK', mine: '내 문장' };
const ST = { new: ['새로 저장', ''], again: ['연습 필요', 'warn'], okay: ['어느 정도', 'mid'], mastered: ['익숙해짐', 'ok'] };
const enOf = s => s.kind === 'utt' ? (natOf(s) || s.text) : (s.text || natOf(s));
const enHTML = s => markPattern(enOf(s), s.pattern, esc, s.marks || []);

export function saved(root) {
  const db = D.get(); const due = D.dueList(); const dueW = D.dueWords(); const done = D.doneToday();
  const lists = {
    due, all: db.saved, words: db.words,
    again: db.saved.filter(s => s.status === 'again' || s.status === 'new'),
    known: db.saved.filter(s => s.status === 'okay' || s.status === 'mastered'),
    mine: db.saved.filter(s => s.kind === 'mine' || s.kind === 'talk')
  };
  const doneN = done.filter(s => !due.includes(s)).length, total = due.length + doneN;
  const isW = filter === 'words';
  const items = isW ? lists.words : (lists[filter] || lists.all);
  root.innerHTML = `<div class="screen saved-scr">
    <header class="top"><h1 class="page-title">Saved</h1></header>
    <section class="today">
      <div class="today-main"><div class="today-n"><b>${due.length}</b><span>문장</span>${dueW.length ? `<b>${dueW.length}</b><span>표현</span>` : ''}<em>오늘 복습할 차례</em></div>
        <button class="btn pill" id="go" ${due.length || dueW.length ? '' : 'disabled'}>${ic('play')} 복습 시작</button></div>
      <div class="meter"><i style="width:${total ? Math.round(doneN / total * 100) : 0}%"></i></div>
      <div class="today-sub"><span>오늘 ${doneN}/${total} 완료</span><span>익힌 문장 ${db.saved.filter(s => s.status === 'mastered').length}/${db.saved.length}</span><span>표현 ${db.words.length}</span></div>
    </section>
    <div class="tabs-scroll"><div class="seg">${[['due', `오늘 ${due.length}`], ['all', `문장 ${db.saved.length}`], ['words', `표현·단어 ${db.words.length}`], ['again', `연습 필요 ${lists.again.length}`], ['known', `익숙해진 ${lists.known.length}`], ['mine', `내 문장 ${lists.mine.length}`]].map(([k, l]) => `<button data-f="${k}" class="${filter === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    ${isW ? `<div class="w-tools"><button class="btn sm soft" id="addw">${ic('plus')} 단어·표현 추가</button>${items.length > 1 ? `<button class="btn sm" id="pw">${ic('play')} 표현 ${items.length}개 복습</button>` : ''}</div>` : ''}
    ${items.length ? `${!isW && filter !== 'due' && items.length > 1 ? `<button class="link-sm practice-all" id="pa">${ic('play')} 이 목록 ${items.length}개 복습하기</button>` : ''}<div class="slist">${items.map(isW ? wordHTML : itemHTML).join('')}</div>`
      : `<div class="empty"><span class="empty-ic">${ic(isW ? 'marker' : 'bookmark')}</span><b>${filter === 'due' ? '지금 복습할 게 없어요' : isW ? '아직 저장한 표현이 없어요' : '아직 문장이 없어요'}</b><p>${filter === 'due' ? '다음 복습 시간이 되면 여기에 나타나요' : isW ? '추천 문장에서 외우고 싶은 단어를 눌러 저장해요' : 'WATCH·TALK에서 추천 문장을 저장해요'}</p></div>`}
  </div>`;
  $$('[data-f]', root).forEach(b => b.onclick = () => { filter = b.dataset.f; saved(root); });
  $('#go', root).onclick = () => due.length ? practice(root, due.map(s => s.id), dueW.map(w => w.id)) : exprPractice(root, dueW.map(w => w.id));
  $('#pa', root) && ($('#pa', root).onclick = () => practice(root, items.map(s => s.id)));
  $('#pw', root) && ($('#pw', root).onclick = () => exprPractice(root, items.map(w => w.id)));
  $('#addw', root) && ($('#addw', root).onclick = () => wordSheet(null, () => saved(root)));
  root.onclick = async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const card = b.closest('[data-id]'); const id = card.dataset.id;
    const a = b.dataset.act;
    if (card.dataset.w) {
      const w = D.get().words.find(x => x.id === id); if (!w) return;
      if (a === 'make') exprPractice(root, [id]);
      if (a === 'edit') wordSheet(w, () => saved(root));
      if (a === 'del' && await confirmSheet(`‘${w.text}’을 삭제할까요?`, '삭제')) { D.deleteWord(id); const s = w.srcId && D.get().saved.find(x => x.id === w.srcId); s && D.toggleMark(s.id, w.text, false); saved(root); }
      return;
    }
    const s = D.get().saved.find(x => x.id === id); if (!s) return;
    if (a === 'one') practice(root, [id]);
    if (a === 'mark') markSheet(s, () => saved(root));
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
const dueText = srs => srs.due <= Date.now() ? '지금' : relTime(srs.due);
function itemHTML(s) {
  const link = srcLink(s); const [stL, stC] = ST[s.status] || ST.new;
  return `<article class="sitem" data-id="${s.id}">
    <div class="tags-row"><span class="chip">${KIND[s.kind] || '문장'}</span><span class="chip st ${stC}">${stL}</span><span class="due grow">복습 ${esc(dueText(s.srs))}</span></div>
    <div class="en s-en">${enHTML(s)}</div>
    ${s.ko ? `<div class="ko s-ko">${esc(s.ko)}</div>` : ''}
    ${splitPatterns(s.pattern).length ? `<div class="pat-chips">${splitPatterns(s.pattern).map(p => `<span class="pchip en">${esc(p)}</span>`).join('')}</div>` : ''}
    <div class="foot">
      <button class="btn xs" data-act="one">${ic('mic')} 복습</button>
      <button class="btn xs soft" data-act="mark">${ic('marker')} 표현 고르기</button>
      <span class="grow"></span>
      ${link ? `<a class="mini" href="${link.href}" ${link.ext ? 'target="_blank" rel="noopener"' : ''} aria-label="${esc(link.label)}">${ic(link.ext ? 'external' : 'video')}</a>` : ''}
      <button class="mini" data-act="edit" aria-label="수정">${ic('edit')}</button>
      <button class="mini" data-act="del" aria-label="삭제">${ic('trash')}</button></div></article>`;
}
function wordHTML(w) {
  const [stL, stC] = ST[w.status] || ST.new; const src = w.srcId && D.get().saved.find(s => s.id === w.srcId);
  return `<article class="witem" data-id="${w.id}" data-w="1">
    <div class="w-top"><span class="w-kind">${w.kind === 'word' ? '단어' : '표현'}</span><span class="chip st ${stC}">${stL}</span><span class="due grow">복습 ${esc(dueText(w.srs))}</span></div>
    <b class="w-text en">${esc(w.text)}</b>
    ${w.ko ? `<p class="w-ko">${esc(w.ko)}</p>` : `<button class="w-addko" data-act="edit">+ 뜻 적기</button>`}
    ${src ? `<p class="w-src en">${markPattern(enOf(src), '', esc, [w.text])}</p>` : ''}
    ${w.made?.length ? `<p class="w-made">내가 만든 문장 ${w.made.length}개</p>` : ''}
    <div class="foot"><button class="btn xs" data-act="make">${ic('mic')} 새 문장 만들기</button><span class="grow"></span>
      <button class="mini" data-act="edit" aria-label="수정">${ic('edit')}</button><button class="mini" data-act="del" aria-label="삭제">${ic('trash')}</button></div></article>`;
}
function relTime(t) { const d = t - Date.now(); const h = d / 36e5; if (h < 1) return `${Math.max(1, Math.round(d / 6e4))}분 후`; if (h < 24) return `${Math.round(h)}시간 후`; return `${Math.round(h / 24)}일 후`; }

// 문장에서 외우고 싶은 표현 고르기
function markSheet(s, done) {
  const sh = sheet(`<h3>외우고 싶은 표현 고르기</h3><p class="sheet-p">단어를 누르고, 끝나는 단어를 한 번 더 누르면 이어서 선택돼요.</p><div id="mk"></div>
    ${s.ko ? `<p class="mk-ko">${esc(s.ko)}</p>` : ''}<button class="btn block mt12" id="mkd">완료</button>`, { onClose: done });
  phrasePicker($('#mk', sh), enOf(s), {
    marks: s.marks || [],
    onSave: (p, { asWord }) => { D.toggleMark(s.id, p, true); D.saveWord({ text: p, srcId: s.id, kind: asWord ? 'word' : 'expr' }); toast(`‘${p}’ 저장했어요 · 표현·단어 탭`); },
    onUnmark: p => D.toggleMark(s.id, p, false)
  });
  $('#mkd', sh).onclick = () => sh.close();
}
function wordSheet(w, done) {
  const sh = sheet(`<h3>${w ? '표현 수정' : '단어·표현 추가'}</h3>
    <label class="field"><span>영어 단어·표현</span><input class="input en" id="w-t" value="${esc(w?.text || '')}" placeholder="can't wait to" autocapitalize="off"></label>
    <label class="field"><span>뜻 (한국어)</span><input class="input" id="w-k" value="${esc(w?.ko || '')}" placeholder="빨리 ~하고 싶어"></label>
    <label class="field"><span>메모</span><input class="input" id="w-n" value="${esc(w?.note || '')}" placeholder="언제 쓰는지, 비슷한 표현"></label>
    <div class="field"><span>종류</span><div class="seg"><button data-k="expr" class="${(w?.kind || 'expr') === 'expr' ? 'on' : ''}">표현</button><button data-k="word" class="${w?.kind === 'word' ? 'on' : ''}">단어</button></div></div>
    <button class="btn block" id="w-s">저장</button>`);
  let kind = w?.kind || 'expr';
  $$('[data-k]', sh).forEach(b => b.onclick = () => { kind = b.dataset.k; $$('[data-k]', sh).forEach(x => x.classList.toggle('on', x === b)); });
  $('#w-s', sh).onclick = () => {
    const text = $('#w-t', sh).value.trim(); if (!text) return toast('영어를 입력해주세요');
    const patch = { text, ko: $('#w-k', sh).value.trim(), note: $('#w-n', sh).value.trim(), kind };
    if (w) D.updateWord(w.id, patch); else { const r = D.saveWord(patch); if (r.dup) toast('이미 있는 표현이에요'); }
    sh.close(); done();
  };
}
function editSheet(s, done) {
  const sh = sheet(`<h3>문장 수정</h3>
    <label class="field"><span>영어 문장</span><textarea class="textarea en" id="e-en" rows="2">${esc(enOf(s))}</textarea></label>
    <label class="field"><span>한국어</span><textarea class="textarea" id="e-ko" rows="2">${esc(s.ko)}</textarea></label>
    <label class="field"><span>패턴 · 쉼표(,)로 여러 개</span><input class="input en" id="e-pat" value="${esc(s.pattern)}" placeholder="I've been ~ing, can't wait to ~"></label>
    <div class="field"><span>학습 상태</span><div class="seg">${Object.entries({ again: '연습 필요', okay: '어느 정도', mastered: '익숙해짐' }).map(([k, l]) => `<button data-st="${k}" class="${s.status === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    <button class="btn block" id="e-sv">저장</button>`);
  let st = s.status;
  $$('[data-st]', sh).forEach(b => b.onclick = () => { st = b.dataset.st; $$('[data-st]', sh).forEach(x => x.classList.toggle('on', x === b)); });
  $('#e-sv', sh).onclick = () => {
    const text = $('#e-en', sh).value.trim(); if (!text) return toast('영어 문장을 입력해주세요');
    const patch = { ko: $('#e-ko', sh).value.trim(), text, pattern: splitPatterns($('#e-pat', sh).value).join(', ') };
    patch.en = s.kind === 'utt' ? { ...s.en, natural: text } : { easy: '', natural: text, advanced: '' };
    if (s.kind === 'utt') patch.level = 'natural';
    D.updateSaved(s.id, patch);
    if (st !== s.status) { s.status = st; s.hard = st === 'again'; if (st === 'again') s.srs.due = Date.now(); D.save(); }
    toast('수정했어요'); sh.close(); done();
  };
}

// ---------- 문장 복습: 말하기 → 확인 → 패턴으로 새 문장 → 익숙함 ----------
function practice(root, ids, thenWords = []) {
  let queue = [...ids], i = 0, stops = [], result = { again: [], okay: 0, mastered: 0 }, requeued = new Set();
  document.body.classList.add('no-tab');
  const end = () => { stops.forEach(f => f()); document.body.classList.remove('no-tab'); saved(root); };
  const next = () => { stops.forEach(f => f()); stops = []; i++; if (i >= queue.length) summary(); else card(); };

  function card() {
    const s = D.get().saved.find(x => x.id === queue[i]); if (!s) return next();
    const en = enOf(s); let mine = '';
    const hasPat = !!splitPatterns(s.pattern).length;
    const steps = [['say', '한국어 보고 말하기'], ['check', 'Before → After'], ...(hasPat ? [['apply', '패턴으로 새 문장']] : [])];
    root.innerHTML = `<div class="screen full practice">
      <header class="top"><button class="icon-btn" id="x" aria-label="닫기">${ic('x')}</button><h2 class="ttl-sm">${i + 1} / ${queue.length}${requeued.has(s.id) ? ' · 다시' : ''}</h2><span class="icon-sp"></span></header>
      <div class="meter"><i style="width:${(i / queue.length) * 100}%"></i></div>
      <nav class="flow">${steps.map(([k, l]) => `<button data-s="${k}" aria-label="${l}"><i></i></button>`).join('')}<span class="flow-l"></span></nav>
      <div id="card"></div><div id="zone"></div>
      <div id="act"></div></div>`;
    $('#x', root).onclick = end;
    const link = srcLink(s);
    const go = st => {
      stops.forEach(f => f()); stops = [];
      const k = steps.findIndex(x => x[0] === st);
      $$('.flow [data-s]', root).forEach((b, j) => { b.classList.toggle('on', j === k); b.classList.toggle('done', j < k); });
      $('.flow-l', root).textContent = `${k + 1}. ${steps[k][1]}`;
      const cardEl = $('#card', root), zone = $('#zone', root), act = $('#act', root);
      cardEl.classList.remove('hide'); zone.innerHTML = ''; act.innerHTML = '';
      if (st === 'say') {
        flashcard(cardEl, { ko: s.ko || '(한국어 없음 · 영어 문장을 떠올려보세요)', en, pattern: s.pattern });
        const m = micBlock(zone, { targets: () => [en], onResult: t => (mine = t), onEdit: t => (mine = t) });
        if (mine) m.text = mine; stops.push(() => m.stop());
        act.innerHTML = `<button class="btn block next-btn" id="n">Before → After 보기</button>`;
        $('#n', act).onclick = () => { if (mine) D.addAttempt({ uttId: s.uttId, step: 'review', text: mine }); go('check'); };
      }
      if (st === 'check') {
        cardEl.innerHTML = ''; cardEl.classList.add('hide');
        zone.innerHTML = beforeAfter({ ko: s.ko, before: mine, after: en, pattern: s.pattern, marks: s.marks }) + (link ? `<a class="link-sm src-link" href="${link.href}" ${link.ext ? 'target="_blank" rel="noopener"' : ''}>${ic(link.ext ? 'external' : 'video')} ${esc(link.label)}</a>` : '');
        act.innerHTML = hasPat ? `<button class="btn block next-btn" id="n">패턴으로 새 문장 말하기 →</button><div class="row ap-nav"><button class="link-sm skip" id="sk">건너뛰기</button></div>` : grades(s);
        if (hasPat) { $('#n', act).onclick = () => go('apply'); $('#sk', act).onclick = () => { act.innerHTML = grades(s); bindGrades(s, D.rate); }; }
        else bindGrades(s, D.rate);
      }
      if (st === 'apply') {
        cardEl.innerHTML = ''; cardEl.classList.add('hide');
        const p = patternSpeak(zone, { ...s, text: en }); stops.push(p.stop);
        act.innerHTML = grades(s); bindGrades(s, D.rate);
      }
      window.scrollTo({ top: 0 });
    };
    $$('.flow [data-s]', root).forEach(b => b.onclick = () => go(b.dataset.s));
    go('say');
  }
  function bindGrades(s, rateFn) {
    $$('[data-q]', root).forEach(b => b.onclick = () => {
      const q = b.dataset.q; rateFn(s.id, q);
      if (q === 'again') { if (!result.again.includes(s.id)) result.again.push(s.id); if (!requeued.has(s.id)) { requeued.add(s.id); queue.push(s.id); } }
      else result[q]++;
      next();
    });
  }
  function summary() {
    stops.forEach(f => f());
    if (thenWords.length) { exprPractice(root, thenWords, result); return; }
    summaryScreen(root, result, end, againList => practice(root, againList));
  }
  card();
}
const grades = s => `<p class="grade-q">얼마나 익숙해요?</p><div class="grades">${Object.entries(D.STATUS).map(([k, l]) => `<button data-q="${k}" class="${k}"><b>${l}</b><small>${nextLabel(s, k)}</small></button>`).join('')}</div>`;
function nextLabel(s, k) {
  if (k === 'again') return '10분 후';
  const iv = D.nextInterval(s, k);
  return iv === 1 ? '내일' : `${iv}일 후`;
}
function summaryScreen(root, result, end, again) {
  const againList = result.again.filter(id => D.get().saved.find(x => x.id === id));
  document.body.classList.add('no-tab');
  root.innerHTML = `<div class="screen full done-scr">
    <header class="top"><span class="icon-sp"></span><h2>복습 완료</h2><button class="icon-btn" id="x" aria-label="닫기">${ic('x')}</button></header>
    <div class="done-hero"><span class="done-mark">${ic('check')}</span><p>오늘 복습을 끝냈어요</p></div>
    <div class="sum"><div><b>${result.mastered}</b><span>완전히 익힘</span></div><div><b>${result.okay}</b><span>어느 정도</span></div><div><b>${result.again.length}</b><span>다시 연습</span></div></div>
    ${againList.length ? `<button class="btn block" id="again">${ic('refresh')} 어려웠던 문장 다시 복습</button>` : ''}
    <button class="btn soft block mt8" id="done">SAVED로 돌아가기</button></div>`;
  $('#x', root).onclick = end; $('#done', root).onclick = end;
  $('#again', root) && ($('#again', root).onclick = () => again(againList));
}

// ---------- 표현 복습: 표현 보기 → 새 문장 만들어 말하기 → 피드백 → 저장 → 익숙함 ----------
function exprPractice(root, ids, carry = null) {
  let queue = [...ids], i = 0, stop = null; const result = carry || { again: [], okay: 0, mastered: 0 };
  document.body.classList.add('no-tab');
  const end = () => { stop?.(); document.body.classList.remove('no-tab'); filter = 'words'; saved(root); };
  const next = () => { stop?.(); stop = null; i++; if (i >= queue.length) summaryScreen(root, result, end, () => { }); else card(); };
  function card() {
    const w = D.get().words.find(x => x.id === queue[i]); if (!w) return next();
    const src = w.srcId && D.get().saved.find(s => s.id === w.srcId);
    root.innerHTML = `<div class="screen full practice expr">
      <header class="top"><button class="icon-btn" id="x" aria-label="닫기">${ic('x')}</button><h2 class="ttl-sm">표현 ${i + 1} / ${queue.length}</h2><span class="icon-sp"></span></header>
      <div class="meter"><i style="width:${(i / queue.length) * 100}%"></i></div>
      <section class="expr-card">
        <span class="expr-kind">${w.kind === 'word' ? '단어' : '표현'}</span>
        <h2 class="expr-text en">${esc(w.text)}</h2>
        ${w.ko ? `<p class="expr-ko">${esc(w.ko)}</p>` : `<button class="expr-addko" id="ak">+ 뜻 적기</button>`}
        ${src ? `<div class="expr-src"><span>원래 문장</span><p class="en">${markPattern(enOf(src), '', esc, [w.text])}</p>${src.ko ? `<small>${esc(src.ko)}</small>` : ''}</div>` : ''}
        ${w.made?.length ? `<details class="adv expr-made"><summary>내가 만든 문장 ${w.made.length}개</summary>${w.made.slice(-5).reverse().map(m => `<p class="en">${markPattern(m.text, '', esc, [w.text])}</p>`).join('')}</details>` : ''}
      </section>
      <ol class="expr-steps"><li class="on">새 문장 만들기</li><li>말하기</li><li>피드백</li><li>복습</li></ol>
      <div id="zone"></div>
      <div id="act"></div></div>`;
    $('#x', root).onclick = end;
    $('#ak', root) && ($('#ak', root).onclick = () => wordSheet(w, card));
    const steps = $$('.expr-steps li', root); const mark = k => steps.forEach((li, j) => { li.classList.toggle('on', j === k); li.classList.toggle('done', j < k); });
    const p = patternSpeak($('#zone', root), { ko: w.ko, text: w.text }, {
      expr: w.text, onStart: () => mark(1),
      onSaved: (it, { fixed }) => { D.updateWord(w.id, { made: [...(w.made || []), { text: fixed, at: Date.now() }] }); mark(3); }
    });
    stop = p.stop;
    // 말하고 나서 피드백이 뜨면 3단계
    const obs = new MutationObserver(() => { if ($('.ba', root)) mark(Math.max(2, steps.findIndex(li => li.classList.contains('on')))); });
    obs.observe($('#zone', root), { childList: true, subtree: true });
    const prevStop = stop; stop = () => { obs.disconnect(); prevStop(); };
    $('#act', root).innerHTML = grades(w);
    $$('[data-q]', root).forEach(b => b.onclick = () => {
      const q = b.dataset.q; D.rateWord(w.id, q);
      if (q === 'again') { if (!result.again.includes(w.id)) result.again.push(w.id); if (queue.indexOf(w.id) === queue.lastIndexOf(w.id)) queue.push(w.id); }
      else result[q]++;
      next();
    });
  }
  card();
}
