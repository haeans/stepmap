# integration

v1.0을 AI 하나가 만든 뒤, 세 명이 수정·확장을 나눠 맡아 합치는 규칙(문서 수정 권한, 브랜치, PR, 머지 순서, 충돌 시 기준)입니다.

> 작성: AI 초안 → 사람 검토·수정 · 갱신: v1.0 완성 전
> 계획서에 정해진 내용만 적었다. "미정"인 칸은 사람이 검토할 때 정한다.

## 1. 적용 시점

- v1.0까지 개발은 AI 하나가 진행한다.
- 이 문서의 규칙은 v1.0 완성 이후(4단계 수정·확장)에 적용한다.
- 4단계에서 할 일은 `01-PRD.md`의 "v1.0 이후 후보"에서 고른다.

## 2. 저장소

- GitHub 저장소를 기준으로 한다.

## 3. 분담

- 3인이 나눠 맡는다. 역할은 고정하지 않고 단계마다 유기적으로 나눈다.
- 기능별 담당자는 `features/README.md` 3절에 적는다.

## 4. 문서 수정 권한

| 문서 | 작성 | 비고 |
|---|---|---|
| `CLAUDE.md` | 사람 (AI 초안 가능) | 규칙이 바뀔 때 |
| `README.md` | AI | |
| `docs/README.md` | AI | |
| `docs/01-PRD.md` | AI 초안, 사람 확정 | 범위 수정은 3인 합의 필요 |
| `docs/02-FRONTEND.md` | AI | |
| `docs/03-BACKEND.md` | AI | |
| `docs/04-DB.md` | AI | |
| `docs/STACK.md` | AI 초안, 사람 확정 | |
| `docs/decisions.md` | AI 초안, 사람 확인 | |
| `docs/open-questions.md` | AI | |
| `docs/integration.md` | AI 초안, 사람 검토·수정 | |
| `docs/regression.md` | AI 초안, 사람 확인 | |
| `docs/features/README.md` | AI | |
| `docs/features/F01`~`F06` | AI | |

## 5. 브랜치

미정

## 6. PR

미정

## 7. 머지 순서

미정

## 8. 머지 전 확인

- `regression.md`의 목록을 다시 확인한다.

## 9. 충돌 시 기준

- **문서 사이의 충돌**: `01-PRD.md`가 최상위 문서다. 확정된 결정은 `decisions.md`를 따른다.
- **사람 사이의 의견 충돌**: 3인 합의를 우선하고, 합의가 안 되면 다수결로 정한다.
- **코드 충돌 처리 방법**: 미정
