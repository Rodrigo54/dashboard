ALTER TABLE `transactions` ADD `import_fingerprint` text;--> statement-breakpoint
ALTER TABLE `recurring` ADD `source` text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `recurring` ADD `auto_materialize` integer DEFAULT true NOT NULL;