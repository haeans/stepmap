// Drizzle 테이블 정의와 RLS 정책 정의만 둔다. (decisions.md S2)
// 앱의 데이터 읽기·쓰기는 여기서 하지 않고 src/lib/supabase의 클라이언트로 한다.
// 테이블은 사이클마다 추가한다: trips(v0.3), items(v0.5), share_links·trip_members(v0.9)

export {};
