CREATE TABLE "share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "share_links_trip_id_key" UNIQUE("trip_id"),
	CONSTRAINT "share_links_token_key" UNIQUE("token"),
	CONSTRAINT "share_links_token_format" CHECK ("share_links"."token" ~ '^[A-Za-z0-9_-]{43}$')
);
--> statement-breakpoint
ALTER TABLE "share_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "trip_members" (
	"trip_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_members_pkey" PRIMARY KEY("trip_id","user_id"),
	CONSTRAINT "trip_members_role" CHECK ("trip_members"."role" = 'viewer')
);
--> statement-breakpoint
ALTER TABLE "trip_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trip_members_user_id_idx" ON "trip_members" USING btree ("user_id");--> statement-breakpoint
CREATE POLICY "share_links_select_owner" ON "share_links" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from "trips" where "trips"."id" = "share_links"."trip_id" and "trips"."owner_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "share_links_insert_owner" ON "share_links" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (select 1 from "trips" where "trips"."id" = "share_links"."trip_id" and "trips"."owner_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "share_links_delete_owner" ON "share_links" AS PERMISSIVE FOR DELETE TO "authenticated" USING (exists (select 1 from "trips" where "trips"."id" = "share_links"."trip_id" and "trips"."owner_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "trip_members_select_self" ON "trip_members" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("trip_members"."user_id" = (select auth.uid()));--> statement-breakpoint
ALTER POLICY "items_select_owner" ON "items" TO authenticated USING (exists (select 1 from "trips" where "trips"."id" = "items"."trip_id" and "trips"."owner_id" = (select auth.uid())) or exists (select 1 from "public"."trip_members" m where m.trip_id = "items"."trip_id" and m.user_id = (select auth.uid())));--> statement-breakpoint
ALTER POLICY "trips_select_owner" ON "trips" TO authenticated USING ("trips"."owner_id" = (select auth.uid()) or exists (select 1 from "public"."trip_members" m where m.trip_id = "trips"."id" and m.user_id = (select auth.uid())));