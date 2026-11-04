// TALK 대화 연결 엔진 — 무료 키워드·태그·규칙 기반 (AI 생성 아님)
import { tokens, stem, STOP, isQuestion } from './compare.js';

export const TOPICS = {
  greeting: ['hi', 'hello', 'hey', 'morning', 'night', 'bye', 'nice to meet', 'how are you', 'long time'],
  feeling: ['happy', 'sad', 'good', 'great', 'fine', 'bad', 'excited', 'nervous', 'stressed', 'okay', 'tired', 'mood', 'feel', 'upset', 'lonely', 'worried', 'angry', 'cry'],
  food: ['eat', 'food', 'hungry', 'delicious', 'dinner', 'lunch', 'breakfast', 'cook', 'snack', 'meal', 'restaurant', 'pizza', 'chicken', 'ramen', 'coffee', 'drink', 'tteokbokki', 'dessert', 'cake', 'meat'],
  music: ['song', 'sing', 'music', 'album', 'listen', 'concert', 'stage', 'dance', 'perform', 'voice', 'comeback', 'track', 'lyrics', 'practice'],
  sleep: ['sleep', 'bed', 'nap', 'dream', 'rest', 'wake', 'late', 'insomnia'],
  weather: ['weather', 'cold', 'hot', 'rain', 'snow', 'sunny', 'winter', 'summer', 'spring', 'fall', 'autumn', 'warm', 'wind'],
  work: ['work', 'busy', 'school', 'study', 'exam', 'job', 'class', 'homework', 'project', 'office', 'deadline', 'university', 'college'],
  fans: ['fan', 'love', 'miss', 'support', 'eri', 'proud', 'thank', 'cheer', 'always', 'together'],
  pet: ['dog', 'puppy', 'cat', 'pet', 'mongryong', 'animal'],
  game: ['game', 'play', 'gaming', 'win', 'lose', 'lol', 'overwatch'],
  travel: ['travel', 'trip', 'vacation', 'visit', 'country', 'city', 'plane', 'beach', 'tour'],
  health: ['exercise', 'workout', 'gym', 'health', 'sick', 'run', 'walk', 'diet', 'cold', 'hurt'],
  hobby: ['hobby', 'movie', 'drama', 'watch', 'book', 'read', 'draw', 'photo', 'shopping', 'weekend', 'free time'],
  plan: ['plan', 'tomorrow', 'today', 'tonight', 'later', 'next', 'going to', 'will', 'soon', 'future', 'dream']
};
export const TYPES = ['greeting', 'question', 'answer', 'statement', 'reaction', 'story', 'goodbye'];
export const EMOTIONS = ['happy', 'excited', 'calm', 'funny', 'shy', 'sad', 'touched', 'tired', 'playful', 'serious'];

export function detectTopics(text) {
  const low = ' ' + (text || '').toLowerCase() + ' ';
  const st = new Set(tokens(text).map(stem));
  const found = [];
  for (const [t, words] of Object.entries(TOPICS)) {
    const hits = words.filter(w => w.includes(' ') ? low.includes(' ' + w) : st.has(stem(w)));
    if (hits.length) found.push({ t, hits });
  }
  return found;
}

const content = t => tokens(t).filter(w => !STOP.has(w)).map(stem);

// 다음 실제 발화 선택
export function pickNext({ reply, utts, used, current, videosById }) {
  const uTopics = detectTopics(reply);
  const uTopicSet = new Set(uTopics.map(x => x.t));
  const uWords = new Set(content(reply));
  const asked = isQuestion(reply);
  const scored = utts.filter(u => u.ko).map(u => {
    let s = 0; const why = [];
    const ut = u.topics.map(x => x.toLowerCase());
    const tHit = ut.filter(x => uTopicSet.has(x));
    if (tHit.length) { s += 3 * tHit.length; why.push(...tHit); }
    const kw = u.keywords.map(k => stem(k.toLowerCase()));
    const kHit = kw.filter(k => uWords.has(k));
    if (kHit.length) { s += 2 * kHit.length; why.push(...kHit); }
    const eHit = new Set([...content(u.en.natural + ' ' + u.en.easy)].filter(w => uWords.has(w)));
    if (eHit.size) { s += Math.min(3, eHit.size); why.push(...[...eHit].slice(0, 3)); }
    if (asked && (u.type === 'answer' || u.type === 'story' || u.type === 'statement')) s += 1;
    if (!asked && u.type === 'question') s += 0.8;
    if (u.type === 'greeting') s -= 1.5;
    if (u.type === 'goodbye') s -= /\b(bye|good night|see you|gotta go)\b/i.test(reply) ? -4 : 3;
    if (current && u.videoId === current.videoId && u.start >= current.end - 1 && u.start - current.end < 90) { s += 1.2; why.push('같은 영상 다음 장면'); }
    if (used.has(u.id)) s -= 20;
    return { u, s, why: [...new Set(why)] };
  }).sort((a, b) => b.s - a.s);
  const top = scored[0];
  if (top && top.s >= 2) return { kind: 'clip', ...top, topics: uTopics };
  return { kind: 'none', candidates: scored.filter(x => !used.has(x.u.id)), topics: uTopics };
}

export function firstClip(utts) {
  const g = utts.filter(u => u.type === 'greeting');
  const q = utts.filter(u => u.type === 'question');
  const pool = g.length ? g : q.length ? q : utts;
  return pool[Math.floor(Math.random() * pool.length)];
}

// 적절한 실제 발화가 없을 때 — 앱이 만든 텍스트 질문 (백현이 발화 아님으로 표시)
const Q = {
  food: ['What did you eat today?', 'What is your comfort food?'], music: ['What song are you into these days?', 'Which stage do you want to see live?'],
  sleep: ['How did you sleep last night?', 'Are you a night owl or a morning person?'], weather: ['How is the weather where you are?', 'Which season do you like the most?'],
  work: ['How is school or work going?', 'What are you working on these days?'], fans: ['What do you want to tell Baekhyun?', 'When did you become a fan?'],
  pet: ['Do you have a pet?', 'Are you a dog person or a cat person?'], game: ['What game do you like?', 'Are you good at games?'],
  travel: ['Where do you want to travel next?', 'What was your best trip?'], health: ['How do you stay healthy?', 'Do you like working out?'],
  feeling: ['How are you feeling right now?', 'What made you smile today?'], hobby: ['What do you do in your free time?', 'Any good drama recommendations?'],
  plan: ['What are your plans for this weekend?', 'What is one goal you have this month?'], greeting: ['How is your day going?'],
  _: ['Can you tell me more about that?', 'Why do you think so?', 'What about you? Tell me about your day.']
};
export function appQuestion(topics, usedQ) {
  const keys = topics.map(t => t.t).concat('_');
  for (const k of keys) { const q = (Q[k] || []).find(x => !usedQ.has(x)); if (q) return q; }
  return Q._[Math.floor(Math.random() * Q._.length)];
}
export const KEEP = ['Why?', 'Can you tell me more?', 'How did that feel?', 'What happened next?', 'And what about you?'];

// 힌트 (등록된 힌트 → 답변 예시 앞부분 → 유형별 기본 문장틀)
export function hintFor(u) {
  if (u.hint) return { text: u.hint, src: '등록된 힌트' };
  if (u.replies[0]) { const w = u.replies[0].split(' '); return { text: w.slice(0, Math.min(4, w.length)).join(' ') + (w.length > 4 ? ' …' : ''), src: '답변 예시 앞부분' }; }
  const base = { question: 'I think … / Actually, I …', greeting: 'Hi! I\'m doing … How about you?', story: 'Oh really? That sounds …!', reaction: 'Haha, I know right? …', goodbye: 'Bye! Talk to you …', answer: 'Oh, I see. So you …?', statement: 'Me too! I also …' };
  return { text: base[u.type] || base.statement, src: '기본 문장틀' };
}
