// BAEK TO YOU — 라우터 & 탭바
import * as D from './store.js';
import { ic } from './ui.js';
import { videoList, videoDetail, study } from './video.js';
import { talk } from './talk.js';
import { saved } from './saved.js';
import { settings, videoEditor, uttEditor } from './settings.js';
import { stopSpeak } from './speech.js';
import { registerSW } from './pwa.js';

const view = document.getElementById('view');
const tabbar = document.getElementById('tabbar');
let cleanup = null;

function renderTabs(tab) {
  const due = D.dueList().length;
  tabbar.innerHTML = `<nav>
    ${[['video', 'WATCH'], ['talk', 'TALK'], ['saved', 'SAVED'], ['settings', 'SETTINGS']].map(([k, l]) =>
    `<a href="#/${k}" class="${tab === k ? 'on' : ''}" ${tab === k ? 'aria-current="page"' : ''}>${ic(k)}<span>${l}</span>${k === 'saved' && due ? `<span class="badge">${due > 99 ? '99+' : due}</span>` : ''}</a>`).join('')}
  </nav>`;
}

function route() {
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
      else settings(root);
      break;
    case 'study': tab = 'video'; cleanup = study(root, p[1], p[2]); break;
    case 'video': if (p[1]) videoDetail(root, p[1]); else videoList(root); break;
    default: tab = 'video'; videoList(root);
  }
  renderTabs(tab);
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
route();
registerSW();
