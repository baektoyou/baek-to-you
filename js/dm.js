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
const save = list => { try { localStorage.setItem(KEY(), JSON.stringify(list.slice(-300))); } catch { } };
const meta = () => { try { return { level: 'auto', est: 'mid', ...JSON.parse(localStorage.getItem(META()) || '{}') }; } catch { return { level: 'auto', est: 'mid' }; } };
const setMeta = p => { try { localStorage.setItem(META(), JSON.stringify({ ...meta(), ...p })); } catch { } };
const LV = { auto: '자동', easy: '쉽게', mid: '보통', hard: '원어민처럼' };
const wait = ms => new Promise(r => setTimeout(r, ms));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const hm = t => { const d = new Date(t); const H = d.getHours(); return `${H < 12 ? '오전' : '오후'} ${H % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`; };
const dayKey = t => new Date(t).toDateString();
const dayText = t => { const d = new Date(t); return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${'일월화수목금토'[d.getDay()]}요일`; };

export function dm(root) {
  let dead = false, cap = null, busy = false, pumpT = null;
  let list = load();
  document.body.classList.add('no-tab');
  const AV = s => `<span class="m-av ph" style="${avatarStyle(BH_PROFILE, s)}"></span>`;
  root.innerHTML = `<div class="chatv dm">
    <header class="cv-top"><a class="icon-btn" href="#/talk" aria-label="뒤로">${ic('back')}</a>
      <div class="cv-title">${AV(30)}<div><b>백현이</b><small id="dms">AI 백현이 · 영어 채팅</small></div></div>
      <button class="icon-btn" id="dmo" aria-label="채팅 설정">${ic('settings')}</button></header>
    <div class="thread" id="th"></div>
    <div class="dm-hints hide" id="dmh"></div>
    <div class="composer on" id="cp">
      <button class="cp-mic" id="cpm" aria-label="영어로 말하기">${ic('mic')}</button>
      <button class="cp-q dm-hb" id="cph" aria-label="답장 힌트">${ic('bulb')}</button>
      <textarea id="cpt" rows="1" placeholder="영어로 메시지 보내기" autocapitalize="sentences" spellcheck="false"></textarea>
      <button class="cp-send" id="cps" aria-label="보내기">${ic('send')}</button>
    </div>
  </div>`;
  const th = $('#th', root), ta = $('#cpt', root), sendB = $('#cps', root), micB = $('#cpm', root), hb = $('#cph', root), hints = $('#dmh', root), status = $('#dms', root);
  const scroll = autoFollow(th);
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
        <div class="dm-row">${bh ? '' : `<span class="dm-meta"><i class="dm-un ${m.read ? 'hide' : ''}">1</i><span class="dm-time">${hm(m.at)}</span></span>`}<button class="m-bub dm-b" type="button"><span class="en">${esc(m.en)}</span></button>${bh ? `<span class="dm-meta"><span class="dm-time">${hm(m.at)}</span></span>` : ''}</div>
        ${!bh && m.fix ? fixBtn(m) : ''}
      </div></div>`);
    $('.dm-b', el).onclick = () => flip(m, el);
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
        box.innerHTML = `${cmpHTML({}, { said: m.en, rec: m.fix.natural, save: true })}${m.fix.why ? `<p class="dm-why">${esc(m.fix.why)}</p>` : ''}<button class="btn sm soft dm-use" type="button">${ic('edit')} 이 문장으로 써보기</button>`;
        bindCompare(box);
        $('.dm-use', box).onclick = () => { ta.value = m.fix.natural; resize(); ta.focus(); sendB.classList.add('on'); };
      }
    };
  }
  // 누르면 한국어 뜻 ↔ 영어
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

  // ----- 처음 화면 -----
  list.forEach(m => bubble(m, { anim: false }));
  if (!list.length) th.appendChild(h(`<div class="dm-empty">${AV(64)}<b>백현이랑 영어로 수다 떨기</b><p>영상도 대본도 없이 아무 얘기나 영어로 보내봐!<br>말풍선을 누르면 한국어 뜻이 보이고,<br>막히면 ${ic('bulb')} 힌트를 눌러봐</p><small>AI가 백현이 말투로 답하는 연습용 채팅이에요</small></div>`));
  if (!aiOn()) th.appendChild(h(`<div class="dm-off">영어 채팅은 AI 키가 있어야 답장이 와요.<br><small>SETTINGS › AI에서 Gemini 무료 키를 넣으면 바로 쓸 수 있어요.</small><a class="btn sm soft mt12" href="#/settings">SETTINGS로</a></div>`));
  requestAnimationFrame(() => { th.scrollTop = th.scrollHeight; });
  // 답장 못 받은 내 메시지가 있으면 이어서
  if (aiOn() && list.length && list[list.length - 1].who === 'me') setTimeout(pump, 600);

  // ----- 입력 -----
  const resize = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; sendB.classList.toggle('on', !!ta.value.trim()); };
  ta.addEventListener('input', resize);
  function send() {
    const t = ta.value.trim(); if (!t) return;
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
    const lastBh = list.map(m => m.who).lastIndexOf('bh');
    const fresh = list.slice(lastBh + 1).filter(m => m.who === 'me');
    if (!fresh.length) return;
    busy = true;
    await wait(500); if (dead) return;
    fresh.forEach(m => { m.read = true; $(`.msg2[data-id="${m.id}"] .dm-un`, th)?.classList.add('hide'); }); persist();
    let typing = showTyping();
    const r = await aiDM({ history: list.slice(0, lastBh + 1), fresh: fresh.map(m => m.en), level: level() });
    if (dead) return;
    if (r.error) {
      typing.remove(); status.textContent = 'AI 백현이 · 영어 채팅'; busy = false;
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
      list.push(m); persist(); bubble(m); scroll();
      if (i < r.reply.length - 1) typing = showTyping();
    }
    status.textContent = 'AI 백현이 · 영어 채팅';
    busy = false;
    // 답장 쓰는 동안 또 보냈으면 이어서
    const after = list.map(m => m.who).lastIndexOf('bh');
    if (list.slice(after + 1).some(m => m.who === 'me')) { clearTimeout(pumpT); pumpT = setTimeout(pump, 700); }
  }
  function showTyping() {
    status.textContent = '입력 중...';
    const cont = lastWho === 'bh' && lastDay === dayKey(Date.now());
    const t = h(`<div class="msg2 bh ${cont ? '' : 'first'} typing">${cont ? '<span class="m-av sp"></span>' : AV(34)}<div class="m-col">${cont ? '' : '<span class="m-name">백현이</span>'}<div class="m-bub"><span class="typing3"><i></i><i></i><i></i></span></div></div></div>`);
    th.appendChild(t); scroll();
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
    const r = await aiDMHint({ history: list, level: level() });
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
    $('#dmclr', sh).onclick = async () => { sh.close(); if (!(await confirmSheet('대화 기록을 지울까?', '지우기', '이 기기에 저장된 백현이와의 영어 채팅이 모두 지워져요'))) return; list = []; persist(); th.innerHTML = ''; lastWho = lastDay = ''; lastEl = null; toast('대화 기록을 지웠어'); };
  };

  return () => { dead = true; cap?.stop(); clearTimeout(pumpT); document.body.classList.remove('no-tab'); };
}
