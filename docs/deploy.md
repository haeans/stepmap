# deploy

외부 서비스(Vercel, Supabase, Google Cloud, Gemini)의 배포·운영 설정입니다. 처음부터 다시 만들거나 설정을 바꿀 때 봅니다.

> 작성: AI · 관리: haeans (B30) · 갱신: 설정이 바뀔 때 (① 킥오프 또는 ④ 최신화)
> 공개 주소: https://stepmap-pi.vercel.app (B28)

## 1. Vercel

| 항목 | 위치 | 값 |
|---|---|---|
| 저장소 | Add New > Project | GitHub `haeans/stepmap` |
| 프레임워크 | Settings > Build and Deployment | Framework Preset **Next.js**, Build·Output·Install Override 모두 끔, Node.js 24.x |
| 운영 브랜치 | Settings > Environments > Production > Branch Tracking | `main` (B29) |
| 미리보기 배포 | 저장소 `vercel.json`의 `ignoreCommand` | 운영이 아니면 빌드를 건너뜀 (B32) |

- `main`에 머지하면 자동으로 운영 배포된다. 직접 하려면 Deployments > Create Deployment에 `main`을 넣는다.
- 공개 주소는 Overview > Domains의 짧은 주소다. 배포마다 생기는 긴 주소는 쓰지 않는다.
- 저장소를 처음 가져올 때 `main`에 코드가 없으면 Framework가 "Other"로 잡혀 `No Output Directory named "public"` 오류가 난다(v1.0 때 겪음). Preset을 Next.js로 바꾸고 다시 배포한다.

### 환경 변수

프로젝트 사이드바 > Environment Variables. 범위는 **Production만**.

| 이름 | 종류 | 비고 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Config | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Config | 키처럼 보인다는 경고는 무시 (RLS가 보호) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Config | 경고 무시 (Websites 제한이 보호) |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Config | |
| `GOOGLE_MAPS_SERVER_KEY` | Secret | |
| `GEMINI_API_KEY` | Secret | |

- `NEXT_PUBLIC_` 값은 브라우저에 공개되는 값이라 Secret으로 넣을 수 없다. 빌드에 들어가므로 바꾸면 다시 배포한다.
- 넣지 않는 값: `DEV_*`(개발용 로그인, B27), `DATABASE_URL`(마이그레이션 전용), `ANTHROPIC_API_KEY`(쓰지 않음).
- `.env` 붙여넣기로 한꺼번에 넣을 때 `.env.local`을 통째로 붙이지 않는다.

## 2. Supabase

| 항목 | 위치 | 값 |
|---|---|---|
| Site URL | Authentication > URL Configuration | `https://stepmap-pi.vercel.app` |
| Redirect URLs | 같은 곳 | `https://stepmap-pi.vercel.app/**`, `http://localhost:3000/**` |
| 이메일 공급자 | Authentication > Providers > Email | 켬, Confirm email 켬 |

- Site URL이 localhost로 남아 있으면 배포본에서 구글 로그인 후 localhost로 돌아간다(v1.0 때 겪음).
- localhost 항목은 로컬 개발의 구글 로그인용이라 지우지 않는다.
- 이메일 공급자는 로컬 개발용 로그인(B27)이 이메일·비밀번호 계정을 쓰기 때문에 켜 둔다. 화면에는 구글 로그인만 보인다. 구글 외 가입을 완전히 막는 것은 확장 단계에서 정한다.
- DB 마이그레이션(`npm run db:migrate`)과 `DATABASE_URL`(Session pooler 주소, B9)은 haeans만 쓴다.

## 3. Google Cloud

### 구글 로그인

- OAuth consent screen: 게시 상태가 Testing이면 3명의 구글 계정을 Test users에 넣는다.
- OAuth 클라이언트의 Redirect URI는 Supabase 주소(`…supabase.co/auth/v1/callback`)라 배포 주소가 바뀌어도 고치지 않는다.

### 지도 키 (두 개)

| | 브라우저 키 | 서버 키 |
|---|---|---|
| 환경 변수 | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | `GOOGLE_MAPS_SERVER_KEY` |
| Application restrictions | Websites: `http://localhost:3000/*`, `https://stepmap-pi.vercel.app/*` | None (Vercel 서버 IP가 바뀜) |
| API restrictions | Maps JavaScript API | Places API (New), Routes API |

- Geocoding API는 쓰지 않는다. 좌표 찾기는 Places API (New) Text Search다(B11). Places API(구버전)와 헷갈리지 않는다.
- 지도 ID: Map Management에서 JavaScript, Raster(기울기·회전 끔)로 만들어 `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`에 넣는다. 없으면 코드가 `DEMO_MAP_ID`를 쓴다(B22).

### 할당량과 예산

| API | 항목 | 값 |
|---|---|---|
| Maps JavaScript API | Map loads per day | 500 |
| Places API (New) | Text Search requests per day | 300 |
| Routes API | Compute Routes requests per day | 300 |

- Billing > Budgets & alerts에 예산 알림(50%·90%·100%)을 둔다. 알림은 결제를 막지 않고, 막는 것은 할당량이다.

## 4. Gemini

- 키는 `GEMINI_API_KEY` 하나다(무료 등급, B14). 서버에서만 쓴다.

## 5. 배포 후 확인

- 로그인하지 않고 공개 주소를 열면 `/login`으로 가고, 구글 로그인 버튼만 보인다(개발용 버튼 없음).
- 구글 로그인 후 공개 주소로 돌아와 여행 목록이 보인다.
- 지도(바탕·핀·경로), 붙여넣기 추출, 공유 링크(다른 계정은 보기 전용)가 동작한다.
- 확인 결과는 `docs/regression.md`에 적는다.
