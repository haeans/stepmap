CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"title" text NOT NULL,
	"destination" text DEFAULT '' NOT NULL,
	"start_date" date,
	"end_date" date,
	"companions" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trips_title_length" CHECK (char_length("trips"."title") between 1 and 100),
	CONSTRAINT "trips_destination_length" CHECK (char_length("trips"."destination") <= 100),
	CONSTRAINT "trips_companions_range" CHECK ("trips"."companions" between 1 and 99),
	CONSTRAINT "trips_date_order" CHECK ("trips"."end_date" is null or "trips"."start_date" is null or "trips"."end_date" >= "trips"."start_date")
);
--> statement-breakpoint
ALTER TABLE "trips" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trips_owner_id_idx" ON "trips" USING btree ("owner_id");--> statement-breakpoint
CREATE POLICY "trips_select_owner" ON "trips" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("trips"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "trips_insert_owner" ON "trips" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("trips"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "trips_update_owner" ON "trips" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("trips"."owner_id" = (select auth.uid())) WITH CHECK ("trips"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "trips_delete_owner" ON "trips" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("trips"."owner_id" = (select auth.uid()));