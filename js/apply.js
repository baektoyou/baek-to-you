// 패턴으로 새로운 문장 말하기 — 한 화면: 패턴 · 질문 · 빈칸 힌트 → 말하기 → 저장
import * as D from './store.js';
import { esc, $, ic, toast, micBlock } from './ui.js';
import { patternInfo, checkSentence } from './feedback.js';

// src: {ko, en, text, pattern, patternKo, question, frame, uttId, ytId, start, videoId, videoTitle}
export function patternSpeak(el, src, { onSaved, onStart } = {}) {
  const info = patternInfo(src);
  el.innerHTML = `<div class="pat-card">
      <div class="pat-top"><span class="fc-tag en-tag">패턴</span><b class="en">${esc(info.pattern || info.frame)}</b>${info.ko ? `<span class="pat-ko">${esc(info.ko)}</span>` : ''}</div>
      <p class="pat-q">${esc(info.question)}</p>
      <div class="pat-frame en">${esc(info.frame)}</div>
    </div>
    <div id="pm"></div>
    <div id="pfix"></div>
    <button class="btn line block" id="psave" disabled>${ic('bookmark')} 내 문장 저장</button>`;
  let text = '';
  const upd = t => {
    text = t; $('#psave', el).disabled = !t;
    const fb = t ? checkSentence(t, info.pattern) : null;
    const tip = fb?.issues.find(i => i.type === 'grammar' || i.type === 'pattern');
    $('#pfix', el).innerHTML = fb && fb.changed && tip ? `<button class="fix-row" id="usefix"><span class="fc-tag">이렇게 다듬어볼까요?</span><span class="en">${esc(fb.fixed)}</span><small>${esc(tip.why)} · 탭하면 적용</small></button>` : '';
    $('#usefix', el) && ($('#usefix', el).onclick = () => { m.text = fb.fixed; upd(fb.fixed); });
  };
  const m = micBlock($('#pm', el), { placeholder: info.frame, onStart, onResult: upd, onEdit: upd });
  $('#psave', el).onclick = () => {
    if (!text) return;
    const r = D.saveExpr({ kind: 'mine', level: 'mine', uttId: src.uttId || null, ko: '', text, en: { easy: '', natural: text, advanced: '' }, pattern: info.pattern, note: info.question, ytId: src.ytId || '', start: src.start ?? null, videoId: src.videoId || null, videoTitle: src.videoTitle || '' });
    D.addAttempt({ uttId: src.uttId || null, step: 'apply', text });
    toast(r.dup ? '이미 SAVED에 있어요' : 'SAVED › 내 문장에 저장했어요');
    $('#psave', el).disabled = true; $('#psave', el).innerHTML = `${ic('check')} 저장됨`;
    onSaved?.(r.item);
  };
  return { stop: () => m.stop(), get text() { return text; } };
}
