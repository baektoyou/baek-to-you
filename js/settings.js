// SETTINGS — 영상 라이브러리 · 문장 관리 · 음성 · 데이터 백업
import * as D from './store.js';
import { callAI, AI_ERR, aiOn, aiKeys, setAiKeys, PROVIDERS, DEFAULT_MODEL } from './ai.js';
import * as S from './speech.js';
import { parseYouTubeId, fetchTitle, thumb, Player } from './yt.js';
import { esc, $, $$, ic, toast, sheet, confirmSheet, copyText } from './ui.js';
import { TOPICS, TYPES, EMOTIONS } from './talk-engine.js';
import { APP_VERSION, checkUpdate } from './pwa.js';
import * as Y from './sync.js';
import { allPhotos, pickPhoto, sceneOf, topTags, conceptOf, TAG_KO, situations, sitLabel, TIMES_SEL, addSituation, removeSituation, addUserPhoto, removePhoto, isLive, autoLive } from './scene.js';

let photosOpen = false;
const thumbStyle = p => `background-image:url('${p.src}');background-position:${((p.box[0] + p.box[2]) / 2 * 100).toFixed(0)}% ${((p.box[1] + p.box[3]) / 2 * 100).toFixed(0)}%`;
let vtab = 'chat'; // 영상 목록: chat | call
let vmore = false;

export function settings(root) {
  const db = D.get(); const st = db.settings; const snap = D.snapshotInfo();
  root.innerHTML = `<div class="screen">
    <header class="top"><h1 class="page-title">Settings</h1></header>
    <section class="prof-card" id="prof"></section>
    <section class="add-card">
      <span class="label">ADD VIDEO</span>
      <div class="url-row"><input class="input" id="url" type="url" placeholder="YouTube 링크 붙여넣기" autocomplete="off" autocapitalize="off" spellcheck="false">
        <button class="icon-btn" id="paste" aria-label="붙여넣기">${ic('paste')}</button><button class="btn" id="add" aria-label="추가">${ic('plus')}</button></div>
    </section>

    <div class="sec-title label">VIDEOS · ${db.videos.length}</div>
    ${db.videos.length ? (() => {
      const chat = db.videos.filter(v => !isLive(v)), callV = db.videos.filter(isLive), list = vtab === 'call' ? callV : chat;
      const shown = [...list].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)).slice(0, 5);
      return `<div class="view-sw"><button data-vt="chat" class="${vtab === 'chat' ? 'on' : ''}">CHAT <em>${chat.length}</em></button><button data-vt="call" class="${vtab === 'call' ? 'on' : ''}">CALL <em>${callV.length}</em></button></div>
      ${list.length ? `<div class="list">${shown.map(v => `<a class="li" href="#/settings/video/${v.id}"><div class="thumb" style="background-image:url('${thumb(v.ytId)}')"></div><div class="grow"><b class="clamp2">${esc(v.title)}</b><small>${D.uttsOf(v.id).length}문장</small></div>${ic('next')}</a>`).join('')}
        ${list.length > shown.length ? `<a class="li more" href="#/settings/videos/${vtab}"><span class="grow">전체 ${list.length}개 보기</span>${ic('next')}</a>` : ''}</div>`
        : `<div class="note">${vtab === 'call' ? '라이브 영상이 없어요 · 영상 관리에서 종류를 ‘라이브 · CALL’로 바꿀 수 있어요' : '일반 영상이 없어요'}</div>`}`;
    })() : `<div class="note">위에 YouTube 링크를 붙여넣어 영상을 추가해보세요.</div>`}


    <div class="sec-title label">SPEECH RECOGNITION</div>
    <div class="card stack">
      <div class="row between"><b class="set-b">인식 언어</b><span class="small muted">영어 (미국)</span></div>
      <label class="switch"><span><b>말하기 시작하면 영상 자동 일시정지</b><small>CHAT에서 마이크를 누르면 영상을 멈춰요</small></span><input type="checkbox" id="ap" ${st.autoPause !== false ? 'checked' : ''}><i></i></label>
      <button class="btn soft block" id="mt">${ic('mic')} 인식 테스트 시작</button><div id="mres" class="small hide test-res"></div>
      <label class="field"><span>인식 보정 단어 · 한 줄에 하나</span>
        <textarea class="textarea en" id="fix" rows="3" placeholder="Mongryong&#10;tteokbokki">${esc(st.sttFix || '')}</textarea></label>
      <p class="tiny muted">단어만 적어 두면, 발음이 비슷하게 잘못 인식된 말을 자동으로 고쳐요 (예: mong young → Mongryong). 인식 결과는 첫 글자 대문자·문장부호를 넣고 겹친 단어(to to)를 지워요.</p>
    </div>

    <div class="sec-title label">통화 사진 · ${allPhotos().length}</div>
    <div class="card"><div class="photo-grid manage" id="phg"></div>
      <label class="btn sm soft block mt12">${ic('plus')} 사진 추가<input type="file" id="phadd" accept="image/*" class="hide"></label>
      <p class="tiny muted mt8">추가한 사진은 이 기기에만 저장돼요 (동기화·백업에 포함되지 않아요).</p></div>

    <div class="sec-title label">AI</div>
    <div class="card stack">
      <label class="switch"><span><b>AI로 교정·추천·질문 답변</b><small>내 API 키로 사용 · 안 되면 앱 규칙으로 자동 전환</small></span><input type="checkbox" id="aion" ${st.aiOn !== false ? 'checked' : ''}><i></i></label>
      <div class="seg" id="aiprov">${PROVIDERS.map(([k, l]) => `<button data-p="${k}" class="${(st.aiProvider === 'openai' ? 'openai' : 'gemini') === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div id="aibox"></div>
      <div class="row"><button class="btn sm soft" id="aitest">연결 테스트</button><span class="small muted grow" id="aist"></span></div>
    </div>

    <div class="sec-title label">DATA</div>
    <section class="sync-card" id="sync"></section>
    <div class="list">
      <button class="li" id="exp"><div class="ic">${ic('download')}</div><div class="grow"><b>JSON 백업</b><small>영상·문장·SAVED·학습 기록·설정 (녹음 파일 제외)</small></div></button>
      <label class="li" style="cursor:pointer"><div class="ic">${ic('upload')}</div><div class="grow"><b>JSON 복원</b><small>합치기 또는 전체 바꾸기</small></div><input type="file" id="imp" accept="application/json,.json" class="hide"></label>
      ${snap ? `<button class="li" id="undo"><div class="ic">${ic('replay')}</div><div class="grow"><b>직전 상태로 되돌리기</b><small>${esc(snap.reason)} 전 · ${new Date(snap.at).toLocaleString('ko-KR')}</small></div></button>` : ''}
      <button class="li" id="rst"><div class="ic danger">${ic('trash')}</div><div class="grow"><b>모든 데이터 초기화</b></div></button>
    </div>

    <details class="adv help"><summary>YouTube Premium 안내</summary><div class="stack yt-info">
      <p class="small">앱 안의 영상은 YouTube 공식 임베드 플레이어예요. Premium 혜택(광고 없음)은 이 플레이어가 브라우저의 YouTube 로그인 쿠키를 읽을 수 있을 때만 적용돼요.</p>
      <ul class="small muted bullets">
        <li>iPhone Safari는 기본적으로 다른 사이트의 쿠키를 막아서, 앱 안 플레이어는 로그인되지 않은 상태로 재생될 가능성이 높아요 (광고가 나올 수 있음).</li>
        <li>홈 화면 앱(PWA)은 Safari와 쿠키 저장소가 따로라 로그인이 공유되지 않아요.</li>
        <li>광고 차단이나 로그인 우회는 하지 않아요.</li>
        <li>시도해볼 설정: iPhone 설정 › 앱 › Safari › ‘크로스 사이트 추적 방지’ 끄기 + Safari에서 youtube.com 로그인 → 이 앱을 Safari 탭에서 열기</li>
      </ul>
      <p class="small"><b>대안:</b> 문장 화면의 영상 아래 ${ic('external')} 버튼으로 <b>YouTube 앱에서 그 구간</b>을 바로 열 수 있어요. 앱에서는 Premium이 그대로 적용돼요.</p>
    </div></details>
    <details class="adv help"><summary>이 기기 · 앱 정보</summary>
      <div class="small dev-info">
        ${row(S.support.stt, '음성 인식', S.support.ios ? 'iPhone: 설정 › 일반 › 키보드 › 받아쓰기 켜기' : S.support.browser)}
        ${row(S.support.rec, '녹음', '음성 인식 미지원 시 녹음 모드')}
        ${row(S.support.standalone, '홈 화면 앱', S.support.standalone ? 'PWA 모드' : '공유 › 홈 화면에 추가')}
      </div>
      <div class="row ver-row"><span class="tiny muted grow">버전 <span class="en">${esc(APP_VERSION)}</span></span><button class="btn xs soft" id="upd">${ic('refresh')} 업데이트 확인</button></div>
      <div class="note">
        • 발음·억양 점수는 전용 음성 평가 엔진(유료)이 필요해서 제공하지 않아요.<br>
        • 답변 평가·추천 표현은 AI가 아니라 앱에 내장된 규칙(뜻 비교·질문 유형·문법·한국식 영어 표현) + JSON의 원어민 답변 예시(replies) + 선택 시 LanguageTool이에요. 확실하지 않으면 칭찬하지 않고 추천 문장을 보여줘요.<br>
        • 통화 영상 자동 선택·사진 매칭은 영상 제목·메모·대본의 키워드로 장면을 추정해요. 정확하지 않으면 영상 관리에서 장면 태그나 사진을 직접 골라주세요.<br>
        • 데이터는 이 기기 브라우저에만 저장돼요 (기기 연동을 켜지 않았다면). 주기적으로 백업하세요.
      </div>
    </details>
    <p class="tiny muted foot-note">BAEK TO YOU · personal fan-made study app · 영상 저작권은 원저작자에게 있어요</p>
  </div>`;
  const unsub = mountSync($('#sync', root));
  mountProfile($('#prof', root));
  $$('[data-vt]', root).forEach(b => b.onclick = () => { vtab = b.dataset.vt; vmore = false; settings(root); });

  function row(ok, t, d) { return `<div><span class="${ok ? 'ok-dot' : 'no-dot'}"></span><b>${t}</b> <span class="muted tiny">${esc(d)}</span></div>`; }

  const urlIn = $('#url', root), addB = $('#add', root);
  const add = async () => {
    const id = parseYouTubeId(urlIn.value);
    if (!id) return toast('YouTube 링크를 확인해주세요');
    addB.disabled = true;
    const title = await fetchTitle(id);
    const v = D.addVideo(id, title || '');
    toast(title ? '영상을 추가했어요' : '추가했어요 · 제목은 영상 관리에서 수정');
    location.hash = `#/settings/video/${v.id}`;
  };
  addB.onclick = add;
  urlIn.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); add(); } });
  urlIn.addEventListener('paste', () => setTimeout(() => { if (parseYouTubeId(urlIn.value)) add(); }, 0));
  $('#paste', root).onclick = async () => {
    try { const t = await navigator.clipboard.readText(); urlIn.value = t.trim(); if (parseYouTubeId(urlIn.value)) add(); else toast('클립보드에 YouTube 링크가 없어요'); }
    catch { urlIn.focus(); toast('입력칸을 길게 눌러 붙여넣어 주세요'); }
  };


  // 인식
  $('#ap', root).onchange = e => D.setSetting('autoPause', e.target.checked);
  $('#aion', root).onchange = e => D.setSetting('aiOn', e.target.checked);
  const drawAI = () => {
    const p = D.get().settings.aiProvider === 'openai' ? 'openai' : 'gemini', k = aiKeys();
    $('#aibox', root).innerHTML = `<label class="field"><span>${p === 'gemini' ? 'Gemini API 키 · aistudio.google.com (무료)' : 'OpenAI API 키 · platform.openai.com (유료 크레딧)'}</span><input class="input en" id="aikey" type="password" value="${esc(k[p] || '')}" placeholder="${p === 'gemini' ? 'AIza…' : 'sk-…'}" autocapitalize="off" autocomplete="off" spellcheck="false"></label>
      <label class="field"><span>모델 (비우면 ${DEFAULT_MODEL[p]})</span><input class="input en" id="aimodel" value="${esc(k[p + 'Model'] || '')}" placeholder="${DEFAULT_MODEL[p]}" autocapitalize="off" autocomplete="off" spellcheck="false"></label>
      <p class="tiny muted">키는 이 기기에만 저장돼요 (동기화·백업 제외).</p>`;
    $('#aikey', root).onchange = e => setAiKeys({ [p]: e.target.value.trim() });
    $('#aimodel', root).onchange = e => setAiKeys({ [p + 'Model']: e.target.value.trim() });
    $('#aist', root).textContent = '';
  };
  drawAI();
  $$('[data-p]', root).forEach(b => b.onclick = () => { D.setSetting('aiProvider', b.dataset.p); $$('[data-p]', root).forEach(x => x.classList.toggle('on', x === b)); drawAI(); });
  $('#aitest', root).onclick = async () => {
    const p = D.get().settings.aiProvider === 'openai' ? 'openai' : 'gemini';
    setAiKeys({ [p]: $('#aikey', root).value.trim(), [p + 'Model']: $('#aimodel', root).value.trim() });
    const st2 = $('#aist', root);
    if (D.get().settings.aiOn === false) { st2.textContent = '위 스위치를 켜주세요'; return; }
    if (!aiOn()) { st2.textContent = 'API 키를 넣어주세요'; return; }
    st2.textContent = '확인 중…';
    const r = await callAI('Return ONLY JSON {"natural": "..."} — a natural English version of the Korean line.', 'Korean: 나 오늘 라면 먹었어');
    st2.textContent = r && !r.error && r.natural ? `연결됐어요 · “${r.natural}”` : `안 돼요 · ${AI_ERR[r?.error] || r?.error || '알 수 없는 오류'}${r?.status ? ` (${r.status})` : ''}`;
  };

  // ----- 통화 사진 관리 -----
  const drawPhotos = () => {
    const all = allPhotos(); const more = all.length > 8 && !photosOpen;
    $('#phg', root).innerHTML = (more ? all.slice(0, 7) : all).map(p => `<div class="pg" style="background-image:url('${p.src}');background-position:${((p.box[0] + p.box[2]) / 2 * 100).toFixed(0)}% ${((p.box[1] + p.box[3]) / 2 * 100).toFixed(0)}%">${p.mine ? '<i class="pg-mine">내 사진</i>' : ''}<button class="pg-del" data-del="${p.id}" aria-label="사진 삭제">${ic('x')}</button></div>`).join('')
      + (more ? `<button class="pg-more" id="phmore">+${all.length - 7}<small>전체 보기</small></button>` : '');
    $('#phmore', root) && ($('#phmore', root).onclick = () => { photosOpen = true; drawPhotos(); });
    $$('[data-del]', root).forEach(b => b.onclick = async () => { if (allPhotos().length <= 1) return toast('사진은 1장 이상 있어야 해요'); if (await confirmSheet('이 사진을 지울까요?', '삭제')) { await removePhoto(b.dataset.del); settings(root); } });
  };
  drawPhotos();
  $('#phadd', root).onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) photoSheet(f, () => settings(root)); };
  $('#fix', root).onchange = e => { D.setSetting('sttFix', e.target.value); toast('보정 단어를 저장했어요'); };
  let testCap = null;
  $('#mt', root).onclick = async () => {
    const r = $('#mres', root), b = $('#mt', root);
    if (testCap) { testCap.stop(); return; }
    if (!S.support.stt) { r.classList.remove('hide'); r.textContent = S.sttErrorText('unsupported'); return; }
    r.classList.remove('hide'); r.textContent = '예: “Nice to meet you, Baekhyun.” 말한 뒤 끝내기를 눌러주세요';
    b.innerHTML = `${ic('stop')} 끝내기`; b.classList.add('live-btn');
    testCap = S.capture({ stt: true, onState: s => { if (s === 'listening') r.textContent = '듣는 중… (멈춰도 계속 들어요)'; }, onInterim: t => (r.innerHTML = `<span class="en">${esc(t)}</span>`) });
    const res = await testCap.result; testCap = null;
    b.innerHTML = `${ic('mic')} 인식 테스트 시작`; b.classList.remove('live-btn');
    r.innerHTML = res.text ? `인식됨: <b class="en">${esc(res.text)}</b>${res.confidence ? ` <span class="muted tiny">신뢰도 ${Math.round(res.confidence * 100)}%</span>` : ''}` : esc(S.sttErrorText(res.sttError) || '인식된 말이 없어요');
  };

  // 데이터
  $('#exp', root).onclick = async () => {
    const json = D.exportJSON(); const name = `baek-to-you-backup-${D.today()}.json`;
    const file = new File([json], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    toast('백업 파일을 저장했어요');
  };
  $('#imp', root).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    const txt = await f.text(); e.target.value = '';
    let info = '';
    try { const d = JSON.parse(txt); if (!Array.isArray(d.videos) || !Array.isArray(d.utts)) throw 0; info = `영상 ${d.videos.length} · 문장 ${d.utts.length} · SAVED ${(d.saved || []).length}`; }
    catch { toast('BAEK TO YOU 백업 파일이 아니에요'); return; }
    const s = sheet(`<h3>백업 복원</h3><p class="sheet-p">${esc(info)}<br>복원 전 현재 상태를 자동으로 저장해 두니, 잘못되면 ‘직전 상태로 되돌리기’로 돌아올 수 있어요.</p>
      <div class="stack"><button class="btn block" data-m="merge">기존 데이터에 합치기 (추천)</button><button class="btn block soft" data-m="replace">전체 바꾸기</button></div>`);
    $$('[data-m]', s).forEach(b => b.onclick = () => { try { D.importJSON(txt, b.dataset.m); toast('복원 완료'); s.close(); settings(root); } catch (err) { toast(err.message); } });
  };
  $('#undo', root) && ($('#undo', root).onclick = async () => {
    if (!await confirmSheet('직전 상태로 되돌릴까요?', '되돌리기', `${esc(snap.reason)} 직전의 데이터로 돌아가요. 그 이후 바뀐 내용은 사라져요.`)) return;
    try { D.restoreSnapshot(); toast('되돌렸어요'); settings(root); } catch (e) { toast(e.message); }
  });
  $('#rst', root).onclick = async () => { if (await confirmSheet('정말 모든 데이터를 지울까요?', '모두 삭제', '먼저 JSON 백업을 권장해요. 직전 상태 1개는 자동 보관돼요.')) { D.resetAll(); toast('초기화했어요'); settings(root); } };
  $('#upd', root).onclick = async () => { const b = $('#upd', root); b.disabled = true; const r = await checkUpdate(true); b.disabled = false; toast(r); };
  return unsub;
}

// ---------- 기기 연동 (Google 로그인 + 자동 동기화) ----------
function ago(t) { if (!t) return ''; const s = (Date.now() - t) / 1000; if (s < 60) return '방금 전'; if (s < 3600) return `${Math.floor(s / 60)}분 전`; if (s < 86400) return `${Math.floor(s / 3600)}시간 전`; return new Date(t).toLocaleDateString('ko-KR'); }
const GLOGO = '<svg viewBox="0 0 24 24" aria-hidden="true" style="stroke:none"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z"/></svg>';
const STATE_TXT = { loading: ['준비 중…', 'mid'], syncing: ['동기화 중…', 'mid'], pending: ['변경 사항 저장 대기', 'mid'], synced: ['동기화됨', 'ok'], offline: ['오프라인', 'warn'], error: ['오류', 'bad'] };
function mountSync(el) {
  let tick = null;
  const head = right => `<div class="sync-row"><span class="sync-ic">${ic('refresh')}</span><b class="grow">기기 연동</b>${right}</div>`;
  const render = st => {
    if (!el.isConnected) { unsub(); clearInterval(tick); return; }
    if (!st.configured) {
      el.innerHTML = head('<span class="chip">꺼짐</span>') + `<p class="tiny muted sync-p">이 기기에만 저장돼요 · 설정 방법은 ZIP 안의 FIREBASE_SETUP.md</p>`;
      return;
    }
    if (!st.user) {
      const busy = st.state === 'loading';
      el.innerHTML = head(`<button class="btn xs line g-btn" id="g" ${busy ? 'disabled' : ''}>${GLOGO} 로그인</button>`)
        + (st.state === 'error' ? `<div class="note warn">${esc(st.detail)}</div>` : '')
        + `<details class="adv"><summary>이메일로 로그인</summary>
          <input class="input" id="em" type="email" autocomplete="username" placeholder="이메일" autocapitalize="off">
          <input class="input mt8" id="pw" type="password" autocomplete="current-password" placeholder="비밀번호">
          <div class="row mt8"><button class="btn sm grow" id="el">로그인</button><button class="btn sm soft" id="rp">비밀번호 재설정</button></div></details>`;
      $('#g', el).onclick = () => Y.loginGoogle().then(() => toast('로그인했어요 · 동기화를 시작해요')).catch(e => toast(Y.authErrorText(e)));
      $('#el', el).onclick = () => { const em = $('#em', el).value, pw = $('#pw', el).value; if (!em || !pw) return toast('이메일과 비밀번호를 입력해주세요'); Y.loginEmail(em, pw).then(() => toast('로그인했어요')).catch(e => toast(Y.authErrorText(e))); };
      $('#rp', el).onclick = () => { const em = $('#em', el).value; if (!em) return toast('이메일을 먼저 입력해주세요'); Y.resetPassword(em).then(() => toast('재설정 메일을 보냈어요')).catch(e => toast(Y.authErrorText(e))); };
      return;
    }
    const [txt, tone] = STATE_TXT[st.state] || ['', 'mid'];
    const u = st.user; const hasPw = u.providers.includes('password');
    el.innerHTML = head(`<span class="sync-st ${tone}"><i></i>${txt}${st.state === 'synced' && st.lastSyncAt ? ` · ${ago(st.lastSyncAt)}` : ''}</span>`)
      + (st.detail && (st.state === 'error' || st.state === 'offline') ? `<div class="note ${st.state === 'error' ? 'warn' : ''}">${esc(st.detail)}</div>` : '')
      + `<details class="adv"><summary>연동 관리</summary>
        <div class="row"><button class="btn sm soft grow" id="sn">${ic('refresh')} 지금 동기화</button><button class="btn sm line" id="lo">로그아웃</button></div>
        ${hasPw ? '' : `<p class="tiny muted mt12">홈 화면 앱에서 Google 창이 안 열리면, 여기서 이메일 로그인을 추가해 두세요.</p>
        <input class="input" id="lem" type="email" autocomplete="username" placeholder="이메일" autocapitalize="off">
        <input class="input mt8" id="lpw" type="password" autocomplete="new-password" placeholder="새 비밀번호 (6자 이상)">
        <button class="btn sm block mt8" id="lk">이메일 로그인 추가</button>`}</details>`;
    $('#sn', el).onclick = () => { Y.syncNow(); };
    $('#lo', el).onclick = async () => { if (await confirmSheet('로그아웃할까요?', '로그아웃', '이 기기의 데이터는 그대로 남아요.')) { await Y.logout(); toast('로그아웃했어요'); } };
    $('#lk', el) && ($('#lk', el).onclick = () => { const em = $('#lem', el).value, pw = $('#lpw', el).value; if (!em || pw.length < 6) return toast('이메일과 6자 이상 비밀번호를 입력해주세요'); Y.linkEmail(em, pw).then(() => toast('이메일 로그인을 추가했어요')).catch(e => toast(Y.authErrorText(e))); });
  };
  const unsub = Y.onStatus(render);
  render(Y.status());
  tick = setInterval(() => el.isConnected ? (Y.status().state === 'synced' && !el.querySelector('details[open]') && render(Y.status())) : clearInterval(tick), 30000);
  return () => { unsub(); clearInterval(tick); };
}

// ---------- 내 프로필: 이름(백현이가 부르는 이름) · 사진 ----------
function mountProfile(el) {
  const draw = () => {
    const p = D.profile();
    el.innerHTML = `<label class="prof-av" aria-label="프로필 사진 바꾸기">${p.photo ? `<img src="${p.photo}" alt="">` : `<span>${ic('heart')}</span>`}<i>${ic('edit')}</i><input type="file" accept="image/*" id="pfile" class="hide"></label>
      <div class="grow"><span class="label">MY PROFILE</span><input class="input prof-name" id="pname" value="${esc(p.name)}" placeholder="백현이가 불러줄 이름" maxlength="12" autocomplete="nickname"></div>
      ${p.photo ? `<button class="mini" id="pdel" aria-label="사진 지우기">${ic('x')}</button>` : ''}`;
    $('#pname', el).onchange = e => { D.setProfile({ name: e.target.value.trim() }); toast(e.target.value.trim() ? `‘${D.callName()}’ 하고 불러줄게요` : '이름을 지웠어요'); };
    $('#pfile', el).onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { D.setProfile({ photo: await squareThumb(f, 240) }); draw(); toast('사진을 바꿨어요'); } catch { toast('사진을 불러오지 못했어요'); } };
    $('#pdel', el) && ($('#pdel', el).onclick = () => { D.setProfile({ photo: '' }); draw(); });
  };
  draw();
}
async function squareThumb(file, size) {
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const w = img.naturalWidth, hh = img.naturalHeight, s = Math.min(w, hh);
  const c = document.createElement('canvas'); c.width = c.height = size;
  c.getContext('2d').drawImage(img, (w - s) / 2, (hh - s) / 2 * 0.5, s, s, 0, 0, size, size);
  URL.revokeObjectURL(url);
  return c.toDataURL('image/jpeg', 0.82);
}

// ---------- 전체 영상 목록 (CHAT / CALL) ----------
export function videoListAll(root, tab = 'call') {
  const all = D.get().videos.filter(v => tab === 'call' ? isLive(v) : !isLive(v)).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  root.innerHTML = `<div class="screen">
    <header class="top"><a class="icon-btn" href="#/settings" aria-label="뒤로">${ic('back')}</a><h2>${tab === 'call' ? 'CALL' : 'CHAT'} 영상 · ${all.length}</h2><span class="icon-sp"></span></header>
    <div class="view-sw"><a href="#/settings/videos/chat" class="${tab === 'chat' ? 'on' : ''}">CHAT</a><a href="#/settings/videos/call" class="${tab === 'call' ? 'on' : ''}">CALL</a></div>
    ${all.length ? `<div class="list">${all.map(v => `<a class="li" href="#/settings/video/${v.id}"><div class="thumb" style="background-image:url('${thumb(v.ytId)}')"></div><div class="grow"><b class="clamp2">${esc(v.title)}</b><small>${D.uttsOf(v.id).length}문장</small></div>${ic('next')}</a>`).join('')}</div>` : '<div class="note">영상이 없어요</div>'}
  </div>`;
}

// ---------- 영상 상세 / 문장 관리 ----------
export function videoEditor(root, vid) {
  const v = D.video(vid); if (!v) { location.hash = '#/settings'; return () => { }; }
  const us = D.uttsOf(vid);
  root.innerHTML = `<div class="screen">
    <header class="top"><a class="icon-btn" href="#/settings" aria-label="뒤로">${ic('back')}</a><h2>영상 관리</h2><a class="icon-btn" href="#/video/${v.id}" aria-label="학습하기">${ic('play')}</a></header>
    <div class="player" id="pl"></div>
    <div class="row title-row"><input class="input grow" id="ttl" value="${esc(v.title)}" aria-label="영상 제목"></div>
    <section class="scene-card" id="scn"></section>
    <div class="row between sec-row"><span class="label">SENTENCES · ${us.length}</span></div>
    <div class="sent-actions">
      <button class="btn sm" id="rep-j">${ic('refresh')} JSON으로 교체</button>
      <button class="btn sm soft" id="cpj" ${us.length ? '' : 'disabled'}>${ic('copy')} JSON 전체 복사</button>
    </div>
    ${us.length ? `<div class="ulist">${us.map(u => `<a class="uitem" href="#/settings/utt/${v.id}/${u.id}"><span class="t">${D.fmt(u.start)}</span><div class="grow"><div class="ko">${esc(u.ko)}</div><div class="small muted en u-en">${esc(u.en.natural || u.en.easy || '— 영어 예시 없음')}</div></div>${ic('edit')}</a>`).join('')}</div>`
      : `<div class="note">‘JSON으로 교체’에서 Claude용 프롬프트를 복사해 문장을 한 번에 넣어보세요.</div>`}
    <button class="btn line block danger-line" id="delv">${ic('trash')} 이 영상 삭제</button>
  </div>`;
  // 제목 자동: 비어 있거나 기본값이면 YouTube에서 가져와서 채움
  const autoTitle = t => { if (!t) return; const cur = D.video(vid); if (cur && (!cur.title || cur.title === 'YouTube 영상')) { D.updateVideo(vid, { title: t }); const i = $('#ttl', root); if (i) i.value = t; } };
  const pl = new Player($('#pl', root), { onReady: () => autoTitle(pl.title()), onState: s => s === 'cued' && autoTitle(pl.title()) }); pl.cue(v.ytId);
  if (!v.title || v.title === 'YouTube 영상') fetchTitle(v.ytId).then(autoTitle);
  const reload = () => { pl.destroy(); videoEditor(root, vid); };
  // ----- TALK 통화 설정: 장면 분석 · 메모 · 사진 -----
  const scn = $('#scn', root);
  const drawScene = () => {
    const cur = D.video(vid); const sel = cur.sit || []; const live = isLive(cur);
    const auto = topTags(sceneOf({ ...cur, sit: [] }), 8).filter(t => situations().some(([k]) => k === t) || TIMES_SEL.some(([k]) => k === t));
    const ap = pickPhoto({ ...cur, photo: '' });
    const shown = sel.length ? sel : auto;
    scn.innerHTML = `<span class="label">영상 종류</span>
      <div class="seg kind-seg mt8">${[['live', '라이브 · CALL'], ['video', '일반 영상 · CHAT']].map(([k, l]) => `<button data-kind="${k}" class="${(live ? 'live' : 'video') === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      ${live ? `<div class="scene-sec"><div class="row between"><span class="label">상황 · 시간대</span><button class="link-sm" id="sitedit">${ic('edit')} 고르기</button></div>
        <div class="sit-row wrap mt8">${shown.length ? shown.map(k => `<span class="sit ${sel.length ? 'on' : 'auto'}">${esc(sitLabel(k) || TAG_KO[k] || k)}</span>`).join('') : '<span class="tiny muted">아직 없어요 · 고르기를 눌러 정해주세요</span>'}</div>
        ${!sel.length && shown.length ? '<p class="tiny muted mt8">점선은 대본으로 추정한 상황이에요</p>' : ''}</div>
      <div class="scene-sec"><span class="label">전화 올 때 사진</span>
        ${(() => { const p = cur.photo && allPhotos().find(x => x.id === cur.photo) || ap.p; return `<div class="ph-cur mt8"><span class="ph-th" style="${thumbStyle(p)}"></span><div class="grow"><b>${cur.photo ? '직접 고른 사진' : '자동'}</b><small>${cur.photo ? '이 사진으로 전화가 와요' : '상황과 가장 비슷한 사진'}</small></div><button class="btn sm soft" id="phchg">바꾸기</button></div>`; })()}</div>` : '<p class="tiny muted mt12">일반 영상은 CHAT에만 보여요.</p>'}`;
    $$('[data-kind]', scn).forEach(b => b.onclick = () => { D.updateVideo(vid, { kind: b.dataset.kind }); drawScene(); });
    $('#sitedit', scn) && ($('#sitedit', scn).onclick = () => sitSheet(vid, drawScene));
    $('#phchg', scn) && ($('#phchg', scn).onclick = () => {
      const cur2 = D.video(vid);
      const sh = sheet(`<h3>전화 올 때 사진</h3><div class="photo-grid four"><button class="pg-auto ${cur2.photo ? '' : 'on'}" data-ph="">자동</button>${allPhotos().map(p => `<button class="pg ${cur2.photo === p.id ? 'on' : ''}" data-ph="${p.id}" style="${thumbStyle(p)}" aria-label="사진"></button>`).join('')}</div>`);
      $$('[data-ph]', sh).forEach(b => b.onclick = () => { D.updateVideo(vid, { photo: b.dataset.ph }); sh.close(); drawScene(); });
    });
  };
  drawScene();
  $('#ttl', root).onchange = e => D.updateVideo(v.id, { title: e.target.value.trim() || v.title });
  $('#delv', root).onclick = async () => { if (await confirmSheet('영상과 등록된 문장을 모두 삭제할까요?', '영상 삭제', 'SAVED에 저장한 표현은 남아요.')) { pl.destroy(); D.deleteVideo(v.id); toast('영상을 삭제했어요'); location.hash = '#/settings'; } };
  $('#cpj', root).onclick = async () => {
    const json = exportUtts(v.id);
    if (await copyText(json)) toast(`문장 ${us.length}개 JSON을 복사했어요 · 고친 뒤 ‘JSON으로 교체’에 붙여넣기`);
    else { const sh = sheet(`<h3>JSON 전체</h3><p class="sheet-p">자동 복사가 막혔어요. 아래를 길게 눌러 전체 선택 → 복사해주세요.</p><textarea class="textarea mono" readonly>${esc(json)}</textarea>`); $('textarea', sh).select(); }
  };
  $('#rep-j', root).onclick = () => jsonSheet(v, 'replace', reload);
  return () => pl.destroy();
}

const PROMPT = v => `아래 YouTube 영상(${v.title} / https://youtu.be/${v.ytId})에서 백현이 실제로 말한 한국어 발화를 내가 적어줄게. 각 발화를 BAEK TO YOU 앱용 JSON 배열로 만들어줘. 백현이가 하지 않은 말을 지어내지 말고, 내가 준 발화와 시간만 사용해줘.

영어 문장 규칙 (natural 하나만):
- natural: 원어민이 일상 대화에서 실제로 쓰는 자연스러운 중급 영어 한 문장(또는 짧은 두 문장)
- 한국어 원문의 의미를 하나도 빠뜨리지 말 것 (누가·무엇을·언제·감정·뉘앙스 모두)
- 원문에 없는 내용은 절대 추가하지 말 것 (설명, 꾸밈말, 감탄사 덧붙이지 않기)
- easy / advanced 필드는 만들지 말 것

형식 (JSON만 출력):
[{"start":"0:12","end":"0:17","ko":"한국어 원문","natural":"자연스러운 영어","pattern":"natural 문장의 핵심 패턴 (예: I've been ~ing)","patternKo":"패턴 의미 (예: 최근부터 지금까지 계속 ~하고 있어)","question":"이 패턴으로 내 이야기를 하게 하는 한국어 질문 (예: 요즘 계속하고 있는 일이 있나요?)","frame":"빈칸 문장 (예: I've been ______.)","topics":["food"],"emotion":"happy","type":"question","keywords":["eat","dinner"],"hint":"대답 힌트 (영어 2~5단어)","replies":["이 말에 내가(팬이) 대답할 법한, 원어민이 실제로 쓰는 자연스러운 영어 대답 1","대답 2","대답 3"]}]
백현이가 질문하는 발화(예: 밥은 먹었어요?)는 type을 꼭 "question"으로 해줘.
topics는 ${Object.keys(TOPICS).join(', ')} 중에서, type은 ${TYPES.join(', ')} 중에서, emotion은 ${EMOTIONS.join(', ')} 중에서 골라줘.

내 발화 목록:
0:00-0:05 (여기에 한국어 발화)`;

// 이 영상 문장을 업로드 형식 그대로 내보내기 (수정 후 ‘교체’로 다시 올리기)
const t2s = t => { const m = Math.floor(t / 60), s = Math.round((t - m * 60) * 10) / 10; return `${m}:${s < 10 ? '0' : ''}${s}`; };
function exportUtts(vid) {
  const keys = ['pattern', 'patternKo', 'question', 'frame', 'topics', 'emotion', 'type', 'keywords', 'hint', 'replies', 'alts'];
  return JSON.stringify(D.uttsOf(vid).map(u => {
    const o = { start: t2s(u.start), end: t2s(u.end), ko: u.ko, natural: u.en.natural || u.en.easy || u.en.advanced };
    keys.forEach(k => { const v = u[k]; if (Array.isArray(v) ? v.length : v) o[k] = v; });
    return o;
  }), null, 2);
}
// mode: 'add' (기존 문장 뒤에 추가) | 'replace' (이 영상의 문장만 전부 교체)
function jsonSheet(v, mode, done) {
  const n = D.uttsOf(v.id).length;
  const s = sheet(`<h3>JSON으로 교체</h3>
    <p class="sheet-p">${n ? `이 영상의 문장 ${n}개를 새 JSON으로 <b>전부 바꿔요</b>. 다른 영상은 그대로예요.` : '이 영상에 넣을 문장 JSON을 붙여넣어요.'}</p>
    <div class="row wrap gap6"><button class="btn sm soft" id="cp">${ic('copy')} Claude용 프롬프트 복사</button>${n ? `<button class="btn sm soft" id="ld">${ic('download')} 현재 JSON 불러오기</button>` : ''}<label class="btn sm soft">${ic('upload')} 파일 선택<input type="file" id="file" accept="application/json,.json,.txt" class="hide"></label></div>
    <textarea class="textarea mono" id="js" placeholder='[{"start":"0:12","end":"0:17","ko":"...","natural":"..."}]'></textarea>
    <div id="vres"></div>
    <div class="row"><button class="btn soft grow" id="chk">검사하기</button><button class="btn grow" id="go" disabled>${n ? '교체하기' : '넣기'}</button></div>`);
  let checked = null;
  const ta = $('#js', s), out = $('#vres', s), go = $('#go', s);
  const check = () => {
    const r = D.validateUtts(ta.value); checked = r.ok ? r : null; go.disabled = !r.ok;
    const linked = mode === 'replace' ? D.savedLinkedTo(v.id) : [];
    const relink = r.ok ? linked.filter(x => r.items.some(i => (i.ko || '').trim() === (D.utt(x.uttId)?.ko || x.ko).trim())).length : 0;
    out.innerHTML = r.ok
      ? `<div class="vcheck ok">${ic('check')}<div><b>${r.items.length}개 문장 확인 완료</b>${mode === 'replace' ? `<br><small>기존 ${n}개 → 새 ${r.items.length}개로 교체</small>` : ''}
        ${linked.length ? `<br><small>SAVED 표현 ${linked.length}개 중 ${relink}개는 같은 한국어 문장으로 다시 연결되고, ${linked.length - relink}개는 내용은 남지만 원본 문장 연결만 끊겨요.</small>` : ''}
        ${r.warns.length ? `<details class="adv"><summary>참고 ${r.warns.length}개</summary><div class="tiny">${r.warns.slice(0, 20).map(esc).join('<br>')}</div></details>` : ''}</div></div>`
      : `<div class="vcheck bad">${ic('x')}<div><b>업로드할 수 없어요 · 기존 데이터는 그대로예요</b><div class="tiny">${r.errors.slice(0, 8).map(esc).join('<br>')}${r.errors.length > 8 ? `<br>외 ${r.errors.length - 8}개` : ''}</div></div></div>`;
  };
  ta.oninput = () => { checked = null; go.disabled = true; out.innerHTML = ''; };
  $('#chk', s).onclick = check;
  $('#ld', s) && ($('#ld', s).onclick = () => { ta.value = exportUtts(v.id); checked = null; go.disabled = true; out.innerHTML = ''; toast('현재 문장을 불러왔어요 · 고친 뒤 검사하기'); });
  $('#file', s).onchange = async e => { const f = e.target.files[0]; if (!f) return; ta.value = await f.text(); e.target.value = ''; check(); };
  $('#cp', s).onclick = async () => { if (await copyText(PROMPT(v))) toast('프롬프트를 복사했어요'); else { ta.value = PROMPT(v); toast('복사가 막혀서 입력칸에 넣었어요'); } };
  go.onclick = () => {
    if (!checked) return;
    try {
      const r = D.applyUtts(v.id, checked.items, mode);
      toast(mode === 'replace' ? `${r.added}개로 교체했어요${r.detached ? ` · SAVED ${r.detached}개 연결 해제` : ''}` : `${r.added}개 문장을 추가했어요`);
      s.close(); done();
    } catch (e) { toast('적용 실패 · 기존 데이터는 그대로예요'); }
  };
}

// ---------- 문장 편집 ----------
export function uttEditor(root, vid, uttId) {
  const v = D.video(vid); if (!v) { location.hash = '#/settings'; return () => { }; }
  const u = D.utt(uttId);
  if (!u) { location.hash = `#/settings/video/${vid}`; return () => { }; }
  const tagSet = new Set(u.topics);
  root.innerHTML = `<div class="screen">
    <header class="top"><a class="icon-btn" href="#/settings/video/${vid}" aria-label="뒤로">${ic('back')}</a><h2>문장 편집</h2><button class="btn sm" id="sv">저장</button></header>
    <div class="player" id="pl"></div>
    <div class="two mt12">
      <div class="field"><span>시작</span><div class="timepick"><input class="input" id="st" value="${fmtD(u.start)}" inputmode="decimal"><button class="btn xs soft" data-now="st">지금</button></div></div>
      <div class="field"><span>끝</span><div class="timepick"><input class="input" id="en" value="${fmtD(u.end)}" inputmode="decimal"><button class="btn xs soft" data-now="en">지금</button></div></div>
    </div>
    <div class="row nudge-row"><button class="btn sm soft grow" id="prev">${ic('play')} 구간 미리 듣기</button><button class="btn sm soft" data-nudge="-0.5">−0.5s</button><button class="btn sm soft" data-nudge="0.5">+0.5s</button></div>
    <label class="field"><span>백현이 한국어 발화 (실제로 말한 그대로) *</span><textarea class="textarea" id="ko">${esc(u.ko)}</textarea></label>
    <label class="field"><span>영어 추천 문장 (Natural) *</span><textarea class="textarea en" id="nat">${esc(u.en.natural || u.en.easy || u.en.advanced)}</textarea></label>
    <label class="field"><span>핵심 패턴 · 쉼표(,)로 여러 개 (예: I've been ~ing, can't wait to ~)</span><input class="input en" id="pat" value="${esc(u.pattern)}"></label>
    <details class="adv" ${u.patternKo || u.examples.length || u.question ? 'open' : ''}><summary>패턴 연습 설정 (없으면 앱 기본값)</summary>
      <label class="field"><span>패턴 의미</span><input class="input" id="pko" value="${esc(u.patternKo)}" placeholder="최근부터 지금까지 계속 ~하고 있어"></label>
      <label class="field"><span>내 문장 만들기 질문</span><input class="input" id="q" value="${esc(u.question)}" placeholder="요즘 계속하고 있는 일이 있나요?"></label>
      <label class="field"><span>빈칸 힌트</span><input class="input en" id="frame" value="${esc(u.frame)}" placeholder="I've been ______."></label>
    </details>
    <details class="adv"><summary>SPEAK 설정 (질문·답변 예시)</summary>
      <div class="field"><span>주제 태그</span><div class="tagpick" id="tags">${Object.keys(TOPICS).map(t => `<button data-t="${t}" class="${tagSet.has(t) ? 'on' : ''}">${t}</button>`).join('')}</div></div>
      <div class="two"><label class="field"><span>대화 유형 (백현이 질문이면 question → SPEAK 질문으로 사용)</span><select class="input" id="type">${TYPES.map(t => `<option ${u.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="field"><span>감정</span><select class="input" id="emo"><option value="">—</option>${EMOTIONS.map(t => `<option ${u.emotion === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
      <label class="field"><span>영어 키워드 (쉼표로 구분)</span><input class="input en" id="kw" value="${esc(u.keywords.join(', '))}" placeholder="dinner, hungry, chicken"></label>
      <label class="field"><span>대답 힌트</span><input class="input en" id="hint" value="${esc(u.hint)}" placeholder="I had … for dinner"></label>
      <label class="field"><span>원어민 답변 예시 (내가 대답할 때 참고 · 한 줄에 하나)</span><textarea class="textarea en" id="reps">${esc(u.replies.join('\n'))}</textarea></label>
      <label class="field"><span>다른 정답 표현 (한 줄에 하나)</span><textarea class="textarea en" id="alts">${esc(u.alts.join('\n'))}</textarea></label>
    </details>
    <button class="btn line block danger-line" id="del">${ic('trash')} 문장 삭제</button>
    <button class="btn block mt8" id="sv2">저장</button>
  </div>`;
  const pl = new Player($('#pl', root)); pl.cue(v.ytId, u.start);
  const T = id => D.parseTime($('#' + id, root).value) ?? 0;
  $$('[data-now]', root).forEach(b => b.onclick = () => { const t = Math.round(pl.time() * 10) / 10; $('#' + b.dataset.now, root).value = fmtD(t); });
  $$('[data-nudge]', root).forEach(b => b.onclick = () => { const t = Math.max(0, T('en') + +b.dataset.nudge); $('#en', root).value = fmtD(t); });
  $('#prev', root).onclick = () => { const s = T('st'), e = T('en'); if (e <= s) return toast('끝 시간이 시작보다 커야 해요'); pl.playSegment(v.ytId, s, e); };
  $$('#tags button', root).forEach(b => b.onclick = () => { b.classList.toggle('on'); tagSet.has(b.dataset.t) ? tagSet.delete(b.dataset.t) : tagSet.add(b.dataset.t); });
  const lines = id => $('#' + id, root).value.split('\n').map(s => s.trim()).filter(Boolean);
  const doSave = () => {
    const ko = $('#ko', root).value.trim(), nat = $('#nat', root).value.trim();
    const s = T('st'), e = T('en');
    if (!ko) return toast('한국어 발화를 입력해주세요');
    if (!nat) return toast('영어 추천 문장을 입력해주세요');
    if (e <= s) return toast('끝 시간이 시작보다 커야 해요');
    D.upsertUtt({
      ...u, start: s, end: e, ko, en: { ...u.en, natural: nat },
      pattern: $('#pat', root).value.trim(), patternKo: $('#pko', root).value.trim(), question: $('#q', root).value.trim(), frame: $('#frame', root).value.trim(),
      topics: [...tagSet], type: $('#type', root).value, emotion: $('#emo', root).value,
      keywords: $('#kw', root).value, hint: $('#hint', root).value.trim(), replies: lines('reps'), alts: lines('alts')
    });
    toast('저장했어요');
    location.hash = `#/settings/video/${vid}`;
  };
  $('#sv', root).onclick = doSave; $('#sv2', root).onclick = doSave;
  $('#del', root).onclick = async () => { if (await confirmSheet('이 문장을 삭제할까요?')) { D.deleteUtt(u.id); location.hash = `#/settings/video/${vid}`; } };
  return () => pl.destroy();
}
function fmtD(t) { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${(Math.round(s * 10) / 10)}`; }

// 사진 추가: 얼굴을 탭해서 위치 지정 → 얼굴 크기 → 어울리는 상황 (선택)
function photoSheet(file, done) {
  const url = URL.createObjectURL(file);
  let fx = 0.5, fy = 0.35, size = 0.32; const tags = new Set();
  const sh = sheet(`<h3>사진 추가</h3><p class="sheet-p">백현이 얼굴을 한 번 탭해주세요. 통화 화면에서 이 부분은 절대 잘리지 않아요.</p>
    <div class="ph-pick"><img src="${url}" alt=""><span class="ph-face"></span></div>
    <div class="field mt12"><span>얼굴 크기</span><div class="seg" id="phs">${[['0.22', '작게'], ['0.32', '보통'], ['0.46', '크게']].map(([k, l]) => `<button data-s="${k}" class="${k === '0.32' ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    <div class="field"><span>어울리는 상황 (선택)</span><div class="sit-row wrap">${situations().concat(TIMES_SEL).map(([k, l]) => `<button class="sit" data-t="${k}">${esc(l)}</button>`).join('')}</div></div>
    <button class="btn block" id="phsv">저장</button>`, { onClose: () => URL.revokeObjectURL(url) });
  const img = $('.ph-pick img', sh), face = $('.ph-face', sh);
  const draw = () => { const r = img.getBoundingClientRect(); const d = size * Math.min(r.width, r.height); Object.assign(face.style, { left: fx * r.width - d / 2 + 'px', top: fy * r.height - d / 2 + 'px', width: d + 'px', height: d + 'px' }); };
  img.onload = draw;
  img.onclick = e => { const r = img.getBoundingClientRect(); fx = (e.clientX - r.left) / r.width; fy = (e.clientY - r.top) / r.height; draw(); };
  $$('[data-s]', sh).forEach(b => b.onclick = () => { size = +b.dataset.s; $$('[data-s]', sh).forEach(x => x.classList.toggle('on', x === b)); draw(); });
  $$('[data-t]', sh).forEach(b => b.onclick = () => { const k = b.dataset.t; tags.has(k) ? tags.delete(k) : tags.add(k); b.classList.toggle('on', tags.has(k)); });
  $('#phsv', sh).onclick = async () => {
    $('#phsv', sh).disabled = true;
    try { await addUserPhoto(file, { fx, fy, size, tags: [...tags] }); toast('사진을 추가했어요'); sh.close(); done(); }
    catch { toast('사진을 저장하지 못했어요'); $('#phsv', sh).disabled = false; }
  };
}

// 상황 고르기 시트: 세로 목록(체크) · 상황 추가 · 삭제
function sitSheet(vid, done) {
  const draw = () => {
    const sel = new Set(D.video(vid).sit || []);
    const row = ([k, l], del) => `<div class="sit-li ${sel.has(k) ? 'on' : ''}"><button class="sit-check" data-k="${k}"><i>${ic('check')}</i>${esc(l)}</button>${del ? `<button class="mini" data-rm="${k}" aria-label="상황 삭제">${ic('trash')}</button>` : ''}</div>`;
    sh.querySelector('.sit-body').innerHTML = `<span class="label">상황</span><div class="sit-list">${situations().map(x => row(x, true)).join('')}</div>
      <div class="sit-add"><input class="input" id="sitnew" placeholder="새 상황 (예: 비 오는 날)"><button class="btn sm" id="sitadd">${ic('plus')} 추가</button></div>
      <span class="label mt12" style="margin-top:18px">시간대</span><div class="sit-list two-col">${TIMES_SEL.map(x => row(x, false)).join('')}</div>`;
    $$('[data-k]', sh).forEach(b => b.onclick = () => { const k = b.dataset.k; const now = new Set(D.video(vid).sit || []); now.has(k) ? now.delete(k) : now.add(k); D.updateVideo(vid, { sit: [...now] }); draw(); });
    $$('[data-rm]', sh).forEach(b => b.onclick = async () => { const l = sitLabel(b.dataset.rm); if (await confirmSheet(`‘${l}’ 상황을 지울까요?`, '삭제', '모든 영상에서 이 상황이 빠져요.')) { removeSituation(b.dataset.rm); draw(); } });
    const add = () => { const v = $('#sitnew', sh).value.trim(); if (!v) return; const k = addSituation(v); const now = new Set(D.video(vid).sit || []); now.add(k); D.updateVideo(vid, { sit: [...now] }); draw(); };
    $('#sitadd', sh).onclick = add; $('#sitnew', sh).onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) add(); };
  };
  const sh = sheet(`<h3>상황 고르기</h3><div class="sit-body"></div><button class="btn block mt12" id="sitdone">완료</button>`, { onClose: done });
  $('#sitdone', sh).onclick = () => sh.close();
  draw();
}
