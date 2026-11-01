CREATE TABLE "alert_events" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"alert_id" text NOT NULL,
	"action" text NOT NULL,
	"actor_id" text NOT NULL,
	"note" text NOT NULL,
	"at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_signals" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"source_key" text NOT NULL,
	"active" boolean NOT NULL,
	"alert_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"source_key" text,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"severity" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"acknowledged_by" text,
	"acknowledged_at" timestamp with time zone,
	"resolved_by" text,
	"resolved_at" timestamp with time zone,
	"simulated" boolean DEFAULT false NOT NULL,
	CONSTRAINT "alerts_status" CHECK ("alerts"."status" in ('open','acknowledged','resolved')),
	CONSTRAINT "alerts_severity" CHECK ("alerts"."severity" in ('info','warning','critical'))
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"target_id" text NOT NULL,
	"request_id" text,
	"command_id" text,
	"desired" boolean,
	"at" timestamp with time zone NOT NULL,
	"legacy_id" text,
	CONSTRAINT "audit_events_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE "notification_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"event" text NOT NULL,
	"target_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "notification_status" CHECK ("notification_outbox"."status" in ('pending','queued','sent','dead_letter','disabled'))
);
--> statement-breakpoint
CREATE TABLE "esg_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"evidence" jsonb NOT NULL,
	"sha256" text NOT NULL,
	"pdf_base64" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_operation_state" (
	"site_id" text PRIMARY KEY NOT NULL,
	"last_reading_ts" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_order_events" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"work_order_id" text NOT NULL,
	"action" text NOT NULL,
	"actor_id" text NOT NULL,
	"note" text NOT NULL,
	"at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"alert_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"priority" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"assignee_id" text,
	"due_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"simulated" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "work_orders_status" CHECK ("work_orders"."status" in ('open','in_progress','closed')),
	CONSTRAINT "work_orders_priority" CHECK ("work_orders"."priority" in ('low','medium','high','critical'))
);
--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_signals" ADD CONSTRAINT "alert_signals_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_events" ADD CONSTRAINT "work_order_events_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alert_events_parent" ON "alert_events" USING btree ("site_id","alert_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "alert_signal_site_key" ON "alert_signals" USING btree ("site_id","source_key");--> statement-breakpoint
CREATE INDEX "alerts_site_created" ON "alerts" USING btree ("site_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_at" ON "audit_events" USING btree ("at");--> statement-breakpoint
CREATE INDEX "notification_outbox_pending" ON "notification_outbox" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "esg_reports_site_created" ON "esg_reports" USING btree ("site_id","created_at");--> statement-breakpoint
CREATE INDEX "work_order_events_parent" ON "work_order_events" USING btree ("site_id","work_order_id","at");--> statement-breakpoint
CREATE INDEX "work_orders_site_created" ON "work_orders" USING btree ("site_id","created_at");