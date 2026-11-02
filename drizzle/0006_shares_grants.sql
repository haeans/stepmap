-- 직접 쓴 마이그레이션: 공유 테이블 권한과 공유 링크 등록 함수 (decisions.md B6, B8, B25)
GRANT SELECT, INSERT, DELETE ON TABLE "public"."share_links" TO "authenticated";
--> statement-breakpoint
REVOKE ALL ON TABLE "public"."share_links" FROM "anon";
--> statement-breakpoint
REVOKE UPDATE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."share_links" FROM "authenticated";
--> statement-breakpoint
GRANT SELECT ON TABLE "public"."trip_members" TO "authenticated";
--> statement-breakpoint
REVOKE ALL ON TABLE "public"."trip_members" FROM "anon";
--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."trip_members" FROM "authenticated";
--> statement-breakpoint
-- 공유 링크로 들어온 로그인 사용자를 그 여행의 "공유받은 사람"(보기 전용)으로 등록한다.
-- 링크 표와 공유받은 사람 표는 RLS 때문에 본인이 직접 쓸 수 없어서 이 함수만 높은 권한으로 실행한다.
-- 하는 일은 하나뿐이다: 식별값이 맞으면 로그인한 본인을 viewer로 넣고 여행 id를 돌려준다.
-- 식별값이 틀리면 null. 소유자 본인이면 등록하지 않고 여행 id만 돌려준다.
CREATE FUNCTION "public"."accept_share"(share_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target uuid;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'login required' USING ERRCODE = '42501';
  END IF;

  SELECT l.trip_id INTO target FROM public.share_links l WHERE l.token = share_token;
  IF target IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.trips t WHERE t.id = target AND t.owner_id = uid) THEN
    INSERT INTO public.trip_members (trip_id, user_id, role)
    VALUES (target, uid, 'viewer')
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;

  RETURN target;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."accept_share"(text) FROM PUBLIC, "anon";
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."accept_share"(text) TO "authenticated";
