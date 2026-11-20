CREATE TABLE "app_content" (
	"id" text PRIMARY KEY,
	"data" jsonb NOT NULL,
	"updated" timestamp with time zone DEFAULT now() NOT NULL
);
