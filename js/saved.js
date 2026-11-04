// SAVED — RECALL → SPEAK → CHECK → REUSE + 간격 반복
import * as D from './store.js';
import * as S from './speech.js';
import { esc, $, $$, ic, toast, sheet, micBlock, compareCard, levelsOf, shadowBlock, confirmSheet } from './ui.js';
import { markPattern } from './compare.js';

let filter = 'due';
const KIND = { utt: '영상 표현', talk: 'TALK 답변', mine: '내 문장' };

export function saved(root) {
  const db = D.get(); const due = D.dueList();
  const lists = {
    due, hard: db.saved.filter(s => s.hard), all: db.saved, mine: db.saved.filter(s => s.kind === 'mine' || s.kind === 'talk')
  };
  const items = lists[filter];
  // 최근 28일 활동
  const days = [...Array(28)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 27 + i); const n = db.days[D.today(d)] || 0; return n; });
  const streak = (() => { let s = 0; for (let i = 0; i < 400; i++) { const d = new Date(); d.setDate(d.getDate() - i); if (db.days[D.today(d)]) s++; else if (i > 0) break; } return s; })();
  root.innerHTML = `<div class="screen">
    <div class="top"><div class="logo"><i>♥</i><h1>SAVED</h1></div><span class="chip pink">🔥 ${streak}일 연속</span></div>
    <div class="hero" style="flex-direction:column;align-items:stretch">
      <div class="row"><div class="grow"><div class="big">${due.length}</div><span class="small muted">지금 복습할 표현 · 어려운 표현 먼저</span></div>
      <button class="btn" id="go" ${due.length ? '' : 'disabled'}>${ic('play')} 복습 시작</button></div>
      <div class="cal" style="margin-top:14px">${days.map(n => `<i class="${n >= 12 ? 'l3' : n >= 5 ? 'l2' : n ? 'l1' : ''}"></i>`).join('')}</div>
      <div class="tiny muted" style="margin-top:6px">최근 4주 학습 기록 · 총 ${db.attempts.length}번 말했어요</div>
    </div>
    <div class="seg" style="margin-bottom:14px">${[['due', `복습 ${due.length}`], ['hard', '어려움'], ['all', `전체 ${db.saved.length}`], ['mine', '내 문장']].map(([k, l]) => `<button data-f="${k}" class="${filter === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${items.length ? `<div class="stack">${items.map(s => itemHTML(s)).join('')}</div>` : `<div class="empty"><div class="emo">${filter === 'due' ? '🎉' : '💌'}</div><b>${filter === 'due' ? '지금 복습할 표현이 없어요' : '아직 저장한 표현이 없어요'}</b>${filter === 'due' ? '다음 복습 시간에 다시 알려드릴게요.' : 'VIDEO나 TALK에서 ♡를 눌러 저장해보세요.'}</div>`}
    ${filter === 'all' && db.talkLogs.length ? `<div class="sec-title label">최근 TALK 기록</div><div class="list">${db.talkLogs.slice(0, 5).map(l => `<div class="li"><div class="ic">${ic('talk')}</div><div class="grow"><b>${new Date(l.at).toLocaleDateString('ko-KR')} · ${Math.floor(l.sec / 60)}분 ${l.sec % 60}초</b><small>영어 답변 ${l.turns}번 · 클립 ${l.clips}개</small></div></div>`).join('')}</div>` : ''}
  </div>`;
  $$('[data-f]', root).forEach(b => b.onclick = () => { filter = b.dataset.f; saved(root); });
  $('#go', root).onclick = () => review(root, due.map(s => s.id));
  root.onclick = async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const id = b.closest('[data-id]').dataset.id, s = D.get().saved.find(x => x.id === id); if (!s) return;
    const a = b.dataset.act;
    if (a === 'tts') S.speak(s.en.natural || s.text || s.en.easy);
    if (a === 'mine' && s.audioId) { const blob = await D.AudioStore.get(s.audioId); if (blob) S.playUrl(URL.createObjectURL(blob)); else toast('녹음이 없어요'); }
    if (a === 'hard') { D.toggleHard(id); saved(root); }
    if (a === 'one') review(root, [id]);
    if (a === 'del' && await confirmSheet('이 표현을 삭제할까요?')) { D.deleteSaved(id); saved(root); }
  };
}
function itemHTML(s) {
  const en = s.kind === 'utt' ? (s.en.natural || s.en.easy || s.en.advanced) : s.text;
  const u = s.uttId ? D.utt(s.uttId) : null;
  const due = s.srs.due <= Date.now() ? '지금' : relTime(s.srs.due);
  return `<div class="sitem" data-id="${s.id}">
    <div class="row" style="margin-bottom:6px"><span class="chip ${s.kind === 'utt' ? 'pink' : ''}">${KIND[s.kind]}</span>${s.hard ? '<span class="chip ink">어려움</span>' : ''}</div>
    ${s.ko ? `<div class="ko">${esc(s.ko)}</div>` : ''}<div class="en">${markPattern(en || '', s.pattern, esc)}</div>
    <div class="foot"><span class="muted">복습 ${esc(due)} · ${s.srs.reps}회</span>
      ${u ? `<a class="mini" href="#/study/${u.id}" aria-label="원본 영상">${ic('video')}</a>` : ''}
      ${s.audioId ? `<button class="mini" data-act="mine" aria-label="내 녹음">${ic('mic')}</button>` : ''}
      <button class="mini" data-act="tts" aria-label="듣기">${ic('speaker')}</button>
      <button class="mini ${s.hard ? 'on' : ''}" data-act="hard" aria-label="어려움">${ic('star')}</button>
      <button class="mini" data-act="one" aria-label="복습">${ic('play')}</button>
      <button class="mini" data-act="del" aria-label="삭제">${ic('trash')}</button></div></div>`;
}
function relTime(t) { const d = t - Date.now(); const h = d / 36e5; if (h < 1) return `${Math.max(1, Math.round(d / 6e4))}분 후`; if (h < 24) return `${Math.round(h)}시간 후`; return `${Math.round(h / 24)}일 후`; }

// ---------- 복습 세션 ----------
function review(root, ids) {
  let i = 0, stopFns = [];
  document.body.classList.add('no-tab');
  const end = () => { stopFns.forEach(f => f()); document.body.classList.remove('no-tab'); saved(root); };
  const next = () => { stopFns.forEach(f => f()); stopFns = []; i++; if (i >= ids.length) { toast('복습 완료! 잘했어요 ✦'); end(); } else card(); };
  function card() {
    const s = D.get().saved.find(x => x.id === ids[i]); if (!s) return next();
    const u = s.uttId ? D.utt(s.uttId) : null;
    const isMine = s.kind !== 'utt';
    const target = isMine ? s.text : (s.en.natural || s.en.easy || s.en.advanced);
    const cands = isMine ? [{ label: '내 문장', text: s.text }] : levelsOf({ en: s.en, alts: u?.alts || [] });
    let answer = '';
    root.innerHTML = `<div class="screen full">
      <div class="top"><button class="icon-btn" id="x">${ic('x')}</button><h2 style="text-align:center">${i + 1} / ${ids.length}</h2><span style="width:40px"></span></div>
      <div class="meter" style="margin-bottom:16px"><i style="width:${(i / ids.length) * 100}%"></i></div>
      <div class="step-title">RECALL</div><p class="step-desc">${isMine ? '내가 만든 문장을 떠올려 말해보세요.' : '영어로 어떻게 말할지 먼저 떠올려요.'}</p>
      <div class="card pink"><div class="ko-big">${esc(s.ko || (isMine ? '(한국어 메모 없음 · 내 문장을 떠올려보세요)' : ''))}</div>
      ${s.pattern ? `<div class="pattern" style="background:#fff"><b>PATTERN</b><span class="en">${esc(s.pattern)}</span></div>` : ''}
      ${u ? `<a class="chip line" style="margin-top:12px;text-decoration:none;color:inherit" href="#/study/${u.id}">${ic('video')} 원본 영상 ${D.fmt(u.start)}</a>` : ''}</div>
      <div class="step-title" style="margin-top:18px">SPEAK</div><div id="m"></div>
      <button class="btn block" id="chk">CHECK · 정답 보기</button>
      <div id="ans" class="hide" style="margin-top:16px">
        <div class="step-title">CHECK</div>
        <div class="card" style="border:1.5px solid var(--ink)">${cands.filter(c => c.text).map(c => `<div style="margin-bottom:12px"><div class="label">${esc(c.label)}</div><div class="row"><div class="en-big grow" style="font-size:18px">${markPattern(c.text, s.pattern, esc)}</div><button class="mini" data-tts="${esc(c.text)}">${ic('speaker')}</button></div></div>`).join('')}</div>
        <div id="cmp" style="margin-top:12px"></div>
        <details class="adv" style="margin-top:8px"><summary>SHADOW · 따라 말하기</summary><div id="sh" style="margin-top:8px"></div></details>
        <div class="step-title" style="margin-top:16px">얼마나 쉬웠나요?</div>
        <div class="grades"><button data-q="0">다시<small>10분 후</small></button><button data-q="1">어려움<small>${nextLabel(s, 1)}</small></button><button data-q="2">좋음<small>${nextLabel(s, 2)}</small></button><button data-q="3">쉬움<small>${nextLabel(s, 3)}</small></button></div>
        <div class="step-title" style="margin-top:18px">REUSE</div><p class="step-desc">이 표현으로 새 문장을 말하고 저장해요 (선택)</p>
        <div id="m2"></div><button class="btn block soft" id="reuse" disabled>${ic('heart')} 내 문장으로 저장</button>
      </div></div>`;
    $('#x', root).onclick = end;
    const m = micBlock($('#m', root), { onResult: t => (answer = t), onEdit: t => (answer = t) });
    $('#chk', root).onclick = () => {
      answer = m.text; $('#ans', root).classList.remove('hide'); $('#chk', root).classList.add('hide');
      $('#cmp', root).innerHTML = compareCard(answer, cands);
      if (answer) D.addAttempt({ uttId: s.uttId, step: 'review', text: answer });
      const sh = shadowBlock($('#sh', root), target || ''); stopFns.push(sh.stop);
      $('#ans', root).scrollIntoView({ behavior: 'smooth' });
    };
    root.onclick = e => { const t = e.target.closest('[data-tts]'); if (t) S.speak(t.dataset.tts); };
    $$('[data-q]', root).forEach(b => b.onclick = () => { D.grade(s.id, +b.dataset.q); next(); });
    const m2 = micBlock($('#m2', root), { record: true, placeholder: '새 문장을 말하거나 입력', onResult: t => ($('#reuse', root).disabled = !t), onEdit: t => ($('#reuse', root).disabled = !t) });
    $('#reuse', root).onclick = async () => {
      let audioId = null; const r = m2.res;
      if (r?.blob) { audioId = D.uid(); try { await D.AudioStore.put(audioId, r.blob); } catch { audioId = null; } }
      D.saveExpr({ kind: 'mine', uttId: s.uttId, ko: '', text: m2.text, en: { easy: '', natural: m2.text, advanced: '' }, pattern: s.pattern, audioId });
      toast('내 문장 저장 ✦'); $('#reuse', root).disabled = true;
    };
    window.scrollTo(0, 0);
  }
  card();
}
function nextLabel(s, q) {
  const r = s.srs; let iv;
  if (r.reps === 0) iv = q === 3 ? 3 : 1; else if (r.reps === 1) iv = q === 1 ? 2 : q === 3 ? 6 : 4;
  else iv = Math.round(r.interval * (q === 1 ? 1.2 : r.ease) * (q === 3 ? 1.3 : 1));
  return `${iv}일 후`;
}
