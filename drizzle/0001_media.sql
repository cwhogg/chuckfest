CREATE TABLE "media" (
	"name" text PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"data_base64" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
