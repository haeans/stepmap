# integration

v1.0을 AI 하나가 만든 뒤, 세 명이 수정·확장을 나눠 맡아 합치는 규칙(문서 수정 권한, 브랜치, PR, 머지 순서, 충돌 시 기준)입니다.

> 작성: AI 초안 → 사람 검토·수정 · 갱신: 규칙이 바뀔 때 (① 시작 회의 합의 후 haeans)
> 결정 근거: `decisions.md` B29~B32

## 1. 적용 시점

- v1.0까지 개발은 AI 하나가 진행했다.
- 이 문서의 규칙은 v1.0 완성 이후(4단계 수정·확장)에 적용한다.
- 4단계에서 할 일은 `01-PRD.md`의 "v1.0 이후 후보"에서 고른다. 후보 밖의 일은 ① 시작 회의에서 3인 합의로 PRD에 먼저 넣는다.

## 2. 저장소와 역할

- GitHub 저장소 `haeans/stepmap`(공개)의 `main`이 기준 브랜치다. `main`에 머지되면 Vercel이 공개 주소로 배포한다.
- 3인이 나눠 맡는다. 역할은 고정하지 않고 사이클마다 정한다. 기능별 담당자는 `features/README.md` 3절에 적는다.
- **haeans**가 맡는 일 (B30, B31)
  - 외부 서비스와 키 관리: Google Cloud(지도·결제), Supabase, Vercel, Gemini
  - PR 머지, DB 마이그레이션 반영(`npm run db:migrate`)
  - 공통 문서 수정(①킥오프, ④최신화)
- **코드는 Claude가 쓴다** (B33): 3명 모두 직접 코드를 쓰지 않고 각자 Claude(Claude Code)로 작업한다. 사람은 할 일을 지시하고, 결과를 검수·승인한다. 이 문서와 `CLAUDE.md`의 규칙은 각자의 Claude가 읽고 스스로 지킨다. 사람이 규칙에 어긋나는 일을 시키면 Claude는 먼저 이유와 대안을 말한다.

## 3. 사이클

| 단계 | 하는 일 | 누가 | 결과물 |
|---|---|---|---|
| ① 시작 회의 → 킥오프 | 할 일·담당자·브랜치 이름·DB 변경 여부를 정한다. 작업마다 GitHub 이슈를 하나 만든다. 합의한 공통 문서 수정(PRD 범위, 결정, 규칙)도 여기서 한다. | 3인 회의, 반영은 haeans | 이슈, `main`에 킥오프 PR |
| ② 작업 → 자체검수 | 최신 `main`에서 브랜치를 파고 코드와 작업 파일만 고친다. 자체검수 후 PR을 연다. | 담당자 | 코드, `docs/work/<브랜치>.md` |
| ③ PR → 검수 → 머지 | PR 본문에 `Closes #이슈번호`를 넣는다. 작성자가 아닌 1명이 승인한다. haeans가 승인 순서대로 머지하면 이슈가 자동으로 닫힌다. | 검수자, haeans | `main` 머지, 자동 배포 |
| ④ 공통 문서 최신화 | 머지된 작업 파일의 결정·회귀 항목·질문을 공통 문서로 옮긴다. 사이클 끝에 몰아서 한다. | haeans | `main`에 sync PR |

## 4. 문서 규칙 (충돌 방지)

### 4-1. 공통 문서와 작업 파일

- **공통 문서**: `CLAUDE.md`, `AGENTS.md`, `README.md`, `docs/` 바로 아래 문서 전부(`01-PRD.md`, `02-FRONTEND.md`, `03-BACKEND.md`, `04-DB.md`, `STACK.md`, `deploy.md`, `decisions.md`, `open-questions.md`, `integration.md`, `regression.md`, `README.md`), `docs/features/README.md`, `docs/features/F01`~`F06`
- **작업 파일**: `docs/work/<브랜치 이름에서 /를 -로 바꾼 것>.md`. 작업마다 새로 하나 만든다. 양식은 `docs/work/README.md`.

### 4-2. 언제 누가 고치나

| 문서 | 고치는 때 | 고치는 사람 |
|---|---|---|
| 공통 문서 | ① 킥오프 PR, ④ sync PR | haeans |
| 공통 문서 (급한 경우) | 작업 중 다른 사람 작업에 바로 영향을 주는 결정이 생겼을 때, 별도 작은 PR | haeans |
| 작업 파일 | ② 작업 중 언제든 | 그 작업 담당자 |

- 작업 브랜치에서는 공통 문서를 고치지 않는다. 고칠 내용은 작업 파일의 "공통 문서 반영 요청"에 적는다.
- `01-PRD.md`(범위)와 `STACK.md`(스택)는 3인 합의가 있어야 고친다.
- 루트 `README.md`는 짧게 유지한다. 개요, 실행 방법, 공개 주소만 두고 절차·설정·긴 설명은 `docs/` 문서(예: `deploy.md`)로 보내 링크만 둔다.
- 작업 파일의 결정은 임시 번호(`[작업 파일 이름] 결정 1`)로 적는다. B-번호는 ④에서 haeans가 붙인다.
- ④에서 옮긴 작업 파일은 맨 위에 "반영 완료(날짜, sync PR)"를 적고 지우지 않는다.

### 4-3. 문서 수정 권한

| 문서 | 작성 | 비고 |
|---|---|---|
| `CLAUDE.md` | 사람 (AI 초안 가능) | ①에서 규칙이 바뀔 때 |
| `docs/01-PRD.md` | AI 초안, 사람 확정 | 범위 수정은 3인 합의 필요 |
| `docs/STACK.md` | AI 초안, 사람 확정 | 스택 변경은 3인 합의 필요 |
| `docs/decisions.md` | AI 초안, haeans 반영 | B-번호는 haeans가 붙인다 |
| `docs/integration.md` | AI 초안, 사람 검토·수정 | ①에서 규칙이 바뀔 때 |
| `docs/regression.md` | AI 초안, haeans 반영 | |
| 그 밖의 공통 문서 | AI 초안, haeans 반영 | |
| `docs/work/*.md` | 담당자 (AI 초안 가능) | 자기 작업 파일만 |

## 5. 브랜치

- 이름: `<이름>/<기능번호>-<짧은 설명>`. 예: `hyunw/f07-photo`, `daekeon/design-header`, `haeans/kickoff-c7`
- 킥오프 PR이 `main`에 들어간 뒤, 최신 `main`에서 판다.
- 하나의 브랜치는 하나의 작업만 한다. 머지되면 브랜치는 자동으로 지워진다.
- `main`에는 직접 푸시하지 않는다(보호 규칙으로 막혀 있다).

## 6. PR

- PR 양식(`.github/pull_request_template.md`)을 채운다: `Closes #이슈번호`, 작업 파일 링크, 자체검수 결과, DB 변경 여부, 공통 문서 반영 요청.
- 커밋 메시지에도 이슈 번호를 적으면(`(#12)`) 커밋에서 이슈로 바로 이동할 수 있다. v1.0까지의 작업은 이슈 #3~#10에 커밋을 연결해 두었다.
- 자체검수: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`와 작업 파일의 회귀 항목, 관련된 `regression.md` 항목을 로컬에서 확인한다(개발용 로그인).
- 자동 검사(GitHub Actions)가 PR마다 lint·typecheck·test·build를 돌린다. 통과해야 머지할 수 있다.
- 작성자가 아닌 1명이 승인해야 머지할 수 있다. 공통 문서·`drizzle/`·`.github/`를 건드리면 CODEOWNERS로 haeans에게 리뷰가 요청된다.
- Vercel 미리보기 배포는 꺼져 있다. 검수는 로컬에서 한다.

## 7. 머지 순서

- haeans가 승인받은 순서대로 머지한다. 방식은 Squash merge.
- 머지 전에 PR의 "Update branch"로 최신 `main`을 받고 자동 검사를 다시 통과시킨다.
- DB 스키마가 바뀌는 PR은 한 번에 하나만 연다(킥오프에서 "DB 변경 있음"으로 표시). (B34)
  1. 작업자의 Claude가 `schema.ts`를 고치고 `npm run db:generate`로 마이그레이션 파일만 만든다. DB 반영은 하지 않는다(`DATABASE_URL`이 없다).
  2. PR 검수 중 haeans가 마이그레이션 SQL(추가형인지, RLS·권한이 있는지)을 확인하고 `npm run db:migrate`로 공용 DB에 반영한다.
  3. 작업자가 로컬에서 새 구조로 동작을 확인한다.
  4. 승인 후 haeans가 머지하면 새 코드가 자동 배포된다. 마이그레이션이 추가형이라 2~4 사이에도 배포본은 그대로 동작한다.
  - 반영한 뒤 PR이 취소되면, haeans가 되돌리는 마이그레이션을 따로 만들지 그대로 둘지 정한다.

## 8. 머지 전 확인

- `regression.md`의 목록 중 그 작업과 관련된 항목을 다시 확인한다.
- 키 값이 코드와 커밋에 없는지 확인한다(`.env.local`은 git에서 제외되어 있다).

## 9. 충돌 시 기준

- **문서 사이의 충돌**: `01-PRD.md`가 최상위 문서다. 확정된 결정은 `decisions.md`를 따른다.
- **사람 사이의 의견 충돌**: 3인 합의를 우선하고, 합의가 안 되면 다수결로 정한다.
- **코드 충돌 처리 방법**
  - 작업 브랜치에서 최신 `main`을 받아(`Update branch` 또는 `git merge origin/main`) 자기 브랜치에서 푼다. 먼저 머지된 쪽의 코드를 기준으로 맞춘다.
  - 충돌이 잦은 곳의 주인을 정해 둔다.

| 곳 | 규칙 |
|---|---|
| `drizzle/`(마이그레이션 번호, `meta/_journal.json`) | 스키마 변경은 한 번에 한 브랜치만. 파일은 작업자의 Claude가 만들고, 반영은 haeans. (7절) |
| `package.json`, `package-lock.json` | 패키지 추가는 PR에 적는다. lock 파일 충돌은 `main` 쪽을 받고 `npm install`을 다시 돌린다. |
| `src/app/globals.css`, `src/app/layout.tsx`, `src/app/_components/` | 디자인 담당이 주인이다. 다른 사람이 고치면 PR에 디자인 담당을 리뷰어로 지정한다. |

## 10. 로컬 개발 값 공유

- 로컬 개발에 필요한 값은 haeans가 보안 공유(비밀번호 관리자 공유, 만료 링크)로 준다. Slack 채널에 올리지 않는다.
- 주는 값: `NEXT_PUBLIC_*` 4개, `GOOGLE_MAPS_SERVER_KEY`, `GEMINI_API_KEY`, `DEV_LOGIN=true`, `DEV_*` 4개
- 주지 않는 값: `DATABASE_URL`(마이그레이션은 haeans만), `ANTHROPIC_API_KEY`(쓰지 않음)
- 로컬 개발도 배포본과 같은 Supabase DB와 API 할당량을 쓴다.
