// APPLY — 배운 패턴을 내 이야기로: Learn → Understand → Make It Yours → Speak → Feedback → Save
import * as D from './store.js';
import * as S from './speech.js';
import { esc, $, $$, ic, toast, micBlock, copyText } from './ui.js';
import { markPattern, diff } from './compare.js';
import { patternInfo, checkSentence, languageTool, claudePrompt } from './feedback.js';

const STEPS = [
  ['learn', 'Learn', '패턴 이해'], ['understand', 'Understand', '예문 확인'], ['make', 'Make It Yours', '내 문장 만들기'],
  ['speak', 'Speak', '말하기'], ['feedback', 'Feedback', '피드백'], ['save', 'Save', '저장']
];

// src: {ko, en, text, pattern, patternKo, examples, question, frame, uttId, ytId, start, videoId, videoTitle}
export function applyFlow(el, src, { start = 'learn', onSaved, stopFns = [] } = {}) {
  const info = patternInfo(src);
  const ctx = { draft: '', intent: '', spoken: '', final: '', fb: null, lt: null, choice: 'fixed' };
  let step = start, mic = null;

  el.innerHTML = `<div class="apply">
    <div class="ap-steps">${STEPS.map(([k, l], i) => `<button data-st="${k}"><i>${i + 1}</i><span>${l}</span></button>`).join('')}</div>
    <div class="ap-body"></div>
  </div>`;
  const body = $('.ap-body', el);
  $$('[data-st]', el).forEach(b => b.onclick = () => { const i = STEPS.findIndex(s => s[0] === b.dataset.st); if (i <= 2 || ctx.draft || ctx.spoken) go(b.dataset.st); else toast('먼저 내 문장을 만들어봐요'); });

  function go(s) {
    mic?.stop(); S.stopSpeak(); step = s;
    const i = STEPS.findIndex(x => x[0] === s);
    $$('[data-st]', el).forEach((b, j) => { b.classList.toggle('on', j === i); b.classList.toggle('done', j < i); });
    ({ learn, understand, make, speak, feedback, save })[s]();
    body.classList.remove('in'); void body.offsetWidth; body.classList.add('in');
  }
  const head = (n, title, sub) => `<div class="ap-head"><span class="ap-n">STEP ${n}</span><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}</div>`;
  const nav = (prev, next, label = '다음', disabled = false) => `<div class="row ap-nav">${prev ? `<button class="btn soft" data-go="${prev}" aria-label="이전">${ic('back')}</button>` : ''}<button class="btn grow" data-go="${next}" ${disabled ? 'disabled' : ''}>${label}</button></div>`;
  body.onclick = e => {
    const g = e.target.closest('[data-go]'); if (g && !g.disabled) { if (g.dataset.go === 'speak' || g.dataset.go === 'feedback') syncDraft(); go(g.dataset.go); return; }
    const t = e.target.closest('[data-tts]'); if (t) S.speak(t.dataset.tts);
  };
  const syncDraft = () => { const d = $('#ap-draft', body); if (d) { ctx.draft = d.value.trim(); if (ctx.draft === ctx.prefix || /_{2,}/.test(ctx.draft)) ctx.draft = ctx.draft === ctx.prefix ? '' : ctx.draft.replace(/_{2,}/g, '').trim(); } const k = $('#ap-intent', body); if (k) ctx.intent = k.value.trim(); };

  // STEP 1. Learn
  function learn() {
    body.innerHTML = `${head(1, 'Learn — 패턴 이해', 'WATCH에서 배운 문장의 핵심 뼈대예요')}
      <div class="card ap-card">
        <span class="label">핵심 패턴</span>
        <div class="ap-pattern en">${esc(info.pattern || '—')}</div>
        ${info.ko ? `<div class="ap-mean"><span class="label">의미</span><p>${esc(info.ko)}</p></div>` : `<div class="note">이 패턴의 뜻이 아직 등록되지 않았어요. 원문 뜻: ${esc(src.ko || '')}</div>`}
        ${info.sample ? `<div class="ap-sample"><span class="label">원문 예문</span><div class="row"><p class="en grow">${markPattern(info.sample, src.pattern, esc)}</p><button class="mini" data-tts="${esc(info.sample)}" aria-label="듣기">${ic('speaker')}</button></div>${src.ko ? `<p class="ko-sub">${esc(src.ko)}</p>` : ''}</div>` : ''}
      </div>
      ${!info.hasPattern ? `<p class="tiny muted">이 문장엔 패턴이 등록되지 않아 문장 앞부분을 뼈대로 써요. SETTINGS › 문장 편집에서 패턴을 넣을 수 있어요.</p>` : ''}
      ${nav('', 'understand', '예문 보기')}`;
  }
  // STEP 2. Understand
  function understand() {
    const ex = info.examples.length ? info.examples : [src.en?.easy, src.en?.natural, src.en?.advanced].filter(Boolean);
    body.innerHTML = `${head(2, 'Understand — 예문 확인', '같은 패턴을 쓰는 자연스러운 일상 표현이에요')}
      <div class="ex-list">${ex.map(t => `<button class="ex en" data-tts="${esc(t)}"><span>${markPattern(t, info.pattern, esc)}</span>${ic('speaker')}</button>`).join('')}</div>
      <p class="tiny muted">눌러서 들어보고, 소리 내어 한 번씩 따라 해보세요.</p>
      ${nav('learn', 'make', '내 문장 만들기')}`;
  }
  // STEP 3. Make It Yours
  function make() {
    ctx.prefix = info.frame.replace(/\s*______.*$/, '').trim();
    const startText = ctx.draft || (ctx.prefix ? ctx.prefix + ' ' : '');
    body.innerHTML = `${head(3, 'Make It Yours — 내 문장 만들기', '내 상황에 맞게 빈칸을 채워봐요')}
      <div class="card ap-card">
        <span class="label">질문</span>
        <p class="ap-q">${esc(info.question)}</p>
        <div class="ap-frame"><span class="label">힌트</span><span class="en">${esc(info.frame)}</span></div>
      </div>
      <label class="field"><span>내 영어 문장</span><textarea class="textarea en" id="ap-draft" rows="2" autocapitalize="sentences" spellcheck="false" placeholder="${esc(info.frame)}">${esc(startText)}</textarea></label>
      <label class="field"><span>하려던 말 (한국어 · 선택)</span><input class="input" id="ap-intent" value="${esc(ctx.intent)}" placeholder="예: 요즘 영어 공부를 계속하고 있어"></label>
      <p class="tiny muted">입력이 어려우면 비워 두고 다음 단계에서 바로 말해도 돼요.</p>
      ${nav('understand', 'speak', '말하기로')}`;
    const ta = $('#ap-draft', body); ta.focus({ preventScroll: true }); ta.setSelectionRange(ta.value.length, ta.value.length);
  }
  // STEP 4. Speak
  function speak() {
    const has = ctx.draft && !/^\s*$/.test(ctx.draft.replace(/_+/g, ''));
    body.innerHTML = `${head(4, 'Speak — 말하기', has ? '만든 문장을 보면서 소리 내어 말해봐요' : '질문에 대한 내 대답을 영어로 말해봐요')}
      ${has ? `<div class="card tint ap-target"><span class="label">내가 만든 문장</span><div class="row"><p class="en grow">${esc(ctx.draft)}</p><button class="mini" data-tts="${esc(ctx.draft)}" aria-label="듣기">${ic('speaker')}</button></div></div>` : `<div class="card ap-card"><p class="ap-q">${esc(info.question)}</p><div class="ap-frame"><span class="label">힌트</span><span class="en">${esc(info.frame)}</span></div></div>`}
      <div id="ap-mic"></div>
      <div id="ap-cmp"></div>
      ${nav('make', 'feedback', '피드백 받기', !(ctx.spoken || has))}`;
    mic = micBlock($('#ap-mic', body), {
      placeholder: '말한 문장이 여기에 나와요 · 직접 고쳐도 돼요', targets: () => has ? [ctx.draft] : [],
      onResult: t => upd(t), onEdit: t => upd(t)
    });
    if (ctx.spoken) { mic.text = ctx.spoken; upd(ctx.spoken); }
    function upd(t) {
      ctx.spoken = t;
      $('[data-go=feedback]', body).disabled = !(t || has);
      $('#ap-cmp', body).innerHTML = t && has ? (() => { const d = diff(t, ctx.draft); return `<div class="tiny muted ap-match">만든 문장과 ${d.score}% 같아요${d.score < 60 ? ' · 다르게 말해도 뜻이 맞으면 괜찮아요' : ''}</div>`; })() : '';
    }
    stopFns.push(() => mic?.stop());
  }
  // STEP 5. Feedback
  function feedback() {
    const text = ctx.spoken || ctx.draft;
    const fb = ctx.fb = checkSentence(text, info.pattern);
    const groups = { grammar: '문법', pattern: '패턴', natural: '더 자연스럽게', style: '표기' };
    const issues = fb?.issues || [];
    body.innerHTML = `${head(5, 'Feedback — 피드백', '규칙으로 확인할 수 있는 부분만 알려줘요')}
      <div class="fb">
        <div class="fb-row"><span class="label">내 문장</span><p class="en">${esc(text)}</p></div>
        ${fb.changed ? `<div class="fb-row better"><span class="label">다듬은 문장</span><div class="row"><p class="en grow">${esc(fb.fixed)}</p><button class="mini" data-tts="${esc(fb.fixed)}" aria-label="듣기">${ic('speaker')}</button></div></div>` : ''}
        <div class="fb-checks">
          <div class="fb-c ${issues.some(i => i.type === 'grammar') ? 'warn' : 'ok'}">${ic(issues.some(i => i.type === 'grammar') ? 'bulb' : 'check')}<span>${issues.some(i => i.type === 'grammar') ? '고칠 문법이 있어요' : '규칙상 문법 문제 없음'}</span></div>
          ${info.hasPattern ? `<div class="fb-c ${fb.usesPattern ? 'ok' : 'warn'}">${ic(fb.usesPattern ? 'check' : 'bulb')}<span>${fb.usesPattern ? '패턴을 잘 썼어요' : '패턴이 안 보여요'}</span></div>` : ''}
        </div>
        ${issues.length ? `<ul class="fb-list">${issues.map(i => `<li><span class="fb-tag ${i.type}">${groups[i.type]}</span><div>${i.to ? `<span class="en"><s>${esc(i.from)}</s> → <b>${esc(i.to)}</b></span><br>` : ''}<small>${esc(i.why)}</small></div></li>`).join('')}</ul>` : ''}
        ${!fb.usesPattern && info.hasPattern ? `<p class="small fb-tip">이번 패턴 <b class="en">${esc(info.pattern)}</b>을 넣어 다시 말해보면 더 좋아요. 예: <span class="en">${esc(info.examples[0] || info.frame)}</span></p>` : ''}
      </div>
      <div class="fb-more">
        <button class="btn sm soft" id="lt">${ic('sparkle')} 문법 정밀 검사</button>
        <button class="btn sm soft" id="cl">${ic('copy')} Claude에 물어보기</button>
      </div>
      <div id="lt-res"></div>
      <p class="tiny muted fb-disc">자동 피드백은 자주 하는 실수 규칙만 확인해요. 모든 오류를 잡지는 못해요. 정밀 검사는 무료 LanguageTool 서버로 문장을 보내요(눌렀을 때만). Claude 버튼은 질문을 복사해서 Claude 채팅에 붙여넣는 방식이라 추가 비용이 없어요.</p>
      <label class="field"><span>저장할 문장 (고쳐도 돼요)</span><textarea class="textarea en" id="fin" rows="2">${esc(fb.changed ? fb.fixed : text)}</textarea></label>
      <div class="row ap-nav"><button class="btn soft" data-go="speak">${ic('mic')} 다시 말하기</button><button class="btn grow" id="tosave">저장 단계로</button></div>`;
    $('#lt', body).onclick = async () => {
      const b = $('#lt', body); b.disabled = true; b.innerHTML = `${ic('sparkle')} 검사 중…`;
      const r = await languageTool(text); b.disabled = false; b.innerHTML = `${ic('sparkle')} 문법 정밀 검사`;
      $('#lt-res', body).innerHTML = !r.ok ? `<div class="note warn">정밀 검사 서버에 연결하지 못했어요 (${esc(r.error)}). 규칙 기반 결과만 참고해주세요.</div>`
        : `<div class="card lt"><span class="label">LanguageTool</span>${r.issues.length ? `<ul class="fb-list">${r.issues.slice(0, 6).map(i => `<li><span class="fb-tag grammar">검사</span><div>${i.to ? `<span class="en"><s>${esc(i.from)}</s> → <b>${esc(i.to)}</b></span><br>` : ''}<small>${esc(i.why)}</small></div></li>`).join('')}</ul><div class="row"><p class="en grow">${esc(r.fixed)}</p><button class="btn xs soft" id="use-lt">이 문장 쓰기</button></div>` : '<p class="small">찾은 문제가 없어요.</p>'}</div>`;
      $('#use-lt', body) && ($('#use-lt', body).onclick = () => { $('#fin', body).value = r.fixed; toast('저장할 문장에 넣었어요'); });
    };
    $('#cl', body).onclick = async () => {
      const ok = await copyText(claudePrompt({ text, pattern: info.pattern, intent: ctx.intent }));
      toast(ok ? '복사했어요 · Claude 채팅에 붙여넣어 주세요' : '복사가 막혔어요 · 길게 눌러 직접 복사해주세요');
    };
    $('#tosave', body).onclick = () => { ctx.final = $('#fin', body).value.trim(); if (!ctx.final) return toast('저장할 문장을 입력해주세요'); go('save'); };
  }
  // STEP 6. Save
  function save() {
    const text = ctx.final || ctx.spoken || ctx.draft;
    const dup = D.findDup({ kind: 'mine', text });
    body.innerHTML = `${head(6, 'Save — 내 표현 저장', 'SAVED에서 다시 보고 반복해서 말할 수 있어요')}
      <div class="card tint ap-target"><span class="label">내 문장</span><div class="row"><p class="en grow">${esc(text)}</p><button class="mini" data-tts="${esc(text)}" aria-label="듣기">${ic('speaker')}</button></div>
        <label class="field" style="margin:12px 0 0"><span>한국어 뜻 (복습 때 먼저 보여요)</span><input class="input" id="sv-ko" value="${esc(ctx.intent)}" placeholder="예: 요즘 영어 공부를 계속하고 있어"></label></div>
      <div class="row ap-nav"><button class="btn soft" data-go="feedback" aria-label="이전">${ic('back')}</button><button class="btn grow" id="sv" ${dup ? 'disabled' : ''}>${ic('bookmark')} ${dup ? '이미 저장된 문장' : 'SAVED에 저장'}</button></div>
      <div class="row ap-after hide"><button class="btn soft grow" id="more">한 문장 더 만들기</button><a class="btn line grow" href="#/saved">SAVED 보기</a></div>`;
    $('#sv', body).onclick = () => {
      const r = D.saveExpr({ kind: 'mine', level: 'mine', uttId: src.uttId || null, ko: $('#sv-ko', body).value.trim(), text, en: { easy: '', natural: text, advanced: '' }, pattern: info.pattern, note: info.question, ytId: src.ytId || '', start: src.start ?? null, videoId: src.videoId || null, videoTitle: src.videoTitle || '' });
      D.addAttempt({ uttId: src.uttId || null, step: 'apply', text });
      toast(r.dup ? '이미 SAVED에 있어요' : 'SAVED › 내 문장에 저장했어요');
      $('#sv', body).disabled = true; $('#sv', body).innerHTML = `${ic('check')} 저장됨`;
      $('.ap-after', body).classList.remove('hide');
      onSaved?.(r.item);
    };
    $('#more', body).onclick = () => { Object.assign(ctx, { draft: '', spoken: '', final: '', intent: '' }); go('make'); };
  }

  go(step);
  return { stop: () => mic?.stop() };
}
