// 보기 좋은 줄바꿈: 화면 폭을 재서 줄 수는 그대로 두고 줄 길이를 고르게, 의미 덩어리(쉼표 뒤 · so/when/to… 앞 · ~고/~서/~는데 뒤)에서 끊기
// 예) Nice! Looks like I'll be able / to get right on when it arrives
//     I'm feeling a little awkward, / so I'll check how the Eris are reacting.
//     아니 아까 그 옆방에 계신 분들의 / 목소리가 들렸을때 엄청 시끄러웠나 보구나
const SEL = [
  '.msg2:not(.me) .m-bub .ko', '.msg2:not(.me) .m-bub .en', '.m-bub .say-sub', '.m-bub .rv-sub', '.m-bub .rv-ko2',
  '.dc-b p.en', '.dc-ko', '.vm:not(.me) p', '.vm:not(.me) small', '.ex-en', '.ex-bub', '.say-en', '.say-ko', '.say-ko-big',
  '.kit-q', '.kit-ko', '.rv-use b', '.dm-ko'
].join(',');

// 이 단어 앞에서 끊기 좋음 (뒤 문장을 이끄는 말)
const LEAD = /^(so|and|but|or|because|when|while|if|that|which|who|where|whether|how|what|why|to|until|before|after|since|than|though|although|unless|like|with|without|for|about)$/i;
// 이 단어 뒤에서 끊으면 어색함 (다음 말과 한 덩어리)
const GLUE = /^(a|an|the|my|your|his|her|our|their|its|this|that|these|those|to|of|in|on|at|for|with|from|by|i|i'm|i'll|i've|i'd|you|we|they|he|she|it|it's|is|are|was|were|be|been|will|would|can|could|should|have|has|had|do|does|did|not|so|and|but|or|when|if|because|very|really|just|too|more|most|some|any|no|every|get|got|gonna|wanna)$/i;
const KO_END = /(고|서|면|니까|는데|은데|ㄴ데|데|지만|면서|거든|어서|아서|해서|라서|든지|도록)[,.!?~]*$/;
const PUNCT = /[,;:]["')]?$/, SENT = /[.!?~]+["')]?$|[ㅎㅋㅜㅠ]{2,}$/;

const cv = document.createElement('canvas').getContext('2d');
const core = w => w.replace(/^[^\w'가-힣]+|[^\w'가-힣]+$/g, '');

function cost(words, wid, sp, W, brk) {
  // brk: 끊는 단어 인덱스(그 단어 뒤에서 줄바꿈) 배열
  const lines = []; let a = 0;
  [...brk, words.length - 1].forEach(b => { let w = 0; for (let i = a; i <= b; i++) w += wid[i] + (i > a ? sp : 0); lines.push({ a, b, w }); a = b + 1; });
  let c = 0;
  lines.forEach((l, k) => {
    if (l.w > W) c += 1e6;
    const last = k === lines.length - 1, n = l.b - l.a + 1;
    const slack = (W - l.w) / W;
    c += last ? Math.max(0, slack - 0.35) ** 2 * 60 : slack ** 2 * 100; // 줄 길이를 고르게 (마지막 줄은 조금 짧아도 됨)
    if (n === 1 && lines.length > 1) c += 40; // 한 단어만 덩그러니 (Nice! / …) 금지
    if (n === 2 && lines.length > 1 && (k === 0 || last)) c += 8;
  });
  lines.slice(0, -1).forEach(l => {
    const w = words[l.b], nx = words[l.b + 1] || '';
    if (PUNCT.test(w)) c -= 14;            // 쉼표 뒤
    else if (SENT.test(w)) c -= 6;          // 문장 끝 (너무 짧은 첫 줄은 위에서 막음)
    if (LEAD.test(core(nx))) c -= 9;        // so / when / to … 앞
    if (GLUE.test(core(w))) c += 18;        // a / the / to / I'll … 뒤
    if (/[가-힣]/.test(w)) { if (KO_END.test(w)) c -= 8; }
  });
  return c;
}

function plan(words, wid, sp, W, lines0 = 0) {
  // 줄 수 = 브라우저가 지금 실제로 나눈 줄 수 (없으면 그리디로 계산)
  let n = 1, cur = 0;
  wid.forEach(w => { const add = (cur ? sp : 0) + w; if (cur && cur + add > W) { n++; cur = w; } else cur += add; });
  if (lines0) n = lines0;
  if (n < 2) return [];
  const N = words.length;
  // 줄 수 n (안 되면 n+1)으로 끊는 자리 조합을 전부 보고 비용이 가장 낮은 것 (폭을 넘는 줄은 바로 버림)
  const best = lines => {
    let res = null, tries = 0;
    const go = (start, left, b) => {
      if (++tries > 60000) return;
      if (left === 1) {
        let w = 0; for (let i = start; i < N; i++) w += wid[i] + (i > start ? sp : 0);
        if (w > W) return;
        const c = cost(words, wid, sp, W, b); if (!res || c < res.c) res = { c, b: [...b] }; return;
      }
      let w = 0;
      for (let e = start; e < N - (left - 1); e++) {
        w += wid[e] + (e > start ? sp : 0); if (w > W) break;
        b.push(e); go(e + 1, left - 1, b); b.pop();
      }
    };
    go(0, lines, []);
    return res;
  };
  const r = best(n) || best(n + 1);
  return r && r.c < 1e6 ? r.b : null;
}

const boxOf = el => { let b = el; while (b.parentElement && /^inline/.test(getComputedStyle(b).display) && getComputedStyle(b).display !== 'inline-block') b = b.parentElement; return b; };

export function prettyBreak(el) {
  if (!el.isConnected) return;
  el.querySelectorAll('br.pb').forEach(b => b.replaceWith(' '));
  el.normalize();
  const cs = getComputedStyle(el);
  if (cs.display === 'none') return;
  // 글자가 놓이는 줄 폭 = 가장 가까운 블록 상자의 안쪽 폭 (span 같은 inline이면 말풍선 폭)
  const bx = boxOf(el), bs = bx === el ? cs : getComputedStyle(bx);
  const W = bx.clientWidth - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight);
  if (!(W > 40)) return;
  el.dataset.pbw = String(Math.round(W));
  cv.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const ls = parseFloat(cs.letterSpacing) || 0;
  const meas = t => cv.measureText(t).width + ls * t.length;
  const sp = meas(' ');
  // 단어 위치: 텍스트 노드 속 공백(단어 사이)을 기억해 두고, 끊을 자리의 공백을 <br>로
  const words = [], gaps = []; let curW = '';
  const segs = [];
  const flushSeg = () => { if (curW) { words.push(curW); curW = ''; } if (words.length) segs.push({ words: words.splice(0), gaps: gaps.splice(0) }); };
  // 직접 넣은 <br>(문단)이 있으면 문단마다 따로
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (n.nodeType === 1) { if (n.tagName === 'BR') flushSeg(); continue; }
    const t = n.nodeValue;
    for (let i = 0; i < t.length; i++) {
      if (/\s/.test(t[i])) { if (t[i] === '\n' && /pre/.test(cs.whiteSpace)) { flushSeg(); continue; } if (curW) { words.push(curW); curW = ''; gaps.push({ n, i }); } }
      else curW += t[i];
    }
  }
  flushSeg();
  // 지금 몇 줄로 보이는지 (한 줄이면 그대로 둠)
  const rg = document.createRange(); rg.selectNodeContents(el);
  const tops = new Set([...rg.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top / 4)));
  if (tops.size < 2) return;
  const cuts = [];
  segs.forEach(sg => {
    if (sg.words.length < 3) return;
    const wid = sg.words.map(meas);
    const brk = plan(sg.words, wid, sp, W * 0.99, segs.length === 1 ? tops.size : 0);
    if (!brk) return;
    brk.forEach(b => sg.gaps[b] && cuts.push(sg.gaps[b]));
  });
  // 뒤에서부터 바꿔야 앞 위치가 안 밀림
  cuts.sort((a, b) => a.n === b.n ? b.i - a.i : 0);
  const byNode = new Map(); cuts.forEach(c => { if (!byNode.has(c.n)) byNode.set(c.n, []); byNode.get(c.n).push(c.i); });
  byNode.forEach((idx, n) => {
    idx.sort((a, b) => b - a).forEach(i => {
      const rest = n.splitText(i); rest.nodeValue = rest.nodeValue.slice(1);
      const br = document.createElement('br'); br.className = 'pb'; n.parentNode.insertBefore(br, rest);
    });
  });
}

// 화면에 새로 생긴 말풍선·문장에 자동 적용 · 폭이 바뀌면 다시
let mo = null;
// 폭 변화는 글자를 담은 상자(말풍선)를 지켜봄
const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(es => es.forEach(e => { const bx = e.target; const w = Math.round(bx.clientWidth); if (bx._pbw === w) return; (bx._pbEls || []).forEach(el => el.isConnected && run(el)); })) : null;
const queue = new Set(); let raf = 0;
function run(el) {
  mo?.disconnect();
  try { prettyBreak(el); } catch { }
  try { const bx = boxOf(el); bx._pbw = Math.round(bx.clientWidth); } catch { }
  mo?.takeRecords(); observe();
}
function flush() { raf = 0; const els = [...queue]; queue.clear(); els.forEach(el => { if (!el.isConnected) return; if (!el._pbObs) { el._pbObs = true; const bx = boxOf(el); (bx._pbEls ||= []).push(el); if (!bx._pbRo) { bx._pbRo = true; ro?.observe(bx); } } run(el); }); }
function want(el) { queue.add(el); if (!raf) raf = requestAnimationFrame(flush); }
function scan(node) {
  if (node.nodeType !== 1) { const p = node.parentElement?.closest?.(SEL); if (p) want(p); return; }
  if (node.matches?.(SEL)) want(node);
  node.querySelectorAll?.(SEL).forEach(want);
  const p = node.parentElement?.closest?.(SEL); if (p) want(p);
}
function observe() { mo?.observe(document.body, { childList: true, subtree: true, characterData: true }); }
export function startLineBreaks() {
  if (mo || typeof MutationObserver === 'undefined') return;
  mo = new MutationObserver(recs => recs.forEach(r => { if (r.type === 'characterData') scan(r.target); else { r.addedNodes.forEach(scan); if (r.target.closest?.(SEL)) want(r.target.closest(SEL)); } }));
  observe(); scan(document.body);
  document.fonts?.ready?.then(() => document.querySelectorAll(SEL).forEach(want));
}
