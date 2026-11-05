# STACK

기술 스택마다 선택한 이유를 설명하는 문서입니다.

> 작성: AI 초안, 사람 확정 · 갱신: 스택이 바뀔 때

## 1. 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 화면 프레임워크 | Next.js | 계획서에 기록 없음 |
| 배포 | Vercel Hobby | 계획서에 기록 없음 |
| DB | Supabase Free (PostgreSQL 500MB) | 계획서에 기록 없음 |
| 로그인 | Supabase Auth (구글 로그인) | 계획서에 기록 없음 |
| 권한 | Supabase RLS | "내 여행만 수정, 공유받은 사람은 보기만"을 DB에서 막는다. |
| ORM | Drizzle | 계획서에 기록 없음 |
| 지도 | Google Maps | 지도 표시, 장소 검색·지오코딩 (실제 경로 계산은 C9 F25에서 뺌, B175) |
| AI 추출 | Claude API(`claude-sonnet-5-5`) 먼저 + Gemini API (무료 등급) | Claude API는 무료 플랜이 없어 E1에 따라 Gemini로 바꿨다(B14). → C10 F33(#78)부터 배포 받은 Claude 키로 Claude API를 먼저 부르고, 키가 없거나 실패하면 Gemini(B218, B219). |
| 공유 | 공유 링크 + Supabase Auth 로그인 + RLS 보기 전용 | 아래 3절 |
| 대표 이미지 (C7) | Unsplash API + Supabase Storage | 자동 이미지는 무료 사진 API, 직접 올린 사진은 이미 쓰는 Supabase에 둔다(B38, B47~B51). |
| 장소 사진 (C8) | Wikimedia(위키백과·Commons API) + Google Places 사진 | 관광지는 무료·키 없는 Wikimedia를 먼저, 그 밖은 이미 쓰는 Google Places(B136~B143). |
| 날씨 (C7) | Open-Meteo | 키·비용 없음(B74) |

## 2. Drizzle과 RLS를 함께 쓰는 방식

- Drizzle은 테이블 정의, 마이그레이션, RLS 정책 정의만 맡는다.
- 앱의 데이터 읽기·쓰기는 로그인 사용자 권한으로 접속하는 Supabase 클라이언트로 한다.
- **이유**: Drizzle로 DB에 직접 접속하면 관리자 권한이 되어 RLS가 적용되지 않을 수 있다.

## 3. 공유 방식의 이유

1. 합의된 방식이 링크 전달이라 메일 발송 서비스가 필요 없다.
2. 받는 사람 확인은 이미 쓰는 Supabase Auth 로그인으로 해결된다.
3. 보기 전용 제한은 이미 쓰는 RLS 규칙으로 막는다.

## 4. 외부 서비스와 비용

> 무료 한도와 가격은 정책이 자주 바뀐다. 0) 기반 단계에서 공식 페이지로 다시 확인한다.
> [가정] 표시는 알고 있는 범위의 값이다.

| 서비스 | 비용 | 조건·주의 | 초과 방지 |
|---|---|---|---|
| AI 추출 – Claude | C10 F33(#78)부터 사용 (`claude-sonnet-5-5`, 먼저 부름) | 배포 받은 키, 한도·토큰 제한 없음(C10 킥오프). 키는 haeans가 관리(B30) | 키는 서버 쪽에만, 원문 길이 제한·가리기(B18)는 그대로 |
| AI 추출 – Gemini (`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`) | 0원 (무료 등급, 결제 계정 연결 안 함. 모델마다 RPM 15, TPM 25만, RPD 500) | 무료 등급은 보낸 내용을 서비스 개선에 쓰고 사람이 볼 수 있다(공식 약관 확인). 한도는 프로젝트 단위이고 하루 한도는 태평양 시간 자정에 초기화된다. | 원문 길이 제한, 개인정보 가리기(B18), 재시도 없음(B17), 키는 서버 쪽에만 |
| 구글맵 (지도 표시, 경로, 장소 검색·지오코딩) | 조건부 무료. API마다 월 무료 호출 수가 있다 [가정]. 개발·검수 규모라면 0원 | 결제 계정에 카드 등록이 필요하다. 3명 중 1명이 합의하에 등록한다. | API별 일일 할당량을 낮게 제한, 예산 알림 설정, 키를 배포 도메인에서만 쓰도록 제한 |
| 로그인 (Supabase Auth) | 무료 등급 | — | — |
| DB (Supabase Free) | 0원 | 용량 500MB. 일정 기간 쓰지 않으면 일시 정지된다 [가정]. | 시연 전에 미리 접속해 깨워 둔다. |
| 배포 (Vercel Hobby) | 0원 | 비상업 용도 조건이 있다 [가정]. 공개 주소로 배포해 3명 모두 접속한다. | — |
| 공유 | 0원 | 링크 방식이라 메일 서비스가 필요 없다. | — |
| 대표 이미지 – Unsplash (C7) | 0원 (Demo: 앱 전체 시간당 50번) [가정] | 작가 표시·다운로드 알림·utm 규칙을 지켜야 한다(B50). | 여행 만들 때만 검색 1번 + 다운로드 알림 1번, 실패하면 건너뜀 |
| 대표 이미지 – Supabase Storage (C7) | 0원 (Free 등급 용량 안) [가정] | 공개 버킷, 5MB·3종 제한 | 여행마다 파일 하나로 덮어쓰기, 여행 삭제 때 지움 |
| 날씨 – Open-Meteo (C7) | 0원 (비상업 무료, 키 없음) [가정] | 비상업 용도 조건 [가정] | 3시간 캐시 |
| 장소 사진 – Wikimedia (C8) | 0원 (키 없음) | 사진마다 작가·라이선스·파일 페이지 표시(CC). 연락처가 든 User-Agent를 보낸다 | 소유자가 볼 때 항목마다 한 번 찾아 주소를 저장 |
| 장소 사진 – Google Places (C8) | Place Details(사진 목록)는 무료, Place Photo는 월 1,000번 무료 후 1,000번당 $7 | 장소 ID만 저장(사진 이름·주소 저장 금지). 작가와 "Google Maps" 표시 | 화면에 들어온 카드만, 브라우저 14일 캐시(B140) |

- **예상 총비용**: 0원
- **예산 한도**: 10,000원 안에서 운영한다.

## 5. 버전과 기반 설정 (v0.1)

| 영역 | 패키지 | 버전 |
|---|---|---|
| 런타임 | Node.js | 24 |
| 화면 | next / react | 16.4.3 / 19.3.0 |
| 스타일 | tailwindcss | 4 |
| Supabase | @supabase/ssr / @supabase/supabase-js | 0.12.7 / 2.118.0 |
| ORM | drizzle-orm / drizzle-kit (+ postgres, 마이그레이션 전용) | 0.45.4 / 0.31.11 |
| 테스트 | vitest | 5.0.5 |
| AI 추출 (v0.6) | @google/genai / zod | 2.32.0 / 4.6.7 |
| AI 추출 – Claude (C10 F33) | @anthropic-ai/sdk | ^1.5.0 |

- **Next.js 16 주의**: 미들웨어는 `proxy`(`src/proxy.ts`)라는 이름으로 바뀌었다. 구현 전에 `node_modules/next/dist/docs/`의 해당 문서를 확인한다. (`AGENTS.md`)
- **cacheComponents는 끈다**: 대부분의 화면이 로그인 쿠키를 읽는 사용자별 화면이라 정적 셸 이점이 작고, Supabase 쿠키 처리만 복잡해진다.
- **Supabase 클라이언트**: `src/lib/supabase/server.ts`(서버), `src/lib/supabase/client.ts`(브라우저). 둘 다 공개 키와 로그인 쿠키로 접속하므로 RLS가 적용된다. 관리자 키(service role)는 쓰지 않는다.
- **Drizzle**: 정의는 `src/db/schema.ts`, 마이그레이션 파일은 `drizzle/`. `DATABASE_URL`은 `drizzle-kit`만 쓴다.
- **환경 변수**: 이름과 쓰는 단계는 `.env.example`에 있다. 값은 `.env.local`과 Vercel 환경 변수에만 둔다.
