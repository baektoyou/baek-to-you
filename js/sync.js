// 기기 연동 — Firebase Auth(Google·이메일) + Firestore(Lite)
// · 이 기기의 localStorage가 항상 원본. 로그인하면 클라우드와 3-way 병합해서 맞춤
// · 변경 후 몇 초 뒤 자동 업로드, 앱을 열거나 돌아올 때·1분마다 클라우드 변경 확인
// · 저장 구조: users/{uid} (메타: rev·조각 수) + users/{uid}/chunks/{0..n} (JSON 조각)
import * as D from './store.js';
import config from './firebase-config.js';
import { mergeData, sameData } from './merge.js';

export const configured = !!(config && config.apiKey && config.projectId);
const CHUNK = 200000;           // 문자 수 (한글 3바이트 기준으로도 1MB 문서 한도 아래)
const POLL_MS = 60000;
const DEVICE = (() => { try { let d = localStorage.getItem('b2u:device'); if (!d) { d = Math.random().toString(36).slice(2, 10); localStorage.setItem('b2u:device', d); } return d; } catch { return 'dev'; } })();

let fb = null, auth = null, fs = null, user = null;
let knownRev = null, lastSig = null, state = configured ? 'loading' : 'off', detail = '';
let lastSyncAt = +(safeGet('b2u:lastSync') || 0);
let chain = Promise.resolve(), pushT = null, pollT = null, askSwitch = null;
const subs = new Set();

function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } }
const baseKey = uid => 'baek-to-you:syncbase:' + uid;
const loadBase = uid => { try { return JSON.parse(localStorage.getItem(baseKey(uid)) || 'null'); } catch { return null; } };
const saveBase = (uid, d) => safeSet(baseKey(uid), JSON.stringify(d));
const strip = d => { const s = { ...(d.settings || {}) }; D.LOCAL_ONLY_SETTINGS.forEach(k => delete s[k]); return { ...d, settings: s }; };
const norm = d => strip(D.normalize(d));
const sig = d => JSON.stringify(d);

export const status = () => ({
  configured, state, detail, lastSyncAt,
  user: user && { email: user.email, name: user.displayName, photo: user.photoURL, providers: user.providerData.map(p => p.providerId) }
});
export function onStatus(fn) { subs.add(fn); return () => subs.delete(fn); }
function set(s, d = '') { state = s; detail = d; subs.forEach(f => { try { f(status()); } catch { } }); }
export const setAsk = fn => (askSwitch = fn);
const enqueue = fn => (chain = chain.then(fn).catch(onErr));

function onErr(e) {
  console.warn('[sync]', e);
  const c = e?.code || '';
  if (/unavailable|network|deadline|failed-precondition/.test(c) || !navigator.onLine) set('offline', '인터넷에 연결되면 자동으로 동기화해요');
  else if (/permission-denied/.test(c)) set('error', 'Firestore 보안 규칙이 막고 있어요 (설정 가이드 6단계 확인)');
  else if (/not-found/.test(c)) set('error', 'Firestore 데이터베이스가 아직 없어요 (설정 가이드 6단계)');
  else if (/resource-exhausted/.test(c)) set('error', '오늘 무료 사용량을 다 썼어요. 내일 자동으로 다시 동기화돼요');
  else set('error', '동기화 오류: ' + (c || e?.message || '알 수 없음'));
}

// ---------- 초기화 ----------
export async function init() {
  if (!configured) { set('off'); return; }
  try { fb = await import('./vendor/firebase.js'); }
  catch { set('error', '동기화 모듈을 불러오지 못했어요 (오프라인?)'); return; }
  const app = fb.initializeApp(config);
  auth = fb.getAuth(app); fs = fb.getFirestore(app);
  if (config.emulator) { fb.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true }); fb.connectFirestoreEmulator(fs, '127.0.0.1', 8080); }
  fb.onAuthStateChanged(auth, u => {
    user = u; knownRev = null; lastSig = null;
    if (!u) { set('signed-out'); return; }
    enqueue(() => firstSync(u));
  });
  D.onChange(e => { if (!e?.remote && user) schedulePush(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') poll(); else flushSoon(); });
  window.addEventListener('online', () => user && enqueue(fullSync));
  window.addEventListener('focus', poll);
  window.addEventListener('b2u:reset', () => { if (user) { try { localStorage.removeItem(baseKey(user.uid)); } catch { } } });
  clearInterval(pollT); pollT = setInterval(() => document.visibilityState === 'visible' && poll(), POLL_MS);
}

// ---------- 로그인 ----------
export function loginGoogle() {
  if (!auth) return Promise.reject({ code: 'not-ready' });
  const p = new fb.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
  return fb.signInWithPopup(auth, p); // 클릭 직후 바로 호출해야 Safari가 팝업을 허용
}
export const loginEmail = (email, pw) => fb.signInWithEmailAndPassword(auth, email.trim(), pw);
export const linkEmail = (email, pw) => fb.linkWithCredential(auth.currentUser, fb.EmailAuthProvider.credential(email.trim(), pw)).then(r => { user = r.user; set(state, detail); return r; });
export const resetPassword = email => fb.sendPasswordResetEmail(auth, email.trim());
export async function logout() { clearTimeout(pushT); await chain; await fb.signOut(auth); } // 이 기기 데이터는 그대로 남김
export const syncNow = () => enqueue(fullSync);

export function authErrorText(e) {
  const c = e?.code || '';
  return ({
    'not-ready': '동기화 준비 중이에요. 잠시 후 다시 눌러주세요',
    'auth/popup-blocked': '팝업이 막혔어요. 다시 한 번 눌러주세요 (계속 막히면 Safari 설정에서 팝업 차단 해제)',
    'auth/popup-closed-by-user': '로그인 창이 닫혔어요',
    'auth/cancelled-popup-request': '로그인 창이 닫혔어요',
    'auth/unauthorized-domain': '이 주소가 Firebase “승인된 도메인”에 없어요 (설정 가이드 5단계)',
    'auth/operation-not-supported-in-this-environment': '여기서는 Google 팝업 로그인이 안 돼요. Safari 탭에서 열거나 이메일 로그인을 써주세요',
    'auth/web-storage-unsupported': '이 브라우저 설정에서는 로그인 정보를 저장할 수 없어요 (개인정보 보호 브라우징 확인)',
    'auth/invalid-credential': '이메일 또는 비밀번호가 맞지 않아요',
    'auth/invalid-login-credentials': '이메일 또는 비밀번호가 맞지 않아요',
    'auth/wrong-password': '이메일 또는 비밀번호가 맞지 않아요',
    'auth/user-not-found': '이 이메일로 연결된 계정이 없어요. 먼저 Google 로그인 후 “이메일 로그인 추가”를 해주세요',
    'auth/invalid-email': '이메일 형식을 확인해주세요',
    'auth/email-already-in-use': '이미 다른 계정에서 쓰는 이메일이에요',
    'auth/credential-already-in-use': '이미 다른 계정에 연결된 이메일이에요',
    'auth/provider-already-linked': '이미 이메일 로그인이 연결돼 있어요',
    'auth/weak-password': '비밀번호는 6자 이상으로 해주세요',
    'auth/requires-recent-login': '보안을 위해 로그아웃 → 다시 로그인한 뒤 시도해주세요',
    'auth/network-request-failed': '네트워크 연결을 확인해주세요',
    'auth/too-many-requests': '시도가 너무 많아요. 잠시 후 다시 해주세요',
    'auth/operation-not-allowed': 'Firebase에서 이 로그인 방식이 꺼져 있어요 (설정 가이드 4단계)',
    'auth/configuration-not-found': 'Firebase Authentication이 아직 시작되지 않았어요 (설정 가이드 4단계)'
  })[c] || `로그인 오류 (${c || e?.message || '알 수 없음'})`;
}

// ---------- 동기화 ----------
const metaRef = () => fb.doc(fs, 'users', user.uid);
const chunkRef = i => fb.doc(fs, 'users', user.uid, 'chunks', String(i));

async function pullRemote() {
  for (let tries = 0; tries < 3; tries++) {
    const m = await fb.getDoc(metaRef());
    if (!m.exists()) return null;
    const meta = m.data();
    const parts = await Promise.all([...Array(meta.chunks || 0)].map((_, i) => fb.getDoc(chunkRef(i))));
    if (parts.some(p => !p.exists() || p.data().rev !== meta.rev)) continue; // 다른 기기가 쓰는 중 → 다시 읽기
    const data = norm(JSON.parse(parts.map(p => p.data().data).join('')));
    return { rev: meta.rev, data };
  }
  throw Object.assign(new Error('클라우드 데이터를 일관되게 읽지 못했어요'), { code: 'aborted' });
}

async function pushData(data) {
  const json = JSON.stringify(data);
  const parts = []; for (let i = 0; i < json.length; i += CHUNK) parts.push(json.slice(i, i + CHUNK));
  let nr = 0;
  await fb.runTransaction(fs, async tx => {
    const m = await tx.get(metaRef());
    const rev = m.exists() ? (m.data().rev || 0) : 0;
    if (rev !== (knownRev || 0)) throw Object.assign(new Error('conflict'), { conflict: true });
    const old = m.exists() ? (m.data().chunks || 0) : 0;
    nr = rev + 1;
    parts.forEach((p, i) => tx.set(chunkRef(i), { rev: nr, data: p }));
    for (let i = parts.length; i < old; i++) tx.delete(chunkRef(i));
    tx.set(metaRef(), { rev: nr, chunks: parts.length, size: json.length, updatedAt: Date.now(), device: DEVICE, app: 'BAEK TO YOU' });
  });
  knownRev = nr; lastSig = json; saveBase(user.uid, data); done();
}
function done() { lastSyncAt = Date.now(); safeSet('b2u:lastSync', lastSyncAt); set('synced'); }

// 로그인 직후: 다른 계정으로 바꿨으면 합칠지 물어봄
async function firstSync(u) {
  const prev = safeGet('b2u:lastUid');
  const local = D.getShared();
  const hasLocal = local.videos.length || local.saved.length || local.utts.length;
  if (prev && prev !== u.uid && hasLocal && askSwitch) {
    const choice = await askSwitch();
    if (choice === 'cloud') {
      set('syncing', '클라우드 데이터를 불러오는 중');
      const remote = await pullRemote();
      D.snapshot('계정 변경');
      D.applyShared(remote ? remote.data : norm({}));
      announce();
    }
  }
  safeSet('b2u:lastUid', u.uid);
  await fullSync();
}

async function fullSync(attempt = 0) {
  if (!user) return;
  set('syncing');
  const remote = await pullRemote();
  const local = norm(D.getShared());
  const base = loadBase(user.uid);
  let merged = remote ? norm(mergeData(local, remote.data, base)) : local;
  if (!sameData(merged, local)) {
    D.applyShared(merged); merged = norm(D.getShared()); lastSig = sig(merged); announce();
  }
  knownRev = remote ? remote.rev : 0;
  if (remote && sameData(merged, remote.data)) { lastSig = sig(merged); saveBase(user.uid, merged); done(); return; }
  try { await pushData(merged); }
  catch (e) { if (e.conflict && attempt < 3) return fullSync(attempt + 1); throw e; }
}

function schedulePush() {
  clearTimeout(pushT);
  if (state === 'synced' || state === 'error') set('pending', '저장 대기 중');
  pushT = setTimeout(() => enqueue(pushLocal), 2500);
}
function flushSoon() { if (pushT) { clearTimeout(pushT); pushT = null; enqueue(pushLocal); } }
async function pushLocal() {
  pushT = null;
  if (!user) return;
  const data = norm(D.getShared());
  if (sig(data) === lastSig) { if (state !== 'synced') done(); return; }
  if (knownRev == null) return fullSync();
  set('syncing');
  try { await pushData(data); }
  catch (e) { if (e.conflict) return fullSync(); throw e; }
}
function poll() {
  if (!user || !fs) return;
  enqueue(async () => {
    const m = await fb.getDoc(metaRef());
    const rev = m.exists() ? m.data().rev : 0;
    if (rev !== (knownRev || 0)) await fullSync();
  });
}
function announce() { window.dispatchEvent(new CustomEvent('b2u:remote')); }
