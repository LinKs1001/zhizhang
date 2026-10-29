CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`scope` text NOT NULL,
	`category_id` text,
	`amount_cents` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `budgets_household_idx` ON `budgets` (`household_id`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`emoji` text DEFAULT '✨' NOT NULL,
	`color` text DEFAULT '#a5a39e' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_household_type_name_unique` ON `categories` (`household_id`,`type`,`name`);--> statement-breakpoint
CREATE TABLE `fx_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`currency` text NOT NULL,
	`rate_date` text NOT NULL,
	`cny_per_unit` real NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fx_rates_currency_date_unique` ON `fx_rates` (`currency`,`rate_date`);--> statement-breakpoint
CREATE TABLE `households` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invites` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invites_code_hash_unique` ON `invites` (`code_hash`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memberships_household_user_unique` ON `memberships` (`household_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `memberships_user_idx` ON `memberships` (`user_id`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`month` text NOT NULL,
	`content` text NOT NULL,
	`data_hash` text NOT NULL,
	`generated_at` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reports_household_month_unique` ON `reports` (`household_id`,`month`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`member_user_id` text NOT NULL,
	`category_id` text NOT NULL,
	`type` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'CNY' NOT NULL,
	`original_amount` real NOT NULL,
	`exchange_rate` real DEFAULT 1 NOT NULL,
	`rate_date` text NOT NULL,
	`occurred_on` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`payment_method` text DEFAULT 'other' NOT NULL,
	`scope` text DEFAULT 'joint' NOT NULL,
	`visibility` text DEFAULT 'shared' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `transactions_household_date_idx` ON `transactions` (`household_id`,`occurred_on`);--> statement-breakpoint
CREATE INDEX `transactions_household_visibility_idx` ON `transactions` (`household_id`,`visibility`);--> statement-breakpoint
CREATE INDEX `transactions_category_idx` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);