CREATE TABLE `check_ins` (
	`id` text PRIMARY KEY NOT NULL,
	`user_email` text NOT NULL,
	`stage` text NOT NULL,
	`goal` text NOT NULL,
	`observation` text NOT NULL,
	`reflection` text,
	`completed` integer,
	`hypothesis` text NOT NULL,
	`confidence` integer NOT NULL,
	`experiment_title` text NOT NULL,
	`experiment_instruction` text NOT NULL,
	`experiment_duration` text NOT NULL,
	`insight` text,
	`learned` text,
	`provider` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`email` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`life_season` text NOT NULL,
	`focus_areas` text NOT NULL,
	`life_snapshot` text NOT NULL,
	`desired_shift` text NOT NULL,
	`check_in_rhythm` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
