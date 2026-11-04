// TALK — 영상통화형 플레이어 + 카톡형 대화 (사전 등록된 실제 영상 클립 기반)
import * as D from './store.js';
import * as S from './speech.js';
import { Player } from './yt.js';
import { esc, $, $$, ic, toast, sheet, compareCard, h } from './ui.js';
import { pickNext, firstClip, appQuestion, hintFor, KEEP, detectTopics } from './talk-engine.js';
import { mistakes, best } from './compare.js';

export function talk(root) {
  const db = D.get();
  const utts = db.utts.filter(u => u.ko && D.video(u.videoId));
  if (!utts.length) {
    root.innerHTML = `<div class="screen"><div class="top"><div class="logo"><i>☏</i><h1>TALK</h1></div></div>
      <div class="empty"><div class="emo">📞</div><b>통화할 영상 클립이 없어요</b>SETTINGS에서 백현이 영상 구간을 등록하면<br>영상통화처럼 영어로 대화할 수 있어요.<div style="margin-top:18px"><a class="btn" href="#/settings">영상 등록하기</a></div></div></div>`;
    return () => { };
  }
  // 수신 화면 — 사용자의 탭으로 iOS 재생/음성 권한을 열어줌
  root.innerHTML = `<div class="ring">
    <div class="ava">🐶</div><h2>Baekhyun</h2><p>영상통화 요청…</p>
    <p class="tiny" style="margin-top:6px">실제 영상 클립 ${utts.length}개</p>
    <div class="acts"><div><button class="no" id="dec">${ic('phoneoff')}</button><span>거절</span></div><div><button class="ok" id="acc">${ic('cam')}</button><span>수락</span></div></div>
  </div>`;
  document.body.classList.add('in-call');
  let stopCall = () => { };
  $('#dec', root).onclick = () => { document.body.classList.remove('in-call'); location.hash = '#/video'; };
  $('#acc', root).onclick = () => { if (S.support.tts) { const w = new SpeechSynthesisUtterance(' '); w.volume = 0; speechSynthesis.speak(w); } stopCall = startCall(root, utts); };
  return () => { stopCall(); document.body.classList.remove('in-call'); };
}

function startCall(root, utts) {
  const set = D.get().settings;
  const st = { used: new Set(), usedQ: new Set(), cur: null, lastBaek: null, turns: 0, saved: 0, t0: Date.now(), cap: null, showEn: !!set.talkShowEn, cc: set.talkCaption !== false, transcript: [] };
  root.innerHTML = `<div class="call">
    <div class="call-top">
      <div class="vc"><div class="player" id="tp"></div><div class="vc-shade"></div>
        <div class="vc-top"><div class="vc-status" id="vs"><i></i><span>연결 중</span></div><div class="vc-timer" id="tm">00:00</div></div>
        <div class="vc-bottom"><div class="vc-name">Baekhyun</div><div class="vc-cap" id="cap"></div></div>
        <div class="vc-cover" id="cover"><div class="av">🐶</div><div class="en">Connecting…</div></div>
        <div class="tap-hint hide" id="taph" style="z-index:6">▶ 화면을 한 번 탭해서 영상 재생</div>
      </div>
      <div class="call-tools">
        <button id="t-cc" class="${st.cc ? 'on' : ''}">${ic('cc')} 자막</button>
        <button id="t-en" class="${st.showEn ? 'on' : ''}">${ic('globe')} 번역</button>
        <button id="t-cam">${ic('cam')} 내 화면</button>
        <button id="t-end" class="end">${ic('phoneoff')} 종료</button>
      </div>
    </div>
    <div class="chat" id="chat"><div class="day">실제 영상 클립으로 진행돼요 · 점선 말풍선은 앱 질문</div></div>
    <div class="composer">
      <div class="comp-live en" id="live"></div>
      <div class="comp-row">
        <div class="comp-side"><button class="pill" id="b-hint">${ic('bulb')} Hint</button><button class="pill" id="b-keep">${ic('next')} Keep</button></div>
        <button class="mic" id="b-mic" aria-label="말하기">${ic('mic')}</button>
        <div class="comp-side r"><button class="pill" id="b-kbd">${ic('kbd')}</button><button class="pill" id="b-skip" aria-label="주제 바꾸기">${ic('shuffle')}</button></div>
      </div>
      <div class="type-row hide" id="trow"><input class="input en" id="tin" placeholder="Reply in English…" autocomplete="off" enterkeyhint="send"><button class="send" id="tsend">${ic('send')}</button></div>
    </div>
  </div>`;
  const chat = $('#chat', root), vs = $('#vs', root), cap = $('#cap', root), live = $('#live', root), micB = $('#b-mic', root), vc = $('.vc', root);
  const pl = new Player($('#tp', root), { onState: s => { if (s === 'blocked') { $('#taph', root).classList.remove('hide'); $('#cover', root).classList.add('off'); } if (s === 'playing') { $('#taph', root).classList.add('hide'); $('#cover', root).classList.add('off'); vc.classList.add('playing'); } if (s === 'paused' || s === 'ended') vc.classList.remove('playing'); } });
  const timer = setInterval(() => { const s = Math.floor((Date.now() - st.t0) / 1000); $('#tm', root).textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }, 1000);
  let camStream = null;

  const status = (cls, text) => { vs.className = 'vc-status ' + cls; $('span', vs).textContent = text; };
  const scroll = () => requestAnimationFrame(() => chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' }));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function typing() { const t = h(`<div class="msg baek"><div class="av">🐶</div><div class="col"><div class="bub typing"><i></i><i></i><i></i></div></div></div>`); chat.appendChild(t); scroll(); return t; }

  async function playClip(u, why = []) {
    if (cleaned) return;
    st.cur = u; st.lastBaek = u; st.used.add(u.id);
    const v = D.video(u.videoId);
    const tp = typing(); status('thinking', '연결 중'); await wait(500); tp.remove();
    const m = h(`<div class="msg baek"><div class="av">🐶</div><div class="col"><span class="who">Baekhyun</span>
      <div class="bub">${esc(u.ko)}${u.en.natural || u.en.easy ? `<div class="tr ${st.showEn ? '' : 'hide'}">${esc(u.en.natural || u.en.easy)}</div>` : ''}</div>
      <div class="src"><i></i>${esc((v?.title || '').slice(0, 18))}${(v?.title || '').length > 18 ? '…' : ''} ${D.fmt(u.start)}</div>
      <div class="meta-row"><button class="chip" data-a="replay" aria-label="다시">${ic('replay')}</button><button class="chip" data-a="en">EN</button><button class="chip" data-a="save" aria-label="저장">${ic('bookmark')}</button></div></div></div>`);
    chat.appendChild(m); scroll();
    m.addEventListener('click', e => {
      const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
      if (a === 'replay') speakClip(u);
      if (a === 'en') { const tr = $('.tr', m); if (tr) tr.classList.toggle('hide'); else toast('등록된 영어 번역이 없어요'); }
      if (a === 'save') { const r = D.saveExpr({ kind: 'utt', uttId: u.id, ko: u.ko, en: { ...u.en }, pattern: u.pattern }); if (!r.dup) st.saved++; toast(r.dup ? '이미 저장돼 있어요' : 'SAVED에 저장했어요'); }
    });
    st.transcript.push({ who: 'baek', uttId: u.id, ko: u.ko });
    await speakClip(u);
  }
  async function speakClip(u) {
    if (cleaned) return;
    const v = D.video(u.videoId);
    status('speaking', '백현이 말하는 중'); cap.textContent = st.cc ? u.ko : '';
    const r = await pl.playSegment(v.ytId, u.start, u.end);
    if (r !== 'stopped') { cap.textContent = ''; yourTurn(); }
  }
  function yourTurn() { status('', '내 차례 · 영어로 대답해요'); micB.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 700, iterations: 2 }); }

  function appBubble(text, extra = '') {
    const m = h(`<div class="msg app"><div class="av">B2U</div><div class="col"><span class="who">앱 질문</span><div class="bub en">${esc(text)}</div>
      <div class="meta-row"><button class="chip" data-a="tts" aria-label="듣기">${ic('speaker')}</button>${extra}</div></div></div>`);
    chat.appendChild(m); scroll();
    m.addEventListener('click', e => { const a = e.target.closest('[data-a]')?.dataset.a; if (a === 'tts') S.speak(text); if (a === 'switch') switchTopic(); });
    st.transcript.push({ who: 'app', text }); status('', '내 차례 · 영어로 대답해요');
    return m;
  }

  function myBubble(text, { revised = false, replyTo } = {}) {
    const m = h(`<div class="msg me"><div class="col"><div class="bub">${esc(text)}</div>
      <div class="meta-row" style="justify-content:flex-end">${revised ? '<span class="chip pink">다시 말한 버전</span>' : ''}<button class="chip" data-a="better">${ic('sparkle')} Say it better</button><button class="chip" data-a="save" aria-label="저장">${ic('bookmark')}</button></div></div></div>`);
    chat.appendChild(m); scroll();
    m.addEventListener('click', e => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'better') sayBetter(text, replyTo);
      if (a === 'save') { const r = D.saveExpr({ kind: 'talk', uttId: replyTo?.id || null, ko: replyTo ? `백현: ${replyTo.ko}` : '', text, en: { easy: '', natural: text, advanced: '' } }); if (!r.dup) st.saved++; toast(r.dup ? '이미 저장돼 있어요' : '내 답변을 저장했어요'); }
    });
    st.transcript.push({ who: 'me', text });
  }

  async function onReply(text) {
    text = text.trim(); if (!text) return;
    live.textContent = '';
    const replyTo = st.lastBaek;
    myBubble(text, { replyTo }); st.turns++;
    D.addAttempt({ uttId: replyTo?.id || null, step: 'talk', text });
    if (/\b(bye|good ?night|see you|gotta go|talk (to you )?later)\b/i.test(text)) {
      const g = utts.find(u => u.type === 'goodbye' && !st.used.has(u.id));
      if (g) { await playClip(g, ['goodbye']); return; }
    }
    status('thinking', '다음 장면 찾는 중'); const tp = typing(); await wait(650); tp.remove();
    const r = pickNext({ reply: text, utts, used: st.used, current: st.cur });
    if (r.kind === 'clip') await playClip(r.u, r.why);
    else {
      const q = appQuestion(r.topics, st.usedQ); st.usedQ.add(q);
      appBubble(q, r.candidates.length ? `<button class="chip" data-a="switch">${ic('shuffle')} 다른 클립</button>` : '');
      st.lastBaek = null;
    }
  }
  function switchTopic() {
    const pool = utts.filter(u => !st.used.has(u.id) && u.type !== 'goodbye');
    if (!pool.length) { st.used.clear(); toast('모든 클립을 다 들었어요! 처음부터 다시 섞을게요'); return switchTopic(); }
    const qs = pool.filter(u => u.type === 'question'); const p = qs.length ? qs : pool;
    playClip(p[Math.floor(Math.random() * p.length)], ['주제 바꾸기']);
  }

  // ---- 입력 ----
  micB.onclick = async () => {
    if (st.cap) { st.cap.stop(); return; }
    if (!S.support.stt) { toggleType(true); toast('음성 인식 미지원 · 키보드 받아쓰기(🎤)를 써보세요'); return; }
    pl.stop(); S.stopSpeak(); cap.textContent = '';
    micB.classList.add('live'); micB.innerHTML = ic('stop'); status('listening', '듣는 중…');
    live.textContent = '…';
    st.cap = S.capture({ stt: true, targets: st.lastBaek?.replies || [], silenceMs: 1800, onInterim: t => (live.textContent = t) });
    const res = await st.cap.result; st.cap = null;
    micB.classList.remove('live'); micB.innerHTML = ic('mic');
    if (res.sttError && !res.text) { live.textContent = ''; status('', '내 차례'); toast(S.sttErrorText(res.sttError)); if (res.sttError === 'service-not-allowed' || res.sttError === 'not-allowed') toggleType(true); return; }
    if (!res.text) { live.textContent = ''; status('', '잘 안 들렸어요 · 다시 탭'); return; }
    onReply(res.text);
  };
  const trow = $('#trow', root), tin = $('#tin', root);
  function toggleType(on) {
    const show = on === undefined ? trow.classList.contains('hide') : on;
    trow.classList.toggle('hide', !show); $('#b-kbd', root).classList.toggle('on', show); if (show) tin.focus();
  }
  $('#b-kbd', root).onclick = () => toggleType();
  const sendT = () => { const t = tin.value; tin.value = ''; onReply(t); };
  $('#tsend', root).onclick = sendT; tin.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); sendT(); } };
  $('#b-hint', root).onclick = () => {
    if (!st.lastBaek) { const b = h(`<div class="hint-bub">Try starting with: “I think …” / “Well, …”<small>기본 문장틀</small></div>`); chat.appendChild(b); scroll(); return; }
    const hh = hintFor(st.lastBaek);
    const b = h(`<div class="hint-bub">${esc(hh.text)}<small>Need a hint? · ${esc(hh.src)}</small></div>`); chat.appendChild(b); scroll();
  };
  $('#b-keep', root).onclick = async () => {
    // Keep Talking: 같은 주제의 실제 질문 클립 → 없으면 후속 질문(앱)
    const topics = st.cur ? st.cur.topics : [];
    const pool = utts.filter(u => !st.used.has(u.id) && u.type === 'question' && u.topics.some(t => topics.includes(t)));
    if (pool.length) return playClip(pool[0], ['Keep talking', ...pool[0].topics.slice(0, 1)]);
    const q = KEEP.find(x => !st.usedQ.has(x)) || KEEP[0]; st.usedQ.add(q); appBubble(q);
  };
  $('#b-skip', root).onclick = switchTopic;

  // ---- 툴 ----
  $('#t-cc', root).onclick = e => { st.cc = !st.cc; D.setSetting('talkCaption', st.cc); e.currentTarget.classList.toggle('on', st.cc); if (!st.cc) cap.textContent = ''; };
  $('#t-en', root).onclick = e => { st.showEn = !st.showEn; D.setSetting('talkShowEn', st.showEn); e.currentTarget.classList.toggle('on', st.showEn); $$('.msg.baek .tr', chat).forEach(t => t.classList.toggle('hide', !st.showEn)); };
  $('#t-cam', root).onclick = async e => {
    const b = e.currentTarget;
    if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; $('.pip', root)?.remove(); b.classList.remove('on'); return; }
    try {
      camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 427 }, audio: false });
      const p = h('<div class="pip"><video autoplay playsinline muted></video></div>'); vc.appendChild(p); $('video', p).srcObject = camStream; b.classList.add('on');
    } catch { toast('카메라를 켤 수 없어요 (권한 확인)'); }
  };
  $('#t-end', root).onclick = endCall;

  function sayBetter(text, replyTo) {
    const mk = mistakes(text);
    const reps = replyTo?.replies || [];
    const s = sheet(`<h3>Say it better</h3>
      <div class="card gray"><div class="small muted">내 답변</div><div class="en" style="font-size:16px;margin-top:4px">“${esc(text)}”</div></div>
      ${mk.length ? `<div class="note warn" style="margin-top:10px">${mk.map(x => `<b>${esc(x.from)}</b> → <b>${esc(x.to)}</b> · ${esc(x.why)}`).join('<br>')}</div>` : ''}
      <div class="sec-title label">자연스러운 답변 예시</div>
      ${reps.length ? `<div class="stack">${reps.map(r => `<div class="card row"><div class="en grow" style="font-size:15px">${esc(r)}</div><button class="mini" data-tts="${esc(r)}">${ic('speaker')}</button></div>`).join('')}</div><div style="margin-top:10px">${compareCard(text, reps.map(r => ({ label: '예시', text: r })), { title: 'VS EXAMPLE' })}</div>`
        : `<div class="note">${replyTo ? '이 발화엔 답변 예시가 없어요 (문장 편집 › 답변 예시).' : '앱 질문엔 답변 예시가 없어요.'}</div>`}
      <button class="btn block" id="again" style="margin-top:14px">${ic('mic')} 더 좋게 다시 말하기</button>`);
    $$('[data-tts]', s).forEach(b => b.onclick = () => S.speak(b.dataset.tts));
    $('#again', s).onclick = async () => {
      const b = $('#again', s);
      if (!S.support.stt) { s.close(); toggleType(true); return; }
      b.innerHTML = `${ic('stop')} 듣는 중… 탭하면 끝`; b.classList.add('pink');
      let c = S.capture({ stt: true, targets: reps }); b.onclick = () => c.stop();
      const r = await c.result;
      if (r.text) { s.close(); myBubble(r.text, { revised: true, replyTo }); D.addAttempt({ uttId: replyTo?.id || null, step: 'talk-retry', text: r.text }); toast('다시 말한 답변을 추가했어요'); }
      else { b.innerHTML = `${ic('mic')} 다시 시도`; b.classList.remove('pink'); toast(S.sttErrorText(r.sttError) || '잘 안 들렸어요'); }
    };
  }

  function endCall() {
    pl.stop(); S.stopSpeak(); st.cap?.stop();
    const sec = Math.floor((Date.now() - st.t0) / 1000);
    D.addTalkLog({ id: D.uid(), at: Date.now(), sec, turns: st.turns, clips: st.used.size, transcript: st.transcript.slice(-60) });
    const s = sheet(`<div style="text-align:center"><div style="font-size:40px">💗</div><h3 style="margin:8px 0 4px">통화 종료</h3><p class="muted small" style="margin:0 0 16px">${Math.floor(sec / 60)}분 ${sec % 60}초 동안 대화했어요</p></div>
      <div class="hero" style="margin-bottom:14px"><div class="stat"><div class="big">${st.turns}</div><span>내 영어 답변</span></div><div class="stat"><div class="big">${st.used.size}</div><span>본 실제 클립</span></div><div class="stat"><div class="big">${st.saved}</div><span>저장한 표현</span></div></div>
      <div class="row"><button class="btn soft grow" id="again">다시 통화</button><a class="btn grow" href="#/saved" id="tosaved">SAVED 보기</a></div>`, { onClose: () => { } });
    $('#again', s).onclick = () => { s.close(); cleanup(); root.innerHTML = ''; location.hash = '#/talk?' + Date.now(); };
    $('#tosaved', s).onclick = () => { s.close(); };
    cleanup();
    status('', '통화 종료');
  }
  let cleaned = false;
  function cleanup() { if (cleaned) return; cleaned = true; clearInterval(timer); pl.destroy(); S.stopSpeak(); st.cap?.stop(); camStream?.getTracks().forEach(t => t.stop()); }

  // 시작
  setTimeout(() => playClip(firstClip(utts), ['통화 시작']), 300);
  return cleanup;
}
