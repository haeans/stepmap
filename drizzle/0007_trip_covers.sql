ALTER TABLE "trips" ADD COLUMN "cover_url" text;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "cover_color" text;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "cover_source" text;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "cover_author_name" text;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "cover_author_url" text;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_cover_url" CHECK ("trips"."cover_url" is null or ("trips"."cover_url" ~ '^https://' and char_length("trips"."cover_url") <= 2000));--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_cover_color" CHECK ("trips"."cover_color" is null or "trips"."cover_color" ~ '^#[0-9A-Fa-f]{6}$');--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_cover_source" CHECK ("trips"."cover_source" is null or "trips"."cover_source" in ('unsplash', 'upload'));--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_cover_author_name" CHECK ("trips"."cover_author_name" is null or char_length("trips"."cover_author_name") <= 200);--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_cover_author_url" CHECK ("trips"."cover_author_url" is null or ("trips"."cover_author_url" ~ '^https://' and char_length("trips"."cover_author_url") <= 2000));