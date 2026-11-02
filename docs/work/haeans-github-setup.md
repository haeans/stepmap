# — GitHub·Vercel 협업 설정

> 담당: haeans · 브랜치: `haeans/github-setup` · 킥오프: 2026-11-02 (B32로 결정, 별도 킥오프 PR 없음)
> 상태: PR

## 1. 범위

- `main` 보호, PR 양식, CODEOWNERS, 자동 검사(GitHub Actions), Vercel 미리보기 끄기
- 기능 코드는 바꾸지 않는다.

## 2. 완료 기준

- [ ] PR을 열면 자동 검사(`CI / check`)가 돌고 통과한다.
- [ ] PR 본문에 양식이 채워진다.
- [ ] 공통 문서·`drizzle/`·`.github/`를 고친 PR에 haeans 리뷰가 자동 요청된다.
- [ ] `main`에 직접 푸시가 막히고, 승인 1명과 자동 검사 통과가 있어야 머지된다.
- [ ] PR 브랜치에 푸시해도 Vercel이 빌드하지 않고, `main` 머지 때만 운영 배포된다.

## 3. 바꾸는 곳

| 층 | 파일 | 내용 |
|---|---|---|
| 저장소 | `.github/workflows/ci.yml` | lint·typecheck·test·build. 키 없이 가짜 `NEXT_PUBLIC_` 값으로 돈다. |
| 저장소 | `.github/pull_request_template.md` | 자체검수·공통 문서·DB 변경 체크 |
| 저장소 | `.github/CODEOWNERS` | 공통 문서, `drizzle/`, `src/db/`, `.github/`, `vercel.json` → @haeans |
| 배포 | `vercel.json` | `ignoreCommand`: 운영(production)이 아니면 빌드를 건너뛴다 |
| GitHub 설정 | (저장소 설정) | `main` 보호, Squash merge만, 머지 후 브랜치 삭제 |
| DB | — | DB 변경 없음 |

## 4. 결정 (임시 번호)

| 번호 | 영역 | 결정 |
|---|---|---|
| [haeans-github-setup] 결정 1 | 협업 | CODEOWNERS는 리뷰 요청만 하고 "코드 주인 승인 필수"는 켜지 않는다. haeans가 쓴 PR을 다른 사람이 승인할 수 있어야 하기 때문이다. |
| [haeans-github-setup] 결정 2 | 협업 | 관리자(haeans)는 보호 규칙을 우회할 수 있게 둔다(킥오프·최신화 문서 PR, 긴급 수정용). 평소에는 승인을 받고 머지한다. |

## 5. 회귀 항목

| 확인 내용 | 결과 |
|---|---|
| 이 PR에서 `CI / check`가 통과한다. | |
| 이 PR 브랜치 푸시에 Vercel 빌드가 생기지 않는다(또는 Canceled/Ignored). | |

## 6. 질문

- 없음

## 7. 공통 문서 반영 요청

| 문서 | 반영할 내용 |
|---|---|
| `docs/regression.md` | 5절 두 항목을 "4단계 협업 설정" 항목으로 추가 |
| `docs/decisions.md` | 4절 결정 1·2를 B-번호로 추가 |
