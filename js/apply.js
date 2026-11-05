// 패턴으로 새로운 문장 말하기 — 패턴 · 질문 · 빈칸 → 말하기 → Before/After → 다듬은(추천) 문장 저장
import * as D from './store.js';
import { esc, $, ic, toast, micBlock, beforeAfter } from './ui.js';
import { patternInfo, improve, usesPattern } from './feedback.js';

// src: {ko, en, text, pattern, patternKo, question, frame, uttId, ytId, start, videoId, videoTitle}
// opt.expr: 저장한 표현으로 새 문장 만들기 (패턴 대신 그 표현을 꼭 넣기)
export function patternSpeak(el, src, { onSaved, onStart, expr = '' } = {}) {
  const info = expr ? { pattern: expr, ko: src.ko || '', question: '이 표현을 넣어서 내 이야기를 한 문장 말해볼까요?', frame: `… ${expr} …` } : patternInfo(src);
  el.innerHTML = `<div class="pat-card ${expr ? 'expr-q' : ''}">
      ${expr ? '' : `<div class="pat-top"><span class="fc-tag en-tag">패턴</span><b class="en">${esc(info.pattern || info.frame)}</b>${info.ko ? `<span class="pat-ko">${esc(info.ko)}</span>` : ''}</div>`}
      <p class="pat-q">${esc(info.question)}</p>
      <div class="pat-frame en">${esc(info.frame)}</div>
    </div>
    <div id="pm"></div>
    <div id="pfix"></div>
    <button class="btn block" id="psave" disabled>${ic('bookmark')} 추천 문장 저장</button>`;
  let text = '', fixed = '', seq = 0;
  const upd = async t => {
    text = t; const my = ++seq;
    $('#psave', el).disabled = !t;
    if (!t) { $('#pfix', el).innerHTML = ''; fixed = ''; return; }
    $('#pfix', el).innerHTML = `<div class="ba-loading"><i></i><i></i><i></i><span>문장 다듬는 중</span></div>`;
    const r = await improve(t, { pattern: info.pattern, useLT: D.get().settings.autoLT !== false });
    if (my !== seq) return;
    fixed = r.after;
    const uses = info.pattern ? usesPattern(fixed, info.pattern) !== false : true;
    $('#pfix', el).innerHTML = beforeAfter({ before: t, after: fixed, changes: r.changes, pattern: info.pattern, afterLabel: '저장할 추천 문장' })
      + (uses ? '' : `<p class="ba-note">${expr ? '표현' : '패턴'} <b class="en">${esc(info.pattern)}</b>이 아직 안 들어갔어요. 넣어서 다시 말해볼까요?</p>`);
  };
  const m = micBlock($('#pm', el), { placeholder: info.frame, onStart, onResult: upd, onEdit: t => { clearTimeout(m._t); m._t = setTimeout(() => upd(t), 700); } });
  $('#psave', el).onclick = () => {
    const save = fixed || text; if (!save) return;
    const r = D.saveExpr({ kind: 'mine', level: 'mine', uttId: src.uttId || null, ko: '', text: save, before: text, en: { easy: '', natural: save, advanced: '' }, pattern: info.pattern, note: info.question, ytId: src.ytId || '', start: src.start ?? null, videoId: src.videoId || null, videoTitle: src.videoTitle || '' });
    D.addAttempt({ uttId: src.uttId || null, step: 'apply', text });
    toast(r.dup ? '이미 SAVED에 있어요' : 'SAVED › 내 문장에 저장했어요');
    $('#psave', el).disabled = true; $('#psave', el).innerHTML = `${ic('check')} 저장됨`;
    onSaved?.(r.item, { text, fixed: save });
  };
  return { stop: () => m.stop(), get text() { return text; }, get fixed() { return fixed; } };
}
