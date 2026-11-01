CREATE TABLE "commerce_events" (
	"digest" text PRIMARY KEY NOT NULL,
	"event_id" text,
	"event" text NOT NULL,
	"order_id" text,
	"result" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	CONSTRAINT "commerce_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "commerce_invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"pdf_base64" text NOT NULL,
	"sha256" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "commerce_invoices_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "commerce_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"request_key" text NOT NULL,
	"plan_snapshot" jsonb NOT NULL,
	"amount_paise" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" text DEFAULT 'creating' NOT NULL,
	"gateway_order_id" text,
	"callback_payment_id" text,
	"callback_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "commerce_orders_gateway_order_id_unique" UNIQUE("gateway_order_id"),
	CONSTRAINT "order_amount" CHECK ("commerce_orders"."amount_paise" between 100 and 1000000000),
	CONSTRAINT "order_currency" CHECK ("commerce_orders"."currency" = 'INR'),
	CONSTRAINT "order_status" CHECK ("commerce_orders"."status" in ('creating','creation_unknown','pending','paid','refunded','review_required'))
);
--> statement-breakpoint
CREATE TABLE "commerce_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"amount_paise" integer NOT NULL,
	"currency" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"refunded_paise" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "commerce_payments_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "payment_amount" CHECK ("commerce_payments"."amount_paise" between 100 and 1000000000 and "commerce_payments"."refunded_paise" between 0 and "commerce_payments"."amount_paise")
);
--> statement-breakpoint
CREATE TABLE "commerce_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price_paise" integer,
	"active" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "plan_price" CHECK ("commerce_plans"."price_paise" is null or "commerce_plans"."price_paise" between 100 and 1000000000)
);
--> statement-breakpoint
CREATE TABLE "commerce_refunds" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"payment_id" text NOT NULL,
	"amount_paise" integer NOT NULL,
	"note" text NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"gateway_refund_id" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "commerce_refunds_gateway_refund_id_unique" UNIQUE("gateway_refund_id"),
	CONSTRAINT "refund_amount" CHECK ("commerce_refunds"."amount_paise" between 1 and 1000000000),
	CONSTRAINT "refund_status" CHECK ("commerce_refunds"."status" in ('requested','submitted','processed','rejected'))
);
--> statement-breakpoint
ALTER TABLE "commerce_invoices" ADD CONSTRAINT "commerce_invoices_order_id_commerce_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."commerce_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_plan_id_commerce_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."commerce_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_payments" ADD CONSTRAINT "commerce_payments_order_id_commerce_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."commerce_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_refunds" ADD CONSTRAINT "commerce_refunds_order_id_commerce_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."commerce_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_refunds" ADD CONSTRAINT "commerce_refunds_payment_id_commerce_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."commerce_payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "order_user_request" ON "commerce_orders" USING btree ("user_id","request_key");--> statement-breakpoint
CREATE INDEX "order_user_created" ON "commerce_orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "refund_order" ON "commerce_refunds" USING btree ("order_id");