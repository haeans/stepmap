# 문서 지도

어떤 문서가 어디 있고 어떤 순서로 읽는지 안내합니다.

> 작성: AI · 갱신: 문서가 바뀔 때

## 문서별 역할

| 문서 | 내용 | 쓰는 단계 → 읽는 단계 | 작성 | 갱신 시점 |
|---|---|---|---|---|
| `CLAUDE.md` | AI 작업 규칙, 문서 읽는 순서, 금지 사항 | 2단계 → 모든 단계 | 사람 (AI 초안 가능) | 규칙이 바뀔 때 |
| `README.md` | 개요 요약, 실행 방법, 공개 주소. **짧게 유지한다**: 절차·설정·긴 설명은 `docs/`로 보내고 링크만 둔다 | 2단계·구현 → 시작할 때 | AI | 실행 방법이 바뀔 때 |
| `docs/deploy.md` | 외부 서비스(Vercel, Supabase, Google Cloud, Gemini) 배포·운영 설정 | v1.0 배포 → 설정을 바꿀 때 | AI, haeans 관리 | 설정이 바뀔 때 |
| `docs/README.md` | 문서 지도, 읽는 순서 | 2단계 → 규칙·주제 | AI | 문서가 바뀔 때 |
| `docs/01-PRD.md` | 개요, 범위, 기능 9개(R-번호), 완료 기준, 확장 후보 | 2단계 → 규칙·주제, 검수 | AI 초안, 사람 확정 | 범위가 바뀔 때만 (3인 합의) |
| `docs/02-FRONTEND.md` | 화면·흐름, A안·B안·지도 화면 구조, 기기별 기본 형식과 형식 선택 | 계획 → 구현 | AI | 사이클마다 |
| `docs/03-BACKEND.md` | AI 추출 호출(Claude/Gemini 전환), 구글맵 경로·지오코딩 호출, 공유 링크 처리, 권한 확인 | 계획 → 구현 | AI | 사이클마다 |
| `docs/04-DB.md` | 데이터, 항목 종류 5종, 비용(통화별 합계·1인당 금액), RLS 정책 | 계획 → 구현 | AI | 사이클마다 |
| `docs/STACK.md` | 스택과 선택 이유, Drizzle과 RLS를 함께 쓰는 방식 | 0) 기반 → 계획 | AI 초안, 사람 확정 | 스택이 바뀔 때 |
| `docs/decisions.md` | 확정 결정 목록 | 결정 → 모든 단계 | AI 초안, 사람 확인 | 결정이 날 때마다 |
| `docs/open-questions.md` | 미정 항목, 구현 사이클 중 새로 생기는 질문 | 계획 → 결정 | AI | 질문이 생기거나 해결될 때 |
| `docs/integration.md` | v1.0 이후 협업·브랜치·PR 규칙 (GitHub 저장소 기준) | v1.0 직전 → 4단계 | AI 초안, 사람 검토·수정 | v1.0 완성 전 |
| `docs/regression.md` | 9개 완료 기준을 확인 절차로 바꾼 것, 권한 우회 시도 확인 | 구현·검수 → 검수 | AI 초안, 사람 확인 | 사이클마다 추가 |
| `docs/features/README.md` | F01~F06 상태, v1.0 이후 담당자 | 규칙·주제 → 검수 | AI | 사이클 시작과 끝 |
| `docs/features/F01`~`F06` | 사이클별 기능 명세와 완료 기준 | 계획 → 구현·검수 | AI | 해당 사이클 |
| `docs/work/` | 4단계 작업 파일. 작업(브랜치)마다 하나. 양식은 `docs/work/README.md` | ② 작업 → ④ 공통 문서 최신화 | 담당자 (AI 초안 가능) | 작업 중 |

> 4단계부터 공통 문서(위 표에서 `docs/work/`를 뺀 전부)는 ① 킥오프와 ④ 최신화 때 haeans만 고친다. 작업 브랜치에서는 작업 파일만 쓴다. (`integration.md` 4절)

### 기능 파일 (사이클 단위 6개)

| 기능 파일 | 사이클 | 기능 |
|---|---|---|
| [F01-account.md](features/F01-account.md) 계정·목록 | C1 | R-01, R-02 |
| [F02-input.md](features/F02-input.md) 입력창·직접 입력 | C2 | R-03, R-05 |
| [F03-extract.md](features/F03-extract.md) 자동 추출 | C3 | R-04 |
| [F04-map.md](features/F04-map.md) 지도·연결 | C4 | R-06, R-07 |
| [F05-cost.md](features/F05-cost.md) 비용 합계·정산 | C5 | R-09 |
| [F06-share.md](features/F06-share.md) 공유 | C6 | R-08 |

- 별도의 양식 파일(F00-example)은 두지 않는다. F01~F06은 같은 구조(범위 → R-번호별 동작·완료 기준·의존 → 관련 화면·데이터 → 리스크 → 관련 결정 → 층별 설계)를 따른다.

## 읽는 순서 (AI가 구현할 때)

1. `CLAUDE.md`
2. `docs/README.md`
3. `docs/01-PRD.md`
4. `docs/decisions.md`
5. `docs/open-questions.md`
6. `docs/features/README.md`
7. 이번 사이클의 기능 파일
8. `docs/STACK.md`
9. `02-FRONTEND.md`, `03-BACKEND.md`, `04-DB.md` 중 관련 부분
10. `docs/regression.md`

## 문서 진행 단계

| 단계 | 시작 조건 | 끝 조건 | 산출물 |
|---|---|---|---|
| 1단계 계획서 | 아이디어·범위 확정 | 3인 합의 | 계획서 |
| 2단계 md 파일 | 계획서 | 뼈대 → 내용 채움 → 3인 검수·합의. PRD에 R-번호와 완료 기준 9개가 모두 있음 | md 초판 (기능 파일 F01~F06 포함) |
| 3단계 구현 | md 완성 + 0) 기반 준비 | C1~C6이 모두 통과하고, 3인이 v1.0 완성을 선언 | 공개 주소에서 동작하는 v1.0, 갱신된 md |
| 4단계 수정·확장 | `01-PRD.md`의 "v1.0 이후 후보"에서 고름 | — | ① 킥오프 → ② 작업 파일과 코드 → ③ PR·머지 → ④ 공통 문서 최신화 (`integration.md` 3절) |

사이클 안의 작업 방식(규칙·주제 → 계획 → 결정 → 구현 → 검수)은 `CLAUDE.md`에 있다.
