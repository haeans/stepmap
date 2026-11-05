# stepmap (발자국)

흩어진 여행 정보를 붙여넣기만 하면 한 장의 여행 계획과 지도 위 핀이 완성된다.
떠나기 전에는 계획이 되고, 여행 중에는 길잡이가 되고, 다녀온 뒤에는 추억으로 남는다.

## 주요 기능

- **붙여넣기 → AI 정리**: 항공권, 예약 메일, 메모, 링크 텍스트를 붙여넣으면 AI가 일정으로 정리하고, 미리보기에서 확인한 뒤 저장한다. 직접 입력·수정도 된다.
- **AI 일정 도우미**: 대화로 새 일정을 짜거나 저장된 일정을 고친다. 허락해야 반영된다.
- **일정**: 대표 사진과 장소 사진이 들어간 화면. GO(예약·티켓), DAY BY DAY(하루 일정), BACK(준비물·쓴 돈)으로 나뉜다.
- **지도**: 일차별 색 핀으로 장소를 보여 주고, 핀에서 구글맵으로 바로 연다.
- **쓴 돈**: 통화별 합계와 인원수로 나눈 1인당 금액.
- **공유**: 공유 링크로 동행자에게 보기 전용으로 보여 준다.
- **예약 정보 보호**: 예약번호와 예약 링크는 가려서 보여 준다.

요구사항은 [docs/01-PRD.md](docs/01-PRD.md)에 있다.

## 기술 스택

Next.js · Vercel · Supabase(PostgreSQL, Auth, RLS) · Drizzle · Google Maps · Claude API(먼저) / Gemini API(대체)

선택 이유는 [docs/STACK.md](docs/STACK.md)에 있다.

## 만든 방식

3명이 직접 코드를 쓰지 않고 각자 Claude Code로 개발했다. 문서(PRD, 결정 기록, 기능 파일)를 기준으로 사이클을 돌렸고, 킥오프·최신화 PR과 다른 1명의 승인으로 합의를 남겼다. 규칙은 [CLAUDE.md](CLAUDE.md), [docs/integration.md](docs/integration.md)에 있다.

## 로컬 실행

Node.js 24가 필요하다.

1. `npm ci`
2. `.env.example`을 `.env.local`로 복사하고 haeans에게 받은 값을 채운다. ([docs/integration.md](docs/integration.md) 10절)
3. `npm run dev` → http://localhost:3000 (개발용 로그인 버튼으로 들어간다)

검사: `npm run lint` · `npm run typecheck` · `npm test` · `npm run build`

## 배포

- 공개 주소: https://stepmap-pi.vercel.app
- `main`에 머지되면 Vercel이 자동으로 배포한다. 외부 서비스와 키는 haeans가 관리한다. 설정은 [docs/deploy.md](docs/deploy.md)에 있다.

## 문서

문서 지도와 읽는 순서는 [docs/README.md](docs/README.md)에 있다.
