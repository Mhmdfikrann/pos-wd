ALTER TABLE `orders` ADD `promo_id` text REFERENCES discounts(id);--> statement-breakpoint
ALTER TABLE `orders` ADD `promo_name_snapshot` text;