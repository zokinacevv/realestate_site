CREATE TABLE `listing_favorites` (
	`user_id` text NOT NULL,
	`listing_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `listing_id`),
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `listing_favorites_user_idx` ON `listing_favorites` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `listing_moderation_events` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`previous_status` text,
	`next_status` text NOT NULL,
	`note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `moderation_events_listing_idx` ON `listing_moderation_events` (`listing_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `listing_view_events` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`visitor_key_hash` text NOT NULL,
	`viewed_on` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `listing_views_daily_unique` ON `listing_view_events` (`listing_id`,`visitor_key_hash`,`viewed_on`);--> statement-breakpoint
CREATE INDEX `listing_views_listing_day_idx` ON `listing_view_events` (`listing_id`,`viewed_on`);--> statement-breakpoint
CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`contact_user_id` text NOT NULL,
	`organization_id` text,
	`publisher_type` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`intent` text NOT NULL,
	`property_type` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`price_amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`price_period` text DEFAULT 'total' NOT NULL,
	`city` text NOT NULL,
	`municipality` text,
	`neighborhood` text,
	`address_line` text NOT NULL,
	`location_precision` text DEFAULT 'approximate' NOT NULL,
	`exact_location_public` integer DEFAULT false NOT NULL,
	`latitude_e6` integer,
	`longitude_e6` integer,
	`area_m2` integer NOT NULL,
	`rooms` integer,
	`floor_number` integer,
	`floor_total` integer,
	`elevator` integer,
	`parking` text,
	`heating` text,
	`cooling` text,
	`construction_state` text DEFAULT 'built' NOT NULL,
	`built_year` integer,
	`completion_date` text,
	`features_json` text DEFAULT '[]' NOT NULL,
	`submitted_at` text,
	`published_at` text,
	`moderated_by_user_id` text,
	`moderated_at` text,
	`moderation_note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contact_user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`moderated_by_user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `listings_public_search_idx` ON `listings` (`status`,`city`,`intent`,`published_at`);--> statement-breakpoint
CREATE INDEX `listings_location_type_idx` ON `listings` (`status`,`municipality`,`neighborhood`,`property_type`);--> statement-breakpoint
CREATE INDEX `listings_owner_status_idx` ON `listings` (`owner_user_id`,`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `listings_organization_status_idx` ON `listings` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `offers` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`sender_user_id` text NOT NULL,
	`recipient_user_id` text NOT NULL,
	`kind` text NOT NULL,
	`amount_cents` integer,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'sent' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sender_user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `offers_recipient_status_idx` ON `offers` (`recipient_user_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `offers_sender_idx` ON `offers` (`sender_user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `organization_members` (
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`organization_id`, `user_id`),
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `organization_members_user_idx` ON `organization_members` (`user_id`,`organization_id`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`display_name` text NOT NULL,
	`legal_name` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `organizations_kind_status_idx` ON `organizations` (`kind`,`status`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`full_name` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_email_unique` ON `profiles` (`email`);--> statement-breakpoint
CREATE TABLE `user_roles` (
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `role`),
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
