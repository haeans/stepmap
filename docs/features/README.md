# 기능 목록

기능 번호·기능·상태 표와, v1.0 이후 수정·꾸미기 담당자 표입니다.

> 작성: AI · 갱신: 사이클 시작과 끝
> 상태: 미착수 → (사이클 시작) → 검수 결과 합격·불합격

## 1. 기능 번호·상태

| 기능 파일 | 사이클 | 기능 | R-번호 | 상태 |
|---|---|---|---|---|
| [F01 계정·목록](F01-account.md) | C1 | 구글 로그인, 여행 목록 | R-01, R-02 | 합격 |
| [F02 입력창·직접 입력](F02-input.md) | C2 | 버튼으로 여는 입력창, 직접 입력·수정 | R-03, R-05 | 합격 |
| [F03 자동 추출](F03-extract.md) | C3 | 붙여넣기 → 자동 추출 | R-04 | 합격 |
| [F04 지도·연결](F04-map.md) | C4 | 지도, 1화면 → 2화면 연결 | R-06, R-07 | 합격 |
| [F05 비용 합계·정산](F05-cost.md) | C5 | 비용 합계·정산 | R-09 | 합격 |
| [F06 공유](F06-share.md) | C6 | 공유 | R-08 | 합격 |

## 2. 개발 순서

| 순서 | 내용 | 비고 |
|---|---|---|
| 0) 기반 | GitHub 저장소, Vercel·Supabase·Google Cloud 설정, 키·할당량 설정, 빈 화면 배포 | |
| 1) C1 | 계정·목록 | 이후 모든 기능의 권한 기반 |
| 2) C2 | 입력창·직접 입력 | 항목 구조(비용 칸 포함)와 저장 경로 확정 |
| 3) C3 | 자동 추출 | C2의 저장 경로를 재사용하고, 미리보기를 추가 |
| 4) C4 | 지도·연결 | a안(실제 경로)을 시도하고, 구현이 불가능하면 b안. 지도 a안 판정은 C4의 첫 작업으로 한다. |
| 5) C5 | 비용 합계·정산 | C2의 비용 칸을 모아 통화별 합계와 1인당 금액 계산 |
| 6) C6 | 공유 | 완성된 화면 전체에 보기 전용을 씌움 |
| 7) 최종 검수 | 9개 완료 기준과 회귀 목록을 한꺼번에 확인 | 3인 합의로 완성 선언 |

### 단계와 태그 (v1.0까지, 완료)

`haeans/v1.0` 브랜치에서 단계마다 커밋 하나와 태그 하나를 붙였다. (`decisions.md` B1) 4단계부터는 `main` 기준이고 태그 규칙은 킥오프에서 정한다.

| 태그 | 순서 | 내용 | 상태 |
|---|---|---|---|
| v0.1 | 0) 기반 | Next.js 뼈대, Supabase 클라이언트, Drizzle 설정, 테스트 도구, 문서 일정 삭제 | 합격 |
| v0.2 | 1) C1 | R-01 구글 로그인, 개발용 로그인 버튼 | 합격 |
| v0.3 | 1) C1 | R-02 여행 목록 | 합격 |
| v0.4 | 2) C2 | R-03 1화면 뼈대(A안·B안), 버튼으로 여는 입력창 | 합격 |
| v0.5 | 2) C2 | R-05 직접 입력·수정, 지오코딩 | 합격 |
| v0.6 | 3) C3 | R-04 자동 추출 | 합격 |
| v0.7 | 4) C4 | R-06 지도, R-07 1화면 → 2화면 연결 | 합격 |
| v0.8 | 5) C5 | R-09 비용 합계·정산 | 합격 |
| v0.9 | 6) C6 | R-08 공유 | 합격 |
| v1.0 | 7) 최종 검수 | 개발용 로그인 정리(로컬 전용 유지), 회귀 전체 확인, 배포 주소 기록 | 합격 (`https://stepmap-pi.vercel.app`) |

## 3. v1.0 이후 담당자

v1.0 이후 분담은 ① 시작 회의에서 정하고, haeans가 킥오프 PR로 이 표에 적는다. (`integration.md` 3절)
기능번호는 F07부터 이어서 붙인다. 디자인처럼 기능이 아닌 작업은 기능번호 칸을 "—"로 둔다.

| 기능번호 | 작업 | 이슈 | 담당자 | 브랜치 | 작업 파일 | DB 변경 | 상태 |
|---|---|---|---|---|---|---|---|
| F07 | 전체 디자인·톤 모던화 (우선순위 1) | [#19](https://github.com/haeans/stepmap/issues/19) | hyunw0000 | `hyunw0000/f07-design-tone` | [작업 파일](../work/hyunw0000-f07-design-tone.md) | 없음 | 반영 완료 (PR #31) |
| F08 | 여행 대표 이미지 (우선순위 1) | [#20](https://github.com/haeans/stepmap/issues/20) | haeans | `haeans/f08-cover-image` | [작업 파일](../work/haeans-f08-cover-image.md) | **있음** (0007, 0008 반영됨) | 반영 완료 (PR #28) |
| F09 | 여행 목록 카드형 (우선순위 1, F08 이후) | [#21](https://github.com/haeans/stepmap/issues/21) | leedaekeon578 | `leedaekeon578/f09-trip-cards` | [작업 파일](../work/leedaekeon578-f09-trip-cards.md) | 없음 | 반영 완료 (PR #27) |
| F10 | 매거진 탭 개편 (우선순위 1, F08 이후) | [#22](https://github.com/haeans/stepmap/issues/22) | hyunw0000 | `hyunw0000/f10-magazine` | [작업 파일](../work/hyunw0000-f10-magazine.md) | 없음 | 반영 완료 (PR #29) |
| F11 | 리스트 탭 시험 (우선순위 2) | [#23](https://github.com/haeans/stepmap/issues/23) | hyunw0000 | `hyunw0000/f11-list-view` | [작업 파일](../work/hyunw0000-f11-list-view.md) | 없음 | 반영 완료 (PR #30) |
| F12 | 지도 내 위치 → 핀 경로, 실시간 위치 | [#24](https://github.com/haeans/stepmap/issues/24) | — | — | | 없음 | 보류 |
| F13 | 1화면 종이 형식 삭제 (1단계, F16보다 먼저) | [#33](https://github.com/haeans/stepmap/issues/33) | haeans | `haeans/f13-remove-paper` | [작업 파일](../work/haeans-f13-remove-paper.md) | 없음 | 반영 완료 (PR #43) |
| F14 | 지도 탭 개편: 전체 화면 지도·패널·핀 세부·일차 강조·가까운 일정으로 이동 (1단계) | [#34](https://github.com/haeans/stepmap/issues/34) | leedaekeon578 | `leedaekeon578/f14-map-fullscreen` | [작업 파일](../work/leedaekeon578-f14-map-fullscreen.md) | 없음 | 반영 완료 (PR #48) |
| F15 | 동선 규칙: 시작·끝은 교통 거점 또는 숙소, 이동 구간 점선 (1단계, F14 위에 쌓기) | [#35](https://github.com/haeans/stepmap/issues/35) | leedaekeon578 | `leedaekeon578/f15-route-rules` | [작업 파일](../work/leedaekeon578-f15-route-rules.md) | 없음 | 반영 완료 (PR #53) |
| F16 | 매거진 탭 개선: 패널 통합·날씨·준비물·지도 버튼 (1단계, F13 다음) | [#36](https://github.com/haeans/stepmap/issues/36) | haeans | `haeans/f16-magazine-panels` | [작업 파일](../work/haeans-f16-magazine-panels.md) | 없음 | 반영 완료 (PR #44) |
| F17 | 입력창 개선: 밝은 바탕·곰발바닥 버튼·추출과 직접 입력 분리·칸 구조 (1단계) | [#37](https://github.com/haeans/stepmap/issues/37) | hyunw0000 | `hyunw0000/f17-input-panel` | [작업 파일](../work/hyunw0000-f17-input-panel.md) | 없음 | 반영 완료 (PR #45) |
| F18 | AI 일정 도우미 1: 일차·시각 없는 일정 추천 (1단계, F17 위에 쌓기) | [#38](https://github.com/haeans/stepmap/issues/38) | hyunw0000 | `hyunw0000/f18-ai-suggest` | [작업 파일](../work/hyunw0000-f18-ai-suggest.md) | 없음 | 반영 완료 (PR #46) |
| F19 | AI 일정 도우미 2: 대화로 새 일정 짜기·저장된 일정 고치기·지우기 → 허락하면 반영 (1단계) | [#39](https://github.com/haeans/stepmap/issues/39) | hyunw0000 | `hyunw0000/f19-ai-planner` | [작업 파일](../work/hyunw0000-f19-ai-planner.md) | 없음 | 반영 완료 (PR #51) |
| F20 | 예약 정보 보호: 예약번호·링크 마스킹 (1단계) | [#40](https://github.com/haeans/stepmap/issues/40) | haeans | `haeans/f20-booking-mask` | [작업 파일](../work/haeans-f20-booking-mask.md) | **있음** (0009, 0010 반영됨) | 반영 완료 (PR #50) |
| F21 | 디자인 마무리: 로고·첫 화면·목록 배경·매거진 배경·새 여행 버튼 (C9 2단계, C9 킥오프에서 범위 고침) | [#41](https://github.com/haeans/stepmap/issues/41) | 미정 (디자인 담당) | `<담당>/f21-design-finish` | | 없음 | 킥오프 |
| F22 | 매거진 장소 사진: 관광지는 Wikimedia, 그 밖은 Google Places 사진·출처 표시 (1단계, F15·F16 머지 후) | [#47](https://github.com/haeans/stepmap/issues/47) | haeans | `haeans/f22-place-photos` | [작업 파일](../work/haeans-f22-place-photos.md) | **있음** (0011 반영됨) | 반영 완료 (PR #54) |
| F23 | 상단바·프로필 버튼 통일 (C9 2단계, F21과 같은 담당 추천) | [#56](https://github.com/haeans/stepmap/issues/56) | 미정 (디자인 담당) | `<담당>/f23-top-bar` | | 없음 | 킥오프 |
| F24 | 여행 목록 정리: 미리보기 첫 일정·⋯ 메뉴·"발자국"·새 여행 필수 칸 (C9 1단계) | [#57](https://github.com/haeans/stepmap/issues/57) | haeans | `haeans/f24-trip-list` | [작업 파일](../work/haeans-f24-trip-list.md) | 없음 | 반영 완료 (PR #63) |
| F25 | 지도 탭 단순화: 핀만·핀 팝업과 구글맵 버튼·거리/이동수단·곰발바닥 버튼 삭제 (C9 1단계) | [#58](https://github.com/haeans/stepmap/issues/58) | leedaekeon578 | `leedaekeon578/f25-map-pins` | | 없음 | 킥오프 |
| F26 | 하루 일정 규칙·사진 대체(로고)·항공권/승차권 기준·예약 링크 열기 버튼 (C9 1단계, **가장 먼저**) | [#59](https://github.com/haeans/stepmap/issues/59) | hyunw0000 | `hyunw0000/f26-day-rules` | | 없음 | 킥오프 |
| F27 | BACK 정리: 준비물 붙여넣기 버그·쓴 돈 합계와 정산 버튼·쓴 돈 수정 버그 (C9 1단계) | [#60](https://github.com/haeans/stepmap/issues/60) | hyunw0000 | `hyunw0000/f27-back-fixes` | | 없음 | 킥오프 |
| F28 | 추출 미리보기를 매거진 DAY BY DAY로, 사진 포함 (C9 1단계, F27 위에 쌓기) | [#61](https://github.com/haeans/stepmap/issues/61) | hyunw0000 | `hyunw0000/f28-magazine-preview` | | 없음 | 킥오프 |

> C7 (2026-11-02 킥오프, 2026-11-03 최신화): 범위는 `01-PRD.md` 4절 "C7". F07~F11은 머지 후 공통 문서에 반영했다(`decisions.md` B39~B83). DB 변경은 F08 하나뿐이었다(B34, 마이그레이션 0007·0008). F11 "리스트 탭"은 별도 탭이 아니라 매거진 "종이" 개편으로 진행했고(B77, B78), 유지 여부는 팀이 써 본 뒤 정한다(`open-questions.md`). F12는 보류다.

> C8 (2026-11-03 킥오프): 범위는 `01-PRD.md` 4절 "C8". 1단계는 기능(F13~F20), 2단계 디자인(F21)은 1단계를 모두 배포한 뒤 배포본을 보고 시작한다. 담당자는 이 표를 보고 팀에서 정해 적고, 브랜치의 `<담당>`을 자기 이름으로 바꾼다. DB 변경은 F20·F22다(B34). F22(장소 사진)는 킥오프 뒤 추가했다(2026-11-03). 같은 파일을 고치는 작업: F13 → F16(`schedule-view.tsx`), F14 → F15(지도), F17 → F18·F19(입력창), F15 → F22(`src/lib/items/geocode.ts`), F16 → F22(`place-card.tsx`), F20·F22(`drizzle/` 마이그레이션 번호와 `meta/` 스냅샷: 먼저 하는 쪽을 머지·반영한 뒤 다음 쪽에서 `npm run db:generate`). 뒤 작업은 앞 작업이 머지된 뒤 하거나 앞 브랜치 위에 쌓는다(B81). F17·F18·F19는 같은 담당자를 추천한다. F21 담당이 디자인 담당 파일의 주인이다(`integration.md` 9절).

> C8 1단계 최신화 (2026-11-04, `haeans/sync-c8`): F13·F14·F16~F20을 머지 후 공통 문서에 반영했다(`decisions.md` B84~B128). F15는 아직 작업 전이라 이번 최신화에서 뺐고, F14 작업 파일의 결정 1·5(교통 거점·비행기 구간 지도 범위)는 F15와 함께 옮긴다. F19는 작업 중 "대화로 저장된 일정 고치기·지우기"를 더했다(2026-11-04 팀 승인, PRD 4절 C8 F19 고침). DB 변경은 F20의 0009·0010이다(`items.link` 비우기 0011은 남음, B123). 남은 작업: F15, F22(F15·F16 머지 후), 2단계 F21.

> C8 1단계 끝 (2026-11-04, `haeans/sync-c8-f15-f22`): F15·F22를 반영했다(`decisions.md` B129~B143). F14 결정 1·5는 F15 결정 1·2로 B129·B130이 됐다. F22는 출처를 "관광지는 Wikimedia Commons 먼저, 그 밖은 Google Places"로 바꿨다(2026-11-04 팀 합의, PRD 고침). DB 변경은 F22의 0011이고, `items.link` 비우기는 남은 값이 0개라 하지 않는다(B123). 1단계(F13~F20, F22)가 모두 끝났으므로 배포본을 보고 2단계 F21을 시작한다.

> C9 (2026-11-04 킥오프): 범위는 `01-PRD.md` 4절 "C9". 회의 안건 17개를 작업 6개(F23~F28)와 F21 범위 고침으로 묶었다. 1단계는 기능(F24~F28), 2단계는 디자인(F21·F23)이고 2단계는 1단계를 모두 배포한 뒤 시작한다. C8 F21은 C9 2단계로 옮겼다. 디자인 담당(F21·F23)은 아직 정하지 않았다. DB 변경은 없다. 브랜드 이미지(로고, 하늘 배경)는 `public/brand/`에 있다(`02-FRONTEND.md` 7절). 진행 순서와 선행 조건은 아래 "C9 진행 순서".

> C9 F24 최신화 (2026-11-04, `haeans/sync-c9-f24`): F24를 머지 후 공통 문서에 반영했다(`decisions.md` B144~B150). 작업 중 목적지 확인(글자 규칙, 지역일 때만 대표 사진)을 더했다. 남은 1단계: F26(가장 먼저) → F27 → F28, F25.

### C9 진행 순서

| 단계 | 묶음 A (haeans) | 묶음 B (hyunw0000) | 묶음 C (leedaekeon578) |
|---|---|---|---|
| 1단계 (킥오프 머지 후 동시에 시작) | ① F24 | ① F26 (가장 먼저) → ② F27 → ③ F28 (F27 위에 쌓기) | ① F25 (삭제 작업부터) |
| 2단계 (1단계 모두 배포 후) | 검수 | 검수 | — |
| 2단계 디자인 담당 (미정) | F21 → F23 (같은 사람) | | |

**먼저 끝나야 시작(또는 마무리)할 수 있는 작업**

| 작업 | 먼저 끝나야 하는 것 | 이유 | 그 전에 할 수 있는 것 |
|---|---|---|---|
| F25 핀으로 올릴 일정 고르기 | F26 머지 | F26의 하루 일정 규칙 함수(시작·끝 거점/숙소, 중간 교통·숙소 제외)를 쓴다 | 동선·거리·이동수단·세부 패널·곰발바닥 버튼 삭제, 핀 팝업·구글맵 버튼 |
| F28 전체 | F27 머지 (또는 F27 브랜치 위에 쌓기, B81) | `paste-extract.tsx`와 추출 지시문을 둘 다 고친다 | — |
| F28 매거진에 보일 일정 | F26 머지 | 하루 일정 규칙 함수를 쓴다 | 미리보기 자리 옮기기, 사진 표시 |
| F21 | 1단계(F24~F28) 모두 머지·배포 | 목록(`trip-row.tsx`)·매거진(`magazine-view.tsx`)을 1단계가 먼저 바꾼다 | 레퍼런스 정하기 |
| F23 | F21의 로고 교체, F25 머지 | 상단바에 새 로고를 쓰고, 지도 메뉴(`map-menu.tsx`)를 바꾼다 | — |

**같은 파일을 고치지만 기다리지 않는 작업** (나중에 머지하는 쪽이 최신 `main`을 받아 맞춘다)

- F26 → F27은 같은 담당(hyunw0000)이 차례로 한다. 둘 다 `src/lib/extract/prompt.ts`(F26 비행기 이름 규칙, F27 준비물), `ticket-strip.tsx`(F26 항공권·승차권 분류, F27 준비물 `Checklist`)를 고치므로 F26 머지 뒤 최신 `main`에서 F27을 판다(또는 F26 위에 쌓기, B81).
- F26은 F25·F28의 선행 작업이므로 묶음 B가 가장 먼저 끝낸다. 묶음 B에 작업이 몰려 있어(F26·F27·F28) 늦어지면 다시 나눈다.
- F24 · F27: `src/app/actions/trips.ts`(F24 새 여행 필수 칸, F27 정산 인원 저장)
- F26의 사진 대체 이미지는 킥오프에서 넣은 `public/brand/logo.png`를 쓴다(킥오프 머지 후 바로 쓸 수 있다).

> 상태: 킥오프 → 작업 중 → PR → 머지 → 반영 완료 (보류: 이번 사이클에서 진행하지 않음, 다음 킥오프에서 다시 정함)
> 맡는 일이 정해진 사람: haeans — 외부 서비스·키 관리, PR 머지, DB 마이그레이션 반영, 공통 문서 반영 (B30, B31)
