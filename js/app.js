// BAEK TO YOU — 라우터 & 탭바
import * as D from './store.js';
import { ic } from './ui.js';
import { videoList, videoDetail, study } from './video.js';
import { speak } from './speak.js';
import { saved } from './saved.js';
import { express } from './express.js';
import { settings, videoEditor, uttEditor, videoListAll, privacy } from './settings.js';
import { stopSpeak } from './speech.js';
import { registerSW } from './pwa.js';
import { loadUserPhotos } from './scene.js';
import * as Y from './sync.js';
import { sheet, toast, $$ } from './ui.js';

const view = document.getElementById('view');
const tabbar = document.getElementById('tabbar');
let cleanup = null, curTab = 'video';

function renderTabs(tab) {
  const due = D.dueTodayList().length + D.dueTodayWords().length;
  tabbar.innerHTML = `<nav>
    ${[['video', 'chat', 'CHAT'], ['talk', 'phone', 'CALL'], ['saved', 'saved', 'SAVED'], ['settings', 'settings', 'SETTINGS']].map(([k, icon, l]) => { const on = tab === k || (k === 'talk' && tab === 'speak');
    return `<a href="#/${k}" class="${on ? 'on' : ''}" ${on ? 'aria-current="page"' : ''}>${ic(icon)}<span>${l}</span>${k === 'saved' && due ? `<span class="badge">${due > 99 ? '99+' : due}</span>` : ''}</a>`; }).join('')}
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
    case 'talk': case 'speak': tab = 'talk'; cleanup = speak(root); break;
    case 'saved': saved(root); break;
    case 'express': tab = 'video'; cleanup = express(root); break; // 백현아 도와줘 (CHAT 첫 화면에서 들어감)
    case 'privacy': tab = 'settings'; privacy(root); break;
    case 'settings':
      // 영상·문장 편집 화면은 관리자만 (주소로 직접 들어와도 막음 · 서버 보안 규칙도 같은 기준)
      if (['video', 'videos', 'utt'].includes(p[1]) && !D.canEdit()) { location.replace('#/settings'); return; }
      if (p[1] === 'video' && p[2]) cleanup = videoEditor(root, p[2]);
      else if (p[1] === 'videos') videoListAll(root, p[2] || 'call');
      else if (p[1] === 'utt' && p[2] && p[3]) cleanup = uttEditor(root, p[2], p[3]);
      else cleanup = settings(root);
      break;
    case 'study': tab = 'video'; cleanup = study(root, p[1]); break;
    case 'video': if (p[1]) cleanup = videoDetail(root, p[1]); else videoList(root); break;
    default: tab = 'video'; videoList(root);
  }
  curTab = tab; renderTabs(tab);
  if (keepScroll !== true) window.scrollTo(0, 0);
}
window.addEventListener('hashchange', () => route());
// 관리자 여부가 확인되면 편집 버튼을 보이거나 숨김
D.onChange(e => { if (!e?.role) return; const h = location.hash || '#/video'; if (/^#\/(settings|video)/.test(h) || h === '#/' || h === '') route(true); });
route();
registerSW();
loadUserPhotos().then(() => { if (/^#\/settings/.test(location.hash)) route(true); });

// ---------- 기기 연동 ----------
// 다른 기기의 변경이 들어오면: 목록 화면이면 조용히 다시 그림, 학습·입력 중이면 방해하지 않고 알림만
window.addEventListener('b2u:remote', () => {
  const h = location.hash || '#/video';
  const busy = document.body.classList.contains('no-tab') || document.body.classList.contains('in-call') || /^#\/(study|talk|speak|express|settings\/(video|utt))/.test(h)
    || document.querySelector('.sheet') || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  if (busy) { renderTabs(curTab); toast('다른 기기의 변경 사항을 가져왔어요'); }
  else { const y = window.scrollY; route(true); window.scrollTo(0, y); }
});
// 안내: AI 사용량 한도 · 키 오류 · 네트워크
const AI_MSG = { quota: 'AI 사용량 한도를 넘었어요 · 잠시 동안 앱 규칙 피드백으로 이어가요', key: 'AI API 키를 확인해주세요 (SETTINGS › AI) · 지금은 앱 규칙 피드백이에요', network: 'AI에 연결할 수 없어요 · 인터넷을 확인해주세요', model: 'AI 모델 이름을 확인해주세요 (SETTINGS › AI)' };
window.addEventListener('b2u:aierr', e => toast(AI_MSG[e.detail] || 'AI 오류'));
window.addEventListener('offline', () => toast('인터넷 연결이 끊겼어요 · 영상·AI·동기화는 연결되면 다시 돼요'));
window.addEventListener('online', () => toast('다시 연결됐어요'));
Y.init();
