// SETTINGS — 영상 라이브러리 · 문장 관리 · 음성 · 데이터 백업
import * as D from './store.js';
import { callAI, AI_ERR, aiOn, aiKeys, setAiKeys, PROVIDERS, DEFAULT_MODEL } from './ai.js';
import * as S from './speech.js';
import { parseYouTubeId, fetchTitle, thumb, vThumb, Player } from './yt.js';
import { esc, $, $$, ic, toast, sheet, confirmSheet, copyText } from './ui.js';
import { TOPICS, TYPES, EMOTIONS } from './talk-engine.js';
import { APP_VERSION, checkUpdate } from './pwa.js';
import * as Y from './sync.js';
import { allPhotos, pickPhoto, sceneOf, topTags, conceptOf, TAG_KO, situations, sitLabel, TIMES_SEL, addSituation, removeSituation, addUserPhoto, removePhoto, isLive, autoLive, timeOfScene } from './scene.js';

let photosOpen = false;
// 이미지 줄이기 → JPEG data URL (공용 콘텐츠에 같이 저장되므로 작게)
async function shrinkImage(file, max = 480) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src);
  return c.toDataURL('image/jpeg', 0.8);
}
const thumbStyle = p => `background-image:url('${p.src}');background-position:${((p.box[0] + p.box[2]) / 2 * 100).toFixed(0)}% ${((p.box[1] + p.box[3]) / 2 * 100).toFixed(0)}%`;
let vtab = 'chat'; // 영상 목록: chat | call
let vmore = false;

export function settings(root) {
  const db = D.get(); const st = db.settings; const snap = D.snapshotInfo(); const edit = D.canEdit();
  root.innerHTML = `<div class="screen">
    <header class="top"><h1 class="page-title">Settings</h1></header>
    <section class="prof-card" id="prof"></section>
    ${edit ? `<section class="add-card">
      <span class="label">ADD VIDEO</span>
      <div class="url-row"><input class="input" id="url" type="url" placeholder="YouTube 링크 붙여넣기" autocomplete="off" autocapitalize="off" spellcheck="false">
        <button class="icon-btn" id="paste" aria-label="붙여넣기">${ic('paste')}</button><button class="btn" id="add" aria-label="추가">${ic('plus')}</button></div>
    </section>

    <div class="sec-title label">VIDEOS · ${db.videos.length}</div>
    ${db.videos.length ? (() => {
      const chat = db.videos.filter(v => !isLive(v)), callV = db.videos.filter(isLive), list = vtab === 'call' ? callV : chat;
      const shown = [...list].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)).slice(0, 5);
      return `<div class="view-sw"><button data-vt="chat" class="${vtab === 'chat' ? 'on' : ''}">CHAT <em>${chat.length}</em></button><button data-vt="call" class="${vtab === 'call' ? 'on' : ''}">CALL <em>${callV.length}</em></button></div>
      ${list.length ? `<div class="list">${shown.map(v => `<a class="li" href="#/settings/video/${v.id}"><div class="thumb" style="background-image:url('${vThumb(v)}')"></div><div class="grow"><b class="clamp2">${esc(v.title)}</b><small>${D.uttsOf(v.id).length}문장</small></div>${ic('next')}</a>`).join('')}
        ${list.length > shown.length ? `<a class="li more" href="#/settings/videos/${vtab}"><span class="grow">전체 ${list.length}개 보기</span>${ic('next')}</a>` : ''}</div>`
        : `<div class="note">${vtab === 'call' ? '라이브 영상이 없어요 · 영상 관리에서 종류를 ‘라이브 · CALL’로 바꿀 수 있어요' : '일반 영상이 없어요'}</div>`}`;
    })() : `<div class="note">위에 YouTube 링크를 붙여넣어 영상을 추가해보세요.</div>`}` : ''}


    ${edit ? `<div class="sec-title label">음성 인식 단어 · 관리자</div>
    <div class="card stack"><div id="sttw"></div>
      <p class="tiny muted">등록한 단어만 보정해요 · 모든 사용자 공통. 비슷하게 들린 말(예: Back)은 이름 자리일 때만 바꾸고, ‘come back’ 같은 일반 영어는 그대로 둬요.</p></div>` : ''}

    ${edit ? `<div class="sec-title label">통화 사진 · ${allPhotos().length}</div>
    <div class="card"><div class="photo-grid manage" id="phg"></div>
      <p class="tiny muted mt8">${D.isAdmin() ? '추가한 사진은 모든 사용자에게 공유돼요.' : '추가한 사진은 이 기기에만 저장돼요.'}</p></div>` : ''}

    <div class="sec-title label">AI</div>
    <div class="card stack">
      <label class="switch"><span><b>AI로 교정·추천·질문 답변</b><small>내 API 키로 사용 · 안 되면 앱 규칙으로 자동 전환</small></span><input type="checkbox" id="aion" ${st.aiOn !== false ? 'checked' : ''}><i></i></label>
      <div class="seg" id="aiprov">${PROVIDERS.map(([k, l]) => `<button data-p="${k}" class="${(st.aiProvider === 'openai' ? 'openai' : 'gemini') === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div id="aibox"></div>
      <div class="row"><button class="btn sm soft" id="aitest">연결 테스트</button><span class="small muted grow" id="aist"></span></div>
    </div>

    <div class="sec-title label">DATA</div>
    <div class="list">
      <button class="li" id="exp"><div class="ic">${ic('download')}</div><div class="grow"><b>JSON 백업</b><small>${edit ? '영상·문장·SAVED·학습 기록·설정' : '내 SAVED·학습 기록·설정'} (녹음 파일·API 키 제외)</small></div></button>
      <label class="li" style="cursor:pointer"><div class="ic">${ic('upload')}</div><div class="grow"><b>JSON 복원</b><small>합치기 또는 전체 바꾸기</small></div><input type="file" id="imp" accept="application/json,.json" class="hide"></label>
      ${snap ? `<button class="li" id="undo"><div class="ic">${ic('replay')}</div><div class="grow"><b>직전 상태로 되돌리기</b><small>${esc(snap.reason)} 전 · ${new Date(snap.at).toLocaleString('ko-KR')}</small></div></button>` : ''}
      <button class="li" id="rst"><div class="ic danger">${ic('trash')}</div><div class="grow"><b>내 학습 데이터 초기화</b><small>SAVED·단어·진도·기록 · 영상과 문장은 그대로</small></div></button>
      <a class="li" href="#/privacy"><div class="ic">${ic('info')}</div><div class="grow"><b>개인정보 처리방침 · 저작권 안내</b></div>${ic('next')}</a>
    </div>

    <div class="sec-title label">ACCOUNT</div>
    <section class="sync-card" id="sync"></section>

    <details class="adv help"><summary>YouTube 재생 · Premium · 소리</summary><div class="stack yt-info">
      <ul class="small bullets">
        <li><b>Premium(광고 없음)</b>은 앱에 로그인한다고 연동되지 않아요. 앱 안 플레이어가 브라우저의 YouTube 로그인을 쓸 수 있을 때만 적용돼요.</li>
        <li>시도해볼 설정 (iPhone): 설정 › 앱 › Safari › <b>크로스 사이트 추적 방지 끄기</b> → Safari에서 youtube.com 로그인 → 이 앱을 <b>Safari 탭</b>에서 열기. 홈 화면 앱은 Safari 로그인을 같이 쓰지 못해요.</li>
        <li><b>소리 크기</b>는 기기 볼륨 버튼으로 조절해요. iPhone·iPad는 웹에서 영상 음량을 바꿀 수 없어서 앱에 볼륨 슬라이더를 두지 않았어요.</li>
      </ul>
    </div></details>
    <details class="adv help"><summary>홈 화면에 앱으로 추가</summary><div class="stack yt-info">
      <ul class="small bullets">
        <li><b>iPhone Safari</b>: 아래 공유 버튼 › <b>홈 화면에 추가</b> › 추가</li>
        <li><b>Android Chrome</b>: 오른쪽 위 ⋮ › <b>홈 화면에 추가</b>(또는 앱 설치) › 설치</li>
      </ul>
      <p class="tiny muted">홈 화면 아이콘으로 열면 주소창 없이 앱처럼 열려요. 홈 화면 앱은 브라우저와 저장 공간이 따로라 처음 한 번 로그인해주세요.</p>
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
        • AI 키를 넣으면 의미 판단·교정·표현 추천을 AI가 해요. 추천 문장은 항상 업로드한 영어 문장 그대로예요. 키가 없거나 한도를 넘으면 앱 규칙 피드백으로 바뀌어요.<br>
        • iPhone은 음성 인식을 시작할 때 시스템 효과음이 날 수 있어요 (웹에서 끌 수 없어요).<br>
        • 로그인하면 내 학습 기록은 계정에, 로그인 전에는 이 기기에만 저장돼요.
      </div>
    </details>
    <p class="tiny muted foot-note">BAEK TO YOU · 비공식 팬메이드 영어 학습 앱<br>영상·사진·음성의 저작권은 각 원저작자에게 있어요</p>
  </div>`;
  const unsub = mountSync($('#sync', root));
  mountProfile($('#prof', root));
  $$('[data-vt]', root).forEach(b => b.onclick = () => { vtab = b.dataset.vt; vmore = false; settings(root); });

  function row(ok, t, d) { return `<div><span class="${ok ? 'ok-dot' : 'no-dot'}"></span><b>${t}</b> <span class="muted tiny">${esc(d)}</span></div>`; }

  const urlIn = $('#url', root), addB = $('#add', root);
  if (edit) {
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
  }


  // 인식
  $('#aion', root).onchange = e => D.setSetting('aiOn', e.target.checked);
  const drawAI = () => {
    const p = D.get().settings.aiProvider === 'openai' ? 'openai' : 'gemini', k = aiKeys();
    $('#aibox', root).innerHTML = `<label class="field"><span>${p === 'gemini' ? 'Gemini API 키 · aistudio.google.com (무료)' : 'OpenAI API 키 · platform.openai.com (유료 크레딧)'}</span><input class="input en" id="aikey" type="password" value="${esc(k[p] || '')}" placeholder="${p === 'gemini' ? 'AIza…' : 'sk-…'}" autocapitalize="off" autocomplete="off" spellcheck="false"></label>
      <label class="field"><span>모델 (비우면 ${DEFAULT_MODEL[p]})</span><input class="input en" id="aimodel" value="${esc(k[p + 'Model'] || '')}" placeholder="${DEFAULT_MODEL[p]}" autocapitalize="off" autocomplete="off" spellcheck="false"></label>
      <details class="adv key-guide"><summary>${p === 'gemini' ? 'Gemini' : 'ChatGPT'} API 키 받는 법</summary>${p === 'gemini'
        ? `<ol class="small bullets num"><li><a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> 에 Google 계정으로 로그인</li><li><b>Create API key</b> → 만들어진 키(AIza…) 복사</li><li>위 칸에 붙여넣고 <b>연결 테스트</b></li></ol>
           <p class="tiny muted">무료 등급은 하루 사용 한도 안에서 무료예요. 결제(유료 등급)를 연결하면 쓴 만큼 요금이 나가요.</p>`
        : `<ol class="small bullets num"><li><a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">platform.openai.com/api-keys</a> 로그인</li><li>Billing에서 크레딧 충전 (필수)</li><li><b>Create new secret key</b> → 키(sk-…) 복사 → 위 칸에 붙여넣기</li></ol>
           <p class="tiny muted">ChatGPT API는 쓴 만큼 요금이 나가요 (ChatGPT Plus 구독과 별개).</p>`}</details>
      <div class="row"><p class="tiny muted grow">키는 이 기기의 <b>지금 계정</b>에만 저장돼요 · 서버·다른 계정·백업에 들어가지 않아요. 남과 같이 쓰는 기기라면 쓰고 나서 지워주세요.</p>${k[p] ? '<button class="btn xs line" id="aiclr">키 지우기</button>' : ''}</div>`;
    $('#aikey', root).onchange = e => setAiKeys({ [p]: e.target.value.trim() });
    $('#aimodel', root).onchange = e => setAiKeys({ [p + 'Model']: e.target.value.trim() });
    $('#aiclr', root) && ($('#aiclr', root).onclick = () => { setAiKeys({ [p]: '' }); drawAI(); toast('키를 지웠어요'); });
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
    const r = await callAI('Return ONLY JSON {"natural": "..."} — a natural English version of the Korean line.', 'Korean: 나 백현이 사랑해'); // 예시: I love Baekhyun.
    st2.textContent = r && !r.error && r.natural ? `연결됐어요 · “${r.natural}”` : `안 돼요 · ${AI_ERR[r?.error] || r?.error || '알 수 없는 오류'}${r?.status ? ` (${r.status})` : ''}`;
  };

  // ----- 통화 사진 관리 -----
  const drawPhotos = () => {
    const all = allPhotos(); const more = all.length > 8 && !photosOpen;
    $('#phg', root).innerHTML = `<label class="pg-add" aria-label="사진 추가">${ic('plus')}<span>사진 추가</span><input type="file" id="phadd" accept="image/*" class="hide"></label>` + (more ? all.slice(0, 6) : all).map(p => `<div class="pg" style="background-image:url('${p.src}');background-position:${((p.box[0] + p.box[2]) / 2 * 100).toFixed(0)}% ${((p.box[1] + p.box[3]) / 2 * 100).toFixed(0)}%">${p.mine ? '<i class="pg-mine">내 사진</i>' : ''}<button class="pg-del" data-del="${p.id}" aria-label="사진 삭제">${ic('x')}</button></div>`).join('')
      + (more ? `<button class="pg-more" id="phmore">+${all.length - 6}<small>전체 보기</small></button>` : photosOpen && all.length > 8 ? `<button class="pg-more" id="phless">${ic('x')}<small>닫기</small></button>` : '');
    $('#phmore', root) && ($('#phmore', root).onclick = () => { photosOpen = true; drawPhotos(); });
    $('#phless', root) && ($('#phless', root).onclick = () => { photosOpen = false; drawPhotos(); $('#phg', root).scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
    $('#phadd', root).onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) photoSheet(f, () => settings(root)); };
    $$('[data-del]', root).forEach(b => b.onclick = async () => { if (allPhotos().length <= 1) return toast('사진은 1장 이상 있어야 해요'); if (await confirmSheet('이 사진을 지울까요?', '삭제')) { await removePhoto(b.dataset.del); settings(root); } });
  };
  if (edit) {
  drawPhotos();
  }
  // 음성 인식 단어 (관리자) — 추가·수정·삭제
  const drawWords = () => {
    const box = $('#sttw', root); if (!box) return;
    const list = S.fixEntries(D.get().settings.sttFix);
    box.innerHTML = `${list.length ? `<div class="wlist">${list.map((e, i) => `<div class="wl-row"><div class="grow"><b class="en">${esc(e.word)}</b>${e.heard.length ? `<small class="en">${esc(e.heard.join(', '))}</small>` : ''}</div><button class="mini" data-we="${i}" aria-label="수정">${ic('edit')}</button><button class="mini" data-wd="${i}" aria-label="삭제">${ic('trash')}</button></div>`).join('')}</div>` : '<p class="small muted">등록한 단어가 없어요</p>'}
      <button class="btn sm soft block" id="wadd">${ic('plus')} 단어 추가</button>`;
    const save = l => { D.setSetting('sttFix', S.fixSerialize(l)); drawWords(); };
    const edit1 = i => {
      const e = i == null ? { word: '', heard: [] } : list[i];
      const sh = sheet(`<h3>${i == null ? '단어 추가' : '단어 수정'}</h3>
        <label class="field"><span>단어 (정확한 철자)</span><input class="input en" id="ww" value="${esc(e.word)}" placeholder="Baekhyun" autocapitalize="off" autocomplete="off" spellcheck="false"></label>
        <label class="field mt8"><span>자주 잘못 들리는 말 (선택 · 쉼표로 구분)</span><input class="input en" id="wh" value="${esc(e.heard.join(', '))}" placeholder="back hyun, bag hyun" autocapitalize="off" autocomplete="off" spellcheck="false"></label>
        <div class="stack mt12"><button class="btn block" id="wok">저장</button></div>`);
      $('#wok', sh).onclick = () => {
        const w = $('#ww', sh).value.trim(); if (!w) return toast('단어를 입력해주세요');
        if (/[=\n]/.test(w)) return toast('단어에 = 는 쓸 수 없어요');
        const n = { word: w, heard: $('#wh', sh).value.split(',').map(x => x.trim()).filter(x => x && !/[=]/.test(x)) };
        const l = [...list]; if (i == null) l.push(n); else l[i] = n; save(l); sh.close(); toast('저장했어요 · 모든 사용자에게 적용돼요');
      };
    };
    $('#wadd', box).onclick = () => edit1(null);
    $$('[data-we]', box).forEach(b => b.onclick = () => edit1(+b.dataset.we));
    $$('[data-wd]', box).forEach(b => b.onclick = async () => { const i = +b.dataset.wd; if (await confirmSheet(`‘${list[i].word}’를 지울까요?`, '삭제')) save(list.filter((_, k) => k !== i)); });
  };
  drawWords();

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
    try { const d = JSON.parse(txt); if (!Array.isArray(d.saved) && !Array.isArray(d.videos)) throw 0; info = (edit ? `영상 ${(d.videos || []).length} · 문장 ${(d.utts || []).length} · ` : '') + `SAVED ${(d.saved || []).length} · 단어 ${(d.words || []).length}`; }
    catch { toast('BAEK TO YOU 백업 파일이 아니에요'); return; }
    const s = sheet(`<h3>백업 복원</h3><p class="sheet-p">${esc(info)}<br>복원 전 현재 상태를 자동으로 저장해 두니, 잘못되면 ‘직전 상태로 되돌리기’로 돌아올 수 있어요.</p>
      <div class="stack"><button class="btn block" data-m="merge">기존 데이터에 합치기 (추천)</button><button class="btn block soft" data-m="replace">전체 바꾸기</button></div>`);
    $$('[data-m]', s).forEach(b => b.onclick = () => { try { D.importJSON(txt, b.dataset.m); toast('복원 완료'); s.close(); settings(root); } catch (err) { toast(err.message); } });
  };
  $('#undo', root) && ($('#undo', root).onclick = async () => {
    if (!await confirmSheet('직전 상태로 되돌릴까요?', '되돌리기', `${esc(snap.reason)} 직전의 데이터로 돌아가요. 그 이후 바뀐 내용은 사라져요.`)) return;
    try { D.restoreSnapshot(); toast('되돌렸어요'); settings(root); } catch (e) { toast(e.message); }
  });
  $('#rst', root).onclick = async () => { if (await confirmSheet('내 학습 데이터를 초기화할까요?', '초기화', 'SAVED·단어·진도·통화 기록이 지워져요 (로그인 중이면 클라우드에서도). 직전 상태 1개는 자동 보관돼요.')) { D.resetAll(); toast('초기화했어요'); settings(root); } };
  $('#upd', root).onclick = async () => { const b = $('#upd', root); b.disabled = true; const r = await checkUpdate(true); b.disabled = false; toast(r); };
  return unsub;
}

// ---------- 기기 연동 (Google 로그인 + 자동 동기화) ----------
function ago(t) { if (!t) return ''; const s = (Date.now() - t) / 1000; if (s < 60) return '방금 전'; if (s < 3600) return `${Math.floor(s / 60)}분 전`; if (s < 86400) return `${Math.floor(s / 3600)}시간 전`; return new Date(t).toLocaleDateString('ko-KR'); }
const GLOGO = '<svg viewBox="0 0 24 24" aria-hidden="true" style="stroke:none"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z"/></svg>';
const STATE_TXT = { loading: ['준비 중…', 'mid'], syncing: ['동기화 중…', 'mid'], pending: ['변경 사항 저장 대기', 'mid'], synced: ['동기화됨', 'ok'], offline: ['오프라인', 'warn'], error: ['오류', 'bad'] };
function mountSync(el) {
  let tick = null;
  const head = (right, title = '계정') => `<div class="sync-row"><span class="sync-ic">${ic('user')}</span><b class="grow clamp1">${title}</b>${right}</div>`;
  const err = e => toast(Y.authErrorText(e));
  const render = st => {
    if (!el.isConnected) { unsub(); clearInterval(tick); return; }
    if (!st.configured) {
      el.innerHTML = head('<span class="chip">이 기기만</span>') + `<p class="tiny muted sync-p">Firebase 설정 전이라 이 기기에만 저장돼요 · FIREBASE_SETUP.md</p>`;
      return;
    }
    if (!st.user) {
      const busy = st.state === 'loading';
      el.innerHTML = head('<span class="chip">로그인 전</span>')
        + (st.state === 'error' ? `<div class="note warn">${esc(st.detail)}</div>` : '')
        + `<form class="acct-form" id="af" autocomplete="on">
          <input class="input" id="em" type="email" autocomplete="username" inputmode="email" placeholder="이메일" autocapitalize="off" spellcheck="false">
          <input class="input" id="pw" type="password" autocomplete="current-password" placeholder="비밀번호 (6자 이상)">
          <div class="acct-btns"><button class="btn sm" id="el" type="submit" ${busy ? 'disabled' : ''}>로그인</button><button class="btn sm soft" id="su" type="button" ${busy ? 'disabled' : ''}>회원가입</button></div>
          <button class="link-btn tiny" id="rp" type="button">비밀번호를 잊었어요</button>
        </form>
        <div class="or"><span>또는</span></div>
        <button class="btn sm line block g-btn" id="g" ${busy ? 'disabled' : ''}>${GLOGO} Google로 계속하기</button>
        <p class="tiny muted sync-p">로그인하면 내 학습 기록이 계정에 저장돼요. 영상과 문장은 모든 사용자가 같이 봐요.</p>`;
      const em = () => $('#em', el).value.trim(), pw = () => $('#pw', el).value;
      $('#g', el).onclick = () => Y.loginGoogle().then(() => toast('로그인했어요')).catch(err);
      $('#af', el).onsubmit = e => { e.preventDefault(); if (!em() || !pw()) return toast('이메일과 비밀번호를 입력해주세요'); Y.loginEmail(em(), pw()).then(() => toast('로그인했어요')).catch(err); };
      $('#su', el).onclick = () => {
        if (!em()) return toast('이메일을 입력해주세요'); if (pw().length < 6) return toast('비밀번호는 6자 이상으로 해주세요');
        Y.signup(em(), pw()).then(() => toast('가입했어요 · 확인 메일을 보냈어요')).catch(err);
      };
      $('#rp', el).onclick = () => { if (!em()) return toast('위에 이메일을 먼저 입력해주세요'); Y.resetPassword(em()).then(() => toast('재설정 메일을 보냈어요 · 메일함(스팸함)을 확인해주세요')).catch(err); };
      return;
    }
    const [txt, tone] = STATE_TXT[st.state] || ['', 'mid'];
    const u = st.user; const hasPw = u.providers.includes('password');
    el.innerHTML = head(`<span class="chip ${st.admin ? 'pink' : ''}">${st.admin ? '관리자' : '학습자'}</span>`, esc(u.email || u.name || '내 계정'))
      + `<div class="sync-row sub"><span class="sync-st ${tone}"><i></i>${txt}${st.state === 'synced' && st.lastSyncAt ? ` · ${ago(st.lastSyncAt)}` : ''}</span></div>`
      + (st.detail && (st.state === 'error' || st.state === 'offline') ? `<div class="note ${st.state === 'error' ? 'warn' : ''}">${esc(st.detail)}</div>` : '')
      + (hasPw && u.verified === false ? `<p class="tiny muted sync-p">이메일 인증 메일을 보냈어요 · 인증하지 않아도 앱은 쓸 수 있어요</p>` : '')
      + `<details class="adv"><summary>계정 관리</summary>
        <div class="row"><button class="btn sm soft grow" id="sn">${ic('refresh')} 지금 동기화</button><button class="btn sm line" id="lo">로그아웃</button></div>
        ${hasPw ? `<button class="btn sm soft block mt8" id="rp2">비밀번호 재설정 메일 받기</button>` : `<p class="tiny muted mt12">홈 화면 앱에서 Google 창이 안 열리면, 이메일 로그인을 추가해 두세요.</p>
        <input class="input" id="lem" type="email" autocomplete="username" placeholder="이메일" autocapitalize="off" value="${esc(u.email || '')}">
        <input class="input mt8" id="lpw" type="password" autocomplete="new-password" placeholder="새 비밀번호 (6자 이상)">
        <button class="btn sm block mt8" id="lk">이메일 로그인 추가</button>`}
        <div class="danger-zone">
          <button class="btn sm line block" id="dmd">내 학습 데이터 삭제</button>
          <button class="btn sm line block danger-t" id="dac">계정 삭제</button>
        </div></details>`;
    $('#sn', el).onclick = () => { Y.syncNow(); };
    $('#lo', el).onclick = async () => { if (await confirmSheet('로그아웃할까요?', '로그아웃', '내 기록은 계정에 저장돼 있어요. 다시 로그인하면 그대로 이어져요.')) { await Y.logout(); toast('로그아웃했어요'); } };
    $('#rp2', el) && ($('#rp2', el).onclick = () => Y.resetPassword(u.email).then(() => toast('재설정 메일을 보냈어요')).catch(err));
    $('#lk', el) && ($('#lk', el).onclick = () => { const em = $('#lem', el).value, pw = $('#lpw', el).value; if (!em || pw.length < 6) return toast('이메일과 6자 이상 비밀번호를 입력해주세요'); Y.linkEmail(em, pw).then(() => toast('이메일 로그인을 추가했어요')).catch(err); });
    $('#dmd', el).onclick = async () => {
      if (!await confirmSheet('내 학습 데이터를 모두 지울까요?', '삭제', 'SAVED·단어·진도·통화 기록이 이 기기와 클라우드에서 지워져요. 되돌릴 수 없어요. 영상과 문장은 그대로예요.')) return;
      try { await Y.deleteMyData(); toast('내 학습 데이터를 지웠어요'); } catch (e) { err(e); }
    };
    $('#dac', el).onclick = () => deleteAccountSheet();
  };
  const unsub = Y.onStatus(render);
  render(Y.status());
  tick = setInterval(() => el.isConnected ? (Y.status().state === 'synced' && !el.querySelector('details[open]') && !el.contains(document.activeElement) && render(Y.status())) : clearInterval(tick), 30000);
  return () => { unsub(); clearInterval(tick); };
}
function deleteAccountSheet() {
  const pw = Y.needsPassword();
  const s = sheet(`<h3>계정을 삭제할까요?</h3><p class="sheet-p">계정과 내 학습 데이터(SAVED·단어·진도·기록)가 모두 지워지고 되돌릴 수 없어요. 필요하면 먼저 JSON 백업을 받아두세요.</p>
    ${pw ? `<input class="input" id="dpw" type="password" autocomplete="current-password" placeholder="비밀번호 확인">` : `<p class="tiny muted">확인을 위해 Google 로그인 창이 한 번 더 열릴 수 있어요.</p>`}
    <div class="stack mt12"><button class="btn block danger-bg" id="dgo">계정 삭제</button><button class="btn soft block" id="dno">취소</button></div>`);
  $('#dno', s).onclick = () => s.close();
  $('#dgo', s).onclick = async () => {
    const v = pw ? $('#dpw', s).value : '';
    if (pw && !v) return toast('비밀번호를 입력해주세요');
    $('#dgo', s).disabled = true;
    try { await Y.deleteAccount(v); s.close(); toast('계정을 삭제했어요'); }
    catch (e) { $('#dgo', s).disabled = false; toast(Y.authErrorText(e)); }
  };
}

// ---------- 내 프로필: 이름(백현이가 부르는 이름) · 사진 ----------
// 프로필: 사진을 누르면 사진 바꾸기 · 이름을 누르면 바로 고치기
function mountProfile(el) {
  const draw = () => {
    const p = D.profile();
    el.innerHTML = `<label class="prof-av" aria-label="프로필 사진 바꾸기">${p.photo ? `<img src="${p.photo}" alt="">` : `<span>${ic('heart')}</span>`}<i>${ic('edit')}</i><input type="file" accept="image/*" id="pfile" class="hide"></label>
      <div class="prof-txt"><span class="label">MY PROFILE</span>
        <button class="prof-name-btn" id="pnb">${p.name ? esc(p.name) : '<em>이름을 정해줘</em>'}${ic('edit')}</button>
        <small>백현이가 불러줄 이름</small></div>`;
    $('#pfile', el).onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { D.setProfile({ photo: await squareThumb(f, 240) }); draw(); toast('사진을 바꿨어요'); } catch { toast('사진을 불러오지 못했어요'); } };
    $('#pnb', el).onclick = () => {
      const b = $('#pnb', el);
      b.outerHTML = `<input class="prof-name-in" id="pni" value="${esc(p.name)}" placeholder="이름" maxlength="12" autocomplete="nickname" enterkeyhint="done">`;
      const inp = $('#pni', el); inp.focus(); inp.select();
      let done = false;
      const fin = () => { if (done) return; done = true; const n = inp.value.trim(); if (n !== p.name) { D.setProfile({ name: n }); toast(n ? `‘${D.callName()}’ 하고 불러줄게요` : '이름을 지웠어요'); } draw(); };
      inp.onblur = fin; inp.onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); inp.blur(); } if (e.key === 'Escape') { done = true; draw(); } };
    };
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
    ${all.length ? `<div class="list">${all.map(v => `<a class="li" href="#/settings/video/${v.id}"><div class="thumb" style="background-image:url('${vThumb(v)}')"></div><div class="grow"><b class="clamp2">${esc(v.title)}</b><small>${D.uttsOf(v.id).length}문장</small></div>${ic('next')}</a>`).join('')}</div>` : '<div class="note">영상이 없어요</div>'}
  </div>`;
}

// ---------- 영상 상세 / 문장 관리 ----------
export function videoEditor(root, vid) {
  const v = D.video(vid); if (!v) { location.hash = '#/settings'; return () => { }; }
  const us = D.uttsOf(vid);
  root.innerHTML = `<div class="screen">
    <header class="top"><a class="icon-btn" href="#/settings" aria-label="뒤로">${ic('back')}</a><h2>영상 관리</h2><a class="icon-btn" href="#/video/${v.id}" aria-label="학습하기">${ic('play')}</a></header>
    <div class="player" id="pl"></div>
    <div class="row title-row"><textarea class="input grow ttl-in" id="ttl" rows="1" aria-label="영상 제목 (Enter로 줄바꿈)">${esc(v.title)}</textarea></div>
    <section class="scene-card thumb-card" id="thc"></section>
    <section class="scene-card" id="scn"></section>
    <div class="row between sec-row"><span class="label">SENTENCES · ${us.length}</span></div>
    <div class="sent-actions">
      <button class="btn sm" id="rep-j">${ic('refresh')} JSON으로 교체</button>
      <button class="btn sm soft" id="cpj" ${us.length ? '' : 'disabled'}>${ic('copy')} JSON 전체 복사</button>
    </div>
    ${us.length ? `<div class="ulist" id="ul">${us.map(u => `<div class="uitem ued" data-ue="${u.id}"><span class="t">${D.fmt(u.start)}</span><div class="grow ue-body"><div class="ko">${esc(u.ko)}</div><div class="small muted en u-en">${esc(u.en.natural || u.en.easy || '— 영어 예시 없음')}</div></div></div>`).join('')}</div>`
      : `<div class="note">‘JSON으로 교체’에서 Claude용 프롬프트를 복사해 문장을 한 번에 넣어보세요.</div>`}
    <button class="btn line block danger-line" id="delv">${ic('trash')} 이 영상 삭제</button>
  </div>`;
  // 제목 자동: 비어 있거나 기본값이면 YouTube에서 가져와서 채움
  const autoTitle = t => { if (!t) return; const cur = D.video(vid); if (cur && (!cur.title || cur.title === 'YouTube 영상')) { D.updateVideo(vid, { title: t }); const i = $('#ttl', root); if (i) { i.value = t; i.oninput?.(); } } };
  const pl = new Player($('#pl', root), { onReady: () => autoTitle(pl.title()), onState: s => s === 'cued' && autoTitle(pl.title()) }); pl.cue(v.ytId);
  if (!v.title || v.title === 'YouTube 영상') fetchTitle(v.ytId).then(autoTitle);
  const reload = () => { pl.destroy(); videoEditor(root, vid); };
  // 문장: 누르면 그 자리에서 바로 수정 (시간·패턴 등은 ‘자세히’)
  $$('[data-ue]', root).forEach(row => row.onclick = e => {
    if (row.classList.contains('editing') || e.target.closest('button,textarea')) return;
    $$('.ued.editing', root).forEach(r => r.close?.());
    const u = D.utt(row.dataset.ue); if (!u) return;
    const body = $('.ue-body', row), old = body.innerHTML;
    row.classList.add('editing');
    body.innerHTML = `<textarea class="textarea ue-ko" rows="2" aria-label="한국어 발화">${esc(u.ko)}</textarea><textarea class="textarea en ue-en" rows="2" aria-label="영어 추천 문장">${esc(u.en.natural || u.en.easy || u.en.advanced || '')}</textarea>
      <div class="row gap6 ue-acts"><button class="btn xs" data-ua="save">저장</button><button class="btn xs soft" data-ua="play">${ic('play')} 듣기</button><button class="btn xs soft" data-ua="cancel">취소</button><a class="link-sm" href="#/settings/utt/${v.id}/${u.id}">자세히</a></div>`;
    $$('textarea', body).forEach(t => { const fit = () => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }; fit(); t.oninput = fit; });
    $('.ue-ko', body).focus();
    row.close = () => { row.classList.remove('editing'); body.innerHTML = old; row.close = null; };
    $('[data-ua="cancel"]', body).onclick = () => row.close();
    $('[data-ua="play"]', body).onclick = () => pl.playSegment(v.ytId, u.start, u.end);
    $('[data-ua="save"]', body).onclick = () => {
      const ko = $('.ue-ko', body).value.trim(), nat = $('.ue-en', body).value.trim();
      if (!ko || !nat) return toast('한국어와 영어를 모두 적어주세요');
      D.upsertUtt({ ...u, ko, en: { ...u.en, natural: nat } });
      row.classList.remove('editing'); row.close = null;
      body.innerHTML = `<div class="ko">${esc(ko)}</div><div class="small muted en u-en">${esc(nat)}</div>`; toast('저장했어요');
    };
  });
  // ----- 썸네일 (관리자만 · CHAT 목록·CALL 더보기·음성통화 프로필에 사용) -----
  const thc = $('#thc', root);
  const drawThumb = () => {
    const cur = D.video(vid);
    thc.innerHTML = `<span class="label">영상 썸네일</span>
      <div class="th-row mt8"><span class="th-img" style="background-image:url('${vThumb(cur)}')"></span><div class="grow"><b>${cur.thumb ? '직접 바꾼 썸네일' : 'YouTube 기본 썸네일'}</b><small>CHAT 목록 · CALL 더보기에 보여요</small></div></div>
      <div class="row gap6 mt8"><label class="btn sm soft">${ic('upload')} 이미지 바꾸기<input type="file" id="thf" accept="image/*" class="hide"></label>${cur.thumb ? `<button class="btn sm soft" id="thr">${ic('refresh')} 기본으로</button>` : ''}</div>`;
    $('#thf', thc).onchange = async e => {
      const file = e.target.files?.[0]; if (!file) return;
      try { D.updateVideo(vid, { thumb: await shrinkImage(file, 480) }); toast('썸네일을 바꿨어요'); } catch { toast('이미지를 읽지 못했어요'); }
      drawThumb();
    };
    $('#thr', thc) && ($('#thr', thc).onclick = () => { D.updateVideo(vid, { thumb: '' }); toast('YouTube 기본 썸네일로 돌렸어요'); drawThumb(); });
  };
  drawThumb();
  // ----- TALK 통화 설정: 장면 분석 · 메모 · 사진 -----
  const scn = $('#scn', root);
  const drawScene = () => {
    const cur = D.video(vid); const sel = cur.sit || []; const live = isLive(cur);
    const times = sel.filter(k => TIMES_SEL.some(([t]) => t === k)), autoT = timeOfScene(sceneOf({ ...cur, sit: [] }));
    const auto = topTags(sceneOf({ ...cur, sit: [] }), 8).filter(t => situations().some(([k]) => k === t) || TIMES_SEL.some(([k]) => k === t));
    const ap = pickPhoto({ ...cur, photo: '' });
    const shown = sel.length ? sel : auto;
    scn.innerHTML = `<span class="label">영상 종류</span>
      <div class="seg kind-seg mt8">${[['live', '라이브 · CALL'], ['video', '일반 영상 · CHAT']].map(([k, l]) => `<button data-kind="${k}" class="${(live ? 'live' : 'video') === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      ${live ? `<div class="scene-sec"><span class="label">통화 방식</span>
        <label class="switch mt8"><span><b>음성통화</b></span><input type="checkbox" id="vvoice" ${cur.voice ? 'checked' : ''}><i></i></label></div>
      <div class="scene-sec"><span class="label">통화 설명 (더보기에 보이는 한 줄)</span><input class="input mt8" id="vdesc" value="${esc(cur.desc || '')}" placeholder="${esc(conceptOf(cur))}" maxlength="40"></div>
      <div class="scene-sec"><span class="label">시간대</span>
        <div class="sit-row wrap mt8">${TIMES_SEL.map(([k, l]) => `<button class="sit ${times.includes(k) ? 'on' : !times.length && autoT === k ? 'auto' : ''}" data-tm="${k}">${esc(l)}</button>`).join('')}</div>
        <p class="tiny muted mt8">${times.length ? '고른 시간대에 전화하면 이 영상이 먼저 나와요' : autoT ? '점선은 대본으로 추정한 시간대예요 · 눌러서 정해주세요' : '정하지 않으면 아무 시간대에나 나와요'}</p></div>
      <div class="scene-sec"><span class="label">전화 올 때 사진</span>
        ${(() => { const p = cur.photo && allPhotos().find(x => x.id === cur.photo) || ap.p; return `<div class="ph-cur mt8"><span class="ph-th" style="${thumbStyle(p)}"></span><div class="grow"><b>${cur.photo ? '직접 고른 사진' : '자동'}</b><small>${cur.photo ? '이 사진으로 전화가 와요' : '상황과 가장 비슷한 사진'}</small></div><button class="btn sm soft" id="phchg">바꾸기</button></div>`; })()}</div>` : '<p class="tiny muted mt12">일반 영상은 CHAT에만 보여요.</p>'}`;
    $$('[data-kind]', scn).forEach(b => b.onclick = () => { D.updateVideo(vid, { kind: b.dataset.kind }); drawScene(); });
    $('#vvoice', scn) && ($('#vvoice', scn).onchange = e => { D.updateVideo(vid, { voice: e.target.checked }); toast(e.target.checked ? '음성통화에도 나와요' : '영상통화에서만 나와요'); });
    $('#vdesc', scn) && ($('#vdesc', scn).onchange = e => D.updateVideo(vid, { desc: e.target.value.trim() }));
    // 시간대만 (상황은 고르지 않음): 눌러서 켜고 끄기
    $$('[data-tm]', scn).forEach(b => b.onclick = () => { const now = new Set(D.video(vid).sit || []); now.has(b.dataset.tm) ? now.delete(b.dataset.tm) : now.add(b.dataset.tm); D.updateVideo(vid, { sit: [...now].filter(k => TIMES_SEL.some(([t]) => t === k)) }); drawScene(); });
    $('#phchg', scn) && ($('#phchg', scn).onclick = () => {
      const cur2 = D.video(vid);
      const sh = sheet(`<h3>전화 올 때 사진</h3><div class="photo-grid four"><button class="pg-auto ${cur2.photo ? '' : 'on'}" data-ph="">자동</button>${allPhotos().map(p => `<button class="pg ${cur2.photo === p.id ? 'on' : ''}" data-ph="${p.id}" style="${thumbStyle(p)}" aria-label="사진"></button>`).join('')}</div>`);
      $$('[data-ph]', sh).forEach(b => b.onclick = () => { D.updateVideo(vid, { photo: b.dataset.ph }); sh.close(); drawScene(); });
    });
  };
  drawScene();
  // 제목: Enter = 줄바꿈 (CHAT에서도 그대로 보임) · 바깥을 누르면 저장
  const ttl = $('#ttl', root); const fitT = () => { ttl.style.height = 'auto'; ttl.style.height = ttl.scrollHeight + 'px'; }; fitT();
  ttl.oninput = fitT;
  ttl.onchange = e => D.updateVideo(v.id, { title: e.target.value.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() || v.title });
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

// ---------- 개인정보 처리방침 · 저작권 안내 ----------
export function privacy(root) {
  root.innerHTML = `<div class="screen doc-page">
    <header class="top"><a class="icon-btn" href="#/settings" aria-label="뒤로">${ic('back')}</a><h2>개인정보 · 저작권</h2><span class="icon-btn ghost"></span></header>
    <section class="card stack doc">
      <h3>개인정보 처리방침</h3>
      <p class="small">BAEK TO YOU는 개인이 운영하는 비공식 영어 학습 앱이에요. 서비스에 꼭 필요한 정보만 처리해요.</p>
      <h4>모으는 정보</h4>
      <ul class="small bullets">
        <li><b>계정</b>: 이메일 주소(또는 Google 계정의 이메일·이름·프로필 사진), Firebase가 만드는 사용자 ID</li>
        <li><b>학습 데이터</b>: 저장한 표현·단어, 학습 진도, 통화 기록, 내가 입력하거나 말한 영어 문장, 프로필 이름·사진</li>
      </ul>
      <h4>저장 위치와 기간</h4>
      <ul class="small bullets">
        <li>학습 데이터는 이 기기 브라우저와 Google Firebase(Firestore, 서울 리전)에 계정별로 저장되고, 본인만 읽고 쓸 수 있어요.</li>
        <li>녹음 파일과 AI API 키는 이 기기에만 저장되고 서버로 보내지 않아요.</li>
        <li>계정을 삭제하면 계정과 학습 데이터가 바로 지워져요.</li>
      </ul>
      <h4>외부 서비스</h4>
      <ul class="small bullets">
        <li><b>음성 인식</b>: 브라우저·기기의 음성 인식 기능을 써요 (iPhone은 Apple, Chrome은 Google이 처리할 수 있어요).</li>
        <li><b>AI 피드백</b>: 직접 넣은 API 키로 Google Gemini 또는 OpenAI에 내가 말한 영어와 문장 내용을 보내요. 각 회사의 정책이 적용돼요.</li>
        <li><b>YouTube</b>: 영상은 YouTube 공식 플레이어로 재생되고 YouTube의 개인정보 처리방침이 적용돼요.</li>
      </ul>
      <h4>내 권리</h4>
      <p class="small">SETTINGS › 계정 관리에서 언제든 <b>내 학습 데이터 삭제</b>, <b>계정 삭제</b>를 할 수 있고, DATA › JSON 백업으로 내 데이터를 받을 수 있어요. 그 밖의 요청은 앱을 공유한 관리자에게 연락해주세요.</p>
    </section>
    <section class="card stack doc mt12">
      <h3>저작권 안내</h3>
      <ul class="small bullets">
        <li>이 앱은 아티스트·소속사와 관계없는 비공식 팬메이드 학습 도구예요.</li>
        <li>영상은 YouTube 공식 임베드 플레이어로만 재생하고, 영상 파일을 복사하거나 저장하지 않아요. 영상의 권리는 각 원저작자에게 있어요.</li>
        <li>통화 사진·대사 자막의 권리도 각 원저작자에게 있어요. 권리자의 요청이 있으면 바로 내려요.</li>
        <li>앱 안의 영어 예문·번역·발음 음성(기기 음성 합성)은 학습용으로 만든 것이고, 아티스트 본인의 목소리가 아니에요.</li>
      </ul>
    </section>
  </div>`;
}
