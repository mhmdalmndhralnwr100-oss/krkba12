CREATE TABLE "app_sessions" (
	"hash" text PRIMARY KEY,
	"uid" text NOT NULL,
	"source" text NOT NULL,
	"binding" text NOT NULL,
	"hidden_at" timestamp with time zone,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"created" timestamp with time zone DEFAULT now() NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "audio_key" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "audio_type" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "audio_seconds" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "welcome_seen" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "app_sessions_uid_idx" ON "app_sessions" ("uid");--> statement-breakpoint
ALTER TABLE "app_sessions" ADD CONSTRAINT "app_sessions_uid_users_id_fkey" FOREIGN KEY ("uid") REFERENCES "users"("id");