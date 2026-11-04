# F22 매거진 장소 사진

> 담당: haeans · 이슈: #47 · 브랜치: `haeans/f22-place-photos` · 킥오프: 2026-11-03 (C8, 킥오프 뒤 추가)
> 상태: 작업 중 (DB 0011 반영됨 2026-11-04)

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
| 화면 | `src/app/trips/[tripId]/_components/use-place-photo.ts` (새) | 카드가 화면 가까이 오면 한 번 부른다. 주소에 종류·이름·주소의 짧은 해시(`photoVersion`)를 붙여 그 값을 고친 항목만 새로 받는다. 그림이 깨지면 캐시를 건너뛰고 한 번만 다시 받는다 |
| 화면 | `src/app/trips/[tripId]/_components/place-card.tsx` | 사진(`<img>`, lazy). 앞면 오른쪽 위 ⓘ(Google 사진은 "Google Maps"도), 누르면 사진 크게 보기 창과 출처 전체(`PhotoInfo`) |
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
| [haeans-f22-place-photos] 결정 7 | 화면 | 사진은 매거진 DAY 장소 카드에만 넣는다. 카드가 화면 가까이(200px) 올 때만 부르고, 사진 주소에 종류·이름·주소의 짧은 해시를 붙여 그 값을 고친 항목만 새로 받는다. `updated_at`은 쓰지 않는다: 사진 경로가 장소 ID·Wikimedia 결과를 저장할 때도 바뀌어 첫 방문 뒤 캐시가 한 번 더 깨지고(Google 과금), 메모·비용만 고쳐도 다시 받게 되기 때문이다(화면 확인에서 발견). 출처 표시는 D안(2026-11-04 haeans 결정): 카드 앞면에는 오른쪽 위 ⓘ 버튼 하나만 두고, Google 사진이면 그 옆에 작은 "Google Maps"(작가 없음)를 둔다. ⓘ를 누르면 사진을 크게 보는 창이 뜨고 아래에 "사진 작가(링크) · 라이선스 · Wikimedia Commons 또는 Google Maps(원본 링크)"를 모두 보인다(✕·Esc·바깥 누르기로 닫음, 카드 서랍은 열리지 않음). 근거: Google 문서는 "썸네일은 작가 표시를 뺄 수 있다(전체 출처가 있는 큰 사진을 볼 수 있으면)", "Google Maps"는 사진과 같은 카드 안에 있어야 한다. CC는 "적절한 방식"이면 된다. 앞면 알약(처음 구현), 서랍 안(카드가 길어지고 여행 정보와 섞임), 페이지 맨 아래 목록(Google은 안 되고 출처가 두 곳으로 나뉨), 말풍선(사진을 가리고 큰 사진 예외에 맞지 않음)은 비교 후 뺐다. "Google Maps"·"Wikimedia Commons"는 번역하지 않고(`translate="no"`) 줄을 바꾸지 않는다. |
| [haeans-f22-place-photos] 결정 8 | 서버 | 이름·주소를 고쳐 좌표를 다시 찾으면 장소 ID를 새 값으로 바꾸고 사진 칸(`photo_*`)을 비워 다음에 볼 때 다시 찾는다. 좌표를 다시 찾지 않으면 사진 칸은 그대로다. |

## 5. 회귀 항목

| 확인 내용 | 결과 |
|---|---|
| 단위 테스트(`places.test.ts`): 가로 사진 고르기, 작가 링크, 문서 좌표 1km, Commons 정보·세로 제외, 거리 | 통과 (10개) |
| 실제 Wikimedia API(저장 없이 함수만): 오사카성·해동용궁사·경복궁·기요미즈데라는 사진·작가·라이선스가 나오고, "이치란 라멘 도톤보리점"은 없음(→ Google) | 통과 (2026-11-04, 로컬) |
| DB 0011 반영(haeans 지시, `npm run db:migrate`): `items`에 `place_id`·`photo_url`·`photo_credit`·`photo_page`(모두 null 가능)와 CHECK 4개 | 통과 (2026-11-04, DB 카탈로그 확인) |
| 사진 경로: 로그인 안 함 401, 볼 수 없는 항목 404(캐시 안 함) | 404 통과(로컬). 401은 코드로만 |
| 기존 여행(소유자, 교토·오사카, DAY 1·2 펼침): 관광지 후시미이나리·기요미즈데라·야사카 신사는 Wikimedia 사진과 "작가 · 라이선스 · Wikimedia Commons", 산넨자카·텐류지는 Wikimedia 없음('') → Google 사진, 식당은 Google 사진과 "작가 · Google Maps". DB에 Wikimedia 주소·출처·장소 ID가 저장됨 | 통과 (로컬, PC 1280) |
| 화면에 들어온 카드만 부른다(펼치지 않은 DAY 3~5 항목은 그대로 null) | 통과 (로컬) |
| 다시 열면 사진 경로 9개 모두 브라우저 캐시(전송 0바이트) | 통과 (로컬, 해시 버전으로 고친 뒤) |
| 고치기 전(버전 = `updated_at`): 첫 방문의 저장 때문에 두 번째 방문에서 캐시가 깨짐 | 발견 → 결정 7로 고침 |
| 모바일(375): 가로 넘침 0, 시각 배지와 출처 알약이 겹치지 않음. 작가 이름은 많이 잘림("Z…") | 통과 (로컬) → D안으로 바꿈 |
| D안 PC 1280·모바일 375: 앞면은 ⓘ(+Google 사진은 "Google Maps")만, 시각 배지·지도·펼침 버튼과 겹치지 않음. 가로 넘침 0 | 통과 (로컬) |
| D안: ⓘ → 큰 사진과 "사진 Zeter114514 · CC BY-SA 4.0 · Wikimedia Commons"(Commons 링크), Google은 "사진 작가(maps.google.com 링크) · Google Maps(원본 링크)". Esc·바깥 누르기로 닫힘. 카드 서랍은 열리지 않음. 모바일에서 출처 전체가 보이고 "Wikimedia Commons"가 한 줄 | 통과 (로컬) |
| 이름을 고치면 새 장소의 사진으로 바뀐다 | 미확인 (공용 DB 항목을 고치지 않음. 코드: 결정 8, 해시 버전) |
| R-08: 공유받은 사람도 사진·출처가 보이고 찾거나 저장하지 않는다 | 미확인 (보기 전용 계정에 공유받은 여행이 없음. 코드: 소유자일 때만 저장, RLS) |
| `npm run lint`·`typecheck`·`test`(222개)·`build` | 통과 (2026-11-04) |

## 6. 질문

- 실제 Place Photo 호출 수와 Google 사진 주소가 얼마나 오래 쓰이는지(만료로 다시 받는 횟수)는 배포 뒤 haeans가 콘솔에서 본다. 무료 한도를 넘으면 캐시 기간·서버 캐시·"카드를 펼칠 때만 사진"을 다시 정한다.
- Wikimedia에서 엉뚱한 사진(같은 이름의 가까운 다른 문서)이 나오면 사용자가 바꿀 방법이 없다. 직접 올리기나 "사진 숨기기"가 필요할까?
- ~~모바일에서 출처 알약의 작가 이름이 많이 잘린다~~ → D안(ⓘ → 사진 크게 보기와 출처)으로 정함(결정 7).

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
