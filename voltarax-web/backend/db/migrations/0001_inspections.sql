CREATE TABLE "inspection_photos" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"source" text NOT NULL,
	"mime" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"sha256" text NOT NULL,
	"data_base64" text NOT NULL,
	"saved_at" timestamp with time zone NOT NULL,
	"saved_by" text NOT NULL,
	CONSTRAINT "photo_source" CHECK ("inspection_photos"."source" in ('camera','upload')),
	CONSTRAINT "photo_mime" CHECK ("inspection_photos"."mime" in ('image/jpeg','image/png'))
);
--> statement-breakpoint
CREATE TABLE "inspections" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"kind" text NOT NULL,
	"area" text NOT NULL,
	"area_key" text NOT NULL,
	"condition" text NOT NULL,
	"notes" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"photo_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "inspection_kind" CHECK ("inspections"."kind" in ('camera','coating')),
	CONSTRAINT "inspection_condition" CHECK ("inspections"."condition" in ('clean','dusty','cracked','peeling','other','unknown'))
);
--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_photo_id_inspection_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."inspection_photos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inspection_photos_site_saved" ON "inspection_photos" USING btree ("site_id","saved_at");--> statement-breakpoint
CREATE INDEX "inspections_site_observed" ON "inspections" USING btree ("site_id","kind","observed_at");