# F08 여행 대표 이미지

> 담당: haeans · 이슈: #20 · 브랜치: `haeans/f08-cover-image` · 킥오프: 2026-11-02
> 상태: 반영 완료(2026-11-03, sync PR #32)

## 1. 범위

- PRD 4절 C7 F08, B38(c안): 여행마다 대표 이미지 1장. 목적지로 자동으로 넣고, 사용자가 직접 올려 바꿀 수 있다.
- 자동 이미지는 Unsplash로 한다(C7 진행 중 결정, 인계 메모 2026-11-02).
- F09 카드에 대표 이미지를 연결한다.
- 하지 않는 것
  - 매거진(상세 화면) 배경 연결: F08 머지 후 F10이 한다.
  - 기존 여행 이미지를 한꺼번에 받기, 다른 Unsplash 사진 고르기 화면
  - 공통 문서 수정

## 2. 완료 기준

- [x] 목적지를 적고 여행을 만들면 Unsplash 사진이 대표 이미지로 들어가 카드에 꽉 차게 보인다.
- [x] 카드에 작가 이름과 Unsplash 링크가 보인다(자동 사진일 때만).
- [x] Unsplash 호출은 여행을 만들 때 검색 1번과 다운로드 알림 1번뿐이다. 목록·상세를 열 때는 DB만 읽는다.
- [x] DB에는 사진 주소·대표 색·작가만 저장한다(파일 복사 없음).
- [x] 목적지가 없거나, 키가 없거나, 한도 초과·실패·시간 초과여도 여행 만들기는 성공하고 기본 카드로 보인다. (목적지 없음은 직접 확인, 키 없음·한도 초과·시간 초과는 코드로 확인)
- [x] 소유자는 카드의 "대표 이미지" 버튼으로 사진을 올려 바꿀 수 있다(jpeg·png·webp, 5MB까지).
- [x] 올린 사진은 자동 사진으로 덮어쓰지 않는다.
- [x] 공유받은 사람도 대표 이미지를 보지만 바꾸기 버튼은 보이지 않는다.
- [x] 다른 사람의 여행 폴더에는 사진을 올리거나 지울 수 없다(Storage RLS).
- [x] 마이그레이션은 추가형이다. 반영 전 배포본도 그대로 동작한다.
- [x] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` 통과

## 3. 바꾸는 곳

| 층 | 파일 | 내용 |
|---|---|---|
| DB | `src/db/schema.ts`, `drizzle/0007_*.sql` | `trips`에 비워 둘 수 있는 칸 5개(`cover_url`, `cover_color`, `cover_source`, `cover_author_name`, `cover_author_url`)와 CHECK |
| DB | `drizzle/0008_trip_covers_storage.sql` (직접 쓴 마이그레이션) | Storage 공개 버킷 `trip-covers`(5MB, jpeg·png·webp)와 `storage.objects` 정책: 그 여행 소유자만 `<여행 id>/` 폴더에 넣기·고치기·지우기 |
| 서버 | `src/lib/cover/unsplash.ts` (새 파일) | Unsplash 검색·다운로드 알림. 실패하면 `null` |
| 서버 | `src/app/actions/trips.ts` | 여행 만들 때 자동 이미지, 올린 사진 기록(`setUploadedCover`), 여행 지울 때 올린 사진도 지움 |
| 화면 | `src/lib/cover/cover.ts`, `cover.test.ts` (새 파일) | 보여 줄 크기의 주소 만들기(w·q), 작가·Unsplash 링크(utm), Unsplash 응답 해석 |
| 화면 | `src/app/_components/trip-row.tsx` | 대표 이미지(`<img>`, 최적화 끔), 작가 표시, "대표 이미지" 버튼 |
| 화면 | `src/app/_components/cover-upload.tsx` (새 파일) | 사진 고르기 → Storage 올리기 → 기록 |
| 화면 | `src/lib/trips/types.ts` | `Trip`과 `TRIP_COLUMNS`에 새 칸 |
| 설정 | `.env.example`, `src/lib/env.ts` 영향 없음 | `UNSPLASH_ACCESS_KEY`(서버 전용, 없으면 자동 이미지 건너뜀) |

## 4. 결정 (임시 번호)

| 번호 | 영역 | 결정 |
|---|---|---|
| [haeans-f08-cover-image] 결정 1 | 이미지 | 자동 대표 이미지는 Unsplash. 여행을 만들 때 목적지로 검색 1번(가로, 1장, `content_filter=high`), 쓰기로 한 사진에 다운로드 알림 1번만 부른다. 기존 여행은 한꺼번에 받지 않는다. Demo 키 한도는 앱 전체 시간당 50번이고, 사용자가 늘면 haeans가 Production을 신청한다. |
| [haeans-f08-cover-image] 결정 2 | DB | 사진 파일은 복사하지 않고 주소(`urls.raw`)·대표 색·작가 이름·작가 링크만 `trips`의 새 칸에 저장한다. 새 테이블 대신 칸을 붙여 기존 `trips` RLS와 권한을 그대로 쓴다. |
| [haeans-f08-cover-image] 결정 3 | 화면 | Next.js 이미지 최적화는 쓰지 않는다(`<img>`). 크기는 Unsplash 주소 파라미터(`w`, `q`, `fit`, `auto=format`)로 정한다. |
| [haeans-f08-cover-image] 결정 4 | 화면 | 자동 사진이면 카드에 "Photo by 작가 on Unsplash"를 작게 보이고, 작가·Unsplash 링크에 `utm_source=stepmap&utm_medium=referral`을 붙인다. |
| [haeans-f08-cover-image] 결정 5 | 이미지 | 올린 사진은 Supabase Storage 공개 버킷 `trip-covers`의 `<여행 id>/cover` 한 곳에 덮어 둔다. 여행 id(무작위 uuid)를 아는 사람만 주소를 안다. 주소에 `?v=<시각>`을 붙여 바꾼 사진이 바로 보이게 한다. 올리기는 로그인한 사용자 권한의 클라이언트로 하고 Storage RLS가 소유자만 허용한다. |
| [haeans-f08-cover-image] 결정 6 | 이미지 | 올린 사진은 `cover_source = 'upload'`이고 대표 색·작가는 비운다. 자동 사진은 여행을 만들 때만 넣으므로 올린 사진을 덮어쓰지 않는다. |
| [haeans-f08-cover-image] 결정 7 | 화면 | "대표 이미지" 버튼은 목록 카드의 이름 수정·삭제 옆에 둔다(소유자만). 상세 화면은 F10이 고치므로 건드리지 않는다. |
| [haeans-f08-cover-image] 결정 8 | 서버 | 여행을 지울 때 올린 사진(`<여행 id>/cover`)도 지운다. 실패해도 여행 삭제는 진행한다. |

## 5. 회귀 항목

| 확인 내용 | 결과 |
|---|---|
| 마이그레이션 0007·0008 공용 DB 반영 (칸 5개, 버킷 `trip-covers`, 정책 4개) | 반영·조회 확인 (2026-11-02, haeans 지시) |
| 반영 후 기존 여행 목록이 그대로 보임(이미지 없는 여행은 기본 카드) | 통과(로컬) |
| 목적지 "교토"로 여행 만들기 → Unsplash 사진이 카드에 꽉 참, 작가 표시 | 통과(로컬) |
| 한글 목적지 검색 ("오사카" 20건) | 통과 |
| Storage: 보기 전용 계정·로그인 안 한 사용자가 소유자 여행 폴더에 올리기 | 거절됨(RLS) |
| Storage: 소유자가 `cover` 아닌 이름으로 올리기 / gif 올리기 | 거절됨 |
| Storage: 소유자 올리기·덮어쓰기, 공개 주소로 보기, 보기 전용 계정의 지우기는 0건, 소유자 지우기 | 통과 |
| 모바일 폭(375px)에서 카드 버튼 3개와 작가 표시가 겹치지 않음 | 통과(크롬 휴대폰 모드) |
| 새 여행을 직접 만들기 → 대표 이미지 자동으로 들어감, 새로고침해도 같은 사진 | 통과(haeans, 로컬) |
| 카드에서 사진 올리기 → 바로 바뀜, 작가 표시 사라짐 | 통과(haeans, 로컬) |
| gif·5MB 넘는 사진 → 안내 문구, 사진 그대로 | 통과(haeans, 로컬) |
| 목적지 없이 만들기 → 기본 카드 | 통과(haeans, 로컬) |
| 공유받은 계정: 대표 이미지 보임, 버튼 없음 | 통과(haeans, 로컬) |
| 올린 사진이 있는 여행 지우기 → Storage 사진도 지워짐 | 통과(haeans, 로컬) |
| F09 기존 기능(카드 눌러 들어가기, 미리보기, 이름 수정) | 통과(haeans, 로컬) |
| `npm run lint`, `typecheck`, `test`(90개), `build` | 통과 |
| 키 값이 코드·커밋에 없음 (`integration.md` 8절) | 통과 (커밋 내용 검색, `.env.local` 추적 안 됨) |
| `regression.md` 2절·v0.3·v0.9·v1.0 권한: 보기 전용 계정이 남의 여행 대표 이미지 칸 고치기 0행, 로그인 안 하면 trips 읽기 0행 | 통과(스크립트) |
| `regression.md` v0.3: `anon`에 trips 권한 없음, `authenticated`는 SELECT·INSERT·UPDATE·DELETE만, public 표 4개 RLS 켜짐 | 통과(DB 조회) |
| 대표 이미지 칸 CHECK: http 주소·틀린 색·다른 출처 값 거절, 거절 뒤 값 그대로 | 통과(스크립트) |
| `owns_trip_cover` 함수를 로그인 안 하고 부르면 거절 | 통과(스크립트) |
| 공유받은 여행의 대표 이미지 보기 (R-08) | 통과(haeans, 로컬). 스크립트 확인 때는 공유된 여행이 없어 건너뜀 |
| `regression.md` R-01·R-02 목록 기능(이름 고치기, 지우기, 오가며 열기) | 통과(haeans, 로컬, F09 기존 기능 항목) |

## 6. 질문

- Unsplash 검색어는 목적지를 그대로 쓴다. 한글 목적지의 검색 결과가 부족하면 다음에 영어 이름으로 바꾸는 방법을 정한다.

## 7. 공통 문서 반영 요청

| 문서 | 반영할 내용 |
|---|---|
| `04-DB.md` | `trips` 새 칸 5개와 CHECK, Storage 버킷 `trip-covers`와 정책 |
| `03-BACKEND.md` | Unsplash 호출(만들 때 검색 1번 + 다운로드 알림 1번, 실패 시 건너뜀), 올린 사진 기록·삭제 |
| `decisions.md` | 결정 1~8, B38 보강(Unsplash, 주소만 저장) |
| `deploy.md` | Vercel 환경 변수 `UNSPLASH_ACCESS_KEY`, Unsplash 앱(Demo 한도, Production 신청) |
| `open-questions.md` | 한글 목적지 검색 품질 (6절) |
