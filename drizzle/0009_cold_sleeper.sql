CREATE TABLE `customer_members` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`terms_accepted_at` text NOT NULL,
	`privacy_accepted_at` text NOT NULL,
	`marketing_opt_in` integer DEFAULT false NOT NULL,
	`points_balance` integer DEFAULT 0 NOT NULL,
	`tier` text DEFAULT 'silver' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_members_phone_unq` ON `customer_members` (`phone`);--> statement-breakpoint
CREATE TABLE `customer_otp_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`purpose` text NOT NULL,
	`code_hash` text,
	`expires_at` text NOT NULL,
	`verified_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `customer_otp_phone_idx` ON `customer_otp_attempts` (`phone`);--> statement-breakpoint
CREATE TABLE `customer_point_events` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`kind` text NOT NULL,
	`points` integer NOT NULL,
	`source_order_id` text,
	`source_voucher_id` text,
	`note` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `customer_members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `customer_point_events_member_idx` ON `customer_point_events` (`member_id`);--> statement-breakpoint
CREATE TABLE `customer_promos` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`badge` text,
	`starts_at` text,
	`ends_at` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customer_rewards` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`points_cost` integer NOT NULL,
	`description` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customer_vouchers` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`reward_id` text,
	`code` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`issued_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_order_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `customer_members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reward_id`) REFERENCES `customer_rewards`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`used_order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_vouchers_code_unq` ON `customer_vouchers` (`code`);--> statement-breakpoint
CREATE INDEX `customer_vouchers_member_idx` ON `customer_vouchers` (`member_id`);