// SETTINGS — 영상 라이브러리 · 문장 관리 · 음성 · 데이터 백업
import * as D from './store.js';
import * as S from './speech.js';
import { parseYouTubeId, fetchTitle, thumb, Player } from './yt.js';
import { esc, $, $$, ic, toast, sheet, confirmSheet, copyText } from './ui.js';
import { TOPICS, TYPES, EMOTIONS } from './talk-engine.js';
import { APP_VERSION, checkUpdate } from './pwa.js';
import * as Y from './sync.js';

const STT_LANGS = [['en-US', '영어 (미국) · 추천'], ['en-GB', '영어 (영국)'], ['en-AU', '영어 (호주)'], ['en-CA', '영어 (캐나다)'], ['en-IN', '영어 (인도)']];

export function settings(root) {
  const db = D.get(); const st = db.settings; const snap = D.snapshotInfo();
  root.innerHTML = `<div class="screen">
    <header class="top"><h1 class="page-title">Settings</h1></header>
    <section class="sync-card" id="sync"></section>
    <section class="add-card">
      <span class="label">ADD VIDEO</span>
      <div class="url-row"><input class="input" id="url" type="url" placeholder="YouTube 링크 붙여넣기" autocomplete="off" autocapitalize="off" spellcheck="false">
        <button class="icon-btn" id="paste" aria-label="붙여넣기">${ic('paste')}</button><button class="btn" id="add" aria-label="추가">${ic('plus')}</button></div>
    </section>

    <div class="sec-title label">VIDEOS · ${db.videos.length}</div>
    ${db.videos.length ? `<div class="list">${db.videos.map(v => `<a class="li" href="#/settings/video/${v.id}"><div class="thumb" style="background-image:url('${thumb(v.ytId)}')"></div><div class="grow"><b class="clamp2">${esc(v.title)}</b><small>${D.uttsOf(v.id).length}문장</small></div>${ic('next')}</a>`).join('')}</div>` : `<div class="note">위에 YouTube 링크를 붙여넣어 영상을 추가해보세요.</div>`}


    <div class="sec-title label">SPEECH RECOGNITION</div>
    <div class="card stack">
      <label class="field"><span>인식 언어</span><select class="input" id="sttlang">${STT_LANGS.map(([k, l]) => `<option value="${k}" ${st.sttLang === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="switch"><span><b>말하기 시작하면 영상 자동 일시정지</b><small>WATCH에서 마이크를 누르면 영상을 멈춰요</small></span><input type="checkbox" id="ap" ${st.autoPause !== false ? 'checked' : ''}><i></i></label>
      <button class="btn soft block" id="mt">${ic('mic')} 인식 테스트 시작</button><div id="mres" class="small hide test-res"></div>
      <label class="field"><span>인식 보정 단어 · 한 줄에 하나 <span class="en">들린 말 = 원래 단어</span></span>
        <textarea class="textarea en" id="fix" rows="3" placeholder="mongrel young = Mongryong&#10;tuck bokki = tteokbokki">${esc(st.sttFix || '')}</textarea></label>
      <p class="tiny muted">녹음은 직접 끝내기를 눌러야만 끝나요. 브라우저가 인식을 끊으면 자동으로 다시 이어서 들어요. 비교할 때 축약형·대소문자·문장부호 차이는 무시해요.</p>
    </div>

    <div class="sec-title label">DATA</div>
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
        • 발음·억양 점수는 전용 음성 평가 엔진(유료)이 필요해서 제공하지 않아요. 대신 단어 비교·길이·끊김·번갈아 듣기를 써요.<br>
        • 데이터는 이 기기 브라우저에만 저장돼요. 주기적으로 백업하세요.
      </div>
    </details>
    <p class="tiny muted foot-note">BAEK TO YOU · personal fan-made study app · 영상 저작권은 원저작자에게 있어요</p>
  </div>`;
  const unsub = mountSync($('#sync', root));
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
  $('#sttlang', root).onchange = e => { D.setSetting('sttLang', e.target.value); toast('인식 언어를 바꿨어요'); };
  $('#ap', root).onchange = e => D.setSetting('autoPause', e.target.checked);
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
  const render = st => {
    if (!el.isConnected) { unsub(); clearInterval(tick); return; }
    if (!st.configured) {
      el.innerHTML = `<div class="row between"><span class="label">SYNC · 기기 연동</span><span class="chip">꺼짐</span></div>
        <p class="small muted sync-p">Firebase 설정 전이라 이 기기에만 저장돼요. ZIP 안의 <b>FIREBASE_SETUP.md</b> 순서대로 설정하면 Google 로그인으로 컴퓨터와 iPhone이 자동 연동돼요.</p>`;
      return;
    }
    if (!st.user) {
      const busy = st.state === 'loading';
      el.innerHTML = `<div class="row between"><span class="label">SYNC · 기기 연동</span>${busy ? '<span class="chip">준비 중…</span>' : ''}</div>
        <p class="small muted sync-p">같은 계정으로 로그인하면 영상·문장·SAVED·학습 기록·설정이 컴퓨터와 iPhone에서 자동으로 맞춰져요. 지금 이 기기의 데이터는 그대로 유지되고 클라우드와 합쳐져요.</p>
        <button class="btn line block g-btn" id="g" ${busy ? 'disabled' : ''}>${GLOGO} Google 계정으로 로그인</button>
        ${st.state === 'error' ? `<div class="note warn mt8">${esc(st.detail)}</div>` : ''}
        <details class="adv"><summary>홈 화면 앱에서 Google 로그인이 안 될 때 · 이메일로 로그인</summary>
          <p class="tiny muted">먼저 Safari나 컴퓨터에서 Google로 로그인한 뒤 “이메일 로그인 추가”로 만든 이메일·비밀번호예요.</p>
          <input class="input" id="em" type="email" autocomplete="username" placeholder="이메일" autocapitalize="off">
          <input class="input mt8" id="pw" type="password" autocomplete="current-password" placeholder="비밀번호">
          <div class="row mt8"><button class="btn sm grow" id="el">이메일로 로그인</button><button class="btn sm soft" id="rp">비밀번호 재설정</button></div>
        </details>`;
      $('#g', el).onclick = () => Y.loginGoogle().then(() => toast('로그인했어요 · 동기화를 시작해요')).catch(e => toast(Y.authErrorText(e)));
      $('#el', el).onclick = () => { const em = $('#em', el).value, pw = $('#pw', el).value; if (!em || !pw) return toast('이메일과 비밀번호를 입력해주세요'); Y.loginEmail(em, pw).then(() => toast('로그인했어요')).catch(e => toast(Y.authErrorText(e))); };
      $('#rp', el).onclick = () => { const em = $('#em', el).value; if (!em) return toast('이메일을 먼저 입력해주세요'); Y.resetPassword(em).then(() => toast('재설정 메일을 보냈어요')).catch(e => toast(Y.authErrorText(e))); };
      return;
    }
    const [txt, tone] = STATE_TXT[st.state] || ['', 'mid'];
    const u = st.user; const hasPw = u.providers.includes('password');
    el.innerHTML = `<div class="row between"><span class="label">SYNC · 기기 연동</span><span class="sync-st ${tone}"><i></i>${txt}${st.state === 'synced' && st.lastSyncAt ? ` · ${ago(st.lastSyncAt)}` : ''}</span></div>
      <div class="row acct">${u.photo ? `<img class="av-img" src="${esc(u.photo)}" alt="" referrerpolicy="no-referrer">` : `<span class="av-img">${esc((u.name || u.email || '?')[0].toUpperCase())}</span>`}
        <div class="grow"><b>${esc(u.name || u.email || '로그인됨')}</b><small>${esc(u.email || '')}</small></div></div>
      ${st.detail && (st.state === 'error' || st.state === 'offline') ? `<div class="note ${st.state === 'error' ? 'warn' : ''}">${esc(st.detail)}</div>` : ''}
      <div class="row"><button class="btn sm soft grow" id="sn">${ic('refresh')} 지금 동기화</button><button class="btn sm line" id="lo">로그아웃</button></div>
      ${hasPw ? `<p class="tiny muted sync-p">이메일 로그인 연결됨 · 홈 화면 앱에서는 이메일로 로그인할 수 있어요.</p>` : `<details class="adv"><summary>홈 화면 앱용 이메일 로그인 추가</summary>
        <p class="tiny muted">iPhone 홈 화면 앱은 Safari와 로그인 정보가 따로라서 다시 로그인해야 해요. 거기서 Google 창이 안 열리면 여기서 만든 이메일·비밀번호로 같은 계정에 로그인할 수 있어요.</p>
        <input class="input" id="lem" type="email" autocomplete="username" value="${esc(u.email || '')}" autocapitalize="off">
        <input class="input mt8" id="lpw" type="password" autocomplete="new-password" placeholder="새 비밀번호 (6자 이상)">
        <button class="btn sm block mt8" id="lk">이메일 로그인 추가</button></details>`}
      <p class="tiny muted sync-p">녹음 파일과 음성 선택은 기기마다 따로 저장돼요.</p>`;
    $('#sn', el).onclick = () => { Y.syncNow(); };
    $('#lo', el).onclick = async () => { if (await confirmSheet('로그아웃할까요?', '로그아웃', '이 기기의 데이터는 그대로 남아요. 다시 로그인하면 이어서 동기화돼요.')) { await Y.logout(); toast('로그아웃했어요'); } };
    $('#lk', el) && ($('#lk', el).onclick = () => { const em = $('#lem', el).value, pw = $('#lpw', el).value; if (!em || pw.length < 6) return toast('이메일과 6자 이상 비밀번호를 입력해주세요'); Y.linkEmail(em, pw).then(() => toast('이메일 로그인을 추가했어요')).catch(e => toast(Y.authErrorText(e))); });
  };
  const unsub = Y.onStatus(render);
  render(Y.status());
  tick = setInterval(() => el.isConnected ? (Y.status().state === 'synced' && render(Y.status())) : clearInterval(tick), 30000);
  return () => { unsub(); clearInterval(tick); };
}

// ---------- 영상 상세 / 문장 관리 ----------
export function videoEditor(root, vid) {
  const v = D.video(vid); if (!v) { location.hash = '#/settings'; return () => { }; }
  const us = D.uttsOf(vid);
  root.innerHTML = `<div class="screen">
    <header class="top"><a class="icon-btn" href="#/settings" aria-label="뒤로">${ic('back')}</a><h2>영상 관리</h2><a class="icon-btn" href="#/video/${v.id}" aria-label="학습하기">${ic('play')}</a></header>
    <div class="player" id="pl"></div>
    <div class="row title-row"><input class="input grow" id="ttl" value="${esc(v.title)}" aria-label="영상 제목"><button class="btn sm soft" id="ttl-auto">제목 자동</button></div>
    <div class="row between sec-row"><span class="label">SENTENCES · ${us.length}</span></div>
    <div class="sent-actions">
      <button class="btn sm" id="add-j">${ic('plus')} JSON 추가</button>
      <button class="btn sm soft" id="rep-j" ${us.length ? '' : 'disabled'}>${ic('refresh')} JSON으로 교체</button>
      <button class="btn sm line danger-line" id="clr" ${us.length ? '' : 'disabled'}>${ic('trash')} 문장 전체 삭제</button>
    </div>
    ${us.length ? `<div class="ulist">${us.map(u => `<div class="uitem"><span class="t">${D.fmt(u.start)}</span><div class="grow"><div class="ko">${esc(u.ko)}</div><div class="small muted en u-en">${esc(u.en.natural || u.en.easy || '— 영어 예시 없음')}</div></div>
      <div class="ued-btns"><a class="mini" href="#/settings/utt/${v.id}/${u.id}" aria-label="편집">${ic('edit')}</a><button class="mini" data-del="${u.id}" aria-label="삭제">${ic('trash')}</button></div></div>`).join('')}</div>`
      : `<div class="note">‘JSON 추가’에서 Claude용 프롬프트를 복사해 문장을 한 번에 만들어보세요.</div>`}
    <button class="btn line block danger-line" id="delv">${ic('trash')} 이 영상 삭제</button>
  </div>`;
  const pl = new Player($('#pl', root)); pl.cue(v.ytId);
  const reload = () => { pl.destroy(); videoEditor(root, vid); };
  $('#ttl', root).onchange = e => D.updateVideo(v.id, { title: e.target.value.trim() || v.title });
  $('#ttl-auto', root).onclick = async () => { const t = pl.title() || await fetchTitle(v.ytId); if (t) { $('#ttl', root).value = t; D.updateVideo(v.id, { title: t }); toast('제목을 불러왔어요'); } else toast('영상을 한 번 재생한 뒤 다시 눌러주세요'); };
  $$('[data-del]', root).forEach(b => b.onclick = async () => { if (await confirmSheet('이 문장을 삭제할까요?')) { D.deleteUtt(b.dataset.del); reload(); toast('삭제했어요'); } });
  $('#clr', root).onclick = async () => {
    const linked = D.savedLinkedTo(v.id).length;
    const ok = await confirmSheet(`이 영상의 문장 ${us.length}개를 모두 삭제할까요?`, '문장 전체 삭제',
      `영상은 그대로 남고, 다른 영상의 문장은 영향이 없어요.${linked ? `<br>SAVED에 저장한 표현 ${linked}개는 내용이 그대로 남지만 원본 문장과의 연결(구간 이동)은 YouTube 링크로 바뀌어요.` : ''}<br>삭제 직전 상태는 SETTINGS › 직전 상태로 되돌리기로 복구할 수 있어요.`);
    if (!ok) return;
    const r = D.clearUtts(v.id); toast(`문장 ${r.removed}개를 삭제했어요`); reload();
  };
  $('#delv', root).onclick = async () => { if (await confirmSheet('영상과 등록된 문장을 모두 삭제할까요?', '영상 삭제', 'SAVED에 저장한 표현은 남아요.')) { pl.destroy(); D.deleteVideo(v.id); toast('영상을 삭제했어요'); location.hash = '#/settings'; } };
  $('#add-j', root).onclick = () => jsonSheet(v, 'add', reload);
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
[{"start":"0:12","end":"0:17","ko":"한국어 원문","natural":"자연스러운 영어","pattern":"natural 문장의 핵심 패턴 (예: I've been ~ing)","patternKo":"패턴 의미 (예: 최근부터 지금까지 계속 ~하고 있어)","question":"이 패턴으로 내 이야기를 하게 하는 한국어 질문 (예: 요즘 계속하고 있는 일이 있나요?)","frame":"빈칸 문장 (예: I've been ______.)","topics":["food"],"emotion":"happy","type":"question","keywords":["eat","dinner"],"hint":"TALK 대답 힌트 (영어 2~5단어)","replies":["이 말에 팬이 할 법한 자연스러운 영어 대답 1","대답 2"]}]
topics는 ${Object.keys(TOPICS).join(', ')} 중에서, type은 ${TYPES.join(', ')} 중에서, emotion은 ${EMOTIONS.join(', ')} 중에서 골라줘.

내 발화 목록:
0:00-0:05 (여기에 한국어 발화)`;

// mode: 'add' (기존 문장 뒤에 추가) | 'replace' (이 영상의 문장만 전부 교체)
function jsonSheet(v, mode, done) {
  const n = D.uttsOf(v.id).length;
  const s = sheet(`<h3>${mode === 'replace' ? 'JSON으로 문장 교체' : 'JSON으로 문장 추가'}</h3>
    <p class="sheet-p">${mode === 'replace' ? `이 영상의 기존 문장 ${n}개를 새 JSON으로 <b>전부 바꿔요</b>. 다른 영상은 그대로예요.` : '기존 문장은 그대로 두고 새 문장을 <b>뒤에 추가</b>해요.'}</p>
    <div class="row wrap gap6"><button class="btn sm soft" id="cp">${ic('copy')} Claude용 프롬프트 복사</button><label class="btn sm soft">${ic('upload')} 파일 선택<input type="file" id="file" accept="application/json,.json,.txt" class="hide"></label></div>
    <textarea class="textarea mono" id="js" placeholder='[{"start":"0:12","end":"0:17","ko":"...","natural":"..."}]'></textarea>
    <div id="vres"></div>
    <div class="row"><button class="btn soft grow" id="chk">검사하기</button><button class="btn grow ${mode === 'replace' ? 'danger' : ''}" id="go" disabled>${mode === 'replace' ? '교체하기' : '추가하기'}</button></div>`);
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
    <label class="field"><span>핵심 패턴 (예: I've been ~ing)</span><input class="input en" id="pat" value="${esc(u.pattern)}"></label>
    <details class="adv" ${u.patternKo || u.examples.length || u.question ? 'open' : ''}><summary>패턴 연습 설정 (없으면 앱 기본값)</summary>
      <label class="field"><span>패턴 의미</span><input class="input" id="pko" value="${esc(u.patternKo)}" placeholder="최근부터 지금까지 계속 ~하고 있어"></label>
      <label class="field"><span>내 문장 만들기 질문</span><input class="input" id="q" value="${esc(u.question)}" placeholder="요즘 계속하고 있는 일이 있나요?"></label>
      <label class="field"><span>빈칸 힌트</span><input class="input en" id="frame" value="${esc(u.frame)}" placeholder="I've been ______."></label>
    </details>
    <details class="adv"><summary>TALK 설정</summary>
      <div class="field"><span>주제 태그 (TALK 연결에만 사용 · WATCH엔 표시 안 함)</span><div class="tagpick" id="tags">${Object.keys(TOPICS).map(t => `<button data-t="${t}" class="${tagSet.has(t) ? 'on' : ''}">${t}</button>`).join('')}</div></div>
      <div class="two"><label class="field"><span>대화 유형</span><select class="input" id="type">${TYPES.map(t => `<option ${u.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="field"><span>감정</span><select class="input" id="emo"><option value="">—</option>${EMOTIONS.map(t => `<option ${u.emotion === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
      <label class="field"><span>영어 키워드 (쉼표로 구분)</span><input class="input en" id="kw" value="${esc(u.keywords.join(', '))}" placeholder="dinner, hungry, chicken"></label>
      <label class="field"><span>대답 힌트 (TALK Hint)</span><input class="input en" id="hint" value="${esc(u.hint)}" placeholder="I had … for dinner"></label>
      <label class="field"><span>답변 예시 (한 줄에 하나)</span><textarea class="textarea en" id="reps">${esc(u.replies.join('\n'))}</textarea></label>
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
