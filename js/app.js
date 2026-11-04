// BAEK TO YOU — 라우터 & 탭바
import * as D from './store.js';
import { ic } from './ui.js';
import { videoList, videoDetail, study } from './video.js';
import { talk } from './talk.js';
import { saved } from './saved.js';
import { settings, videoEditor, uttEditor } from './settings.js';
import { stopSpeak } from './speech.js';
import { registerSW } from './pwa.js';
import * as Y from './sync.js';
import { sheet, toast, $$ } from './ui.js';

const view = document.getElementById('view');
const tabbar = document.getElementById('tabbar');
let cleanup = null, curTab = 'video';

function renderTabs(tab) {
  const due = D.dueList().length;
  tabbar.innerHTML = `<nav>
    ${[['video', 'WATCH'], ['talk', 'TALK'], ['saved', 'SAVED'], ['settings', 'SETTINGS']].map(([k, l]) =>
    `<a href="#/${k}" class="${tab === k ? 'on' : ''}" ${tab === k ? 'aria-current="page"' : ''}>${ic(k)}<span>${l}</span>${k === 'saved' && due ? `<span class="badge">${due > 99 ? '99+' : due}</span>` : ''}</a>`).join('')}
  </nav>`;
}

function route(keepScroll) {
  const hash = (location.hash || '#/video').split('?')[0];
  const p = hash.replace(/^#\/?/, '').split('/');
  try { cleanup?.(); } catch { }
  cleanup = null; stopSpeak();
  document.body.classList.remove('in-call', 'no-tab');
  document.querySelectorAll('.sheet,.sheet-bg').forEach(e => e.remove());
  const root = document.createElement('div');
  view.replaceChildren(root);
  let tab = p[0] || 'video';
  switch (p[0]) {
    case 'talk': cleanup = talk(root); break;
    case 'saved': saved(root); break;
    case 'settings':
      if (p[1] === 'video' && p[2]) cleanup = videoEditor(root, p[2]);
      else if (p[1] === 'utt' && p[2] && p[3]) cleanup = uttEditor(root, p[2], p[3]);
      else cleanup = settings(root);
      break;
    case 'study': tab = 'video'; cleanup = study(root, p[1], p[2]); break;
    case 'video': if (p[1]) videoDetail(root, p[1]); else videoList(root); break;
    default: tab = 'video'; videoList(root);
  }
  curTab = tab; renderTabs(tab);
  if (keepScroll !== true) window.scrollTo(0, 0);
}
window.addEventListener('hashchange', () => route());
route();
registerSW();

// ---------- 기기 연동 ----------
// 다른 기기의 변경이 들어오면: 목록 화면이면 조용히 다시 그림, 학습·입력 중이면 방해하지 않고 알림만
window.addEventListener('b2u:remote', () => {
  const h = location.hash || '#/video';
  const busy = document.body.classList.contains('no-tab') || document.body.classList.contains('in-call') || /^#\/(study|talk|settings\/(video|utt))/.test(h)
    || document.querySelector('.sheet') || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  if (busy) { renderTabs(curTab); toast('다른 기기의 변경 사항을 가져왔어요'); }
  else { const y = window.scrollY; route(true); window.scrollTo(0, y); }
});
// 다른 Google 계정으로 로그인했을 때 이 기기 데이터를 어떻게 할지
Y.setAsk(() => new Promise(res => {
  let v = 'merge';
  const s = sheet(`<h3>다른 계정으로 로그인했어요</h3><p class="sheet-p">이 기기에는 이전 계정의 데이터가 있어요. 어떻게 할까요?</p>
    <div class="stack"><button class="btn block" data-v="merge">이 기기 데이터를 새 계정에 합치기</button><button class="btn soft block" data-v="cloud">새 계정의 클라우드 데이터만 쓰기</button></div>
    <p class="tiny muted mt8">‘클라우드 데이터만 쓰기’를 고르면 지금 데이터는 SETTINGS › 직전 상태로 되돌리기에 보관돼요.</p>`, { onClose: () => res(v) });
  $$('[data-v]', s).forEach(b => b.onclick = () => { v = b.dataset.v; s.close(); });
}));
Y.init();
