// 백현이랑 영어 채팅 (CALL › 백현이랑 대화하기 아래) — 영상·대본 없이 AI 백현이와 자유롭게 영어로 1:1 메신저
// · 말풍선(내 것·백현이 것)을 누르면 한국어 뜻 ↔ 영어
// · 내 영어가 어색하면 내 말풍선 아래 작은 ‘더 자연스럽게’ 버튼 → 눌렀을 때만 추천 표현 (대화 흐름 방해 X)
// · 답장 힌트: 영어 예시 2~3개 → 누르면 입력창에 들어가서 고쳐서 보내기
// · 난이도: 자동(내 영어에 맞춤) / 쉽게 / 보통 / 원어민처럼 · 대화 기록은 이 기기에 저장 (계정별)
// · AI 키가 없으면 가짜 답장을 만들지 않고 안내만
import * as D from './store.js';
import * as S from './speech.js';
import { esc, $, $$, ic, toast, h, sheet, confirmSheet, cmpHTML, bindCompare, enterSend, autoFollow } from './ui.js';
import { avatarStyle } from './scene.js';
import { BH_PROFILE } from './video.js';
import { aiOn, aiDM, aiDMHint, aiDMKo, AI_ERR } from './ai.js';

const KEY = () => 'baek-to-you:dm:' + D.accountKey();
const META = () => 'baek-to-you:dm-meta:' + D.accountKey();
const load = () => { try { return JSON.parse(localStorage.getItem(KEY()) || '[]'); } catch { return []; } };
const save = list => { try { localStorage.setItem(KEY(), JSON.stringify(list.slice(-3000))); } catch { } };
const meta = () => { try { return { level: 'auto', est: 'mid', ...JSON.parse(localStorage.getItem(META()) || '{}') }; } catch { return { level: 'auto', est: 'mid' }; } };
const setMeta = p => { try { localStorage.setItem(META(), JSON.stringify({ ...meta(), ...p })); } catch { } };
const LV = { auto: '자동', easy: '쉽게', mid: '보통', hard: '원어민처럼' };
const wait = ms => new Promise(r => setTimeout(r, ms));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const hm = t => { const d = new Date(t); const H = d.getHours(); return `${H < 12 ? '오전' : '오후'} ${H % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`; };
// 날짜는 한국 시간 기준 (자정이 지나면 새 대화)
const kday = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
const dayKey = kday;
const ymd = d => d.split('-').map(Number);
const dayText = t => { const [y, m, d] = ymd(kday(t)); const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return `${y}년 ${m}월 ${d}일 ${'일월화수목금토'[w]}요일`; };
const dayShort = d => { const [, m, dd] = ymd(d); return `${d === kday() ? '오늘 · ' : ''}${m}월 ${dd}일`; };

export function dm(root) {
  let dead = false, cap = null, busy = false, pumpT = null;
  let list = load();
  document.body.classList.add('no-tab');
  const AV = s => `<span class="m-av ph" style="${avatarStyle(BH_PROFILE, s)}"></span>`;
  root.innerHTML = `<div class="chatv dm">
    <header class="cv-top"><a class="icon-btn" href="#/talk" aria-label="뒤로">${ic('back')}</a>
      <div class="cv-title">${AV(30)}<div><b>백현이</b><button class="dm-date" id="dmd" type="button"><span id="dms"></span>${ic('clock')}</button></div></div>
      <button class="icon-btn" id="dmo" aria-label="채팅 설정">${ic('settings')}</button></header>
    <div class="thread" id="th"></div>
    <div class="dm-hints hide" id="dmh"></div>
    <div class="dm-past hide" id="dmp"><span>지난 대화는 볼 수만 있어</span><button class="btn sm" id="dmtoday" type="button">오늘 대화로</button></div>
    <div class="composer on" id="cp">
      <button class="cp-mic" id="cpm" aria-label="영어로 말하기">${ic('mic')}</button>
      <button class="cp-q dm-hb" id="cph" aria-label="답장 힌트">${ic('bulb')}</button>
      <textarea id="cpt" rows="1" placeholder="영어로 메시지 보내기" autocapitalize="sentences" spellcheck="false"></textarea>
      <button class="cp-send" id="cps" aria-label="보내기">${ic('send')}</button>
    </div>
  </div>`;
  const th = $('#th', root), ta = $('#cpt', root), sendB = $('#cps', root), micB = $('#cpm', root), hb = $('#cph', root), hints = $('#dmh', root), status = $('#dms', root);
  const scroll = autoFollow(th);
  let viewDay = kday();
  const isToday = () => viewDay === kday();
  const todays = () => list.filter(m => kday(m.at) === kday());
  const setStatus = () => { status.textContent = dayShort(viewDay); };
  const level = () => { const m = meta(); return m.level === 'auto' ? (m.est || 'mid') : m.level; };
  const persist = () => save(list);

  // ----- 말풍선 그리기 -----
  let lastWho = '', lastDay = '', lastEl = null;
  function bubble(m, { anim = true } = {}) {
    const dk = dayKey(m.at);
    if (dk !== lastDay) { th.appendChild(h(`<div class="dm-day"><span>${esc(dayText(m.at))}</span></div>`)); lastDay = dk; lastWho = ''; }
    const first = m.who !== lastWho; lastWho = m.who;
    // 같은 사람이 같은 분에 연달아 보낸 말풍선은 마지막 것에만 시간
    if (lastEl && lastEl.dataset.who === m.who && lastEl.dataset.min === hm(m.at)) lastEl.querySelector('.dm-time')?.classList.add('hide');
    const bh = m.who === 'bh';
    const el = h(`<div class="msg2 ${bh ? 'bh' : 'me'} ${first ? 'first' : ''} ${anim ? '' : 'still'}" data-id="${m.id}" data-who="${m.who}" data-min="${hm(m.at)}">
      ${bh ? (first ? AV(34) : '<span class="m-av sp"></span>') : ''}
      <div class="m-col">${bh && first ? '<span class="m-name">백현이</span>' : ''}
        <div class="dm-row">${bh ? '' : `<span class="dm-meta"><i class="dm-un ${m.read ? 'hide' : ''}">1</i><span class="dm-time">${hm(m.at)}</span></span>`}<button class="m-bub dm-b" type="button"><span class="en">${esc(m.en)}</span>${bh ? `<span class="dm-ko">${esc(m.ko || '')}</span>` : ''}</button>${bh ? `<span class="dm-meta"><span class="dm-time">${hm(m.at)}</span></span>` : ''}</div>
        ${!bh && m.fix ? fixBtn(m) : ''}${bh ? '<div class="dm-act hide"></div>' : ''}
      </div></div>`);
    $('.dm-b', el).onclick = () => bh ? saveAct(m, el) : flip(m, el);
    if (bh && !m.ko) needKo(m, el);
    bindFix(m, el);
    th.appendChild(el); lastEl = el; return el;
  }
  const fixBtn = m => `<button class="dm-fixb" type="button">${ic('sparkle')}<span>더 자연스럽게</span></button><div class="dm-fix hide"></div>`;
  function bindFix(m, el) {
    const b = $('.dm-fixb', el); if (!b) return;
    b.onclick = () => {
      const box = $('.dm-fix', el), open = box.classList.toggle('hide') === false;
      b.classList.toggle('on', open);
      if (open && !box.innerHTML) {
        box.innerHTML = `${cmpHTML({}, { said: m.en, rec: m.fix.natural, save: true })}${m.fix.why ? `<p class="dm-why">${esc(m.fix.why)}</p>` : ''}`;
        bindCompare(box);
      }
    };
  }
  // 백현이 말풍선: 누르면 작은 ‘문장 저장 ♡’ (이미 저장했으면 하트 채워짐 · 중복 저장 X) → SAVED › 문장 › 내 문장
  function saveAct(m, el) {
    const act = $('.dm-act', el); if (!act) return;
    if (!act.classList.contains('hide')) { act.classList.add('hide'); return; }
    $$('.dm-act:not(.hide)', th).forEach(x => x.classList.add('hide'));
    const done = () => !!D.findSavedByText(m.en);
    const draw = () => { const on = done(); act.innerHTML = `<button class="dm-svb ${on ? 'on' : ''}" type="button">${on ? '저장했어' : '문장 저장'} <i>${on ? '♥' : '♡'}</i></button>`; $('.dm-svb', act).onclick = e => { e.stopPropagation(); if (done()) { toast('이미 저장한 문장이야 ♡'); return; } D.saveExpr({ kind: 'mine', level: 'mine', src: 'dm', ko: m.ko || '', text: m.en, en: { easy: '', natural: m.en, advanced: '' }, note: '' }); draw(); toast('저장했어 ♡'); window.dispatchEvent(new CustomEvent('b2u:words')); }; };
    draw(); act.classList.remove('hide');
  }
  // 예전 기록에 뜻이 없으면 한 번만 받아서 채움 (차례대로)
  let koQ = Promise.resolve();
  function needKo(m, el) {
    if (!aiOn()) return;
    koQ = koQ.then(async () => { if (dead || m.ko) return; const ko = await aiDMKo(m.en); if (dead || !ko) return; m.ko = ko; persist(); const k = $('.dm-ko', el); if (k) k.textContent = ko; });
  }
  // 내 말풍선: 누르면 한국어 뜻 ↔ 영어
  async function flip(m, el) {
    const sp = $('.dm-b > span', el), toKo = !el.classList.contains('ko');
    if (!toKo) { el.classList.remove('ko'); sp.className = 'en'; sp.textContent = m.en; return; }
    if (!m.ko) {
      if (!aiOn()) { toast('한국어 뜻은 AI 키가 있어야 볼 수 있어'); return; }
      el.classList.add('loading'); const ko = await aiDMKo(m.en); el.classList.remove('loading'); if (dead) return;
      if (!ko) { toast('뜻을 못 불러왔어 · 다시 눌러줘'); return; }
      m.ko = ko; persist();
    }
    el.classList.add('ko'); sp.className = 'ko'; sp.textContent = m.ko;
  }

  // ----- 날짜별 화면: 오늘은 대화 · 지난 날은 보기만 -----
  function render() {
    th.innerHTML = ''; lastWho = lastDay = ''; lastEl = null;
    const day = list.filter(m => kday(m.at) === viewDay);
    day.forEach(m => bubble(m, { anim: false }));
    const today = isToday();
    if (today && !day.length) th.appendChild(h(`<div class="dm-empty">${AV(64)}<b>나랑 얘기하자~~</b><p>나랑 얘기하자! 말풍선을 누르면 한국어 뜻도 볼 수 있어 ♡</p></div>`));
    if (!today && !day.length) th.appendChild(h(`<div class="dm-empty"><p>이 날은 나눈 대화가 없어</p></div>`));
    if (today && !aiOn()) th.appendChild(h(`<div class="dm-off">답장을 받으려면 AI 키가 필요해요.<br><small>SETTINGS › AI에서 Gemini 무료 키를 넣으면 바로 쓸 수 있어요.</small><a class="btn sm soft mt12" href="#/settings">SETTINGS로</a></div>`));
    $('#cp', root).classList.toggle('hide', !today); $('#dmp', root).classList.toggle('hide', today);
    if (!today) closeHints();
    setStatus();
    requestAnimationFrame(() => { th.scrollTop = th.scrollHeight; });
  }
  const goDay = d => { viewDay = d; render(); };
  render();
  // 답장 못 받은 오늘 메시지가 있으면 이어서
  { const t = todays(); if (aiOn() && t.length && t[t.length - 1].who === 'me') setTimeout(pump, 600); }
  // 자정(한국 시간)이 지나면 오늘 화면은 새 빈 대화로 (지난 기록은 그대로)
  let curDay = kday();
  const tick = setInterval(() => { const d = kday(); if (d === curDay) return; const was = viewDay === curDay; curDay = d; if (was && !busy) goDay(d); else setStatus(); }, 15000);
  $('#dmtoday', root).onclick = () => goDay(kday());
  $('#dmd', root).onclick = () => calSheet();
  function calSheet() {
    const has = new Set(list.map(m => kday(m.at))); let [y, mo] = ymd(viewDay);
    const sh = sheet(`<div class="cal-h"><button class="cl-nav" data-m="-1">${ic('back')}</button><b id="calt"></b><button class="cl-nav" data-m="1">${ic('next')}</button></div><div class="cal dm-cal" id="cal"></div><p class="cal-goal"><i class="dm-dot"></i> 백현이랑 채팅한 날</p>`);
    const draw = () => {
      $('#calt', sh).textContent = `${y}년 ${mo}월`;
      const first = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay(), n = new Date(Date.UTC(y, mo, 0)).getUTCDate(), t = kday();
      $('#cal', sh).innerHTML = '일월화수목금토'.split('').map(x => `<span class="cal-w">${x}</span>`).join('') + '<span></span>'.repeat(first)
        + Array.from({ length: n }, (_, i) => { const d = `${y}-${String(mo).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
          return `<button class="dm-cd ${d === viewDay ? 'on' : ''} ${d === t ? 'now' : ''}" data-d="${d}" ${d > t ? 'disabled' : ''}><span>${i + 1}</span>${has.has(d) ? '<i class="dm-dot"></i>' : ''}</button>`; }).join('');
      $$('[data-d]', sh).forEach(b => b.onclick = () => { sh.close(); goDay(b.dataset.d); });
    };
    $$('[data-m]', sh).forEach(b => b.onclick = () => { mo += +b.dataset.m; if (mo < 1) { mo = 12; y--; } if (mo > 12) { mo = 1; y++; } draw(); });
    draw();
  }

  // ----- 입력 -----
  const resize = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; sendB.classList.toggle('on', !!ta.value.trim()); };
  ta.addEventListener('input', resize);
  function send() {
    const t = ta.value.trim(); if (!t) return;
    if (!isToday()) { goDay(kday()); }
    if (!aiOn()) { toast('AI 키를 넣으면 백현이가 답장해줘'); return; }
    cap?.stop();
    $('.dm-empty', th)?.remove();
    const m = { id: uid(), who: 'me', en: t, at: Date.now() };
    list.push(m); persist(); bubble(m); scroll();
    ta.value = ''; resize(); closeHints();
    // 진짜 메신저처럼: 연달아 보내면 조금 기다렸다가 한 번에 답장
    clearTimeout(pumpT); pumpT = setTimeout(pump, 1100);
  }
  sendB.onclick = send;
  enterSend(ta, send);

  // ----- 백현이 답장 -----
  async function pump() {
    if (dead || busy) return;
    const tl = todays(); // 오늘 대화만 이어감 (날마다 새 대화)
    const lastBh = tl.map(m => m.who).lastIndexOf('bh');
    const fresh = tl.slice(lastBh + 1).filter(m => m.who === 'me');
    if (!fresh.length) return;
    busy = true;
    await wait(500); if (dead) return;
    fresh.forEach(m => { m.read = true; $(`.msg2[data-id="${m.id}"] .dm-un`, th)?.classList.add('hide'); }); persist();
    let typing = showTyping();
    const r = await aiDM({ history: tl.slice(0, lastBh + 1), fresh: fresh.map(m => m.en), level: level() });
    if (dead) return;
    if (r.error) {
      typing.remove(); busy = false;
      const er = h(`<div class="dm-err">답장을 못 받았어 · ${esc(AI_ERR[r.error] || '잠시 뒤 다시')} <button type="button">다시 받기</button></div>`);
      th.appendChild(er); scroll();
      $('button', er).onclick = () => { er.remove(); pump(); };
      return;
    }
    // 내 메시지 뜻 · 교정(마지막 메시지 기준)
    const tgt = fresh[fresh.length - 1];
    if (r.userKo) { if (fresh.length === 1) tgt.ko = r.userKo; }
    if (r.fix && r.fix.natural.trim().toLowerCase() !== fresh.map(m => m.en).join(' ').trim().toLowerCase()) {
      tgt.fix = r.fix;
      const el = $(`.msg2[data-id="${tgt.id}"] .m-col`, th);
      if (el && !$('.dm-fixb', el)) { el.insertAdjacentHTML('beforeend', fixBtn(tgt)); bindFix(tgt, el.closest('.msg2')); }
    }
    if (r.level) setMeta({ est: r.level });
    persist();
    // 여러 개를 연달아: 길이에 맞춰 타이핑 시간
    for (let i = 0; i < r.reply.length; i++) {
      const x = r.reply[i];
      await wait(Math.min(1700, 450 + x.en.length * 22)); if (dead) return;
      typing.remove();
      const m = { id: uid(), who: 'bh', en: x.en, ko: x.ko, at: Date.now() };
      list.push(m); persist(); if (viewDay === kday(m.at)) { bubble(m); scroll(); }
      if (i < r.reply.length - 1) typing = showTyping();
    }
    busy = false;
    // 답장 쓰는 동안 또 보냈으면 이어서
    const t2 = todays(), after = t2.map(m => m.who).lastIndexOf('bh');
    if (t2.slice(after + 1).some(m => m.who === 'me')) { clearTimeout(pumpT); pumpT = setTimeout(pump, 700); }
  }
  function showTyping() {
    const cont = lastWho === 'bh' && lastDay === dayKey(Date.now());
    const t = h(`<div class="msg2 bh ${cont ? '' : 'first'} typing">${cont ? '<span class="m-av sp"></span>' : AV(34)}<div class="m-col">${cont ? '' : '<span class="m-name">백현이</span>'}<div class="m-bub"><span class="typing3"><i></i><i></i><i></i></span></div></div></div>`);
    if (viewDay === kday()) { th.appendChild(t); scroll(); }
    return t;
  }

  // ----- 답장 힌트 -----
  function closeHints() { hints.classList.add('hide'); hints.innerHTML = ''; hb.classList.remove('on'); }
  hb.onclick = async () => {
    if (!hints.classList.contains('hide')) { closeHints(); return; }
    if (!aiOn()) { toast('힌트는 AI 키가 있어야 볼 수 있어'); return; }
    hb.classList.add('on'); hints.classList.remove('hide');
    hints.innerHTML = `<div class="dm-hh"><b>${ic('bulb')} 이렇게 답해볼까?</b><button class="icon-btn sm" id="dhx" aria-label="닫기">${ic('x')}</button></div><div class="dm-hl"><span class="typing3"><i></i><i></i><i></i></span></div>`;
    $('#dhx', hints).onclick = closeHints;
    const r = await aiDMHint({ history: todays(), level: level() });
    if (dead || hints.classList.contains('hide')) return;
    const box = $('.dm-hl', hints);
    if (r.error) { box.innerHTML = `<p class="dm-hn">힌트를 못 불러왔어 · ${esc(AI_ERR[r.error] || '다시 눌러줘')}</p>`; return; }
    box.innerHTML = r.hints.map((x, i) => `<button class="dm-hi" type="button" data-i="${i}"><span class="en">${esc(x.en)}</span>${x.ko ? `<small>${esc(x.ko)}</small>` : ''}</button>`).join('') + '<p class="dm-hn">누르면 입력창에 들어가요 · 고쳐서 보내봐!</p>';
    $$('.dm-hi', box).forEach(b => b.onclick = () => { ta.value = r.hints[+b.dataset.i].en; resize(); closeHints(); ta.focus(); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch { } });
  };

  // ----- 영어로 말해서 입력 (음성 인식) -----
  micB.onclick = () => {
    if (cap) { cap.stop(); return; }
    if (!S.support.stt) { ta.focus(); toast('키보드의 받아쓰기(🎤)로 말해도 돼요'); return; }
    micB.classList.add('live'); $('#cp', root).classList.add('rec');
    const prefix = ta.value.trim(); let edited = false; const onEd = () => { edited = true; }; ta.addEventListener('input', onEd);
    const c = cap = S.capture({ stt: true, lang: 'en-US', prefix, onInterim: t => { if (!edited) { ta.value = t; resize(); } } });
    c.result.then(r => {
      if (cap === c) cap = null; ta.removeEventListener('input', onEd); if (dead) return;
      micB.classList.remove('live'); $('#cp', root).classList.remove('rec');
      if (!edited && r.text) ta.value = r.text; resize();
      if (!r.text && r.sttError) toast(S.sttErrorText(r.sttError));
    });
  };

  // ----- 설정: 난이도 · 대화 지우기 -----
  $('#dmo', root).onclick = () => {
    const m = meta();
    const sh = sheet(`<h3>영어 채팅</h3><p class="sheet-sub">백현이 영어 난이도${m.level === 'auto' ? ` · 지금 내 영어에 맞춘 단계: <b>${LV[m.est] || '보통'}</b>` : ''}</p>
      <div class="goal-ch">${Object.entries(LV).map(([k, v]) => `<button class="chip ${k === m.level ? 'on' : ''}" data-lv="${k}">${v}</button>`).join('')}</div>
      <button class="btn soft block-w mt12" id="dmclr">${ic('trash')} 대화 기록 지우기</button>`);
    $$('[data-lv]', sh).forEach(b => b.onclick = () => { setMeta({ level: b.dataset.lv }); sh.close(); toast(`난이도: ${LV[b.dataset.lv]}`); });
    $('#dmclr', sh).onclick = async () => { sh.close(); if (!(await confirmSheet('대화 기록을 지울까?', '지우기', '이 기기에 저장된 백현이와의 영어 채팅이 모두 지워져요'))) return; list = []; persist(); goDay(kday()); toast('대화 기록을 지웠어'); };
  };

  return () => { dead = true; cap?.stop(); clearTimeout(pumpT); clearInterval(tick); document.body.classList.remove('no-tab'); };
}
