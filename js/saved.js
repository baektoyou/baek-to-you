// SAVED — 문장 · 표현 · 단어 저장 → 질문에 영어로 대답하며 복습
// · 문장 복습 / 표현·단어 복습 모두 같은 화면: 질문 → 영어로 대답 → 자연스러운 피드백 → (맞히면 자동 복습 완료) → 마지막에만 익숙함 선택
import * as D from './store.js';
import { esc, $, $$, ic, toast, h, sheet, confirmSheet, ytLink, natOf, phrasePicker, hintBox, cmpHTML, bindCompare, setLpCtx, recSentHTML, lpHTML, bindLongPress, bhLines, AI_MARK, checkRetry, swipeDelete, enterSend, autoFollow } from './ui.js';
import { smartFeedback, aiReplyLine, fixAddr, aiExprSay, aiOn, aiKoMark, aiKo } from './ai.js';
import * as S from './speech.js';
import { Player, vThumb } from './yt.js';
import { avatarStyle, isLive } from './scene.js';
import { BH_PROFILE } from './video.js';
import * as GT from './grammar.js';
import * as XC from './excat.js';
const canon = t => String(t || '').toLowerCase().replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim();
import { markPattern, splitPatterns, diff } from './compare.js';
import { improve, patternParts } from './feedback.js';
import { judgeReply, questionFor } from './judge.js';

let filter = 'due';
let view = 'sent'; // 'sent' 문장 | 'expr' 표현 | 'word' 단어 | 'gram' 문법
let gtag = ''; // 문법 노트에서 보고 있는 문법
let ggrp = ''; // 문법 목록: 묶음(시제·동사·명사…) · '' = 전체
let ecat = 'all'; // 표현: all 전체 | video 영상별 | 카테고리 key | none 분류 전
let evtab = 'chat'; // 영상별: chat | call 영상
let evid = null, evx = 0; // 영상별: 고른 영상 id('' = 영상 없음) · 영상 줄 가로 스크롤 위치
// 상태: 복습전 · 복습중 · (어느 정도 = 다음 복습 시간만) · 복습완료
const ST = { new: ['복습전', ''], again: ['2일 후 복습', 'mid'], okay: ['2일 후 복습', 'mid'], mastered: ['복습완료', 'ok'] };
// 상태 옆: 복습할 날이 됐으면 ‘오늘’
const dueTag = r => r?.due <= D.endOfToday() ? '오늘' : '';
const SRC = s => s.kind === 'utt' ? '백현이' : s.src === 'dm' ? '백현이 채팅' : '내 문장';
const enOf = s => fixAddr(s.kind === 'utt' ? (natOf(s) || s.text) : (s.text || natOf(s)));
const enHTML = s => markPattern(enOf(s), s.pattern, esc, s.marks || []);
const FILTERS = [['due', '오늘', '이거 다시 해볼까?!'], ['bh', '백현이 문장', '내가 말했던 문장!!'], ['mine', '내 문장', '네가 직접 만든 문장!!'], ['done', '복습완료', '이건 이제 다 외웠지❤️']];

export function saved(root) {
  const db = D.get(); const due = D.dueTodayList(); const dueW = D.dueTodayWords(); // 오늘 안에 복습할 차례가 오는 것까지 전부
  const lists = {
    due, bh: db.saved.filter(s => s.kind === 'utt'), mine: db.saved.filter(s => s.kind !== 'utt'),
    done: db.saved.filter(s => s.status === 'mastered')
  };
  if (!lists[filter]) filter = 'due';
  const isW = view !== 'sent';
  const words = db.words.filter(w => view === 'word' ? w.kind === 'word' : w.kind !== 'word');
  // 표현: 카테고리로 거르기 (영상별은 묶어서 보여주기만)
  const isE = view === 'expr';
  if (isE && ecat !== 'all' && ecat !== 'video' && ecat !== 'none' && !words.some(w => w.cat === ecat)) ecat = 'all';
  const vgAll = isE && ecat === 'video' ? videoGroups(words) : null; // 영상별: CHAT / CALL로 나누고, 위에서 영상을 고르면 그 영상 표현만
  const inTab = (g, t) => t === 'call' ? !!g.v && isLive(g.v) : !g.v || !isLive(g.v); // ‘영상 없음’은 CHAT 쪽에
  if (vgAll && !vgAll.some(g => inTab(g, evtab)) && vgAll.length) evtab = evtab === 'call' ? 'chat' : 'call';
  const vg = vgAll && vgAll.filter(g => inTab(g, evtab));
  if (vg && !vg.some(g => g.k === evid)) evid = vg[0]?.k ?? null;
  const shownW = vg ? (vg.find(g => g.k === evid)?.list || []) : !isE || ecat === 'all' ? words : ecat === 'none' ? words.filter(w => !XC.CAT[w.cat]) : words.filter(w => w.cat === ecat);
  const items = isW ? shownW : lists[filter];
  const dueWid = new Set(dueW.map(w => w.id));
  const todo = vg ? items.filter(w => dueWid.has(w.id)) : items.filter(x => x.status !== 'mastered'); // ‘이 목록 복습하기’는 복습완료 빼고 · 영상별은 오늘 복습할 날짜가 된 것만
  const nE = db.words.filter(w => w.kind !== 'word').length, nW = db.words.length - nE;
  // 개수: 오늘 복습(복습전 + 날짜 된 2일 후) · 2일 후 복습(아직 날짜 안 된 것) · 복습완료 — 문장·표현·단어 모두
  const all = [...db.saved, ...db.words], dueIds = new Set([...due, ...dueW].map(x => x.id));
  const later = all.filter(x => (x.status === 'okay' || x.status === 'again') && !dueIds.has(x.id)).length;
  const mastered = all.filter(x => x.status === 'mastered').length;
  root.innerHTML = `<div class="screen saved-scr">
    <header class="top"><h1 class="page-title">Saved</h1></header>
    <div class="stats-strip"><div><b class="${due.length + dueW.length ? 'accent' : ''}">${due.length + dueW.length}</b><span>오늘 복습</span></div><div><b>${later}</b><span>2일 후 복습</span></div><div><b>${mastered}</b><span>복습완료</span></div></div>
    <button class="review-btn" id="go" ${due.length || dueW.length ? '' : 'disabled'}>${due.length || dueW.length ? '오늘 복습 시작' : '오늘 복습 끝'}${ic('next')}</button>
    <div class="view-sw"><button data-v="sent" class="${view === 'sent' ? 'on' : ''}">문장 <em>${db.saved.length}</em></button><button data-v="expr" class="${view === 'expr' ? 'on' : ''}">표현 <em>${nE}</em></button><button data-v="word" class="${view === 'word' ? 'on' : ''}">단어 <em>${nW}</em></button><button data-v="gram" class="${view === 'gram' ? 'on' : ''}">문법 <em>${GT.stats().filter(s => !s.fixed).length}</em></button></div>
    ${view === 'gram' ? gramHTML() : `
    ${isW ? `<div class="w-tools"><button class="btn sm soft" id="addw">${ic('plus')} ${view === 'word' ? '단어' : '표현'} 추가</button>${todo.length ? `<button class="btn sm" id="pw">${ic('play')} ${vg ? '이 영상 오늘 ' : isE && ecat !== 'all' ? '이 카테고리 ' : ''}${todo.length}개 복습</button>` : vg && items.length ? '<span class="ec-nodue">이 영상은 오늘 복습할 게 없어</span>' : ''}</div>${isE && words.length ? ecatHTML(words) : ''}${vg ? `<div class="ec-tab">${['chat', 'call'].map(t => { const gs = vgAll.filter(g => inTab(g, t)); return `<button data-et="${t}" class="${evtab === t ? 'on' : ''}" ${gs.length ? '' : 'disabled'}>${t.toUpperCase()} <em>${gs.reduce((n, g) => n + g.list.length, 0)}</em></button>`; }).join('')}</div>${vstripHTML(vg)}` : ''}`
      : `<div class="tabs-scroll"><div class="seg">${FILTERS.map(([k, l]) => `<button data-f="${k}" class="${filter === k ? 'on' : ''}">${l}</button>`).join('')}</div></div><p class="f-cap">${FILTERS.find(f => f[0] === filter)[2]}</p>`}
    ${items.length ? `${!isW && todo.length ? `<button class="link-sm practice-all" id="pa">${ic('play')} 이 목록 ${todo.length}개 복습하기</button>` : ''}<div class="slist">${items.map(isW ? wordHTML : itemHTML).join('')}</div>`
      : `<div class="empty"><span class="empty-ic">${ic(isW ? 'marker' : 'bookmark')}</span><b>${!isW && filter === 'due' ? '지금 복습할 게 없어요' : isW ? `아직 저장한 ${view === 'word' ? '단어' : '표현'}가 없어요` : '아직 문장이 없어요'}</b><p>${!isW && filter === 'due' ? '다음 복습 시간이 되면 여기에 나타나요' : isW ? 'CHAT·CALL에서 추천 표현을 누르면 저장돼요' : 'CHAT·CALL에서 추천 문장을 누르면 저장돼요'}</p></div>`}`}
  </div>`;
  // 삭제: 왼쪽으로 밀면 ‘삭제’
  $$('.sitem', root).forEach(row => swipeDelete(row, () => { D.deleteSaved(row.dataset.id); toast('삭제했어요'); saved(root); }));
  $$('.witem', root).forEach(row => swipeDelete(row, () => { const w = D.get().words.find(x => x.id === row.dataset.id); if (w) { D.deleteWord(w.id); const s = w.srcId && D.get().saved.find(x => x.id === w.srcId); s && D.toggleMark(s.id, w.text, false); } toast('삭제했어요'); saved(root); }));
  bindLongPress(root); // 문장·표현 속 단어: 짧게 누르면 그 단어, 꾹 누른 채 드래그하면 그 범위를 저장
  $$('[data-f]', root).forEach(b => b.onclick = () => { filter = b.dataset.f; saved(root); });
  $$('[data-v]', root).forEach(b => b.onclick = () => { view = b.dataset.v; gtag = ''; saved(root); });
  if (view === 'gram') bindGram(root);
  $$('[data-ec]', root).forEach(b => b.onclick = () => { ecat = b.dataset.ec; saved(root); });
  const vs = $('.ec-vs', root); if (vs) { vs.scrollLeft = evx; vs.onscroll = () => { evx = vs.scrollLeft; }; $('.ec-v.on', vs)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  $$('[data-et]', root).forEach(b => b.onclick = () => { evtab = b.dataset.et; evid = null; evx = 0; saved(root); });
  $$('[data-ev]', root).forEach(b => b.onclick = () => { evid = b.dataset.ev; saved(root); });
  $('#ecrun', root) && ($('#ecrun', root).onclick = async () => {
    const b = $('#ecrun', root), list = XC.uncats(); b.disabled = true; b.textContent = `분류하고 있어요… 0 / ${list.length}`;
    const r = await XC.classify(list, (d, n) => { const x = $('#ecrun', root); if (x) x.textContent = `분류하고 있어요… ${d} / ${n}`; });
    if (r.error && r.error !== 'busy') toast(r.done ? `${r.done}개까지 분류했어요 · 나머지는 잠시 뒤에 다시` : 'AI 분류를 못 했어요 · 잠시 뒤에 다시 해줘요'); else if (r.done) toast(`${r.done}개 분류 완료!`);
    if (root.isConnected && view === 'expr') saved(root);
  });
  $('#go', root).onclick = () => review(root, due.map(s => ({ t: 's', id: s.id, at: s.createdAt || 0 })).concat(dueW.map(w => ({ t: 'w', id: w.id, at: w.createdAt || 0 }))).sort((a, b) => a.at - b.at));
  $('#pa', root) && ($('#pa', root).onclick = () => review(root, todo.map(s => ({ t: 's', id: s.id }))));
  $('#pw', root) && ($('#pw', root).onclick = () => review(root, todo.map(w => ({ t: 'w', id: w.id }))));
  $('#addw', root) && ($('#addw', root).onclick = () => wordSheet(null, () => saved(root), view === 'word' ? 'word' : 'expr'));
  root.onclick = async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const card = b.closest('[data-id]'); if (!card) return; const id = card.dataset.id;
    const a = b.dataset.act;
    if (card.dataset.w) {
      const w = D.get().words.find(x => x.id === id); if (!w) return;
      if (a === 'make') review(root, [{ t: 'w', id }]);
      if (a === 'cat') catSheet(w, () => saved(root));
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
    <p class="en s-en lp">${recSentHTML(enOf(s), { hl: [...splitPatterns(s.pattern), ...(s.marks || [])] })}</p>
    ${s.ko ? `<div class="ko s-ko">${esc(s.ko)}</div>` : ''}
    <div class="foot">
      <button class="s-act" data-act="one">복습</button>
      <span class="s-meta">${[`<em class="${stC}">${stL}</em>`, s.status !== 'new' ? dueTag(s.srs) : ''].filter(Boolean).join(' · ')}</span>
      ${link ? `<a class="mini" href="${link.href}" ${link.ext ? 'target="_blank" rel="noopener"' : ''} aria-label="${esc(link.label)}">${ic(link.ext ? 'external' : 'video')}</a>` : ''}
      <button class="mini" data-act="edit" aria-label="수정">${ic('edit')}</button></div></article>`;
}
function wordHTML(w) {
  const [stL, stC] = ST[w.status] || ST.new; const src = w.srcId && D.get().saved.find(s => s.id === w.srcId);
  return `<article class="witem" data-id="${w.id}" data-w="1">
    <div class="w-top"><b class="w-text en">${esc(w.text)}</b><span class="s-meta">${[`<em class="${stC}">${stL}</em>`, w.status !== 'new' ? dueTag(w.srs) : ''].filter(Boolean).join(' · ')}</span></div>
    ${w.ko ? `<p class="w-ko">${esc(w.ko)}</p>` : `<button class="w-addko" data-act="edit">+ 뜻 적기</button>`}
    ${src ? `<p class="w-src en lp">${recSentHTML(enOf(src), { hl: [w.text] })}</p>` : ''}
    <div class="foot"><button class="s-act" data-act="make">복습</button>${XC.isExpr(w) ? `<button class="w-cat ${XC.CAT[w.cat] ? '' : 'none'}" data-act="cat">${esc(XC.CAT[w.cat] || '분류 전')}</button>` : ''}${w.made?.length ? `<span class="s-meta">내가 만든 문장 ${w.made.length}개</span>` : '<span class="grow2"></span>'}
      <button class="mini" data-act="edit" aria-label="수정">${ic('edit')}</button></div></article>`;
}
// ---------- 표현 카테고리 ----------
function ecatHTML(words) {
  const n = k => words.filter(w => w.cat === k).length, none = words.filter(w => !XC.CAT[w.cat]).length;
  const chip = (k, l, c) => `<button data-ec="${k}" class="${ecat === k ? 'on' : ''}">${esc(l)}${c != null ? ` <em>${c}</em>` : ''}</button>`;
  const cats = XC.CATS.filter(([k]) => n(k)).map(([k, l]) => chip(k, l, n(k))).join('');
  const old = XC.uncats().length;
  return `<div class="tabs-scroll"><div class="seg ecat">${chip('all', '전체', words.length)}${chip('video', '영상별')}${cats}${none ? chip('none', '분류 전', none) : ''}</div></div>
    ${old && aiOn() && !XC.catRunning() ? `<button class="link-sm ec-run" id="ecrun">${ic('sparkle')} 분류 전 표현 ${old}개 AI로 분류하기</button>` : old && !aiOn() ? '<p class="f-cap">카테고리 자동 분류는 AI 키가 있어야 해요 · 표현 아래 칩을 눌러 직접 고를 수도 있어요</p>' : ''}`;
}
// 저장한 표현이 나온 영상 (저장한 문장 → 그 영상 · 없으면 그 표현이 들어간 대사의 영상)
function wordVideo(w) {
  const src = w.srcId && D.get().saved.find(s => s.id === w.srcId);
  const vid = src?.videoId || (src?.uttId && D.utt(src.uttId)?.videoId);
  if (vid && D.video(vid)) return D.video(vid);
  const t = String(w.text || '').toLowerCase().replace(/[^a-z' ]/g, ' ').trim(); if (!t) return null;
  const u = D.get().utts.find(u => (' ' + String(natOf(u)).toLowerCase().replace(/[^a-z' ]/g, ' ') + ' ').includes(' ' + t + ' '));
  return u ? D.video(u.videoId) : null;
}
function videoGroups(words) {
  const g = new Map();
  words.forEach(w => { const v = wordVideo(w); const k = v ? v.id : ''; if (!g.has(k)) g.set(k, { k, v, list: [] }); g.get(k).list.push(w); });
  return [...g.values()].sort((a, b) => (!a.v) - (!b.v) || b.list.length - a.list.length);
}
// 영상별: 영상 썸네일 줄 (가로로 넘기기) → 누르면 아래에 그 영상 표현만
function vstripHTML(groups) {
  return `<div class="ec-vs">${groups.map(({ k, v, list }) => `<button class="ec-v ${k === evid ? 'on' : ''}" data-ev="${k}"><span class="ec-vt" ${v ? `style="background-image:url('${esc(vThumb(v))}')"` : ''}>${v ? '' : ic('bookmark')}<em>${list.length}</em></span><b>${esc(v ? v.title.split('\n')[0] : '영상 없음')}</b></button>`).join('')}</div>`;
}
function catSheet(w, done) {
  const sh = sheet(`<h3>카테고리</h3><p class="sheet-p en">${esc(w.text)}</p><div class="goal-ch">${XC.CATS.map(([k, l]) => `<button class="chip ${w.cat === k ? 'on' : ''}" data-ck="${k}">${esc(l)}</button>`).join('')}</div>`);
  $$('[data-ck]', sh).forEach(b => b.onclick = () => { D.updateWord(w.id, { cat: b.dataset.ck }); sh.close(); toast(`${XC.CAT[b.dataset.ck]}로 옮겼어`); done(); });
}
window.addEventListener('b2u:excat', () => { const r = document.querySelector('.saved-scr'); if (r && view === 'expr' && r.parentElement) saved(r.parentElement); });

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

// ---------- 복습: 백현이와 채팅하듯 ----------
// ① 백현이의 말 영어로 표현하기 — 저장한 백현이 문장: 한국어 원문 + 원본 영상 구간(저장된 시작·종료 시간) 반복 재생 → 영어로 말하기
// ② 백현이에게 답장하기 — 표현·단어·내 문장: 백현이가 먼저 건네는 연습용 메시지(AI) → 저장한 표현으로 답장 (뜻이 자연스럽게 통하면 정답)
// 답하면 바로 채팅 안에 내 문장(작게) → 추천 문장(크게, 고친 부분만 연핑크) → 이유 한 줄
const AVS = s => `<span class="m-av ph" style="${avatarStyle(BH_PROFILE, s)}"></span>`;
// ---------- 문법 노트 (SAVED › 문법) ----------
const ago = t => { const d = Math.floor((Date.now() - t) / 864e5); return d <= 0 ? '오늘' : d === 1 ? '어제' : `${d}일 전`; };
const gprogText = (pg, n) => pg ? (pg.wait ? `AI가 잠깐 쉬는 중… 곧 이어서 해요 · ${pg.done} / ${pg.total}` : `자동으로 분석하고 있어요… ${pg.done} / ${pg.total}`)
  : n && GT.cooling() ? `AI 사용량이 차서 쉬는 중 · 남은 ${n}문장은 조금 뒤 자동으로 이어서 해요` : n ? `남은 ${n}문장 곧 자동으로 분석해요` : '말한 문장은 자동으로 분석돼요';
function gramHTML() {
  const st = GT.stats(), nPend = GT.pending().length, ai = aiOn(), pg = GT.progress();
  const sum = `<div class="g-sum"><div class="g-sum-n"><div><b>${GT.analyzedCount()}</b><span>분석한 문장</span></div><div><b>${GT.mistakeCount()}</b><span>찾은 실수</span></div><div><b>${st.filter(s => s.fixed).length}</b><span>거의 고친 문법</span></div></div>
    ${!ai ? '<p class="g-note">문법 분석은 AI 키가 있어야 해요 · SETTINGS › AI</p>'
      : `<p class="g-note" id="gprog">${gprogText(pg, nPend)}</p>${!pg && !GT.isRunning() && nPend && GT.cooling() ? `<button class="link-sm" id="gnow">${ic('refresh')} 지금 다시 해보기</button>` : ''}`}</div>`;
  if (gtag) {
    const s = st.find(x => x.tag === gtag); const T = GT.TAG[gtag];
    if (!s || !T) { gtag = ''; return gramHTML(); }
    const sentences = new Set(s.list.map(m => canon(m.fixed))).size; // 같은 문장은 한 번만 연습
    return `${sum}<button class="link-sm g-back" id="gback">${ic('back')} 문법 목록</button>
      <div class="g-rule"><span class="g-grp">${esc(T.group)}</span><h3>${esc(T.label)}</h3><p>${esc(T.rule)}</p><p class="en g-ex">${esc(T.ex)}</p>
        <div class="g-meta">총 ${s.n}번 · 최근 2주 ${s.recent}번${s.streak ? ` · 연습 ${s.streak}번 연속 맞힘` : ''}${s.fixed ? ' · <b>거의 고쳤어!</b>' : ''}</div>
        <button class="btn block mt12" id="gpr">${ic('play')} 이 문법 연습하기 (${Math.min(10, sentences)}문장)</button></div>
      <div class="slist">${s.list.map(m => { const w = m.wrong && m.said.includes(m.wrong) ? esc(m.said).replace(esc(m.wrong), `<u class="g-wrong">${esc(m.wrong)}</u>`) : esc(m.said); const r = m.right && m.fixed.includes(m.right) ? esc(m.fixed).replace(esc(m.right), `<span class="chg">${esc(m.right)}</span>`) : esc(m.fixed);
        const u = m.uttId && D.utt(m.uttId); const last = (m.practice || []).slice(-1)[0];
        return `<div class="g-item" data-mid="${m.id}"><p class="en g-said">${w}</p><p class="en g-fix">${r}</p>${m.why ? `<p class="g-why">${esc(m.why)}</p>` : ''}<div class="g-foot"><span>${ago(m.at || 0)}${u ? ` · ${esc(u.ko).slice(0, 24)}` : ''}</span>${last ? `<span class="g-last ${last.ok ? 'ok' : ''}">${last.ok ? '연습 맞힘' : '연습 아쉬움'}</span>` : ''}</div></div>`; }).join('')}</div>
      <p class="g-note center">AI가 잘못 짚은 건 왼쪽으로 밀어서 지울 수 있어요</p>`;
  }
  if (!st.length) return `${sum}<div class="empty"><span class="empty-ic">${ic('check')}</span><b>${GT.analyzedCount() ? '아직 찾은 문법 실수가 없어요' : '아직 분석한 문장이 없어요'}</b><p>CHAT·CALL·복습에서 영어로 말하면 여기에 모여요</p></div>`;
  const max = Math.max(...st.map(s => s.n));
  const weak = st.filter(s => !s.fixed).slice(0, 3);
  // 묶음 칩: 전체 · 시제 · 동사 · 명사 … (실수가 있는 묶음만 · 숫자 = 실수 수)
  const grps = [...new Set(GT.TAGS.map(t => t[2]))].map(g => [g, st.filter(s => s.group === g).reduce((n, s) => n + s.n, 0)]).filter(x => x[1]);
  if (ggrp && !grps.some(x => x[0] === ggrp)) ggrp = '';
  const chips = grps.length > 1 ? `<div class="tabs-scroll"><div class="seg ecat"><button data-gg="" class="${ggrp ? '' : 'on'}">전체 <em>${st.reduce((n, s) => n + s.n, 0)}</em></button>${grps.map(([g, n]) => `<button data-gg="${esc(g)}" class="${ggrp === g ? 'on' : ''}">${esc(g)} <em>${n}</em></button>`).join('')}</div></div>` : '';
  const shown = ggrp ? st.filter(s => s.group === ggrp) : st;
  return `${sum}${weak.length ? `<button class="btn block mb12" id="gweak">${ic('play')} 약한 문법 모아 연습 (${weak.map(s => s.label.split(' (')[0]).join(' · ')})</button>` : ''}${chips}
    <div class="g-list">${shown.map(s => `<button class="g-row ${s.fixed ? 'fixed' : ''}" data-gt="${s.tag}"><div class="grow"><div class="g-row-t"><b>${esc(s.label)}</b>${ggrp ? '' : `<small>${esc(s.group)}</small>`}${s.fixed ? '<i class="g-badge">거의 고쳤어</i>' : ''}</div>
      <div class="g-bar"><i style="width:${Math.max(6, s.n / max * 100)}%"></i></div></div>
      <div class="g-n"><b>${s.n}</b><small>${s.recent > s.before ? '▲' : s.recent < s.before ? '▼' : ''} 최근 ${s.recent}</small></div>${ic('next')}</button>`).join('')}</div>`;
}
function bindGram(root) {
  const re = () => saved(root);
  $('#gnow', root) && ($('#gnow', root).onclick = () => { GT.autoRun(true); re(); });
  if (!GT.isRunning() && GT.pending().length && !GT.cooling()) GT.autoRun(); // 문법 탭을 열면 바로 시작
  $$('[data-gg]', root).forEach(b => b.onclick = () => { ggrp = b.dataset.gg; re(); });
  $$('[data-gt]', root).forEach(b => b.onclick = () => { gtag = b.dataset.gt; re(); window.scrollTo(0, 0); });
  $('#gback', root) && ($('#gback', root).onclick = () => { gtag = ''; re(); });
  const pick = list => { const seen = new Set(); return list.filter(m => { const k = canon(m.fixed); if (seen.has(k)) return false; seen.add(k); return true; }); };
  $('#gpr', root) && ($('#gpr', root).onclick = () => { const s = GT.stats().find(x => x.tag === gtag); if (s) review(root, pick(s.list).slice(0, 10).map(m => ({ t: 'g', id: m.id }))); });
  $('#gweak', root) && ($('#gweak', root).onclick = () => { const w = GT.stats().filter(s => !s.fixed).slice(0, 3); const items = w.flatMap(s => pick(s.list).slice(0, 4)); review(root, items.slice(0, 10).map(m => ({ t: 'g', id: m.id }))); });
  $$('.g-item', root).forEach(row => swipeDelete(row, () => { D.deleteMistake(row.dataset.mid); toast('지웠어요'); re(); }));
}
// 자동 분석 진행: 숫자만 바꾸고, 한 묶음 끝날 때마다 목록도 새로 (상세 화면을 보고 있을 땐 숫자만)
let gLast = -1;
window.addEventListener('b2u:gramprog', () => {
  const r = document.querySelector('.saved-scr'); if (!r || view !== 'gram') return;
  const pg = GT.progress(), q = r.querySelector('#gprog');
  if (pg && q && (gtag || pg.done === gLast || !pg.done)) { q.textContent = gprogText(pg, GT.pending().length); gLast = pg.done; return; }
  gLast = pg ? pg.done : -1; if (r.parentElement) { const y = window.scrollY; saved(r.parentElement); window.scrollTo(0, y); }
});
window.addEventListener('b2u:grammar', () => { const r = document.querySelector('.saved-scr'); if (r && view === 'gram') { const root = r.parentElement; if (root) saved(root); } });

function review(root, items) {
  let queue = [...items], i = 0, dead = false, cap = null, waiting = null, chipRes = null;
  const result = { ok: 0, again: [] }; const requeued = new Set(); const lines = [];
  document.body.classList.add('no-tab');
  root.innerHTML = `<div class="chatv rvc">
    <header class="cv-top"><button class="icon-btn" id="x" aria-label="닫기">${ic('x')}</button>
      <div class="cv-title">${AVS(28)}<div><b>백현이</b><small id="cvi"></small></div></div><span class="icon-sp"></span></header>
    <div class="meter"><i id="mt"></i></div>
    <div class="cv-player rv-pl hide" id="plw"><div class="player clean" id="pl"></div></div>
    <div class="thread" id="th"></div>
    <div class="quick" id="qk"></div>
    <div class="composer on" id="cp">
      <button class="cp-mic" id="cpm" aria-label="말하기">${ic('mic')}</button>
      <textarea id="cpt" rows="1" placeholder="영어로 말하거나 입력해요" autocapitalize="sentences" spellcheck="false"></textarea>
      <button class="cp-send" id="cps" aria-label="보내기">${ic('send')}</button>
    </div></div>`;
  const th = $('#th', root), qk = $('#qk', root), cp = $('#cp', root), ta = $('#cpt', root), micB = $('#cpm', root), sendB = $('#cps', root), plw = $('#plw', root);
  let pl = null;
  const player = () => pl || (pl = new Player($('#pl', root), { controls: 0 }));
  const end = () => { dead = true; cap?.stop(); pl?.destroy(); document.body.classList.remove('no-tab'); saved(root); };
  $('#x', root).onclick = end;
  const scroll = autoFollow(th);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  let lastWho = '';
  const add = (who, html, cls = '') => {
    const first = who !== lastWho; lastWho = who;
    const el = h(`<div class="msg2 ${who} ${first ? 'first' : ''} ${cls}">${who === 'bh' ? (first ? AVS(34) : '<span class="m-av sp"></span>') : ''}<div class="m-col">${who === 'bh' && first ? '<span class="m-name">백현이</span>' : ''}<div class="m-bub">${html}</div></div></div>`);
    th.appendChild(el); scroll(); return el;
  };
  const typing = () => add('bh', '<span class="typing3"><i></i><i></i><i></i></span>', 'typing');
  const sys = t => { lastWho = ''; th.appendChild(h(`<p class="m-sys">${t}</p>`)); scroll(); };
  // 아래 버튼
  const chips = (list, oneLine = false) => new Promise(res => {
    chipRes = res; qk.classList.toggle('one', oneLine && list.length > 2);
    qk.innerHTML = list.map(([l, k, cls]) => `<button class="qchip ${cls || ''}" data-q="${k}">${l}</button>`).join('');
    $$('[data-q]', qk).forEach(b => b.onclick = () => { const o = list.find(c => c[1] === b.dataset.q)?.[3]; if (o?.stay) { o.tap?.(); return; } qk.innerHTML = ''; chipRes = null; res(b.dataset.q); });
  });
  // 입력: 말하기(마이크) 또는 키보드
  const askInput = targets => new Promise(res => { ta.value = ''; fit(); waiting = { res, targets }; });
  // 백현이 메시지가 끝나면 음성 입력 자동 시작 · 마이크 권한이 막혀 있으면 켜지 않고 안내 (허용하면 그다음부터 자동)
  let discard = false, userEdit = false;
  async function autoMic() {
    if (!S.support.stt || cap || !waiting) return;
    let st = 'prompt'; try { st = (await navigator.permissions?.query({ name: 'microphone' }))?.state || 'prompt'; } catch { }
    if (dead || cap || !waiting) return;
    if (st === 'denied') { toast('마이크를 허용하면 바로 들을게요 · 지금은 마이크 버튼이나 입력창을 써요'); return; }
    startMic();
  }
  // 말하는 중이면 듣기를 취소 (원본 영상을 들을 때 영상 소리가 인식되지 않게)
  const cancelMic = () => { if (!cap) return; discard = true; cap.stop(); };
  function fit() { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; sendB.classList.toggle('on', !!ta.value.trim() || !!cap); }
  ta.oninput = () => { if (cap) userEdit = true; fit(); };
  ['focus', 'pointerdown'].forEach(ev => ta.addEventListener(ev, () => { if (cap) userEdit = true; }));
  function startMic() {
    if (cap || !waiting) { if (!waiting) toast('백현이 메시지를 기다려요'); return; }
    if (!S.support.stt) { ta.focus(); toast('키보드의 받아쓰기(🎤)로 말해도 돼요'); return; }
    pl?.pause();
    micB.classList.add('live'); cp.classList.add('rec'); micB.innerHTML = ic('stop');
    discard = false; userEdit = false;
    const c = cap = S.capture({ stt: true, prefix: ta.value.trim(), targets: waiting.targets || [], onInterim: t => { if (!userEdit && !discard) { ta.value = t; fit(); } } });
    fit();
    c.result.then(r => {
      if (cap === c) cap = null;
      micB.classList.remove('live'); cp.classList.remove('rec'); micB.innerHTML = ic('mic');
      if (discard) { discard = false; if (!userEdit) ta.value = ''; fit(); return; }
      if (userEdit) { fit(); return; } // 내가 고친 문장은 그대로 두고, 보내기를 누르면 그대로 전송
      if (r.text) ta.value = r.text; else if (r.sttError) toast(S.sttErrorText(r.sttError));
      fit(); if (r.text) doSend();
    });
  }
  const doSend = () => {
    const t = ta.value.trim(); if (!t) return;
    if (!waiting) { toast('아래 버튼을 눌러 진행해요'); return; }
    const w = waiting; waiting = null; ta.value = ''; fit(); qk.innerHTML = ''; chipRes = null;
    lastWho = ''; add('me', `<span class="en">${esc(t)}</span>`); w.res(t);
  };
  micB.onclick = () => { if (cap) { cap.stop(); return; } startMic(); };
  sendB.onclick = () => { if (cap) { cap.stop(); return; } doSend(); };
  enterSend(ta, () => sendB.onclick());

  // 문장: 영상 대사면 영상 보고 말하기 · 표현·단어: 저장한 영상 대사가 있으면 그 영상으로, 없으면 그 표현을 쓴 백현이 한국어 문장(AI) 번역
  const lc = t => String(t || '').toLowerCase();
  const uttForWord = w => {
    const src = w.srcId && D.get().saved.find(s => s.id === w.srcId);
    if (src?.uttId && D.utt(src.uttId)) return D.utt(src.uttId);
    const t = lc(w.text).replace(/[^a-z' ]/g, ' ').trim(); if (!t) return null;
    const us = D.get().utts.filter(u => u.ko && D.video(u.videoId));
    return us.find(u => w.note && lc(natOf(u)) === lc(w.note)) || us.find(u => (' ' + lc(natOf(u)).replace(/[^a-z' ]/g, ' ') + ' ').includes(' ' + t + ' ')) || null;
  };
  const kindOf = (it, x) => {
    if (it.t === 'g') return { mode: 'fix' }; // 문법 노트: 내가 틀렸던 문장 고쳐 말하기
    // ‘이 표현 써서 말해봐’(답장 연습)는 없음: 영상 대사 → 백현이 말 영어로 · 없으면 한국어 뜻 보고 영어로
    if (it.t === 's') { const u = x.uttId && D.utt(x.uttId); const v = u && D.video(u.videoId); if (u && u.ko) return { mode: 'say', u, v }; return { mode: 'ko' }; }
    const u = uttForWord(x); if (u) return { mode: 'say', u, v: D.video(u.videoId), expr: x.text };
    return aiOn() ? { mode: 'gen', expr: x.text } : { mode: 'ko' };
  };
  const next = () => { i++; if (dead) return; if (i >= queue.length) summary(); else card(); };

  async function card() {
    const it = queue[i]; const isW = it.t === 'w';
    const x = it.t === 'g' ? D.get().mistakes.find(m => m.id === it.id) : isW ? D.get().words.find(w => w.id === it.id) : D.get().saved.find(s => s.id === it.id);
    if (!x) return next();
    const k = kindOf(it, x);
    $('#cvi', root).textContent = `${i + 1} / ${queue.length} · ${k.mode === 'fix' ? `문법 · ${GT.TAG[x.tag]?.label || ''}` : k.mode === 'ko' ? '한국어 보고 영어로' : '백현이의 말 영어로'}`;
    $('#mt', root).style.width = `${(i / queue.length) * 100}%`;
    if (th.children.length) sys(`${i + 1} / ${queue.length}`);
    if (k.mode === 'say') return say(it, x, k);
    if (k.mode === 'gen') return gen(it, x, k);
    if (k.mode === 'fix') return fixSay(it, x);
    return koSay(it, x);
  }

  // ---- 문법 노트 연습: 전에 틀렸던 내 문장 → 맞게 고쳐서 다시 말하기 ----
  async function fixSay(it, x) {
    plw.classList.add('hide'); pl?.pause();
    const T = GT.TAG[x.tag] || { label: '', rule: '' };
    const mark = x.wrong && x.said.includes(x.wrong) ? esc(x.said).replace(esc(x.wrong), `<u class="g-wrong">${esc(x.wrong)}</u>`) : esc(x.said);
    lastWho = '';
    add('bh', `<span class="bub-tag">${esc(T.label)}</span><span class="rv-ask">전에 이렇게 말했었어!</span><span class="en big">${mark}</span>${x.ko ? `<span class="say-sub">${esc(x.ko)}</span>` : ''}<span class="rv-ask">맞게 고쳐서 다시 말해볼래?</span>`);
    await turn(it, x, { target: x.fixed, mode: 'say', ko: x.ko || '', targets: [x.fixed],
      hint: () => { lastWho = ''; add('bh', `<span class="bub-tag">힌트</span><span class="ko">${esc(T.rule)}</span>${x.why ? `<span class="say-sub">${esc(x.why)}</span>` : ''}`); },
      check: said => smartFeedback({ mode: 'translate', said, target: x.fixed, ko: x.ko || '', pattern: x.right }), rec: () => x.fixed, hl: x.right ? [x.right] : [], save: false });
  }

  // ---- ① 백현이의 말 영어로 표현하기 ----
  async function say(it, x, { u, v, expr = '' }) {
    const target = expr ? fixAddr(natOf(u)) : enOf(x);
    setLpCtx({ ko: u.ko });
    const canPlay = !!(v && v.ytId && u.end > u.start);
    plw.classList.toggle('hide', !canPlay);
    if (canPlay) player().cue(v.ytId, u.start);
    const play = () => { if (!canPlay) return; const listening = !!cap; cancelMic(); player().playSegment(v.ytId, u.start, u.end).then(r => { if (r === 'ended' && listening && !dead) autoMic(); }).catch(() => { }); };
    const t0 = typing(); await wait(380); if (dead) return; t0.remove(); lastWho = '';
    const b = add('bh', `<span class="ko rv-ko2">${esc(u.ko)}</span>${canPlay ? `<button class="rv-play" type="button">${ic('play')}<span>원본 영상 듣기</span><em>${D.fmt(u.start)}–${D.fmt(u.end)}</em></button>` : ''}<span class="rv-ask">영어로 말해볼래?</span>`);
    if (canPlay) $('.rv-play', b).onclick = e => { e.stopPropagation(); play(); };
    // 저장한 표현에 해당하는 한국어 부분 밑줄 (뜻이 그대로 있으면 바로, 아니면 AI로 찾기)
    const mx = expr || splitPatterns(x.pattern)[0] || (x.marks || [])[0] || '';
    if (mx) {
      const koEl = $('.rv-ko2', b), paint = m => { if (m && u.ko.includes(m) && !koEl.querySelector('u')) koEl.innerHTML = esc(u.ko).replace(esc(m), `<u class="rv-mark">${esc(m)}</u>`); };
      const mean = String((it.t === 'w' ? x.ko : '') || '').split(/[,·/;]/).map(t => t.trim()).filter(t => t.length > 1).find(t => u.ko.includes(t));
      if (mean) paint(mean); else aiKoMark({ ko: u.ko, en: natOf(u), expr: mx }).then(m => { if (!dead) paint(m); }).catch(() => { });
    }
    await turn(it, x, { target, mode: 'say', ko: u.ko, targets: [target], hint: () => { lastWho = ''; const hb = add('bh', `<span class="bub-tag">힌트</span><div class="bub-hint"></div>`); hintBox($('.bub-hint', hb), target, { pattern: expr || x.pattern, keywords: [] }); }, check: said => smartFeedback({ mode: 'translate', said, target, ko: u.ko, pattern: expr || x.pattern || '', expr }), rec: () => target, hl: expr ? [expr] : [...splitPatterns(x.pattern), ...(x.marks || [])], save: false });
  }

  // ---- ①-2 영상에 없는 표현: 그 표현을 쓴 백현이 한국어 문장 → 영어로 (표현은 안 보여주고 한국어에 밑줄만) ----
  async function gen(it, x, { expr }) {
    plw.classList.add('hide'); pl?.pause();
    const t0 = typing();
    const line = await aiExprSay({ expr, ko: x.ko || '', avoid: lines }); if (dead) return;
    t0.remove();
    if (!line) return koSay(it, x); // AI가 못 만들면 한국어 뜻 보고 말하기
    lines.push(line.ko); lastWho = '';
    setLpCtx({ ko: line.ko });
    const koHTML = line.mark ? esc(line.ko).replace(esc(line.mark), `<u class="rv-mark">${esc(line.mark)}</u>`) : esc(line.ko);
    add('bh', `<span class="ko rv-ko2">${koHTML}</span><span class="rv-ask">영어로 말해볼래?</span>`);
    const target = line.en;
    await turn(it, x, { target, mode: 'say', ko: line.ko, targets: [target, expr], hint: () => { lastWho = ''; const hb = add('bh', `<span class="bub-tag">힌트</span><div class="bub-hint"></div>`); hintBox($('.bub-hint', hb), target, { pattern: expr, keywords: [] }); }, check: said => smartFeedback({ mode: 'translate', said, target, ko: line.ko, pattern: expr, expr }), rec: () => target, hl: [expr], save: false });
  }

  // ---- ② 한국어 뜻 보고 영어로 (영상 대사가 없는 문장·표현) ----
  async function koSay(it, x) {
    const isW = it.t === 'w';
    plw.classList.add('hide'); pl?.pause();
    const target = isW ? x.text : enOf(x);
    let ko = x.ko || '';
    if (!ko && aiOn()) { const t0 = typing(); ko = await aiKo(target); if (dead) return; t0.remove(); if (ko && !isW) D.updateSaved(x.id, { ko }); }
    lastWho = '';
    if (ko) add('bh', `<span class="ko rv-ko2">${esc(ko)}</span><span class="rv-ask">영어로 말해볼래?</span>`);
    else { const b = add('bh', `<span class="bub-tag">이거 보고 한번 해봐!</span><span class="en big lp">${lpHTML(target)}</span>`); bindLongPress(b); }
    const pat = isW ? x.text : (splitPatterns(x.pattern)[0] || '');
    await turn(it, x, { target, mode: 'say', ko, targets: [target], hint: () => { lastWho = ''; const hb = add('bh', `<span class="bub-tag">힌트</span><div class="bub-hint"></div>`); hintBox($('.bub-hint', hb), target, { pattern: pat, keywords: [] }); },
      check: said => smartFeedback({ mode: 'translate', said, target, ko, pattern: pat, expr: isW ? x.text : '' }), rec: () => target, hl: pat ? [pat] : [], save: false });
  }

  // ---- (예전) 백현이에게 답장하기 — 지금은 안 씀 ----
  async function reply(it, x) {
    const isW = it.t === 'w';
    plw.classList.add('hide'); pl?.pause();
    const expr = isW ? x.text : (splitPatterns(x.pattern)[0] || (x.marks || [])[0] || enOf(x));
    const exprKo = isW ? (x.ko || '') : (expr === enOf(x) ? (x.ko || '') : '');
    const src = isW && x.srcId && D.get().saved.find(s => s.id === x.srcId);
    const context = isW ? (src ? enOf(src) : (x.note || '')) : enOf(x);
    const t0 = typing();
    let line = isW && x.q ? { en: x.q, ko: '' } : await aiReplyLine({ expr, ko: exprKo, context, avoid: lines });
    if (!line) { const q = isW ? questionFor({ expr: x.text, sentence: context, pattern: x.text }) : questionFor({ sentence: enOf(x), pattern: x.pattern, note: x.note, ko: x.ko }); line = { en: q.en || q.ko, ko: q.en ? q.ko : '' }; }
    if (dead) return; t0.remove(); lastWho = '';
    lines.push(line.en);
    setLpCtx({ ko: line.ko });
    const lm = add('bh', `<span class="en lp">${lpHTML(line.en)}</span>${line.ko ? `<span class="rv-sub">${esc(line.ko)}</span>` : ''}`, 'rvm');
    if (!x.q) lm.querySelector('.m-name')?.insertAdjacentHTML('beforeend', AI_MARK); // AI가 만든 연습 메시지 (✦)
    bindLongPress(lm);
    // 이번에 쓸 표현 (말풍선 아래 작게)
    th.lastElementChild.querySelector('.m-col').insertAdjacentHTML('beforeend', `<div class="rv-use"><span>이번 표현</span><b class="en">${esc(expr)}</b>${exprKo ? `<small>${esc(exprKo)}</small>` : ''}</div>`);
    scroll();
    await turn(it, x, { target: '', mode: 'reply', expr, targets: [expr], hint: line.sample ? () => { lastWho = ''; const hb = add('bh', `<span class="bub-tag">이렇게도 말할수있지!!ㅎㅎ</span><span class="en lp">${lpHTML(line.sample)}</span>`); bindLongPress(hb); } : null,
      check: said => smartFeedback({ mode: 'answer', said, question: line.en, qko: line.ko, expr, pattern: expr }), rec: (f, said) => f.natural || said, hl: [expr], save: true });
  }

  // ---- 공통: 답하기 → 바로 피드백 → (다시 말하기) → 결과 기록 ----
  const single = items.length === 1; // 복습할 게 하나뿐이면 ‘다음’ 대신 ‘종료’
  const bhSay = async text => { let n = 0; for (const l of bhLines(text)) { if (dead) return; const t = typing(); await wait(300); if (dead) return; t.remove(); lastWho = n++ ? 'bh' : ''; add('bh', `<span class="ko">${esc(l)}</span>`); } };
  async function turn(it, x, { target, mode, expr = '', ko: koLine = '', targets, hint, check, rec, hl, save }) {
    const isW = it.t === 'w';
    let snap = null, hinted = false;
    const inp = askInput(targets);
    const opts = [];
    if (hint && !hinted) opts.push(['힌트', 'hint', '', { stay: true, tap: () => { hinted = true; hint(); qk.querySelector('[data-q="hint"]')?.remove(); } }]);
    opts.push(['건너뛰기', 'skip', 'line', { stay: true, tap: () => { cancelMic(); if (waiting) { const w = waiting; waiting = null; qk.innerHTML = ''; w.res({ skip: true }); } } }]);
    chips(opts);
    autoMic();
    const said = await inp;
    if (dead) return;
    if (said && said.skip) { if (!single && !requeued.has(x.id)) { requeued.add(x.id); queue.push(it); } if (!result.again.includes(x.id)) result.again.push(x.id); return next(); }
    const ty = typing();
    const f = await check(said); if (dead) return;
    ty.remove(); lastWho = '';
    let ok = f.correct;
    if (mode === 'say' && !f.ai && !ok) { const d = diff(said, target); if (d.keyRecall >= 0.7 && !f.fixes.length) { ok = true; f.feedback = '오~~~ 거의 다 기억했다❤️'; } }
    const recS = rec(f, said);
    // 백현이 반응 = 일반 말풍선 · 교정 = 학습 영역
    if (f.feedback) await bhSay(f.feedback); if (dead) return;
    const makeSave = t => { if (isW) D.updateWord(x.id, { made: [...(D.get().words.find(w => w.id === x.id)?.made || []), { text: t, at: Date.now() }] }); return { kind: 'mine', level: 'mine', uttId: isW ? null : x.uttId, ko: f.recKo || '', text: t, before: said, en: { easy: '', natural: t, advanced: '' }, pattern: expr, note: '' }; };
    let el = add('learn', `${cmpHTML(f, { said, rec: recS, recKo: mode === 'reply' ? (f.recKo || '') : '', hl, save })}${mode === 'reply' && expr && !f.usedTarget ? `<p class="rv-tip">다음엔 <b class="en">${esc(expr)}</b>도 넣어서 말해보자ㅎㅎ</p>` : ''}`, 'wide rvfb'); lastWho = '';
    bindCompare(el, makeSave);
    D.addAttempt({ uttId: isW ? null : x.uttId, step: 'review', text: said });
    // 상태는 자동으로 안 바꾸고 내가 고름: ‘2일 후 복습’ / ‘복습완료’ (안 고르면 그대로)
    const isG = it.t === 'g';
    if (isG) D.gramResult(x.id, ok); // 문법 노트: 처음 답으로 맞았는지 기록 (3번 연속이면 ‘거의 고쳤어’)
    const rateFn = isW ? D.rateWord : D.rate;
    if (!ok && !result.again.includes(x.id)) result.again.push(x.id);
    const PICK = isG ? [['다음', 'gnext', 'pri']] : [['2일 후 복습', 'okay', 'line'], ['복습완료', 'mastered', 'pri']];
    const showRead = () => { lastWho = ''; const rb = add('bh', `<span class="bub-tag">이거 보고 한번 해봐!</span><span class="en big lp">${lpHTML(recS)}</span>${koLine || f.recKo ? `<span class="say-sub">${esc(koLine || f.recKo)}</span>` : ''}`); bindLongPress(rb); return rb; };
    // 안 보고 말하기: 추천 문장을 가리고(블러) 바로 듣기 → 정확도 % + 맞으면 칭찬 · 틀리면 어디가 아쉬웠는지 · 인식이 불확실하면 다시
    let recalled = false, read = false;
    for (;;) {
      // 틀렸으면: 보고 말하기 → 안 보고 말하기
      const list = (ok || recalled)
        ? [...(recS && !recalled ? [['안 보고 말하기', 'retry', 'line']] : []), ...PICK]
        : read ? [['안 보고 말하기', 'retry', 'line'], ...PICK] : [['보고 말하기', 'read', 'line'], ...PICK];
      const g = await chips(list, true); if (dead) return;
      if (g === 'read') {
        read = true; showRead();
        const inp1 = askInput([recS]);
        chips([['건너뛰기', 'skip', 'line', { stay: true, tap: () => { cancelMic(); if (waiting) { const w = waiting; waiting = null; qk.innerHTML = ''; w.res({ skip: true }); } } }]]);
        autoMic();
        const t1 = await inp1; if (dead) return;
        if (t1 && !t1.skip) { D.addAttempt({ uttId: isW ? null : x.uttId, step: 'review-read', text: t1 }); const me = [...$$('.msg2.me', th)].pop(); const sc = diff(t1, recS).score; $('.m-bub', me)?.insertAdjacentHTML('beforeend', `<em class="acc-b ${sc >= 85 ? 'hi' : ''}">${sc}%</em>`); }
        continue;
      }
      if (g === 'retry') {
        // 안 보고 말하기: 추천 문장 + 내 채팅 + 백현이 채팅 속 영어까지 전부 가리기
        $$('.dc-rec', el).forEach(r => r.classList.add('blur')); th.classList.add('veil'); $$('.msg2', th).forEach(m => m.classList.remove('keep'));
        const inp2 = askInput([recS]);
        chips([['건너뛰기', 'skip', 'line', { stay: true, tap: () => { cancelMic(); if (waiting) { const w = waiting; waiting = null; qk.innerHTML = ''; w.res({ skip: true }); } } }]]);
        autoMic();
        const t2 = await inp2; if (dead) return;
        $$('.dc-rec', el).forEach(r => r.classList.remove('blur')); th.classList.remove('veil');
        if (t2 && t2.skip) { recalled = true; continue; }
        D.addAttempt({ uttId: isW ? null : x.uttId, step: 'review-retry', text: t2 });
        const ty2 = typing();
        const r = await checkRetry(t2, recS, { check: s2 => smartFeedback({ mode: 'translate', said: s2, target: recS, ko: koLine || f.recKo || '' }) });
        ty2.remove(); lastWho = ''; if (dead) return;
        if (r.state !== 'unsure') { const me = [...$$('.msg2.me', th)].pop(); $('.m-bub', me)?.insertAdjacentHTML('beforeend', `<em class="acc-b ${r.score >= 85 ? 'hi' : ''}">${r.score}%</em>`); }
        await bhSay(r.msg); if (dead) return;
        if (r.state === 'ok') { recalled = true; continue; } // 맞으면 → 2일 후 / 복습완료 고르기
        // 안 보고도 틀리면: 백현이 멘트 뒤에 보고 말하기 때 문장(영어+한국어)을 다시 보여줌 → ‘안 보고 말하기’ 누르면 다시 가려짐
        if (r.state === 'retry') { read = true; showRead(); }
        continue;
      }
      if (g === 'gnext') { if (ok || recalled) result.ok++; return next(); }
      if (g === 'okay' || g === 'mastered') {
        rateFn(x.id, g); result.again = result.again.filter(id => id !== x.id);
        toast(g === 'okay' ? '2일 후에 다시 보자!' : '복습완료!');
        result.ok++; return next();
      }
      if (g === 'end') return summary();
      if (!requeued.has(x.id)) { requeued.add(x.id); queue.push(it); }
      return next();
    }
  }
  function summary() {
    cap?.stop(); pl?.destroy(); pl = null; dead = true;
    const again = result.again.filter(id => D.get().saved.some(s => s.id === id) || D.get().words.some(w => w.id === id) || D.get().mistakes.some(m => m.id === id));
    root.innerHTML = `<div class="screen full done-scr">
      <header class="top"><span class="icon-sp"></span><h2>복습 완료</h2><button class="icon-btn" id="x" aria-label="닫기">${ic('x')}</button></header>
      <div class="done-hero"><span class="done-mark">${ic('check')}</span><p>오늘 복습을 끝냈어요</p></div>
      <div class="sum two"><div><b>${result.ok}</b><span>복습 완료</span></div><div><b>${again.length}</b><span>다시 복습</span></div></div>
      ${again.length ? `<button class="btn block" id="again">${ic('refresh')} 틀린 것 다시 복습</button>` : ''}
      <button class="btn soft block mt8" id="done">SAVED로 돌아가기</button></div>`;
    const back = () => { document.body.classList.remove('no-tab'); saved(root); };
    $('#x', root).onclick = back; $('#done', root).onclick = back;
    $('#again', root) && ($('#again', root).onclick = () => review(root, again.map(id => ({ t: D.get().mistakes.some(m => m.id === id) ? 'g' : D.get().words.some(w => w.id === id) ? 'w' : 's', id }))));
  }
  card();
}
function nextLabel(snap, k) {
  const iv = D.nextInterval({ srs: snap?.srs || { interval: 0 } }, k);
  return iv === 1 ? '내일' : `${iv}일 후`;
}
