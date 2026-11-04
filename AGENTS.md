# AGENTS.md

AI 코딩 도구(Claude Code 등)가 이 저장소에서 처음 읽는 안내입니다.

> 작성: 사람 (이 내용은 AI 초안) · 갱신: 규칙이 바뀔 때

- **작업 규칙은 `CLAUDE.md`를 따른다.** 문서 읽는 순서, 금지 사항, 4단계 작업 방식(브랜치·작업 파일·DB 변경·PR)이 거기에 있다.
- 아래 `BEGIN:nextjs-agent-rules` ~ `END:nextjs-agent-rules` 블록은 `next dev`가 자동으로 써 넣는 영어 안내다. 고치거나 지워도 다시 생기므로 **그대로 둔다.** 뜻은 이렇다.
  - 이 프로젝트의 Next.js(16)는 학습 데이터에 있는 Next.js와 API·규칙·파일 구조가 다를 수 있다.
  - 코드를 쓰기 전에 `node_modules/next/dist/docs/`의 관련 안내를 먼저 읽고, 사용 중단(deprecation) 안내를 따른다.
  - 이 블록은 `next dev`가 다시 넣으므로, 지우지 말고 작업과 함께 커밋해 작업 트리를 깨끗하게 둔다.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
