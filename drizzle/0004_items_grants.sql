-- 직접 쓴 마이그레이션: items 테이블 권한과 updated_at 트리거 (decisions.md B6, B8)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."items" TO "authenticated";
--> statement-breakpoint
REVOKE ALL ON TABLE "public"."items" FROM "anon";
--> statement-breakpoint
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."items" FROM "authenticated";
--> statement-breakpoint
CREATE TRIGGER "items_set_updated_at" BEFORE UPDATE ON "public"."items"
FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
