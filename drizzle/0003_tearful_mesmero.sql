ALTER TABLE `kitchen_tickets` ADD `accepted_by_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `kitchen_tickets` ADD `ready_by_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `kitchen_tickets` ADD `completed_by_id` text REFERENCES users(id);