# AI 피드백 설정

SETTINGS › AI 피드백에서 연결 방법을 골라요. 각자 자기 키로 써요 — 키는 GitHub에 올라가지 않아요.

| 방법 | 비용 | 준비 | 키가 저장되는 곳 |
|---|---|---|---|
| **Gemini 키** (가장 쉬움) | 무료 등급 | API 키만 (1분) | 이 기기 브라우저 (동기화·백업 제외) |
| **ChatGPT 키** | 유료 (OpenAI 크레딧 충전 필요) | API 키만 | 이 기기 브라우저 (동기화·백업 제외) |
| **Worker** (가장 안전) | 무료 | 키 + Cloudflare Worker (10분) | 내 Cloudflare Worker |

## 빠른 방법: 키 직접 입력

- **Gemini**: https://aistudio.google.com → **Get API key** → **Create API key** → 복사 → 앱 SETTINGS › AI 피드백 › **Gemini 키** 탭에 붙여넣기 → 연결 테스트
- **ChatGPT**: https://platform.openai.com → Billing에서 크레딧 충전 → API keys → **Create new secret key** → 앱 **ChatGPT 키** 탭에 붙여넣기 → 연결 테스트
- 모델 칸은 비워두면 기본값(Gemini `gemini-flash-latest`, ChatGPT `gpt-4o-mini`). 404가 나면 각 사이트에 보이는 모델 이름으로 바꿔요.
- 기기마다 한 번씩 넣어야 해요 (키는 동기화되지 않아요).

---

## 안전한 방법: Cloudflare Worker (무료 · 약 10분)

키를 **Cloudflare Worker**(무료)에 숨겨 두고 앱은 Worker 주소로만 요청해요. 주소·토큰은 동기화돼서 다른 기기에서도 바로 써요.

```
앱 (GitHub Pages) → 내 Worker (키 보관) → Gemini
```

AI가 안 될 때(꺼짐 · 한도 초과 · 오프라인)는 앱 안의 규칙 피드백으로 자동으로 바뀌어요.

---

## 1. Gemini API 키 만들기

1. https://aistudio.google.com 에 Google 계정으로 로그인
2. 왼쪽 **Get API key** → **Create API key**
3. 만들어진 키(`AIza…`)를 복사해 두기 — 다른 사람에게 보여주지 않기

> 무료 등급은 하루 사용량 제한이 있고, 보낸 문장이 Google 서비스 개선에 쓰일 수 있어요. 앱은 내가 말한 영어 문장과 백현이 대사만 보내요.

## 2. Cloudflare Worker 만들기

1. https://dash.cloudflare.com 가입 (무료, 카드 필요 없음)
2. 왼쪽 **Workers & Pages** → **Create** → **Create Worker** (Hello World 템플릿)
3. 이름: `baek-ai` 처럼 아무거나 → **Deploy**
4. **Edit code** → 기존 코드를 전부 지우고, ZIP 안의 `worker/gemini-worker.js` 내용을 그대로 붙여넣기 → **Deploy**

## 3. 키와 토큰 넣기

Worker 화면 → **Settings** → **Variables and Secrets** → **Add**

| 이름 | 종류 | 값 |
|---|---|---|
| `GEMINI_API_KEY` | **Secret** | 1번에서 복사한 키 |
| `OPENAI_API_KEY` | Secret (선택) | ChatGPT로 쓰고 싶으면 OpenAI 키 (유료) |
| `PROVIDER` | Text (선택) | `gemini` 또는 `openai` · 비우면 Gemini 키가 있으면 gemini |
| `APP_TOKEN` | Secret | 아무 긴 문자열 (예: `baek-선우-2026-xxxx`) — 앱에도 똑같이 입력 |
| `ALLOWED_ORIGINS` | Text (선택) | 기본값 `https://kangseonwoo.github.io` · 다른 주소면 여기에 |
| `MODEL` | Text (선택) | 기본값 `gemini-flash-latest` / `gpt-4o-mini` · 모델 이름이 바뀌면 여기만 고치면 돼요 |

저장 후 **Deploy** 한 번 더.

## 4. 앱에 연결

1. Worker 주소 복사 (예: `https://baek-ai.이름.workers.dev`)
2. 앱 **SETTINGS › AI 피드백 › Worker** 탭
   - **Worker 주소** 붙여넣기
   - **앱 토큰**에 `APP_TOKEN`과 같은 값
   - **연결 테스트** → “연결됐어요 · …”가 나오면 끝

## 안 될 때

| 메시지 | 확인할 것 |
|---|---|
| 앱 토큰이 Worker와 달라요 | 앱의 토큰과 `APP_TOKEN` 값이 같은지 |
| 이 주소에서 온 요청은 막혀 있어요 | `ALLOWED_ORIGINS`에 앱 주소(`https://kangseonwoo.github.io`)가 있는지 |
| Worker에 API 키가 없어요 | 변수 이름 철자, 저장 후 Deploy 했는지 |
| Gemini 응답 오류 (429) | 무료 한도 초과 → 잠시 뒤 다시 · 그동안은 규칙 피드백으로 자동 전환 |
| Gemini 응답 오류 (404) | 모델 이름이 바뀌었을 수 있어요 → `MODEL` 값을 AI Studio에 보이는 Flash 모델 이름으로 |
| Worker 주소에 연결할 수 없어요 | 주소 오타, `https://` 포함 여부 |
| API 키가 맞지 않아요 (401) | 키를 다시 복사 · ChatGPT는 크레딧이 있는지 |
| 사용 한도를 넘었어요 (429) | 무료 한도 초과 → 잠시 뒤 다시 (그동안 규칙 피드백) |
