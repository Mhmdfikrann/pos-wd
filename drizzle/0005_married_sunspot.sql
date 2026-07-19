CREATE TABLE `approval_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`target_order_id` text NOT NULL,
	`amount` integer,
	`reason` text NOT NULL,
	`payload` text,
	`requested_by_id` text NOT NULL,
	`approved_by_id` text,
	`rejected_by_id` text,
	`resolved_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requested_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rejected_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `approval_requests_outlet_status_idx` ON `approval_requests` (`outlet_id`,`status`);--> statement-breakpoint
CREATE INDEX `approval_requests_order_idx` ON `approval_requests` (`target_order_id`);