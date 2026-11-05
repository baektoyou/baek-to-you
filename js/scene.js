// 장면 분석 · 영상 자동 선택 · 사진 매칭 — 무료·오프라인 규칙 기반 (AI 아님)
// · 영상 제목 + 메모(설명) + 장면 태그 + 실제 발화(한국어 대본)에서 키워드를 찾아 장면 태그를 만들어요.
// · 사진 태그는 첨부한 사진을 사람이 보고 미리 달아 둔 값이에요 (장소·옷차림·분위기·시간대).
// · 사진마다 얼굴·머리 영역(box)을 저장해 두고, 화면 비율에 맞춰 그 영역이 절대 잘리지 않게 배치해요.
import * as D from './store.js';

// ---------- 사진 메타데이터 ----------
// box: [x0, y0, x1, y1] 머리카락 끝~턱까지 포함한 영역 (0~1 비율)
const P = (id, w, h, box, tags) => ({ id, src: `photos/${id}.jpg`, w, h, box, tags });
export const PHOTOS = [
  P('bh01', 960, 1280, [0, 0, .85, .75], ['home', 'hoodie', 'mask', 'cozy', 'closeup', 'shy', 'night']),
  P('bh02', 960, 1280, [.08, .28, .48, .55], ['hotel', 'room', 'mirror', 'tee', 'casual', 'morning', 'day']),
  P('bh03', 736, 1018, [.04, 0, .96, .68], ['home', 'hoodie', 'glasses', 'cozy', 'closeup', 'smile', 'night']),
  P('bh04', 768, 1024, [.22, 0, .78, .68], ['plane', 'travel', 'mask', 'tee', 'day', 'calm']),
  P('bh05', 736, 981, [.55, .38, .97, .75], ['hotel', 'robe', 'mirror', 'night', 'calm']),
  P('bh06', 622, 1024, [0, 0, .67, .36], ['outdoor', 'walk', 'night', 'hoodie', 'glasses']),
  P('bh07', 768, 1024, [.15, .17, .47, .40], ['home', 'room', 'pajama', 'mirror', 'cozy', 'night']),
  P('bh08', 736, 1178, [.48, .15, .82, .36], ['hotel', 'suit', 'mirror', 'event', 'evening', 'chic']),
  P('bh09', 736, 981, [0, .02, .6, .55], ['suit', 'mirror', 'event', 'evening', 'smile', 'chic']),
  P('bh10', 720, 1280, [0, 0, .95, .75], ['bed', 'night', 'sleepy', 'closeup', 'cozy', 'home']),
  P('bh11', 736, 949, [.27, .03, .75, .5], ['car', 'night', 'jacket', 'commute']),
  P('bh12', 736, 968, [.2, 0, 1, .55], ['bed', 'sleepy', 'closeup', 'tee', 'morning', 'cozy', 'home']),
  P('bh13', 736, 981, [.13, 0, .68, .48], ['home', 'room', 'shirt', 'casual', 'day', 'playful']),
  P('bh14', 687, 1220, [.41, .17, .86, .65], ['car', 'night', 'calm', 'commute']),
  P('bh15', 736, 414, [.35, 0, .8, .6], ['eat', 'restaurant', 'day', 'playful']),
  P('bh16', 736, 981, [.2, .15, .5, .35], ['home', 'shirt', 'mirror', 'day', 'casual']),
  P('bh17', 736, 1200, [0, 0, .95, .6], ['outdoor', 'walk', 'night', 'exercise', 'tee']),
  P('bh18', 949, 1200, [.53, .13, .97, .53], ['practice', 'studio', 'playful', 'day', 'shirt']),
  P('bh19', 736, 1252, [.37, .31, .63, .48], ['home', 'room', 'mirror', 'hoodie', 'casual', 'day', 'calm']),
  P('bh20', 905, 1132, [.42, .26, .7, .42], ['studio', 'music', 'practice', 'knit', 'mirror', 'work']),
  P('bh21', 736, 736, [.23, .02, .87, .83], ['eat', 'restaurant', 'night', 'evening', 'playful']),
  P('bh22', 1027, 1280, [.1, .34, .43, .6], ['plane', 'travel', 'knit', 'mirror', 'day']),
  P('bh23', 720, 1280, [.46, .37, .68, .5], ['home', 'room', 'cozy', 'calm', 'night']),
  P('bh24', 736, 871, [.3, 0, .83, .62], ['mask', 'jacket', 'outdoor', 'commute', 'day']),
  P('bh25', 680, 1280, [.05, .21, .4, .43], ['suit', 'cafe', 'mirror', 'evening', 'chic', 'event']),
  P('bh26', 720, 1280, [.37, .21, .9, .6], ['bed', 'night', 'sleepy', 'calm', 'home']),
  P('bh27', 720, 1280, [.32, .12, .77, .4], ['cafe', 'drink', 'tee', 'casual', 'evening']),
  P('bh28', 736, 981, [.23, .14, .63, .4], ['outdoor', 'walk', 'night', 'jacket'])
];
export const photo = id => PHOTOS.find(p => p.id === id) || null;

// ---------- 장면 키워드 ----------
const KW = {
  bed: ['침대', '누워', '누웠', '이불', '잘 자', '잘자', '자기 전', '졸려', '졸리', '잠이', '잠 안', '베개', 'bed', 'sleep'],
  night: ['밤', '새벽', '자기 전', '늦은', '야식', '잘 자', '잘자', '굿나잇', '불 끄', 'night', 'midnight'],
  morning: ['아침', '모닝', '일어났', '기상', '출근', 'morning'],
  day: ['점심', '오후', '낮에', 'lunch', 'afternoon'],
  evening: ['저녁', '퇴근', '노을', 'evening', 'dinner'],
  eat: ['먹', '밥', '배고', '맛있', '라면', '치킨', '먹방', '식사', '야식', '고기', '요리', 'eat', 'food', 'mukbang'],
  cafe: ['커피', '카페', '아아', '라떼', 'coffee', 'cafe'],
  drink: ['마시', '음료', '술', '맥주', '와인', 'drink'],
  car: ['운전', '드라이브', '차 안', '차에서', '차 타', '이동 중', '이동중', 'driving', ' car'],
  plane: ['비행기', '공항', '출국', '입국', 'plane', 'airport', 'flight'],
  travel: ['여행', '해외', '투어', 'travel', 'tour', 'trip'],
  hotel: ['호텔', '숙소', 'hotel'],
  outdoor: ['산책', '밖에', '공원', '바람', '걷고', '걸어', 'walk', 'outside'],
  exercise: ['운동', '헬스', '러닝', 'workout', 'gym'],
  studio: ['작업실', '녹음', '스튜디오', 'studio', 'recording'],
  music: ['노래', '피아노', '앨범', '신곡', 'music', 'song', 'piano'],
  practice: ['연습', '안무', '리허설', 'practice', 'rehearsal'],
  event: ['시상식', '행사', '화보', '촬영', '대기실', '백스테이지', '콘서트', '공연', '팬미팅', '스케줄', 'concert', 'backstage', 'award'],
  suit: ['정장', '슈트', 'suit'],
  home: ['집에', '집이', '방에', '거실', '휴가', '쉬는', 'home'],
  cozy: ['편하', '포근', '따뜻', 'cozy'],
  glasses: ['안경', 'glasses'], mask: ['마스크', 'mask'], hoodie: ['후드', 'hoodie']
};
const TIMES = ['morning', 'day', 'evening', 'night'];
// 사진 매칭 가중치: 장소 > 옷차림 > 분위기 > 시간
const W = { bed: 4, car: 4, plane: 4, eat: 4, studio: 3.5, practice: 3, hotel: 3.5, outdoor: 3.5, cafe: 3.5, drink: 2, event: 3, suit: 3, travel: 2.5, exercise: 2.5, music: 2, home: 2, glasses: 2, mask: 2, hoodie: 2, cozy: 1.2, morning: 1, day: 1, evening: 1, night: 1.2 };
const LIVE = /live|라이브|위버스|weverse|버블|bubble|브이앱|vlive|인스타|instagram|방송/i;

export function timeBucket(d = new Date()) {
  const h = d.getHours();
  return h >= 5 && h < 11 ? 'morning' : h < 17 ? 'day' : h < 21 ? 'evening' : 'night';
}
export const TIME_KO = { morning: '아침', day: '낮', evening: '저녁', night: '밤' };

function count(text, words) { let n = 0; const t = ' ' + text.toLowerCase() + ' '; for (const w of words) { let i = t.indexOf(w.toLowerCase()); while (i >= 0) { n++; i = t.indexOf(w.toLowerCase(), i + w.length); } } return n; }
// 장면 태그: {tag: 점수} — 제목·메모·장면 태그는 3배 가중치
export function sceneOf(v) {
  const utts = D.uttsOf(v.id);
  const head = [v.title, v.desc, v.scene].filter(Boolean).join(' ');
  const body = utts.map(u => u.ko + ' ' + (u.topics || []).join(' ')).join(' ');
  const s = {};
  for (const [tag, words] of Object.entries(KW)) {
    const n = count(head, words) * 3 + Math.min(6, count(body, words));
    if (n) s[tag] = n;
  }
  // 직접 적은 장면 태그(영문 키)도 그대로 인정
  String(v.scene || '').split(/[,\s]+/).map(x => x.trim().toLowerCase()).filter(x => KW[x]).forEach(x => (s[x] = (s[x] || 0) + 6));
  utts.forEach(u => (u.topics || []).forEach(t => { if (t === 'food') s.eat = (s.eat || 0) + 1; if (t === 'sleep') s.bed = (s.bed || 0) + 1; if (t === 'music') s.music = (s.music || 0) + 1; if (t === 'travel') s.travel = (s.travel || 0) + 1; }));
  if (s.bed && !s.night) s.night = 1;
  return s;
}
export const topTags = (s, n = 4) => Object.entries(s).sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]);
export const timeOfScene = s => TIMES.filter(t => s[t]).sort((a, b) => s[b] - s[a])[0] || null;
export const isLive = v => LIVE.test((v.title || '') + ' ' + (v.desc || ''));

// 통화 콘셉트: 영상 장면 → 짧은 한 줄
const CONCEPT = [
  ['bed', '잠들기 전 백현이랑'], ['eat', '밥 먹는 백현이랑'], ['cafe', '카페에 있는 백현이랑'], ['drink', '한잔하는 백현이랑'], ['car', '이동 중인 백현이랑'],
  ['plane', '여행 가는 백현이랑'], ['travel', '여행 중인 백현이랑'], ['hotel', '숙소에서 쉬는 백현이랑'], ['studio', '작업하다 쉬는 백현이랑'], ['practice', '연습 끝난 백현이랑'],
  ['music', '노래 얘기하는 백현이랑'], ['event', '스케줄 끝난 백현이랑'], ['outdoor', '산책하는 백현이랑'], ['exercise', '운동 끝난 백현이랑'], ['home', '집에서 쉬는 백현이랑']
];
const BY_TIME = { morning: '아침에 백현이랑', day: '낮에 백현이랑', evening: '저녁에 백현이랑', night: '늦은 밤 백현이랑' };
export function conceptOf(v, scene = sceneOf(v)) {
  const t = timeOfScene(scene);
  const hit = CONCEPT.filter(([k]) => scene[k]).sort((a, b) => scene[b[0]] - scene[a[0]])[0];
  if (hit) return hit[1];
  return BY_TIME[t || timeBucket()];
}

// ---------- 통화에 쓸 영상 자동 선택 ----------
// 문장이 3개 이상 있는 영상 중: 지금 시간대와 맞는 장면 + 라이브 영상 + 최근에 통화 안 한 영상 우선
export function callable(v) { return D.uttsOf(v.id).filter(u => u.ko && (u.en?.natural || u.en?.easy || u.en?.advanced)).length >= 3; }
export function pickVideo(now = new Date()) {
  const vids = D.get().videos.filter(callable); if (!vids.length) return null;
  const tb = timeBucket(now); const logs = D.get().talkLogs || [];
  const last = id => Math.max(0, ...logs.filter(l => l.videoId === id).map(l => l.at || 0));
  const scored = vids.map(v => {
    const s = sceneOf(v); const t = timeOfScene(s);
    let sc = 0;
    if (t === tb) sc += 4; else if (t && (tb === 'night' && t === 'evening' || tb === 'evening' && t === 'night')) sc += 1.5;
    if (tb === 'night' && s.bed) sc += 2;
    if ((tb === 'day' || tb === 'evening') && s.eat) sc += 1;
    if (isLive(v)) sc += 2;
    const ago = Date.now() - last(v.id);
    if (ago < 864e5) sc -= 3; else if (ago < 3 * 864e5) sc -= 1;
    return { v, sc };
  }).sort((a, b) => b.sc - a.sc);
  // 지금 시간대에 어울리는 후보들 중에서 랜덤 (점수가 높을수록 잘 뽑힘)
  const pool = scored.filter(x => x.sc >= scored[0].sc - 2.5);
  const w = pool.map(x => Math.exp((x.sc - scored[0].sc) / 1.5)); let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i].v; }
  return pool[0].v;
}

// ---------- 사진 매칭: 영상 장면과 가장 비슷한 사진 ----------
export function pickPhoto(v, now = new Date()) {
  if (v?.photo && photo(v.photo)) return { p: photo(v.photo), why: ['직접 고른 사진'] };
  const s = v ? sceneOf(v) : {}; const tb = timeOfScene(s) || timeBucket(now);
  const recent = (() => { try { return JSON.parse(localStorage.getItem('b2u:recentPhotos') || '[]'); } catch { return []; } })();
  const ranked = PHOTOS.map(p => {
    let sc = 0; const why = [];
    for (const t of p.tags) if (s[t] && !TIMES.includes(t)) { sc += (W[t] || 1) * Math.min(2, 1 + Math.log2(s[t]) / 3); why.push(t); }
    if (p.tags.includes(tb)) sc += W[tb] || 1; // 시간대는 보조 점수
    const r = recent.indexOf(p.id); if (r >= 0) sc -= (3 - r) * 0.6;
    return { p, sc: sc + Math.random() * 0.3, why };
  }).sort((a, b) => b.sc - a.sc);
  return ranked[0];
}
export function rememberPhoto(id) {
  try { const r = JSON.parse(localStorage.getItem('b2u:recentPhotos') || '[]').filter(x => x !== id); r.unshift(id); localStorage.setItem('b2u:recentPhotos', JSON.stringify(r.slice(0, 3))); } catch { }
}

// ---------- 얼굴이 잘리지 않는 사진 배치 ----------
// 화면을 꽉 채우되(cover), 그러면 머리가 잘리는 사진은 그만큼만 축소하고 남는 곳은 블러 배경이 채워요.
// focusY: 얼굴 중심을 화면 높이의 몇 % 지점에 둘지
export function fitPhoto(p, W, H, { focusY = 0.4, pad = 0.04 } = {}) {
  const [x0, y0, x1, y1] = p.box;
  const b = [Math.max(0, x0 - pad), Math.max(0, y0 - pad * 1.5), Math.min(1, x1 + pad), Math.min(1, y1 + pad)];
  const bw = (b[2] - b[0]) * p.w, bh = (b[3] - b[1]) * p.h;
  const cover = Math.max(W / p.w, H / p.h);
  const fit = Math.min(W / bw, H / bh);
  const s = Math.min(cover, fit);
  const iw = p.w * s, ih = p.h * s;
  const cx = (b[0] + b[2]) / 2 * iw, cy = (b[1] + b[3]) / 2 * ih;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const place = (size, view, c, f, lo, hi) => {
    if (size <= view) return clamp(view * f - c, 0, view - size); // 사진 전체가 보임 → 얼굴만 원하는 위치 쪽으로
    let v = view * f - c; // 얼굴 중심을 원하는 위치에
    v = clamp(v, -lo * size, view - hi * size); // 머리 영역이 화면 밖으로 나가지 않게
    return clamp(v, view - size, 0); // 빈 곳 없이 화면을 채우게
  };
  const left = place(iw, W, cx, 0.5, b[0], b[2]);
  const top = place(ih, H, cy, focusY, b[1], b[3]);
  return { width: iw, height: ih, left, top, filled: s >= cover - 0.001 };
}
// el(.photo-fit) 안에 사진 + 블러 배경을 그리고, 크기가 바뀌면 다시 배치
export function mountPhoto(el, p, opt = {}) {
  el.classList.add('photo-fit');
  el.innerHTML = `<div class="pf-bg" style="background-image:url('${p.src}')"></div><img class="pf-img" src="${p.src}" alt="" decoding="async" draggable="false">`;
  const img = el.querySelector('.pf-img');
  const lay = () => {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    const f = fitPhoto(p, r.width, r.height, opt);
    Object.assign(img.style, { width: f.width + 'px', height: f.height + 'px', left: f.left + 'px', top: f.top + 'px' });
    el.classList.toggle('pf-full', f.filled);
    const [x0, y0, x1, y1] = p.box;
    img.style.transformOrigin = `${((x0 + x1) / 2) * 100}% ${((y0 + y1) / 2) * 100}%`;
  };
  lay();
  const ro = 'ResizeObserver' in window ? new ResizeObserver(lay) : null; ro?.observe(el);
  window.addEventListener('orientationchange', lay);
  return () => { ro?.disconnect(); window.removeEventListener('orientationchange', lay); };
}

export const TAG_KO = { bed: '침대', night: '밤', morning: '아침', day: '낮', evening: '저녁', eat: '식사', cafe: '카페', drink: '음료', car: '차 안', plane: '비행기', travel: '여행', hotel: '숙소', outdoor: '야외', exercise: '운동', studio: '작업실', music: '음악', practice: '연습', event: '스케줄', suit: '정장', home: '집', cozy: '편안함', glasses: '안경', mask: '마스크', hoodie: '후드티' };
