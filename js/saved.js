// SAVED — 문장 · 표현 · 단어 저장 → 질문에 영어로 대답하며 복습
// · 문장 복습 / 표현·단어 복습 모두 같은 화면: 질문 → 영어로 대답 → 자연스러운 피드백 → (맞히면 자동 복습 완료) → 마지막에만 익숙함 선택
import * as D from './store.js';
import { esc, $, $$, ic, toast, h, sheet, confirmSheet, ytLink, natOf, phrasePicker, hintBox, cmpHTML, bindCompare, setLpCtx } from './ui.js';
import { smartFeedback, aiReplyLine } from './ai.js';
import * as S from './speech.js';
import { Player } from './yt.js';
import { avatarStyle } from './scene.js';
import { BH_PROFILE } from './video.js';
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

// ---------- 복습: 백현이와 채팅하듯 ----------
// ① 백현이의 말 영어로 표현하기 — 저장한 백현이 문장: 한국어 원문 + 원본 영상 구간(저장된 시작·종료 시간) 반복 재생 → 영어로 말하기
// ② 백현이에게 답장하기 — 표현·단어·내 문장: 백현이가 먼저 건네는 연습용 메시지(AI) → 저장한 표현으로 답장 (뜻이 자연스럽게 통하면 정답)
// 답하면 바로 채팅 안에 내 문장(작게) → 추천 문장(크게, 고친 부분만 연핑크) → 이유 한 줄
const AVS = s => `<span class="m-av ph" style="${avatarStyle(BH_PROFILE, s)}"></span>`;
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
  const scroll = () => requestAnimationFrame(() => th.scrollTo({ top: th.scrollHeight, behavior: 'smooth' }));
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
  const chips = list => new Promise(res => {
    chipRes = res;
    qk.innerHTML = list.map(([l, k, cls]) => `<button class="qchip ${cls || ''}" data-q="${k}">${l}</button>`).join('');
    $$('[data-q]', qk).forEach(b => b.onclick = () => { const o = list.find(c => c[1] === b.dataset.q)?.[3]; if (o?.stay) { o.tap?.(); return; } qk.innerHTML = ''; chipRes = null; res(b.dataset.q); });
  });
  // 입력: 말하기(마이크) 또는 키보드
  const askInput = targets => new Promise(res => { ta.value = ''; fit(); waiting = { res, targets }; });
  function fit() { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; sendB.classList.toggle('on', !!ta.value.trim() || !!cap); }
  ta.oninput = fit;
  function startMic() {
    if (cap || !waiting) { if (!waiting) toast('백현이 메시지를 기다려요'); return; }
    if (!S.support.stt) { ta.focus(); toast('키보드의 받아쓰기(🎤)로 말해도 돼요'); return; }
    pl?.pause();
    micB.classList.add('live'); cp.classList.add('rec'); micB.innerHTML = ic('stop');
    const c = cap = S.capture({ stt: true, prefix: ta.value.trim(), targets: waiting.targets || [], onInterim: t => { ta.value = t; fit(); } });
    fit();
    c.result.then(r => {
      if (cap === c) cap = null;
      micB.classList.remove('live'); cp.classList.remove('rec'); micB.innerHTML = ic('mic');
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
  ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendB.onclick(); } };

  const kindOf = (it, x) => {
    if (it.t === 's') { const u = x.uttId && D.utt(x.uttId); const v = u && D.video(u.videoId); if (u && u.ko) return { mode: 'say', u, v }; }
    return { mode: 'reply' };
  };
  const next = () => { i++; if (dead) return; if (i >= queue.length) summary(); else card(); };

  async function card() {
    const it = queue[i]; const isW = it.t === 'w';
    const x = isW ? D.get().words.find(w => w.id === it.id) : D.get().saved.find(s => s.id === it.id);
    if (!x) return next();
    const k = kindOf(it, x);
    $('#cvi', root).textContent = `${i + 1} / ${queue.length} · ${k.mode === 'say' ? '백현이의 말 영어로' : '백현이에게 답장'}`;
    $('#mt', root).style.width = `${(i / queue.length) * 100}%`;
    if (th.children.length) sys(`${i + 1} / ${queue.length}`);
    if (k.mode === 'say') return say(it, x, k);
    return reply(it, x);
  }

  // ---- ① 백현이의 말 영어로 표현하기 ----
  async function say(it, x, { u, v }) {
    const target = enOf(x);
    setLpCtx({ ko: u.ko });
    const canPlay = !!(v && v.ytId && u.end > u.start);
    plw.classList.toggle('hide', !canPlay);
    if (canPlay) player().cue(v.ytId, u.start);
    const play = () => { if (!canPlay) return; player().playSegment(v.ytId, u.start, u.end).catch(() => { }); };
    const t0 = typing(); await wait(380); if (dead) return; t0.remove(); lastWho = '';
    const b = add('bh', `<span class="ko rv-ko2">${esc(u.ko)}</span>${canPlay ? `<button class="rv-play" type="button">${ic('play')}<span>원본 영상 듣기</span><em>${D.fmt(u.start)}–${D.fmt(u.end)}</em></button>` : ''}<span class="rv-ask">이 말, 영어로 해볼래?</span>`);
    if (canPlay) $('.rv-play', b).onclick = e => { e.stopPropagation(); play(); };
    await turn(it, x, { target, mode: 'say', targets: [target], hint: () => { lastWho = ''; const hb = add('bh', `<span class="bub-tag">힌트</span><div class="bub-hint"></div>`); hintBox($('.bub-hint', hb), target, { pattern: x.pattern, keywords: [] }); }, check: said => smartFeedback({ mode: 'translate', said, target, ko: u.ko, pattern: x.pattern || '' }), rec: () => target, hl: [...splitPatterns(x.pattern), ...(x.marks || [])], save: false });
  }

  // ---- ② 백현이에게 답장하기 ----
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
    add('bh', `<span class="en">${esc(line.en)}</span>${line.ko ? `<span class="rv-sub">${esc(line.ko)}</span>` : ''}<span class="rv-ai">${x.q ? '연습용 메시지' : '<i class="ai-tag">AI</i>연습용으로 만든 메시지 · 실제 발언 아님'}</span>`, 'rvm');
    // 이번에 쓸 표현 (말풍선 아래 작게)
    th.lastElementChild.querySelector('.m-col').insertAdjacentHTML('beforeend', `<div class="rv-use"><span>이번 표현</span><b class="en">${esc(expr)}</b>${exprKo ? `<small>${esc(exprKo)}</small>` : ''}</div>`);
    scroll();
    await turn(it, x, { target: '', mode: 'reply', expr, targets: [expr], hint: line.sample ? () => { lastWho = ''; add('bh', `<span class="bub-tag">이렇게도 답할 수 있어</span><span class="en">${esc(line.sample)}</span>`); } : null,
      check: said => smartFeedback({ mode: 'answer', said, question: line.en, qko: line.ko, expr, pattern: expr }), rec: (f, said) => f.natural || said, hl: [expr], save: true });
  }

  // ---- 공통: 답하기 → 바로 피드백 → 결과 기록 ----
  async function turn(it, x, { target, mode, expr = '', targets, hint, check, rec, hl, save }) {
    const isW = it.t === 'w';
    let snap = null, hinted = false;
    for (;;) {
      const inp = askInput(targets);
      const opts = [];
      if (hint && !hinted) opts.push(['힌트', 'hint', '', { stay: true, tap: () => { hinted = true; hint(); qk.querySelector('[data-q="hint"]')?.remove(); } }]);
      opts.push(['건너뛰기', 'skip', 'line', { stay: true, tap: () => { cap?.stop(); if (waiting) { const w = waiting; waiting = null; qk.innerHTML = ''; w.res({ skip: true }); } } }]);
      chips(opts);
      const said = await inp;
      if (dead) return;
      if (said && said.skip) { if (!requeued.has(x.id)) { requeued.add(x.id); queue.push(it); } if (!result.again.includes(x.id)) result.again.push(x.id); return next(); }
      const ty = typing();
      const f = await check(said); if (dead) return;
      ty.remove(); lastWho = '';
      let ok = f.correct;
      if (mode === 'say' && !f.ai && !ok) { const d = diff(said, target); if (d.keyRecall >= 0.7 && !f.fixes.length) { ok = true; f.feedback = '오, 거의 그대로 기억했네!'; } }
      const recS = rec(f, said);
      const el = add('bh', `${f.feedback ? `<p class="fb-msg">${f.ai ? '<i class="ai-tag">AI</i>' : ''}${esc(f.feedback).replace(/\n/g, '<br>')}</p>` : ''}${cmpHTML(f, { said, rec: recS, hl, save })}${mode === 'reply' && expr && !f.usedTarget ? `<p class="rv-tip">다음엔 <b class="en">${esc(expr)}</b>도 넣어서 답해봐</p>` : ''}`, 'wide rvfb');
      bindCompare(el, t => { if (isW) D.updateWord(x.id, { made: [...(D.get().words.find(w => w.id === x.id)?.made || []), { text: t, at: Date.now() }] }); return { kind: 'mine', level: 'mine', uttId: isW ? null : x.uttId, ko: f.recKo || '', text: t, before: said, en: { easy: '', natural: t, advanced: '' }, pattern: expr, note: '' }; });
      D.addAttempt({ uttId: isW ? null : x.uttId, step: 'review', text: said });
      const rateFn = isW ? D.rateWord : D.rate;
      if (snap) D.unrate(x.id, snap, isW); else snap = D.rateSnap(x.id, isW);
      rateFn(x.id, ok ? 'okay' : 'again');
      if (ok) {
        result.again = result.again.filter(id => id !== x.id);
        const g = await chips([[`어느 정도 알아요 <small>${nextLabel(snap, 'okay')}</small>`, 'okay', 'line'], [`완전히 익혔어요 <small>${nextLabel(snap, 'mastered')}</small>`, 'mastered', 'pri']]); if (dead) return;
        if (g === 'mastered') { D.unrate(x.id, snap, isW); rateFn(x.id, 'mastered'); }
        result.ok++; return next();
      }
      if (!result.again.includes(x.id)) result.again.push(x.id);
      const g = await chips([['다시 말하기', 'retry', 'pri'], ['다음', 'next', 'line']]); if (dead) return;
      if (g === 'retry') { lastWho = ''; add('bh', '<span class="ko">한 번 더 해보자 ㅎㅎ</span>'); continue; }
      if (!requeued.has(x.id)) { requeued.add(x.id); queue.push(it); }
      return next();
    }
  }
  function summary() {
    cap?.stop(); pl?.destroy(); pl = null; dead = true;
    const again = result.again.filter(id => D.get().saved.some(s => s.id === id) || D.get().words.some(w => w.id === id));
    root.innerHTML = `<div class="screen full done-scr">
      <header class="top"><span class="icon-sp"></span><h2>복습 완료</h2><button class="icon-btn" id="x" aria-label="닫기">${ic('x')}</button></header>
      <div class="done-hero"><span class="done-mark">${ic('check')}</span><p>오늘 복습을 끝냈어요</p></div>
      <div class="sum two"><div><b>${result.ok}</b><span>복습 완료</span></div><div><b>${again.length}</b><span>다시 복습</span></div></div>
      ${again.length ? `<button class="btn block" id="again">${ic('refresh')} 틀린 것 다시 복습</button>` : ''}
      <button class="btn soft block mt8" id="done">SAVED로 돌아가기</button></div>`;
    const back = () => { document.body.classList.remove('no-tab'); saved(root); };
    $('#x', root).onclick = back; $('#done', root).onclick = back;
    $('#again', root) && ($('#again', root).onclick = () => review(root, again.map(id => ({ t: D.get().words.some(w => w.id === id) ? 'w' : 's', id }))));
  }
  card();
}
function nextLabel(snap, k) {
  const iv = D.nextInterval({ srs: snap?.srs || { interval: 0 } }, k);
  return iv === 1 ? '내일' : `${iv}일 후`;
}
