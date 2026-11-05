-- 직접 쓴 마이그레이션: trip_checks 테이블 권한, updated_at 트리거, 여행당 30개 제한 (decisions.md B6, B8, C10 F31)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."trip_checks" TO "authenticated";
--> statement-breakpoint
REVOKE ALL ON TABLE "public"."trip_checks" FROM "anon";
--> statement-breakpoint
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."trip_checks" FROM "authenticated";
--> statement-breakpoint
CREATE TRIGGER "trip_checks_set_updated_at" BEFORE UPDATE ON "public"."trip_checks"
FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
--> statement-breakpoint
-- 준비물은 여행 하나에 30개까지. 앱도 막지만, 동시에 더할 때를 위해 DB에서도 막는다.
-- 행 단위 BEFORE 트리거는 같은 INSERT에서 먼저 들어간 행도 센다.
CREATE FUNCTION "public"."trip_checks_limit"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (SELECT count(*) FROM public.trip_checks c WHERE c.trip_id = NEW.trip_id) >= 30 THEN
    RAISE EXCEPTION 'checklist limit' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "trip_checks_limit" BEFORE INSERT ON "public"."trip_checks"
FOR EACH ROW EXECUTE FUNCTION "public"."trip_checks_limit"();
