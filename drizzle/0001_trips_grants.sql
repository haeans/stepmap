-- 직접 쓴 마이그레이션: trips 테이블 권한과 updated_at 트리거 (decisions.md B6)
-- 새 테이블 자동 공개를 껐으므로 authenticated에만 권한을 준다. anon에는 주지 않는다.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."trips" TO "authenticated";
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "trips_set_updated_at" BEFORE UPDATE ON "public"."trips"
FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
