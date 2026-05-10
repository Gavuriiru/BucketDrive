CREATE VIRTUAL TABLE IF NOT EXISTS `file_search_idx` USING fts5(
	`file_id` UNINDEXED,
	`workspace_id` UNINDEXED,
	`original_name`,
	`extension`,
	`mime_type`
);
--> statement-breakpoint
INSERT INTO `file_search_idx` (`file_id`, `workspace_id`, `original_name`, `extension`, `mime_type`)
SELECT
	`id`,
	`workspace_id`,
	`original_name`,
	COALESCE(`extension`, ''),
	`mime_type`
FROM `file_object`
WHERE NOT EXISTS (SELECT 1 FROM `file_search_idx` LIMIT 1);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `file_search_ai`
AFTER INSERT ON `file_object`
BEGIN
	INSERT INTO `file_search_idx` (`file_id`, `workspace_id`, `original_name`, `extension`, `mime_type`)
	VALUES (NEW.`id`, NEW.`workspace_id`, NEW.`original_name`, COALESCE(NEW.`extension`, ''), NEW.`mime_type`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `file_search_au`
AFTER UPDATE ON `file_object`
BEGIN
	DELETE FROM `file_search_idx` WHERE `file_id` = OLD.`id`;
	INSERT INTO `file_search_idx` (`file_id`, `workspace_id`, `original_name`, `extension`, `mime_type`)
	VALUES (NEW.`id`, NEW.`workspace_id`, NEW.`original_name`, COALESCE(NEW.`extension`, ''), NEW.`mime_type`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `file_search_ad`
AFTER DELETE ON `file_object`
BEGIN
	DELETE FROM `file_search_idx` WHERE `file_id` = OLD.`id`;
END;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_file_object_workspace_deleted` ON `file_object` (`workspace_id`, `is_deleted`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_file_object_mime_type` ON `file_object` (`mime_type`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_favorite_user_file` ON `favorite` (`user_id`, `file_object_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_favorite_user_active` ON `favorite` (`user_id`, `is_active`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_file_object_tag_file` ON `file_object_tag` (`file_object_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_file_object_tag_tag` ON `file_object_tag` (`tag_id`);
