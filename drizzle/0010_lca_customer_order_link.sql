ALTER TABLE `orders` ADD `customer_member_id` text REFERENCES `customer_members`(`id`);--> statement-breakpoint
ALTER TABLE `orders` ADD `customer_phone` text;--> statement-breakpoint
CREATE INDEX `orders_customer_member_idx` ON `orders` (`customer_member_id`);
