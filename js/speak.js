// SPEAK — 백현이와 영상통화하며 말하기
// 1 통역 챌린지 · 2 백현이의 질문에 답하기 · 3 같은 질문 3번 말하기
// 백현이 화면은 실제 영상 클립만 사용 (백현이가 하지 않은 말을 만들지 않음)
import * as D from './store.js';
import * as S from './speech.js';
import { Player } from './yt.js';
import { esc, $, $$, ic, toast, h, copyText, natOf } from './ui.js';
import { checkSentence, patternInfo, usesPattern } from './feedback.js';
import { markPattern } from './compare.js';

const PHOTO = 'icons/baekhyun.jpg';
const NAME = '백현이';
let active = null; // 진행 중인 통화 정리 함수

// ---------- 데이터 ----------
const allClips = () => D.get().utts.filter(u => u.ko && D.video(u.videoId)).sort((a, b) => a.videoId < b.videoId ? -1 : a.videoId > b.videoId ? 1 : a.start - b.start);
const isQ = u => u.type === 'question' || /\?\s*$/.test(u.ko || '');
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// 질문 클립: 백현이가 실제로 질문한 클립 → 없으면 문장에 등록된 패턴 질문(앱 질문)으로 대체
function questionPool() {
  const clips = allClips(); const real = clips.filter(isQ).map(u => ({ u, real: true, ko: u.ko }));
  if (real.length) return real;
  return clips.filter(u => u.question).map(u => ({ u, real: false, ko: u.question }));
}
// 같은 영상에서 질문 바로 뒤에 백현이가 직접 한 말
function answerClip(q) {
  const list = D.uttsOf(q.videoId);
  return list.find(u => u.id !== q.id && u.start >= q.start + 0.5 && u.start - q.end < 120 && !isQ(u)) || null;
}
// 미션 패턴: 저장한 문장·백현이 문장에서 나온 패턴
function missionPattern() {
  const pats = [...new Set([...D.get().saved.map(s => s.pattern), ...allClips().map(u => u.pattern)].filter(Boolean))];
  return pats.length ? pats[Math.floor(Math.random() * pats.length)] : '';
}
const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
export function todayStats() {
  const db = D.get(), t0 = dayStart();
  const at = db.attempts.filter(a => a.at >= t0 && a.text);
  const sec = Math.round(at.reduce((n, a) => n + (a.sec || 0), 0));
  let streak = 0; for (let i = 0; i < 400; i++) { const d = new Date(); d.setDate(d.getDate() - i); if (db.days[D.today(d)]) streak++; else if (i > 0) break; }
  return { sec, sentences: at.length, streak };
}
// 오늘의 백현이: 저장한 영상 문장 중 날짜로 하나 고정 (없으면 전체 클립에서)
function todayClip() {
  const saved = D.get().saved.map(s => s.uttId && D.utt(s.uttId)).filter(Boolean);
  const pool = saved.length ? saved : allClips(); if (!pool.length) return null;
  const k = D.today().split('-').join('') % pool.length; return pool[k];
}
const fmtSec = s => s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`;
const words = t => (t || '').trim().split(/\s+/).filter(Boolean).length;

// ---------- 첫 화면 ----------
export function speak(root) {
  active?.(); active = null;
  const st = todayStats(); const clips = allClips(); const qs = questionPool();
  const tc = todayClip(); const seen = localStorage.getItem('b2u:todayClip') === D.today();
  root.innerHTML = `<div class="screen">
    <header class="top"><h1 class="page-title">Speak</h1></header>
    <div class="stats-strip"><div><b>${fmtSec(st.sec)}</b><span>오늘 말한 시간</span></div><div><b>${st.sentences}</b><span>오늘 말한 문장</span></div><div><b>${st.streak}일</b><span>연속 학습</span></div></div>
    <div class="modes">
      ${modeCard('interp', '통역 챌린지', '백현이 말을 듣고 바로 영어로', `${Math.min(10, clips.length)}문장`, clips.length)}
      ${modeCard('answer', `${NAME}의 질문에 답하기`, '영상통화로 백현이 질문에 영어로 대답', `질문 ${qs.length}개`, qs.length)}
      ${modeCard('challenge', '3번 말하기 도전', '같은 질문을 1분 → 40초 → 20초', '유창성', qs.length)}
    </div>
    ${tc && seen ? `<button class="today-clip" id="tc"><img src="${PHOTO}" alt=""><div><span class="fc-tag en-tag">오늘의 ${NAME}</span><p>${esc(tc.ko)}</p></div>${ic('play')}</button>` : ''}
    ${!clips.length ? `<div class="empty"><b>아직 영상 클립이 없어요</b><p>SETTINGS에서 영상과 문장(JSON)을 추가하면 영상통화로 연습할 수 있어요.</p><a class="btn" href="#/settings">영상 추가</a></div>` : ''}
    ${clips.length && !clips.some(isQ) ? `<p class="tiny muted">백현이가 질문하는 클립(type: question)이 아직 없어서, 질문 모드는 문장에 등록된 패턴 질문으로 진행돼요.</p>` : ''}
  </div>`;
  $$('[data-mode]', root).forEach(b => b.onclick = () => ring(root, b.dataset.mode));
  $('#tc', root) && ($('#tc', root).onclick = () => ring(root, 'today'));
  return () => { active?.(); active = null; };
}
const modeCard = (k, t, d, meta, ok) => `<button class="mode" data-mode="${k}" ${ok ? '' : 'disabled'}><img src="${PHOTO}" alt=""><div class="grow"><b>${t}</b><span>${d}</span></div><em>${meta}</em></button>`;

// ---------- 수신 화면 ----------
function ring(root, mode) {
  document.body.classList.add('in-call');
  root.innerHTML = `<div class="ring"><div class="ring-bg" style="background-image:url('${PHOTO}')"></div>
    <div class="ring-in"><img class="ava" src="${PHOTO}" alt=""><h2>${NAME}</h2><p>영상통화</p></div>
    <div class="acts"><div><button class="no" id="dec" aria-label="거절">${ic('phoneoff')}</button><span>거절</span></div><div><button class="ok" id="acc" aria-label="받기">${ic('cam')}</button><span>받기</span></div></div></div>`;
  $('#dec', root).onclick = () => { document.body.classList.remove('in-call'); speak(root); };
  $('#acc', root).onclick = () => call(root, mode);
}

// ---------- 영상통화 ----------
function call(root, mode) {
  root.innerHTML = `<div class="vcall">
    <div class="vc-stage"><div class="vc-photo" style="background-image:url('${PHOTO}')"></div><div class="vc-video" id="vv"><div id="vp"></div></div><div class="vc-grad"></div></div>
    <header class="vc-head"><img class="vc-av" src="${PHOTO}" alt=""><div class="grow"><b>${NAME}</b><span id="vst">연결 중</span></div><span class="vc-time" id="vtm">00:00</span><button class="vc-ic" id="vcam" aria-label="내 화면">${ic('cam')}</button></header>
    <div class="vc-chips"><span class="vc-chip" id="vprog"></span><button class="vc-chip mission hide" id="vmis"></button></div>
    <div class="vc-tap hide" id="vtap">화면을 한 번 탭하면 영상이 재생돼요</div>
    <div class="vc-target hide" id="vtg"></div>
    <div class="vc-low"><div class="vc-cap" id="vcap"></div>
    <div class="vc-chat" id="vchat"></div>
    <div class="vc-ctrl">
      <button class="vc-btn" id="vskip" aria-label="건너뛰기">${ic('next')}<span>넘기기</span></button>
      <button class="vc-mic" id="vmic" aria-label="말하기"><svg class="ring-svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="37"/></svg>${ic('mic')}<em id="vsec"></em></button>
      <button class="vc-btn end" id="vend" aria-label="통화 종료">${ic('phoneoff')}<span>종료</span></button>
    </div></div>
    <div class="vc-panel" id="vpanel"></div>
  </div>`;
  const $v = s => $(s, root);
  const t0 = Date.now(); let stopped = false, dead = false, cam = null, endTurn = null;
  const timer = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); $v('#vtm').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }, 1000);
  const vv = $v('#vv');
  const pl = new Player($v('#vp'), { onState: s => { if (s === 'blocked') { $v('#vtap').classList.remove('hide'); vv.classList.add('on'); } if (s === 'playing') { $v('#vtap').classList.add('hide'); vv.classList.add('on'); } } });
  const status = t => ($v('#vst').textContent = t);
  const progress = t => ($v('#vprog').textContent = t);
  const stats = { sec: 0, n: 0 };

  // 채팅 (라이브 방송처럼 아래에서 올라옴)
  const chat = $v('#vchat');
  function msg(who, text, extra = '') {
    const m = h(`<div class="vm ${who}">${who === 'baek' ? `<img src="${PHOTO}" alt="">` : '<i>나</i>'}<div><b>${who === 'baek' ? NAME : '나'}</b><p class="${who === 'me' ? 'en' : ''}">${esc(text)}</p>${extra}</div></div>`);
    chat.appendChild(m); chat.scrollTop = chat.scrollHeight; return m;
  }
  // 백현이 클립 재생
  async function play(u, { cap = u.ko, label = '' } = {}) {
    if (dead) return;
    const v = D.video(u.videoId); status(`${NAME}가 말하는 중`);
    $v('#vcap').innerHTML = cap ? `${label ? `<span>${esc(label)}</span>` : ''}${esc(cap)}` : '';
    await pl.playSegment(v.ytId, u.start, u.end);
    vv.classList.remove('on'); $v('#vcap').innerHTML = '';
  }
  // 내 차례: 마이크로 말하기 → {text, sec}
  function turn({ limit = 0, auto = false, label = '내 차례 · 영어로 말해보세요' } = {}) {
    return new Promise(resolve => {
      status(label);
      const mic = $v('#vmic'), ring = $('.ring-svg circle', mic), secEl = $v('#vsec');
      mic.classList.add('ready'); secEl.textContent = limit ? `${limit}초` : '';
      ring.style.strokeDashoffset = 0;
      let cap = null, live = null, tick = null, st = 0, done = false;
      const finish = (text, sec) => { if (done) return; done = true; endTurn = null; clearInterval(tick); mic.classList.remove('ready', 'live'); secEl.textContent = ''; $v('#vskip').onclick = null; mic.onclick = null; resolve({ text, sec }); };
      endTurn = () => { cap?.stop(); finish('', 0); };
      $v('#vskip').onclick = () => { cap?.stop(); finish('', 0); };
      mic.onclick = async () => {
        if (cap) { cap.stop(); status('정리하는 중…'); return; }
        if (!S.support.stt) { const t = await typeBox(); if (t) { msg('me', t); finish(t, 0); } return; }
        pl.pause(); mic.classList.add('live'); status('듣는 중 · 다 말하면 ■'); st = Date.now();
        live = msg('me', '…'); live.classList.add('typing');
        tick = setInterval(() => {
          const e = (Date.now() - st) / 1000;
          if (limit) { const left = Math.max(0, limit - e); $('#vsec', root).textContent = `${Math.ceil(left)}초`; ring.style.strokeDashoffset = 232 * Math.min(1, e / limit); if (auto && left <= 0) cap?.stop(); else if (!auto && left <= 0) mic.classList.add('over'); }
          else $('#vsec', root).textContent = `${Math.floor(e)}초`;
        }, 200);
        cap = S.capture({ stt: true, onInterim: t => { $('p', live).textContent = t || '…'; chat.scrollTop = chat.scrollHeight; } });
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
      panel(`<div class="vp-h">영어로 입력</div><p class="vp-s">이 브라우저는 음성 인식이 안 돼서 입력으로 해요 (키보드 받아쓰기 가능)</p>
        <textarea class="textarea en" id="tb" rows="2"></textarea><button class="btn block mt8" id="tbs">보내기</button>`);
      $v('#tbs').onclick = () => { const t = $v('#tb').value.trim(); closePanel(); res(t); };
    });
  }
  // 아래에서 올라오는 패널
  const pnl = $v('#vpanel');
  function panel(html, { end = true } = {}) {
    pnl.innerHTML = `<div class="grab"></div>${end ? `<button class="vp-x" aria-label="통화 종료">${ic('phoneoff')}</button>` : ''}${html}`;
    pnl.classList.add('on'); pnl.scrollTop = 0;
    $('.vp-x', pnl) && ($('.vp-x', pnl).onclick = () => finaleOnce());
  }
  function closePanel() { pnl.classList.remove('on'); }
  const save = (text, ko, uttId) => {
    const r = D.saveExpr({ kind: 'mine', level: 'mine', uttId: uttId || null, ko: ko || '', text, en: { easy: '', natural: text, advanced: '' }, pattern: '' });
    toast(r.dup ? '이미 SAVED에 있어요' : 'SAVED에 저장했어요');
  };
  const log = (step, r, uttId) => r.text && D.addAttempt({ uttId: uttId || null, step, text: r.text, sec: r.sec });

  // 더 좋게 말하기 → 연습할 문장 고르기
  function coach(text, { question = '', mission = '', models = [] } = {}) {
    return new Promise(res => {
      let mine = text, picked = null, extra = [];
      const render = () => {
        const fb = mine ? checkSentence(mine, mission) : null;
        const opts = [];
        if (fb?.changed) opts.push({ k: 'fix', label: '다듬은 문장', text: fb.fixed, why: fb.issues.filter(i => i.type !== 'style').map(i => i.why).slice(0, 2).join(' · ') });
        extra.forEach(t => opts.push({ k: 'cl', label: 'Claude가 다듬은 문장', text: t }));
        models.filter(Boolean).forEach(t => opts.push({ k: 'model', label: '원어민은 이렇게도 말해요', text: t }));
        if (mine) opts.push({ k: 'mine', label: '내 문장 그대로', text: mine });
        if (!picked || !opts.some(o => o.text === picked)) picked = opts[0]?.text || null;
        const missionOk = mission && mine ? usesPattern(mine, mission) : null;
        panel(`<div class="vp-h">더 자연스럽게 말해보기</div>
          ${question ? `<p class="vp-s">${esc(NAME)}: ${esc(question)}</p>` : ''}
          <label class="field"><span>내 답변 (고쳐도 돼요)</span><textarea class="textarea en" id="cm" rows="2">${esc(mine)}</textarea></label>
          ${mission ? `<div class="vp-mis ${missionOk ? 'ok' : ''}">${ic(missionOk ? 'check' : 'bulb')} 미션 <b class="en">${esc(mission)}</b> ${missionOk ? '성공!' : `· 예: <span class="en">${esc(patternInfo({ pattern: mission }).frame)}</span>`}</div>` : ''}
          <div class="vp-opts">${opts.map(o => `<button class="vp-opt ${o.text === picked ? 'on' : ''}" data-t="${esc(o.text)}"><span class="fc-tag ${o.k === 'mine' ? '' : 'en-tag'}">${o.label}</span><p class="en">${esc(o.text)}</p>${o.why ? `<small>${esc(o.why)}</small>` : ''}</button>`).join('')}</div>
          <details class="adv"><summary>Claude로 원어민처럼 다듬기 (무료 · 복사해서 붙여넣기)</summary>
            <button class="btn sm soft" id="clc">${ic('copy')} 요청문 복사</button>
            <input class="input en mt8" id="clp" placeholder="Claude가 준 문장 붙여넣기"><button class="btn sm block mt8" id="cla">목록에 추가</button></details>
          <div class="row mt8"><button class="btn soft" id="csk">건너뛰기</button><button class="btn grow" id="cgo" ${picked ? '' : 'disabled'}>이 문장으로 연습하기 →</button></div>`);
        $v('#cm').onchange = e => { mine = e.target.value.trim(); render(); };
        $$('.vp-opt', pnl).forEach(b => b.onclick = () => { picked = b.dataset.t; $$('.vp-opt', pnl).forEach(x => x.classList.toggle('on', x === b)); });
        $v('#clc').onclick = async () => toast(await copyText(`${question ? `상대(백현이)가 한 말: ${question}\n` : ''}내 영어 대답: ${mine}\n\n내가 하려던 의미는 그대로 두고, 원어민이 일상 대화에서 실제로 말하는 자연스러운 영어 한 문장으로 다듬어줘.${mission ? ` 가능하면 "${mission}" 패턴을 넣어줘.` : ''}\n형식: 1) 다듬은 문장 2) 바꾼 이유 한 줄(한국어)`) ? '복사했어요 · Claude 채팅에 붙여넣어 주세요' : '복사가 막혔어요');
        $v('#cla').onclick = () => { const t = $v('#clp').value.trim(); if (!t) return; extra.unshift(t.replace(/^1\)\s*/, '')); picked = extra[0]; render(); };
        $v('#csk').onclick = () => { closePanel(); res(null); };
        $v('#cgo').onclick = () => { closePanel(); res(picked); };
      };
      render();
    });
  }
  // 보고 말하기 → 안 보고 말하기 → 저장
  async function practice(target, { ko = '', uttId = null } = {}) {
    const tg = $v('#vtg');
    tg.innerHTML = `<span class="fc-tag en-tag">보고 말하기</span><p class="en">${esc(target)}</p>`; tg.classList.remove('hide');
    const a = await turn({ label: '보고 말하기 · 문장을 보며 말해요' }); log('sp-practice', a, uttId); if (stopped) return;
    tg.innerHTML = `<span class="fc-tag en-tag">안 보고 말하기</span><p class="en blur">${esc(target)}</p><small>탭하면 잠깐 보여요</small>`;
    tg.onclick = () => { const p = $('p', tg); p.classList.remove('blur'); setTimeout(() => p.classList.add('blur'), 1500); };
    const b = await turn({ label: '안 보고 말하기 · 기억해서 말해요' }); log('sp-practice', b, uttId); if (stopped) return;
    tg.classList.add('hide'); tg.onclick = null;
    await new Promise(res => {
      panel(`<div class="vp-h">잘했어요</div><div class="vp-opt on"><span class="fc-tag en-tag">연습한 문장</span><p class="en">${esc(target)}</p></div>
        <div class="row mt8"><button class="btn soft grow" id="ps">${ic('bookmark')} SAVED에 저장</button><button class="btn grow" id="pn">계속 →</button></div>`);
      $v('#ps').onclick = () => { save(target, ko, uttId); $v('#ps').disabled = true; };
      $v('#pn').onclick = () => { closePanel(); res(); };
    });
  }
  const ask = (title, btns) => new Promise(res => {
    panel(`<div class="vp-h">${title}</div><div class="stack">${btns.map(([k, l, cls]) => `<button class="btn block ${cls || ''}" data-k="${k}">${l}</button>`).join('')}</div>`);
    $$('[data-k]', pnl).forEach(b => b.onclick = () => { closePanel(); res(b.dataset.k); });
  });

  // ----- 모드 -----
  async function runInterp() {
    const list = shuffle(allClips().filter(u => natOf(u))).slice(0, 10);
    for (let i = 0; i < list.length && !stopped; i++) {
      const u = list[i]; progress(`통역 ${i + 1}/${list.length}`);
      await play(u); if (stopped) return; msg('baek', u.ko);
      const r = await turn({ label: '영어로 바로 말해보세요' }); log('sp-interp', r, u.id); if (stopped) return;
      const rec = natOf(u); const fb = r.text ? checkSentence(r.text, u.pattern) : null;
      const k = await new Promise(res => {
        panel(`<div class="vp-h">추천 문장</div>
          <div class="cmp3"><div class="r"><span class="fc-tag">${NAME}</span><p>${esc(u.ko)}</p></div><div class="r mine"><span class="fc-tag">내 답변</span><p class="en ${r.text ? '' : 'muted'}">${r.text ? esc(r.text) : '건너뜀'}</p></div>
          <div class="r rec"><span class="fc-tag en-tag">원어민 추천</span><p class="en">${markPattern(rec, u.pattern, esc)}</p></div></div>
          ${fb?.changed && fb.issues.some(x => x.type === 'grammar') ? `<p class="vp-s">${esc(fb.issues.find(x => x.type === 'grammar').why)}</p>` : ''}
          <div class="row"><button class="btn soft grow" data-k="p">추천 문장 연습</button><button class="btn grow" data-k="n">${i < list.length - 1 ? '다음 →' : '마치기'}</button></div>`);
        $$('[data-k]', pnl).forEach(b => b.onclick = () => { closePanel(); res(b.dataset.k); });
      });
      if (k === 'p') await practice(rec, { ko: u.ko, uttId: u.id });
    }
  }
  async function runAnswer() {
    const qs = shuffle(questionPool());
    const mission = missionPattern();
    if (mission) { const m = $v('#vmis'); m.innerHTML = `${ic('star')} 미션 · <span class="en">${esc(mission)}</span> 넣어 말하기`; m.classList.remove('hide'); m.onclick = () => toast(`예: ${patternInfo({ pattern: mission }).frame}`); }
    for (let i = 0; i < qs.length && !stopped; i++) {
      const q = qs[i]; progress(`질문 ${i + 1}`);
      if (q.real) await play(q.u); else { $v('#vcap').innerHTML = `<span>앱 질문</span>${esc(q.ko)}`; await wait(1600); $v('#vcap').innerHTML = ''; }
      if (stopped) return; msg('baek', q.ko, q.real ? '' : '<small class="appq">앱 질문</small>');
      const r = await turn({ limit: 60, label: '내 차례 · 30초~1분 영어로 대답해요' }); log('sp-answer', r, q.u.id); if (stopped) return;
      const ans = q.real ? answerClip(q.u) : null;
      if (ans) {
        $v('#vcap').innerHTML = ''; status(`${NAME}는 이렇게 말했어`);
        await play(ans, { label: `${NAME}는 이렇게 말했어` }); if (stopped) return;
        msg('baek', ans.ko, natOf(ans) ? `<small class="en">${esc(natOf(ans))}</small>` : '');
      }
      const target = await coach(r.text, { question: q.ko, mission, models: q.u.replies || [] });
      if (stopped) return;
      if (target) await practice(target, { ko: `${NAME}: ${q.ko}`, uttId: q.u.id });
      if (stopped) return;
      const k = await ask('다음은?', [['n', '다음 질문 →'], ['e', '통화 마치기', 'soft']]);
      if (k === 'e') return;
    }
  }
  async function runChallenge() {
    const pool = shuffle(questionPool()); let qi = 0;
    let q = pool[qi];
    // 질문 고르기
    for (;;) {
      if (q.real) await play(q.u); else { $v('#vcap').innerHTML = `<span>앱 질문</span>${esc(q.ko)}`; await wait(1400); $v('#vcap').innerHTML = ''; }
      if (stopped) return;
      const k = await ask(`이 질문으로 도전할까요?<p class="vp-s">${esc(q.ko)}</p>`, [['y', '1분 → 40초 → 20초 시작'], ['o', '다른 질문', 'soft']]);
      if (k === 'y') break; qi = (qi + 1) % pool.length; q = pool[qi];
    }
    msg('baek', q.ko);
    const rounds = [];
    for (const [i, lim] of [[1, 60], [2, 40], [3, 20]]) {
      progress(`도전 ${i}/3 · ${lim}초`);
      const r = await turn({ limit: lim, auto: true, label: `${i}번째 · ${lim}초 안에 같은 내용을 말해요` }); log('sp-challenge', r, q.u.id); if (stopped) return;
      rounds.push({ lim, ...r });
    }
    await new Promise(res => {
      panel(`<div class="vp-h">3번 말하기 결과</div><div class="rounds">${rounds.map((r, i) => `<div><b>${i + 1}회 · ${r.lim}초</b><span>${words(r.text)}단어 · ${r.sec ? Math.round(words(r.text) / r.sec * 60) : 0}단어/분</span></div>`).join('')}</div>
        <p class="vp-s">시간이 줄어도 같은 내용을 말할수록 말이 빨라지고 매끄러워져요.</p><button class="btn block" id="rn">${NAME} 답 보고 마무리 →</button>`);
      $v('#rn').onclick = () => { closePanel(); res(); };
    });
    const fin = (q.real && answerClip(q.u)) || (q.real ? q.u : null);
    if (fin) { await play(fin, { label: fin === q.u ? NAME : `${NAME}는 이렇게 말했어` }); if (stopped) return; msg('baek', fin.ko); }
    const best = rounds.map(r => r.text).sort((a, b) => words(b) - words(a))[0] || '';
    const target = await coach(best, { question: q.ko, models: q.u.replies || [] });
    if (target && !stopped) await practice(target, { ko: `${NAME}: ${q.ko}`, uttId: q.u.id });
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // 오늘의 백현이 + 마무리
  async function finale() {
    if (dead) return;
    stopped = true; endTurn?.(); pl.stop(); closePanel();
    $v('#vtg').classList.add('hide'); $v('#vmis').classList.add('hide'); progress('');
    const tc = todayClip();
    if (tc && localStorage.getItem('b2u:todayClip') !== D.today()) {
      await play(tc, { label: `오늘의 ${NAME}` }); localStorage.setItem('b2u:todayClip', D.today());
      if (dead) return;
    }
    status('통화 종료'); D.bump(); D.save();
    const st = todayStats();
    panel(`<div class="vp-h">통화 종료</div><div class="sum"><div><b>${fmtSec(stats.sec)}</b><span>이번 통화</span></div><div><b>${st.sentences}</b><span>오늘 말한 문장</span></div><div><b>${st.streak}일</b><span>연속 학습</span></div></div>
      <div class="row"><button class="btn soft grow" id="fa">다시 통화</button><button class="btn grow" id="fx">나가기</button></div>`, { end: false });
    $v('#fa').onclick = () => { cleanup(); ring(root, mode === 'today' ? 'answer' : mode); };
    $v('#fx').onclick = () => { cleanup(); document.body.classList.remove('in-call'); speak(root); };
  }
  function cleanup() { if (dead) return; dead = stopped = true; endTurn?.(); clearInterval(timer); pl.destroy(); cam?.getTracks().forEach(t => t.stop()); active = null; }
  active = cleanup;
  let finDone = false; const finaleOnce = () => { if (finDone) return; finDone = true; finale(); };
  $v('#vend').onclick = () => { if (finDone) { cleanup(); document.body.classList.remove('in-call'); speak(root); } else finaleOnce(); };
  $v('#vcam').onclick = async e => {
    const b = e.currentTarget;
    if (cam) { cam.getTracks().forEach(t => t.stop()); cam = null; $('.vc-pip', root)?.remove(); b.classList.remove('on'); return; }
    try { cam = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }); const p = h('<div class="vc-pip"><video autoplay playsinline muted></video></div>'); root.querySelector('.vcall').appendChild(p); $('video', p).srcObject = cam; b.classList.add('on'); }
    catch { toast('카메라를 켤 수 없어요 (권한 확인)'); }
  };

  (async () => {
    await wait(300); status('연결됨');
    try {
      if (mode === 'interp') await runInterp();
      else if (mode === 'answer') await runAnswer();
      else if (mode === 'challenge') await runChallenge();
      else if (mode === 'today') { const tc = todayClip(); if (tc) { await play(tc, { label: `오늘의 ${NAME}` }); msg('baek', tc.ko); } }
    } catch (e) { console.warn(e); }
    finaleOnce();
  })();
}
