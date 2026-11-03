-- 직접 쓴 마이그레이션: 대표 이미지 올리기용 Storage 버킷과 정책 (F08, 작업 파일 haeans-f08-cover-image 결정 5)
-- 공개 버킷이라 주소를 아는 사람은 볼 수 있다. 주소에는 무작위 여행 id가 들어간다.
-- 파일은 여행마다 "<여행 id>/cover" 하나이고, 그 여행의 소유자만 넣고·고치고·지운다.
INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit", "allowed_mime_types")
VALUES ('trip-covers', 'trip-covers', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."owns_trip_cover"("object_name" text) RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT "object_name" ~ '^[0-9a-f-]{36}/cover$'
    AND EXISTS (
      SELECT 1 FROM "public"."trips" t
      WHERE t."id"::text = split_part("object_name", '/', 1) AND t."owner_id" = auth.uid()
    );
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."owns_trip_cover"(text) FROM PUBLIC, "anon";
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."owns_trip_cover"(text) TO "authenticated";
--> statement-breakpoint
-- 덮어쓰기(upsert)에는 보기·넣기·고치기 정책이 모두 필요하다. 공개 주소로 보는 것은 정책과 상관없다.
CREATE POLICY "trip_covers_select_owner" ON "storage"."objects" FOR SELECT TO "authenticated"
USING ("bucket_id" = 'trip-covers' AND "public"."owns_trip_cover"("name"));
--> statement-breakpoint
CREATE POLICY "trip_covers_insert_owner" ON "storage"."objects" FOR INSERT TO "authenticated"
WITH CHECK ("bucket_id" = 'trip-covers' AND "public"."owns_trip_cover"("name"));
--> statement-breakpoint
CREATE POLICY "trip_covers_update_owner" ON "storage"."objects" FOR UPDATE TO "authenticated"
USING ("bucket_id" = 'trip-covers' AND "public"."owns_trip_cover"("name"))
WITH CHECK ("bucket_id" = 'trip-covers' AND "public"."owns_trip_cover"("name"));
--> statement-breakpoint
CREATE POLICY "trip_covers_delete_owner" ON "storage"."objects" FOR DELETE TO "authenticated"
USING ("bucket_id" = 'trip-covers' AND "public"."owns_trip_cover"("name"));
