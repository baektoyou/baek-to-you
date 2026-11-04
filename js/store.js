// BAEK TO YOU — 데이터 저장소 (localStorage + IndexedDB 녹음 보관)
const KEY = 'baek-to-you:v1';

const defaults = () => ({
  version: 1,
  videos: [],      // {id, ytId, title, addedAt}
  utts: [],        // 발화
  saved: [],       // 저장 표현 (SRS)
  attempts: [],    // 말하기 기록
  progress: {},    // uttId -> {steps:{}, lastAt}
  talkLogs: [],    // TALK 세션 요약
  days: {},        // 'YYYY-MM-DD' -> 활동 수
  settings: { voiceURI: '', rate: 0.95, talkShowEn: false, talkCaption: true, camera: false, sttFix: '' }
});

let db = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    return migrate(JSON.parse(raw));
  } catch (e) { console.warn('load fail', e); return defaults(); }
}
function migrate(d) {
  const base = defaults();
  const out = { ...base, ...d };
  out.settings = { ...base.settings, ...(d.settings || {}) };
  out.utts = (out.utts || []).map(normUtt);
  return out;
}
export function normUtt(u) {
  return {
    id: u.id || uid(), videoId: u.videoId, start: +u.start || 0, end: +u.end || (+u.start || 0) + 5,
    ko: u.ko || '', en: { easy: u.en?.easy || '', natural: u.en?.natural || '', advanced: u.en?.advanced || '' },
    alts: arr(u.alts), pattern: u.pattern || '', topics: arr(u.topics), emotion: u.emotion || '',
    type: u.type || 'statement', keywords: arr(u.keywords), hint: u.hint || '', replies: arr(u.replies),
    createdAt: u.createdAt || Date.now()
  };
}
function arr(v) { return Array.isArray(v) ? v.filter(Boolean).map(String) : (typeof v === 'string' && v ? v.split(',').map(s => s.trim()).filter(Boolean) : []); }

let saveTimer;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) { alert('저장 공간이 부족해요. SETTINGS에서 백업 후 기록을 정리해주세요.'); }
  }, 60);
  listeners.forEach(fn => fn());
}
export const onChange = fn => listeners.add(fn);
export const get = () => db;
export function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }
export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function bump() { const t = today(); db.days[t] = (db.days[t] || 0) + 1; }

// ---------- 영상 ----------
export function addVideo(ytId, title) {
  if (db.videos.some(v => v.ytId === ytId)) return db.videos.find(v => v.ytId === ytId);
  const v = { id: uid(), ytId, title: title || 'YouTube 영상', addedAt: Date.now() };
  db.videos.unshift(v); save(); return v;
}
export function updateVideo(id, patch) { const v = db.videos.find(x => x.id === id); if (v) { Object.assign(v, patch); save(); } }
export function deleteVideo(id) {
  const ids = new Set(db.utts.filter(u => u.videoId === id).map(u => u.id));
  db.videos = db.videos.filter(v => v.id !== id);
  db.utts = db.utts.filter(u => u.videoId !== id);
  db.saved.forEach(s => { if (ids.has(s.uttId)) s.uttId = null; });
  save();
}
export const video = id => db.videos.find(v => v.id === id);
export const uttsOf = vid => db.utts.filter(u => u.videoId === vid).sort((a, b) => a.start - b.start);
export const utt = id => db.utts.find(u => u.id === id);

export function upsertUtt(u) {
  const n = normUtt(u);
  const i = db.utts.findIndex(x => x.id === n.id);
  if (i >= 0) db.utts[i] = n; else db.utts.push(n);
  save(); return n;
}
export function deleteUtt(id) { db.utts = db.utts.filter(u => u.id !== id); db.saved.forEach(s => { if (s.uttId === id) s.uttId = null; }); save(); }

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

// ---------- 저장 표현 + 간격 반복(SM-2 단순화) ----------
export function saveExpr(item) {
  const dup = db.saved.find(s => s.kind === item.kind && ((item.uttId && s.uttId === item.uttId && s.kind !== 'mine') || (s.text && s.text === item.text && s.ko === item.ko && !item.uttId)));
  if (dup) return { item: dup, dup: true };
  const s = {
    id: uid(), kind: 'utt', uttId: null, ko: '', en: { easy: '', natural: '', advanced: '' }, text: '', pattern: '', note: '',
    createdAt: Date.now(), hard: false, audioId: null,
    srs: { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: Date.now() }, history: [], ...item
  };
  db.saved.unshift(s); save(); return { item: s, dup: false };
}
export function deleteSaved(id) { const s = db.saved.find(x => x.id === id); if (s?.audioId) AudioStore.del(s.audioId); db.saved = db.saved.filter(x => x.id !== id); save(); }
export function toggleHard(id) { const s = db.saved.find(x => x.id === id); if (s) { s.hard = !s.hard; save(); } }
export const isSavedUtt = uttId => db.saved.some(s => s.uttId === uttId && s.kind === 'utt');

const DAY = 864e5;
export function grade(id, q) { // q: 0 again, 1 hard, 2 good, 3 easy
  const s = db.saved.find(x => x.id === id); if (!s) return;
  const r = s.srs;
  if (q === 0) { r.reps = 0; r.lapses++; r.interval = 0; r.ease = Math.max(1.3, r.ease - 0.2); r.due = Date.now() + 10 * 60e3; s.hard = true; }
  else {
    r.ease = Math.max(1.3, r.ease + [0, -0.15, 0, 0.15][q]);
    if (r.reps === 0) r.interval = q === 3 ? 3 : 1;
    else if (r.reps === 1) r.interval = q === 1 ? 2 : (q === 3 ? 6 : 4);
    else r.interval = Math.round(r.interval * (q === 1 ? 1.2 : r.ease) * (q === 3 ? 1.3 : 1));
    r.reps++; r.due = Date.now() + r.interval * DAY;
    if (q >= 2 && r.reps >= 3) s.hard = false;
    if (q === 1) s.hard = true;
  }
  s.history.push({ at: Date.now(), q }); bump(); save();
}
export const dueList = () => db.saved.filter(s => s.srs.due <= Date.now()).sort((a, b) => (b.hard - a.hard) || (a.srs.due - b.srs.due));

export function setSetting(k, v) { db.settings[k] = v; save(); }

export function addTalkLog(log) { db.talkLogs.unshift(log); db.talkLogs = db.talkLogs.slice(0, 30); bump(); save(); }

// ---------- 백업 / 복원 ----------
export function exportJSON() { return JSON.stringify({ app: 'BAEK TO YOU', exportedAt: new Date().toISOString(), ...db }, null, 2); }
export function importJSON(text, mode = 'replace') {
  const d = JSON.parse(text);
  if (!d || !Array.isArray(d.videos) || !Array.isArray(d.utts)) throw new Error('BAEK TO YOU 백업 파일 형식이 아니에요.');
  const inc = migrate(d);
  if (mode === 'replace') db = inc;
  else {
    const have = new Set(db.videos.map(v => v.ytId));
    const vmap = {};
    inc.videos.forEach(v => { const ex = db.videos.find(x => x.ytId === v.ytId); if (ex) vmap[v.id] = ex.id; else { db.videos.push(v); vmap[v.id] = v.id; have.add(v.ytId); } });
    const uids = new Set(db.utts.map(u => u.id));
    inc.utts.forEach(u => { if (!uids.has(u.id)) db.utts.push({ ...u, videoId: vmap[u.videoId] || u.videoId }); });
    const sids = new Set(db.saved.map(s => s.id));
    inc.saved.forEach(s => { if (!sids.has(s.id)) db.saved.push(s); });
    db.attempts = db.attempts.concat(inc.attempts || []);
  }
  save();
}
export function resetAll() { db = defaults(); save(); AudioStore.clear(); }

// 발화 일괄 추가 (JSON 배열)
export function bulkUtts(videoId, list) {
  if (!Array.isArray(list)) throw new Error('JSON 배열 형식이어야 해요: [ {...}, {...} ]');
  let n = 0;
  list.forEach(raw => {
    const start = parseTime(raw.start), end = parseTime(raw.end);
    if (!raw.ko && !raw.en) return;
    const en = typeof raw.en === 'string' ? { easy: '', natural: raw.en, advanced: '' } : { easy: raw.easy || raw.en?.easy, natural: raw.natural || raw.en?.natural, advanced: raw.advanced || raw.en?.advanced };
    db.utts.push(normUtt({ ...raw, id: uid(), videoId, start, end: end > start ? end : start + 5, en })); n++;
  });
  save(); return n;
}
export function parseTime(t) {
  if (typeof t === 'number') return t;
  if (!t) return 0;
  const p = String(t).trim().split(':').map(Number);
  if (p.some(isNaN)) return 0;
  return p.reduce((a, b) => a * 60 + b, 0);
}
export const fmt = s => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// ---------- IndexedDB: 내 녹음 보관 (APPLY 문장) ----------
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
