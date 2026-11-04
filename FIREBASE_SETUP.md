# Firebase 설정 가이드 (처음 하는 사람용)

이 순서대로 하면 컴퓨터와 iPhone이 같은 Google 계정으로 자동 연동돼요.
**전부 무료(Spark 요금제)이고 카드 등록이 필요 없어요.** 15분 정도 걸려요.

> 시작하기 전에: 지금 쓰는 앱(컴퓨터·iPhone 둘 다)에서 **SETTINGS › JSON 백업**을 한 번씩 해두세요.

---

## 1단계. Firebase 프로젝트 만들기

1. 컴퓨터에서 https://console.firebase.google.com 접속 → 앱에서 쓸 Google 계정으로 로그인
2. **프로젝트 만들기**(또는 “Firebase 프로젝트 시작하기”) 클릭
3. 프로젝트 이름: `baek-to-you` 입력 → 계속
4. Gemini·Google 애널리틱스 관련 질문은 **사용 안 함**으로 꺼도 돼요 → **프로젝트 만들기**
5. “새 프로젝트가 준비되었습니다” → 계속

## 2단계. 웹 앱 등록하기

1. 프로젝트 첫 화면 가운데의 **`</>`(웹)** 아이콘 클릭
   (안 보이면 왼쪽 위 톱니바퀴 › 프로젝트 설정 › 아래쪽 “내 앱” › `</>`)
2. 앱 닉네임: `BAEK TO YOU`
3. “Firebase 호스팅도 설정” 체크는 **하지 마세요** (GitHub Pages를 계속 써요)
4. **앱 등록** 클릭
5. 화면에 아래처럼 생긴 코드가 나와요. 이 창을 열어 둔 채로 3단계로 가세요.
   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "baek-to-you-xxxx.firebaseapp.com",
     projectId: "baek-to-you-xxxx",
     storageBucket: "baek-to-you-xxxx.firebasestorage.app",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcd..."
   };
   ```
   (나중에 다시 보려면: 톱니바퀴 › 프로젝트 설정 › 일반 › 내 앱 › SDK 설정 및 구성 › **구성**)

## 3단계. 설정값을 앱에 넣기

1. ZIP 안의 **`js/firebase-config.js`** 파일을 메모장(또는 VS Code)으로 열기
2. 2단계에서 본 값들을 따옴표 안에 하나씩 복사해 넣기
   ```js
   export default {
     apiKey: 'AIzaSy...',
     authDomain: 'baek-to-you-xxxx.firebaseapp.com',
     projectId: 'baek-to-you-xxxx',
     storageBucket: 'baek-to-you-xxxx.firebasestorage.app',
     messagingSenderId: '1234567890',
     appId: '1:1234567890:web:abcd...'
   };
   ```
3. 저장
4. Firebase 화면으로 돌아가 **콘솔로 이동** 클릭

> apiKey가 GitHub에 공개돼도 괜찮아요. 이건 “어느 프로젝트인지”를 알려주는 값이고, 데이터는 6단계 보안 규칙이 지켜줘요.

## 4단계. 로그인 방법 켜기

1. 왼쪽 메뉴 **빌드(Build) › Authentication** → **시작하기**
2. **로그인 방법(Sign-in method)** 탭
3. **Google** 클릭 → **사용 설정** 켜기 → 프로젝트 지원 이메일에 내 Gmail 선택 → **저장**
4. **새 제공업체 추가** → **이메일/비밀번호** → 첫 번째 스위치(이메일/비밀번호)만 켜기 → **저장**
   (홈 화면 앱에서 Google 창이 안 열릴 때 쓰는 예비 로그인이에요)

## 5단계. GitHub 주소 허용하기 (중요!)

1. Authentication 안의 **설정(Settings)** 탭 → **승인된 도메인(Authorized domains)**
2. **도메인 추가** → `kangseonwoo.github.io` 입력 → 추가
   - `https://` 나 `/baek-to-you/`는 빼고 **도메인만** 넣어요
3. 목록에 `localhost`, `...firebaseapp.com`, `kangseonwoo.github.io`가 있으면 OK

> 이걸 빼먹으면 로그인 때 “승인된 도메인에 없어요” 오류가 나요.

## 6단계. 데이터베이스(Firestore) 만들기

1. 왼쪽 메뉴 **빌드 › Firestore Database** → **데이터베이스 만들기**
2. 버전을 고르라고 나오면 **Standard**
3. 위치: **asia-northeast3 (Seoul)** 선택 → 다음
   (위치는 나중에 못 바꿔요)
4. **프로덕션 모드로 시작** 선택 → 만들기
5. 만들어지면 위쪽 **규칙(Rules)** 탭 클릭
6. 원래 있던 내용을 **전부 지우고**, ZIP 안 **`firestore.rules`** 파일 내용을 그대로 붙여넣기
7. **게시(Publish)** 클릭

> 이 규칙 덕분에 **나만** 내 데이터를 읽고 쓸 수 있어요.

## 7단계. GitHub에 올리기

1. GitHub `kangseonwoo/baek-to-you` 저장소에서 기존 파일을 이번 ZIP 파일로 덮어쓰기
   - 꼭 함께 올릴 새 파일·폴더: `js/sync.js`, `js/merge.js`, `js/firebase-config.js`(3단계에서 수정한 것), **`js/vendor/firebase.js`**
   - `.nojekyll`도 유지
   - `FIREBASE_SETUP.md`, `firestore.rules`는 올려도 되고 안 올려도 돼요
2. 1~2분 기다리기

## 8단계. 컴퓨터에서 먼저 로그인

1. 컴퓨터 브라우저에서 `https://kangseonwoo.github.io/baek-to-you/` 접속
   (예전 화면이면 한 번 새로고침)
2. **SETTINGS** 맨 위 **SYNC · 기기 연동** 카드 → **Google 계정으로 로그인**
3. 팝업에서 계정 선택 → 카드에 `● 동기화됨`이 보이면 성공
   - 이때 컴퓨터에 있던 데이터가 클라우드에 올라가요

## 9단계. iPhone에서 로그인

### Safari에서 쓰는 경우
1. iPhone Safari로 같은 주소 접속 → SETTINGS → **Google 계정으로 로그인**
2. 같은 Google 계정 선택 → `● 동기화됨`
3. iPhone에 있던 데이터와 컴퓨터 데이터가 **합쳐져요** (지워지는 것 없음)

### 홈 화면 앱(아이콘)으로 쓰는 경우
홈 화면 앱은 Safari와 로그인 정보·저장 공간이 **따로**라서, 앱 안에서 한 번 더 로그인해야 해요.

1. 홈 화면 앱 열기 → SETTINGS → **Google 계정으로 로그인**
2. 로그인 창이 안 열리거나 멈추면 (iOS 버전에 따라 생길 수 있어요):
   1. **컴퓨터나 Safari**에서 로그인된 상태로 SETTINGS › **홈 화면 앱용 이메일 로그인 추가** 열기
   2. 내 Gmail 주소 + 새 비밀번호(6자 이상) → **이메일 로그인 추가**
   3. 홈 화면 앱에서 **이메일로 로그인** 펼치기 → 방금 만든 이메일·비밀번호로 로그인
   - 같은 계정이라 데이터가 그대로 연동돼요

---

## 이렇게 동작해요

- **무엇이 동기화되나:** 영상, JSON 문장, SAVED 표현과 복습 상태, 학습 기록·연속 기록, TALK 기록, 설정(속도·톤·인식 언어·보정 단어 등)
- **기기별로 따로인 것:** 영어 음성 선택(기기마다 음성 목록이 달라서), 내 녹음 파일(무료 요금제 범위 밖이라 업로드 안 함)
- **언제:** 바꾸고 약 3초 뒤 자동 업로드. 앱을 열 때, 다른 앱에 갔다 돌아올 때, 열어둔 동안 1분마다 다른 기기 변경을 확인
- **오프라인:** 그대로 사용 가능. 다시 연결되면 자동으로 맞춰져요
- **두 기기에서 동시에 바꾸면:** 항목별로 합쳐요. 한쪽에서 지운 건 지워지고, 같은 항목을 양쪽에서 바꿨으면 더 최근 변경이 남아요. 같은 영상·같은 표현을 따로 추가했으면 하나로 합쳐요
- **로그아웃:** 이 기기의 데이터는 그대로 남아요
- **다른 계정으로 로그인하면:** “합치기 / 새 계정 데이터만 쓰기”를 물어봐요
- **SETTINGS › 모든 데이터 초기화:** 이 기기만 비워요. 로그인돼 있으면 클라우드 데이터가 다시 내려와요

## 무료 한도 (Spark 요금제)

| 항목 | 무료 한도 | 이 앱 사용량(대략) |
|---|---|---|
| Firestore 읽기 | 하루 50,000회 | 앱을 1시간 켜두면 약 60~120회 |
| Firestore 쓰기 | 하루 20,000회 | 변경 묶음당 2~3회 |
| Firestore 저장 공간 | 1GB | 수백 KB~수 MB |
| Authentication (Google·이메일) | 무료 | — |

혼자 쓰면 한도에 닿을 일은 거의 없어요. 한도를 넘어도 요금이 나가지 않고, 그날만 동기화가 멈췄다가 다음 날 자동으로 이어져요.

## 문제가 생기면

| 화면에 보이는 문구 | 해결 |
|---|---|
| SYNC 카드에 “꺼짐” | 3단계 `firebase-config.js`가 비었거나 GitHub에 안 올라감 |
| “승인된 도메인에 없어요” | 5단계 다시 확인 |
| “이 로그인 방식이 꺼져 있어요” / “Authentication이 시작되지 않았어요” | 4단계 |
| “보안 규칙이 막고 있어요” | 6단계 규칙 붙여넣고 **게시**했는지 |
| “데이터베이스가 아직 없어요” | 6단계 Firestore 만들기 |
| “팝업이 막혔어요” | 버튼을 한 번 더 누르기. 계속이면 설정 › 앱 › Safari › 팝업 차단 끄기 |
| 홈 화면 앱에서 로그인 창이 안 열림 | 9단계 이메일 로그인 |
| 변경이 안 넘어와요 | SYNC 카드 **지금 동기화** / 앱을 껐다 켜기 |

클라우드 데이터 직접 보기: Firebase 콘솔 › Firestore Database › 데이터 › `users` › (내 계정 ID)
