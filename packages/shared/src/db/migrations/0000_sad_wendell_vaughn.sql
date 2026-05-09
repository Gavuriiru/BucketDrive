CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text,
	`ip_address` text,
	`user_agent` text,
	`metadata` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bucket` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`provider` text DEFAULT 'r2' NOT NULL,
	`region` text,
	`visibility` text DEFAULT 'private' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `favorite` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`file_object_id` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `file_object` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`bucket_id` text NOT NULL,
	`folder_id` text,
	`owner_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`extension` text,
	`size_bytes` integer DEFAULT 0 NOT NULL,
	`checksum` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`deleted_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bucket_id`) REFERENCES `bucket`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `file_object_storage_key_unique` ON `file_object` (`storage_key`);--> statement-breakpoint
CREATE TABLE `file_object_tag` (
	`id` text PRIMARY KEY NOT NULL,
	`file_object_id` text NOT NULL,
	`tag_id` text NOT NULL,
	FOREIGN KEY (`file_object_id`) REFERENCES `file_object`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `file_tag`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `file_tag` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#6b7280' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `folder` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`parent_folder_id` text,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`created_by` text NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`deleted_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notification` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `share_access_attempt` (
	`id` text PRIMARY KEY NOT NULL,
	`share_link_id` text NOT NULL,
	`ip_address` text NOT NULL,
	`user_agent` text,
	`success` integer NOT NULL,
	`attempted_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`share_link_id`) REFERENCES `share_link`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `share_link` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`share_type` text NOT NULL,
	`created_by` text NOT NULL,
	`password_hash` text,
	`expires_at` text,
	`access_count` integer DEFAULT 0 NOT NULL,
	`last_accessed_at` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `share_permission` (
	`id` text PRIMARY KEY NOT NULL,
	`share_link_id` text NOT NULL,
	`permission` text NOT NULL,
	FOREIGN KEY (`share_link_id`) REFERENCES `share_link`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `upload_part` (
	`id` text PRIMARY KEY NOT NULL,
	`upload_session_id` text NOT NULL,
	`part_number` integer NOT NULL,
	`etag` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`uploaded_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`upload_session_id`) REFERENCES `upload_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `upload_session` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`bucket_id` text NOT NULL,
	`status` text DEFAULT 'initiated' NOT NULL,
	`upload_type` text DEFAULT 'single' NOT NULL,
	`total_size` integer NOT NULL,
	`uploaded_size` integer DEFAULT 0 NOT NULL,
	`storage_key` text,
	`parts_completed` integer DEFAULT 0 NOT NULL,
	`total_parts` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workspace` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`owner_id` text NOT NULL,
	`storage_quota_bytes` integer DEFAULT 10737418240 NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`deleted_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_slug_unique` ON `workspace` (`slug`);--> statement-breakpoint
CREATE TABLE `workspace_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`default_share_expiration_days` integer DEFAULT 30 NOT NULL,
	`enable_public_signup` integer DEFAULT false NOT NULL,
	`trash_retention_days` integer DEFAULT 30 NOT NULL,
	`max_file_size_bytes` integer DEFAULT 5368709120 NOT NULL,
	`allowed_mime_types` text,
	`branding_logo_url` text,
	`branding_name` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_settings_workspace_id_unique` ON `workspace_settings` (`workspace_id`);