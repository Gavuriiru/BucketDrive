CREATE TABLE IF NOT EXISTS `platform_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`platform_name` text DEFAULT 'BucketDrive' NOT NULL,
	`enable_public_signup` integer DEFAULT true NOT NULL,
	`logo_key` text,
	`favicon_key` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
INSERT INTO `platform_settings` (`id`, `platform_name`, `enable_public_signup`)
SELECT 'default', 'BucketDrive', true
WHERE NOT EXISTS (SELECT 1 FROM `platform_settings` WHERE `id` = 'default');
--> statement-breakpoint
ALTER TABLE `bucket_settings` ADD `branding_logo_key` text;
