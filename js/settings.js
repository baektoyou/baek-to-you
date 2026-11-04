// SETTINGS — 영상 라이브러리 · 발화 등록 · 음성 · 데이터 백업
import * as D from './store.js';
import * as S from './speech.js';
import { parseYouTubeId, fetchTitle, thumb, Player } from './yt.js';
import { esc, $, $$, ic, toast, sheet, confirmSheet } from './ui.js';
import { TOPICS, TYPES, EMOTIONS } from './talk-engine.js';

export function settings(root) {
  const db = D.get();
  root.innerHTML = `<div class="screen">
    <div class="top"><h1 class="page-title">Settings</h1></div>
    <div class="card pink add-card">
      <span class="label">ADD VIDEO</span>
      <div class="url-row"><input class="input" id="url" type="url" placeholder="YouTube 링크 붙여넣기" autocomplete="off" autocapitalize="off" spellcheck="false">
        <button class="icon-btn" id="paste" aria-label="붙여넣기">${ic('paste')}</button><button class="btn" id="add" aria-label="추가">${ic('plus')}</button></div>
    </div>

    <div class="sec-title label">VIDEOS · ${db.videos.length}</div>
    ${db.videos.length ? `<div class="list">${db.videos.map(v => `<a class="li" href="#/settings/video/${v.id}"><div class="thumb" style="background-image:url('${thumb(v.ytId)}')"></div><div class="grow"><b class="clamp2">${esc(v.title)}</b><small>${D.uttsOf(v.id).length}문장</small></div>${ic('next')}</a>`).join('')}</div>` : `<div class="note">위에 YouTube 링크를 붙여넣어 영상을 추가해보세요.</div>`}

    <div class="sec-title label">VOICE</div>
    <div class="card stack">
      <select class="input" id="voice" aria-label="영어 음성"></select>
      <div class="row"><span class="small grow">속도 <b id="rv" class="en">${db.settings.rate}</b>x</span><input type="range" id="rate" min="0.6" max="1.2" step="0.05" value="${db.settings.rate}" class="grow"></div>
      <button class="btn soft block" id="vt">${ic('speaker')} 음성 테스트</button>
    </div>

    <div class="sec-title label">SPEECH RECOGNITION</div>
    <div class="card stack">
      <button class="btn soft block" id="mt">${ic('mic')} 인식 테스트</button><div id="mres" class="small muted hide"></div>
      <label class="field" style="margin:0"><span>인식 보정 단어 · 한 줄에 하나 <span class="en">들린 말 = 원래 단어</span></span>
        <textarea class="textarea en" id="fix" rows="3" placeholder="mongrel young = Mongryong&#10;tuck bokki = tteokbokki">${esc(db.settings.sttFix || '')}</textarea></label>
      <div class="tiny muted">자주 잘못 인식되는 이름·신조어를 등록하면 자동으로 고쳐줘요. 비교할 때도 비슷한 발음은 맞은 걸로 쳐요.</div>
    </div>

    <div class="sec-title label">DATA</div>
    <div class="list">
      <button class="li" id="exp"><div class="ic">${ic('download')}</div><div class="grow"><b>JSON 백업</b><small>녹음 파일 제외</small></div></button>
      <label class="li" style="cursor:pointer"><div class="ic">${ic('upload')}</div><div class="grow"><b>JSON 복원</b></div><input type="file" id="imp" accept="application/json,.json" class="hide"></label>
      <button class="li" id="rst"><div class="ic danger">${ic('trash')}</div><div class="grow"><b>모든 데이터 초기화</b></div></button>
    </div>

    <details class="adv help"><summary>이 기기 · 도움말</summary>
      <div class="small" style="line-height:2;margin-top:6px">
        ${row(S.support.stt, '음성 인식', 'iPhone은 Siri/받아쓰기 켜기 필요')}
        ${row(S.support.tts, '영어 음성', `${S.enVoices().length}개`)}
        ${row(S.support.rec, '녹음', '쉐도잉')}
        ${row(S.support.standalone, '홈 화면 앱', S.support.standalone ? 'PWA 모드' : '공유 › 홈 화면에 추가')}
      </div>
      <div class="note" style="line-height:1.7;margin-top:8px">
        • 발음·억양 점수는 전용 음성 평가 엔진(유료)이 필요해서 제공하지 않아요. 대신 단어 비교·길이·끊김·번갈아 듣기를 써요.<br>
        • 영어 예시 음성은 기기 내장 TTS예요. 백현이 목소리 합성은 하지 않아요.<br>
        • iPhone Safari는 기본 음성만 웹에 열어줘서 Siri·고품질 음성은 목록에 안 나와요.<br>
        • 데이터는 이 기기 브라우저에만 저장돼요. 주기적으로 백업하세요.
      </div>
    </details>
    <p class="tiny muted" style="text-align:center;margin-top:20px">baek to you · personal fan-made study app · 영상 저작권은 원저작자에게 있어요</p>
  </div>`;
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
  // 붙여넣으면 바로 추가
  urlIn.addEventListener('paste', () => setTimeout(() => { if (parseYouTubeId(urlIn.value)) add(); }, 0));
  $('#paste', root).onclick = async () => {
    try { const t = await navigator.clipboard.readText(); urlIn.value = t.trim(); if (parseYouTubeId(urlIn.value)) add(); else toast('클립보드에 YouTube 링크가 없어요'); }
    catch { urlIn.focus(); toast('입력칸을 길게 눌러 붙여넣어 주세요'); }
  };

  const vsel = $('#voice', root);
  const fillVoices = () => { const vs = S.enVoices(); vsel.innerHTML = vs.length ? vs.map(v => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === db.settings.voiceURI ? 'selected' : ''}>${esc(v.name)} · ${esc(v.lang)}</option>`).join('') : '<option>영어 음성을 찾지 못했어요</option>'; };
  fillVoices(); setTimeout(fillVoices, 800);
  vsel.onchange = () => D.setSetting('voiceURI', vsel.value);
  $('#rate', root).oninput = e => { $('#rv', root).textContent = e.target.value; D.setSetting('rate', +e.target.value); };
  $('#vt', root).onclick = () => S.speak("Hi, I'm so happy to talk with you today. How was your day?");
  $('#fix', root).onchange = e => { D.setSetting('sttFix', e.target.value); toast('보정 단어를 저장했어요'); };
  $('#mt', root).onclick = async () => {
    const r = $('#mres', root), b = $('#mt', root); r.classList.remove('hide');
    r.textContent = '말해보세요… (예: Nice to meet you, Baekhyun)'; b.disabled = true;
    const c = S.capture({ stt: true, silenceMs: 1500 }); const res = await c.result; b.disabled = false;
    r.innerHTML = res.text ? `인식됨: <b class="en" style="color:var(--ink)">${esc(res.text)}</b>` : `${esc(S.sttErrorText(res.sttError) || '인식된 말이 없어요')}`;
  };
  $('#exp', root).onclick = async () => {
    const json = D.exportJSON(); const name = `baek-to-you-backup-${D.today()}.json`;
    const file = new File([json], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    toast('백업 파일을 저장했어요');
  };
  $('#imp', root).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    const txt = await f.text();
    const s = sheet(`<h3>백업 복원</h3><div class="stack"><button class="btn block" data-m="merge">기존 데이터에 합치기</button><button class="btn block soft" data-m="replace">전체 바꾸기</button></div>`);
    $$('[data-m]', s).forEach(b => b.onclick = () => { try { D.importJSON(txt, b.dataset.m); toast('복원 완료'); s.close(); settings(root); } catch (err) { toast(err.message); } });
    e.target.value = '';
  };
  $('#rst', root).onclick = async () => { if (await confirmSheet('정말 모든 데이터를 지울까요?', '모두 삭제')) { D.resetAll(); toast('초기화했어요'); settings(root); } };
}

// ---------- 영상 상세 / 발화 관리 ----------
export function videoEditor(root, vid) {
  const v = D.video(vid); if (!v) { location.hash = '#/settings'; return () => { }; }
  const us = D.uttsOf(vid);
  root.innerHTML = `<div class="screen">
    <div class="top"><a class="icon-btn" href="#/settings">${ic('back')}</a><h2>영상 관리</h2><a class="icon-btn" href="#/video/${v.id}" aria-label="학습하기">${ic('play')}</a></div>
    <div class="player" id="pl"></div>
    <div class="row" style="margin:12px 0 4px"><input class="input grow" id="ttl" value="${esc(v.title)}" aria-label="영상 제목"><button class="btn sm soft" id="ttl-auto">제목 자동</button></div>
    <div class="row sec-row"><span class="label grow">SENTENCES · ${us.length}</span><button class="btn sm" id="bulk">${ic('plus')} JSON으로 추가</button></div>
    ${us.length ? `<div class="ulist">${us.map(u => `<div class="uitem"><span class="t">${D.fmt(u.start)}</span><div class="grow"><div class="ko">${esc(u.ko)}</div><div class="small muted en" style="margin-top:3px">${esc(u.en.natural || u.en.easy || '— 영어 예시 없음')}</div></div>
      <div class="ued-btns"><a class="mini" href="#/settings/utt/${v.id}/${u.id}" aria-label="편집">${ic('edit')}</a><button class="mini" data-del="${u.id}" aria-label="삭제">${ic('trash')}</button></div></div>`).join('')}</div>`
      : `<div class="note">'JSON으로 추가'에서 Claude용 프롬프트를 복사해 문장을 한 번에 만들어보세요.</div>`}
    <button class="btn line block danger-line" id="delv" style="margin-top:28px">${ic('trash')} 이 영상 삭제</button>
  </div>`;
  const pl = new Player($('#pl', root)); pl.cue(v.ytId);
  $('#ttl', root).onchange = e => D.updateVideo(v.id, { title: e.target.value.trim() || v.title });
  $('#ttl-auto', root).onclick = async () => { const t = pl.title() || await fetchTitle(v.ytId); if (t) { $('#ttl', root).value = t; D.updateVideo(v.id, { title: t }); toast('제목을 불러왔어요'); } else toast('영상을 한 번 재생한 뒤 다시 눌러주세요'); };
  $$('[data-del]', root).forEach(b => b.onclick = async () => { if (await confirmSheet('이 문장을 삭제할까요?')) { D.deleteUtt(b.dataset.del); pl.destroy(); videoEditor(root, vid); toast('삭제했어요'); } });
  $('#delv', root).onclick = async () => { if (await confirmSheet('영상과 등록된 문장을 모두 삭제할까요?')) { pl.destroy(); D.deleteVideo(v.id); toast('영상을 삭제했어요'); location.hash = '#/settings'; } };
  $('#bulk', root).onclick = () => bulkSheet(v, () => { pl.destroy(); videoEditor(root, vid); });
  return () => pl.destroy();
}

const PROMPT = v => `아래 YouTube 영상(${v.title} / https://youtu.be/${v.ytId})에서 백현이 실제로 말한 한국어 발화를 내가 적어줄게. 각 발화를 BAEK TO YOU 앱용 JSON 배열로 만들어줘. 백현이가 하지 않은 말을 지어내지 말고, 내가 준 발화와 시간만 사용해줘.
형식:
[{"start":"0:12","end":"0:17","ko":"한국어 원문","easy":"쉬운 영어","natural":"원어민이 실제 쓰는 자연스러운 영어","advanced":"조금 더 고급 표현","pattern":"핵심 패턴 (예: I've been ~ing)","topics":["food"],"emotion":"happy","type":"question","keywords":["eat","dinner"],"hint":"대답 힌트 (영어 2~5단어)","replies":["이 말에 팬이 할 법한 자연스러운 영어 대답 1","대답 2"]}]
topics는 ${Object.keys(TOPICS).join(', ')} 중에서, type은 ${TYPES.join(', ')} 중에서, emotion은 ${EMOTIONS.join(', ')} 중에서 골라줘.

내 발화 목록:
0:00-0:05 (여기에 한국어 발화)`;

function bulkSheet(v, done) {
  const s = sheet(`<h3>JSON 일괄 추가</h3>
    <p class="small muted" style="margin-top:-6px">프롬프트 복사 → Claude에 붙여넣기 → 받은 JSON을 아래에</p>
    <button class="btn sm soft" id="cp">${ic('link')} Claude용 프롬프트 복사</button>
    <textarea class="textarea" id="js" style="min-height:180px;margin-top:10px;font-family:ui-monospace,monospace;font-size:12px" placeholder='[{"start":"0:12","end":"0:17","ko":"...","natural":"..."}]'></textarea>
    <button class="btn block" id="go" style="margin-top:10px">추가하기</button>`);
  $('#cp', s).onclick = async () => { try { await navigator.clipboard.writeText(PROMPT(v)); toast('프롬프트를 복사했어요'); } catch { $('#js', s).value = PROMPT(v); toast('복사가 막혀서 입력칸에 넣었어요'); } };
  $('#go', s).onclick = () => {
    try {
      let txt = $('#js', s).value.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
      const n = D.bulkUtts(v.id, JSON.parse(txt)); toast(`${n}개 문장을 추가했어요 ✦`); s.close(); done();
    } catch (e) { toast('JSON 형식 오류: ' + e.message.slice(0, 40)); }
  };
}

// ---------- 발화 편집 ----------
export function uttEditor(root, vid, uttId) {
  const v = D.video(vid); if (!v) { location.hash = '#/settings'; return () => { }; }
  const isNew = false; // 문장 직접 추가는 제거됨 — 편집만
  const u = D.utt(uttId);
  if (!u) { location.hash = `#/settings/video/${vid}`; return () => { }; }
  const tagSet = new Set(u.topics);
  root.innerHTML = `<div class="screen">
    <div class="top"><a class="icon-btn" href="#/settings/video/${vid}">${ic('back')}</a><h2>문장 편집</h2><button class="btn sm" id="sv">저장</button></div>
    <div class="player" id="pl"></div>
    <div class="two" style="margin-top:12px">
      <div class="field"><span>시작</span><div class="timepick"><input class="input" id="st" value="${fmtD(u.start)}" inputmode="numeric"><button class="btn xs soft" data-now="st">지금</button></div></div>
      <div class="field"><span>끝</span><div class="timepick"><input class="input" id="en" value="${fmtD(u.end)}" inputmode="numeric"><button class="btn xs soft" data-now="en">지금</button></div></div>
    </div>
    <div class="row" style="margin:-4px 0 14px"><button class="btn sm pink grow" id="prev">${ic('play')} 구간 미리 듣기</button><button class="btn sm soft" data-nudge="-0.5">−0.5s</button><button class="btn sm soft" data-nudge="0.5">+0.5s</button></div>
    <label class="field"><span>백현이 한국어 발화 (실제로 말한 그대로) *</span><textarea class="textarea" id="ko">${esc(u.ko)}</textarea></label>
    <label class="field"><span>Natural · 자연스러운 영어 *</span><textarea class="textarea en" id="nat">${esc(u.en.natural)}</textarea></label>
    <div class="two"><label class="field"><span>Easy</span><textarea class="textarea en" id="easy">${esc(u.en.easy)}</textarea></label><label class="field"><span>Advanced</span><textarea class="textarea en" id="adv">${esc(u.en.advanced)}</textarea></label></div>
    <label class="field"><span>핵심 패턴 (예: I've been ~ing)</span><input class="input en" id="pat" value="${esc(u.pattern)}"></label>
    <div class="field"><span>주제 태그 (TALK 연결에 사용)</span><div class="tagpick" id="tags">${Object.keys(TOPICS).map(t => `<button data-t="${t}" class="${tagSet.has(t) ? 'on' : ''}">#${t}</button>`).join('')}</div></div>
    <div class="two"><label class="field"><span>대화 유형</span><select class="input" id="type">${TYPES.map(t => `<option ${u.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="field"><span>감정</span><select class="input" id="emo"><option value="">—</option>${EMOTIONS.map(t => `<option ${u.emotion === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
    <details class="adv" ${u.keywords.length || u.replies.length || u.hint || u.alts.length ? 'open' : ''}><summary>TALK · 고급 설정</summary>
      <label class="field"><span>영어 키워드 (쉼표로 구분 · 사용자 답변과 매칭)</span><input class="input en" id="kw" value="${esc(u.keywords.join(', '))}" placeholder="dinner, hungry, chicken"></label>
      <label class="field"><span>대답 힌트 (Need a hint?)</span><input class="input en" id="hint" value="${esc(u.hint)}" placeholder="I had … for dinner"></label>
      <label class="field"><span>답변 예시 (한 줄에 하나 · Say it better에서 비교)</span><textarea class="textarea en" id="reps">${esc(u.replies.join('\n'))}</textarea></label>
      <label class="field"><span>다른 정답 표현 (한 줄에 하나)</span><textarea class="textarea en" id="alts">${esc(u.alts.join('\n'))}</textarea></label>
    </details>
    ${!isNew ? `<button class="btn line block" id="del" style="margin-top:14px;color:var(--miss)">${ic('trash')} 문장 삭제</button>` : ''}
    <button class="btn block" id="sv2" style="margin-top:10px">저장</button>
  </div>`;
  const pl = new Player($('#pl', root)); pl.cue(v.ytId, u.start);
  const T = id => D.parseTime($('#' + id, root).value);
  $$('[data-now]', root).forEach(b => b.onclick = () => { const t = Math.round(pl.time() * 10) / 10; $('#' + b.dataset.now, root).value = fmtD(t); });
  $$('[data-nudge]', root).forEach(b => b.onclick = () => { const t = Math.max(0, T('en') + +b.dataset.nudge); $('#en', root).value = fmtD(t); });
  $('#prev', root).onclick = () => { const s = T('st'), e = T('en'); if (e <= s) return toast('끝 시간이 시작보다 커야 해요'); pl.playSegment(v.ytId, s, e); };
  $$('#tags button', root).forEach(b => b.onclick = () => { b.classList.toggle('on'); tagSet.has(b.dataset.t) ? tagSet.delete(b.dataset.t) : tagSet.add(b.dataset.t); });
  const lines = id => $('#' + id, root).value.split('\n').map(s => s.trim()).filter(Boolean);
  const doSave = () => {
    const ko = $('#ko', root).value.trim(), nat = $('#nat', root).value.trim();
    const s = T('st'), e = T('en');
    if (!ko) return toast('한국어 발화를 입력해주세요');
    if (e <= s) return toast('끝 시간이 시작보다 커야 해요');
    D.upsertUtt({
      ...u, start: s, end: e, ko, en: { natural: nat, easy: $('#easy', root).value.trim(), advanced: $('#adv', root).value.trim() },
      pattern: $('#pat', root).value.trim(), topics: [...tagSet], type: $('#type', root).value, emotion: $('#emo', root).value,
      keywords: $('#kw', root).value, hint: $('#hint', root).value.trim(), replies: lines('reps'), alts: lines('alts')
    });
    toast('저장했어요');
    location.hash = `#/settings/video/${vid}`;
  };
  $('#sv', root).onclick = doSave; $('#sv2', root).onclick = doSave;
  $('#del', root) && ($('#del', root).onclick = async () => { if (await confirmSheet('이 문장을 삭제할까요?')) { D.deleteUtt(u.id); location.hash = `#/settings/video/${vid}`; } });
  return () => pl.destroy();
}
function fmtD(t) { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${(Math.round(s * 10) / 10)}`; }
