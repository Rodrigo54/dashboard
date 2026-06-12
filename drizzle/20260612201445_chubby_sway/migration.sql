PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_transactions` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`to_account_id` text,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`amount` text NOT NULL,
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
INSERT INTO `__new_transactions`(`id`, `user_id`, `account_id`, `to_account_id`, `type`, `category`, `amount`, `description`, `date`, `project_id`, `budget_id`, `goal_id`, `recurring_id`, `tags`, `created_at`, `updated_at`) SELECT `id`, `user_id`, `account_id`, `to_account_id`, `type`, `category`, `amount`, `description`, `date`, `project_id`, `budget_id`, `goal_id`, `recurring_id`, `tags`, `created_at`, `updated_at` FROM `transactions`;--> statement-breakpoint
DROP TABLE `transactions`;--> statement-breakpoint
ALTER TABLE `__new_transactions` RENAME TO `transactions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_budgets` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`project_id` text,
	`goal_id` text,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`amount` text NOT NULL,
	`spent` text DEFAULT '0' NOT NULL,
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
INSERT INTO `__new_budgets`(`id`, `user_id`, `project_id`, `goal_id`, `name`, `category`, `amount`, `spent`, `period`, `start_date`, `end_date`, `created_at`, `updated_at`) SELECT `id`, `user_id`, `project_id`, `goal_id`, `name`, `category`, `amount`, `spent`, `period`, `start_date`, `end_date`, `created_at`, `updated_at` FROM `budgets`;--> statement-breakpoint
DROP TABLE `budgets`;--> statement-breakpoint
ALTER TABLE `__new_budgets` RENAME TO `budgets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_goals` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`project_id` text,
	`name` text NOT NULL,
	`description` text,
	`target_amount` text NOT NULL,
	`current_amount` text DEFAULT '0' NOT NULL,
	`target_date` integer,
	`is_completed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_goals_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_goals_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
INSERT INTO `__new_goals`(`id`, `user_id`, `project_id`, `name`, `description`, `target_amount`, `current_amount`, `target_date`, `is_completed`, `created_at`, `updated_at`) SELECT `id`, `user_id`, `project_id`, `name`, `description`, `target_amount`, `current_amount`, `target_date`, `is_completed`, `created_at`, `updated_at` FROM `goals`;--> statement-breakpoint
DROP TABLE `goals`;--> statement-breakpoint
ALTER TABLE `__new_goals` RENAME TO `goals`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tasks` (
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
	`estimated_hours` text,
	`actual_hours` text,
	`tags` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_tasks_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_tasks_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_tasks_recurring_id_recurring_id_fk` FOREIGN KEY (`recurring_id`) REFERENCES `recurring`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
INSERT INTO `__new_tasks`(`id`, `user_id`, `project_id`, `recurring_id`, `title`, `description`, `status`, `priority`, `due_date`, `completed_at`, `estimated_hours`, `actual_hours`, `tags`, `sort_order`, `created_at`, `updated_at`) SELECT `id`, `user_id`, `project_id`, `recurring_id`, `title`, `description`, `status`, `priority`, `due_date`, `completed_at`, `estimated_hours`, `actual_hours`, `tags`, `sort_order`, `created_at`, `updated_at` FROM `tasks`;--> statement-breakpoint
DROP TABLE `tasks`;--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;