// 계정 · 공용 콘텐츠 · 개인 학습 데이터 — Firebase Auth(이메일·Google) + Firestore(Lite)
// ┌ content/main (+chunks)  영상·문장·공용 설정 → 누구나 읽기, 관리자만 쓰기 (보안 규칙으로 강제)
// ├ photos/{id}             관리자가 등록한 통화 사진 → 누구나 읽기, 관리자만 쓰기
// ├ admins/{uid}            관리자 표시 (Firebase 콘솔에서만 만듦 · 앱에서는 못 씀)
// └ users/{uid} (+chunks)   내 학습 데이터 (SAVED·단어·진도·기록·개인 설정) → 본인만 읽기/쓰기
// · 이 기기의 localStorage에는 "지금 로그인한 계정" 데이터만 펼쳐두고, 다른 계정 데이터는 따로 보관 → 계정을 바꿔도 섞이지 않음
import * as D from './store.js';
import config from './firebase-config.js';
import { mergeData, sameData } from './merge.js';

export const configured = !!(config && config.apiKey && config.projectId);
const CHUNK = 200000;
const POLL_MS = 60000;
const PHOTO_MAX = 900000; // Firestore 문서 1MB 한도 아래

let fb = null, auth = null, fs = null, user = null, admin = false, ready = false;
let knownRev = null, lastSig = null, cRev = null, cSig = null;
let state = configured ? 'loading' : 'off', detail = '';
let lastSyncAt = +(safeGet('b2u:lastSync') || 0);
let chain = Promise.resolve(), pushT = null, cPushT = null, pollT = null;
const subs = new Set();

function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } }
function safeDel(k) { try { localStorage.removeItem(k); } catch { } }
const baseKey = uid => 'baek-to-you:syncbase:' + uid;
// 기준본(큰 사본)은 IndexedDB (store.bigGet/bigSet)
const loadJ = k => { try { return JSON.parse(D.bigGet(k) || 'null'); } catch { return null; } };
const sig = d => JSON.stringify(d);

// Firebase를 쓰면 처음부터 "관리자만 수정" 모드 (확인 전엔 수정 버튼 숨김)
if (configured) D.setRole({ cloud: true, admin: safeGet('b2u:admin') === D.accountKey() && D.accountKey() !== 'guest' });

// 개인 데이터만 / 공용 콘텐츠만 골라내기
const P_KEYS = ['version', 'saved', 'attempts', 'talkLogs', 'words', 'mistakes', 'progress', 'days', 'settings'];
function onlyPersonal(d) {
  const n = D.normalize(d), out = {};
  P_KEYS.forEach(k => (out[k] = n[k]));
  const st = { ...n.settings }; D.CONTENT_SETTINGS.concat(D.LOCAL_ONLY_SETTINGS).forEach(k => delete st[k]);
  out.settings = st; return out;
}
function onlyContent(d) {
  const n = D.normalize(d), st = {};
  D.CONTENT_SETTINGS.forEach(k => { if (n.settings[k] !== undefined) st[k] = n.settings[k]; });
  return { version: n.version, videos: n.videos, utts: n.utts, settings: st };
}

export const status = () => ({
  configured, state, detail, lastSyncAt, admin,
  user: user && { uid: user.uid, email: user.email, name: user.displayName, photo: user.photoURL, verified: user.emailVerified, providers: user.providerData.map(p => p.providerId) }
});
export function onStatus(fn) { subs.add(fn); return () => subs.delete(fn); }
function set(s, d = '') { state = s; detail = d; subs.forEach(f => { try { f(status()); } catch { } }); }
export const setAsk = () => { }; // (예전 버전 호환 — 이제 계정마다 자동으로 분리)
const enqueue = fn => (chain = chain.then(fn).catch(onErr));

function onErr(e) {
  console.warn('[sync]', e);
  const c = e?.code || '';
  if (/unavailable|network|deadline|failed-precondition/.test(c) || !navigator.onLine) set('offline', '인터넷에 연결되면 자동으로 동기화해요');
  else if (/permission-denied/.test(c)) set('error', '권한이 없어요 (Firestore 보안 규칙 확인)');
  else if (/not-found/.test(c)) set('error', 'Firestore 데이터베이스가 아직 없어요 (설정 가이드 6단계)');
  else if (/resource-exhausted/.test(c)) set('error', '오늘 Firebase 무료 사용량을 다 썼어요. 내일 자동으로 다시 동기화돼요');
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
  fb.onAuthStateChanged(auth, u => enqueue(() => onUser(u)));
  D.onChange(e => {
    if (e?.remote || e?.role || !ready) return;
    if (user) schedulePush();
    if (admin) scheduleContentPush();
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') poll(); else flushSoon(); });
  window.addEventListener('online', () => enqueue(async () => { await pullContent(); if (user) await fullSync(); }));
  window.addEventListener('focus', poll);
  window.addEventListener('b2u:reset', () => { if (user) D.bigDel(baseKey(user.uid)); });
  clearInterval(pollT); pollT = setInterval(() => document.visibilityState === 'visible' && poll(), POLL_MS);
}

// 로그인 상태가 바뀔 때: ① 이전 계정 데이터 보관 ② 이 계정 데이터 펼치기 ③ 관리자 확인 ④ 공용 콘텐츠·내 데이터 동기화
async function onUser(u) {
  await D.bigReady;
  clearTimeout(pushT); clearTimeout(cPushT); pushT = cPushT = null;
  ready = false; user = u; knownRev = null; lastSig = null;
  const prev = D.accountKey(), next = u ? u.uid : 'guest';
  if (prev !== next) {
    D.stashPersonal(prev);
    let p = D.loadStash(next);
    // 로그인 안 하고 쓰던 기록 → 처음 로그인하는 계정으로 옮김 (이 기기에 그 계정 기록이 없을 때만)
    if (!p && u && prev === 'guest' && D.hasPersonal(D.getPersonal())) { p = D.getPersonal(); D.bigSet('baek-to-you:personal:guest', D.emptyPersonal()); }
    D.clearSnapshot();
    D.setAccountKey(next);
    D.applyPersonal(p || D.emptyPersonal());
    D.dropStash(next); // 펼친 데이터가 원본 (보관본은 지움)
    announce();
  }
  admin = false;
  if (u) {
    try { admin = (await fb.getDoc(fb.doc(fs, 'admins', u.uid))).exists(); } catch (e) { console.warn('[admin check]', e?.code); admin = safeGet('b2u:admin') === u.uid; }
    if (admin) safeSet('b2u:admin', u.uid); else if (safeGet('b2u:admin') === u.uid) safeDel('b2u:admin');
  }
  D.setRole({ cloud: true, admin });
  try { await pullContent(); } catch (e) { onErr(e); }
  if (!u) { ready = true; set('signed-out'); return; }
  safeSet('b2u:lastUid', u.uid);
  await fullSync();
  ready = true;
}

// ---------- 로그인 ----------
const need = () => { if (!auth) throw { code: 'not-ready' }; };
export function loginGoogle() {
  if (!auth) return Promise.reject({ code: 'not-ready' });
  const p = new fb.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
  return fb.signInWithPopup(auth, p); // 클릭 직후 바로 호출해야 Safari가 팝업을 허용
}
export async function loginEmail(email, pw) { need(); return fb.signInWithEmailAndPassword(auth, email.trim(), pw); }
export async function signup(email, pw) {
  need();
  const r = await fb.createUserWithEmailAndPassword(auth, email.trim(), pw);
  try { await fb.sendEmailVerification(r.user); } catch { }
  return r;
}
export const linkEmail = (email, pw) => fb.linkWithCredential(auth.currentUser, fb.EmailAuthProvider.credential(email.trim(), pw)).then(r => { user = r.user; set(state, detail); return r; });
export async function resetPassword(email) { need(); return fb.sendPasswordResetEmail(auth, email.trim()); }
export async function logout() { clearTimeout(pushT); if (pushT || user) await enqueue(pushLocal); await chain; await fb.signOut(auth); }
export const syncNow = () => enqueue(async () => { await pullContent(); if (user) await fullSync(); else set('signed-out'); });

// 내 학습 데이터 삭제 (클라우드 + 이 기기) — 공용 영상·문장은 그대로
export async function deleteMyData() {
  if (!user) throw { code: 'not-signed-in' };
  clearTimeout(pushT); pushT = null;
  await (chain = chain.then(async () => {
    const snap = await fb.getDocs(fb.collection(fs, 'users', user.uid, 'chunks'));
    const b = fb.writeBatch(fs); snap.forEach(d => b.delete(d.ref)); b.delete(metaRef()); await b.commit();
    knownRev = 0; lastSig = null; D.bigDel(baseKey(user.uid));
    ready = false; D.applyPersonal(D.emptyPersonal()); D.clearSnapshot(); ready = true;
    lastSig = sig(onlyPersonal(D.getPersonal()));
    announce(); done();
  }));
}
// 계정 삭제: 내 데이터 삭제 → Firebase 계정 삭제 (오래전에 로그인했으면 비밀번호 다시 확인)
export async function deleteAccount(password) {
  if (!user) throw { code: 'not-signed-in' };
  const u = auth.currentUser;
  if (password != null) {
    if (u.providerData.some(p => p.providerId === 'password')) await fb.reauthenticateWithCredential(u, fb.EmailAuthProvider.credential(u.email, password));
    else await fb.reauthenticateWithPopup(u, new fb.GoogleAuthProvider());
  }
  const uid = u.uid;
  await deleteMyData();
  await fb.deleteUser(u); // requires-recent-login이면 여기서 오류 → 화면에서 비밀번호 확인 후 다시
  ['baek-to-you:personal:' + uid, baseKey(uid)].forEach(D.bigDel); safeDel('baek-to-you:aikeys:' + uid);
  if (safeGet('b2u:admin') === uid) safeDel('b2u:admin');
  if (safeGet('b2u:lastUid') === uid) safeDel('b2u:lastUid');
}
export const needsPassword = () => !!auth?.currentUser?.providerData.some(p => p.providerId === 'password');

export function authErrorText(e) {
  const c = e?.code || '';
  return ({
    'not-ready': '로그인 준비 중이에요. 잠시 후 다시 눌러주세요',
    'not-signed-in': '먼저 로그인해주세요',
    'auth/popup-blocked': '팝업이 막혔어요. 다시 한 번 눌러주세요 (계속 막히면 Safari 설정에서 팝업 차단 해제)',
    'auth/popup-closed-by-user': '로그인 창이 닫혔어요',
    'auth/cancelled-popup-request': '로그인 창이 닫혔어요',
    'auth/unauthorized-domain': '이 주소가 Firebase “승인된 도메인”에 없어요 (설정 가이드 5단계)',
    'auth/operation-not-supported-in-this-environment': '여기서는 Google 팝업 로그인이 안 돼요. Safari에서 열거나 이메일 로그인을 써주세요',
    'auth/web-storage-unsupported': '이 브라우저 설정에서는 로그인 정보를 저장할 수 없어요 (개인정보 보호 브라우징 확인)',
    'auth/invalid-credential': '이메일 또는 비밀번호가 맞지 않아요',
    'auth/invalid-login-credentials': '이메일 또는 비밀번호가 맞지 않아요',
    'auth/wrong-password': '비밀번호가 맞지 않아요',
    'auth/user-not-found': '가입되지 않은 이메일이에요. ‘회원가입’을 눌러주세요',
    'auth/missing-password': '비밀번호를 입력해주세요',
    'auth/missing-email': '이메일을 입력해주세요',
    'auth/invalid-email': '이메일 형식을 확인해주세요',
    'auth/email-already-in-use': '이미 가입된 이메일이에요. 로그인해주세요',
    'auth/credential-already-in-use': '이미 다른 계정에 연결된 이메일이에요',
    'auth/provider-already-linked': '이미 이메일 로그인이 연결돼 있어요',
    'auth/weak-password': '비밀번호는 6자 이상으로 해주세요',
    'auth/password-does-not-meet-requirements': '비밀번호 조건을 확인해주세요 (Firebase 비밀번호 정책)',
    'auth/requires-recent-login': '보안을 위해 비밀번호를 한 번 더 확인할게요',
    'auth/network-request-failed': '네트워크 연결을 확인해주세요',
    'auth/too-many-requests': '시도가 너무 많아요. 잠시 후 다시 해주세요',
    'auth/user-disabled': '사용이 중지된 계정이에요',
    'auth/operation-not-allowed': 'Firebase에서 이메일/비밀번호 로그인이 꺼져 있어요 (설정 가이드 4단계)',
    'auth/admin-restricted-operation': 'Firebase에서 새 회원가입이 막혀 있어요 (Authentication › 설정 › 사용자 작업)',
    'auth/configuration-not-found': 'Firebase Authentication이 아직 시작되지 않았어요 (설정 가이드 4단계)',
    'permission-denied': '권한이 없어요'
  })[c] || `오류 (${c || e?.message || '알 수 없음'})`;
}

// ---------- 조각 저장소 (문서 1MB 한도 → JSON을 나눠 저장) ----------
const store = path => ({ meta: () => fb.doc(fs, ...path), chunk: i => fb.doc(fs, ...path, 'chunks', String(i)) });
const metaRef = () => store(['users', user.uid]).meta();
async function pull(S) {
  for (let tries = 0; tries < 3; tries++) {
    const m = await fb.getDoc(S.meta());
    if (!m.exists()) return null;
    const meta = m.data();
    const parts = await Promise.all([...Array(meta.chunks || 0)].map((_, i) => fb.getDoc(S.chunk(i))));
    if (parts.some(p => !p.exists() || p.data().rev !== meta.rev)) continue; // 다른 기기가 쓰는 중 → 다시 읽기
    return { rev: meta.rev, data: JSON.parse(parts.map(p => p.data().data).join('')) };
  }
  throw Object.assign(new Error('클라우드 데이터를 일관되게 읽지 못했어요'), { code: 'aborted' });
}
async function push(S, data, expect, extra = {}) {
  const json = JSON.stringify(data);
  const parts = []; for (let i = 0; i < json.length; i += CHUNK) parts.push(json.slice(i, i + CHUNK));
  let nr = 0;
  await fb.runTransaction(fs, async tx => {
    const m = await tx.get(S.meta());
    const rev = m.exists() ? (m.data().rev || 0) : 0;
    if (rev !== (expect || 0)) throw Object.assign(new Error('conflict'), { conflict: true });
    const old = m.exists() ? (m.data().chunks || 0) : 0;
    nr = rev + 1;
    parts.forEach((p, i) => tx.set(S.chunk(i), { rev: nr, data: p }));
    for (let i = parts.length; i < old; i++) tx.delete(S.chunk(i));
    tx.set(S.meta(), { rev: nr, chunks: parts.length, size: json.length, updatedAt: Date.now(), app: 'BAEK TO YOU', ...extra });
  });
  return nr;
}
function done() { lastSyncAt = Date.now(); safeSet('b2u:lastSync', lastSyncAt); set('synced'); }

// ---------- 공용 콘텐츠 ----------
const CONTENT = () => store(['content', 'main']);
const CBASE = 'baek-to-you:contentbase';
async function pullContent(attempt = 0) {
  await D.bigReady;
  if (!fs) return;
  const remote = await pull(CONTENT());
  const local = onlyContent(D.getContent());
  if (!remote) { // 아직 아무도 올리지 않음 → 관리자면 지금 콘텐츠를 올림
    cRev = 0;
    if (admin && (local.videos.length || local.utts.length)) await pushContent();
    return;
  }
  const rdata = onlyContent(remote.data);
  if (!admin) { // 일반 사용자: 관리자 콘텐츠를 그대로 씀
    cRev = remote.rev;
    if (!sameData(rdata, local)) { D.applyContent(rdata); announce(); }
    await fetchPhotos(rdata);
    cSig = sig(rdata); return;
  }
  // 관리자 (여러 기기): 3-way 병합
  const merged = onlyContent(mergeData({ ...local, saved: [], words: [], attempts: [], talkLogs: [], mistakes: [] }, { ...rdata, saved: [], words: [], attempts: [], talkLogs: [], mistakes: [] }, loadJ(CBASE)));
  if (!sameData(merged, local)) { D.applyContent(merged); announce(); }
  await fetchPhotos(merged);
  cRev = remote.rev;
  if (sameData(merged, rdata)) { cSig = sig(merged); D.bigSet(CBASE, sig(merged)); return; }
  try { await pushContent(); } catch (e) { if (e.conflict && attempt < 3) return pullContent(attempt + 1); throw e; }
}
async function pushContent() {
  if (!admin || !user) return;
  const data = onlyContent(D.getContent());
  await uploadPhotos(data);
  if (sig(data) === cSig) return;
  set('syncing', '콘텐츠를 모든 사용자에게 올리는 중');
  cRev = await push(CONTENT(), data, cRev, { by: user.uid });
  cSig = sig(data); D.bigSet(CBASE, cSig); done();
}
function scheduleContentPush() {
  clearTimeout(cPushT);
  cPushT = setTimeout(() => { cPushT = null; enqueue(async () => { if (cRev == null) return pullContent(); try { await pushContent(); } catch (e) { if (e.conflict) return pullContent(); throw e; } }); }, 2000);
}

// 사진: 관리자 기기 IndexedDB → photos/{id} → 모든 사용자 기기 IndexedDB
const PUP = 'baek-to-you:photosUp';
async function uploadPhotos(data) {
  const scene = await import('./scene.js');
  const ids = (data.settings.userPhotos || []).map(m => m.id);
  const up = new Set(loadJ(PUP) || []);
  for (const id of ids) {
    if (up.has(id)) continue;
    const blob = await scene.PhotoStore.get(id).catch(() => null);
    if (!blob) continue;
    const url = await shrink(blob);
    await fb.setDoc(fb.doc(fs, 'photos', id), { data: url, at: Date.now(), by: user.uid });
    up.add(id); safeSet(PUP, JSON.stringify([...up]));
  }
  for (const id of [...up]) if (!ids.includes(id)) { await fb.deleteDoc(fb.doc(fs, 'photos', id)); up.delete(id); safeSet(PUP, JSON.stringify([...up])); }
}
async function fetchPhotos(data) {
  const metas = data.settings.userPhotos || [];
  if (!metas.length) return;
  const scene = await import('./scene.js');
  let got = 0;
  for (const m of metas) {
    if (await scene.PhotoStore.get(m.id).catch(() => null)) continue;
    const d = await fb.getDoc(fb.doc(fs, 'photos', m.id)).catch(() => null);
    if (!d?.exists()) continue;
    const blob = await (await fetch(d.data().data)).blob();
    await scene.PhotoStore.put(m.id, blob); got++;
  }
  if (got) { await scene.loadUserPhotos(); announce(); }
}
async function shrink(blob) {
  const toUrl = b => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
  let url = await toUrl(blob);
  for (let q = 0.8, max = 1280; url.length > PHOTO_MAX && max > 400; q -= 0.1, max -= 240) {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); url = c.toDataURL('image/jpeg', q);
  }
  return url;
}

// ---------- 내 학습 데이터 ----------
async function fullSync(attempt = 0) {
  await D.bigReady;
  if (!user) return;
  set('syncing');
  const S = store(['users', user.uid]);
  const remote = await pull(S);
  const local = onlyPersonal(D.getPersonal());
  const rdata = remote ? onlyPersonal(remote.data) : null;
  let merged = rdata ? onlyPersonal(mergeData({ ...local, videos: [], utts: [] }, { ...rdata, videos: [], utts: [] }, loadJ(baseKey(user.uid)))) : local;
  if (!sameData(merged, local)) { D.applyPersonal(merged); merged = onlyPersonal(D.getPersonal()); announce(); }
  knownRev = remote ? remote.rev : 0;
  if (rdata && sameData(merged, rdata) && !remote.data.videos) { lastSig = sig(merged); D.bigSet(baseKey(user.uid), sig(merged)); done(); return; }
  try { knownRev = await push(S, merged, knownRev); lastSig = sig(merged); D.bigSet(baseKey(user.uid), lastSig); done(); }
  catch (e) { if (e.conflict && attempt < 3) return fullSync(attempt + 1); throw e; }
}
function schedulePush() {
  clearTimeout(pushT);
  if (state === 'synced' || state === 'error') set('pending', '저장 대기 중');
  pushT = setTimeout(() => enqueue(pushLocal), 2500);
}
function flushSoon() {
  if (pushT) { clearTimeout(pushT); pushT = null; enqueue(pushLocal); }
  if (cPushT) { clearTimeout(cPushT); cPushT = null; enqueue(pushContent); }
}
async function pushLocal() {
  pushT = null;
  if (!user) return;
  const data = onlyPersonal(D.getPersonal());
  if (sig(data) === lastSig) { if (state !== 'synced') done(); return; }
  if (knownRev == null) return fullSync();
  set('syncing');
  try { knownRev = await push(store(['users', user.uid]), data, knownRev); lastSig = sig(data); D.bigSet(baseKey(user.uid), lastSig); done(); }
  catch (e) { if (e.conflict) return fullSync(); throw e; }
}
function poll() {
  if (!fs || !ready) return;
  enqueue(async () => {
    const cm = await fb.getDoc(CONTENT().meta());
    if ((cm.exists() ? cm.data().rev : 0) !== (cRev || 0)) await pullContent();
    if (!user) return;
    const m = await fb.getDoc(metaRef());
    if ((m.exists() ? m.data().rev : 0) !== (knownRev || 0)) await fullSync();
  });
}
function announce() { window.dispatchEvent(new CustomEvent('b2u:remote')); }
