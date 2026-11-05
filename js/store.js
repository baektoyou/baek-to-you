// BAEK TO YOU — 데이터 저장소 (localStorage + IndexedDB 녹음 보관)
// 키는 v1 그대로 유지 → 기존 사용자 데이터가 그대로 이어집니다.
const KEY = 'baek-to-you:v1';
const SNAP = 'baek-to-you:snapshot';

const defaults = () => ({
  version: 2,
  videos: [],      // {id, ytId, title, addedAt}
  utts: [],        // 발화
  saved: [],       // 저장 표현 (복습)
  attempts: [],    // 말하기 기록
  progress: {},    // uttId -> {steps:{}, lastAt}
  talkLogs: [],    // 통화 기록 {id, at, kind, videoId, sec, spoke, n}
  words: [],       // 따로 저장한 단어·표현 {id, text, ko, note, srcId, status, srs}
  days: {},        // 'YYYY-MM-DD' -> 활동 수
  settings: { voiceURI: '', rate: 0.92, pitch: 1, talkShowEn: false, talkCaption: true, camera: false, sttFix: '', sttLang: 'en-US', autoPause: true, autoLT: true, callFill: true, userPhotos: [], hiddenPhotos: [], customSits: [], hiddenSits: [], profile: { name: '', photo: '' } }
});

let db = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    return migrate(JSON.parse(raw));
  } catch (e) { console.error('load fail', e); return defaults(); }
}
function migrate(d) {
  const base = defaults();
  const out = { ...base, ...d, version: 2 };
  out.settings = { ...base.settings, ...(d.settings || {}) };
  out.videos = arrOf(out.videos);
  out.utts = arrOf(out.utts).map(normUtt);
  out.saved = arrOf(out.saved).map(s => normSaved(s, out));
  out.attempts = arrOf(out.attempts); out.talkLogs = arrOf(out.talkLogs).map(l => ({ id: l.id || uid(), ...l }));
  out.words = arrOf(out.words).map(normWord);
  out.progress = out.progress || {}; out.days = out.days || {};
  return out;
}
function arrOf(v) { return Array.isArray(v) ? v : []; }
export function normUtt(u) {
  return {
    id: u.id || uid(), videoId: u.videoId, start: +u.start || 0, end: +u.end || (+u.start || 0) + 5,
    ko: u.ko || '', en: { easy: u.en?.easy || '', natural: u.en?.natural || '', advanced: u.en?.advanced || '' },
    alts: arr(u.alts), pattern: u.pattern || '', topics: arr(u.topics), emotion: u.emotion || '',
    type: u.type || 'statement', keywords: arr(u.keywords), hint: u.hint || '', replies: arr(u.replies),
    // APPLY용 (선택) — 없으면 앱의 패턴 사전/기본값 사용
    patternKo: u.patternKo || '', examples: arr(u.examples), question: u.question || '', frame: u.frame || '',
    createdAt: u.createdAt || Date.now(), updatedAt: u.updatedAt || 0
  };
}
function arr(v) { return Array.isArray(v) ? v.filter(Boolean).map(String) : (typeof v === 'string' && v ? v.split(/[,\n]/).map(s => s.trim()).filter(Boolean) : []); }

// 저장 표현 정규화 — 예전 항목(hard, srs)도 그대로 살려서 새 필드만 채움
function normSaved(s, d = db) {
  const en = { easy: s.en?.easy || '', natural: s.en?.natural || '', advanced: s.en?.advanced || '' };
  const kind = s.kind || 'utt';
  const level = s.level || (kind === 'utt' ? 'natural' : 'mine');
  const text = s.text || (kind === 'utt' ? (en[level] || en.natural || en.easy || en.advanced) : '');
  const srs = { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: Date.now(), ...(s.srs || {}) };
  let status = s.status;
  if (!status) status = s.hard ? 'again' : srs.reps >= 4 ? 'mastered' : srs.reps >= 1 ? 'okay' : 'new';
  const out = { id: s.id || uid(), kind, level, uttId: s.uttId || null, ko: s.ko || '', en, text, pattern: s.pattern || '', note: s.note || '',
    videoId: s.videoId || null, ytId: s.ytId || '', start: s.start ?? null, videoTitle: s.videoTitle || '',
    createdAt: s.createdAt || Date.now(), hard: status === 'again', status, audioId: s.audioId || null, srs, history: arrOf(s.history), editedAt: s.editedAt || 0,
    marks: arr(s.marks), before: s.before || '' };
  // 원본 영상 정보 보강 (예전 항목)
  if (out.uttId && !out.ytId) {
    const u = d.utts?.find(x => x.id === out.uttId); const v = u && d.videos?.find(x => x.id === u.videoId);
    if (u && v) Object.assign(out, { videoId: v.id, ytId: v.ytId, start: u.start, videoTitle: v.title });
  }
  return out;
}

let saveTimer;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 60);
  listeners.forEach(fn => fn());
}
function flush() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { alert('저장 공간이 부족해요. SETTINGS에서 백업 후 기록을 정리해주세요.'); }
}
window.addEventListener('pagehide', () => { clearTimeout(saveTimer); flush(); });
export const onChange = fn => listeners.add(fn);
export const get = () => db;
export function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }
export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function bump() { const t = today(); db.days[t] = (db.days[t] || 0) + 1; }

// ---------- 안전장치: 위험한 작업 직전 자동 스냅샷 (1개) ----------
export function snapshot(reason) {
  try { localStorage.setItem(SNAP, JSON.stringify({ at: Date.now(), reason, data: db })); return true; }
  catch { return false; }
}
export function snapshotInfo() { try { const s = JSON.parse(localStorage.getItem(SNAP) || 'null'); return s ? { at: s.at, reason: s.reason } : null; } catch { return null; } }
export function restoreSnapshot() {
  const s = JSON.parse(localStorage.getItem(SNAP) || 'null'); if (!s?.data) throw new Error('되돌릴 기록이 없어요');
  const d = migrate(s.data);
  if (!canEdit()) { d.videos = db.videos; d.utts = db.utts; CONTENT_SETTINGS.forEach(k => (d.settings[k] = db.settings[k])); } // 일반 사용자는 내 데이터만 되돌림
  db = d; localStorage.removeItem(SNAP); save();
}
export const clearSnapshot = () => { try { localStorage.removeItem(SNAP); } catch { } }; // 계정 바꿀 때 (이전 계정 데이터가 남지 않게)

// ---------- 영상 ----------
export function addVideo(ytId, title) { if (!gate('addVideo')) return null;
  if (db.videos.some(v => v.ytId === ytId)) return db.videos.find(v => v.ytId === ytId);
  const v = { id: uid(), ytId, title: title || 'YouTube 영상', addedAt: Date.now() };
  db.videos.unshift(v); save(); return v;
}
export function updateVideo(id, patch) { if (!gate('updateVideo')) return null; const v = db.videos.find(x => x.id === id); if (v) { Object.assign(v, patch, { updatedAt: Date.now() }); save(); } }
export function deleteVideo(id) { if (!gate('deleteVideo')) return null;
  snapshot('영상 삭제');
  const ids = new Set(db.utts.filter(u => u.videoId === id).map(u => u.id));
  db.videos = db.videos.filter(v => v.id !== id);
  db.utts = db.utts.filter(u => u.videoId !== id);
  db.saved.forEach(s => { if (ids.has(s.uttId)) s.uttId = null; });
  save();
}
export const video = id => db.videos.find(v => v.id === id);
export const uttsOf = vid => db.utts.filter(u => u.videoId === vid).sort((a, b) => a.start - b.start);
export const utt = id => db.utts.find(u => u.id === id);
export const savedLinkedTo = vid => { const ids = new Set(db.utts.filter(u => u.videoId === vid).map(u => u.id)); return db.saved.filter(s => ids.has(s.uttId)); };

export function upsertUtt(u) { if (!gate('upsertUtt')) return null;
  const n = normUtt({ ...u, updatedAt: Date.now() });
  const i = db.utts.findIndex(x => x.id === n.id);
  if (i >= 0) db.utts[i] = n; else db.utts.push(n);
  save(); return n;
}
export function deleteUtt(id) { if (!gate('deleteUtt')) return null; db.utts = db.utts.filter(u => u.id !== id); db.saved.forEach(s => { if (s.uttId === id) s.uttId = null; }); save(); }

// 특정 영상의 문장만 전부 삭제 (영상·다른 영상·SAVED 내용은 유지)
export function clearUtts(vid) { if (!gate('clearUtts')) return { removed: 0 };
  snapshot('문장 전체 삭제');
  const ids = new Set(db.utts.filter(u => u.videoId === vid).map(u => u.id));
  let detached = 0;
  db.saved.forEach(s => { if (ids.has(s.uttId)) { s.uttId = null; detached++; } });
  db.utts = db.utts.filter(u => u.videoId !== vid);
  save(); return { removed: ids.size, detached };
}

// ---------- 진도 / 기록 ----------
export function markStep(uttId, step) {
  const p = db.progress[uttId] || (db.progress[uttId] = { steps: {}, lastAt: 0 });
  if (!p.steps[step]) bump();
  p.steps[step] = Date.now(); p.lastAt = Date.now(); save();
}
export function addAttempt(a) {
  db.attempts.push({ id: uid(), at: Date.now(), ...a });
  if (db.attempts.length > 1500) db.attempts = db.attempts.slice(-1200);
  bump(); save();
}
export const attemptsOf = (uttId, step) => db.attempts.filter(a => a.uttId === uttId && (!step || a.step === step));

// ---------- 저장 표현 ----------
// 중복 기준: 같은 원본 문장 + 같은 레벨, 또는 같은 영어 문장
function normText(t) { return  String(t || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim(); }
export function findDup(item) {
  const t = normText(item.text);
  return db.saved.find(s =>
    (item.uttId && s.uttId === item.uttId && s.kind === item.kind && s.level === (item.level || s.level) && item.kind === 'utt') ||
    (t && normText(s.text) === t));
}
export function saveExpr(item) {
  if (item.kind === 'utt' && !item.text) { const lv = item.level || 'natural'; item.text = item.en?.[lv] || item.en?.natural || ''; item.level = lv; }
  const dup = findDup(item);
  if (dup) return { item: dup, dup: true };
  if (item.uttId && !item.ytId) { const u = utt(item.uttId); const v = u && video(u.videoId); if (v) Object.assign(item, { videoId: v.id, ytId: v.ytId, start: u.start, videoTitle: v.title }); }
  const s = normSaved({ id: uid(), createdAt: Date.now(), ...item, status: 'new' });
  db.saved.unshift(s); save(); return { item: s, dup: false };
}
export function updateSaved(id, patch) { const s = db.saved.find(x => x.id === id); if (!s) return; Object.assign(s, patch, { editedAt: Date.now() }); save(); }
export function deleteSaved(id) { const s = db.saved.find(x => x.id === id); if (s?.audioId) AudioStore.del(s.audioId); db.saved = db.saved.filter(x => x.id !== id); save(); }
export function toggleHard(id) { const s = db.saved.find(x => x.id === id); if (s) { s.status = s.status === 'again' ? 'okay' : 'again'; s.hard = s.status === 'again'; save(); } }
// ---------- 단어·표현 ----------
function normWord(w) {
  const srs = { interval: 0, reps: 0, lapses: 0, due: Date.now(), ...(w.srs || {}) };
  return { id: w.id || uid(), text: String(w.text || '').trim(), ko: w.ko || '', note: w.note || '', q: w.q || '', srcId: w.srcId || null, kind: w.kind || 'expr',
    status: w.status || 'new', srs, history: arrOf(w.history), made: arrOf(w.made), createdAt: w.createdAt || Date.now(), updatedAt: w.updatedAt || 0 };
}
export function saveWord(item) {
  const t = normText(item.text); if (!t) return { item: null, dup: false };
  const dup = db.words.find(w => normText(w.text) === t);
  if (dup) { if (item.ko && !dup.ko) { dup.ko = item.ko; dup.updatedAt = Date.now(); save(); } return { item: dup, dup: true }; }
  const w = normWord({ ...item, id: uid(), createdAt: Date.now(), updatedAt: Date.now() });
  db.words.unshift(w); save(); return { item: w, dup: false };
}
export function updateWord(id, patch) { const w = db.words.find(x => x.id === id); if (w) { Object.assign(w, patch, { updatedAt: Date.now() }); save(); } }
export function deleteWord(id) { db.words = db.words.filter(w => w.id !== id); save(); }
export function rateWord(id, status) {
  const w = db.words.find(x => x.id === id); if (!w) return;
  const r = w.srs; const iv = nextInterval(w, status);
  if (status === 'again') { r.reps = 0; r.lapses++; r.interval = 0; r.due = Date.now() + 10 * 60e3; }
  else { r.reps++; r.interval = iv; r.due = startOfDay(Date.now() + iv * DAY) + 4 * 36e5; }
  w.status = status; w.history.push({ at: Date.now(), status }); w.updatedAt = Date.now(); bump(); save();
}
export const dueWords = () => db.words.filter(w => w.srs.due <= Date.now());
// 저장 문장 안에서 표시한 표현
export function toggleMark(savedId, phrase, on) {
  const s = db.saved.find(x => x.id === savedId); if (!s) return;
  const k = normText(phrase); s.marks = (s.marks || []).filter(m => normText(m) !== k);
  if (on) s.marks.push(phrase.trim());
  s.editedAt = Date.now(); save();
}
export const isSavedUtt = (uttId, level) => db.saved.some(s => s.uttId === uttId && s.kind === 'utt' && (!level || s.level === level));

// ---------- 복습 주기 ----------
// again: 10분 뒤 다시 (오늘 안에) · okay: 1→2→4→8일… · mastered: 4→10→25일…
const DAY = 864e5;
export const STATUS = { again: '다시 복습할래요', okay: '어느 정도 알아요', mastered: '복습완료' };
export function nextInterval(s, status) {
  const iv = s.srs.interval || 0;
  if (status === 'again') return 0;
  if (status === 'okay') return iv < 1 ? 1 : Math.min(60, Math.round(iv * 2));
  return iv < 4 ? 4 : Math.min(180, Math.round(iv * 2.5));
}
// 복습 결과를 고쳐 매길 때(맞힘 → 자동 완료 후 익숙함 선택) 직전 상태로 되돌리기
export function rateSnap(id, words = false) {
  const s = (words ? db.words : db.saved).find(x => x.id === id); if (!s) return null;
  return { srs: { ...s.srs }, status: s.status, n: s.history.length };
}
export function unrate(id, snap, words = false) {
  const s = (words ? db.words : db.saved).find(x => x.id === id); if (!s || !snap) return;
  s.srs = { ...snap.srs }; s.status = snap.status; if (!words) s.hard = s.status === 'again'; s.history = s.history.slice(0, snap.n); save();
}
export function rate(id, status) {
  const s = db.saved.find(x => x.id === id); if (!s) return;
  const r = s.srs; const iv = nextInterval(s, status);
  if (status === 'again') { r.reps = 0; r.lapses++; r.interval = 0; r.due = Date.now() + 10 * 60e3; }
  else { r.reps++; r.interval = iv; r.due = startOfDay(Date.now() + iv * DAY) + 4 * 36e5; }
  s.status = status; s.hard = status === 'again';
  s.history.push({ at: Date.now(), status }); bump(); save();
}
function startOfDay(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
// 예전 4단계 채점 호환
export function grade(id, q) { rate(id, q === 0 ? 'again' : q === 3 ? 'mastered' : 'okay'); }
export const dueList = () => db.saved.filter(s => s.srs.due <= Date.now()).sort((a, b) => ((b.status === 'again') - (a.status === 'again')) || (a.srs.due - b.srs.due));
export const doneToday = () => { const t0 = startOfDay(Date.now()); return db.saved.filter(s => s.history.some(h => h.at >= t0)); };

export function setSetting(k, v) { if (CONTENT_SETTINGS.includes(k) && !gate(k)) return; db.settings[k] = v; save(); }
export function addTalkLog(log) { db.talkLogs.unshift({ id: uid(), at: Date.now(), ...log }); db.talkLogs = db.talkLogs.slice(0, 400); bump(); save(); }
// 통화 기록 요약 (총 통화 시간 중심)
export function callStats() {
  const logs = db.talkLogs.filter(l => l.kind === 'call' || l.sec);
  const total = logs.reduce((n, l) => n + (l.sec || 0), 0);
  let streak = 0; for (let i = 0; i < 400; i++) { const d = new Date(); d.setDate(d.getDate() - i); if (db.days[today(d)]) streak++; else if (i > 0) break; }
  return { total, count: logs.length, longest: Math.max(0, ...logs.map(l => l.sec || 0)), streak, logs };
}
// 날짜별 통화 기록 ('YYYY-MM-DD')
export const callLogs = () => db.talkLogs.filter(l => l.kind === 'call' || l.sec);
export function callDay(day) {
  const logs = callLogs().filter(l => today(new Date(l.at)) === day);
  return { day, logs, total: logs.reduce((n, l) => n + (l.sec || 0), 0) };
}
export function deleteTalkLogs(ids) { const set = new Set(ids); snapshot('통화 기록 삭제'); db.talkLogs = db.talkLogs.filter(l => !set.has(l.id)); save(); }
export const findSavedByText = t => { const k = normText(t); return k ? db.saved.find(s => normText(s.text) === k) || null : null; };
export const findWordByText = t => { const k = normText(t); return k ? db.words.find(w => normText(w.text) === k) || null : null; };
export const callDays = () => new Set(callLogs().map(l => today(new Date(l.at))));
// 내 프로필 (백현이가 부를 이름 · 사진)
export const profile = () => ({ name: '', photo: '', ...(db.settings.profile || {}) });
export function setProfile(patch) { db.settings.profile = { ...profile(), ...patch }; save(); }
// 부르는 말: 받침 있으면 ‘아’, 없으면 ‘야’ (한글 이름) · 영어 이름은 그대로
export function callName(withParticle = true) {
  const n = profile().name.trim(); if (!n) return '';
  if (!withParticle) return n;
  const last = n.charCodeAt(n.length - 1);
  if (last >= 0xAC00 && last <= 0xD7A3) return n + ((last - 0xAC00) % 28 ? '아' : '야');
  return n;
}

// ---------- 백업 / 복원 ----------
export function exportJSON() { return JSON.stringify({ app: 'BAEK TO YOU', exportedAt: new Date().toISOString(), ...getPersonal(), ...(canEdit() ? getContent() : {}), settings: { ...getPersonal().settings, ...(canEdit() ? getContent().settings : {}) } }, null, 2); }
export function importJSON(text, mode = 'replace') {
  const d = JSON.parse(text);
  if (!d || !(Array.isArray(d.saved) || Array.isArray(d.videos))) throw new Error('BAEK TO YOU 백업 파일 형식이 아니에요.');
  const edit = canEdit();
  // 일반 사용자: 공용 콘텐츠(영상·문장)는 건드리지 않고 내 학습 데이터만 복원
  if (!edit) { d.videos = db.videos; d.utts = db.utts; CONTENT_SETTINGS.forEach(k => { if (d.settings) d.settings[k] = db.settings[k]; }); }
  const inc = migrate(d);
  snapshot('백업 복원');
  if (mode === 'replace') db = inc;
  else {
    const vmap = {};
    if (edit) inc.videos.forEach(v => { const ex = db.videos.find(x => x.ytId === v.ytId); if (ex) vmap[v.id] = ex.id; else { db.videos.push(v); vmap[v.id] = v.id; } });
    const uids = new Set(db.utts.map(u => u.id));
    if (edit) inc.utts.forEach(u => { if (!uids.has(u.id)) db.utts.push({ ...u, videoId: vmap[u.videoId] || u.videoId }); });
    const sids = new Set(db.saved.map(s => s.id));
    inc.saved.forEach(s => { if (!sids.has(s.id)) db.saved.push(s); });
    const aids = new Set(db.attempts.map(a => a.id));
    db.attempts = db.attempts.concat(inc.attempts.filter(a => !aids.has(a.id)));
    for (const [k, v] of Object.entries(inc.progress)) if (!db.progress[k]) db.progress[k] = v;
    for (const [k, v] of Object.entries(inc.days)) db.days[k] = Math.max(db.days[k] || 0, v);
    const wids = new Set(db.words.map(w => w.id)); db.words = db.words.concat(inc.words.filter(w => !wids.has(w.id)));
    const lids = new Set(db.talkLogs.map(l => l.id)); db.talkLogs = db.talkLogs.concat(inc.talkLogs.filter(l => !lids.has(l.id))).sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 400);
  }
  save();
}
// 내 학습 데이터만 초기화 (공용 영상·문장은 그대로)
export function resetAll() { snapshot('내 데이터 초기화'); applyPersonal(emptyPersonal()); save(); AudioStore.clear(); window.dispatchEvent(new Event('b2u:reset')); }

// ---------- 공용 콘텐츠 / 개인 학습 데이터 분리 ----------
// · 공용 콘텐츠(모든 사용자 같음 · 관리자만 수정): 영상 · 문장 · 아래 설정
// · 개인 데이터(계정마다 따로): SAVED · 단어 · 학습 진도 · 기록 · 통화 기록 · 개인 설정
export const CONTENT_SETTINGS = ['sttFix', 'customSits', 'hiddenSits', 'hiddenPhotos', 'userPhotos'];
export const LOCAL_ONLY_SETTINGS = ['voiceURI', 'camera']; // 기기마다 다른 값
const PERSONAL_LISTS = ['saved', 'attempts', 'talkLogs', 'words'];

// 권한: Firebase를 쓰는 동안엔 관리자만 콘텐츠 수정 가능 (서버 보안 규칙도 같은 기준)
let role = { cloud: false, admin: false };
let acctKey = (() => { try { return localStorage.getItem('b2u:acct') || localStorage.getItem('b2u:lastUid') || 'guest'; } catch { return 'guest'; } })();
export const setRole = r => { role = { ...role, ...r }; listeners.forEach(fn => fn({ role: true })); };
export const isAdmin = () => role.admin;
export const canEdit = () => !role.cloud || role.admin;
export const accountKey = () => acctKey;
export const setAccountKey = k => { acctKey = k || 'guest'; try { localStorage.setItem('b2u:acct', acctKey); } catch { } };
function gate(what) { if (canEdit()) return true; console.warn('[권한] 관리자만 수정할 수 있어요:', what); return false; }

export function getContent() {
  const settings = {}; CONTENT_SETTINGS.forEach(k => (settings[k] = db.settings[k]));
  return { version: db.version, videos: db.videos, utts: db.utts, settings };
}
export function applyContent(c) {
  const d = migrate({ ...db, videos: c.videos || [], utts: c.utts || [], settings: { ...db.settings, ...pick(c.settings || {}, CONTENT_SETTINGS) } });
  db = d; clearTimeout(saveTimer); flush();
  listeners.forEach(fn => fn({ remote: true, content: true }));
}
export function getPersonal() {
  const settings = { ...db.settings }; CONTENT_SETTINGS.concat(LOCAL_ONLY_SETTINGS).forEach(k => delete settings[k]);
  const out = { version: db.version, progress: db.progress, days: db.days, settings };
  PERSONAL_LISTS.forEach(k => (out[k] = db[k]));
  return out;
}
export function applyPersonal(p) {
  const keep = {}; CONTENT_SETTINGS.concat(LOCAL_ONLY_SETTINGS).forEach(k => (keep[k] = db.settings[k]));
  const base = defaults();
  db = migrate({ ...base, ...(p || {}), videos: db.videos, utts: db.utts, settings: { ...base.settings, ...((p || {}).settings || {}), ...keep } });
  clearTimeout(saveTimer); flush();
  listeners.forEach(fn => fn({ remote: true, personal: true }));
}
export const emptyPersonal = () => { const d = defaults(); const st = { ...d.settings }; CONTENT_SETTINGS.concat(LOCAL_ONLY_SETTINGS).forEach(k => delete st[k]); const out = { version: 2, progress: {}, days: {}, settings: st }; PERSONAL_LISTS.forEach(k => (out[k] = [])); return out; };
export const hasPersonal = p => !!p && (PERSONAL_LISTS.some(k => (p[k] || []).length) || Object.keys(p.progress || {}).length > 0);
// 계정별 개인 데이터 보관 (이 기기) — 계정을 바꿔도 다른 사람 기록이 보이지 않게
const PKEY = k => 'baek-to-you:personal:' + k;
export function stashPersonal(k) { try { localStorage.setItem(PKEY(k), JSON.stringify(getPersonal())); } catch { } }
export function loadStash(k) { try { return JSON.parse(localStorage.getItem(PKEY(k)) || 'null'); } catch { return null; } }
export function dropStash(k) { try { localStorage.removeItem(PKEY(k)); } catch { } }
const pick = (o, keys) => { const r = {}; keys.forEach(k => { if (o[k] !== undefined) r[k] = o[k]; }); return r; };
export const normalize = d => migrate(JSON.parse(JSON.stringify(d || {})));
// 예전 함수 (호환)
export function getShared() { return { ...getContent(), ...getPersonal(), settings: { ...getPersonal().settings, ...getContent().settings } }; }
export function applyShared(data) { applyContent(data); applyPersonal(data); }

// ---------- 문장 JSON 검사 / 추가 / 교체 ----------
// 업로드 전 전체를 검사하고, 오류가 하나라도 있으면 아무것도 바꾸지 않음
export function validateUtts(input) {
  let list = input;
  if (typeof input === 'string') {
    const txt = input.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    if (!txt) return { ok: false, errors: ['내용이 비어 있어요'], items: [] };
    try { list = JSON.parse(txt); } catch (e) { return { ok: false, errors: ['JSON 문법 오류: ' + e.message.slice(0, 80)], items: [] }; }
  }
  if (list && !Array.isArray(list) && Array.isArray(list.utts)) list = list.utts; // {utts:[...]} 형태도 허용
  if (!Array.isArray(list)) return { ok: false, errors: ['배열 형식이어야 해요: [ {...}, {...} ]'], items: [] };
  const errors = [], items = [], warns = [];
  list.forEach((raw, i) => {
    const n = i + 1;
    if (!raw || typeof raw !== 'object') return errors.push(`${n}번: 객체가 아니에요`);
    const start = parseTime(raw.start), end = parseTime(raw.end);
    if (raw.start != null && start == null) errors.push(`${n}번: start 시간 형식 오류 (${raw.start})`);
    if (raw.end != null && end == null) errors.push(`${n}번: end 시간 형식 오류 (${raw.end})`);
    const en = typeof raw.en === 'string' ? { easy: raw.easy || '', natural: raw.en, advanced: raw.advanced || '' }
      : { easy: raw.easy || raw.en?.easy || '', natural: raw.natural || raw.en?.natural || '', advanced: raw.advanced || raw.en?.advanced || '' };
    if (!raw.ko) errors.push(`${n}번: ko(한국어 원문)가 없어요`);
    if (!en.natural && !en.easy && !en.advanced) errors.push(`${n}번: natural(영어 문장)이 없어요`);
    else if (!en.natural) { en.natural = en.easy || en.advanced; warns.push(`${n}번: natural이 없어서 다른 영어 문장을 사용해요`); }
    const s = start ?? 0, e = end ?? 0;
    if (end != null && e <= s) warns.push(`${n}번: end가 start보다 작아 5초 구간으로 맞춰요`);
    items.push({ ...raw, start: s, end: e > s ? e : s + 5, en });
  });
  return { ok: !errors.length && items.length > 0, errors: errors.length ? errors : (items.length ? [] : ['문장이 0개예요']), warns, items };
}
// mode: 'add' | 'replace'
export function applyUtts(videoId, items, mode = 'add') { if (!gate('applyUtts')) return { added: 0, removed: 0, relinked: 0, detached: 0 };
  snapshot(mode === 'replace' ? '문장 교체' : '문장 추가');
  const old = db.utts.filter(u => u.videoId === videoId);
  const fresh = items.map(raw => normUtt({ ...raw, id: uid(), videoId }));
  let relinked = 0, detached = 0;
  if (mode === 'replace') {
    const oldIds = new Set(old.map(u => u.id));
    db.saved.forEach(s => {
      if (!oldIds.has(s.uttId)) return;
      const o = old.find(u => u.id === s.uttId);
      const m = fresh.find(f => f.ko.trim() === (o?.ko || s.ko).trim()) || fresh.find(f => o && Math.abs(f.start - o.start) < 0.6);
      if (m) { s.uttId = m.id; s.start = m.start; relinked++; } else { s.uttId = null; detached++; }
    });
    db.utts = db.utts.filter(u => u.videoId !== videoId).concat(fresh);
  } else db.utts = db.utts.concat(fresh);
  save(); return { added: fresh.length, removed: mode === 'replace' ? old.length : 0, relinked, detached };
}
// 예전 함수 호환
export function bulkUtts(videoId, list) {
  const r = validateUtts(list); if (!r.ok) throw new Error(r.errors[0]);
  return applyUtts(videoId, r.items, 'add').added;
}
export function parseTime(t) {
  if (typeof t === 'number') return isFinite(t) ? t : null;
  if (t == null || t === '') return null;
  const p = String(t).trim().split(':').map(Number);
  if (p.some(isNaN)) return null;
  return p.reduce((a, b) => a * 60 + b, 0);
}
export const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// ---------- IndexedDB: 내 녹음 보관 ----------
export const AudioStore = (() => {
  let dbp;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('baek-to-you-audio', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('a');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction('a', mode); const st = t.objectStore('a'); const q = fn(st); t.oncomplete = () => res(q?.result); t.onerror = () => rej(t.error); }); };
  return {
    put: (id, blob) => tx('readwrite', s => s.put(blob, id)),
    get: id => tx('readonly', s => s.get(id)),
    del: id => tx('readwrite', s => s.delete(id)).catch(() => { }),
    clear: () => tx('readwrite', s => s.clear()).catch(() => { })
  };
})();

// 저장 공간 보호 요청 (Safari/Chrome 지원 시)
try { navigator.storage?.persist?.(); } catch { }
