import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
} from "drizzle-orm/mysql-core";

// ─── TENANTS (SaaS-ready, single default tenant for now) ──────────────────────
export const tenants = mysqlTable("tenants", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  plan: mysqlEnum("plan", ["free", "pro", "enterprise"]).default("free").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── USERS ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull().default("default"),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["member", "admin"]).default("member").notNull(),
  timezone: varchar("timezone", { length: 64 }).default("UTC").notNull(),
  isBlocked: boolean("isBlocked").default(false).notNull(),
  xp: int("xp").default(0).notNull(),
  streakFreezeCount: int("streakFreezeCount").default(1).notNull(),
  streakFreezeUsedThisMonth: boolean("streakFreezeUsedThisMonth").default(false).notNull(),
  currentStageId: varchar("currentStageId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── STAGES ───────────────────────────────────────────────────────────────────
export const stages = mysqlTable("stages", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull().default("default"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  orderIndex: int("orderIndex").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Stage = typeof stages.$inferSelect;
export type InsertStage = typeof stages.$inferInsert;

// ─── TOPICS ───────────────────────────────────────────────────────────────────
export const topics = mysqlTable("topics", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull().default("default"),
  stageId: varchar("stageId", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  contextParagraph: text("contextParagraph"),
  orderIndex: int("orderIndex").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Topic = typeof topics.$inferSelect;
export type InsertTopic = typeof topics.$inferInsert;

// ─── RESOURCES ────────────────────────────────────────────────────────────────
export const resources = mysqlTable("resources", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull().default("default"),
  topicId: varchar("topicId", { length: 64 }).notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  url: text("url").notNull(),
  type: mysqlEnum("type", ["article", "video", "book", "course", "paper", "docs"]).notNull(),
  isRequired: boolean("isRequired").default(true).notNull(),
  isFree: boolean("isFree").default(true).notNull(),
  description: text("description"),
  estimatedMinutes: int("estimatedMinutes"),
  orderIndex: int("orderIndex").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Resource = typeof resources.$inferSelect;
export type InsertResource = typeof resources.$inferInsert;

// ─── RESOURCE COMPLETIONS ─────────────────────────────────────────────────────
export const resourceCompletions = mysqlTable("resourceCompletions", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull().default("default"),
  userId: int("userId").notNull(),
  resourceId: varchar("resourceId", { length: 64 }).notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

export type ResourceCompletion = typeof resourceCompletions.$inferSelect;

// ─── WEEKLY TASKS ─────────────────────────────────────────────────────────────
export const weeklyTasks = mysqlTable("weeklyTasks", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull().default("default"),
  topicId: varchar("topicId", { length: 64 }).notNull(),
  weekNumber: int("weekNumber").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  assignedDate: timestamp("assignedDate").notNull(),
  dueDate: timestamp("dueDate").notNull(),
  requiredMilestones: json("requiredMilestones").$type<MilestoneType[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WeeklyTask = typeof weeklyTasks.$inferSelect;
export type InsertWeeklyTask = typeof weeklyTasks.$inferInsert;

// ─── SUBMISSIONS ──────────────────────────────────────────────────────────────
export const submissions = mysqlTable("submissions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull().default("default"),
  userId: int("userId").notNull(),
  weeklyTaskId: varchar("weeklyTaskId", { length: 64 }).notNull(),
  milestoneType: mysqlEnum("milestoneType", [
    "reading", "video", "notes", "coding", "mini_project", "quiz", "discussion",
  ]).notNull(),
  status: mysqlEnum("status", [
    "pending", "submitted", "in_review", "approved", "rejected", "overdue", "excused",
  ]).notNull().default("submitted"),
  submittedAt: timestamp("submittedAt"),
  githubUrl: text("githubUrl"),
  notesContent: text("notesContent"),
  quizScore: float("quizScore"),
  xpAwarded: int("xpAwarded").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = typeof submissions.$inferInsert;

// ─── REVIEWS ──────────────────────────────────────────────────────────────────
export const reviews = mysqlTable("reviews", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull().default("default"),
  submissionId: varchar("submissionId", { length: 64 }).notNull(),
  reviewerId: int("reviewerId").notNull(),
  feedback: text("feedback"),
  decision: mysqlEnum("decision", ["approve", "changes_requested", "reject"]),
  codeQuality: int("codeQuality"),       // 1-5 rubric score
  problemUnderstanding: int("problemUnderstanding"), // 1-5
  documentation: int("documentation"),   // 1-5
  isFlagged: boolean("isFlagged").default(false).notNull(),
  flagReason: text("flagReason"),
  reviewerRating: int("reviewerRating"), // 1-5 stars from submitter
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

// ─── STREAKS ──────────────────────────────────────────────────────────────────
export const streaks = mysqlTable("streaks", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull().default("default"),
  userId: int("userId").notNull().unique(),
  currentStreakWeeks: int("currentStreakWeeks").default(0).notNull(),
  longestStreakWeeks: int("longestStreakWeeks").default(0).notNull(),
  lastCompleteWeek: varchar("lastCompleteWeek", { length: 10 }), // ISO week: "2025-W28"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Streak = typeof streaks.$inferSelect;

// ─── ACHIEVEMENTS ─────────────────────────────────────────────────────────────
export const achievements = mysqlTable("achievements", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull().default("default"),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", [
    "first_submission",
    "streak_4",
    "streak_12",
    "stage_complete",
    "capstone_complete",
    "first_review_given",
    "perfect_week",
  ]).notNull(),
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Achievement = typeof achievements.$inferSelect;

// ─── EXCUSES ──────────────────────────────────────────────────────────────────
export const excuses = mysqlTable("excuses", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull().default("default"),
  submissionId: varchar("submissionId", { length: 64 }).notNull(),
  grantedByAdminId: int("grantedByAdminId").notNull(),
  reason: text("reason").notNull(),
  grantedAt: timestamp("grantedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Excuse = typeof excuses.$inferSelect;

// ─── WEEKLY XP SNAPSHOTS (for leaderboard) ────────────────────────────────────
export const weeklyXp = mysqlTable("weeklyXp", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull().default("default"),
  userId: int("userId").notNull(),
  weekKey: varchar("weekKey", { length: 10 }).notNull(), // "2025-W28"
  xp: int("xp").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WeeklyXp = typeof weeklyXp.$inferSelect;

// ─── WEEKLY CHECK-INS ─────────────────────────────────────────────────────────
export const weeklyCheckIns = mysqlTable("weeklyCheckIns", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull().default("default"),
  userId: int("userId").notNull(),
  weekKey: varchar("weekKey", { length: 10 }).notNull(),
  mondayGoal: text("mondayGoal"),
  fridayReflection: text("fridayReflection"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WeeklyCheckIn = typeof weeklyCheckIns.$inferSelect;

// ─── SHARED TYPES ─────────────────────────────────────────────────────────────
export type MilestoneType = "reading" | "video" | "notes" | "coding" | "mini_project" | "quiz" | "discussion";
export type SubmissionStatus = "pending" | "submitted" | "in_review" | "approved" | "rejected" | "overdue" | "excused";
export type ResourceType = "article" | "video" | "book" | "course" | "paper" | "docs";
export type AchievementType = "first_submission" | "streak_4" | "streak_12" | "stage_complete" | "capstone_complete" | "first_review_given" | "perfect_week";

// XP values per action
export const XP_VALUES = {
  self_approve: 10,
  coding_approved: 25,
  mini_project_approved: 25,
  review_given: 15,
  stage_complete: 50,
  perfect_week: 30,
} as const;
