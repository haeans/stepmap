# stepmap (발자국)

프로젝트 소개와 실행 방법입니다.

## 소개

흩어진 여행 정보를 붙여넣기만 하면 한 장의 여행 계획과 지도 위 동선이 완성된다.
떠나기 전에는 계획이 되고, 다녀온 뒤에는 추억으로 남는다.

- 티켓(항공·열차 등), 예약 메일(숙소 등), 메모, 링크 텍스트를 붙여넣으면 AI가 일정 항목으로 정리한다.
- 정리된 일정은 세 가지 방식으로 보여 준다.
  - **1화면(일정)**: A안(크게, PC 기본)과 B안(종이, 모바일 기본) 중 원하는 형식을 고른다.
  - **2화면(지도)**: 실제 경로를 따른 동선을 보여 준다.
  - **비용**: 통화별 합계와 정산을 보여 준다.
- 대상: 여행을 계획하는 사람 누구나 (국내·해외 여행 모두)

## v1.0 필수 기능

1. 구글 로그인
2. 여행 목록 (만들기·열기·이름 수정·삭제)
3. 버튼으로 여는 입력창
4. 붙여넣기 → 자동 추출
5. 직접 입력·수정
6. 지도 (실제 경로 동선)
7. 1화면 → 2화면 연결
8. 공유 (공유 링크, 보기 전용)
9. 비용 합계·정산

자세한 요구사항은 [docs/01-PRD.md](docs/01-PRD.md)에 있다.

## 기술 스택

Next.js · Vercel Hobby · Supabase Free(PostgreSQL) · Supabase Auth(구글 로그인) · Supabase RLS · Drizzle · Google Maps · Gemini API(Claude API는 무료 플랜이 없어 대체)

선택 이유는 [docs/STACK.md](docs/STACK.md)에 있다.

## 실행 방법

Node.js 24가 필요하다.

1. 의존성 설치: `npm install`
2. 환경 변수: `.env.example`을 `.env.local`로 복사하고 값을 채운다. (`.env.local`은 저장소에 올리지 않는다)
3. 개발 서버: `npm run dev` → http://localhost:3000

| 명령 | 내용 |
|---|---|
| `npm run lint` | 린트 |
| `npm run typecheck` | 라우트 타입 생성 후 타입 검사 |
| `npm test` | 단위 테스트 (Vitest) |
| `npm run build` | 배포용 빌드 |
| `npm run db:generate` | `src/db/schema.ts`에서 마이그레이션 파일 생성 |
| `npm run db:migrate` | 마이그레이션을 Supabase DB에 적용 (`DATABASE_URL` 필요) |

## 배포

- Vercel Hobby에 배포한다.
- 3명 모두 접속할 수 있는 공개 주소로 배포한다.
- 공개 주소: 배포 후 기록한다.

### 배포 설정 순서 (v1.0)

1. **Vercel 프로젝트**: GitHub 저장소 `haeans/stepmap`을 가져온다. Settings > Git > Production Branch를 `haeans/v1.0`으로 바꾼다. `main`은 쓰지 않는다.
2. **환경 변수** (Vercel > Settings > Environment Variables, Production). `DEV_*`(개발용 로그인)는 넣지 않는다: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`, `GOOGLE_MAPS_SERVER_KEY`, `GEMINI_API_KEY`. `DATABASE_URL`은 마이그레이션 전용이라 넣지 않는다. `NEXT_PUBLIC_`으로 시작하는 값은 빌드에 들어가므로 바꾸면 다시 배포한다.
3. **Supabase 로그인 주소** (Authentication > URL Configuration): Site URL을 배포 주소로, Redirect URLs에 `https://배포주소/auth/callback`을 더한다. 로컬 개발용 `http://localhost:3000/auth/callback`은 남겨 둔다.
4. **Supabase 이메일 공급자** (Authentication > Providers > Email): 로컬 개발용 로그인(B27)이 이메일·비밀번호 계정을 쓰므로 켜 둔다. 화면에는 구글 로그인만 보인다. 대신 이메일 가입은 확인 메일을 거치게 두고(Confirm email 켬), API 일일 할당량으로 남용을 막는다. 구글 외 가입을 완전히 막는 것은 확장 단계에서 정한다.
5. **지도 키**: 브라우저 키의 웹사이트 제한에 `https://배포주소/*`를 더한다. Map Management에서 JavaScript용 지도 ID를 만들어 `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`에 넣는다. Maps JavaScript·Places·Routes API에 낮은 일일 할당량을 건다.
6. 배포가 끝나면 공개 주소를 위에 적고, `docs/regression.md`의 v0.1 "Vercel 공개 주소" 항목을 확인한다.

## 문서

문서 지도와 읽는 순서는 [docs/README.md](docs/README.md)에 있다.
