# Firebase 설정 가이드

BAEK TO YOU는 이렇게 나눠서 저장해요.

| 무엇 | 어디 | 누가 읽기 | 누가 수정 |
|---|---|---|---|
| 영상 · 문장(원문·번역) · 인식 보정 단어 · 상황 · 통화 사진 정보 | `content/main` (+`chunks`) | 모든 사람 | **관리자만** |
| 관리자가 등록한 통화 사진 | `photos/{id}` | 모든 사람 | **관리자만** |
| 관리자 표시 | `admins/{uid}` | 본인만 | **아무도 (콘솔에서만)** |
| 내 학습 데이터 (SAVED · 단어 · 진도 · 기록 · 프로필 · 개인 설정) | `users/{uid}` (+`chunks`) | 본인만 | 본인만 |
| 녹음 파일 · AI API 키 | 각 기기 브라우저 | — | 서버에 안 올라감 |

“관리자만 수정”은 화면에서 버튼을 숨기는 것뿐 아니라 **Firestore 보안 규칙**으로 막혀요. 관리자도 다른 사용자의 학습 데이터는 읽거나 쓸 수 없어요.

전부 무료(Spark 요금제)예요. 이미 1~3단계를 했다면 4단계부터 확인하세요.

---

## 1단계. 프로젝트 · 웹 앱
1. https://console.firebase.google.com → 프로젝트 `baek-to-you`
2. 톱니바퀴 › 프로젝트 설정 › 내 앱 › `</>` 웹 앱 (이미 있으면 그대로)

## 2단계. 설정값
`js/firebase-config.js`에 웹 앱 구성값이 들어 있어요 (지금 값 그대로 쓰면 돼요).
> apiKey는 공개돼도 괜찮아요. 데이터는 보안 규칙이 지켜요.

## 3단계. Firestore
빌드 › Firestore Database가 없으면 **데이터베이스 만들기** → Standard → `asia-northeast3 (Seoul)` → 프로덕션 모드

## 4단계. 로그인 방법 (이메일 로그인이 안 될 때 여기부터)
빌드 › **Authentication** › **로그인 방법(Sign-in method)**
1. **이메일/비밀번호** → 첫 번째 스위치 **사용 설정** → 저장
   (두 번째 ‘이메일 링크’는 꺼도 돼요)
2. **Google** → 사용 설정 (선택)
3. Authentication › **설정(Settings)** › **사용자 작업(User actions)**
   - **“사용자 생성(가입) 허용”** 이 켜져 있어야 회원가입이 돼요 (꺼져 있으면 앱에 “새 회원가입이 막혀 있어요”)
   - “사용자 삭제 허용”도 켜 두세요 (앱의 계정 삭제)
4. Authentication › **템플릿(Templates)** › 언어를 **한국어**로 (인증 메일 · 비밀번호 재설정 메일)

## 5단계. 승인된 도메인
Authentication › 설정 › **승인된 도메인** 에 `kangseonwoo.github.io` (https·경로 없이)
목록에 `localhost`, `baek-to-you.firebaseapp.com`, `kangseonwoo.github.io`가 있으면 OK

## 6단계. 보안 규칙 게시 (중요)
Firestore Database › **규칙(Rules)** → 기존 내용을 전부 지우고 이 ZIP의 **`firestore.rules`** 내용을 붙여넣기 → **게시**

## 7단계. 관리자 지정 (한 번만)
1. GitHub에 이번 버전을 올리고, 앱 SETTINGS › ACCOUNT 에서 **내 계정으로 로그인**(또는 회원가입)
2. Firebase 콘솔 › Authentication › **사용자** 탭 → 내 이메일 줄의 **사용자 UID** 복사
3. Firestore Database › 데이터 › **컬렉션 시작**
   - 컬렉션 ID: `admins`
   - 문서 ID: **복사한 UID** (자동 ID 말고 붙여넣기)
   - 필드: `role` (string) = `admin` → 저장
4. 앱을 새로고침 → SETTINGS 계정 줄에 **관리자** 표시 + ADD VIDEO가 보이면 성공
5. 이때 관리자 기기에 있던 영상·문장이 `content/main`으로 올라가서 모든 사용자에게 보여요

> 관리자 문서는 콘솔에서만 만들 수 있어요 (규칙이 앱에서의 쓰기를 전부 막아요). 관리자를 바꾸려면 이 문서를 지우거나 추가하면 돼요.

## 8단계. 예전 버전에서 넘어올 때
- 예전에는 내 모든 데이터(영상 포함)를 `users/{내 uid}`에 저장했어요. 이번 버전은 관리자 로그인 때 영상·문장을 `content/main`으로 옮기고, `users/{uid}`에는 학습 데이터만 다시 저장해요. 지워지는 데이터는 없어요.
- 혹시 몰라 올리기 전에 **SETTINGS › JSON 백업**을 받아두세요.

---

## 공개 전 점검표 (콘솔에서 직접 확인)

### A. 규칙 시뮬레이터 (Firestore › 규칙 › **규칙 플레이그라운드**)
각 줄을 실행해서 결과가 표와 같으면 OK. `ADMIN_UID` = 관리자 UID, `USER_UID` = 테스트용 일반 계정 UID.

| 위치 | 작업 | 인증 | 기대 결과 |
|---|---|---|---|
| `content/main` | get | 인증 안 함 | 허용 |
| `content/main` | create/update | 인증, UID = `USER_UID` | **거부** |
| `content/main` | update | 인증, UID = `ADMIN_UID` | 허용 |
| `content/main/chunks/0` | create | 인증, UID = `USER_UID` | **거부** |
| `photos/test` | create (`{data: "data:image/jpeg;base64,AA"}`) | `USER_UID` | **거부** |
| `photos/test` | create (같은 데이터) | `ADMIN_UID` | 허용 |
| `admins/USER_UID` | create | `USER_UID` | **거부** |
| `admins/ADMIN_UID` | get | `USER_UID` | **거부** |
| `users/ADMIN_UID` | get | `USER_UID` | **거부** |
| `users/USER_UID` | update | `ADMIN_UID` | **거부** |
| `users/USER_UID/chunks/0` | create | `USER_UID` | 허용 |

(ZIP의 `tests/rules.test.js`는 같은 내용을 Firebase 에뮬레이터로 자동 확인하는 스크립트예요. 방법은 파일 맨 위 주석.)

### B. 앱에서
1. 이메일 **회원가입** → 인증 메일 도착 / **로그아웃** → **로그인** / **비밀번호를 잊었어요** → 재설정 메일 도착
2. 관리자 계정: ADD VIDEO · 영상 관리 · 통화 사진 · 인식 보정 단어가 보임
3. 일반 계정(다른 이메일): 위 항목이 안 보이고, `#/settings/video/…` 주소로 들어가도 SETTINGS로 돌아감
4. 관리자가 영상 추가 → 일반 계정 기기에서 앱을 다시 열거나 1분 안에 새 영상이 보임
5. 일반 계정으로 SAVED에 저장 → 로그아웃 → 다른 계정 로그인 → 이전 계정 SAVED가 **안 보임** → 원래 계정 다시 로그인 → 다시 보임
6. 일반 계정 AI 키 입력 → 로그아웃 → 다른 계정: AI 키 칸이 비어 있음
7. 계정 관리 › 내 학습 데이터 삭제 / 계정 삭제 → 콘솔 Firestore에서 `users/{uid}`가 사라졌는지, Authentication 사용자 목록에서 빠졌는지

## 백업 · 모니터링
- **앱 백업:** SETTINGS › DATA › JSON 백업 (관리자는 영상·문장 포함, 일반 사용자는 내 학습 데이터만)
- **Firestore 자동 백업(내보내기·PITR):** Blaze(종량제) 요금제가 필요해요. 무료로 쓰려면 관리자가 주기적으로 JSON 백업을 받아두세요.
- **사용량:** Firestore › 사용량(Usage) 탭에서 읽기·쓰기 수 확인. 프로젝트 설정 › 사용량 및 결제에서 알림
- **오류 확인:** Authentication › 사용자, Firestore › 데이터. 앱 쪽 오류는 SETTINGS 계정 카드에 표시돼요 (권한 없음 · 오프라인 · 무료 사용량 초과)
- 실시간 오류 수집(Crashlytics 등)은 웹 앱용 무료 도구가 없어 넣지 않았어요.

## 무료 한도 (Spark)
| 항목 | 무료 한도 | 이 앱 |
|---|---|---|
| Firestore 읽기 | 하루 50,000회 | 사용자 1명이 1시간 켜두면 약 120~240회 (콘텐츠·내 데이터 1분마다 확인) |
| Firestore 쓰기 | 하루 20,000회 | 변경 묶음당 2~3회 |
| 저장 공간 | 1GB | 사진 1장 약 0.3~0.9MB |

사용자가 많아지면 읽기 한도에 먼저 닿아요 (대략 동시에 수십 명이 하루 몇 시간). 넘으면 요금 없이 그날 동기화만 멈춰요.

## 문제가 생기면
| 앱 문구 | 확인 |
|---|---|
| 이메일 또는 비밀번호가 맞지 않아요 | 가입한 적 없는 이메일이면 **회원가입** 먼저 |
| 이메일/비밀번호 로그인이 꺼져 있어요 | 4단계 1 |
| 새 회원가입이 막혀 있어요 | 4단계 3 |
| 승인된 도메인에 없어요 | 5단계 |
| 권한이 없어요 (Firestore 보안 규칙 확인) | 6단계 규칙 **게시** · 관리자 작업이면 7단계 |
| 관리자인데 ADD VIDEO가 안 보여요 | 7단계 문서 ID가 UID와 정확히 같은지 · 앱 새로고침 |
| 데이터베이스가 아직 없어요 | 3단계 |
