// SAVED — 문장 · 표현 · 단어 저장 → 질문에 영어로 대답하며 복습
// · 문장 복습 / 표현·단어 복습 모두 같은 화면: 질문 → 영어로 대답 → 자연스러운 피드백 → (맞히면 자동 복습 완료) → 마지막에만 익숙함 선택
import * as D from './store.js';
import { esc, $, $$, ic, toast, sheet, micBlock, confirmSheet, ytLink, natOf, phrasePicker, hintBox, unitHTML, verdictHTML, compareHTML, bindCompare } from './ui.js';
import { smartFeedback } from './ai.js';
const canon = t => String(t || '').toLowerCase().replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim();
import { markPattern, splitPatterns, diff } from './compare.js';
import { improve, patternParts } from './feedback.js';
import { judgeReply, questionFor } from './judge.js';

let filter = 'due';
let view = 'sent'; // 'sent' 문장 | 'expr' 표현 | 'word' 단어
const ST = { new: ['새로 저장', ''], again: ['복습 중', 'warn'], okay: ['어느 정도', 'mid'], mastered: ['복습완료', 'ok'] };
const SRC = s => s.kind === 'utt' ? '백현이' : '내 문장';
const enOf = s => s.kind === 'utt' ? (natOf(s) || s.text) : (s.text || natOf(s));
const enHTML = s => markPattern(enOf(s), s.pattern, esc, s.marks || []);
const FILTERS = [['due', '오늘', '지금 복습할 차례인 문장'], ['bh', '백현이 문장', '영상에서 저장한 백현이의 문장'], ['mine', '내 문장', '내가 말하고 다듬어서 저장한 문장'], ['done', '복습완료', '복습을 끝낸 문장']];

export function saved(root) {
  const db = D.get(); const due = D.dueList(); const dueW = D.dueWords();
  const lists = {
    due, bh: db.saved.filter(s => s.kind === 'utt'), mine: db.saved.filter(s => s.kind !== 'utt'),
    done: db.saved.filter(s => s.status === 'okay' || s.status === 'mastered')
  };
  if (!lists[filter]) filter = 'due';
  const isW = view !== 'sent';
  const words = db.words.filter(w => view === 'word' ? w.kind === 'word' : w.kind !== 'word');
  const items = isW ? words : lists[filter];
  const nE = db.words.filter(w => w.kind !== 'word').length, nW = db.words.length - nE;
  root.innerHTML = `<div class="screen saved-scr">
    <header class="top"><h1 class="page-title">Saved</h1></header>
    <div class="stats-strip"><div><b class="${due.length ? 'accent' : ''}">${due.length}</b><span>복습할 문장</span></div><div><b class="${dueW.length ? 'accent' : ''}">${dueW.length}</b><span>복습할 표현·단어</span></div><div><b>${db.saved.filter(s => s.status === 'mastered').length}</b><span>익힌 문장</span></div></div>
    <button class="review-btn" id="go" ${due.length || dueW.length ? '' : 'disabled'}>${due.length || dueW.length ? '오늘 복습 시작' : '오늘 복습 끝'}${ic('next')}</button>
    <div class="view-sw"><button data-v="sent" class="${view === 'sent' ? 'on' : ''}">문장 <em>${db.saved.length}</em></button><button data-v="expr" class="${view === 'expr' ? 'on' : ''}">표현 <em>${nE}</em></button><button data-v="word" class="${view === 'word' ? 'on' : ''}">단어 <em>${nW}</em></button></div>
    ${isW ? `<div class="w-tools"><button class="btn sm soft" id="addw">${ic('plus')} ${view === 'word' ? '단어' : '표현'} 추가</button>${items.length > 1 ? `<button class="btn sm" id="pw">${ic('play')} ${items.length}개 복습</button>` : ''}</div>`
      : `<div class="tabs-scroll"><div class="seg">${FILTERS.map(([k, l]) => `<button data-f="${k}" class="${filter === k ? 'on' : ''}">${l}</button>`).join('')}</div></div><p class="f-cap">${FILTERS.find(f => f[0] === filter)[2]}</p>`}
    ${items.length ? `${!isW && filter !== 'due' && items.length > 1 ? `<button class="link-sm practice-all" id="pa">${ic('play')} 이 목록 ${items.length}개 복습하기</button>` : ''}<div class="slist">${items.map(isW ? wordHTML : itemHTML).join('')}</div>`
      : `<div class="empty"><span class="empty-ic">${ic(isW ? 'marker' : 'bookmark')}</span><b>${!isW && filter === 'due' ? '지금 복습할 게 없어요' : isW ? `아직 저장한 ${view === 'word' ? '단어' : '표현'}가 없어요` : '아직 문장이 없어요'}</b><p>${!isW && filter === 'due' ? '다음 복습 시간이 되면 여기에 나타나요' : isW ? 'CHAT·CALL에서 추천 표현을 누르면 저장돼요' : 'CHAT·CALL에서 추천 문장을 누르면 저장돼요'}</p></div>`}
  </div>`;
  $$('[data-f]', root).forEach(b => b.onclick = () => { filter = b.dataset.f; saved(root); });
  $$('[data-v]', root).forEach(b => b.onclick = () => { view = b.dataset.v; saved(root); });
  $('#go', root).onclick = () => review(root, due.map(s => ({ t: 's', id: s.id })).concat(dueW.map(w => ({ t: 'w', id: w.id }))));
  $('#pa', root) && ($('#pa', root).onclick = () => review(root, items.map(s => ({ t: 's', id: s.id }))));
  $('#pw', root) && ($('#pw', root).onclick = () => review(root, items.map(w => ({ t: 'w', id: w.id }))));
  $('#addw', root) && ($('#addw', root).onclick = () => wordSheet(null, () => saved(root), view === 'word' ? 'word' : 'expr'));
  root.onclick = async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const card = b.closest('[data-id]'); const id = card.dataset.id;
    const a = b.dataset.act;
    if (card.dataset.w) {
      const w = D.get().words.find(x => x.id === id); if (!w) return;
      if (a === 'make') review(root, [{ t: 'w', id }]);
      if (a === 'edit') wordSheet(w, () => saved(root));
      if (a === 'del' && await confirmSheet(`‘${w.text}’을 삭제할까요?`, '삭제')) { D.deleteWord(id); const s = w.srcId && D.get().saved.find(x => x.id === w.srcId); s && D.toggleMark(s.id, w.text, false); saved(root); }
      return;
    }
    const s = D.get().saved.find(x => x.id === id); if (!s) return;
    if (a === 'one') review(root, [{ t: 's', id }]);
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
  return `<article class="sitem ${s.status === 'again' || s.status === 'new' || s.srs.due <= Date.now() ? 'imp' : ''}" data-id="${s.id}">
    <div class="en s-en">${enHTML(s)}</div>
    ${s.ko ? `<div class="ko s-ko">${esc(s.ko)}</div>` : ''}
    <div class="foot">
      <button class="s-act" data-act="one">${ic('mic')} 복습</button>
      <span class="s-meta">${SRC(s)} · <em class="${stC}">${stL}</em> · ${esc(dueText(s.srs))}</span>
      <button class="mini" data-act="mark" aria-label="표현 고르기">${ic('sparkle')}</button>
      ${link ? `<a class="mini" href="${link.href}" ${link.ext ? 'target="_blank" rel="noopener"' : ''} aria-label="${esc(link.label)}">${ic(link.ext ? 'external' : 'video')}</a>` : ''}
      <button class="mini" data-act="edit" aria-label="수정">${ic('edit')}</button>
      <button class="mini" data-act="del" aria-label="삭제">${ic('trash')}</button></div></article>`;
}
function wordHTML(w) {
  const [stL, stC] = ST[w.status] || ST.new; const src = w.srcId && D.get().saved.find(s => s.id === w.srcId);
  return `<article class="witem" data-id="${w.id}" data-w="1">
    <div class="w-top"><b class="w-text en">${esc(w.text)}</b><span class="s-meta"><em class="${stC}">${stL}</em> · ${esc(dueText(w.srs))}</span></div>
    ${w.ko ? `<p class="w-ko">${esc(w.ko)}</p>` : `<button class="w-addko" data-act="edit">+ 뜻 적기</button>`}
    ${src ? `<p class="w-src en">${markPattern(enOf(src), '', esc, [w.text, ...patternParts(w.text)])}</p>` : ''}
    <div class="foot"><button class="s-act" data-act="make">${ic('mic')} 복습</button>${w.made?.length ? `<span class="s-meta">내가 만든 문장 ${w.made.length}개</span>` : '<span class="grow2"></span>'}
      <button class="mini" data-act="edit" aria-label="수정">${ic('edit')}</button><button class="mini" data-act="del" aria-label="삭제">${ic('trash')}</button></div></article>`;
}
function relTime(t) { const d = t - Date.now(); const h = d / 36e5; if (h < 1) return `${Math.max(1, Math.round(d / 6e4))}분 후`; if (h < 24) return `${Math.round(h)}시간 후`; return `${Math.round(h / 24)}일 후`; }

// 문장에서 외우고 싶은 표현 고르기
function markSheet(s, done) {
  const sh = sheet(`<h3>외우고 싶은 표현 고르기</h3><div id="mk"></div>
    ${s.ko ? `<p class="mk-ko">${esc(s.ko)}</p>` : ''}<button class="btn block mt12" id="mkd">완료</button>`, { onClose: done });
  phrasePicker($('#mk', sh), enOf(s), {
    marks: s.marks || [],
    onSave: (p, { asWord }) => { D.toggleMark(s.id, p, true); D.saveWord({ text: p, srcId: s.id, kind: asWord ? 'word' : 'expr' }); toast(`‘${p}’ 저장했어요`); },
    onUnmark: p => D.toggleMark(s.id, p, false)
  });
  $('#mkd', sh).onclick = () => sh.close();
}
function wordSheet(w, done, kind0 = 'expr') {
  const sh = sheet(`<h3>${w ? '수정' : kind0 === 'word' ? '단어 추가' : '표현 추가'}</h3>
    <label class="field"><span>영어</span><input class="input en" id="w-t" value="${esc(w?.text || '')}" placeholder="${kind0 === 'word' ? 'exhausted' : "can't wait to"}" autocapitalize="off"></label>
    <label class="field"><span>뜻</span><input class="input" id="w-k" value="${esc(w?.ko || '')}" placeholder="${kind0 === 'word' ? '너무 지친' : '빨리 ~하고 싶어'}"></label>
    <label class="field"><span>복습 질문 (선택 · 비우면 자동)</span><input class="input en" id="w-q" value="${esc(w?.q || '')}" placeholder="What are you looking forward to?"></label>
    <div class="field"><span>종류</span><div class="seg"><button data-k="expr" class="${(w?.kind || kind0) !== 'word' ? 'on' : ''}">표현</button><button data-k="word" class="${(w?.kind || kind0) === 'word' ? 'on' : ''}">단어</button></div></div>
    <button class="btn block" id="w-s">저장</button>`);
  let kind = w?.kind || kind0;
  $$('[data-k]', sh).forEach(b => b.onclick = () => { kind = b.dataset.k; $$('[data-k]', sh).forEach(x => x.classList.toggle('on', x === b)); });
  $('#w-s', sh).onclick = () => {
    const text = $('#w-t', sh).value.trim(); if (!text) return toast('영어를 입력해주세요');
    const patch = { text, ko: $('#w-k', sh).value.trim(), q: $('#w-q', sh).value.trim(), kind };
    if (w) D.updateWord(w.id, patch); else { const r = D.saveWord(patch); if (r.dup) toast('이미 있어요'); }
    sh.close(); done();
  };
}
function editSheet(s, done) {
  const sh = sheet(`<h3>문장 수정</h3>
    <label class="field"><span>영어 문장</span><textarea class="textarea en" id="e-en" rows="2">${esc(enOf(s))}</textarea></label>
    <label class="field"><span>한국어</span><textarea class="textarea" id="e-ko" rows="2">${esc(s.ko)}</textarea></label>
    <label class="field"><span>패턴 · 쉼표(,)로 여러 개</span><input class="input en" id="e-pat" value="${esc(s.pattern)}" placeholder="I've been ~ing, can't wait to ~"></label>
    <div class="field"><span>학습 상태</span><div class="seg">${Object.entries({ again: '복습 중', okay: '어느 정도', mastered: '복습완료' }).map(([k, l]) => `<button data-st="${k}" class="${s.status === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
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

// ---------- 복습: 문장·표현·단어 같은 화면 ----------
// 질문(영어) → 문장/표현을 써서 영어로 대답 → 자연스러운 피드백 → 맞으면 자동 복습 완료 · 틀리면 복습 대상으로 유지
function review(root, items) {
  let queue = [...items], i = 0, stop = null; const result = { ok: 0, again: [] }; const requeued = new Set();
  document.body.classList.add('no-tab');
  const end = () => { stop?.(); document.body.classList.remove('no-tab'); saved(root); };
  const next = () => { stop?.(); stop = null; i++; if (i >= queue.length) summary(); else card(); };

  function card() {
    const it = queue[i]; const isW = it.t === 'w';
    const x = isW ? D.get().words.find(w => w.id === it.id) : D.get().saved.find(s => s.id === it.id);
    if (!x) return next();
    const target = isW ? x.text : enOf(x);
    const expr = isW ? x.text : (splitPatterns(x.pattern)[0] || (x.marks || [])[0] || '');
    const src = isW && x.srcId && D.get().saved.find(s => s.id === x.srcId);
    const q = isW ? (x.q ? { en: x.q, ko: '' } : questionFor({ expr: x.text, sentence: src ? enOf(src) : '', pattern: x.text })) : questionFor({ sentence: target, pattern: x.pattern, note: x.note, ko: x.ko });
    root.innerHTML = `<div class="screen full practice">
      <header class="top"><button class="icon-btn" id="x" aria-label="닫기">${ic('x')}</button><h2 class="ttl-sm">${i + 1} / ${queue.length}</h2><span class="icon-sp"></span></header>
      <div class="meter"><i style="width:${(i / queue.length) * 100}%"></i></div>
      <section class="rv-card">
        ${q.en ? `<p class="rv-q en">${unitHTML(q.en)}</p>${q.ko ? `<p class="rv-qko">${esc(q.ko)}</p>` : ''}` : `<p class="rv-q">${esc(q.ko)}</p>`}
        <div class="rv-t">${isW
          ? `<span class="rv-l">이 ${x.kind === 'word' ? '단어' : '표현'}로 대답해요</span><b class="rv-x en">${esc(x.text)}</b>${x.ko ? `<span class="rv-ko">${esc(x.ko)}</span>` : ''}`
          : `<span class="rv-l">이 문장으로 대답해요</span><button class="rv-s en veil" id="peek" type="button">${unitHTML(target, x.pattern, x.marks)}</button>${x.ko ? `<span class="rv-ko">${esc(x.ko)}</span>` : ''}`}</div>
        <div class="rv-hint" id="rh"></div>
        <div class="rv-rec hide" id="rr"></div>
      </section>
      <div id="zone"></div><div id="fbz"></div><div id="act"></div></div>`;
    $('#x', root).onclick = end;
    if (!isW) {
      hintBox($('#rh', root), target, { pattern: x.pattern, keywords: [] });
      const pk = $('#peek', root); let t; pk.onclick = () => { pk.classList.remove('veil'); clearTimeout(t); t = setTimeout(() => !pk.dataset.open && pk.classList.add('veil'), 1800); };
    }
    let snap = null, judged = false, seq = 0;
    const act = $('#act', root), fbz = $('#fbz', root), rr = $('#rr', root);
    const m = micBlock($('#zone', root), { placeholder: '영어로 대답해요', targets: () => [target], onStart: () => { fbz.innerHTML = ''; }, onResult: t => t && check(t), onEdit: t => { judged = false; act.innerHTML = t ? `<button class="btn block" id="ck">확인</button>` : ''; $('#ck', act) && ($('#ck', act).onclick = () => check(m.text)); } });
    stop = () => m.stop();
    async function check(text) {
      const my = ++seq; judged = true;
      if (!isW) { const pk = $('#peek', root); pk.classList.remove('veil'); pk.dataset.open = '1'; }
      fbz.innerHTML = '<p class="small muted rv-wait">확인하는 중…</p>';
      const f = await smartFeedback({ mode: 'review', said: text, question: q.en, qko: q.ko, expr, target: isW ? '' : target, pattern: x.pattern || '' }); if (my !== seq) return;
      let ev = f.ev, ok = ev.ok;
      // 문장 복습: 저장한 문장을 거의 그대로 기억해 말했으면 맞음
      if (!isW) { const d = diff(text, target); if (d.keyRecall >= 0.7 && ev.level !== 'off' && !(ev.gram || []).length) { ok = true; if (!ev.ok) ev = { ...ev, level: 'great', title: '잘 기억했어요', ok: true }; } }
      fbz.innerHTML = compareHTML({ said: text, fixed: f.fixed, ev, why: f.why, xs: f.xs, ai: f.ai });
      bindCompare(fbz, t => ({ kind: 'mine', level: 'mine', uttId: isW ? null : x.uttId, ko: '', text: t, before: text, en: { easy: '', natural: t, advanced: '' }, pattern: expr, note: q.en || q.ko }));
      // 추천 문장 → 위 핑크 카드에서 바로 저장
      const fixed = f.natural || f.fixed || text;
      rr.classList.remove('hide');
      rr.innerHTML = `<span class="rv-l">${f.ai ? '이렇게 말해봐요' : canon(fixed) !== canon(text) ? '다듬은 내 문장' : '내 문장'}</span><button class="rv-save" id="rsv" type="button"><span class="en">${unitHTML(fixed, expr)}</span><i>${ic('bookmark')}</i></button>`;
      $('#rsv', root).onclick = e => {
        const s2 = D.saveExpr({ kind: 'mine', level: 'mine', uttId: isW ? null : x.uttId, ko: '', text: fixed, before: text, en: { easy: '', natural: fixed, advanced: '' }, pattern: expr, note: q.en || q.ko });
        if (isW) D.updateWord(x.id, { made: [...(x.made || []), { text: fixed, at: Date.now() }] });
        e.currentTarget.classList.add('on'); toast(s2.dup ? '이미 SAVED에 있어요' : '내 문장에 저장했어요');
      };
      D.addAttempt({ uttId: isW ? null : x.uttId, step: 'review', text });
      // 결과 기록: 맞으면 자동 완료, 틀리면 복습 대상으로
      const rateFn = isW ? D.rateWord : D.rate;
      if (snap) D.unrate(x.id, snap, isW); else snap = D.rateSnap(x.id, isW);
      rateFn(x.id, ok ? 'okay' : 'again');
      if (ok) {
        result.again = result.again.filter(id => id !== x.id);
        act.innerHTML = `<p class="done-line">${ic('check')} 복습 완료</p><p class="grade-q">얼마나 익숙해요?</p><div class="grades two">
          <button data-q="okay"><b>어느 정도 알아요</b><small>${nextLabel(snap, 'okay')}</small></button><button data-q="mastered"><b>완전히 익혔어요</b><small>${nextLabel(snap, 'mastered')}</small></button></div>`;
        $$('[data-q]', act).forEach(b => b.onclick = () => { if (b.dataset.q === 'mastered') { D.unrate(x.id, snap, isW); rateFn(x.id, 'mastered'); } result.ok++; next(); });
      } else {
        if (!result.again.includes(x.id)) result.again.push(x.id);
        act.innerHTML = `<div class="row"><button class="btn soft grow" id="re">${ic('mic')} 다시 말하기</button><button class="btn grow" id="nx">다음</button></div>`;
        $('#re', act).onclick = () => { fbz.innerHTML = ''; act.innerHTML = ''; m.text = ''; m.start(); };
        $('#nx', act).onclick = () => { if (!requeued.has(x.id)) { requeued.add(x.id); queue.push(it); } next(); };
      }
    }
  }
  function summary() {
    stop?.();
    const again = result.again.filter(id => D.get().saved.some(s => s.id === id) || D.get().words.some(w => w.id === id));
    root.innerHTML = `<div class="screen full done-scr">
      <header class="top"><span class="icon-sp"></span><h2>복습 완료</h2><button class="icon-btn" id="x" aria-label="닫기">${ic('x')}</button></header>
      <div class="done-hero"><span class="done-mark">${ic('check')}</span><p>오늘 복습을 끝냈어요</p></div>
      <div class="sum two"><div><b>${result.ok}</b><span>복습 완료</span></div><div><b>${again.length}</b><span>다시 복습</span></div></div>
      ${again.length ? `<button class="btn block" id="again">${ic('refresh')} 틀린 것 다시 복습</button>` : ''}
      <button class="btn soft block mt8" id="done">SAVED로 돌아가기</button></div>`;
    $('#x', root).onclick = end; $('#done', root).onclick = end;
    $('#again', root) && ($('#again', root).onclick = () => review(root, again.map(id => ({ t: D.get().words.some(w => w.id === id) ? 'w' : 's', id }))));
  }
  card();
}
function nextLabel(snap, k) {
  const iv = D.nextInterval({ srs: snap?.srs || { interval: 0 } }, k);
  return iv === 1 ? '내일' : `${iv}일 후`;
}
