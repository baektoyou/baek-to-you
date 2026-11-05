// “이 말 영어로 어떻게 해?” — 무료·오프라인 (AI 아님)
// 찾는 곳: ① 내가 저장한 단어·표현(뜻) ② 영상 문장(한국어 → 추천 영어) ③ 앱 표현 사전(일상 회화 표현)
// 못 찾으면 솔직하게 못 찾았다고 말해요.
import * as D from './store.js';
import { natOf, esc, ic } from './ui.js';

// [한국어 키워드들, 영어, 짧은 설명]
const BOOK = [
  [['배고파', '배고프'], "I'm hungry.", ''], [['배불러', '배부르'], "I'm full.", ''], [['졸려', '졸리'], "I'm sleepy.", ''],
  [['피곤해', '피곤하', '지쳤', '힘들어'], "I'm so tired. / I'm exhausted.", 'exhausted = 완전 지친'],
  [['보고 싶어', '보고싶어', '그리워'], 'I miss you.', '보고 싶다 = miss'], [['기대돼', '기대된다', '설레'], "I'm so excited. / I can't wait.", ''],
  [['빨리 하고 싶어', '빨리 보고 싶'], "I can't wait to …", "can't wait to + 동사"], [['맛있어', '맛있다', '맛있었'], "It's so good. / It was really good.", 'delicious보다 good을 더 자주 써요'],
  [['오랜만', '오래간만'], "Long time no see! / It's been a while.", ''], [['괜찮아', '괜찮'], "It's okay. / I'm fine.", ''],
  [['화이팅', '파이팅'], 'You got this! / Good luck!', 'fighting은 영어권에서 안 써요'], [['수고했어', '수고하셨', '고생했'], 'Good job! / You worked so hard.', ''],
  [['잘 자', '잘자', '굿나잇'], 'Sleep well. / Good night.', ''], [['뭐 해', '뭐해', '뭐하고 있'], 'What are you up to?', ''],
  [['밥 먹었', '밥먹었', '식사했'], 'Have you eaten?', ''], [['아직'], 'Not yet.', ''], [['진짜', '정말?', '레알'], 'Really? / Seriously?', ''],
  [['대박'], "No way! / That's amazing!", ''], [['그러니까', '내 말이', '그니까'], 'Exactly. / I know, right?', ''],
  [['어쩔 수 없', '할 수 없지'], 'It is what it is.', ''], [['갑자기'], 'all of a sudden', ''], [['솔직히'], 'To be honest, … / Honestly, …', ''],
  [['사실'], 'Actually, …', ''], [['결국'], 'I ended up …', 'ended up + ~ing'], [['덕분에', '덕분이'], 'Thanks to you, …', ''],
  [['응원할게', '응원해'], "I'm rooting for you. / I'll always support you.", ''], [['걱정하지 마', '걱정 마', '걱정마'], "Don't worry.", ''],
  [['천천히'], 'Take your time.', ''], [['축하해', '축하드려'], 'Congratulations! / Congrats!', ''], [['고마워', '감사해', '감사합니다'], 'Thank you. / Thanks so much.', ''],
  [['미안해', '죄송해', '미안'], "I'm sorry.", ''], [['요즘'], 'these days / lately', "I've been … lately"], [['최근에'], 'recently / lately', ''],
  [['좋아해', '좋아한다'], 'I like … / I love …', ''], [['싫어'], "I don't like … / I hate …", ''], [['빠졌어', '빠져있', '꽂혔'], "I'm really into …", "be into = ~에 빠져 있다"],
  [['익숙해', '적응했'], "I'm used to …", "be used to + ~ing"], [['예전에', '옛날에'], 'I used to …', 'used to = 예전엔 ~했어'],
  [['해본 적', '가본 적', '먹어본 적'], 'Have you ever …?', 'Have you ever + p.p.'], [['하려고', '할 거야', '할거야', '계획'], "I'm going to … / I'm planning to …", ''],
  [['하고 싶어', '하고싶어'], 'I want to … / I feel like …ing', ''], [['해야 해', '해야돼', '해야 돼'], 'I have to … / I need to …', ''],
  [['안 해도 돼', '안해도 돼'], "You don't have to …", ''], [['노력 중', '노력하고'], "I'm trying to …", ''], [['기분이', '기분'], 'I feel … / I\'m in a good mood.', ''],
  [['심심해', '지루해'], "I'm bored.", "bored(내가 지루함) ↔ boring(지루하게 만드는)"], [['신나', '신난다'], "I'm so excited!", ''],
  [['긴장돼', '떨려'], "I'm nervous.", ''], [['속상해', '서운해'], "I'm upset. / That hurts my feelings.", ''], [['외로워'], 'I feel lonely.', ''],
  [['스트레스'], "I'm stressed out.", ''], [['바빠', '바쁘'], "I've been really busy.", ''], [['쉬고 싶', '쉬는 중', '쉬었어'], 'I want to take a break. / I just chilled.', 'chill = 쉬다(구어)'],
  [['놀았어', '놀러', '놀자'], 'I hung out with … / Let\'s hang out!', '어른끼리 “놀다” = hang out'], [['약속 있', '약속이 있'], 'I have plans.', '약속 = plans'],
  [['아이쇼핑'], 'window shopping', ''], [['핸드폰', '휴대폰'], 'phone', ''], [['노트북'], 'laptop', ''], [['원룸'], 'studio apartment', ''],
  [['편의점'], 'convenience store', ''], [['야식'], 'a late-night snack', ''], [['배달'], 'to order delivery / takeout', ''], [['혼밥'], 'eating alone', ''],
  [['추천해', '추천해줘', '추천'], 'Can you recommend …? / You should try …', ''], [['어때', '어땠어'], 'How was it? / How about …?', ''],
  [['너는', '넌 어때', '너는 어때'], 'What about you? / How about you?', ''], [['나도'], 'Me too. / Same here.', ''], [['그래서'], 'So … / That\'s why …', ''],
  [['왜냐하면', '왜냐면'], 'Because …', ''], [['예를 들면', '예를 들어'], 'For example, …', ''], [['그런데', '근데'], 'But … / By the way, …', 'by the way = 그나저나'],
  [['그나저나'], 'By the way, …', ''], [['어쨌든'], 'Anyway, …', ''], [['하마터면'], 'I almost …', ''], [['드디어'], 'Finally, …', ''],
  [['생각보다'], 'than I expected', "It was better than I expected."], [['다행이다', '다행'], "That's a relief. / Thank goodness.", ''],
  [['어떻게 지내', '잘 지내'], "How have you been? / I've been good.", ''], [['콘서트'], 'concert', ''], [['컴백'], 'comeback', ''], [['팬'], "I'm a big fan of yours.", ''],
  [['생일 축하'], 'Happy birthday!', ''], [['몸조심', '건강 챙겨', '아프지 마'], 'Take care of yourself. / Stay healthy.', ''], [['푹 쉬어'], 'Get some rest.', '']
];

const STRIP = /(은|는|이|가|을|를)?\s*(영어로|영어론)?\s*(어떻게|뭐라고|뭐야|뭐예요|뭐지)?\s*(말해|말하지|말해요|해|해요|하지|하나요|돼|되지|되나요|말할 수 있어|표현해)?\s*[?？!.]*$/;
const clean = t => String(t || '').replace(/^["'“‘\s]+|["'”’\s]+$/g, '').replace(/^(이거|이 말|이건|저기|근데)\s*/, '').replace(STRIP, '').replace(/["'“”‘’]/g, '').trim();
const bigrams = t => { const s = t.replace(/\s+/g, ''); const out = new Set(); for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2)); return out; };
const sim = (a, b) => { const A = bigrams(a), B = bigrams(b); if (!A.size || !B.size) return 0; let n = 0; A.forEach(x => B.has(x) && n++); return (2 * n) / (A.size + B.size); };

// 반환: {q, items:[{en, ko, note, src}]}
export function koHelp(text) {
  const q = clean(text) || String(text || '').trim();
  const items = [], seen = new Set();
  const push = it => { const k = it.en.toLowerCase(); if (!seen.has(k) && items.length < 3) { seen.add(k); items.push(it); } };
  // ① 내가 저장한 단어·표현의 뜻
  D.get().words.filter(w => w.ko && (w.ko.includes(q) || q.includes(w.ko.replace(/~/g, '').trim()) || sim(w.ko, q) > 0.6)).slice(0, 2).forEach(w => push({ en: w.text, ko: w.ko, src: '내 표현' }));
  // ② 앱 표현 사전 (키워드 포함)
  BOOK.filter(([keys]) => keys.some(k => q.includes(k))).sort((a, b) => Math.max(...b[0].map(k => q.includes(k) ? k.length : 0)) - Math.max(...a[0].map(k => q.includes(k) ? k.length : 0)))
    .slice(0, 2).forEach(([keys, en, note]) => push({ en, ko: keys[0], note, src: '표현 사전' }));
  // ③ 영상 문장: 한국어가 비슷한 문장의 추천 영어
  if (q.length >= 4) D.get().utts.filter(u => u.ko && natOf(u)).map(u => ({ u, s: sim(u.ko, q) })).filter(x => x.s >= 0.45).sort((a, b) => b.s - a.s).slice(0, 1)
    .forEach(({ u }) => push({ en: natOf(u), ko: u.ko, src: '백현이 문장' }));
  return { q, items };
}
export const isKo = t => /[가-힣]/.test(t || '');

// 되물어볼 질문 한국어 뜻
export const ASK_KO = {
  'What did you eat today?': '오늘 뭐 먹었어?', 'What is your comfort food?': '힘들 때 생각나는 음식이 뭐야?', 'What song are you into these days?': '요즘 빠진 노래 있어?',
  'Which stage do you want to see live?': '라이브로 보고 싶은 무대는?', 'How did you sleep last night?': '어젯밤에 잘 잤어?', 'Are you a night owl or a morning person?': '밤형이야, 아침형이야?',
  'How is the weather where you are?': '거기 날씨 어때?', 'Which season do you like the most?': '어떤 계절이 제일 좋아?', 'How is school or work going?': '학교나 일은 어때?',
  'What are you working on these days?': '요즘 뭐 하고 있어?', 'What do you want to tell Baekhyun?': '백현이한테 하고 싶은 말은?', 'When did you become a fan?': '언제 팬이 됐어?',
  'Do you have a pet?': '반려동물 있어?', 'Are you a dog person or a cat person?': '강아지파야, 고양이파야?', 'What game do you like?': '어떤 게임 좋아해?', 'Are you good at games?': '게임 잘해?',
  'Where do you want to travel next?': '다음엔 어디로 여행 가고 싶어?', 'What was your best trip?': '제일 좋았던 여행은?', 'How do you stay healthy?': '건강 어떻게 챙겨?', 'Do you like working out?': '운동 좋아해?',
  'How are you feeling right now?': '지금 기분 어때?', 'What made you smile today?': '오늘 웃게 한 일은?', 'What do you do in your free time?': '시간 날 때 뭐 해?', 'Any good drama recommendations?': '추천할 드라마 있어?',
  'What are your plans for this weekend?': '이번 주말에 뭐 해?', 'What is one goal you have this month?': '이번 달 목표 하나는?', 'How is your day going?': '오늘 하루 어때?',
  'Can you tell me more about that?': '그거 더 얘기해줄래?', 'Why do you think so?': '왜 그렇게 생각해?', 'What about you? Tell me about your day.': '너는? 오늘 어땠어?', 'What about you?': '너는 어때?'
};

// 채팅에 넣을 도움말 카드
export function helpHTML(res) {
  if (!res.items.length) return `<div class="help"><span class="cor-l">‘${esc(res.q)}’ 영어로</span><p class="help-none">앱 사전에서 찾지 못했어요. SAVED › 단어에 뜻과 함께 추가해 두면 다음부터 알려줄게요.</p></div>`;
  return `<div class="help"><span class="cor-l">‘${esc(res.q)}’ 영어로</span>${res.items.map(it => `<div class="nat-s"><p class="en">${esc(it.en)}${it.note ? `<small>${esc(it.note)}</small>` : ''}</p><button class="sv" type="button" data-sw="${esc(it.en)}" data-ko="${esc(it.ko)}" aria-label="저장">${ic('bookmark')}</button></div>`).join('')}</div>`;
}
