CREATE TABLE `platform_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`default_workspace_id` text,
	`allow_user_workspace_creation` integer DEFAULT false NOT NULL,
	`enable_public_signup` integer DEFAULT true NOT NULL,
	`platform_name` text DEFAULT 'BucketDrive' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`default_workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `user` ADD `is_platform_admin` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `can_create_workspaces` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `workspace` ADD `is_platform_default` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `workspace_invitation` ADD `can_create_workspaces` integer DEFAULT false NOT NULL;