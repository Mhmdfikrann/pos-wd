ALTER TABLE `payments` ADD `provider` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `channel_label` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `line_no` integer;--> statement-breakpoint
ALTER TABLE `payments` ADD `request_idempotency_key` text;