ALTER TABLE `customer_members` ADD `password_hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `customer_members_email_unq` ON `customer_members` (`email`);
