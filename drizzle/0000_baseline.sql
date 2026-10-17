CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"trip_year_id" text NOT NULL,
	"member_id" text NOT NULL,
	"status" text NOT NULL,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_trip_year_id_member_id_pk" PRIMARY KEY("trip_year_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text,
	"action" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blackout_dates" (
	"id" text PRIMARY KEY NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"site_id" text,
	"trip_year_id" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "date_options" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_year_id" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "date_responses" (
	"member_id" text NOT NULL,
	"date_option_id" text NOT NULL,
	"status" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "date_responses_member_id_date_option_id_pk" PRIMARY KEY("member_id","date_option_id")
);
--> statement-breakpoint
CREATE TABLE "gear_claims" (
	"gear_item_id" text NOT NULL,
	"member_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "gear_claims_gear_item_id_member_id_pk" PRIMARY KEY("gear_item_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "gear_items" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_year_id" text NOT NULL,
	"name" text NOT NULL,
	"quantity_needed" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hike_ideas" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text,
	"name" text NOT NULL,
	"link" text,
	"notes" text,
	"status" text DEFAULT 'new' NOT NULL,
	"draft" jsonb,
	"site_id" text,
	"reviewed_by_id" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lottery_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_year_id" text NOT NULL,
	"lottery_name" text NOT NULL,
	"site_id" text,
	"member_id" text,
	"dates_requested" text,
	"closes_on" date,
	"results_on" date,
	"result" text DEFAULT 'entered' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT true NOT NULL,
	"image" text,
	"role" text DEFAULT 'member' NOT NULL,
	"phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"personal_link_token" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"emergency_contact_email" text,
	"notify_email" boolean DEFAULT true NOT NULL,
	"notify_sms" boolean DEFAULT true NOT NULL,
	"diet" text,
	"legacy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_email_unique" UNIQUE("email"),
	CONSTRAINT "members_personal_link_token_unique" UNIQUE("personal_link_token"),
	CONSTRAINT "members_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"member_id" text,
	"recipient" text NOT NULL,
	"channel" text NOT NULL,
	"subject" text,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "past_trip_attendees" (
	"past_trip_id" text NOT NULL,
	"member_id" text NOT NULL,
	CONSTRAINT "past_trip_attendees_past_trip_id_member_id_pk" PRIMARY KEY("past_trip_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "past_trips" (
	"id" text PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"start_date" date,
	"end_date" date,
	"site_id" text,
	"location_name" text,
	"latitude" double precision,
	"longitude" double precision,
	"hike_miles" double precision,
	"elevation_gain_ft" integer,
	"camp_elevation_ft" integer,
	"album_url" text,
	"cover_photo_url" text,
	"notes" text,
	"legacy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "past_trips_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE "permit_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"window_id" text NOT NULL,
	"member_id" text,
	"priority" integer NOT NULL,
	"outcome" text DEFAULT 'pending' NOT NULL,
	"confirmation_number" text,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permit_volunteers" (
	"trip_year_id" text NOT NULL,
	"member_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permit_volunteers_trip_year_id_member_id_pk" PRIMARY KEY("trip_year_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "permit_windows" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_year_id" text NOT NULL,
	"site_id" text NOT NULL,
	"target_start_date" date NOT NULL,
	"opens_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ride_riders" (
	"ride_id" text NOT NULL,
	"member_id" text NOT NULL,
	CONSTRAINT "ride_riders_ride_id_member_id_pk" PRIMARY KEY("ride_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "rides" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_year_id" text NOT NULL,
	"driver_id" text NOT NULL,
	"seats" integer NOT NULL,
	"departure_city" text,
	"departure_time" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_votes" (
	"trip_year_id" text NOT NULL,
	"member_id" text NOT NULL,
	"site_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_votes_trip_year_id_member_id_site_id_pk" PRIMARY KEY("trip_year_id","member_id","site_id")
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"region" text,
	"area" text,
	"description" text,
	"latitude" double precision,
	"longitude" double precision,
	"difficulty" text,
	"distance_miles" double precision,
	"elevation_gain_ft" integer,
	"camp_elevation_ft" integer,
	"peak_elevation_ft" integer,
	"photos" text[] DEFAULT '{}' NOT NULL,
	"trail_info_url" text,
	"permit_type" text,
	"permit_advance_days" integer,
	"permit_open_time" text DEFAULT '07:00' NOT NULL,
	"permit_fixed_open_date" text,
	"permit_lottery_open" text,
	"permit_lottery_close" text,
	"permit_lottery_results" text,
	"permit_cost" double precision,
	"permit_url" text,
	"permit_entry_point" text,
	"permit_group_size_limit" integer,
	"permit_notes" text,
	"scenery_score" integer,
	"experience_score" integer,
	"access_score" integer,
	"permit_score" integer,
	"total_score" integer,
	"ranking_notes" text,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"legacy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sites_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE "trip_backup_sites" (
	"trip_year_id" text NOT NULL,
	"site_id" text NOT NULL,
	"rank" integer NOT NULL,
	CONSTRAINT "trip_backup_sites_trip_year_id_site_id_pk" PRIMARY KEY("trip_year_id","site_id")
);
--> statement-breakpoint
CREATE TABLE "trip_years" (
	"id" text PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"stage" text DEFAULT 'kickoff' NOT NULL,
	"date_poll_deadline" date,
	"site_poll_deadline" date,
	"attendance_deadline" date,
	"start_date" date,
	"end_date" date,
	"site_id" text,
	"max_site_votes" integer DEFAULT 5 NOT NULL,
	"logistics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_years_year_unique" UNIQUE("year")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_members_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_trip_year_id_trip_years_id_fk" FOREIGN KEY ("trip_year_id") REFERENCES "public"."trip_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_trip_year_id_trip_years_id_fk" FOREIGN KEY ("trip_year_id") REFERENCES "public"."trip_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_options" ADD CONSTRAINT "date_options_trip_year_id_trip_years_id_fk" FOREIGN KEY ("trip_year_id") REFERENCES "public"."trip_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_responses" ADD CONSTRAINT "date_responses_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_responses" ADD CONSTRAINT "date_responses_date_option_id_date_options_id_fk" FOREIGN KEY ("date_option_id") REFERENCES "public"."date_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_claims" ADD CONSTRAINT "gear_claims_gear_item_id_gear_items_id_fk" FOREIGN KEY ("gear_item_id") REFERENCES "public"."gear_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_claims" ADD CONSTRAINT "gear_claims_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_items" ADD CONSTRAINT "gear_items_trip_year_id_trip_years_id_fk" FOREIGN KEY ("trip_year_id") REFERENCES "public"."trip_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hike_ideas" ADD CONSTRAINT "hike_ideas_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hike_ideas" ADD CONSTRAINT "hike_ideas_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hike_ideas" ADD CONSTRAINT "hike_ideas_reviewed_by_id_members_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lottery_entries" ADD CONSTRAINT "lottery_entries_trip_year_id_trip_years_id_fk" FOREIGN KEY ("trip_year_id") REFERENCES "public"."trip_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lottery_entries" ADD CONSTRAINT "lottery_entries_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lottery_entries" ADD CONSTRAINT "lottery_entries_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "past_trip_attendees" ADD CONSTRAINT "past_trip_attendees_past_trip_id_past_trips_id_fk" FOREIGN KEY ("past_trip_id") REFERENCES "public"."past_trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "past_trip_attendees" ADD CONSTRAINT "past_trip_attendees_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "past_trips" ADD CONSTRAINT "past_trips_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permit_attempts" ADD CONSTRAINT "permit_attempts_window_id_permit_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."permit_windows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permit_attempts" ADD CONSTRAINT "permit_attempts_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permit_volunteers" ADD CONSTRAINT "permit_volunteers_trip_year_id_trip_years_id_fk" FOREIGN KEY ("trip_year_id") REFERENCES "public"."trip_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permit_volunteers" ADD CONSTRAINT "permit_volunteers_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permit_windows" ADD CONSTRAINT "permit_windows_trip_year_id_trip_years_id_fk" FOREIGN KEY ("trip_year_id") REFERENCES "public"."trip_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permit_windows" ADD CONSTRAINT "permit_windows_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_riders" ADD CONSTRAINT "ride_riders_ride_id_rides_id_fk" FOREIGN KEY ("ride_id") REFERENCES "public"."rides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_riders" ADD CONSTRAINT "ride_riders_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_trip_year_id_trip_years_id_fk" FOREIGN KEY ("trip_year_id") REFERENCES "public"."trip_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_driver_id_members_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_members_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_votes" ADD CONSTRAINT "site_votes_trip_year_id_trip_years_id_fk" FOREIGN KEY ("trip_year_id") REFERENCES "public"."trip_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_votes" ADD CONSTRAINT "site_votes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_votes" ADD CONSTRAINT "site_votes_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_backup_sites" ADD CONSTRAINT "trip_backup_sites_trip_year_id_trip_years_id_fk" FOREIGN KEY ("trip_year_id") REFERENCES "public"."trip_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_backup_sites" ADD CONSTRAINT "trip_backup_sites_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_years" ADD CONSTRAINT "trip_years_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_site_idx" ON "comments" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "comments_trip_idx" ON "comments" USING btree ("trip_year_id");--> statement-breakpoint
CREATE UNIQUE INDEX "date_options_trip_start_idx" ON "date_options" USING btree ("trip_year_id","start_date");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_dedupe_idx" ON "notifications" USING btree ("dedupe_key","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "permit_windows_unique_idx" ON "permit_windows" USING btree ("trip_year_id","site_id","target_start_date");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");