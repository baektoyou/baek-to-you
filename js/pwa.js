// PWA 업데이트 — 배포할 때 버전을 손으로 바꾸지 않아도 최신 파일이 반영되게
// 1) sw.js는 HTTP 캐시를 거치지 않고 확인 (updateViaCache: 'none')
// 2) 앱 파일은 서비스워커가 항상 서버에 재검증(no-cache) 후 사용, 오프라인일 때만 캐시
// 3) sw.js 자체가 바뀌면 새 워커 활성화 → 페이지를 딱 한 번만 새로고침 (무한 새로고침 방지)
// 사용자 데이터(localStorage·IndexedDB)는 캐시 정리와 무관해서 지워지지 않아요.
import { toast } from './ui.js';

export const APP_VERSION = '2026.11.12-av';
let reg = null;
const RELOAD_KEY = 'b2u:reloadedAt';

export function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return; // 첫 설치는 새로고침 불필요
    const last = +sessionStorage.getItem(RELOAD_KEY) || 0;
    if (Date.now() - last < 15000) return; // 15초 안에 두 번 새로고침하지 않음
    sessionStorage.setItem(RELOAD_KEY, Date.now());
    sessionStorage.setItem('b2u:updated', '1');
    location.reload();
  });
  navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then(r => {
    reg = r; r.update().catch(() => { });
  }).catch(() => { });
  // 홈 화면 앱을 다시 열 때마다(최대 1분에 1번) 업데이트 확인
  let lastCheck = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && reg && Date.now() - lastCheck > 60000) { lastCheck = Date.now(); reg.update().catch(() => { }); }
  });
  if (sessionStorage.getItem('b2u:updated')) { sessionStorage.removeItem('b2u:updated'); setTimeout(() => toast('새 버전으로 업데이트했어요'), 400); }
}

export async function checkUpdate(manual) {
  if (!reg) { if (manual) setTimeout(() => location.reload(), 500); return '다시 불러올게요'; }
  try { await reg.update(); } catch { return '업데이트를 확인하지 못했어요 (오프라인?)'; }
  if (reg.installing || reg.waiting) return '새 버전을 설치하는 중이에요 · 곧 새로고침돼요';
  if (manual) setTimeout(() => location.reload(), 600);
  return '최신 파일로 다시 불러올게요';
}
