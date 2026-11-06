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
// 영상 썸네일: 관리자가 바꾼 이미지가 있으면 그것, 없으면 YouTube 기본 썸네일
export const vThumb = v => v?.thumb || (v?.ytId ? thumb(v.ytId) : '');

// 제목: oEmbed (CORS 허용 시) → noembed → null
export async function fetchTitle(id) {
  const url = `https://www.youtube.com/watch?v=${id}`;
  for (const ep of [`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, `https://noembed.com/embed?url=${encodeURIComponent(url)}`]) {
    try { const r = await fetch(ep); if (r.ok) { const j = await r.json(); if (j.title) return j.title; } } catch { }
  }
  return null;
}

export class Player {
  constructor(el, { onState, onReady, controls = 1, mutedFallback = false, blockMs = 3000 } = {}) {
    this.mutedFallback = mutedFallback; this.blockMs = blockMs;
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
    if (name === 'ended' && this.ambient && !this.seg) { try { this.p.seekTo(0, true); this.p.playVideo(); } catch { } } // 배경 재생은 끝나면 처음부터
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
    if (!this.ambient) { if (this.userMuted) this.mute(); else this.sound(); } // 소리와 함께 재생 (사용자가 소리를 끈 경우만 음소거)
    if (this.vid !== ytId) { this.vid = ytId; this.p.loadVideoById({ videoId: ytId, startSeconds: start }); }
    else { this.p.seekTo(start, true); this.p.playVideo(); }
    // 브라우저가 자동 재생을 막았으면(오래 시작 안 됨) → 화면을 한 번 탭하면 소리와 함께 재생
    clearTimeout(this._kickT);
    // CHAT: 소리 있는 자동 재생이 막히면 바로 음소거로 재생 → 화면 아무 데나 터치하면 소리 켜짐
    // CALL: 음소거로 바꾸지 않고 ‘탭해서 재생’
    this._kickT = setTimeout(() => {
      if (!this.seg || this.state === 'playing' || this.state === 'buffering') return;
      const muteRun = () => { this.mute(); try { this.p.playVideo(); } catch { } if (!this.userMuted) { this.mutedAuto = true; this.onState?.('muted'); } };
      // 이미 한 번 터치한 뒤라면(소리 재생 허용됨) 소리와 함께 한 번 더 시도 → 그래도 안 되면 음소거 재생
      if (this.mutedFallback && this.touched && !this.userMuted) { try { this.p.playVideo(); } catch { } this._kickT = setTimeout(() => { if (this.seg && this.state !== 'playing' && this.state !== 'buffering') muteRun(); }, 1500); }
      else if (this.mutedFallback || this.userMuted) muteRun();
      else { this.needTap = true; this.onState?.('blocked'); }
    }, this.mutedFallback ? 1200 : this.blockMs);
    return done;
  }
  // 사용자 탭 안에서 호출 → 소리와 함께 재생 시작
  kick() { this.touched = true; if (this.userMuted) { if (this.needTap && this.p) { this.needTap = false; try { this.p.playVideo(); } catch { } } return; }
    if (this.mutedAuto) { this.mutedAuto = false; this.sound(); this.onState?.('unmuted'); return; } if (!this.needTap || !this.p) return; this.needTap = false; this.sound(); try { this.p.playVideo(); } catch { } this.onState?.('unblocked'); }
  // 사용자 소리 설정 (CHAT 상단 스피커 버튼)
  setUserMuted(m) { this.userMuted = !!m; if (m) { this.mutedAuto = false; this.mute(); } else this.sound(); }
  sound() { try { this.p?.unMute?.(); this.p?.setVolume?.(100); } catch { } }
  mute() { try { this.p?.mute?.(); } catch { } }
  // 배경 재생: 말하는 동안 장면만 계속 흐르게 (소리 없이) — 녹음·타이머와 무관
  ambientPlay(on) { this.ambient = !!on; if (!this.p) return; if (on) { const sg = this.seg; this.seg = null; sg?.resolve?.('stopped'); this.mute(); try { this.p.playVideo(); } catch { } } else { this.sound(); } }
  // 영상만 잠깐 멈춤 (구간 정보는 유지 → resume으로 이어서 재생)
  unmute() { this.kick(); }
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
