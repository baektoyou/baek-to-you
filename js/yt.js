// YouTube 공식 IFrame Player API 래퍼 — 구간 재생
let apiP;
export function loadAPI() {
  if (apiP) return apiP;
  apiP = new Promise(res => {
    if (window.YT?.Player) return res(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); res(window.YT); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true;
    s.onerror = () => { apiP = null; res(null); };
    document.head.appendChild(s);
  });
  return apiP;
}

export function parseYouTubeId(url) {
  url = (url || '').trim();
  if (/^[\w-]{11}$/.test(url)) return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1, 12);
    if (u.searchParams.get('v')) return u.searchParams.get('v').slice(0, 11);
    const m = u.pathname.match(/\/(shorts|embed|live|v)\/([\w-]{11})/); if (m) return m[2];
  } catch { }
  return null;
}
export const thumb = id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

// 제목: oEmbed (CORS 허용 시) → noembed → null
export async function fetchTitle(id) {
  const url = `https://www.youtube.com/watch?v=${id}`;
  for (const ep of [`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, `https://noembed.com/embed?url=${encodeURIComponent(url)}`]) {
    try { const r = await fetch(ep); if (r.ok) { const j = await r.json(); if (j.title) return j.title; } } catch { }
  }
  return null;
}

export class Player {
  constructor(el, { onState, onReady, controls = 1 } = {}) {
    this.el = el; this.onState = onState; this.ready = false; this.seg = null; this.loop = false; this._poll = null; this.vid = null;
    this.readyP = loadAPI().then(YT => new Promise(res => {
      if (!YT) { el.innerHTML = '<div class="yt-fail">YouTube를 불러오지 못했어요.<br>네트워크를 확인해주세요.</div>'; return res(false); }
      const div = document.createElement('div'); el.appendChild(div);
      this.p = new YT.Player(div, {
        width: '100%', height: '100%',
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, controls, fs: 0, iv_load_policy: 3, cc_load_policy: 0, origin: location.origin },
        events: {
          onReady: () => { this.ready = true; onReady?.(); res(true); },
          onStateChange: e => this._state(e.data),
          onError: e => { this.onState?.('error', e.data); }
        }
      });
    }));
  }
  _state(s) {
    const map = { '-1': 'unstarted', 0: 'ended', 1: 'playing', 2: 'paused', 3: 'buffering', 5: 'cued' };
    const name = map[s] || s;
    this.state = name;
    if (name === 'playing') { this._startPoll(); this._noCC(); }
    if (name === 'ended' && this.seg) this._segEnd();
    this.onState?.(name);
  }
  // 유튜브 자막은 항상 끔 (계정 설정에서 자막을 켜 둔 경우도)
  _noCC() { try { this.p.unloadModule?.('captions'); this.p.unloadModule?.('cc'); this.p.setOption?.('captions', 'track', {}); } catch { } }
  _startPoll() {
    clearInterval(this._poll);
    this._poll = setInterval(() => {
      if (!this.seg || !this.p?.getCurrentTime) return;
      const t = this.p.getCurrentTime();
      this.onTime?.(t);
      const seg = this.seg;
      // 이동(seek) 직후엔 예전 위치 시간이 잠깐 보고돼요 → 구간 안의 시간을 한 번 확인한 뒤부터만 끝을 판단
      if (!seg.armed) { if (t >= seg.start - 1.5 && t < seg.end) seg.armed = true; else return; }
      if (this.state !== 'playing') return;
      if (t >= seg.end) this._segEnd();
    }, 60);
  }
  _segEnd() {
    const seg = this.seg; if (!seg) return;
    if (this.loop) { this.p.seekTo(seg.start, true); this.p.playVideo(); return; }
    clearInterval(this._poll); this.p.pauseVideo?.(); this.seg = null;
    seg.resolve?.('ended');
  }
  // 구간 재생 → Promise('ended'|'blocked'|'stopped')
  // tail: 자막 끝 시간이 실제 말보다 조금 빠른 경우가 많아서 끝에 여유를 둠 (문장 중간 끊김 방지)
  async playSegment(ytId, start, end, { tail = 0.35 } = {}) {
    await this.readyP; if (!this.p) return 'error';
    if (this.seg) { this.seg.resolve?.('stopped'); }
    let resolve; const done = new Promise(r => (resolve = r));
    this.seg = { start, end: end + tail, resolve, armed: false };
    if (this.vid !== ytId) { this.vid = ytId; this.p.loadVideoById({ videoId: ytId, startSeconds: start }); }
    else { this.p.seekTo(start, true); this.p.playVideo(); }
    // iOS가 자동 재생을 막으면 사용자 탭이 필요
    // 소리 있는 자동재생이 막히면 → 음소거로 먼저 재생(iOS 허용) · 첫 터치에 소리 켜기
    setTimeout(() => {
      if (!this.seg || this.state === 'playing' || this.state === 'buffering') return;
      try { this.p.mute(); this.p.playVideo(); this.mutedAuto = true; this.onState?.('muted'); } catch { this.onState?.('blocked'); }
    }, 1200);
    return done;
  }
  // 영상만 잠깐 멈춤 (구간 정보는 유지 → resume으로 이어서 재생)
  unmute() { if (this.mutedAuto) { try { this.p.unMute(); this.p.setVolume?.(100); } catch { } this.mutedAuto = false; this.onState?.('unmuted'); } }
  pause() { this.p?.pauseVideo?.(); }
  resume() { if (this.p?.playVideo) { this.p.playVideo(); return true; } return false; }
  get playing() { return this.state === 'playing' || this.state === 'buffering'; }
  cue(ytId, start = 0) { this.readyP.then(ok => { if (!ok) return; this.vid = ytId; this.p.cueVideoById({ videoId: ytId, startSeconds: start }); }); }
  stop() { if (this.seg) { const s = this.seg; this.seg = null; s.resolve?.('stopped'); } this.p?.pauseVideo?.(); clearInterval(this._poll); }
  rate(r) { this.p?.setPlaybackRate?.(r); }
  time() { return this.p?.getCurrentTime?.() || 0; }
  title() { try { return this.p?.getVideoData?.().title || ''; } catch { return ''; } }
  destroy() { clearInterval(this._poll); try { this.p?.destroy(); } catch { } this.el.innerHTML = ''; }
}
