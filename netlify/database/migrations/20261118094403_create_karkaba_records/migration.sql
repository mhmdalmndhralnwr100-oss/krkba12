CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"uid" text NOT NULL,
	"from" text NOT NULL,
	"name" text NOT NULL,
	"text" text NOT NULL,
	"t" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"uid" text NOT NULL,
	"name" text NOT NULL,
	"contact" text NOT NULL,
	"service" text NOT NULL,
	"details" text NOT NULL,
	"status" text DEFAULT 'جديد' NOT NULL,
	"t" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"created" timestamp with time zone DEFAULT now() NOT NULL,
	"last" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "messages_uid_time_idx" ON "messages" ("uid","t");--> statement-breakpoint
CREATE INDEX "orders_uid_idx" ON "orders" ("uid");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_uid_users_id_fkey" FOREIGN KEY ("uid") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_uid_users_id_fkey" FOREIGN KEY ("uid") REFERENCES "users"("id");