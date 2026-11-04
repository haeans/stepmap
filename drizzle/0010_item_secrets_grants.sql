-- 직접 쓴 마이그레이션: item_secrets 테이블 권한과 updated_at 트리거 (decisions.md B6, B8, C8 F20)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."item_secrets" TO "authenticated";
--> statement-breakpoint
REVOKE ALL ON TABLE "public"."item_secrets" FROM "anon";
--> statement-breakpoint
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."item_secrets" FROM "authenticated";
--> statement-breakpoint
CREATE TRIGGER "item_secrets_set_updated_at" BEFORE UPDATE ON "public"."item_secrets"
FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
--> statement-breakpoint
-- 이미 저장된 교통·숙소·식당의 예약 링크를 소유자만 보는 곳으로 복사한다. 관광지 링크는 공개로 그대로 둔다.
-- items.link를 비우는 것은 F20 머지 뒤 따로 한다(추가형 유지: 반영해도 지금 배포본이 그대로 동작하게).
-- 단계는 src/lib/items/sensitive.ts classifyLink와 같은 규칙: 토큰·키 이름이나 20자 넘는 무작위 문자열이 있으면 secret.
INSERT INTO "public"."item_secrets" ("item_id", "trip_id", "booking_link", "level")
SELECT
  i."id",
  i."trip_id",
  i."link",
  CASE
    WHEN regexp_replace(i."link", '^https?://[^/?#]+', '', 'i') ~* '[?&#;/](token|access_?token|key|api_?key|sig|signature|auth|code|hash|session|sid|otp|pnr|confirmation|conf|reservation(_?id)?|booking_?(id|ref|code)?|ticket(_?id)?)='
      OR regexp_replace(i."link", '^https?://[^/?#]+', '', 'i') ~ '[A-Za-z0-9_-]{20,}'
    THEN 'secret'
    ELSE 'owner'
  END
FROM "public"."items" i
WHERE i."kind" IN ('transport', 'lodging', 'food') AND i."link" ~* '^https?://'
ON CONFLICT ("item_id") DO NOTHING;
