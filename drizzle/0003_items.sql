CREATE TYPE "public"."item_kind" AS ENUM('transport', 'lodging', 'sight', 'food', 'memo');--> statement-breakpoint
CREATE TYPE "public"."item_source" AS ENUM('manual', 'ai');--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"day" integer NOT NULL,
	"time" time,
	"position" integer DEFAULT 0 NOT NULL,
	"kind" "item_kind" NOT NULL,
	"name" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"memo" text DEFAULT '' NOT NULL,
	"link" text DEFAULT '' NOT NULL,
	"cost_amount" numeric(14, 2),
	"cost_currency" text,
	"source" "item_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_day_range" CHECK ("items"."day" between 1 and 60),
	CONSTRAINT "items_name_length" CHECK (char_length("items"."name") between 1 and 200),
	CONSTRAINT "items_address_length" CHECK (char_length("items"."address") <= 300),
	CONSTRAINT "items_memo_length" CHECK (char_length("items"."memo") <= 2000),
	CONSTRAINT "items_link_length" CHECK (char_length("items"."link") <= 2000),
	CONSTRAINT "items_coords_pair" CHECK (("items"."lat" is null) = ("items"."lng" is null)),
	CONSTRAINT "items_cost_pair" CHECK (("items"."cost_amount" is null and "items"."cost_currency" is null) or ("items"."cost_amount" >= 0 and "items"."cost_currency" ~ '^[A-Z]{3}$'))
);
--> statement-breakpoint
ALTER TABLE "items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "items_trip_order_idx" ON "items" USING btree ("trip_id","day","time","position");--> statement-breakpoint
CREATE POLICY "items_select_owner" ON "items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from "trips" where "trips"."id" = "items"."trip_id" and "trips"."owner_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "items_insert_owner" ON "items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (select 1 from "trips" where "trips"."id" = "items"."trip_id" and "trips"."owner_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "items_update_owner" ON "items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (select 1 from "trips" where "trips"."id" = "items"."trip_id" and "trips"."owner_id" = (select auth.uid()))) WITH CHECK (exists (select 1 from "trips" where "trips"."id" = "items"."trip_id" and "trips"."owner_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "items_delete_owner" ON "items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (exists (select 1 from "trips" where "trips"."id" = "items"."trip_id" and "trips"."owner_id" = (select auth.uid())));