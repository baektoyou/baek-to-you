// 벨소리 · 효과음 — Web Audio로 직접 합성 (음원 파일·외부 서비스 없음)
// iPhone: 사용자가 버튼을 누른 순간에 unlock()을 불러야 소리가 나요. 무음 모드(링거 스위치)면 들리지 않을 수 있어요.
let ac = null, master = null, loopT = null, ringing = false;
const live = new Set(); // 아직 울리는 음 (끊을 때 바로 정리)

export function unlock() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    if (!ac) {
      ac = new AC();
      master = ac.createGain(); master.gain.value = 0.9;
      // 아주 짧은 잔향 (딜레이 피드백) → 차갑지 않은 소리
      const dl = ac.createDelay(); dl.delayTime.value = 0.19;
      const fb = ac.createGain(); fb.gain.value = 0.22;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
      master.connect(ac.destination); master.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    // iOS 무음 버퍼 한 번 재생 → 오디오 잠금 해제
    const b = ac.createBuffer(1, 1, 22050); const s = ac.createBufferSource(); s.buffer = b; s.connect(ac.destination); s.start(0);
    return ac;
  } catch { return null; }
}

// 마림바 느낌의 부드러운 음 하나
function note(freq, t, { dur = 1.1, vol = 0.16 } = {}) {
  const o1 = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
  o1.type = 'sine'; o2.type = 'sine'; o1.frequency.value = freq; o2.frequency.value = freq * 4.01; // 배음 → 맑은 타건감
  const g2 = ac.createGain(); g2.gain.value = 0.12;
  o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(master);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.18);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o1.start(t); o2.start(t); o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  const h = { g, o: [o1, o2] }; live.add(h); o1.onended = () => live.delete(h);
  return h;
}
const N = { E5: 659.25, Gs5: 830.61, A5: 880, B5: 987.77, Cs6: 1108.73, E6: 1318.51, Fs6: 1479.98 };
// 2.8초 주기로 반복되는 짧은 멜로디
const PHRASE = [['E6', 0], ['B5', .16], ['Gs5', .32], ['B5', .48], ['E6', .64], ['Fs6', .96], ['E6', 1.12], ['B5', 1.28]];

export function startRing() {
  if (!unlock() || ringing) return;
  ringing = true;
  const play = () => {
    if (!ringing) return;
    const t0 = ac.currentTime + 0.05;
    PHRASE.forEach(([n, dt], i) => note(N[n], t0 + dt, { vol: i === 5 ? 0.17 : 0.14 }));
    loopT = setTimeout(play, 2800);
  };
  play();
}
export function stopRing() {
  ringing = false; clearTimeout(loopT);
  if (!ac) return;
  const t = ac.currentTime;
  live.forEach(h => { try { h.g.gain.cancelScheduledValues(t); h.g.gain.setValueAtTime(Math.max(0.0001, h.g.gain.value), t); h.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); h.o.forEach(o => o.stop(t + 0.2)); } catch { } });
  live.clear();
}
// 연결음 · 종료음
export function blip(kind = 'connect') {
  if (!unlock()) return;
  const t = ac.currentTime + 0.02;
  if (kind === 'connect') { note(N.B5, t, { dur: 0.5, vol: 0.12 }); note(N.E6, t + 0.11, { dur: 0.7, vol: 0.12 }); }
  else { note(N.E6, t, { dur: 0.35, vol: 0.1 }); note(N.B5, t + 0.16, { dur: 0.6, vol: 0.1 }); }
}
