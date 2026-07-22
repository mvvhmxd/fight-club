CREATE TABLE `achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` varchar(64) NOT NULL DEFAULT 'default',
	`userId` int NOT NULL,
	`type` enum('first_submission','streak_4','streak_12','stage_complete','capstone_complete','first_review_given','perfect_week') NOT NULL,
	`earnedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `achievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `excuses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` varchar(64) NOT NULL DEFAULT 'default',
	`submissionId` varchar(64) NOT NULL,
	`grantedByAdminId` int NOT NULL,
	`reason` text NOT NULL,
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `excuses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resourceCompletions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` varchar(64) NOT NULL DEFAULT 'default',
	`userId` int NOT NULL,
	`resourceId` varchar(64) NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resourceCompletions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL DEFAULT 'default',
	`topicId` varchar(64) NOT NULL,
	`title` varchar(512) NOT NULL,
	`url` text NOT NULL,
	`type` enum('article','video','book','course','paper','docs') NOT NULL,
	`isRequired` boolean NOT NULL DEFAULT true,
	`isFree` boolean NOT NULL DEFAULT true,
	`description` text,
	`estimatedMinutes` int,
	`orderIndex` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL DEFAULT 'default',
	`submissionId` varchar(64) NOT NULL,
	`reviewerId` int NOT NULL,
	`feedback` text,
	`decision` enum('approve','changes_requested','reject'),
	`codeQuality` int,
	`problemUnderstanding` int,
	`documentation` int,
	`isFlagged` boolean NOT NULL DEFAULT false,
	`flagReason` text,
	`reviewerRating` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stages` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL DEFAULT 'default',
	`name` varchar(255) NOT NULL,
	`description` text,
	`orderIndex` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `streaks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` varchar(64) NOT NULL DEFAULT 'default',
	`userId` int NOT NULL,
	`currentStreakWeeks` int NOT NULL DEFAULT 0,
	`longestStreakWeeks` int NOT NULL DEFAULT 0,
	`lastCompleteWeek` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `streaks_id` PRIMARY KEY(`id`),
	CONSTRAINT `streaks_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL DEFAULT 'default',
	`userId` int NOT NULL,
	`weeklyTaskId` varchar(64) NOT NULL,
	`milestoneType` enum('reading','video','notes','coding','mini_project','quiz','discussion') NOT NULL,
	`status` enum('pending','submitted','in_review','approved','rejected','overdue','excused') NOT NULL DEFAULT 'submitted',
	`submittedAt` timestamp,
	`githubUrl` text,
	`notesContent` text,
	`quizScore` float,
	`xpAwarded` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`plan` enum('free','pro','enterprise') NOT NULL DEFAULT 'free',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL DEFAULT 'default',
	`stageId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`contextParagraph` text,
	`orderIndex` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `topics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weeklyCheckIns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` varchar(64) NOT NULL DEFAULT 'default',
	`userId` int NOT NULL,
	`weekKey` varchar(10) NOT NULL,
	`mondayGoal` text,
	`fridayReflection` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weeklyCheckIns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weeklyTasks` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL DEFAULT 'default',
	`topicId` varchar(64) NOT NULL,
	`weekNumber` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`assignedDate` timestamp NOT NULL,
	`dueDate` timestamp NOT NULL,
	`requiredMilestones` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weeklyTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weeklyXp` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` varchar(64) NOT NULL DEFAULT 'default',
	`userId` int NOT NULL,
	`weekKey` varchar(10) NOT NULL,
	`xp` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weeklyXp_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('member','admin') NOT NULL DEFAULT 'member';--> statement-breakpoint
ALTER TABLE `users` ADD `tenantId` varchar(64) DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `timezone` varchar(64) DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `isBlocked` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `xp` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `streakFreezeCount` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `streakFreezeUsedThisMonth` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `currentStageId` varchar(64);