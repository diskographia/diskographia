CREATE TYPE "public"."application_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."child_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
CREATE TYPE "public"."entity_kind" AS ENUM('event', 'capsule', 'product', 'content');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('image', 'audio', 'video', 'file', 'embed');--> statement-breakpoint
CREATE TYPE "public"."notification_kind" AS ENUM('child_pending', 'child_resolved', 'application_submitted', 'application_resolved', 'collaborator_added', 'feedback_received');--> statement-breakpoint
CREATE TYPE "public"."permission" AS ENUM('edit', 'publish_into');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('draft', 'private', 'unlisted', 'public');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"phone" text,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp(3) with time zone,
	CONSTRAINT "accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "profile_feedback" (
	"target_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"withdrawn_at" timestamp(3) with time zone,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_feedback_target_id_author_id_pk" PRIMARY KEY("target_id","author_id")
);
--> statement-breakpoint
CREATE TABLE "profile_tags" (
	"profile_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "profile_tags_profile_id_tag_id_pk" PRIMARY KEY("profile_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"handle" text NOT NULL,
	"bio_md" text DEFAULT '' NOT NULL,
	"appearance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"grid_seed" integer NOT NULL,
	"grid_version" integer DEFAULT 1 NOT NULL,
	"weight" integer DEFAULT 0 NOT NULL,
	"feedback_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp(3) with time zone,
	CONSTRAINT "profiles_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"kind" "entity_kind" NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description_md" text DEFAULT '' NOT NULL,
	"visibility" "visibility" DEFAULT 'draft' NOT NULL,
	"share_key" text,
	"inventory_slot" integer,
	"feedback_count" integer DEFAULT 0 NOT NULL,
	"search_vector" "tsvector",
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp(3) with time zone,
	CONSTRAINT "entities_share_key_unique" UNIQUE("share_key"),
	CONSTRAINT "entities_owner_slug_key" UNIQUE("owner_id","slug")
);
--> statement-breakpoint
CREATE TABLE "entity_children" (
	"parent_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"slot_index" integer NOT NULL,
	"status" "child_status" DEFAULT 'approved' NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entity_children_parent_id_child_id_pk" PRIMARY KEY("parent_id","child_id")
);
--> statement-breakpoint
CREATE TABLE "entity_events" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"starts_at" timestamp(3) with time zone NOT NULL,
	"ends_at" timestamp(3) with time zone,
	"location" text
);
--> statement-breakpoint
CREATE TABLE "entity_feedback" (
	"entity_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"is_auto" boolean DEFAULT false NOT NULL,
	"withdrawn_at" timestamp(3) with time zone,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entity_feedback_entity_id_profile_id_pk" PRIMARY KEY("entity_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "entity_products" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"price_amount" numeric(12, 2),
	"price_currency" char(3),
	"price_label" text,
	"contacts" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_tags" (
	"entity_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "entity_tags_entity_id_tag_id_pk" PRIMARY KEY("entity_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "entity_media" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"entity_id" uuid NOT NULL,
	"kind" "media_kind" NOT NULL,
	"file_id" uuid,
	"embed_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"sha256" char(64) NOT NULL,
	"path" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"mime_type" text NOT NULL,
	"width" integer,
	"height" integer,
	"duration_ms" integer,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_sha256_unique" UNIQUE("sha256")
);
--> statement-breakpoint
CREATE TABLE "entity_collaborators" (
	"entity_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entity_collaborators_entity_id_profile_id_pk" PRIMARY KEY("entity_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission" "permission" NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_pk" PRIMARY KEY("role_id","permission")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_owner_name_key" UNIQUE("owner_id","name")
);
--> statement-breakpoint
CREATE TABLE "event_participants" (
	"event_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"attending" boolean DEFAULT false NOT NULL,
	"application_status" "application_status",
	"attached_entity_id" uuid,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_participants_event_id_profile_id_pk" PRIMARY KEY("event_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp(3) with time zone,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile_feedback" ADD CONSTRAINT "profile_feedback_target_id_profiles_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_feedback" ADD CONSTRAINT "profile_feedback_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_tags" ADD CONSTRAINT "profile_tags_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_tags" ADD CONSTRAINT "profile_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_children" ADD CONSTRAINT "entity_children_parent_id_entities_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_children" ADD CONSTRAINT "entity_children_child_id_entities_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_events" ADD CONSTRAINT "entity_events_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_feedback" ADD CONSTRAINT "entity_feedback_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_feedback" ADD CONSTRAINT "entity_feedback_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_products" ADD CONSTRAINT "entity_products_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_tags" ADD CONSTRAINT "entity_tags_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_tags" ADD CONSTRAINT "entity_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_media" ADD CONSTRAINT "entity_media_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_media" ADD CONSTRAINT "entity_media_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_collaborators" ADD CONSTRAINT "entity_collaborators_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_collaborators" ADD CONSTRAINT "entity_collaborators_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_collaborators" ADD CONSTRAINT "entity_collaborators_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_id_entities_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_attached_entity_id_entities_id_fk" FOREIGN KEY ("attached_entity_id") REFERENCES "public"."entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_profiles_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_feedback_author_idx" ON "profile_feedback" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "profile_tags_tag_idx" ON "profile_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "entities_owner_kind_idx" ON "entities" USING btree ("owner_id","kind");--> statement-breakpoint
CREATE INDEX "entities_kind_visibility_idx" ON "entities" USING btree ("kind","visibility");--> statement-breakpoint
CREATE INDEX "entity_children_parent_slot_idx" ON "entity_children" USING btree ("parent_id","slot_index");--> statement-breakpoint
CREATE INDEX "entity_children_child_idx" ON "entity_children" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "entity_events_period_idx" ON "entity_events" USING btree ("starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "entity_feedback_profile_idx" ON "entity_feedback" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "entity_products_price_idx" ON "entity_products" USING btree ("price_amount");--> statement-breakpoint
CREATE INDEX "entity_tags_tag_idx" ON "entity_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "entity_media_entity_sort_idx" ON "entity_media" USING btree ("entity_id","sort_order");--> statement-breakpoint
CREATE INDEX "entity_media_file_idx" ON "entity_media" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "entity_collaborators_profile_idx" ON "entity_collaborators" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "entity_collaborators_role_idx" ON "entity_collaborators" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "event_participants_profile_idx" ON "event_participants" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "event_participants_status_idx" ON "event_participants" USING btree ("event_id","application_status");--> statement-breakpoint
CREATE INDEX "notifications_inbox_idx" ON "notifications" USING btree ("recipient_id","read_at","created_at");