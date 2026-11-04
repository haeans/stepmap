ALTER TABLE "items" ADD COLUMN "place_id" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "photo_url" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "photo_credit" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "photo_page" text;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_place_id_length" CHECK (char_length("items"."place_id") <= 300);--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_photo_url" CHECK ("items"."photo_url" = '' or ("items"."photo_url" ~ '^https://(upload|thumb)\.wikimedia\.org/' and char_length("items"."photo_url") <= 2000));--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_photo_credit_length" CHECK (char_length("items"."photo_credit") <= 300);--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_photo_page" CHECK ("items"."photo_page" ~ '^https://commons\.wikimedia\.org/' and char_length("items"."photo_page") <= 2000);