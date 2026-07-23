CREATE TABLE `product_addons` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`addon_id` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`addon_id`) REFERENCES `addons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `addons` ADD `is_mandatory` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `addons` ADD `select_mode` text DEFAULT 'multiple' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `min_order` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `is_favorite` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `show_in_bar` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `online_prices` text;