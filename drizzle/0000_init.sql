CREATE TABLE `alert_acks` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`alert_key` text NOT NULL,
	`note` text,
	`ack_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `alert_acks_company_key` ON `alert_acks` (`company_id`,`alert_key`);--> statement-breakpoint
CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`requested_amount` integer NOT NULL,
	`term_months` integer NOT NULL,
	`purpose` text NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`score` integer NOT NULL,
	`grade` text NOT NULL,
	`suggested_limit` integer NOT NULL,
	`recommendation` text NOT NULL,
	`snapshot` text,
	`approved_limit` integer,
	`decision_note` text,
	`decided_by` text,
	`decided_at` integer,
	`auto_decided` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`actor_name` text NOT NULL,
	`company_id` text,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`biz_no` text NOT NULL,
	`industry` text NOT NULL,
	`model` text NOT NULL,
	`description` text NOT NULL,
	`founded_year` integer NOT NULL,
	`employees` integer NOT NULL,
	`ceo_name` text NOT NULL,
	`status` text DEFAULT 'onboarding' NOT NULL,
	`monthly_budget` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `connections` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`provider` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'disconnected' NOT NULL,
	`consent_at` integer,
	`last_sync_at` integer,
	`account` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `connections_company_provider` ON `connections` (`company_id`,`provider`);--> statement-breakpoint
CREATE TABLE `credit_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`application_id` text,
	`limit_amount` integer NOT NULL,
	`grade` text NOT NULL,
	`score` integer NOT NULL,
	`fee_rate` real NOT NULL,
	`term_months` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`approved_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`partner` text DEFAULT '제휴 캐피탈' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gov_programs` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`agency` text NOT NULL,
	`kind` text NOT NULL,
	`start_month` text NOT NULL,
	`end_month` text NOT NULL,
	`amount` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gpu_workloads` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`month` text NOT NULL,
	`provider` text NOT NULL,
	`name` text NOT NULL,
	`gpu_type` text NOT NULL,
	`gpu_count` integer NOT NULL,
	`gpu_hours` real NOT NULL,
	`cost` integer NOT NULL,
	`funding` text NOT NULL,
	`source` text NOT NULL,
	`active_days` integer NOT NULL,
	`avg_utilization` real NOT NULL,
	`has_endpoint` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `gpu_workloads_company_month` ON `gpu_workloads` (`company_id`,`month`);--> statement-breakpoint
CREATE TABLE `investments` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`round` text NOT NULL,
	`amount` integer NOT NULL,
	`month` text NOT NULL,
	`investor` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `llm_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`month` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`tokens_m` real NOT NULL,
	`cost` integer NOT NULL,
	`funding` text NOT NULL,
	`source` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `llm_usage_company_month` ON `llm_usage` (`company_id`,`month`);--> statement-breakpoint
CREATE TABLE `payment_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`credit_line_id` text,
	`provider` text NOT NULL,
	`category` text NOT NULL,
	`invoice_no` text NOT NULL,
	`billing_month` text NOT NULL,
	`amount` integer NOT NULL,
	`due_date` text NOT NULL,
	`memo` text,
	`status` text DEFAULT 'requested' NOT NULL,
	`requested_by` text NOT NULL,
	`approved_by` text,
	`approved_at` integer,
	`paid_by` text,
	`paid_at` integer,
	`fee_amount` integer,
	`revenue_share` real,
	`reject_reason` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `repayments` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`credit_line_id` text NOT NULL,
	`payment_request_id` text NOT NULL,
	`seq` integer NOT NULL,
	`due_month` text NOT NULL,
	`expected_amount` integer NOT NULL,
	`paid_amount` integer DEFAULT 0 NOT NULL,
	`revenue_share` real NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`paid_at` integer
);
--> statement-breakpoint
CREATE TABLE `revenue` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`month` text NOT NULL,
	`revenue` integer NOT NULL,
	`gross_margin_pct` real NOT NULL,
	`customers` integer NOT NULL,
	`retention_pct` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `revenue_company_month` ON `revenue` (`company_id`,`month`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`company_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);