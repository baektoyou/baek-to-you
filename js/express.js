// 즉석 영어 표현 — 하고 싶은 말을 한국어로(음성·텍스트) → 바로 자연스러운 영어 문장
// · CALL 페이지의 독립 기능 (CHAT·CALL 대화 흐름과 상관없이 필요할 때 실행) · CHAT 첫 화면에서도 바로 들어올 수 있어요
// · 영어 문장 · 한국어 뜻 · 발음 듣기(기기 음성) · 따라 말하기 · 안 보고 다시 말하기(블러)
// · 번역은 AI(SETTINGS › AI 키)가 있어야 해요 — 없으면 가짜 결과를 만들지 않고 안내만
import * as D from './store.js';
import * as S from './speech.js';
import { esc, $, $$, ic, toast, h, cmpHTML, bindCompare, lpHTML, bindLongPress, bhLines, checkRetry } from './ui.js';
import { aiExpress, aiOn, smartFeedback } from './ai.js';

const KEY = () => 'baek-to-you:express:' + D.accountKey();
const hist = () => { try { return JSON.parse(localStorage.getItem(KEY()) || '[]'); } catch { return []; } };
const pushHist = x => { try { localStorage.setItem(KEY(), JSON.stringify([x, ...hist().filter(y => y.src !== x.src)].slice(0, 20))); } catch { } };

export function express(root) {
  let dead = false, cap = null, cur = null, tts = null;
  root.innerHTML = `<div class="screen express">
    <header class="top"><a class="icon-btn" href="#/talk" id="exb" aria-label="뒤로">${ic('back')}</a><h2>즉석 영어 표현</h2><span class="icon-btn ghost"></span></header>
    <p class="ex-lead">하고 싶은 말을 한국어로 말하거나 적어봐요<br><small>바로 자연스러운 영어로 바꿔줄게요</small></p>
    <div class="ex-in">
      <textarea id="exk" rows="2" placeholder="예) 오늘 너무 피곤해서 일찍 잘 거야" autocapitalize="off" spellcheck="false"></textarea>
      <div class="ex-row">
        <button class="ex-mic" id="exm" aria-label="한국어로 말하기">${ic('mic')}<span>말하기</span></button>
        <button class="btn sm" id="exg">${ic('sparkle')} 영어로</button>
      </div>
    </div>
    <div id="exo"></div>
    <div id="exh"></div>
  </div>`;
  const ta = $('#exk', root), out = $('#exo', root), micB = $('#exm', root);
  const stopAll = () => { cap?.stop(); tts?.stop(); };

  // ----- 한국어 입력: 음성(ko-KR) 또는 키보드 -----
  micB.onclick = () => {
    if (cap) { cap.stop(); return; }
    if (!S.support.stt) { ta.focus(); toast('키보드의 받아쓰기(🎤)로 말해도 돼요'); return; }
    tts?.stop();
    micB.classList.add('live'); micB.querySelector('span').textContent = '듣는 중';
    const prefix = ta.value.trim(); let edited = false; ta.oninput = () => { edited = true; };
    const c = cap = S.capture({ stt: true, lang: 'ko-KR', prefix, onInterim: t => { if (!edited) ta.value = t; } });
    c.result.then(r => {
      if (cap === c) cap = null; ta.oninput = null; if (dead) return;
      micB.classList.remove('live'); micB.querySelector('span').textContent = '말하기';
      if (!edited && r.text) ta.value = r.text;
      if (!r.text && r.sttError) toast(r.sttError === 'language-not-supported' ? '이 기기에서 한국어 음성 인식을 지원하지 않아요 · 키보드로 적어주세요' : S.sttErrorText(r.sttError));
      if (ta.value.trim() && !edited) go();
    });
  };
  $('#exg', root).onclick = () => { if (cap) { cap.stop(); return; } go(); };
  ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); go(); } };

  async function go() {
    const ko = ta.value.trim(); if (!ko) { toast('하고 싶은 말을 먼저 적거나 말해줘요'); return; }
    if (!aiOn()) { out.innerHTML = `<div class="ex-card off"><p>영어로 바꾸려면 AI 키가 필요해요.<br><small>SETTINGS › AI에서 Gemini 무료 키를 넣으면 바로 쓸 수 있어요.</small></p><a class="btn sm soft mt12" href="#/settings">SETTINGS로</a></div>`; return; }
    out.innerHTML = `<div class="ex-card load"><span class="typing3"><i></i><i></i><i></i></span></div>`;
    const r = await aiExpress(ko); if (dead) return;
    if (r.error) { out.innerHTML = `<div class="ex-card off"><p>${r.error === 'off' ? 'AI 키를 확인해주세요 (SETTINGS › AI)' : '지금은 바꾸지 못했어요 · 잠시 뒤 다시 눌러주세요'}</p></div>`; return; }
    cur = { ...r, src: ko, at: Date.now() }; pushHist(cur); show(cur); drawHist();
  }

  // ----- 결과: 영어 · 뜻 · 발음 듣기 · 저장 · 따라 말하기 / 안 보고 말하기 -----
  function show(x) {
    stopAll();
    const saved = !!D.findSavedByText(x.en);
    out.innerHTML = `<div class="ex-card">
      <p class="ex-src">${esc(x.src)}</p>
      <div class="ex-main"><p class="ex-en en lp" id="exen">${lpHTML(x.en)}</p>
        <div class="ex-btns"><button class="ex-ib" id="exl" aria-label="발음 듣기">${ic('speaker')}</button><button class="ex-ib sv ${saved ? 'on' : ''}" id="exs" aria-label="문장 저장">${ic('bookmark')}</button></div></div>
      ${x.ko && x.ko.replace(/[\s.,!?~]/g, '') !== String(x.src || '').replace(/[\s.,!?~]/g, '') ? `<p class="ex-ko">${esc(x.ko)}</p>` : ''}
      ${x.alt ? `<p class="ex-alt"><span>이렇게도</span><b class="en lp">${lpHTML(x.alt)}</b></p>` : ''}
      ${x.tip ? `<p class="ex-tip">${esc(x.tip)}</p>` : ''}
      <div class="ex-prac"><button class="btn sm soft" id="exr">${ic('mic')} 따라 말하기</button><button class="btn sm" id="exq">${ic('eye')} 안 보고 말하기</button></div>
      <div id="exp"></div>
    </div>`;
    bindLongPress(out);
    const enEl = $('#exen', out), card = $('.ex-card', out), res = $('#exp', out);
    $('#exl', out).onclick = () => { tts?.stop(); if (!S.support.tts) { toast('이 기기에서는 음성 재생을 지원하지 않아요'); return; } const ws = $$('.w', enEl); tts = S.speak(x.en, { onWord: i => ws.forEach((w, k) => w.classList.toggle('on', k === i)), onEnd: () => ws.forEach(w => w.classList.remove('on')) }); };
    $('#exs', out).onclick = e => {
      const ex = D.findSavedByText(x.en);
      if (ex) { D.deleteSaved(ex.id); e.currentTarget.classList.remove('on'); toast('저장을 취소했어요'); }
      else { D.saveExpr({ kind: 'mine', level: 'mine', ko: x.ko || x.src, text: x.en, before: '', en: { easy: '', natural: x.en, advanced: '' }, pattern: '' }); e.currentTarget.classList.add('on'); toast('SAVED에 저장했어요'); }
    };
    const practice = blur => {
      if (cap) { cap.stop(); return; }
      if (!S.support.stt) { toast('이 브라우저는 음성 인식이 안 돼요'); return; }
      tts?.stop(); card.classList.toggle('blur', blur);
      const btn = $(blur ? '#exq' : '#exr', out); btn.classList.add('live'); const lab = btn.innerHTML; btn.innerHTML = `${ic('stop')} 다 말했어`;
      res.innerHTML = `<p class="ex-live en">…</p>`;
      const c = cap = S.capture({ stt: true, targets: [x.en], onInterim: t => { const l = $('.ex-live', res); if (l) l.textContent = t || '…'; } });
      c.result.then(async r => {
        if (cap === c) cap = null; if (dead) return;
        btn.classList.remove('live'); btn.innerHTML = lab;
        if (!r.text) { card.classList.remove('blur'); res.innerHTML = `<p class="ex-msg">${esc(r.sttError ? S.sttErrorText(r.sttError) : '잘 안 들렸어요 · 다시 눌러 말해줘요')}</p>`; return; }
        res.innerHTML = `<p class="ex-msg"><span class="typing3"><i></i><i></i><i></i></span></p>`;
        const rr = await checkRetry(r.text, x.en, { check: s => smartFeedback({ mode: 'translate', said: s, target: x.en, ko: x.src }) }); if (dead) return;
        card.classList.remove('blur');
        D.addAttempt({ uttId: null, step: blur ? 'express-recall' : 'express-read', text: r.text });
        res.innerHTML = `<div class="ex-res ${rr.state}"><p class="ex-msg">${bhLines(rr.msg).map(esc).join('<br>')}</p>${rr.state === 'ok' ? '' : cmpHTML(rr.f || { natural: x.en, fixes: [] }, { said: r.text, rec: x.en, save: false })}</div>`;
        bindCompare(res);
      });
    };
    $('#exr', out).onclick = () => practice(false);
    $('#exq', out).onclick = () => practice(true);
  }

  // ----- 최근 -----
  function drawHist() {
    const list = hist().filter(y => y.src && (!cur || y.src !== cur.src)).slice(0, 8);
    $('#exh', root).innerHTML = list.length ? `<div class="label ex-hl">최근</div><div class="ex-list">${list.map((y, i) => `<button class="ex-li" data-i="${i}"><b class="en">${esc(y.en)}</b><small>${esc(y.src)}</small></button>`).join('')}</div>` : '';
    $$('[data-i]', root).forEach(b => b.onclick = () => { cur = list[+b.dataset.i]; ta.value = cur.src; show(cur); drawHist(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }
  drawHist();
  return () => { dead = true; stopAll(); };
}
