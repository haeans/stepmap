# F22 매거진 장소 사진

> 담당: haeans · 이슈: #47 · 브랜치: `haeans/f22-place-photos` · 킥오프: 2026-11-03 (C8, 킥오프 뒤 추가)
> 상태: 작업 중

## 1. 범위

- PRD 4절 C8 F22: 매거진 장소 카드에 장소 사진(가로 사진 첫 장, 올린 사람 표시). 사진이 없으면 지금처럼 일차 색 그라데이션. DB 변경 있음.
- **범위 고침(2026-11-04 팀 합의, 7절 PRD 반영 요청)**: 출처를 Google Places 하나에서 **관광지는 Wikimedia Commons 먼저, 없거나 식당·숙소면 Google Places**로 바꾼다. Google Place Photo가 과금(월 1,000번 무료)이라 호출을 줄이려는 것이다.
- 하지 않는 것
  - 지도 핀 세부, GO 창(숙소), 추천 카드, 여행 목록 카드에는 사진을 넣지 않는다(매거진 DAY 장소 카드만).
  - 사진 파일을 Storage에 복사하거나, Google 사진 이름·주소를 DB나 서버 캐시에 저장하는 것(약관).
  - 사용자가 직접 사진을 올리는 것.

## 2. 완료 기준

- [ ] 좌표가 있는 관광지·식당·숙소 장소 카드에 가로 사진이 보이고, 사진 위에 출처(작가·라이선스·Wikimedia Commons 또는 작가·Google Maps)가 보인다. 사진이 없으면 일차 색 그라데이션.
- [ ] 관광지는 위키백과 문서 좌표가 저장된 좌표에서 1km 안일 때만 그 문서의 Commons 사진을 쓰고, 주소·출처를 저장해 다음부터 외부 호출이 없다.
- [ ] 식당·숙소(와 Wikimedia 사진이 없는 관광지)는 Google Places 사진. 장소 ID만 저장하고, 사진 응답은 브라우저에 14일 캐시한다.
- [ ] 새로 저장하는 항목은 좌표를 찾을 때 장소 ID도 받는다(호출 수 그대로). 이미 있는 항목은 소유자가 매거진을 볼 때 한 번 찾아 저장한다. 공유받은 사람이 볼 때는 찾거나 저장하지 않는다.
- [ ] 이름·주소를 고쳐 장소를 다시 찾으면 사진도 새로 찾는다.
- [ ] 마이그레이션 반영 전에도 화면이 깨지지 않는다(사진 없이 보임).
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` 통과

## 3. 바꾸는 곳

| 층 | 파일 | 내용 |
|---|---|---|
| DB | `src/db/schema.ts`, `drizzle/0011_items_place_photo.sql` | **DB 변경 있음.** `items`에 비워 둘 수 있는 칸 4개: `place_id`(Google 장소 ID), `photo_url`(null: 아직 안 찾음, '': 없음, 주소: Wikimedia 사진), `photo_credit`(작가 · 라이선스), `photo_page`(Commons 파일 페이지). CHECK 4개(길이, Wikimedia 주소만). 표 권한·RLS는 그대로(`items` 정책을 따름) |
| 서버 | `src/lib/items/geocode.ts` | Text Search 필드에 `places.id`를 더해 `placeId`를 돌려준다 |
| 서버 | `src/lib/items/store.ts` | `resolvePlace`가 장소를 다시 찾으면 `place_id`를 넣고 사진 칸을 비운다(null). 다시 찾지 않으면 그대로 |
| 서버 | `src/lib/places/wikimedia.ts` (새) | 위키백과(ko → en) 검색 → 문서 좌표 1km 확인 → 대표 사진이 Commons에 있으면 800px 썸네일·작가·라이선스·파일 페이지 |
| 서버 | `src/lib/places/photo.ts` (새) | Google: Place Details(`photos`만, 무료 단계) → 가로 사진 첫 장 → Place Photo(`skipHttpRedirect`, 폭 800) 주소·작가·원본 링크 |
| 서버 | `src/lib/places/distance.ts`, `types.ts` (새) | 거리 계산(같은 장소 1km), 카드 사진 형식 |
| 서버 | `src/app/trips/[tripId]/photo/[itemId]/route.ts` (새) | 카드 사진 경로. 위 순서로 찾고 JSON으로 돌려준다. 성공·없음은 `Cache-Control: private, max-age=1209600`(14일), 실패는 `no-store` |
| 화면 | `src/app/trips/[tripId]/_components/use-place-photo.ts` (새) | 카드가 화면 가까이 오면 한 번 부른다. 주소에 `updated_at`을 붙여 고친 항목은 새로 받는다. 그림이 깨지면 캐시를 건너뛰고 한 번만 다시 받는다 |
| 화면 | `src/app/trips/[tripId]/_components/place-card.tsx` | 사진(`<img>`, lazy), 오른쪽 위 출처 표시(`PhotoCredit`) |
| 테스트 | `src/lib/places/places.test.ts` (새) | 사진 고르기, 작가, 문서 좌표 확인, Commons 정보, 거리 |

## 4. 결정 (임시 번호)

| 번호 | 영역 | 결정 |
|---|---|---|
| [haeans-f22-place-photos] 결정 1 | 이미지 | 장소 사진 출처: 관광지는 Wikimedia Commons를 먼저 찾고, 없거나 식당·숙소면 Google Places 사진. Wikimedia는 무료·키 없음이고 주소를 저장할 수 있어 볼 때 외부 호출이 없다. 식당·숙소는 Wikimedia에 사진이 거의 없다. (2026-11-04 팀 합의, haeans 전달) |
| [haeans-f22-place-photos] 결정 2 | 이미지 | Wikimedia 사진은 위키백과(한국어 → 영어)에서 이름으로 문서를 찾아, 문서 좌표가 저장된 좌표에서 1km 안일 때만 같은 장소로 본다. 그 문서의 대표 사진이 Commons에 있을 때만 쓴다(각 언어 위키백과에만 있는 비자유 파일 제외). 가로 사진만, 폭 800 요청 썸네일을 Commons 썸네일 주소(`thumb.wikimedia.org`, 예전 `upload.wikimedia.org`)에서 바로 연다. 추적용 쿼리(`utm_*`)는 떼고 저장한다. 출처는 작가 · 라이선스 · "Wikimedia Commons"(파일 페이지 링크). |
| [haeans-f22-place-photos] 결정 3 | DB | Google 사진은 약관상 장소 ID만 저장한다(`items.place_id`). 사진 이름은 캐시할 수 없고 만료되며, 사진 주소는 짧게만 쓸 수 있다고 되어 있어 서버에는 저장하지 않는다. Wikimedia 사진은 주소·출처를 `items`에 저장한다. 새 테이블 대신 `items`에 칸을 붙여 기존 RLS·권한을 그대로 쓴다(B48과 같은 이유). |
| [haeans-f22-place-photos] 결정 4 | 서버 | Google 사진은 Place Details(`photos`만, Essentials IDs Only 단계, 무료 무제한)로 사진 목록을 받고, 가로 사진 첫 장의 주소만 Place Photo(Enterprise 단계, 월 1,000번 무료, 그 뒤 1,000번당 $7)로 받는다. 키는 브라우저에 보이지 않는다. |
| [haeans-f22-place-photos] 결정 5 | 서버 | 사진 경로의 응답은 브라우저에 **14일** 캐시한다(`private`). 서버에는 Google 값을 캐시하지 않는다. 그동안 Google 사진 주소가 만료되어 그림이 깨지면 카드가 캐시를 건너뛰고 한 번만 다시 받는다. 사진 주소를 브라우저 캐시에 둘 수 있는 기간은 문서에 적혀 있지 않다(금지도 허용도 없음). haeans가 알고 정했다. (2026-11-04) |
| [haeans-f22-place-photos] 결정 6 | 서버 | 새로 저장하는 항목은 좌표 찾기(Text Search)에서 장소 ID를 같이 받는다(필드만 더함, 이미 Pro 단계라 요금 그대로). 이미 있는 항목은 소유자가 매거진을 볼 때 이름 + 목적지로 한 번 다시 찾아, 저장된 좌표에서 1km 안이면 장소 ID를 저장한다. Wikimedia도 소유자가 볼 때 한 번 찾아 결과(없으면 '')를 저장한다. 공유받은 사람이 볼 때는 외부에서 찾거나 저장하지 않는다(RLS로도 막힘). |
| [haeans-f22-place-photos] 결정 7 | 화면 | 사진은 매거진 DAY 장소 카드에만 넣는다. 카드가 화면 가까이(200px) 올 때만 부르고, 사진 주소에 항목의 `updated_at`을 붙여 고친 항목은 새로 받는다. 출처는 카드 사진 오른쪽 위 알약(`PhotoCredit`, 12px, 흰 글씨·어두운 바탕). "Google Maps"·"Wikimedia Commons"는 번역하지 않는다(`translate="no"`). |
| [haeans-f22-place-photos] 결정 8 | 서버 | 이름·주소를 고쳐 좌표를 다시 찾으면 장소 ID를 새 값으로 바꾸고 사진 칸(`photo_*`)을 비워 다음에 볼 때 다시 찾는다. 좌표를 다시 찾지 않으면 사진 칸은 그대로다. |

## 5. 회귀 항목

| 확인 내용 | 결과 |
|---|---|
| 단위 테스트(`places.test.ts`): 가로 사진 고르기, 작가 링크, 문서 좌표 1km, Commons 정보·세로 제외, 거리 | 통과 (10개) |
| 실제 Wikimedia API(저장 없이 함수만): 오사카성·해동용궁사·경복궁·기요미즈데라는 사진·작가·라이선스가 나오고, "이치란 라멘 도톤보리점"은 없음(→ Google) | 통과 (2026-11-04, 로컬) |
| 마이그레이션 반영 전: 매거진이 사진 없이 그대로 보이고 콘솔 오류가 없다 (사진 경로는 503, 캐시 안 함) | |
| (반영 후) 관광지(예: 오사카성): Wikimedia 사진·출처, 다시 열면 외부 호출 없음(DB 값) | |
| (반영 후) 식당·숙소: Google 사진·작가·"Google Maps", 다시 열면 사진 경로를 부르지 않음(브라우저 캐시) | |
| (반영 후) 기존 항목: 소유자가 보면 장소 ID·Wikimedia 결과가 저장된다. 공유받은 사람은 저장하지 않는다 | |
| (반영 후) 이름을 고치면 새 장소의 사진으로 바뀐다 | |
| 좌표 없는 장소, 교통·메모는 사진을 부르지 않는다 | |
| R-07: 카드 지도 버튼·"지도에서 보기" 그대로 | |
| R-08: 공유받은 사람도 사진·출처가 보인다(수정·삭제 없음) | |
| PC 1280·모바일 390: 출처 알약이 시각 배지·지도 버튼과 겹치지 않고 가로 스크롤 없음 | |

## 6. 질문

- 실제 Place Photo 호출 수와 Google 사진 주소가 얼마나 오래 쓰이는지(만료로 다시 받는 횟수)는 배포 뒤 haeans가 콘솔에서 본다. 무료 한도를 넘으면 캐시 기간·서버 캐시·"카드를 펼칠 때만 사진"을 다시 정한다.
- Wikimedia에서 엉뚱한 사진(같은 이름의 가까운 다른 문서)이 나오면 사용자가 바꿀 방법이 없다. 직접 올리기나 "사진 숨기기"가 필요할까?

## 7. 공통 문서 반영 요청

| 문서 | 반영할 내용 |
|---|---|
| `01-PRD.md` "v1.0 이후 후보" | **(범위 고침, 2026-11-04 팀 합의)** "장소 사진: 매거진 장소 카드에 Google Places 사진" → "장소 사진: 매거진 장소 카드에 관광지는 Wikimedia Commons 사진을 먼저, 없거나 식당·숙소면 Google Places 사진" |
| `01-PRD.md` 4절 C8 표 F22 줄 | **(범위 고침)** "Google Places 사진(가로 사진 첫 장, 올린 사람 표시). 항목을 저장할 때 장소를 찾아 `items`에 저장하고" → "관광지는 Wikimedia Commons 사진(위키백과 문서 좌표로 같은 장소 확인), 없거나 식당·숙소면 Google Places 사진(가로 사진 첫 장, 올린 사람 표시). Google은 장소 ID만, Wikimedia는 사진 주소·출처를 `items`에 저장하고" |
| `01-PRD.md` 5절 리스크 "Places 사진 요금" | 대응에 "관광지는 Wikimedia 먼저, Google 사진 응답은 브라우저에 14일 캐시" 추가 |
| `STACK.md` 4절, `deploy.md`, `integration.md` 2절 | 외부 서비스에 Wikimedia(위키백과·Commons API, 무료, 키 없음) 추가 (B30 관리 대상) |
| `decisions.md` | 결정 1~8에 B-번호. B70("장소 사진 API는 쓰지 않는다")·B38(장소 사진 출처) 고침 |
| `02-FRONTEND.md` | 3-1·3-5 장소 사진, 5절 `PlaceCard`(사진·`PhotoCredit`), `use-place-photo.ts` |
| `03-BACKEND.md` | 1절 사진 경로 `GET /trips/{id}/photo/{itemId}`, 4-1 Text Search `places.id`, 7절 Wikimedia·Google Places 사진 |
| `04-DB.md` | `items`의 `place_id`·`photo_url`·`photo_credit`·`photo_page`와 CHECK, 마이그레이션 0011 |
| `open-questions.md` | 6절 질문 2개. "`items.link` 비우기 0011"은 0011 번호를 F22가 썼으므로 번호를 지우고, 비울 값이 있는지 haeans가 DB에서 확인 |
| `regression.md` | 5절 회귀 항목 |
