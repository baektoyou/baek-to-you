// 기기 간 데이터 병합 (3-way) — 순수 함수, 네트워크와 무관
// local: 이 기기 / remote: 클라우드 / base: 마지막으로 두 쪽이 같았던 상태 (없으면 첫 동기화)
// · 첫 동기화(base 없음): 양쪽을 모두 합침 → 어떤 데이터도 지워지지 않음
// · 이후: 한쪽에서만 바뀐 항목은 그 변경을 따르고, 양쪽 다 바뀌면 더 최근 것을 사용
// · 삭제: 한쪽에서 지웠고 다른 쪽은 그대로일 때만 삭제 (다른 쪽에서 고쳤다면 남김)
const LISTS = ['videos', 'utts', 'saved', 'words', 'attempts', 'talkLogs'];
const j = v => JSON.stringify(v);

function stamp(x) {
  if (!x) return 0;
  const h = Array.isArray(x.history) && x.history.length ? x.history[x.history.length - 1].at || 0 : 0;
  return Math.max(x.updatedAt || 0, x.editedAt || 0, h, x.at || 0, x.addedAt || 0, x.createdAt || 0);
}
function mergeList(L = [], R = [], B) {
  const lm = new Map(L.map(x => [x.id, x])), rm = new Map(R.map(x => [x.id, x])), bm = B ? new Map(B.map(x => [x.id, x])) : null;
  const ids = [...new Set([...lm.keys(), ...rm.keys()])];
  const out = [];
  for (const id of ids) {
    const l = lm.get(id), r = rm.get(id), b = bm?.get(id);
    if (l && r) {
      if (j(l) === j(r)) out.push(l);
      else if (b && j(l) === j(b)) out.push(r);
      else if (b && j(r) === j(b)) out.push(l);
      else out.push(stamp(r) > stamp(l) ? r : l);
    } else if (l) {
      if (b && j(l) === j(b)) continue; // 다른 기기에서 삭제됨
      out.push(l);
    } else if (r) {
      if (b && j(r) === j(b)) continue; // 이 기기에서 삭제됨
      out.push(r);
    }
  }
  return out;
}
function mergeSettings(L = {}, R = {}, B) {
  const out = {};
  for (const k of new Set([...Object.keys(L), ...Object.keys(R)])) {
    const l = L[k], r = R[k];
    if (j(l) === j(r) || r === undefined) out[k] = l;
    else if (l === undefined) out[k] = r;
    else if (B && j(l) === j(B[k])) out[k] = r;
    else out[k] = l;
  }
  return out;
}
function mergeProgress(L = {}, R = {}) {
  const out = {};
  for (const k of new Set([...Object.keys(L), ...Object.keys(R)])) {
    const l = L[k], r = R[k];
    if (!l || !r) { out[k] = l || r; continue; }
    const steps = { ...l.steps };
    for (const [s, t] of Object.entries(r.steps || {})) steps[s] = Math.max(steps[s] || 0, t || 0);
    out[k] = { steps, lastAt: Math.max(l.lastAt || 0, r.lastAt || 0) };
  }
  return out;
}
const normText = t => String(t || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();

export function mergeData(local, remote, base) {
  if (!remote) return local;
  const out = { version: Math.max(local.version || 0, remote.version || 0) };
  for (const k of LISTS) out[k] = mergeList(local[k], remote[k], base?.[k]);
  out.progress = mergeProgress(local.progress, remote.progress);
  out.days = { ...remote.days }; for (const [d, n] of Object.entries(local.days || {})) out.days[d] = Math.max(out.days[d] || 0, n);
  out.settings = mergeSettings(local.settings, remote.settings, base?.settings);

  // 같은 YouTube 영상을 두 기기에서 따로 추가한 경우 → 하나로 합치고 문장 연결을 옮김
  const byYt = new Map(), remap = {};
  out.videos.sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0) || (a.id < b.id ? -1 : 1)).forEach(v => {
    const keep = byYt.get(v.ytId); if (keep) remap[v.id] = keep.id; else byYt.set(v.ytId, v);
  });
  if (Object.keys(remap).length) {
    out.videos = out.videos.filter(v => !remap[v.id]);
    out.utts = out.utts.map(u => remap[u.videoId] ? { ...u, videoId: remap[u.videoId] } : u);
    out.saved = out.saved.map(s => remap[s.videoId] ? { ...s, videoId: remap[s.videoId] } : s);
  }
  // 같은 표현을 두 기기에서 따로 저장한 경우 → 기록이 많은 쪽 하나만
  const seen = new Map();
  out.saved.forEach(s => {
    const key = `${s.kind}|${s.level}|${s.uttId || ''}|${normText(s.text || s.en?.natural)}`;
    const o = seen.get(key);
    if (!o) seen.set(key, s);
    else { const better = (s.history?.length || 0) - (o.history?.length || 0) || (s.id < o.id ? 1 : -1); if (better > 0) seen.set(key, s); }
  });
  const keepIds = new Set([...seen.values()].map(s => s.id));
  out.saved = out.saved.filter(s => keepIds.has(s.id));

  // 정렬
  out.videos.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  out.saved.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  out.attempts.sort((a, b) => (a.at || 0) - (b.at || 0)); if (out.attempts.length > 1500) out.attempts = out.attempts.slice(-1200);
  out.talkLogs.sort((a, b) => (b.at || 0) - (a.at || 0)); out.talkLogs = out.talkLogs.slice(0, 400);
  out.words.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return out;
}
export const sameData = (a, b) => j(a) === j(b);
