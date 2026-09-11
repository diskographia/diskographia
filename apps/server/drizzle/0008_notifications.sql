ALTER TYPE "public"."notification_kind" ADD VALUE 'child_added' BEFORE 'application_submitted';--> statement-breakpoint
ALTER TYPE "public"."notification_kind" ADD VALUE 'collaborator_removed' BEFORE 'feedback_received';--> statement-breakpoint
CREATE TABLE "profile_settings" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"notify_child" boolean DEFAULT true NOT NULL,
	"notify_application" boolean DEFAULT true NOT NULL,
	"notify_feedback" boolean DEFAULT true NOT NULL,
	"notify_collaborator" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile_settings" ADD CONSTRAINT "profile_settings_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;