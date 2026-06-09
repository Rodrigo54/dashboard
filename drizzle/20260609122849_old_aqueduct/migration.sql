CREATE TABLE `users` (
	`id` text PRIMARY KEY,
	`email` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`avatar` text,
	`role` text DEFAULT 'user' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`account_provider` text,
	`balance` text DEFAULT '0' NOT NULL,
	`currency` text DEFAULT 'BRL' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`to_account_id` text,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`amount` real NOT NULL,
	`description` text NOT NULL,
	`date` integer NOT NULL,
	`project_id` text,
	`budget_id` text,
	`goal_id` text,
	`recurring_id` text,
	`tags` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_transactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_transactions_account_id_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_transactions_to_account_id_accounts_id_fk` FOREIGN KEY (`to_account_id`) REFERENCES `accounts`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_transactions_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_transactions_budget_id_budgets_id_fk` FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_transactions_goal_id_goals_id_fk` FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_transactions_recurring_id_recurring_id_fk` FOREIGN KEY (`recurring_id`) REFERENCES `recurring`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`project_id` text,
	`goal_id` text,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`amount` real NOT NULL,
	`spent` real DEFAULT 0 NOT NULL,
	`period` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_budgets_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_budgets_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_budgets_goal_id_goals_id_fk` FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`project_id` text,
	`name` text NOT NULL,
	`description` text,
	`target_amount` real NOT NULL,
	`current_amount` real DEFAULT 0 NOT NULL,
	`target_date` integer,
	`is_completed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_goals_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_goals_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'planning' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`start_date` integer,
	`end_date` integer,
	`completed_at` integer,
	`progress` integer DEFAULT 0 NOT NULL,
	`color` text,
	`tags` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_projects_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`project_id` text,
	`recurring_id` text,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`due_date` integer,
	`completed_at` integer,
	`estimated_hours` real,
	`actual_hours` real,
	`tags` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_tasks_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_tasks_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_tasks_recurring_id_recurring_id_fk` FOREIGN KEY (`recurring_id`) REFERENCES `recurring`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `task_comments` (
	`id` text PRIMARY KEY,
	`task_id` text NOT NULL,
	`user_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_task_comments_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_task_comments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`color` text,
	`icon` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_tags_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `recurring` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`template` text NOT NULL,
	`recurring_pattern` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer,
	`next_date` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`execution_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_recurring_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_notes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
