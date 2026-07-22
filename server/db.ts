import { and, asc, desc, eq, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import type { InsertUser } from "../drizzle/schema";
import {
  achievements, excuses, resourceCompletions, resources,
  stages, streaks, submissions, topics, users, weeklyCheckIns,
  weeklyTasks, weeklyXp, reviews, tenants,
  type InsertStage, type InsertTopic, type InsertResource,
  type InsertWeeklyTask, type InsertSubmission, type InsertReview,
  type MilestoneType, type AchievementType, XP_VALUES,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { nanoid } from "nanoid";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (ENV.ownerEmail && user.email === ENV.ownerEmail) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(asc(users.createdAt));
}

export async function getBlockedUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.isBlocked, true));
}

export async function updateUserBlockStatus(userId: number, isBlocked: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ isBlocked }).where(eq(users.id, userId));
}

export async function updateUserXp(userId: number, xpDelta: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ xp: sql`${users.xp} + ${xpDelta}` }).where(eq(users.id, userId));
}

export async function updateUserRole(userId: number, role: "member" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function resetMonthlyStreakFreeze() {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ streakFreezeCount: 1, streakFreezeUsedThisMonth: false });
}

export async function useStreakFreeze(userId: number) {
  const db = await getDb();
  if (!db) return false;
  const user = await getUserById(userId);
  if (!user || user.streakFreezeCount <= 0 || user.streakFreezeUsedThisMonth) return false;
  await db.update(users).set({ streakFreezeCount: 0, streakFreezeUsedThisMonth: true }).where(eq(users.id, userId));
  return true;
}

// ─── STAGES ───────────────────────────────────────────────────────────────────

export async function getStages() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stages).orderBy(asc(stages.orderIndex));
}

export async function getStageById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(stages).where(eq(stages.id, id)).limit(1);
  return result[0];
}

export async function createStage(data: Omit<InsertStage, "id">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = nanoid();
  await db.insert(stages).values({ ...data, id });
  return { ...data, id } as InsertStage & { id: string };
}

export async function updateStage(id: string, data: Partial<InsertStage>) {
  const db = await getDb();
  if (!db) return;
  await db.update(stages).set(data).where(eq(stages.id, id));
}

export async function deleteStage(id: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(stages).where(eq(stages.id, id));
}

// ─── TOPICS ───────────────────────────────────────────────────────────────────

export async function getTopicsByStageId(stageId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(topics).where(eq(topics.stageId, stageId)).orderBy(asc(topics.orderIndex));
}

export async function getAllTopics() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(topics).orderBy(asc(topics.orderIndex));
}

export async function getTopicById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(topics).where(eq(topics.id, id)).limit(1);
  return result[0];
}

export async function createTopic(data: Omit<InsertTopic, "id">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = nanoid();
  await db.insert(topics).values({ ...data, id });
  return { ...data, id } as InsertTopic & { id: string };
}

export async function updateTopic(id: string, data: Partial<InsertTopic>) {
  const db = await getDb();
  if (!db) return;
  await db.update(topics).set(data).where(eq(topics.id, id));
}

export async function deleteTopic(id: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(topics).where(eq(topics.id, id));
}

// ─── RESOURCES ────────────────────────────────────────────────────────────────

export async function getResourcesByTopicId(topicId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(resources).where(eq(resources.topicId, topicId)).orderBy(asc(resources.orderIndex));
}

export async function createResource(data: Omit<InsertResource, "id">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = nanoid();
  await db.insert(resources).values({ ...data, id });
  return { ...data, id } as InsertResource & { id: string };
}

export async function updateResource(id: string, data: Partial<InsertResource>) {
  const db = await getDb();
  if (!db) return;
  await db.update(resources).set(data).where(eq(resources.id, id));
}

export async function deleteResource(id: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(resources).where(eq(resources.id, id));
}

export async function getResourceCompletionsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(resourceCompletions).where(eq(resourceCompletions.userId, userId));
}

export async function toggleResourceCompletion(userId: number, resourceId: string) {
  const db = await getDb();
  if (!db) return false;
  const existing = await db.select().from(resourceCompletions)
    .where(and(eq(resourceCompletions.userId, userId), eq(resourceCompletions.resourceId, resourceId)))
    .limit(1);
  if (existing.length > 0) {
    await db.delete(resourceCompletions)
      .where(and(eq(resourceCompletions.userId, userId), eq(resourceCompletions.resourceId, resourceId)));
    return false;
  } else {
    await db.insert(resourceCompletions).values({ userId, resourceId });
    return true;
  }
}

// ─── WEEKLY TASKS ─────────────────────────────────────────────────────────────

export async function getWeeklyTasksByTopicId(topicId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(weeklyTasks).where(eq(weeklyTasks.topicId, topicId)).orderBy(asc(weeklyTasks.weekNumber));
}

export async function getAllWeeklyTasks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(weeklyTasks).orderBy(asc(weeklyTasks.weekNumber));
}

export async function getWeeklyTaskById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(weeklyTasks).where(eq(weeklyTasks.id, id)).limit(1);
  return result[0];
}

export async function createWeeklyTask(data: Omit<InsertWeeklyTask, "id">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = nanoid();
  await db.insert(weeklyTasks).values({ ...data, id });
  return { ...data, id } as InsertWeeklyTask & { id: string };
}

export async function updateWeeklyTask(id: string, data: Partial<InsertWeeklyTask>) {
  const db = await getDb();
  if (!db) return;
  await db.update(weeklyTasks).set(data).where(eq(weeklyTasks.id, id));
}

export async function deleteWeeklyTask(id: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(weeklyTasks).where(eq(weeklyTasks.id, id));
}

// ─── SUBMISSIONS ──────────────────────────────────────────────────────────────

export async function getSubmissionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(submissions).where(eq(submissions.userId, userId)).orderBy(desc(submissions.createdAt));
}

export async function getSubmissionById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
  return result[0];
}

export async function getSubmissionByUserAndTask(userId: number, weeklyTaskId: string, milestoneType: MilestoneType) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(submissions)
    .where(and(eq(submissions.userId, userId), eq(submissions.weeklyTaskId, weeklyTaskId), eq(submissions.milestoneType, milestoneType)))
    .limit(1);
  return result[0];
}

export async function createSubmission(data: Omit<InsertSubmission, "id">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = nanoid();
  await db.insert(submissions).values({ ...data, id });
  return { ...data, id } as InsertSubmission & { id: string };
}

export async function updateSubmissionStatus(id: string, status: InsertSubmission["status"]) {
  const db = await getDb();
  if (!db) return;
  await db.update(submissions).set({ status }).where(eq(submissions.id, id));
}

export async function getOverdueSubmissions() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  // Join with weeklyTasks to find submissions past due date
  const overdueTaskIds = await db.select({ id: weeklyTasks.id })
    .from(weeklyTasks).where(lt(weeklyTasks.dueDate, now));
  if (overdueTaskIds.length === 0) return [];
  return db.select().from(submissions)
    .where(and(
      inArray(submissions.weeklyTaskId, overdueTaskIds.map(t => t.id)),
      inArray(submissions.status, ["submitted", "pending", "in_review"])
    ));
}

export async function hasOverdueSubmissions(userId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(submissions)
    .where(and(eq(submissions.userId, userId), eq(submissions.status, "overdue")))
    .limit(1);
  return result.length > 0;
}

export async function getAllSubmissions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(submissions).orderBy(desc(submissions.createdAt));
}

// ─── REVIEWS ──────────────────────────────────────────────────────────────────

export async function getReviewsByReviewerId(reviewerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews).where(eq(reviews.reviewerId, reviewerId)).orderBy(desc(reviews.createdAt));
}

export async function getReviewBySubmissionId(submissionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(reviews).where(eq(reviews.submissionId, submissionId)).limit(1);
  return result[0];
}

export async function createReview(data: Omit<InsertReview, "id">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = nanoid();
  await db.insert(reviews).values({ ...data, id });
  return { ...data, id } as InsertReview & { id: string };
}

export async function completeReview(
  id: string,
  feedback: string,
  decision: "approve" | "changes_requested" | "reject",
  rubric: { codeQuality?: number; problemUnderstanding?: number; documentation?: number }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(reviews).set({ feedback, decision, reviewedAt: new Date(), ...rubric }).where(eq(reviews.id, id));
}

export async function flagReview(id: string, reason: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(reviews).set({ isFlagged: true, flagReason: reason }).where(eq(reviews.id, id));
}

export async function rateReview(id: string, rating: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(reviews).set({ reviewerRating: rating }).where(eq(reviews.id, id));
}

export async function findReviewerForSubmission(submitterId: number, topicId: string): Promise<{ id: number } | null> {
  const db = await getDb();
  if (!db) return null;
  const allUsers = await db.select({ id: users.id }).from(users)
    .where(and(ne(users.id, submitterId), eq(users.isBlocked, false)));
  if (allUsers.length === 0) return null;

  // Prefer users who completed the topic (have approved submissions for tasks in this topic)
  const topicTaskIds = (await getWeeklyTasksByTopicId(topicId)).map(t => t.id);
  if (topicTaskIds.length > 0) {
    const completers = await db.select({ userId: submissions.userId }).from(submissions)
      .where(and(
        inArray(submissions.weeklyTaskId, topicTaskIds),
        eq(submissions.status, "approved"),
        ne(submissions.userId, submitterId)
      ));
    const completerIds = Array.from(new Set(completers.map(c => c.userId)));
    const eligibleCompleters = allUsers.filter(u => completerIds.includes(u.id));
    if (eligibleCompleters.length > 0) {
      return eligibleCompleters[Math.floor(Math.random() * eligibleCompleters.length)];
    }
  }

  // Fallback: least-loaded active member
  const eligible = allUsers.filter(u => u.id !== submitterId);
  return eligible.length > 0 ? eligible[Math.floor(Math.random() * eligible.length)] : null;
}

export async function hasCompletedReview(userId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(reviews)
    .where(and(eq(reviews.reviewerId, userId), ne(reviews.decision, null as any)))
    .limit(1);
  return result.length > 0;
}

// ─── STREAKS ──────────────────────────────────────────────────────────────────

export async function getStreakByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(streaks).where(eq(streaks.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function upsertStreak(userId: number, currentStreakWeeks: number, longestStreakWeeks: number, lastCompleteWeek: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(streaks).values({ userId, currentStreakWeeks, longestStreakWeeks, lastCompleteWeek })
    .onDuplicateKeyUpdate({ set: { currentStreakWeeks, longestStreakWeeks, lastCompleteWeek } });
}

// ─── ACHIEVEMENTS ─────────────────────────────────────────────────────────────

export async function getAchievementsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(achievements).where(eq(achievements.userId, userId)).orderBy(asc(achievements.earnedAt));
}

export async function createAchievement(userId: number, type: AchievementType) {
  const db = await getDb();
  if (!db) return;
  // Prevent duplicates
  const existing = await db.select().from(achievements)
    .where(and(eq(achievements.userId, userId), eq(achievements.type, type))).limit(1);
  if (existing.length > 0) return;
  await db.insert(achievements).values({ userId, type });
}

// ─── EXCUSES ──────────────────────────────────────────────────────────────────

export async function createExcuse(submissionId: string, grantedByAdminId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(excuses).values({ submissionId, grantedByAdminId, reason });
}

// ─── WEEKLY XP ────────────────────────────────────────────────────────────────

export function getCurrentWeekKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export async function addWeeklyXp(userId: number, xp: number) {
  const db = await getDb();
  if (!db) return;
  const weekKey = getCurrentWeekKey();
  await db.insert(weeklyXp).values({ userId, weekKey, xp })
    .onDuplicateKeyUpdate({ set: { xp: sql`${weeklyXp.xp} + ${xp}` } });
}

export async function getLeaderboard(weekKey?: string) {
  const db = await getDb();
  if (!db) return [];
  const wk = weekKey ?? getCurrentWeekKey();
  const rows = await db.select({
    userId: weeklyXp.userId,
    xp: weeklyXp.xp,
    name: users.name,
    currentStageId: users.currentStageId,
  }).from(weeklyXp)
    .innerJoin(users, eq(weeklyXp.userId, users.id))
    .where(eq(weeklyXp.weekKey, wk))
    .orderBy(desc(weeklyXp.xp));
  return rows;
}

// ─── WEEKLY CHECK-INS ─────────────────────────────────────────────────────────

export async function getCheckIn(userId: number, weekKey: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(weeklyCheckIns)
    .where(and(eq(weeklyCheckIns.userId, userId), eq(weeklyCheckIns.weekKey, weekKey))).limit(1);
  return result[0] ?? null;
}

export async function upsertCheckIn(userId: number, weekKey: string, data: { mondayGoal?: string; fridayReflection?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(weeklyCheckIns).values({ userId, weekKey, ...data })
    .onDuplicateKeyUpdate({ set: data });
}
