CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"uid" text,
	"email" text,
	"visitor" text,
	"event" text NOT NULL,
	"page" text,
	"method" text,
	"browser" text,
	"device" text,
	"platform" text,
	"t" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"challenge" text NOT NULL,
	"uid" text,
	"purpose" text NOT NULL,
	"origin" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_limits" (
	"key" text PRIMARY KEY,
	"count" integer DEFAULT 1 NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passkeys" (
	"id" text PRIMARY KEY,
	"uid" text NOT NULL,
	"public_key" text NOT NULL,
	"counter" bigint DEFAULT 0 NOT NULL,
	"transports" jsonb DEFAULT '[]' NOT NULL,
	"name" text NOT NULL,
	"rp_id" text NOT NULL,
	"created" timestamp with time zone DEFAULT now() NOT NULL,
	"last" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "passkey_sessions" (
	"hash" text PRIMARY KEY,
	"credential_id" text NOT NULL,
	"uid" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "activity_time_idx" ON "activity" ("t","id");--> statement-breakpoint
CREATE INDEX "activity_uid_idx" ON "activity" ("uid");--> statement-breakpoint
CREATE INDEX "passkeys_uid_idx" ON "passkeys" ("uid");--> statement-breakpoint
CREATE INDEX "passkey_sessions_uid_idx" ON "passkey_sessions" ("uid");--> statement-breakpoint
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_uid_users_id_fkey" FOREIGN KEY ("uid") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "passkey_sessions" ADD CONSTRAINT "passkey_sessions_credential_id_passkeys_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "passkeys"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "passkey_sessions" ADD CONSTRAINT "passkey_sessions_uid_users_id_fkey" FOREIGN KEY ("uid") REFERENCES "users"("id");