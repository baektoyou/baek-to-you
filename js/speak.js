// CALL — 백현이 한국어를 듣고 영어로 ‘번역’해서 말하기 (CHAT은 듣고 ‘대답’하기)
// 백현이 화면·목소리는 실제 영상 클립만 사용 (백현이가 하지 않은 말을 만들지 않음)
import * as D from './store.js';
import * as S from './speech.js';
import { Player } from './yt.js';
import { esc, $, $$, ic, toast, h, natOf, sheet, hintBox, sayCard, verdictHTML, correctionHTML, naturalHTML, exprChips, bindSaves, swipeDelete } from './ui.js';
import { talkHint, libFor, TALK_HINTS, improve } from './feedback.js';
import { judgeReply, judgeTranslation, bestReply, keyExpressions } from './judge.js';
import { appQuestion, detectTopics } from './talk-engine.js';
import { koHelp, helpHTML, isKo, ASK_KO } from './kohelp.js';
import { pickVideo, pickPhoto, conceptOf, sceneOf, mountPhoto, rememberPhoto, callable, situations, matchesSit, isLive } from './scene.js';
import { startRing, stopRing, blip, unlock } from './ringtone.js';

const NAME = '백현이';
let active = null;   // 진행 중인 통화 정리 함수
let sit = '';        // 고른 상황 ('' = 랜덤)
let day = '';        // 통화 기록에서 보고 있는 날짜

// ---------- 데이터 ----------
const allClips = () => D.get().utts.filter(u => u.ko && D.video(u.videoId) && isLive(D.video(u.videoId))).sort((a, b) => a.videoId < b.videoId ? -1 : a.videoId > b.videoId ? 1 : a.start - b.start);
const isQ = u => u.type === 'question' || /\?\s*$/.test(u.ko || '') || /\?\s*$/.test(natOf(u));
const words = t => (t || '').trim().split(/\s+/).filter(Boolean).length;
const wait = ms => new Promise(r => setTimeout(r, ms));
const canon = t => String(t || '').toLowerCase().replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim();
function questionPool() {
  const clips = allClips(); const real = clips.filter(isQ).map(u => ({ u, real: true, en: natOf(u), ko: u.ko }));
  if (real.length) return real;
  return clips.filter(u => u.question).map(u => ({ u, real: false, en: libFor(u.pattern)?.qEn || '', ko: u.question }));
}
// 오래 이야기하기: 대화를 넓힐 수 있는 질문 우선 (열린 질문 · 충분한 길이 · 답변 예시)
function richScore(q) {
  const en = q.en || ''; let s = Math.min(4, words(en) / 3);
  if (/\b(what|how|why|tell me|which|where)\b/i.test(en)) s += 3;
  if (/^(do|did|are|is|have|can)\b/i.test(en.trim())) s -= 1;
  if (q.u.replies?.length) s += 1;
  if (words(en) < 4) s -= 4;
  return s;
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
// 통화 기록: 날짜별 · 영상별 한 줄 (왼쪽으로 밀어서 삭제) + 끊긴 곳이 있으면 ‘이어서’ (전화 모드만)
function resumeMap() {
  const out = new Map(), seen = new Set();
  for (const l of D.get().talkLogs || []) {
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
    const g = out.get(key) || { key, v: l.videoId ? D.video(l.videoId) : null, last: l, sec: 0, n: 0, ids: [] };
    g.sec += l.sec || 0; g.n++; g.ids.push(l.id); out.set(key, g);
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
  // 상황: 랜덤 + 3개만 보이고 나머지는 ‘더보기’
  const front = sits.slice(0, 3); if (sit && !front.some(([k]) => k === sit)) front[2] = sits.find(([k]) => k === sit);
  root.innerHTML = `<div class="screen talk">
    <header class="top"><h1 class="page-title">CALL</h1></header>
    <section class="call-card">
      <p class="cc-q">${vids.length ? `${NAME} 말을 듣고 영어로 바꿔 말해요` : '전화할 라이브 영상이 아직 없어요'}</p>
      ${vids.length ? `<button class="call-orb" id="call" aria-label="${NAME}랑 전화하기"><span class="orb-waves"><i></i><i></i><i></i></span><span class="orb">${ic('phoneF')}</span></button>
      <b class="cc-label">${NAME}랑 전화하기</b>
      ${sits.length ? `<div class="sit-row wrap center" id="sits"><button class="sit ${sit ? '' : 'on'}" data-sit="">랜덤</button>${front.map(([k, l]) => `<button class="sit ${sit === k ? 'on' : ''}" data-sit="${k}">${esc(l)}</button>`).join('')}${sits.length > 3 ? `<button class="sit more" id="sitmore">더보기 ${sits.length - 3}</button>` : ''}</div>` : ''}`
        : `<a class="btn sm soft" href="#/settings">${ic('plus')} 영상 추가하기</a>`}
    </section>
    <div class="modes">
      <button class="mode" data-mode="long" ${qs.length ? '' : 'disabled'}><span class="mode-ic">${ic('timer')}</span><b class="grow">${NAME}랑 오래 이야기하기</b>${ic('next')}</button>
    </div>
    <section class="call-log">
      <div class="cl-total">
        <div class="cl-day"><button class="cl-nav" id="dprev" aria-label="이전 날">${ic('back')}</button><button class="cl-date" id="dcal">${esc(dayLabel(day))}${ic('clock')}</button><button class="cl-nav" id="dnext" aria-label="다음 날" ${isToday ? 'disabled' : ''}>${ic('next')}</button></div>
        <span class="label">${isToday ? '오늘 통화시간' : '통화시간'}</span><div class="cl-big">${bigDur(dd.total)}</div>
      </div>
      ${groups.length ? `<div class="cl-list">${groups.map((g, gi) => { const r = g.v && rm.get(g.v.id); const showR = r && dd.logs.some(l => l.at === r.at);
        return `<div class="cl-row" data-g="${gi}"><div class="grow"><b>${esc(g.v ? (g.last.concept || conceptOf(g.v)) : MODE_KO[g.last.mode] || '통화')}</b><small>${g.v ? `${esc(g.v.title)} · ` : ''}${clock(g.sec)}</small></div>${showR ? `<button class="cl-resume" data-resume="${g.v.id}" data-pos="${r.pos}">이어서 ${r.pos + 1}/${r.total}</button>` : ''}</div>`; }).join('')}</div>` : ''}
    </section>
  </div>`;
  $('#call', root) && ($('#call', root).onclick = () => { unlock(); call(root, 'call', pickVideo(new Date(), sit)); });
  $$('.cl-row', root).forEach(row => swipeDelete(row, () => { D.deleteTalkLogs(groups[+row.dataset.g].ids); toast('기록을 삭제했어요'); speak(root); }));
  $$('[data-resume]', root).forEach(b => b.onclick = () => { unlock(); call(root, 'call', D.video(b.dataset.resume), { start: +b.dataset.pos }); });
  $$('[data-sit]', root).forEach(b => b.onclick = () => { sit = b.dataset.sit; $$('[data-sit]', root).forEach(x => x.classList.toggle('on', x === b)); });
  $('#sitmore', root) && ($('#sitmore', root).onclick = () => {
    const sh = sheet(`<h3>상황 고르기</h3><div class="sit-grid"><button class="sit ${sit ? '' : 'on'}" data-s="">랜덤</button>${sits.map(([k, l]) => `<button class="sit ${sit === k ? 'on' : ''}" data-s="${k}">${esc(l)}</button>`).join('')}</div>`);
    $$('[data-s]', sh).forEach(b => b.onclick = () => { sit = b.dataset.s; sh.close(); speak(root); });
  });
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

// ---------- 오래 이야기하기: 질문에 맞는 답변 틀 (한국어 뜻 포함) ----------
const FRAMES = [
  [/\b(eat|ate|eaten|food|dinner|lunch|breakfast|meal|hungry)\b/i, [["I had ___ for dinner.", '저녁으로 ___ 먹었어'], ["I'm craving ___ right now.", '지금 ___ 너무 먹고 싶어']]],
  [/\b(song|songs|music|listen|listening|album)\b/i, [["I've been listening to ___ a lot.", '요즘 ___ 많이 들어'], ["I love it because ___.", '___라서 좋아']]],
  [/\b(sleep|slept|bed|tired|night)\b/i, [["I couldn't sleep well because ___.", '___ 때문에 잠을 잘 못 잤어'], ['I usually go to bed around ___.', '보통 ___쯤 자']]],
  [/\b(weekend|plan|plans|tomorrow|tonight)\b/i, [["I'm planning to ___.", '___할 계획이야'], ["I'm going to ___ with ___.", '___랑 ___할 거야']]],
  [/\b(recommend|recommendation)\b/i, [['You should try ___.', '___ 꼭 해봐'], ["I'd recommend ___ because ___.", '___ 추천해, ___라서']]],
  [/\b(favorite|favourite)\b/i, [['My favorite ___ is ___.', '내가 제일 좋아하는 ___는 ___야'], ['I really love it because ___.', '___라서 진짜 좋아']]],
  [/\bhow (was|did|is|'s|are)\b/i, [["It was ___ because ___.", '___했어, 왜냐하면 ___'], ['Honestly, it was better than I expected.', '솔직히 생각보다 좋았어']]],
  [/\bwhy\b/i, [['Because ___.', '왜냐하면 ___'], ['The main reason is ___.', '가장 큰 이유는 ___야']]],
  [/\bwhere\b/i, [['I went to ___.', '___에 갔어'], ["I'd love to go to ___ someday.", '언젠가 ___에 꼭 가보고 싶어']]],
  [/\b(doing|up to|these days|lately|recently)\b/i, [["I've been ___ing lately.", '요즘 ___하고 있어'], ["These days I'm really into ___.", '요즘 ___에 빠져 있어']]],
  [/^(do|did|are|have|can|is|were|was)\b/i, [['Yes, I ___. Actually, ___.', '응, ___. 사실은 ___'], ['Not really, but ___.', '별로, 근데 ___']]]
];
function answerFrames(qEn) {
  const hit = FRAMES.filter(([re]) => re.test(qEn || '')).flatMap(([, f]) => f);
  const list = (hit.length ? hit : [['I think ___.', '내 생각엔 ___'], ['For me, ___.', '나는 ___']]).slice(0, 3);
  return list.map(([text, ko]) => ({ text, ko }));
}

// ---------- 통화 ----------
// 전화하기 = 백현이 한국어를 듣고 영어로 번역해서 말하기 (정답 영어는 말하기 전에 안 보여줌)
// 단계: 백현이 말함(한국어 자막) → 내가 영어로 → 내 문장 교정 + 자연스러운 표현 → [다시 말하기 · 연습 · 다음] → 다음 누르면 다음 구간 재생
function call(root, mode, v = null, { start = 0 } = {}) {
  active?.(); active = null;
  let qs = mode === 'long' ? questionPool().map(q => ({ q, s: richScore(q) + Math.random() * 1.5 })).sort((a, b) => b.s - a.s).map(x => x.q) : [];
  if (mode === 'long') v = (qs[0] && D.video(qs[0].u.videoId)) || v;
  document.body.classList.add('in-call');
  const concept = v ? conceptOf(v, sceneOf(v), mode === 'call' ? sit : '') : '';
  const ph = pickPhoto(v);
  const st = D.get().settings, me = D.profile(), myName = me.name || '나';
  const list = mode === 'call' && v ? callTurns(v) : [];
  root.innerHTML = `<div class="vcall ${st.callFill !== false ? 'fill' : 'fit'}">
    <div class="vc-stage"><div class="vc-ambient"></div><div class="vc-video" id="vv"><div id="vp"></div></div><div class="vc-grad"></div>
      <div class="vc-wait" id="vwait"><span class="vw-dots"><i></i><i></i><i></i></span></div></div>
    <header class="vc-head"><b>${NAME}</b><span class="vc-time" id="vtm">00:00</span></header>
    <span class="vc-prog" id="vprog"></span>
    ${me.photo ? `<div class="vc-self" style="background-image:url('${me.photo}')"></div>` : ''}
    <div class="vc-tap hide" id="vtap">화면을 한 번 탭하면 재생돼요</div>
    <div class="vc-target hide" id="vtg"></div>
    <div class="vc-low"><div class="vc-cap" id="vcap"></div>
      <div class="vc-chat" id="vchat"></div>
      <div class="vc-fb hide" id="vfb"></div>
      <div class="vc-hint hide" id="vhint"></div>
      <div class="vc-acts" id="vacts"></div>
      <p class="vc-status" id="vst"></p>
      <form class="vc-input hide" id="vin"><input id="vint" placeholder="영어로 입력 · 한국어로 물어봐도 돼요" autocomplete="off" autocapitalize="sentences" spellcheck="false"><button type="submit" aria-label="보내기">${ic('send')}</button></form>
      <div class="vc-ctrl">
        <button class="vc-btn" id="vkbd" aria-label="키보드">${ic('kbd')}</button>
        <button class="vc-mic" id="vmic" aria-label="말하기"><svg class="ring-svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="37"/></svg><span class="mic-ic">${ic('micF')}</span><span class="stop-ic">${ic('stop')}</span><em id="vsec"></em></button>
        <button class="vc-btn end" id="vend" aria-label="통화 종료">${ic('phoneoff')}</button>
      </div></div>
    <div class="vc-panel" id="vpanel"></div>
    <div class="vc-bye hide" id="vbye"><p>${NAME}와 통화 종료</p></div>
    <div class="ring2" id="ring">
      <div class="ring-photo" id="rphoto"></div><div class="ring-shade"></div>
      <div class="ring-top"><span class="ring-kind">${ic('cam')} ${me.name ? `${esc(me.name)}에게 ` : ''}영상통화</span><h2 class="ring-name">${NAME}</h2>${concept ? `<p class="ring-concept">${esc(concept)}</p>` : ''}</div>
      <div class="ring-acts2">
        <div class="slide" id="slide"><span class="sl-txt">${ic('back')} 밀어서 받기</span><button class="sl-knob" id="knob" aria-label="밀어서 받기">${ic('phoneF')}</button></div>
        <button class="r-dec" id="dec">${ic('phoneoff')} 거절</button>
      </div>
    </div>
  </div>`;
  const $v = s => $(s, root);
  let unPhoto = mountPhoto($v('#rphoto'), ph.p, { focusY: 0.42 });
  rememberPhoto(ph.p.id);
  startRing();
  let callPos = start, stopped = false, dead = false, endTurn = null, skipTurn = null, typed = null, t0 = 0, timer = null, accepted = false, pending = null;
  const vv = $v('#vv');
  const pl = new Player($v('#vp'), { controls: 0, onState: s => { if (s === 'blocked') $v('#vtap').classList.remove('hide'); if (s === 'playing') { $v('#vtap').classList.add('hide'); vv.classList.add('on'); $v('#vwait').classList.add('gone'); } } });
  const status = t => { const e = $v('#vst'); if (e.textContent !== t) { e.textContent = t; e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); } };
  const progress = t => ($v('#vprog').textContent = t);
  const stats = { sec: 0, n: 0 };

  // ----- 클립 재생: 한국어 자막만 (정답 영어는 안 보여줌) -----
  const startClip = u => { const vid = D.video(u.videoId); $v('#vcap').innerHTML = `<span>${esc(u.ko)}</span>`; status(`${NAME}가 말하는 중`); const p = pl.playSegment(vid.ytId, u.start, u.playEnd || u.end + 0.6, { tail: 0 }).then(r => { $v('#vcap').innerHTML = ''; return r; }); pending = { u, p }; return p; };
  async function say(u) { if (dead) return; const p = pending?.u === u ? pending.p : startClip(u); pending = null; await p; }

  // ----- 수신 화면: 받기 버튼을 왼쪽으로 밀기 -----
  const ring = $v('#ring');
  const killRing = () => { stopRing(); ring.classList.add('leave'); setTimeout(() => { unPhoto?.(); unPhoto = null; ring.remove(); }, 900); };
  $v('#dec').onclick = () => { stopRing(); blip('end'); cleanup(); document.body.classList.remove('in-call'); speak(root); };
  const accept = () => {
    if (accepted) return; accepted = true; blip('connect'); killRing();
    t0 = Date.now(); timer = setInterval(() => ($v('#vtm').textContent = clock((Date.now() - t0) / 1000)), 1000);
    // 받는 순간(사용자 동작 안에서) 첫 구간 재생 시작 → iPhone 자동재생 차단 피하기
    if (mode === 'call' && list.length) startClip(list[Math.min(start, list.length - 1)]);
    else if (mode === 'long' && qs[0]) startClip(qs[0].u);
    run();
  };
  (() => {
    const track = $v('#slide'), knob = $v('#knob'); let x0 = 0, dx = 0, drag = false;
    const maxD = () => track.clientWidth - knob.offsetWidth - 8;
    const set = (x, anim) => { knob.style.transition = anim ? 'transform .3s var(--ease)' : 'none'; knob.style.transform = `translateX(${x}px)`; track.style.setProperty('--p', Math.min(1, -x / maxD())); };
    knob.addEventListener('pointerdown', e => { drag = true; x0 = e.clientX; knob.setPointerCapture?.(e.pointerId); track.classList.add('drag'); });
    knob.addEventListener('pointermove', e => { if (!drag) return; dx = Math.min(0, Math.max(-maxD(), e.clientX - x0)); set(dx); });
    const up = () => { if (!drag) return; drag = false; track.classList.remove('drag'); if (-dx > maxD() * 0.6) { set(-maxD(), true); accept(); } else set(0, true); dx = 0; };
    knob.addEventListener('pointerup', up); knob.addEventListener('pointercancel', up);
    knob.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') accept(); });
  })();

  // ----- 채팅 -----
  const chat = $v('#vchat');
  function msg(who, html, cls = '') {
    const m = h(`<div class="vm ${who} ${cls}">${who === 'baek' ? `<i class="bh-av" style="background-image:url('icons/bh-profile.jpg')"></i>` : `<i>${esc(myName[0])}</i>`}<div><b>${who === 'baek' ? NAME : esc(myName)}</b>${html}</div></div>`);
    chat.appendChild(m); chat.scrollTop = chat.scrollHeight; return m;
  }
  const say2 = (who, text) => msg(who, `<p class="${who === 'me' ? 'en' : ''}">${esc(text)}</p>`);
  // 키보드: 영어 입력 → 내 대답 / 한국어 입력 → “영어로 어떻게 해?” 도움
  const vin = $v('#vin'), vint = $v('#vint');
  $v('#vkbd').onclick = () => { vin.classList.toggle('hide'); if (!vin.classList.contains('hide')) vint.focus(); };
  vin.onsubmit = e => {
    e.preventDefault(); const t = vint.value.trim(); if (!t) return; vint.value = '';
    if (isKo(t)) { say2('me', t); const m = msg('help', helpHTML(koHelp(t)), 'helpm'); bindSaves(m); return; }
    if (typed) { say2('me', t); typed(t); } else toast('지금은 아래 버튼으로 진행해요');
  };
  // 상황별 작은 버튼 (다시 듣기 · 건너뛰기 …)
  const acts = (items = []) => { const el = $v('#vacts'); el.innerHTML = items.map(([l, k]) => `<button class="vc-act" data-a="${k}">${l}</button>`).join(''); return el; };

  // 내 차례: 마이크 또는 키보드 → {text, sec, skipped}
  function turn({ limit = 0, auto = false, label = '영어로 말해볼까?', hint = null, replay = null } = {}) {
    return new Promise(resolve => {
      status(label);
      const mic = $v('#vmic'), rg = $('.ring-svg circle', mic), secEl = $v('#vsec'), hb = $v('#vhint');
      mic.classList.add('ready'); secEl.textContent = limit ? `${limit}초` : '';
      rg.style.strokeDashoffset = 0;
      if (hint?.en) { hb.classList.remove('hide'); hintBox(hb, hint.en, hint); } else { hb.classList.add('hide'); hb.innerHTML = ''; }
      const a = acts([...(replay ? [['다시 듣기', 'replay']] : []), ['건너뛰기', 'skip']]);
      $$('[data-a]', a).forEach(b => b.onclick = () => { if (b.dataset.a === 'replay') replay(); else skipTurn?.(); });
      let cap = null, live = null, tick = null, st0 = 0, done = false;
      const finish = (text, sec, skipped = false) => { if (done) return; done = true; endTurn = skipTurn = typed = null; clearInterval(tick); mic.classList.remove('ready', 'live', 'over'); secEl.textContent = ''; hb.classList.add('hide'); acts(); mic.onclick = null; resolve({ text, sec, skipped }); };
      endTurn = () => { cap?.stop(); finish('', 0); };
      skipTurn = () => { const c = cap; cap = null; c?.stop(); live?.remove(); finish('', 0, true); };
      typed = t => { const c = cap; cap = null; c?.stop(); live?.remove(); stats.n++; finish(t, 0); };
      mic.onclick = async () => {
        if (cap) { cap.stop(); status('정리하는 중…'); return; }
        if (!S.support.stt) { vin.classList.remove('hide'); vint.focus(); toast('키보드로 입력해도 돼요'); return; }
        pl.pause(); mic.classList.add('live'); status('듣는 중 · 다 말하면 ■'); st0 = Date.now();
        live = say2('me', '…'); live.classList.add('typing');
        tick = setInterval(() => {
          const e = (Date.now() - st0) / 1000;
          if (limit) { const left = Math.max(0, limit - e); secEl.textContent = `${Math.ceil(left)}초`; rg.style.strokeDashoffset = 232 * Math.min(1, e / limit); if (left <= 0) { if (auto) cap?.stop(); else mic.classList.add('over'); } }
          else secEl.textContent = `${Math.floor(e)}초`;
        }, 200);
        cap = S.capture({ stt: true, targets: hint?.en ? [hint.en] : [], onInterim: t => { $('p', live).textContent = t || '…'; chat.scrollTop = chat.scrollHeight; } });
        const r = await cap.result; cap = null; if (done) return;
        const sec = Math.round((Date.now() - st0) / 1000);
        live.classList.remove('typing');
        if (!r.text) { live.remove(); mic.classList.remove('live', 'over'); clearInterval(tick); toast(S.sttErrorText(r.sttError) || '잘 안 들렸어요 · 다시 눌러 말해주세요'); status('다시 눌러 말해주세요'); return; }
        $('p', live).textContent = r.text;
        stats.sec += sec; stats.n++;
        finish(r.text, sec);
      };
    });
  }
  const pnl = $v('#vpanel');
  function panel(html) { pnl.innerHTML = `<div class="grab"></div><div class="vp-body">${html}</div>`; pnl.classList.add('on'); pnl.scrollTop = 0; }
  function closePanel() { pnl.classList.remove('on'); }
  const log = (step, r, uttId) => r.text && D.addAttempt({ uttId: uttId || null, step, text: r.text, sec: r.sec });
  const fb = $v('#vfb');
  const hideFb = () => { fb.classList.add('hide'); fb.innerHTML = ''; $v('.vc-low').classList.remove('fbon'); };
  const saveMine = (u, before) => t => ({ kind: 'mine', level: 'mine', uttId: u?.ids?.[0] || u?.id || null, ko: u?.ko || '', text: t, before: before || '', en: { easy: '', natural: t, advanced: '' }, pattern: u?.pattern || '' });
  // 피드백 카드: 버튼을 누를 때까지 기다림 (자동으로 안 넘어감)
  function card(html, btns, save) {
    return new Promise(res => {
      fb.innerHTML = `<div class="fbc">${html}<div class="fbc-btns">${btns.map(([k, l, cls, o]) => `<button class="btn sm ${cls || ''}" data-k="${k}">${l}</button>`).join('')}</div></div>`;
      fb.classList.remove('hide'); fb.scrollTop = 0; $v('.vc-low').classList.add('fbon'); status('');
      bindSaves(fb, save);
      $$('[data-k]', fb).forEach(b => b.onclick = () => { const o = btns.find(x => x[0] === b.dataset.k)?.[3]; o?.tap?.(); skipTurn = null; res(b.dataset.k); });
      skipTurn = () => res('next');
    });
  }
  // 보고 말하기 → 안 보고 말하기 (흰 카드)
  async function practice(target, { ko = '', uttId = null, pattern = '' } = {}) {
    hideFb();
    const tg = $v('#vtg');
    tg.classList.remove('hide'); sayCard(tg, { en: target, pattern, mode: 'read' });
    const a = await turn({ label: '보고 말하기' }); log('sp-practice', a, uttId); if (stopped) return;
    if (!a.skipped) {
      sayCard(tg, { ko, en: target, pattern, mode: 'recall' });
      const b = await turn({ label: '안 보고 말하기' }); log('sp-practice', b, uttId); if (stopped) return;
      tg.classList.add('hide'); tg.innerHTML = '';
      if (b.text) { const e = judgeTranslation(b.text, target); await card(`${verdictHTML(e)}${e.level === 'great' ? '' : naturalHTML([target], '정답 문장')}`, [['ok', '확인', '']], saveMine({ ko, id: uttId }, b.text)); }
    }
    tg.classList.add('hide'); tg.innerHTML = ''; hideFb();
  }

  // ----- 1. 백현이랑 전화하기: 듣고 번역해서 말하기 -----
  async function runCall() {
    for (let i = Math.min(start, list.length - 1); i < list.length && !stopped; i++) {
      const u = list[i], target = natOf(u); callPos = i; progress(`${i + 1} / ${list.length}`);
      await say(u); if (stopped) return;
      say2('baek', u.ko);
      for (;;) {
        const r = await turn({ label: '영어로 바꿔 말해볼까?', hint: { en: target, pattern: u.pattern, keywords: u.keywords }, replay: () => startClip(u) }); log('sp-call', r, u.id); if (stopped) return;
        if (r.skipped || !r.text) break;
        const ev = judgeTranslation(r.text, target);
        status('다듬는 중…');
        const imp = await improve(r.text, { pattern: u.pattern, useLT: D.get().settings.autoLT !== false }); if (stopped) return;
        const nx = list[i + 1];
        const k = await card(`${verdictHTML(ev)}${correctionHTML(imp)}${ev.level === 'great' && canon(r.text) === canon(target) ? '' : naturalHTML([target], '자연스러운 표현')}${exprChips(keyExpressions(target, { pattern: u.pattern, said: r.text }))}`,
          [['again', `${ic('mic')} 다시`, 'soft'], ['prac', '연습', 'soft'], ['next', nx ? '다음 →' : '마치기', '', { tap: () => nx && startClip(nx) }]], saveMine(u, r.text));
        if (stopped) return;
        hideFb();
        if (k === 'again') continue;
        if (k === 'prac') { await practice(target, { ko: u.ko, uttId: u.ids[0], pattern: u.pattern }); if (stopped) return; const k2 = await card('', [['next', nx ? '다음 →' : '마치기', '', { tap: () => nx && startClip(nx) }]]); hideFb(); if (k2) break; }
        break;
      }
      if (!stopped) callPos = i + 1;
    }
  }

  // ----- 2. 오래 이야기하기: 답변 틀·예시·되물을 질문 → 30초 → 45초 → 60초 (3라운드) -----
  const ROUNDS = [30, 45, 60];
  function kitHTML(q, { compact = false, hint = null } = {}) {
    const frames = answerFrames(q.en);
    if (compact) return `<div class="kit compact"><p class="kit-q en">${esc(q.en || q.ko)}</p><ul class="kit-l">${frames.slice(0, 2).map(f => `<li><span class="en">${esc(f.text)}</span><em>${esc(f.ko)}</em></li>`).join('')}${hint ? `<li class="kit-h"><b>${esc(hint.t)}</b><span class="en">${esc(hint.ex)}</span></li>` : ''}</ul></div>`;
    const tops = detectTopics(q.en || ''); const used = new Set(); const a1 = appQuestion(tops.length ? tops : [{ t: 'greeting' }], used);
    const asks = [...new Set([a1, 'What about you?'])];
    const ext = TALK_HINTS.filter(x => ['reason', 'example', 'feeling'].includes(x.k));
    return `<div class="kit"><p class="kit-q en">${esc(q.en || q.ko)}</p>${q.ko ? `<p class="kit-ko">${esc(q.ko)}</p>` : ''}
      <div class="kit-sec"><span>답변 틀 · 눌러서 저장</span>${exprChips(frames)}</div>
      ${q.u.replies?.length ? `<div class="kit-sec">${naturalHTML(q.u.replies.slice(0, 2), '답변 예시')}</div>` : ''}
      <div class="kit-sec"><span>이어서 할 이야기</span><ul class="kit-l">${ext.map(p => `<li><b>${esc(p.t)}</b><span class="en">${esc(p.ex)}</span></li>`).join('')}</ul></div>
      <div class="kit-sec"><span>되물어볼 질문</span>${exprChips(asks.map(a => ({ text: a, ko: ASK_KO[a] || '' })))}</div>
      <div class="row mt12 kit-go"><button class="btn soft" id="kother">다른 질문</button><button class="btn grow" id="kgo">${ic('mic')} ${ROUNDS[0]}초 이야기하기</button></div></div>`;
  }
  async function runLong() {
    let qi = 0, q = qs[0]; const tg = $v('#vtg');
    for (;;) {
      progress(''); await say(q.u); if (stopped) return;
      tg.innerHTML = kitHTML(q); tg.classList.remove('hide'); tg.classList.add('kit-on'); bindSaves(tg);
      status('준비되면 시작');
      const k = await new Promise(res => { $v('#kgo').onclick = () => res('y'); $v('#kother').onclick = () => { const n = qs[(qi + 1) % qs.length]; startClip(n.u); res('o'); }; skipTurn = () => res('o'); endTurn = () => res('e'); });
      skipTurn = endTurn = null;
      if (stopped || k === 'e') return;
      if (k === 'y') break; qi = (qi + 1) % qs.length; q = qs[qi];
    }
    tg.classList.remove('kit-on');
    say2('baek', q.en || q.ko);
    const used = []; let hint = null, prevW = 0;
    for (let i = 0; i < ROUNDS.length && !stopped;) {
      progress(`${i + 1} / 3 라운드`);
      tg.innerHTML = kitHTML(q, { compact: true, hint }); tg.classList.remove('hide');
      const r = await turn({ limit: ROUNDS[i], auto: true, label: `${ROUNDS[i]}초 동안 이야기해요` }); log('sp-long', r, q.u.id); if (stopped) return;
      tg.classList.add('hide');
      const w = words(r.text);
      hint = talkHint(r.text, used); used.push(hint.k);
      const ev = r.text ? judgeReply(r.text, { question: q.en, strict: false }) : null;
      const imp = r.text ? await improve(r.text, { useLT: D.get().settings.autoLT !== false }) : null; if (stopped) return;
      const br = bestReply(r.text, q.u.replies);
      const last = i === ROUNDS.length - 1;
      const k = await new Promise(res => {
        panel(`<div class="vp-h">${i + 1}라운드 <small>${ROUNDS[i]}초 · ${w}단어${i && prevW ? ` · ${w - prevW >= 0 ? '+' : ''}${w - prevW}` : ''}</small></div>
          ${r.text ? `<div class="my-said"><span class="cor-l">내가 한 말</span><p class="en">${esc(r.text)}</p></div>` : '<p class="vp-s">말한 내용이 없어요</p>'}
          ${ev ? verdictHTML(ev) : ''}${imp ? correctionHTML(imp) : ''}${br && imp && canon(br) !== canon(imp.after) ? naturalHTML([br]) : ''}
          ${!last ? `<div class="long-hint"><span class="lh-tag">${ic('bulb')} 다음 라운드에 넣어볼 것</span><b>${esc(hint.t)}</b><p><span class="en">${esc(hint.ex)}</span> · ${esc(hint.ko)}</p></div>` : ''}
          <div class="row mt12"><button class="btn soft" data-k="again">${ic('mic')} 다시 말하기</button><button class="btn grow" data-k="next">${last ? '마치기' : `다음 라운드 · ${ROUNDS[i + 1]}초`}</button></div>`);
        bindSaves(pnl, saveMine(q.u, r.text));
        $$('[data-k]', pnl).forEach(b => b.onclick = () => { closePanel(); res(b.dataset.k); });
      });
      if (k === 'again') continue;
      prevW = w; i++;
    }
    tg.classList.add('hide');
  }

  // ----- 마무리 -----
  async function finale() {
    if (dead) return;
    stopped = true; endTurn?.(); pl.stop(); closePanel(); stopRing();
    const sec = t0 ? Math.round((Date.now() - t0) / 1000) : 0;
    clearInterval(timer);
    if (accepted && sec > 0) D.addTalkLog({ kind: 'call', mode, videoId: v?.id || null, title: v?.title || '', concept, sec, spoke: stats.sec, n: stats.n, ...(mode === 'call' ? { pos: callPos, total: list.length } : {}) });
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
    await wait(300); if (dead) return;
    try {
      if (mode === 'call' && v) await runCall();
      else if (mode === 'long') await runLong();
    } catch (e) { console.warn(e); }
    finaleOnce();
  }
}
