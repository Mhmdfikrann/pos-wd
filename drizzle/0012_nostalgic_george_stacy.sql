CREATE TABLE `package_items` (
	`id` text PRIMARY KEY NOT NULL,
	`package_product_id` text NOT NULL,
	`item_product_id` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`package_product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `products` ADD `unit` text DEFAULT 'porsi' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `type` text DEFAULT 'single' NOT NULL;