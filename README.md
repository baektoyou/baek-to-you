# BAEK TO YOU
Learn English by talking with Baekhyun — 백현이의 실제 영상으로 영어를 말하고, 대화하고, 복습하는 개인용 PWA.

## GitHub Pages 배포
1. 새 저장소(예: `baek-to-you`)를 만들고 이 폴더 안의 파일을 **그대로 루트에** 업로드
2. Settings › Pages › Branch: `main` / `(root)` › Save
3. `https://<아이디>.github.io/baek-to-you/` 접속 (HTTPS 필수: 마이크·서비스워커)
4. iPhone Safari › 공유 › **홈 화면에 추가**

## 처음 쓰는 법
1. SETTINGS › YouTube URL 추가
2. 영상 관리 › `+ 문장`: 영상을 재생하다 `지금` 버튼으로 시작/끝 시간 지정 → 한국어 발화, Natural/Easy/Advanced 영어, 패턴, 주제 태그 입력
   - 여러 문장은 `JSON 일괄 추가` › `Claude용 프롬프트 복사` → Claude에서 받은 JSON 붙여넣기
3. VIDEO에서 WATCH → SPEAK → CHECK → SHADOW → FEEDBACK → RETRY → APPLY
4. TALK에서 영상통화 수락 → 영어로 대답 (주제 태그·키워드·답변 예시를 많이 넣을수록 대화가 잘 이어져요)
5. SAVED에서 간격 반복 복습, SETTINGS › JSON 백업 주기적으로

## 구조
```
index.html  manifest.webmanifest  sw.js  .nojekyll
css/style.css
icons/  (192, 512, maskable, apple-touch)
js/app.js         라우터·탭바
js/store.js       localStorage 데이터·SRS·백업/복원·IndexedDB(내 녹음)
js/speech.js      STT·TTS·녹음·녹음 분석
js/yt.js          YouTube IFrame API 구간 재생
js/compare.js     단어 비교·실수 패턴·패턴 하이라이트
js/talk-engine.js TALK 발화 연결 규칙
js/ui.js          공통 컴포넌트 (마이크·플래시카드·쉐도잉)
js/video.js  js/talk.js  js/saved.js  js/settings.js
```

## 무료 환경의 한계와 대안
| 항목 | 상태 |
|---|---|
| 발음·억양·유창성 점수 | 미지원 ('분석 미지원' 표시). 대신 STT 단어 비교, 말한 길이·끊김 측정, 파형, 원어민↔내 녹음 번갈아 듣기 |
| YouTube 자막 자동 수집 | 불가(CORS·정책) → 수동 등록 + JSON 일괄 추가 |
| 영어 번역·답변 생성 | AI 필요 → 직접 입력 또는 Claude 프롬프트로 만든 JSON |
| TALK | 라이브 통화 아님. 등록된 실제 클립을 키워드·태그 규칙으로 연결, 맞는 클립이 없으면 '앱 질문'(점선 말풍선)으로 구분 표시 |
| 음성 인식 | iPhone은 Siri/받아쓰기 켜기 필요. 안 되면 키보드 입력(받아쓰기 🎤) 사용 |
| 저장 | 이 기기 브라우저에만 저장 → JSON 백업 권장. 녹음 파일은 백업에 미포함 |
