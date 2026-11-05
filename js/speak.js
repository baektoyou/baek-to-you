// TALK — 백현이랑 전화하기 · 백현이랑 대화하기 · 백현이랑 오래 이야기하기
// 백현이 화면·목소리는 실제 영상 클립만 사용 (백현이가 하지 않은 말을 만들지 않음)
import * as D from './store.js';
import * as S from './speech.js';
import { Player, thumb } from './yt.js';
import { esc, $, $$, ic, toast, h, copyText, natOf, sheet, beforeAfter, hintBox, sayCard, phrasePicker } from './ui.js';
import { improve, talkHint, talkFeatures, claudePrompt } from './feedback.js';
import { pickVideo, pickPhoto, conceptOf, sceneOf, mountPhoto, rememberPhoto, timeBucket, TIME_KO, callable, situations, matchesSit, isLive } from './scene.js';
import { startRing, stopRing, blip, unlock } from './ringtone.js';

const NAME = '백현이';
let active = null;   // 진행 중인 통화 정리 함수
let sit = '';        // TALK에서 고른 상황 ('' = 랜덤)

// ---------- 데이터 ----------
const allClips = () => D.get().utts.filter(u => u.ko && D.video(u.videoId) && isLive(D.video(u.videoId))).sort((a, b) => a.videoId < b.videoId ? -1 : a.videoId > b.videoId ? 1 : a.start - b.start);
const isQ = u => u.type === 'question' || /\?\s*$/.test(u.ko || '');
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const words = t => (t || '').trim().split(/\s+/).filter(Boolean).length;
const wait = ms => new Promise(r => setTimeout(r, ms));
// 질문: 백현이가 실제로 질문한 클립 → 없으면 문장에 등록된 패턴 질문(앱 질문)
function questionPool() {
  const clips = allClips(); const real = clips.filter(isQ).map(u => ({ u, real: true, ko: u.ko }));
  if (real.length) return real;
  return clips.filter(u => u.question).map(u => ({ u, real: false, ko: u.question }));
}
// 같은 영상에서 질문 바로 뒤에 백현이가 직접 한 말
function answerClip(q) {
  return D.uttsOf(q.videoId).find(u => u.id !== q.id && u.start >= q.start + 0.5 && u.start - q.end < 120 && !isQ(u)) || null;
}
function todayClip() {
  const saved = D.get().saved.map(s => s.uttId && D.utt(s.uttId)).filter(Boolean);
  const pool = saved.length ? saved : allClips(); if (!pool.length) return null;
  return pool[D.today().split('-').join('') % pool.length];
}

// ---------- 통화용 문장 만들기 ----------
// · 문장이 쉼표·연결어미로 끝나고 다음 발화가 바로 이어지면 하나로 합쳐요 (말이 중간에 끊기지 않게)
// · 끝 시간은 다음 발화 시작 직전까지 (최대 +1초) 늘려서 재생 → 마지막 단어가 잘리지 않음
// · 너무 단순한 발화(영어 3단어 미만, 감탄사만)는 빼요
const FRAG = /([,，…~]|고|서|는데|은데|니까|으면|면|지만|랑|하고|그리고|근데|그래서|아니면|든지|거든|해가지고|가지고)$/;
const SIMPLE_KO = /^(네|넵|응|어|아|오|와|헐|대박|진짜|정말|맞아|그치|ㅋ+|ㅎ+|하하+|감사합니다|고마워|안녕|안녕하세요|여보세요|음+|자|좋아)[\s!?.~ㅋㅎ]*$/;
export function callTurns(v) {
  const us = D.uttsOf(v.id).filter(u => u.ko);
  const out = [];
  for (let i = 0; i < us.length; i++) {
    const u = { ...us[i], en: { ...us[i].en }, keywords: [...(us[i].keywords || [])], ids: [us[i].id] };
    while (i + 1 < us.length && FRAG.test(u.ko.trim()) && us[i + 1].start - u.end < 0.9 && (u.ko + us[i + 1].ko).length < 110) {
      const n = us[++i];
      u.ko = `${u.ko} ${n.ko}`; const nx = natOf(n); u.en.natural = `${natOf(u)} ${/,\s*$/.test(natOf(u)) && !/^I\b/.test(nx) ? nx.charAt(0).toLowerCase() + nx.slice(1) : nx}`.trim(); u.end = n.end; u.ids.push(n.id);
      u.pattern = [u.pattern, n.pattern].filter(Boolean).join(', '); u.keywords.push(...(n.keywords || []));
    }
    out.push(u);
  }
  out.forEach((u, i) => { const nx = out[i + 1]; u.playEnd = nx ? Math.min(u.end + 1, Math.max(u.end + 0.3, nx.start - 0.05)) : u.end + 0.8; });
  return out.filter(u => natOf(u) && words(natOf(u)) >= 3 && !SIMPLE_KO.test(u.ko.trim()));
}

// ---------- 시간 표시 ----------
export const fmtDur = s => { s = Math.round(s || 0); if (s < 60) return `${s}초`; const m = Math.floor(s / 60); if (m < 60) return `${m}분${s % 60 ? ` ${s % 60}초` : ''}`; return `${Math.floor(m / 60)}시간 ${m % 60}분`; };
const clock = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function bigDur(s) { s = Math.round(s || 0); const hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60); return hh ? `<b>${hh}</b><i>시간</i><b>${mm}</b><i>분</i>` : `<b>${mm}</b><i>분</i><b>${s % 60}</b><i>초</i>`; }
function when(t) {
  const d = new Date(t), n = new Date(); const hm = d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
  const days = Math.round((new Date(n.toDateString()) - new Date(d.toDateString())) / 864e5);
  return days === 0 ? `오늘 ${hm}` : days === 1 ? `어제 ${hm}` : days < 7 ? `${days}일 전` : d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}
const MODE_KO = { call: '전화', chat: '대화', long: '오래 이야기', today: '오늘의 백현이' };

// ---------- 첫 화면 ----------
// 백현이가 나한테 거는 전화 · 어떤 영상인지는 받기 전까지 몰라요
// 지난 통화를 중간에 끊었으면 그 문장부터 이어서
// 통화 기록을 영상별로 한 줄씩: 영상마다 총 통화 시간 + 끊긴 곳이 있으면 ‘이어서’
function callGroups() {
  const out = new Map();
  for (const l of D.get().talkLogs || []) {
    const key = l.videoId || `mode:${l.mode || 'call'}`;
    const g = out.get(key) || { key, v: l.videoId ? D.video(l.videoId) : null, last: l, sec: 0, n: 0, resume: null };
    g.sec += l.sec || 0; g.n++;
    if (!out.has(key)) {
      // 가장 최근 ‘전화’ 기록에서 끊긴 위치
      out.set(key, g);
    }
    if (!g.resumeChecked && l.mode === 'call' && g.v) {
      g.resumeChecked = true;
      if (l.pos != null && callable(g.v)) { const total = callTurns(g.v).length; if (l.pos >= 1 && l.pos < total) g.resume = { pos: l.pos, total }; }
    }
  }
  return [...out.values()].filter(g => !g.key.startsWith('mode:') || g.n);
}
export function speak(root) {
  active?.(); active = null;
  const vids = D.get().videos.filter(callable);
  const sits = situations().filter(([k]) => vids.some(v => matchesSit(v, k)));
  if (sit && !sits.some(([k]) => k === sit)) sit = '';
  const qs = questionPool(); const st = D.callStats(); const groups = callGroups();
  const sitL = sits.find(([k]) => k === sit)?.[1] || '랜덤';
  root.innerHTML = `<div class="screen talk">
    <header class="top"><h1 class="page-title">CALL</h1></header>
    <section class="call-card">
      <p class="cc-q">${vids.length ? `${NAME}는 지금 뭐하고 있을까요?` : '전화할 라이브 영상이 아직 없어요'}</p>
      ${vids.length ? `<button class="call-orb" id="call" aria-label="${NAME}랑 전화하기"><span class="orb-waves"><i></i><i></i><i></i></span><span class="orb">${ic('phone')}</span></button>
      <b class="cc-label">${NAME}랑 전화하기</b>
      <div class="cc-opts">${sits.length ? `<button class="cc-opt" id="sitbtn">${esc(sitL)}<i class="chev">${ic('next')}</i></button>` : ''}</div>
      ${sits.length ? `<div class="sit-panel" id="sitp"><div class="sit-row wrap"><button class="sit ${sit ? '' : 'on'}" data-sit="">랜덤</button>${sits.map(([k, l]) => `<button class="sit ${sit === k ? 'on' : ''}" data-sit="${k}">${esc(l)}</button>`).join('')}</div></div>` : ''}`
        : `<a class="btn sm soft" href="#/settings">${ic('plus')} 영상 추가하기</a>`}
    </section>
    <div class="modes">
      <button class="mode" data-mode="chat" ${qs.length ? '' : 'disabled'}><span class="mode-ic">${ic('chat')}</span><b class="grow">${NAME}랑 대화하기</b>${ic('next')}</button>
      <button class="mode" data-mode="long" ${qs.length ? '' : 'disabled'}><span class="mode-ic">${ic('timer')}</span><b class="grow">${NAME}랑 오래 이야기하기</b>${ic('next')}</button>
    </div>
    <section class="call-log">
      <div class="cl-total"><span class="label">총 통화 시간</span><div class="cl-big">${bigDur(st.total)}</div></div>
      ${groups.length ? `<div class="cl-list">${groups.slice(0, 8).map(g => `<div class="cl-row"><div class="grow"><b>${esc(g.v ? (g.last.concept || conceptOf(g.v)) : MODE_KO[g.last.mode] || '통화')}</b><small>${g.v ? `${esc(g.v.title)} · ` : ''}${clock(g.sec)}</small></div>${g.resume ? `<button class="cl-resume" data-resume="${g.v.id}" data-pos="${g.resume.pos}">이어서 ${g.resume.pos + 1}/${g.resume.total}</button>` : ''}</div>`).join('')}</div>` : ''}
    </section>
  </div>`;
  $('#call', root) && ($('#call', root).onclick = () => { unlock(); call(root, 'call', pickVideo(new Date(), sit)); });
  $$('[data-resume]', root).forEach(b => b.onclick = () => { unlock(); call(root, 'call', D.video(b.dataset.resume), { start: +b.dataset.pos }); });
  $('#sitbtn', root) && ($('#sitbtn', root).onclick = e => { $('#sitp', root).classList.toggle('on'); e.currentTarget.classList.toggle('open'); });
  $$('[data-sit]', root).forEach(b => b.onclick = () => {
    sit = b.dataset.sit; $$('[data-sit]', root).forEach(x => x.classList.toggle('on', x === b));
    const sb = $('#sitbtn', root); sb.firstChild.textContent = b.textContent; sb.classList.remove('open'); $('#sitp', root).classList.remove('on');
  });
  $$('[data-mode]', root).forEach(b => b.onclick = () => { unlock(); call(root, b.dataset.mode); });
  return () => { active?.(); active = null; };
}

// ---------- 통화 ----------
// 화면 구성: 통화 화면 위에 수신 화면(사진)을 덮어서 시작 → 받으면 사진은 사라지고 다시 나오지 않음
function call(root, mode, v = null, { start = 0 } = {}) {
  active?.(); active = null;
  // 대화 모드: 질문 순서를 먼저 정하고, 첫 질문이 나온 영상의 분위기로 사진·콘셉트를 맞춰요
  const qs = mode === 'call' ? [] : shuffle(questionPool());
  if (mode !== 'call') v = (qs[0] && D.video(qs[0].u.videoId)) || v;
  document.body.classList.add('in-call');
  const concept = v ? conceptOf(v, sceneOf(v), mode === 'call' ? sit : '') : '';
  const scene = v ? sceneOf(v) : {};
  const ph = pickPhoto(v);
  const st = D.get().settings;
  root.innerHTML = `<div class="vcall ${st.callFill !== false ? 'fill' : 'fit'}">
    <div class="vc-stage"><div class="vc-ambient"></div><div class="vc-video" id="vv"><div id="vp"></div></div><div class="vc-grad"></div>
      <div class="vc-wait" id="vwait"><span class="vw-dots"><i></i><i></i><i></i></span></div></div>
    <header class="vc-head"><b>${NAME}</b><span class="vc-time" id="vtm">00:00</span></header>
    <span class="vc-prog" id="vprog"></span>
    <div class="vc-tap hide" id="vtap">화면을 한 번 탭하면 재생돼요</div>
    <div class="vc-target hide" id="vtg"></div>
    <div class="vc-low"><div class="vc-cap" id="vcap"></div>
      <div class="vc-chat" id="vchat"></div>
      <div class="vc-hint hide" id="vhint"></div>
      <p class="vc-status" id="vst"></p>
      <div class="vc-ctrl">
        <button class="vc-btn" id="vskip" aria-label="넘기기">${ic('next')}</button>
        <button class="vc-mic" id="vmic" aria-label="말하기"><svg class="ring-svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="37"/></svg>${ic('mic')}<em id="vsec"></em></button>
        <button class="vc-btn end" id="vend" aria-label="통화 종료">${ic('phoneoff')}</button>
      </div></div>
    <div class="vc-panel" id="vpanel"></div>
    <div class="vc-bye hide" id="vbye"><p>${NAME}와 통화 종료</p></div>
    <div class="ring2" id="ring">
      <div class="ring-photo" id="rphoto"></div><div class="ring-shade"></div>
      <div class="ring-top"><span class="ring-kind">${ic('cam')} 영상통화</span><h2 class="ring-name">${NAME}</h2>${concept ? `<p class="ring-concept">${esc(concept)}</p>` : ''}</div>
      <div class="ring-acts"><div><button class="r-no" id="dec" aria-label="거절">${ic('phoneoff')}</button><span>거절</span></div>
        <div><button class="r-ok" id="acc" aria-label="받기"><span class="ring-waves"><i></i><i></i><i></i></span>${ic('phone')}</button><span>받기</span></div></div>
    </div>
  </div>`;
  const $v = s => $(s, root);
  let unPhoto = mountPhoto($v('#rphoto'), ph.p, { focusY: 0.42 });
  rememberPhoto(ph.p.id);
  startRing();
  let callPos = start, callTotal = 0, stopped = false, dead = false, endTurn = null, skipTurn = null, skipFlag = false, t0 = 0, timer = null, accepted = false;
  const vv = $v('#vv');
  const pl = new Player($v('#vp'), { controls: 0, onState: s => { if (s === 'blocked') $v('#vtap').classList.remove('hide'); if (s === 'playing') { $v('#vtap').classList.add('hide'); vv.classList.add('on'); $v('#vwait').classList.add('gone'); } } });
  const status = t => { const e = $v('#vst'); if (e.textContent !== t) { e.textContent = t; e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); } };
  const progress = t => ($v('#vprog').textContent = t);
  const stats = { sec: 0, n: 0 };

  // ----- 수신 화면: 백현이가 나한테 건 영상통화 -----
  const ring = $v('#ring');
  const killRing = () => { stopRing(); ring.classList.add('leave'); setTimeout(() => { unPhoto?.(); unPhoto = null; ring.remove(); }, 900); };
  $v('#dec').onclick = () => { stopRing(); blip('end'); cleanup(); document.body.classList.remove('in-call'); speak(root); };
  $v('#acc').onclick = () => {
    if (accepted) return; accepted = true; blip('connect'); killRing();
    t0 = Date.now(); timer = setInterval(() => ($v('#vtm').textContent = clock((Date.now() - t0) / 1000)), 1000);
    run();
  };
  // 넘기기: 백현이가 말하는 중이면 그 문장을 건너뛰고, 내 차례면 이번 차례를 건너뜀
  $v('#vskip').onclick = () => {
    if (!accepted || stopped) return;
    if (skipTurn) { skipTurn(); return; }
    skipFlag = true; pl.stop(); $v('#vcap').innerHTML = '';
  };

  // ----- 채팅 (라이브 방송처럼 아래에서 올라옴) -----
  const chat = $v('#vchat');
  function msg(who, text, extra = '') {
    const m = h(`<div class="vm ${who}"><i>${who === 'baek' ? 'B' : '나'}</i><div><b>${who === 'baek' ? NAME : '나'}</b><p class="${who === 'me' ? 'en' : ''}">${esc(text)}</p>${extra}</div></div>`);
    chat.appendChild(m); chat.scrollTop = chat.scrollHeight; return m;
  }
  // 백현이 클립 재생 (끝 시간 여유 포함)
  async function play(u, { cap = u.ko, label = '' } = {}) {
    if (dead) return;
    const vid = D.video(u.videoId); if (!vid) return;
    status(`${NAME}가 말하는 중`);
    $v('#vcap').innerHTML = cap ? `${label ? `<span>${esc(label)}</span>` : ''}${esc(cap)}` : '';
    const end = u.playEnd || u.end + 0.6;
    await pl.playSegment(vid.ytId, u.start, end, { tail: 0 });
    $v('#vcap').innerHTML = '';
  }
  // 내 차례: 마이크로 말하기 → {text, sec}
  function turn({ limit = 0, auto = false, label = '내 차례 · 영어로 말해요', hint = null } = {}) {
    return new Promise(resolve => {
      status(label);
      const mic = $v('#vmic'), rg = $('.ring-svg circle', mic), secEl = $v('#vsec'), hb = $v('#vhint');
      mic.classList.add('ready'); secEl.textContent = limit ? `${limit}초` : '';
      rg.style.strokeDashoffset = 0;
      if (hint) { hb.classList.remove('hide'); hintBox(hb, hint.en, hint); } else { hb.classList.add('hide'); hb.innerHTML = ''; }
      let cap = null, live = null, tick = null, st = 0, done = false;
      const finish = (text, sec, skipped = false) => { if (done) return; done = true; endTurn = skipTurn = null; clearInterval(tick); mic.classList.remove('ready', 'live', 'over'); secEl.textContent = ''; hb.classList.add('hide'); mic.onclick = null; resolve({ text, sec, skipped }); };
      endTurn = () => { cap?.stop(); finish('', 0); };
      skipTurn = () => { const c = cap; cap = null; c?.stop(); live?.remove(); finish('', 0, true); };
      mic.onclick = async () => {
        if (cap) { cap.stop(); status('정리하는 중…'); return; }
        if (!S.support.stt) { const t = await typeBox(); if (t) { msg('me', t); finish(t, 0); } return; }
        pl.pause(); mic.classList.add('live'); status('듣는 중 · 다 말하면 ■'); st = Date.now();
        live = msg('me', '…'); live.classList.add('typing');
        tick = setInterval(() => {
          const e = (Date.now() - st) / 1000;
          if (limit) { const left = Math.max(0, limit - e); secEl.textContent = `${Math.ceil(left)}초`; rg.style.strokeDashoffset = 232 * Math.min(1, e / limit); if (left <= 0) { if (auto) cap?.stop(); else mic.classList.add('over'); } }
          else secEl.textContent = `${Math.floor(e)}초`;
        }, 200);
        cap = S.capture({ stt: true, targets: hint?.en ? [hint.en] : [], onInterim: t => { $('p', live).textContent = t || '…'; chat.scrollTop = chat.scrollHeight; } });
        const r = await cap.result; cap = null; if (done) return;
        const sec = Math.round((Date.now() - st) / 1000);
        live.classList.remove('typing');
        if (!r.text) { live.remove(); mic.classList.remove('live', 'over'); clearInterval(tick); toast(S.sttErrorText(r.sttError) || '잘 안 들렸어요 · 다시 눌러 말해주세요'); status('다시 눌러 말해주세요'); return; }
        $('p', live).textContent = r.text;
        stats.sec += sec; stats.n++;
        finish(r.text, sec);
      };
    });
  }
  function typeBox() {
    return new Promise(res => {
      panel(`<div class="vp-h">영어로 입력</div><p class="vp-s">이 브라우저는 음성 인식이 안 돼요 · 키보드 받아쓰기로 입력해도 돼요</p>
        <textarea class="textarea en" id="tb" rows="2"></textarea><button class="btn block mt12" id="tbs">보내기</button>`);
      $v('#tbs').onclick = () => { const t = $v('#tb').value.trim(); closePanel(); res(t); };
    });
  }
  // 아래에서 올라오는 패널
  const pnl = $v('#vpanel');
  function panel(html, { end = true } = {}) {
    pnl.innerHTML = `<div class="grab"></div>${end ? `<button class="vp-x" aria-label="통화 종료">${ic('phoneoff')}</button>` : ''}<div class="vp-body">${html}</div>`;
    pnl.classList.add('on'); pnl.scrollTop = 0;
    $('.vp-x', pnl) && ($('.vp-x', pnl).onclick = () => finaleOnce());
  }
  function closePanel() { pnl.classList.remove('on'); }
  const log = (step, r, uttId) => r.text && D.addAttempt({ uttId: uttId || null, step, text: r.text, sec: r.sec });

  // 저장: 영상 문장이면 원본 연결, 내 문장이면 개선된 문장
  function saveSentence({ text, ko = '', uttId = null, pattern = '', before = '', kind = 'mine' }) {
    const it = kind === 'utt' && uttId && D.utt(uttId)
      ? { kind: 'utt', level: 'natural', uttId, ko, en: { ...D.utt(uttId).en, natural: text }, text, pattern }
      : { kind: 'mine', level: 'mine', uttId: uttId || null, ko, text, en: { easy: '', natural: text, advanced: '' }, pattern, before };
    const r = D.saveExpr(it); toast(r.dup ? '이미 SAVED에 있어요' : 'SAVED에 저장했어요'); return r.item;
  }
  // 저장 + 외우고 싶은 표현 고르기
  function saveBlock(el, info) {
    let item = null;
    el.innerHTML = `<div class="save-row"><button class="btn soft grow" data-s="save">${ic('bookmark')} 문장 저장</button><button class="btn soft grow" data-s="pick">${ic('marker')} 표현 고르기</button></div><div class="pick-wrap"></div>`;
    const ensure = () => item || (item = saveSentence(info));
    $('[data-s=save]', el).onclick = e => { ensure(); e.currentTarget.disabled = true; e.currentTarget.innerHTML = `${ic('check')} 저장됨`; };
    $('[data-s=pick]', el).onclick = e => {
      e.currentTarget.disabled = true;
      phrasePicker($('.pick-wrap', el), info.text, {
        marks: [], onSave: (p, { asWord }) => { const it = ensure(); D.toggleMark(it.id, p, true); D.saveWord({ text: p, srcId: it.id, kind: asWord ? 'word' : 'expr' }); toast(`‘${p}’ 저장했어요`); },
        onUnmark: p => item && D.toggleMark(item.id, p, false)
      });
    };
  }
  // 보고 말하기 → 안 보고 말하기
  async function practice(target, { ko = '', uttId = null, pattern = '', keywords = [], prompt = '', kind = 'mine', before = '' } = {}) {
    const tg = $v('#vtg');
    tg.classList.remove('hide'); sayCard(tg, { ko, en: target, pattern, mode: 'read' });
    const a = await turn({ label: '보고 말하기 · 문장을 보며 말해요' }); log('sp-practice', a, uttId); if (stopped) return;
    sayCard(tg, { ko: ko || prompt, en: target, pattern, keywords, mode: 'recall' });
    const b = await turn({ label: '안 보고 말하기 · 기억해서 말해요' }); log('sp-practice', b, uttId); if (stopped) return;
    tg.classList.add('hide'); tg.innerHTML = '';
    await new Promise(res => {
      panel(`<div class="vp-h">잘했어요</div>${beforeAfter({ before: b.text, after: target, pattern, afterLabel: '연습한 문장' })}<div id="psb"></div><button class="btn block mt12" id="pn">계속 →</button>`);
      saveBlock($v('#psb'), { text: target, ko, uttId, pattern, before, kind });
      $v('#pn').onclick = () => { closePanel(); res(); };
    });
  }
  const ask = (title, btns, sub = '') => new Promise(res => {
    panel(`<div class="vp-h">${title}</div>${sub ? `<p class="vp-s">${sub}</p>` : ''}<div class="stack">${btns.map(([k, l, cls]) => `<button class="btn block ${cls || ''}" data-k="${k}">${l}</button>`).join('')}</div>`);
    $$('[data-k]', pnl).forEach(b => b.onclick = () => { closePanel(); res(b.dataset.k); });
  });
  // 내 영어 → 더 자연스럽게 (규칙 + LanguageTool) → 비교 → 연습할지
  function coach(text, { question = '', pattern = '' } = {}) {
    return new Promise(async res => {
      let mine = text, extra = null, r = null;
      const render = async (reload = true) => {
        if (reload) {
          panel(`<div class="vp-h">더 자연스럽게</div><div class="ba-loading"><i></i><i></i><i></i><span>문장 다듬는 중</span></div>`);
          r = await improve(mine, { pattern, useLT: D.get().settings.autoLT !== false });
          if (stopped) return res(null);
        }
        const after = extra || r.after;
        const src = extra ? 'Claude가 다듬은 문장' : r.source === 'rules+lt' ? '앱 규칙 + LanguageTool' : '앱 규칙';
        panel(`<div class="vp-h">더 자연스럽게</div>${question ? `<p class="vp-s">${NAME}: ${esc(question)}</p>` : ''}
          ${beforeAfter({ before: mine, after, changes: extra ? [] : r.changes, afterLabel: '추천' })}
          <p class="ba-src">${ic('sparkle')} ${esc(src)}${!extra && r.same ? ' · 규칙으로 찾은 문제는 없어요' : ''}</p>
          <details class="adv"><summary>내 답변 고치기 · Claude로 원어민처럼 다듬기</summary>
            <textarea class="textarea en" id="cm" rows="2">${esc(mine)}</textarea><button class="btn sm soft mt8" id="cre">${ic('refresh')} 다시 다듬기</button>
            <p class="tiny muted mt12">앱 안의 규칙은 문법·한국식 표현 위주예요. 원어민다운 표현까지 원하면 요청문을 복사해 Claude 채팅에 붙여넣고, 받은 문장을 아래에 넣어주세요 (무료).</p>
            <button class="btn sm soft" id="clc">${ic('copy')} 요청문 복사</button>
            <input class="input en mt8" id="clp" placeholder="Claude가 다듬은 문장 붙여넣기"><button class="btn sm block mt8" id="cla">After로 쓰기</button></details>
          <div id="csb"></div>
          <div class="row mt12"><button class="btn soft" id="csk">다음</button><button class="btn grow" id="cgo">${ic('mic')} 이 문장 연습하기</button></div>`);
        saveBlock($v('#csb'), { text: after, ko: question ? `${NAME}: ${question}` : '', pattern, before: mine });
        $v('#cre').onclick = () => { mine = $v('#cm').value.trim() || mine; extra = null; render(true); };
        $v('#clc').onclick = async () => toast(await copyText(`${question ? `상대(백현이)가 한 말: ${question}\n` : ''}${claudePrompt({ text: mine, pattern })}`) ? '복사했어요 · Claude 채팅에 붙여넣어 주세요' : '복사가 막혔어요');
        $v('#cla').onclick = () => { const t = $v('#clp').value.trim().replace(/^\d\)\s*/, ''); if (!t) return; extra = t; render(false); };
        $v('#csk').onclick = () => { closePanel(); res(null); };
        $v('#cgo').onclick = () => { closePanel(); res({ target: after, before: mine }); };
      };
      render(true);
    });
  }

  // ----- 1. 백현이랑 전화하기: 영상 처음부터 순서대로 -----
  async function runCall() {
    const list = callTurns(v); callTotal = list.length;
    for (let i = Math.min(start, list.length - 1); i < list.length && !stopped; i++) {
      const u = list[i]; callPos = i; progress(`${i + 1} / ${list.length}`);
      skipFlag = false; await play(u); if (stopped) return;
      if (skipFlag) { skipFlag = false; continue; }
      msg('baek', u.ko);
      const rec = natOf(u);
      const r = await turn({ label: '영어로 말해볼까?', hint: { en: rec, pattern: u.pattern, keywords: u.keywords } }); log('sp-call', r, u.id); if (stopped) return;
      if (r.skipped) continue;
      const k = await new Promise(res => {
        panel(`<div class="vp-h">${r.text ? '이렇게 바꿔 말해봐' : '이렇게 말해요'}</div>${beforeAfter({ ko: u.ko, before: r.text, after: rec, pattern: u.pattern })}
          <div id="isb"></div>
          <div class="row mt12"><button class="btn soft grow" data-k="p">${ic('mic')} 이 문장 연습하기</button><button class="btn grow" data-k="n">${i < list.length - 1 ? '다음 →' : '마치기'}</button></div>`);
        saveBlock($v('#isb'), { text: rec, ko: u.ko, uttId: u.ids[0], pattern: u.pattern, kind: u.ids.length === 1 ? 'utt' : 'mine' });
        $$('[data-k]', pnl).forEach(b => b.onclick = () => { closePanel(); res(b.dataset.k); });
      });
      if (k === 'p') await practice(rec, { ko: u.ko, uttId: u.ids[0], pattern: u.pattern, keywords: u.keywords, kind: u.ids.length === 1 ? 'utt' : 'mine' });
      if (!stopped) callPos = i + 1;
    }
  }
  // ----- 2. 백현이랑 대화하기: 추천 없이 자유롭게 → 다듬기 → 다듬은 문장 연습 -----
  async function runChat() {
    for (let i = 0; i < qs.length && !stopped; i++) {
      const q = qs[i]; progress(`질문 ${i + 1}`);
      if (q.real) await play(q.u); else { $v('#vcap').innerHTML = `<span>앱 질문</span>${esc(q.ko)}`; await wait(1600); $v('#vcap').innerHTML = ''; }
      if (stopped) return; skipFlag = false; msg('baek', q.ko, q.real ? '' : '<small class="appq">앱 질문</small>');
      const r = await turn({ label: '자유롭게 영어로 대답해요' }); log('sp-chat', r, q.u.id); if (stopped) return;
      if (r.skipped) continue;
      const ans = q.real ? answerClip(q.u) : null;
      if (ans) { await play(ans, { label: `${NAME}는 이렇게 말했어` }); if (stopped) return; if (!skipFlag) msg('baek', ans.ko); skipFlag = false; }
      if (r.text) {
        const c = await coach(r.text, { question: q.ko }); if (stopped) return;
        if (c) await practice(c.target, { prompt: `${NAME}: ${q.ko}`, uttId: q.u.id, before: c.before });
      }
      if (stopped) return;
      const k = await ask('다음은?', [['n', '다음 질문 →'], ['e', '통화 마치기', 'soft']]);
      if (k === 'e') return;
    }
  }
  // ----- 3. 오래 이야기하기: 60초 → 확인 → 작은 힌트 → 다시 60초 … -----
  async function runLong() {
    const pool = qs; let qi = 0, q = pool[0];
    for (;;) {
      if (q.real) await play(q.u); else { $v('#vcap').innerHTML = `<span>앱 질문</span>${esc(q.ko)}`; await wait(1400); $v('#vcap').innerHTML = ''; }
      if (stopped) return;
      const k = await ask('이 질문으로 오래 이야기해볼까?', [['y', '60초 시작'], ['o', '다른 질문', 'soft']], esc(q.ko));
      if (k === 'y') break; qi = (qi + 1) % pool.length; q = pool[qi];
    }
    msg('baek', q.ko);
    const rounds = [], used = [];
    const tg = $v('#vtg');
    for (let i = 1; !stopped; i++) {
      progress(`${i}라운드 · 60초`);
      const r = await turn({ limit: 60, auto: true, label: i === 1 ? '60초 동안 자유롭게 이야기해요' : '힌트를 넣어서 더 길게 이야기해요' }); log('sp-long', r, q.u.id); if (stopped) return;
      tg.classList.add('hide');
      rounds.push(r);
      const all = rounds.map(x => x.text).join(' ');
      const hint = talkHint(all, used); used.push(hint.k);
      const feats = talkFeatures(all);
      const prev = rounds[rounds.length - 2];
      const w = words(r.text), wpm = r.sec >= 10 ? Math.round(w / r.sec * 60) : '—';
      const k = await new Promise(res => {
        panel(`<div class="vp-h">${i}라운드 · 내 이야기</div>
          <div class="long-stats"><div><b>${w}</b><span>단어</span></div><div><b>${wpm}</b><span>단어/분</span></div><div><b class="${prev && w > words(prev.text) ? 'up' : ''}">${prev ? `${w - words(prev.text) >= 0 ? '+' : ''}${w - words(prev.text)}` : '—'}</b><span>지난 라운드 대비</span></div></div>
          <div class="long-bars">${rounds.map((x, j) => `<i style="--h:${Math.min(100, words(x.text) * 1.4 + 6)}%" class="${j === rounds.length - 1 ? 'on' : ''}"><em>${words(x.text)}</em></i>`).join('')}</div>
          <p class="long-text en">${r.text ? esc(r.text) : '<span class="muted">말한 내용이 없어요</span>'}</p>
          ${feats.length ? `<div class="feat-row">${feats.map(f => `<span class="hchip on">${FEAT[f]}</span>`).join('')}</div>` : ''}
          <div class="long-hint"><span class="lh-tag">${ic('bulb')} 작은 힌트</span><b>${esc(hint.t)}</b><p><span class="en">${esc(hint.ex)}</span> · ${esc(hint.ko)}</p></div>
          <div class="row mt12"><button class="btn soft" data-k="e">마치기</button><button class="btn grow" data-k="a">${ic('mic')} 다시 60초 말하기</button></div>`);
        $$('[data-k]', pnl).forEach(b => b.onclick = () => { closePanel(); res(b.dataset.k); });
      });
      if (k === 'e') break;
      tg.innerHTML = `<div class="say tip"><span class="say-tag">${ic('bulb')} 이번 라운드</span><p class="say-ko">${esc(hint.t)}</p><p class="say-en en small-en">${esc(hint.ex)}</p></div>`; tg.classList.remove('hide');
    }
    tg.classList.add('hide');
    if (stopped) return;
    const best = rounds.map(r => r.text).sort((a, b) => words(b) - words(a))[0] || '';
    if (best) { const c = await coach(best, { question: q.ko }); if (c && !stopped) await practice(c.target, { prompt: `${NAME}: ${q.ko}`, uttId: q.u.id, before: c.before }); }
  }

  // ----- 마무리: “다음에 또 봐~” 한 마디만 보여주고 바로 TALK로 -----
  async function finale() {
    if (dead) return;
    stopped = true; endTurn?.(); pl.stop(); closePanel(); stopRing();
    const sec = t0 ? Math.round((Date.now() - t0) / 1000) : 0;
    clearInterval(timer);
    if (accepted && sec > 0) D.addTalkLog({ kind: 'call', mode, videoId: v?.id || null, title: v?.title || '', concept, sec, spoke: stats.sec, n: stats.n, ...(mode === 'call' ? { pos: callPos, total: callTotal } : {}) });
    blip('end');
    $('.vcall', root).classList.add('ending');
    $v('#vbye').classList.remove('hide');
    await wait(1900);
    if (dead) return;
    cleanup(); document.body.classList.remove('in-call'); speak(root);
  }
  function cleanup() { if (dead) return; dead = stopped = true; stopRing(); endTurn?.(); clearInterval(timer); pl.destroy(); unPhoto?.(); active = null; }
  active = cleanup;
  let finDone = false; const finaleOnce = () => { if (finDone) return; finDone = true; finale(); };
  $v('#vend').onclick = () => finaleOnce();

  async function run() {
    await wait(700); if (dead) return;
    try {
      if (mode === 'call' && v) await runCall();
      else if (mode === 'chat') await runChat();
      else if (mode === 'long') await runLong();
    } catch (e) { console.warn(e); }
    finaleOnce();
  }
}
const FEAT = { reason: '이유', example: '예시', feeling: '감정', past: '경험', detail: '디테일', sequence: '순서', plan: '계획', contrast: '반전', ask: '질문 돌려주기' };
