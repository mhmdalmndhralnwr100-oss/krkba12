CREATE TABLE "phone_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"phone" text NOT NULL,
	"verification_sid" text NOT NULL UNIQUE,
	"binding" text NOT NULL,
	"name" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_phone_key" UNIQUE("phone");