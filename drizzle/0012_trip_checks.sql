CREATE TABLE "trip_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"label" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_checks_label_length" CHECK (char_length("trip_checks"."label") between 1 and 40)
);
--> statement-breakpoint
ALTER TABLE "trip_checks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "trip_checks" ADD CONSTRAINT "trip_checks_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trip_checks_trip_order_idx" ON "trip_checks" USING btree ("trip_id","position");--> statement-breakpoint
CREATE POLICY "trip_checks_select_owner" ON "trip_checks" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from "trips" where "trips"."id" = "trip_checks"."trip_id" and "trips"."owner_id" = (select auth.uid())) or exists (select 1 from "public"."trip_members" m where m.trip_id = "trip_checks"."trip_id" and m.user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "trip_checks_insert_owner" ON "trip_checks" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (select 1 from "trips" where "trips"."id" = "trip_checks"."trip_id" and "trips"."owner_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "trip_checks_update_owner" ON "trip_checks" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (select 1 from "trips" where "trips"."id" = "trip_checks"."trip_id" and "trips"."owner_id" = (select auth.uid()))) WITH CHECK (exists (select 1 from "trips" where "trips"."id" = "trip_checks"."trip_id" and "trips"."owner_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "trip_checks_delete_owner" ON "trip_checks" AS PERMISSIVE FOR DELETE TO "authenticated" USING (exists (select 1 from "trips" where "trips"."id" = "trip_checks"."trip_id" and "trips"."owner_id" = (select auth.uid())));