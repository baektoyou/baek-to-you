// CALL — 백현이랑 전화하기 · 대화하기 · 오래 이야기하기
// 백현이 화면·목소리는 실제 영상 클립만 사용 (백현이가 하지 않은 말을 만들지 않음)
// 흐름: 백현이가 말함(영어 자막) → 내가 대답 → 짧은 평가 + 추천 표현 → 백현이가 다음 말을 이어감 (‘다음’ 버튼 없이)
import * as D from './store.js';
import * as S from './speech.js';
import { Player } from './yt.js';
import { esc, $, $$, ic, toast, h, natOf, sheet, hintBox, sayCard, unitHTML, verdictHTML } from './ui.js';
import { talkHint, talkFeatures, libFor, TALK_HINTS } from './feedback.js';
import { judgeReply, judgeTranslation, bestReply } from './judge.js';
import { appQuestion, detectTopics } from './talk-engine.js';
import { pickVideo, pickPhoto, conceptOf, sceneOf, mountPhoto, rememberPhoto, callable, situations, matchesSit, isLive } from './scene.js';
import { startRing, stopRing, blip, unlock } from './ringtone.js';

const NAME = '백현이';
let active = null;   // 진행 중인 통화 정리 함수
let sit = '';        // CALL에서 고른 상황 ('' = 랜덤)
let day = '';        // 통화 기록에서 보고 있는 날짜 ('' = 오늘)

// ---------- 데이터 ----------
const allClips = () => D.get().utts.filter(u => u.ko && D.video(u.videoId) && isLive(D.video(u.videoId))).sort((a, b) => a.videoId < b.videoId ? -1 : a.videoId > b.videoId ? 1 : a.start - b.start);
const isQ = u => u.type === 'question' || /\?\s*$/.test(u.ko || '') || /\?\s*$/.test(natOf(u));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const words = t => (t || '').trim().split(/\s+/).filter(Boolean).length;
const wait = ms => new Promise(r => setTimeout(r, ms));
// 질문: 백현이가 실제로 질문한 클립 → 없으면 문장에 등록된 패턴 질문(앱 질문)
function questionPool() {
  const clips = allClips(); const real = clips.filter(isQ).map(u => ({ u, real: true, en: natOf(u), ko: u.ko }));
  if (real.length) return real;
  return clips.filter(u => u.question).map(u => ({ u, real: false, en: libFor(u.pattern)?.qEn || '', ko: u.question }));
}
// 같은 영상에서 질문 바로 뒤에 백현이가 직접 한 말
function answerClip(q) {
  return D.uttsOf(q.videoId).find(u => u.id !== q.id && u.start >= q.start + 0.5 && u.start - q.end < 120 && !isQ(u) && natOf(u)) || null;
}
// 오래 이야기하기: 대화를 넓힐 수 있는 질문 우선 (열린 질문 · 충분한 길이 · 답변 예시 · 이어지는 말)
function richScore(q) {
  const en = q.en || ''; let s = Math.min(4, words(en) / 3);
  if (/^(what|how|why|tell me|which|where)\b/i.test(en.trim()) || /\b(what|how|why)\b/i.test(en)) s += 3;
  if (/^(do|did|are|is|have|can)\b/i.test(en.trim())) s -= 1;
  if (q.u.replies?.length) s += 1;
  if (q.real && answerClip(q.u)) s += 1.5;
  if (words(en) < 4) s -= 4;
  return s;
}
const EXTEND = ["To be honest, …", "The thing is, …", "For example, …", "That's why …", "On top of that, …", "What I like about it is …", "Long story short, …", "I'm not sure, but I think …"];

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
    const u = { ...us[i], en: { ...us[i].en }, keywords: [...(us[i].keywords || [])], replies: [...(us[i].replies || [])], ids: [us[i].id] };
    while (i + 1 < us.length && FRAG.test(u.ko.trim()) && us[i + 1].start - u.end < 0.9 && (u.ko + us[i + 1].ko).length < 110) {
      const n = us[++i];
      u.ko = `${u.ko} ${n.ko}`; const nx = natOf(n); u.en.natural = `${natOf(u)} ${/,\s*$/.test(natOf(u)) && !/^I\b/.test(nx) ? nx.charAt(0).toLowerCase() + nx.slice(1) : nx}`.trim(); u.end = n.end; u.ids.push(n.id);
      u.pattern = [u.pattern, n.pattern].filter(Boolean).join(', '); u.keywords.push(...(n.keywords || [])); u.replies = n.replies?.length ? [...n.replies] : u.replies; u.hint = n.hint || u.hint; u.type = n.type || u.type;
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
const MODE_KO = { call: '전화', chat: '대화', long: '오래 이야기', today: '오늘의 백현이' };
const dayDate = d => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd); };
const addDay = (d, n) => { const x = dayDate(d); x.setDate(x.getDate() + n); return D.today(x); };
const dayLabel = d => { const t = D.today(); const x = dayDate(d); const md = `${x.getMonth() + 1}월 ${x.getDate()}일`; return d === t ? `오늘 · ${md}` : d === addDay(t, -1) ? `어제 · ${md}` : `${md} (${'일월화수목금토'[x.getDay()]})`; };

// ---------- 첫 화면 ----------
// 통화 기록: 날짜별 · 영상별 한 줄 (그 날 통화 시간) + 끊긴 곳이 있으면 ‘이어서’ (전화 모드에만 있음)
function resumeMap() {
  const out = new Map(), seen = new Set();
  for (const l of D.get().talkLogs || []) { // 최신순
    if (!l.videoId || seen.has(l.videoId)) continue; seen.add(l.videoId);
    if (l.mode !== 'call') continue;
    const v = D.video(l.videoId); if (!v || !callable(v) || l.pos == null) continue;
    const total = callTurns(v).length; if (l.pos >= 1 && l.pos < total) out.set(l.videoId, { pos: l.pos, total, at: l.at });
  }
  return out;
}
function dayGroups(logs) {
  const out = new Map();
  for (const l of logs) {
    const key = l.videoId || `mode:${l.mode || 'call'}`;
    const g = out.get(key) || { key, v: l.videoId ? D.video(l.videoId) : null, last: l, sec: 0, n: 0 };
    g.sec += l.sec || 0; g.n++; out.set(key, g);
  }
  return [...out.values()];
}
export function speak(root) {
  active?.(); active = null;
  const today = D.today(); if (!day || day > today) day = today;
  const vids = D.get().videos.filter(callable);
  const sits = situations().filter(([k]) => vids.some(v => matchesSit(v, k)));
  if (sit && !sits.some(([k]) => k === sit)) sit = '';
  const qs = questionPool(); const dd = D.callDay(day); const groups = dayGroups(dd.logs); const rm = resumeMap();
  const isToday = day === today;
  root.innerHTML = `<div class="screen talk">
    <header class="top"><h1 class="page-title">CALL</h1></header>
    <section class="call-card">
      <p class="cc-q">${vids.length ? `${NAME}는 지금 뭐하고 있을까요?` : '전화할 라이브 영상이 아직 없어요'}</p>
      ${vids.length ? `<button class="call-orb" id="call" aria-label="${NAME}랑 전화하기"><span class="orb-waves"><i></i><i></i><i></i></span><span class="orb">${ic('phoneF')}</span></button>
      <b class="cc-label">${NAME}랑 전화하기</b>
      ${sits.length ? `<div class="sit-scroll"><div class="sit-row" id="sits"><button class="sit ${sit ? '' : 'on'}" data-sit="">랜덤</button>${sits.map(([k, l]) => `<button class="sit ${sit === k ? 'on' : ''}" data-sit="${k}">${esc(l)}</button>`).join('')}</div></div>` : ''}`
        : `<a class="btn sm soft" href="#/settings">${ic('plus')} 영상 추가하기</a>`}
    </section>
    <div class="modes">
      <button class="mode" data-mode="chat" ${qs.length ? '' : 'disabled'}><span class="mode-ic">${ic('chat')}</span><b class="grow">${NAME}랑 대화하기</b>${ic('next')}</button>
      <button class="mode" data-mode="long" ${qs.length ? '' : 'disabled'}><span class="mode-ic">${ic('timer')}</span><b class="grow">${NAME}랑 오래 이야기하기</b>${ic('next')}</button>
    </div>
    <section class="call-log">
      <div class="cl-total">
        <div class="cl-day"><button class="cl-nav" id="dprev" aria-label="이전 날">${ic('back')}</button><button class="cl-date" id="dcal">${esc(dayLabel(day))}${ic('clock')}</button><button class="cl-nav" id="dnext" aria-label="다음 날" ${isToday ? 'disabled' : ''}>${ic('next')}</button></div>
        <span class="label">${isToday ? '오늘 통화시간' : '통화시간'}</span><div class="cl-big">${bigDur(dd.total)}</div>
      </div>
      ${groups.length ? `<div class="cl-list">${groups.map(g => { const r = g.v && rm.get(g.v.id); const showR = r && dd.logs.some(l => l.at === r.at);
        return `<div class="cl-row"><div class="grow"><b>${esc(g.v ? (g.last.concept || conceptOf(g.v)) : MODE_KO[g.last.mode] || '통화')}</b><small>${g.v ? `${esc(g.v.title)} · ` : ''}${clock(g.sec)}</small></div>${showR ? `<button class="cl-resume" data-resume="${g.v.id}" data-pos="${r.pos}">이어서 ${r.pos + 1}/${r.total}</button>` : ''}</div>`; }).join('')}</div>` : ''}
    </section>
  </div>`;
  $('#call', root) && ($('#call', root).onclick = () => { unlock(); call(root, 'call', pickVideo(new Date(), sit)); });
  $$('[data-resume]', root).forEach(b => b.onclick = () => { unlock(); call(root, 'call', D.video(b.dataset.resume), { start: +b.dataset.pos }); });
  $$('[data-sit]', root).forEach(b => b.onclick = () => { sit = b.dataset.sit; $$('[data-sit]', root).forEach(x => x.classList.toggle('on', x === b)); b.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' }); });
  $$('[data-mode]', root).forEach(b => b.onclick = () => { unlock(); call(root, b.dataset.mode); });
  $('#dprev', root).onclick = () => { day = addDay(day, -1); speak(root); };
  $('#dnext', root).onclick = () => { if (day < today) { day = addDay(day, 1); speak(root); } };
  $('#dcal', root).onclick = () => calSheet(day, d => { day = d; speak(root); });
  return () => { active?.(); active = null; };
}
// 달력: 통화한 날에 점
function calSheet(cur, pick) {
  const has = D.callDays(); let base = dayDate(cur); base.setDate(1);
  const sh = sheet(`<div class="cal-h"><button class="cl-nav" data-m="-1">${ic('back')}</button><b id="calt"></b><button class="cl-nav" data-m="1">${ic('next')}</button></div><div class="cal" id="cal"></div>`);
  const draw = () => {
    $('#calt', sh).textContent = `${base.getFullYear()}년 ${base.getMonth() + 1}월`;
    const first = base.getDay(), n = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate(), t = D.today();
    $('#cal', sh).innerHTML = '일월화수목금토'.split('').map(x => `<span class="cal-w">${x}</span>`).join('') + '<span></span>'.repeat(first)
      + Array.from({ length: n }, (_, i) => { const d = D.today(new Date(base.getFullYear(), base.getMonth(), i + 1)); return `<button class="cal-d ${d === cur ? 'on' : ''} ${has.has(d) ? 'dot' : ''}" data-d="${d}" ${d > t ? 'disabled' : ''}>${i + 1}</button>`; }).join('');
    $$('[data-d]', sh).forEach(b => b.onclick = () => { sh.close(); pick(b.dataset.d); });
  };
  $$('[data-m]', sh).forEach(b => b.onclick = () => { base.setMonth(base.getMonth() + +b.dataset.m); draw(); });
  draw();
}

// ---------- 통화 ----------
// 화면 구성: 통화 화면 위에 수신 화면(사진)을 덮어서 시작 → 받으면 사진은 사라지고 다시 나오지 않음
function call(root, mode, v = null, { start = 0 } = {}) {
  active?.(); active = null;
  // 대화·오래 이야기: 질문 순서를 먼저 정하고, 첫 질문이 나온 영상의 분위기로 사진·콘셉트를 맞춰요
  let qs = mode === 'call' ? [] : shuffle(questionPool());
  if (mode === 'long') qs = qs.map(q => ({ q, s: richScore(q) + Math.random() * 1.5 })).sort((a, b) => b.s - a.s).map(x => x.q);
  if (mode !== 'call') v = (qs[0] && D.video(qs[0].u.videoId)) || v;
  document.body.classList.add('in-call');
  const concept = v ? conceptOf(v, sceneOf(v), mode === 'call' ? sit : '') : '';
  const ph = pickPhoto(v);
  const st = D.get().settings, me = D.profile(), myName = me.name || '나';
  root.innerHTML = `<div class="vcall ${st.callFill !== false ? 'fill' : 'fit'}">
    <div class="vc-stage"><div class="vc-ambient"></div><div class="vc-video" id="vv"><div id="vp"></div></div><div class="vc-grad"></div>
      <div class="vc-wait" id="vwait"><span class="vw-dots"><i></i><i></i><i></i></span></div></div>
    <header class="vc-head"><b>${NAME}</b><span class="vc-time" id="vtm">00:00</span></header>
    <span class="vc-prog" id="vprog"></span>
    ${me.photo ? `<div class="vc-self" style="background-image:url('${me.photo}')"></div>` : ''}
    <div class="vc-tap hide" id="vtap">화면을 한 번 탭하면 재생돼요</div>
    <div class="vc-target hide" id="vtg"></div>
    <div class="vc-low"><div class="vc-cap en" id="vcap"></div>
      <div class="vc-chat" id="vchat"></div>
      <div class="vc-fb hide" id="vfb"></div>
      <div class="vc-hint hide" id="vhint"></div>
      <p class="vc-status" id="vst"></p>
      <div class="vc-ctrl">
        <button class="vc-btn" id="vskip" aria-label="넘기기">${ic('next')}</button>
        <button class="vc-mic" id="vmic" aria-label="말하기"><svg class="ring-svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="37"/></svg>${ic('micF')}<em id="vsec"></em></button>
        <button class="vc-btn end" id="vend" aria-label="통화 종료">${ic('phoneoff')}</button>
      </div></div>
    <div class="vc-panel" id="vpanel"></div>
    <div class="vc-bye hide" id="vbye"><p>${NAME}와 통화 종료</p></div>
    <div class="ring2" id="ring">
      <div class="ring-photo" id="rphoto"></div><div class="ring-shade"></div>
      <div class="ring-top"><span class="ring-kind">${ic('cam')} ${me.name ? `${esc(me.name)}에게 ` : ''}영상통화</span><h2 class="ring-name">${NAME}</h2>${concept ? `<p class="ring-concept">${esc(concept)}</p>` : ''}</div>
      <div class="ring-acts"><div><button class="r-no" id="dec" aria-label="거절">${ic('phoneoff')}</button><span>거절</span></div>
        <div><button class="r-ok" id="acc" aria-label="받기"><span class="ring-waves"><i></i><i></i><i></i></span>${ic('phoneF')}</button><span>받기</span></div></div>
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

  // ----- 수신 화면 -----
  const ring = $v('#ring');
  const killRing = () => { stopRing(); ring.classList.add('leave'); setTimeout(() => { unPhoto?.(); unPhoto = null; ring.remove(); }, 900); };
  $v('#dec').onclick = () => { stopRing(); blip('end'); cleanup(); document.body.classList.remove('in-call'); speak(root); };
  $v('#acc').onclick = () => {
    if (accepted) return; accepted = true; blip('connect'); killRing();
    t0 = Date.now(); timer = setInterval(() => ($v('#vtm').textContent = clock((Date.now() - t0) / 1000)), 1000);
    run();
  };
  // 넘기기: 백현이가 말하는 중이면 그 문장을, 내 차례·피드백 중이면 바로 다음으로
  $v('#vskip').onclick = () => {
    if (!accepted || stopped) return;
    if (skipTurn) { skipTurn(); return; }
    skipFlag = true; pl.stop(); $v('#vcap').innerHTML = '';
  };

  // ----- 채팅 (라이브 방송처럼 아래에서 올라옴) -----
  const chat = $v('#vchat');
  function msg(who, text) {
    const m = h(`<div class="vm ${who}">${who === 'baek' ? `<i class="bh-av" style="background-image:url('icons/bh-profile.jpg')"></i>` : `<i>${esc(myName[0])}</i>`}<div><b>${who === 'baek' ? NAME : esc(myName)}</b><p class="en">${esc(text)}</p></div></div>`);
    chat.appendChild(m); chat.scrollTop = chat.scrollHeight; return m;
  }
  // 백현이 클립 재생 · 가운데 자막은 번역된 영어
  async function play(u, { cap = natOf(u) } = {}) {
    if (dead) return;
    const vid = D.video(u.videoId); if (!vid) return;
    status(`${NAME}가 말하는 중`);
    $v('#vcap').innerHTML = cap ? unitHTML(cap) : '';
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
      if (hint?.en) { hb.classList.remove('hide'); hintBox(hb, hint.en, hint); } else { hb.classList.add('hide'); hb.innerHTML = ''; }
      let cap = null, live = null, tick = null, st = 0, done = false;
      const finish = (text, sec, skipped = false) => { if (done) return; done = true; endTurn = skipTurn = null; clearInterval(tick); mic.classList.remove('ready', 'live', 'over'); secEl.textContent = ''; hb.classList.add('hide'); mic.onclick = null; resolve({ text, sec, skipped }); };
      endTurn = () => { cap?.stop(); finish('', 0); };
      skipTurn = () => { const c = cap; cap = null; c?.stop(); live?.remove(); finish('', 0, true); };
      mic.onclick = async () => {
        if (cap) { cap.stop(); status('정리하는 중…'); return; }
        if (!S.support.stt) { const t = await typeBox(); if (t) { msg('me', t); finish(t, 0); } return; }
        pl.pause(); mic.classList.add('live'); status('듣는 중 · 다 말하면 ■'); st = Date.now(); hideFb();
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
      panel(`<div class="vp-h">영어로 입력</div><textarea class="textarea en" id="tb" rows="2"></textarea><button class="btn block mt12" id="tbs">보내기</button>`);
      $v('#tbs').onclick = () => { const t = $v('#tb').value.trim(); closePanel(); res(t); };
    });
  }
  // 아래에서 올라오는 패널 (오래 이야기하기 결과 등)
  const pnl = $v('#vpanel');
  function panel(html) { pnl.innerHTML = `<div class="grab"></div><div class="vp-body">${html}</div>`; pnl.classList.add('on'); pnl.scrollTop = 0; }
  function closePanel() { pnl.classList.remove('on'); }
  const log = (step, r, uttId) => r.text && D.addAttempt({ uttId: uttId || null, step, text: r.text, sec: r.sec });

  // 저장
  function saveSentence({ text, ko = '', uttId = null, note = '', before = '' }) {
    const r = D.saveExpr({ kind: 'mine', level: 'mine', uttId: uttId || null, ko, text, en: { easy: '', natural: text, advanced: '' }, pattern: '', before, note });
    return r;
  }
  // ----- 피드백 카드: 판정 한 줄 + 추천 표현(누르면 저장) · 잠시 뒤 자동으로 대화가 이어짐 -----
  const fb = $v('#vfb');
  const hideFb = () => { fb.classList.add('hide'); fb.innerHTML = ''; };
  function feedback(ev, recs = [], { practice = true, ms = 0, save = {} } = {}) {
    return new Promise(res => {
      const len = recs.reduce((n, r) => n + r.text.length, 0);
      const dur = ms || Math.min(9000, 3200 + len * 45 + (ev.msg || '').length * 30);
      fb.innerHTML = `<div class="fbc"><div class="fbc-top">${verdictHTML(ev)}${practice && recs.length ? `<button class="fbc-p" type="button">${ic('mic')} 연습</button>` : ''}</div>
        ${recs.map((r, i) => `<button class="fbc-s" type="button" data-r="${i}"><small>${esc(r.tag)}</small><span class="en">${unitHTML(r.text)}</span><i>${ic('bookmark')}</i></button>`).join('')}
        <i class="fbc-bar"><i></i></i></div>`;
      fb.classList.remove('hide');
      const bar = $('.fbc-bar i', fb); let t;
      const arm = () => { clearTimeout(t); bar.style.transition = 'none'; bar.style.width = '0%'; void bar.offsetWidth; bar.style.transition = `width ${dur}ms linear`; bar.style.width = '100%'; t = setTimeout(() => done('next'), dur); };
      const done = k => { clearTimeout(t); skipTurn = null; res(k); };
      $$('[data-r]', fb).forEach(b => b.onclick = () => { const r = recs[+b.dataset.r]; const s = saveSentence({ text: r.text, ...save }); b.classList.add('on'); toast(s.dup ? '이미 SAVED에 있어요' : '저장했어요'); arm(); });
      $('.fbc-p', fb) && ($('.fbc-p', fb).onclick = () => done('practice'));
      skipTurn = () => done('next');
      arm();
    });
  }
  // 추천: 규칙으로 다듬은 내 문장 + 원어민 답변 예시 중 내 말과 가까운 것
  const canon = t => String(t || '').toLowerCase().replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim();
  function recsFor(said, ev, replies = []) {
    const out = [];
    if (ev.fixed && canon(ev.fixed) !== canon(said)) out.push({ tag: '다듬은 문장', text: ev.fixed });
    const br = bestReply(said, replies);
    if (br && canon(br) !== canon(said) && !out.some(r => canon(r.text) === canon(br))) out.push({ tag: '원어민이라면', text: br });
    return out.slice(0, 2);
  }
  // 보고 말하기 → 안 보고 말하기 (흰 카드) → 짧은 평가 후 자동으로 이어짐
  async function practice(target, { prompt = '', uttId = null } = {}) {
    hideFb();
    const tg = $v('#vtg');
    tg.classList.remove('hide'); sayCard(tg, { en: target, mode: 'read' });
    const a = await turn({ label: '보고 말하기' }); log('sp-practice', a, uttId); if (stopped) return;
    if (!a.skipped) { sayCard(tg, { ko: prompt, en: target, mode: 'recall' }); $('.say-ko-big', tg)?.classList.add('en');
      const b = await turn({ label: '안 보고 말하기' }); log('sp-practice', b, uttId); if (stopped) return;
      tg.classList.add('hide'); tg.innerHTML = '';
      if (b.text) await feedback(judgeTranslation(b.text, target), [], { practice: false, ms: 2600 });
    }
    tg.classList.add('hide'); tg.innerHTML = ''; hideFb();
  }
  // 한 번의 대답 → 평가 → (선택) 연습
  async function respond(u, line, r, { strict = true } = {}) {
    if (!r.text) return;
    const ev = judgeReply(r.text, { question: line, strict });
    const recs = recsFor(r.text, ev, u?.replies || []);
    const k = await feedback(ev, recs, { save: { ko: `${NAME}: ${u?.ko || ''}`, note: line, uttId: u?.ids?.[0] || u?.id, before: r.text } });
    if (stopped) return;
    if (k === 'practice' && recs.length) await practice(recs[0].text, { prompt: line, uttId: u?.id });
  }
  const replyHint = u => { const src = (u?.hint && words(u.hint) >= 3 ? u.hint : '') || u?.replies?.[0] || ''; return src ? { en: src } : null; };

  // ----- 1. 백현이랑 전화하기: 영상 처음부터 순서대로 대화 -----
  async function runCall() {
    const list = callTurns(v); callTotal = list.length;
    for (let i = Math.min(start, list.length - 1); i < list.length && !stopped; i++) {
      const u = list[i]; callPos = i; progress(`${i + 1} / ${list.length}`);
      skipFlag = false; await play(u); if (stopped) return;
      if (skipFlag) { skipFlag = false; continue; }
      const line = natOf(u); msg('baek', line);
      const r = await turn({ label: '대답해볼까?', hint: replyHint(u) }); log('sp-call', r, u.id); if (stopped) return;
      if (!r.skipped) await respond(u, line, r, { strict: isQ(u) });
      if (!stopped) callPos = i + 1;
    }
  }
  // ----- 2. 백현이랑 대화하기: 질문 → 대답 → 평가 → 백현이가 실제로 이어서 한 말 → 다음 질문 -----
  async function runChat() {
    for (let i = 0; i < qs.length && !stopped; i++) {
      const q = qs[i]; progress(`${i + 1} / ${qs.length}`);
      const line = q.en || q.ko;
      skipFlag = false;
      if (q.real) await play(q.u); else { $v('#vcap').innerHTML = unitHTML(line); await wait(1600); $v('#vcap').innerHTML = ''; }
      if (stopped) return; skipFlag = false; msg('baek', line);
      const r = await turn({ label: '대답해볼까?', hint: replyHint(q.u) }); log('sp-chat', r, q.u.id); if (stopped) return;
      if (r.skipped) continue;
      await respond(q.u, q.en, r, { strict: true }); if (stopped) return;
      const ans = q.real ? answerClip(q.u) : null;
      if (ans) { hideFb(); skipFlag = false; await play(ans); if (stopped) return; if (!skipFlag) msg('baek', natOf(ans)); skipFlag = false; }
    }
  }
  // ----- 3. 오래 이야기하기: 이야깃거리 → 60초 → 확인 → 힌트 → 다시 60초 … -----
  function kitHTML(q, { compact = false, hint = null } = {}) {
    const t = q.en || q.ko; const tops = detectTopics(t);
    const prompts = (hint ? [hint] : TALK_HINTS.filter(x => ['reason', 'example', 'feeling', 'past', 'plan'].includes(x.k)).sort(() => Math.random() - .5).slice(0, 3));
    if (compact) return `<div class="kit compact"><p class="kit-q en">${esc(t)}</p><ul class="kit-l">${prompts.map(p => `<li><b>${esc(p.t)}</b><em class="en">${esc(p.ex)}</em></li>`).join('')}</ul></div>`;
    const used = new Set(); const asks = [appQuestion(tops, used)]; used.add(asks[0]); asks.push(appQuestion(tops, used));
    const xs = [...new Set([...(q.u.replies || []).slice(0, 1), ...EXTEND.sort(() => Math.random() - .5).slice(0, 3)])];
    return `<div class="kit"><p class="kit-q en">${esc(t)}</p>${q.en && q.ko ? `<p class="kit-ko">${esc(q.ko)}</p>` : ''}
      <div class="kit-sec"><span>이어서 할 이야기</span><ul class="kit-l">${prompts.map(p => `<li><b>${esc(p.t)}</b><em class="en">${esc(p.ex)}</em></li>`).join('')}</ul></div>
      <div class="kit-sec"><span>되물어볼 질문</span><ul class="kit-l">${[...new Set(asks)].map(a => `<li class="en">${esc(a)}</li>`).join('')}<li class="en">What about you?</li></ul></div>
      <div class="kit-sec"><span>추천 표현 · 누르면 저장</span><div class="kit-x">${xs.map(x => `<button class="xp en" type="button" data-kx="${esc(x)}">${ic('plus')}<span>${esc(x)}</span></button>`).join('')}</div></div>
      <div class="row mt12"><button class="btn soft" id="kother">다른 질문</button><button class="btn grow" id="kgo">${ic('mic')} 60초 이야기하기</button></div></div>`;
  }
  async function runLong() {
    let qi = 0, q = qs[0]; const tg = $v('#vtg');
    for (;;) {
      if (q.real) await play(q.u); else { $v('#vcap').innerHTML = unitHTML(q.en || q.ko); await wait(1400); $v('#vcap').innerHTML = ''; }
      if (stopped) return;
      tg.innerHTML = kitHTML(q); tg.classList.remove('hide'); tg.classList.add('kit-on');
      $$('[data-kx]', tg).forEach(b => b.onclick = () => { if (b.classList.contains('on')) return; const w = D.saveWord({ text: b.dataset.kx.replace(/\s*…\s*$/, '').trim(), kind: 'expr' }); b.classList.add('on'); b.innerHTML = `${ic('check')}<span>${esc(b.dataset.kx)}</span>`; toast(w.dup ? '이미 저장한 표현이에요' : '표현을 저장했어요'); });
      status('준비되면 60초 시작');
      const k = await new Promise(res => { $v('#kgo').onclick = () => res('y'); $v('#kother').onclick = () => res('o'); skipTurn = () => res('o'); endTurn = () => res('e'); });
      skipTurn = endTurn = null;
      if (stopped || k === 'e') return;
      if (k === 'y') break; qi = (qi + 1) % qs.length; q = qs[qi];
    }
    msg('baek', q.en || q.ko);
    const rounds = [], used = [];
    let hint = null;
    for (let i = 1; !stopped; i++) {
      progress(`${i}라운드 · 60초`);
      tg.innerHTML = kitHTML(q, { compact: true, hint }); tg.classList.remove('hide');
      const r = await turn({ limit: 60, auto: true, label: i === 1 ? '60초 동안 자유롭게 이야기해요' : '힌트를 넣어서 더 길게' }); log('sp-long', r, q.u.id); if (stopped) return;
      tg.classList.add('hide');
      rounds.push(r);
      const all = rounds.map(x => x.text).join(' ');
      hint = talkHint(all, used); used.push(hint.k);
      const feats = talkFeatures(all);
      const prev = rounds[rounds.length - 2];
      const w = words(r.text);
      const ev = r.text ? judgeReply(r.text, { question: q.en, strict: false }) : null;
      const fixed = ev?.fixed && canon(ev.fixed) !== canon(r.text) ? ev.fixed : '';
      const k = await new Promise(res => {
        panel(`<div class="vp-h">${i}라운드</div>
          <div class="long-stats"><div><b>${w}</b><span>단어</span></div><div><b>${r.sec >= 10 ? Math.round(w / r.sec * 60) : '—'}</b><span>단어/분</span></div><div><b class="${prev && w > words(prev.text) ? 'up' : ''}">${prev ? `${w - words(prev.text) >= 0 ? '+' : ''}${w - words(prev.text)}` : '—'}</b><span>지난 라운드 대비</span></div></div>
          ${ev ? verdictHTML(ev) : ''}
          ${feats.length ? `<div class="feat-row">${feats.map(f => `<span class="hchip on">${FEAT[f]}</span>`).join('')}</div>` : ''}
          ${fixed ? `<button class="fbc-s light" id="lfix" type="button"><small>다듬은 문장</small><span class="en">${unitHTML(fixed)}</span><i>${ic('bookmark')}</i></button>` : ''}
          <div class="long-hint"><span class="lh-tag">${ic('bulb')} 다음 라운드</span><b>${esc(hint.t)}</b><p><span class="en">${esc(hint.ex)}</span> · ${esc(hint.ko)}</p></div>
          <div class="row mt12"><button class="btn soft" data-k="e">마치기</button><button class="btn grow" data-k="a">${ic('mic')} 다시 60초</button></div>`);
        $v('#lfix') && ($v('#lfix').onclick = e => { const s = saveSentence({ text: fixed, ko: `${NAME}: ${q.ko}`, note: q.en, before: r.text }); e.currentTarget.classList.add('on'); toast(s.dup ? '이미 SAVED에 있어요' : '저장했어요'); });
        $$('[data-k]', pnl).forEach(b => b.onclick = () => { closePanel(); res(b.dataset.k); });
      });
      if (k === 'e') break;
    }
    tg.classList.add('hide');
  }

  // ----- 마무리: 작은 글씨 한 줄만 보여주고 바로 CALL로 -----
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
    cleanup(); document.body.classList.remove('in-call'); day = D.today(); speak(root);
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
