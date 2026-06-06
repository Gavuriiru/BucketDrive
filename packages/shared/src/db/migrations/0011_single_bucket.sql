PRAGMA foreign_keys=off;
--> statement-breakpoint
ALTER TABLE `user` ADD `role` text DEFAULT 'viewer' NOT NULL;
--> statement-breakpoint
UPDATE `user`
SET `role` = (
	SELECT `workspace_member`.`role`
	FROM `workspace_member`
	WHERE `workspace_member`.`user_id` = `user`.`id`
	ORDER BY CASE `workspace_member`.`role`
		WHEN 'owner' THEN 1
		WHEN 'admin' THEN 2
		WHEN 'manager' THEN 3
		WHEN 'editor' THEN 4
		ELSE 5
	END
	LIMIT 1
)
WHERE EXISTS (
	SELECT 1 FROM `workspace_member` WHERE `workspace_member`.`user_id` = `user`.`id`
);
--> statement-breakpoint
UPDATE `user` SET `role` = 'owner' WHERE `is_platform_admin` = 1;
--> statement-breakpoint
CREATE TABLE `bucket_new` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`provider` text DEFAULT 'r2' NOT NULL,
	`region` text,
	`visibility` text DEFAULT 'private' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
INSERT INTO `bucket_new` (`id`, `name`, `provider`, `region`, `visibility`, `created_at`)
SELECT `id`, `name`, `provider`, `region`, `visibility`, `created_at` FROM `bucket`;
--> statement-breakpoint
CREATE TABLE `bucket_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`bucket_id` text NOT NULL,
	`storage_quota_bytes` integer DEFAULT 10737418240 NOT NULL,
	`default_share_expiration_days` integer DEFAULT 30 NOT NULL,
	`enable_public_signup` integer DEFAULT false NOT NULL,
	`trash_retention_days` integer DEFAULT 30 NOT NULL,
	`max_file_size_bytes` integer DEFAULT 5368709120 NOT NULL,
	`upload_chunk_size_bytes` integer DEFAULT 5242880 NOT NULL,
	`allowed_mime_types` text,
	`branding_logo_url` text,
	`branding_name` text,
	`r2_public_base_url` text,
	`r2_last_sync_at` text,
	`r2_sync_status` text DEFAULT 'idle' NOT NULL,
	`r2_sync_error` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`bucket_id`) REFERENCES `bucket`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `bucket_settings` (
	`id`,
	`bucket_id`,
	`storage_quota_bytes`,
	`default_share_expiration_days`,
	`enable_public_signup`,
	`trash_retention_days`,
	`max_file_size_bytes`,
	`upload_chunk_size_bytes`,
	`allowed_mime_types`,
	`branding_logo_url`,
	`branding_name`,
	`r2_public_base_url`,
	`r2_last_sync_at`,
	`r2_sync_status`,
	`r2_sync_error`,
	`created_at`,
	`updated_at`
)
SELECT
	`workspace_settings`.`id`,
	`bucket`.`id`,
	`workspace`.`storage_quota_bytes`,
	`workspace_settings`.`default_share_expiration_days`,
	`workspace_settings`.`enable_public_signup`,
	`workspace_settings`.`trash_retention_days`,
	`workspace_settings`.`max_file_size_bytes`,
	`workspace_settings`.`upload_chunk_size_bytes`,
	`workspace_settings`.`allowed_mime_types`,
	`workspace_settings`.`branding_logo_url`,
	`workspace_settings`.`branding_name`,
	`workspace_settings`.`r2_public_base_url`,
	`workspace_settings`.`r2_last_sync_at`,
	`workspace_settings`.`r2_sync_status`,
	`workspace_settings`.`r2_sync_error`,
	`workspace_settings`.`created_at`,
	`workspace_settings`.`updated_at`
FROM `workspace_settings`
JOIN `bucket` ON `bucket`.`workspace_id` = `workspace_settings`.`workspace_id`
JOIN `workspace` ON `workspace`.`id` = `workspace_settings`.`workspace_id`;
--> statement-breakpoint
CREATE UNIQUE INDEX `bucket_settings_bucket_id_unique` ON `bucket_settings` (`bucket_id`);
--> statement-breakpoint
CREATE TABLE `file_object_new` (
	`id` text PRIMARY KEY NOT NULL,
	`bucket_id` text NOT NULL,
	`folder_id` text,
	`owner_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`extension` text,
	`size_bytes` integer DEFAULT 0 NOT NULL,
	`checksum` text,
	`thumbnail_key` text,
	`metadata` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`deleted_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`bucket_id`) REFERENCES `bucket`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `file_object_new`
SELECT
	`id`,
	`bucket_id`,
	`folder_id`,
	`owner_id`,
	`storage_key`,
	`original_name`,
	`mime_type`,
	`extension`,
	`size_bytes`,
	`checksum`,
	`thumbnail_key`,
	`metadata`,
	`is_deleted`,
	`deleted_at`,
	`created_at`,
	`updated_at`
FROM `file_object`;
--> statement-breakpoint
CREATE UNIQUE INDEX `file_object_storage_key_unique_new` ON `file_object_new` (`storage_key`);
--> statement-breakpoint
CREATE TABLE `folder_new` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_folder_id` text,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`created_by` text NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`deleted_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
INSERT INTO `folder_new`
SELECT
	`id`,
	`parent_folder_id`,
	`name`,
	`path`,
	`created_by`,
	`is_deleted`,
	`deleted_at`,
	`created_at`,
	`updated_at`
FROM `folder`;
--> statement-breakpoint
CREATE TABLE `file_tag_new` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#6b7280' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
INSERT INTO `file_tag_new` (`id`, `name`, `color`, `created_at`)
SELECT `id`, `name`, `color`, `created_at` FROM `file_tag`;
--> statement-breakpoint
CREATE TABLE `share_link_new` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`share_type` text NOT NULL,
	`created_by` text NOT NULL,
	`password_hash` text,
	`expires_at` text,
	`access_count` integer DEFAULT 0 NOT NULL,
	`download_count` integer DEFAULT 0 NOT NULL,
	`last_accessed_at` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
INSERT INTO `share_link_new`
SELECT
	`id`,
	`resource_type`,
	`resource_id`,
	`share_type`,
	`created_by`,
	`password_hash`,
	`expires_at`,
	`access_count`,
	`download_count`,
	`last_accessed_at`,
	`is_active`,
	`created_at`,
	`updated_at`
FROM `share_link`;
--> statement-breakpoint
CREATE TABLE `audit_log_new` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text,
	`ip_address` text,
	`user_agent` text,
	`metadata` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
INSERT INTO `audit_log_new`
SELECT `id`, `actor_id`, `action`, `resource_type`, `resource_id`, `ip_address`, `user_agent`, `metadata`, `created_at`
FROM `audit_log`;
--> statement-breakpoint
CREATE TABLE `upload_session_new` (
	`id` text PRIMARY KEY NOT NULL,
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
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
INSERT INTO `upload_session_new`
SELECT
	`id`,
	`user_id`,
	`bucket_id`,
	`status`,
	`upload_type`,
	`total_size`,
	`uploaded_size`,
	`storage_key`,
	`parts_completed`,
	`total_parts`,
	`created_at`,
	`updated_at`
FROM `upload_session`;
--> statement-breakpoint
CREATE TABLE `notification_new` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`data` text,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
INSERT INTO `notification_new`
SELECT `id`, `user_id`, `type`, `title`, `message`, `data`, `is_read`, `created_at`
FROM `notification`;
--> statement-breakpoint
CREATE TABLE `bucket_invitation` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`token` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`invited_by` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` text NOT NULL,
	`accepted_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
INSERT INTO `bucket_invitation`
SELECT
	`id`,
	`email`,
	`token`,
	`role`,
	`invited_by`,
	`status`,
	`expires_at`,
	`accepted_at`,
	`created_at`,
	`updated_at`
FROM `workspace_invitation`;
--> statement-breakpoint
CREATE UNIQUE INDEX `bucket_invitation_token_unique` ON `bucket_invitation` (`token`);
--> statement-breakpoint
DROP TABLE `file_object`;
--> statement-breakpoint
ALTER TABLE `file_object_new` RENAME TO `file_object`;
--> statement-breakpoint
DROP INDEX `file_object_storage_key_unique_new`;
--> statement-breakpoint
CREATE UNIQUE INDEX `file_object_storage_key_unique` ON `file_object` (`storage_key`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_file_object_deleted` ON `file_object` (`is_deleted`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_file_object_mime_type` ON `file_object` (`mime_type`);
--> statement-breakpoint
DROP TABLE `file_search_idx`;
--> statement-breakpoint
CREATE VIRTUAL TABLE `file_search_idx` USING fts5(
	`file_id` UNINDEXED,
	`original_name`,
	`extension`,
	`mime_type`
);
--> statement-breakpoint
INSERT INTO `file_search_idx` (`file_id`, `original_name`, `extension`, `mime_type`)
SELECT `id`, `original_name`, COALESCE(`extension`, ''), `mime_type`
FROM `file_object`;
--> statement-breakpoint
CREATE TRIGGER `file_search_ai`
AFTER INSERT ON `file_object`
BEGIN
	INSERT INTO `file_search_idx` (`file_id`, `original_name`, `extension`, `mime_type`)
	VALUES (NEW.`id`, NEW.`original_name`, COALESCE(NEW.`extension`, ''), NEW.`mime_type`);
END;
--> statement-breakpoint
CREATE TRIGGER `file_search_au`
AFTER UPDATE ON `file_object`
BEGIN
	DELETE FROM `file_search_idx` WHERE `file_id` = OLD.`id`;
	INSERT INTO `file_search_idx` (`file_id`, `original_name`, `extension`, `mime_type`)
	VALUES (NEW.`id`, NEW.`original_name`, COALESCE(NEW.`extension`, ''), NEW.`mime_type`);
END;
--> statement-breakpoint
CREATE TRIGGER `file_search_ad`
AFTER DELETE ON `file_object`
BEGIN
	DELETE FROM `file_search_idx` WHERE `file_id` = OLD.`id`;
END;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_favorite_user_file` ON `favorite` (`user_id`, `file_object_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_favorite_user_active` ON `favorite` (`user_id`, `is_active`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_file_object_tag_file` ON `file_object_tag` (`file_object_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_file_object_tag_tag` ON `file_object_tag` (`tag_id`);
--> statement-breakpoint
DROP TABLE `folder`;
--> statement-breakpoint
ALTER TABLE `folder_new` RENAME TO `folder`;
--> statement-breakpoint
DROP TABLE `file_tag`;
--> statement-breakpoint
ALTER TABLE `file_tag_new` RENAME TO `file_tag`;
--> statement-breakpoint
DROP TABLE `share_link`;
--> statement-breakpoint
ALTER TABLE `share_link_new` RENAME TO `share_link`;
--> statement-breakpoint
DROP TABLE `audit_log`;
--> statement-breakpoint
ALTER TABLE `audit_log_new` RENAME TO `audit_log`;
--> statement-breakpoint
DROP TABLE `upload_session`;
--> statement-breakpoint
ALTER TABLE `upload_session_new` RENAME TO `upload_session`;
--> statement-breakpoint
DROP TABLE `notification`;
--> statement-breakpoint
ALTER TABLE `notification_new` RENAME TO `notification`;
--> statement-breakpoint
DROP TABLE `bucket`;
--> statement-breakpoint
ALTER TABLE `bucket_new` RENAME TO `bucket`;
--> statement-breakpoint
DROP TABLE `workspace_settings`;
--> statement-breakpoint
DROP TABLE `workspace_invitation`;
--> statement-breakpoint
DROP TABLE `workspace_member`;
--> statement-breakpoint
DROP TABLE `platform_settings`;
--> statement-breakpoint
DROP TABLE `member`;
--> statement-breakpoint
DROP TABLE `organization`;
--> statement-breakpoint
DROP TABLE `workspace`;
--> statement-breakpoint
PRAGMA foreign_keys=on;
