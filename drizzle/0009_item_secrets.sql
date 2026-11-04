CREATE TABLE "item_secrets" (
	"item_id" uuid PRIMARY KEY NOT NULL,
	"trip_id" uuid NOT NULL,
	"booking_no" text DEFAULT '' NOT NULL,
	"booking_link" text DEFAULT '' NOT NULL,
	"level" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_secrets_booking_no_length" CHECK (char_length("item_secrets"."booking_no") <= 100),
	CONSTRAINT "item_secrets_booking_link" CHECK ("item_secrets"."booking_link" = '' or ("item_secrets"."booking_link" ~* '^https?://' and char_length("item_secrets"."booking_link") <= 2000)),
	CONSTRAINT "item_secrets_level" CHECK ("item_secrets"."level" in ('owner', 'secret'))
);
--> statement-breakpoint
ALTER TABLE "item_secrets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "item_secrets" ADD CONSTRAINT "item_secrets_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_secrets" ADD CONSTRAINT "item_secrets_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_secrets_trip_id_idx" ON "item_secrets" USING btree ("trip_id");--> statement-breakpoint
CREATE POLICY "item_secrets_select_owner" ON "item_secrets" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from "trips" where "trips"."id" = "item_secrets"."trip_id" and "trips"."owner_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "item_secrets_insert_owner" ON "item_secrets" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (select 1 from "trips" where "trips"."id" = "item_secrets"."trip_id" and "trips"."owner_id" = (select auth.uid())) and exists (select 1 from "items" where "items"."id" = "item_secrets"."item_id" and "items"."trip_id" = "item_secrets"."trip_id"));--> statement-breakpoint
CREATE POLICY "item_secrets_update_owner" ON "item_secrets" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (select 1 from "trips" where "trips"."id" = "item_secrets"."trip_id" and "trips"."owner_id" = (select auth.uid()))) WITH CHECK (exists (select 1 from "trips" where "trips"."id" = "item_secrets"."trip_id" and "trips"."owner_id" = (select auth.uid())) and exists (select 1 from "items" where "items"."id" = "item_secrets"."item_id" and "items"."trip_id" = "item_secrets"."trip_id"));--> statement-breakpoint
CREATE POLICY "item_secrets_delete_owner" ON "item_secrets" AS PERMISSIVE FOR DELETE TO "authenticated" USING (exists (select 1 from "trips" where "trips"."id" = "item_secrets"."trip_id" and "trips"."owner_id" = (select auth.uid())));