ALTER TABLE `notification` ADD `workspace_id` text REFERENCES workspace(id);--> statement-breakpoint
ALTER TABLE `notification` ADD `data` text;