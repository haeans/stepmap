-- 직접 쓴 마이그레이션: Supabase 기본 권한으로 남는 TRUNCATE·REFERENCES·TRIGGER를 회수한다.
-- TRUNCATE는 RLS를 거치지 않으므로 anon·authenticated 모두에서 뺀다. (decisions.md B6)
REVOKE ALL ON TABLE "public"."trips" FROM "anon";
--> statement-breakpoint
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."trips" FROM "authenticated";
