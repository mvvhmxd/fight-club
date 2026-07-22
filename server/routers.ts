import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getAllUsers, getUserById, getBlockedUsers, updateUserBlockStatus, updateUserRole,
  getStages, getStageById, createStage, updateStage, deleteStage,
  getAllTopics, getTopicsByStageId, getTopicById, createTopic, updateTopic, deleteTopic,
  getResourcesByTopicId, createResource, updateResource, deleteResource,
  getResourceCompletionsByUser, toggleResourceCompletion,
  getAllWeeklyTasks, getWeeklyTasksByTopicId, getWeeklyTaskById, createWeeklyTask, updateWeeklyTask, deleteWeeklyTask,
  getSubmissionsByUserId, getSubmissionById, getSubmissionByUserAndTask, createSubmission, updateSubmissionStatus,
  getOverdueSubmissions, hasOverdueSubmissions, getAllSubmissions,
  getReviewsByReviewerId, getReviewBySubmissionId, createReview, completeReview, flagReview, rateReview, findReviewerForSubmission, hasCompletedReview,
  getStreakByUserId, upsertStreak,
  getAchievementsByUserId, createAchievement,
  createExcuse,
  getLeaderboard, addWeeklyXp, getCurrentWeekKey,
  getCheckIn, upsertCheckIn,
  updateUserXp, useStreakFreeze,
} from "./db";
import { verifyGitHubRepository } from "./services/github";
import { notifyOwner } from "./_core/notification";
import {
  isTopicComplete, getUnlockedTopicIds, getWeekKey, nextStreak,
  missingAchievementTypes, getXpForMilestone,
} from "./services/accountability";
import { XP_VALUES } from "../drizzle/schema";
import type { MilestoneType } from "../drizzle/schema";

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  return next({ ctx });
});

// ─── HELPER: process achievements after any progress update ──────────────────

async function processAchievements(userId: number) {
  const [subs, revs, streak, earnedAchievements] = await Promise.all([
    getSubmissionsByUserId(userId),
    getReviewsByReviewerId(userId),
    getStreakByUserId(userId),
    getAchievementsByUserId(userId),
  ]);

  const approvedSubs = subs.filter(s => s.status === "approved");
  const completedReviews = revs.filter(r => r.decision !== null);
  const earnedTypes = earnedAchievements.map(a => a.type);

  const toAward = missingAchievementTypes(earnedTypes, {
    submissionCount: approvedSubs.length,
    currentStreakWeeks: streak?.currentStreakWeeks ?? 0,
    completedStageIds: [],
    reviewsGiven: completedReviews.length,
    perfectWeek: false,
    isCapstone: false,
  });

  for (const type of toAward) {
    await createAchievement(userId, type);
  }
  return toAward;
}

// ─── CURRICULUM ROUTER ────────────────────────────────────────────────────────

const curriculumRouter = router({
  getStages: protectedProcedure.query(async ({ ctx }) => {
    const [allStages, allTopics, allTasks, userSubs, completions] = await Promise.all([
      getStages(),
      getAllTopics(),
      getAllWeeklyTasks(),
      getSubmissionsByUserId(ctx.user.id),
      getResourceCompletionsByUser(ctx.user.id),
    ]);

    const orderedTopics = [...allTopics].sort((a, b) => {
      const stageA = allStages.find(s => s.id === a.stageId)?.orderIndex ?? 0;
      const stageB = allStages.find(s => s.id === b.stageId)?.orderIndex ?? 0;
      return stageA - stageB || a.orderIndex - b.orderIndex;
    });

    const unlockedIds = getUnlockedTopicIds(orderedTopics, allTasks, userSubs);

    return allStages.map(stage => ({
      ...stage,
      topics: allTopics
        .filter(t => t.stageId === stage.id)
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map(topic => ({
          ...topic,
          locked: !unlockedIds.has(topic.id),
          complete: isTopicComplete(topic.id, allTasks, userSubs),
        })),
    }));
  }),

  getTopic: protectedProcedure
    .input(z.object({ topicId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [topic, topicResources, allTopics, allTasks, userSubs, completions] = await Promise.all([
        getTopicById(input.topicId),
        getResourcesByTopicId(input.topicId),
        getAllTopics(),
        getAllWeeklyTasks(),
        getSubmissionsByUserId(ctx.user.id),
        getResourceCompletionsByUser(ctx.user.id),
      ]);
      if (!topic) throw new TRPCError({ code: "NOT_FOUND" });

      const allStages = await getStages();
      const orderedTopics = [...allTopics].sort((a, b) => {
        const stageA = allStages.find(s => s.id === a.stageId)?.orderIndex ?? 0;
        const stageB = allStages.find(s => s.id === b.stageId)?.orderIndex ?? 0;
        return stageA - stageB || a.orderIndex - b.orderIndex;
      });
      const unlockedIds = getUnlockedTopicIds(orderedTopics, allTasks, userSubs);

      if (!unlockedIds.has(input.topicId) && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Complete prerequisite topics first" });
      }

      const completedResourceIds = new Set(completions.map(c => c.resourceId));
      const tasks = await getWeeklyTasksByTopicId(input.topicId);

      return {
        ...topic,
        locked: false,
        resources: topicResources.map(r => ({
          ...r,
          completed: completedResourceIds.has(r.id),
        })),
        tasks: tasks.map(task => ({
          ...task,
          submissions: userSubs.filter(s => s.weeklyTaskId === task.id),
        })),
      };
    }),

  toggleResourceCompletion: protectedProcedure
    .input(z.object({ resourceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const completed = await toggleResourceCompletion(ctx.user.id, input.resourceId);
      return { completed };
    }),
});

// ─── SUBMISSIONS ROUTER ───────────────────────────────────────────────────────

const submissionsRouter = router({
  mySubmissions: protectedProcedure.query(({ ctx }) => getSubmissionsByUserId(ctx.user.id)),

  submit: protectedProcedure
    .input(z.object({
      weeklyTaskId: z.string(),
      milestoneType: z.enum(["reading", "video", "notes", "coding", "mini_project", "quiz", "discussion"]),
      githubUrl: z.string().optional(),
      notesContent: z.string().optional(),
      quizScore: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
      if (user.isBlocked) throw new TRPCError({ code: "FORBIDDEN", message: "You have overdue submissions. Resolve them before submitting new work." });

      const task = await getWeeklyTaskById(input.weeklyTaskId);
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });

      // Check topic is unlocked
      const [allTopics, allTasks, userSubs, allStages] = await Promise.all([
        getAllTopics(), getAllWeeklyTasks(), getSubmissionsByUserId(ctx.user.id), getStages(),
      ]);
      const orderedTopics = [...allTopics].sort((a, b) => {
        const stageA = allStages.find(s => s.id === a.stageId)?.orderIndex ?? 0;
        const stageB = allStages.find(s => s.id === b.stageId)?.orderIndex ?? 0;
        return stageA - stageB || a.orderIndex - b.orderIndex;
      });
      const unlockedIds = getUnlockedTopicIds(orderedTopics, allTasks, userSubs);
      if (!unlockedIds.has(task.topicId)) throw new TRPCError({ code: "FORBIDDEN", message: "Complete prerequisite topics first" });

      // Check duplicate
      const existing = await getSubmissionByUserAndTask(ctx.user.id, input.weeklyTaskId, input.milestoneType as MilestoneType);
      if (existing && ["approved", "in_review", "submitted"].includes(existing.status)) {
        throw new TRPCError({ code: "CONFLICT", message: "You already have an active submission for this milestone" });
      }

      const isSelfApprove = ["reading", "video", "notes", "quiz"].includes(input.milestoneType);
      const isCodeReview = ["coding", "mini_project"].includes(input.milestoneType);

      let status: "approved" | "in_review" = isSelfApprove ? "approved" : "in_review";
      let xpAwarded = 0;

      if (isCodeReview) {
        if (!input.githubUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "GitHub URL required for coding/project submissions" });
        const verification = await verifyGitHubRepository(input.githubUrl);
        if (!verification.valid) throw new TRPCError({ code: "BAD_REQUEST", message: verification.error });
      }

      const submission = await createSubmission({
        userId: ctx.user.id,
        weeklyTaskId: input.weeklyTaskId,
        milestoneType: input.milestoneType as MilestoneType,
        status,
        submittedAt: new Date(),
        githubUrl: input.githubUrl ?? null,
        notesContent: input.notesContent ?? null,
        quizScore: input.quizScore ?? null,
        xpAwarded,
      });

      if (isCodeReview) {
        const reviewer = await findReviewerForSubmission(ctx.user.id, task.topicId);
        if (reviewer) {
          await createReview({ submissionId: submission.id, reviewerId: reviewer.id });
          const submitter = await getUserById(ctx.user.id);
          notifyOwner({ title: "New peer review assigned", content: `${submitter?.name ?? "A member"} submitted ${input.milestoneType.replace("_", " ")} for review. Task: ${task.title}` }).catch(() => {});
        }
      }

      if (isSelfApprove) {
        xpAwarded = getXpForMilestone(input.milestoneType as MilestoneType);
        await updateUserXp(ctx.user.id, xpAwarded);
        await addWeeklyXp(ctx.user.id, xpAwarded);
        await processAchievements(ctx.user.id);
      }

      return { submission };
    }),
});

// ─── REVIEWS ROUTER ───────────────────────────────────────────────────────────

const reviewsRouter = router({
  myPendingReviews: protectedProcedure.query(async ({ ctx }) => {
    const myReviews = await getReviewsByReviewerId(ctx.user.id);
    const pending = myReviews.filter(r => r.decision === null);
    const withSubmissions = await Promise.all(pending.map(async r => {
      const sub = await getSubmissionById(r.submissionId);
      const submitter = sub ? await getUserById(sub.userId) : null;
      return { ...r, submission: sub, submitter: submitter ? { id: submitter.id, name: submitter.name } : null };
    }));
    return withSubmissions;
  }),

  myCompletedReviews: protectedProcedure.query(async ({ ctx }) => {
    const myReviews = await getReviewsByReviewerId(ctx.user.id);
    return myReviews.filter(r => r.decision !== null);
  }),

  submitReview: protectedProcedure
    .input(z.object({
      reviewId: z.string(),
      feedback: z.string().min(10, "Feedback must be at least 10 characters"),
      decision: z.enum(["approve", "changes_requested", "reject"]),
      codeQuality: z.number().min(1).max(5).optional(),
      problemUnderstanding: z.number().min(1).max(5).optional(),
      documentation: z.number().min(1).max(5).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const review = await getReviewBySubmissionId(input.reviewId);
      // Find review by id
      const allMyReviews = await getReviewsByReviewerId(ctx.user.id);
      const myReview = allMyReviews.find(r => r.id === input.reviewId);
      if (!myReview) throw new TRPCError({ code: "FORBIDDEN", message: "You are not assigned to this review" });
      if (myReview.decision !== null) throw new TRPCError({ code: "CONFLICT", message: "Review already completed" });

      await completeReview(input.reviewId, input.feedback, input.decision, {
        codeQuality: input.codeQuality,
        problemUnderstanding: input.problemUnderstanding,
        documentation: input.documentation,
      });

      const submission = await getSubmissionById(myReview.submissionId);
      if (submission) {
        if (input.decision === "approve") {
          await updateSubmissionStatus(myReview.submissionId, "approved");
          const xp = XP_VALUES.coding_approved;
          await updateUserXp(submission.userId, xp);
          await addWeeklyXp(submission.userId, xp);
          await processAchievements(submission.userId);
          notifyOwner({ title: "Submission approved ✅", content: `Your submission was approved. +${xp} XP earned. Feedback: ${input.feedback}` }).catch(() => {});
        } else if (input.decision === "changes_requested") {
          await updateSubmissionStatus(myReview.submissionId, "pending");
          notifyOwner({ title: "Changes requested on your submission", content: `Reviewer feedback: ${input.feedback}` }).catch(() => {});
        } else {
          await updateSubmissionStatus(myReview.submissionId, "rejected");
          notifyOwner({ title: "Submission rejected", content: `Reviewer feedback: ${input.feedback}` }).catch(() => {});
        }
      }

      // XP for reviewer
      await updateUserXp(ctx.user.id, XP_VALUES.review_given);
      await addWeeklyXp(ctx.user.id, XP_VALUES.review_given);
      await processAchievements(ctx.user.id);

      return { success: true };
    }),

  flagReview: protectedProcedure
    .input(z.object({ reviewId: z.string(), reason: z.string().min(5) }))
    .mutation(async ({ ctx, input }) => {
      await flagReview(input.reviewId, input.reason);
      return { success: true };
    }),

  rateReview: protectedProcedure
    .input(z.object({ reviewId: z.string(), rating: z.number().min(1).max(5) }))
    .mutation(async ({ ctx, input }) => {
      await rateReview(input.reviewId, input.rating);
      return { success: true };
    }),
});

// ─── PROGRESS ROUTER ──────────────────────────────────────────────────────────

const progressRouter = router({
  myProgress: protectedProcedure.query(async ({ ctx }) => {
    const [subs, streak, userAchievements, user] = await Promise.all([
      getSubmissionsByUserId(ctx.user.id),
      getStreakByUserId(ctx.user.id),
      getAchievementsByUserId(ctx.user.id),
      getUserById(ctx.user.id),
    ]);
    return { submissions: subs, streak, achievements: userAchievements, xp: user?.xp ?? 0 };
  }),

  heatmapData: protectedProcedure.query(async ({ ctx }) => {
    const subs = await getSubmissionsByUserId(ctx.user.id);
    const approved = subs.filter(s => s.status === "approved" && s.submittedAt);
    const counts: Record<string, number> = {};
    for (const s of approved) {
      if (!s.submittedAt) continue;
      const dateKey = s.submittedAt.toISOString().split("T")[0];
      counts[dateKey] = (counts[dateKey] ?? 0) + 1;
    }
    return counts;
  }),

  useStreakFreeze: protectedProcedure.mutation(async ({ ctx }) => {
    const used = await useStreakFreeze(ctx.user.id);
    if (!used) throw new TRPCError({ code: "BAD_REQUEST", message: "No streak freeze available this month" });
    return { success: true };
  }),
});

// ─── LEADERBOARD ROUTER ───────────────────────────────────────────────────────

const leaderboardRouter = router({
  weekly: protectedProcedure
    .input(z.object({ weekKey: z.string().optional() }))
    .query(async ({ input }) => {
      const board = await getLeaderboard(input.weekKey);
      return { weekKey: input.weekKey ?? getCurrentWeekKey(), entries: board };
    }),
});

// ─── CHECK-IN ROUTER ──────────────────────────────────────────────────────────

const checkInRouter = router({
  current: protectedProcedure.query(async ({ ctx }) => {
    const weekKey = getWeekKey();
    return getCheckIn(ctx.user.id, weekKey);
  }),

  upsert: protectedProcedure
    .input(z.object({
      mondayGoal: z.string().optional(),
      fridayReflection: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const weekKey = getWeekKey();
      await upsertCheckIn(ctx.user.id, weekKey, input);
      return { success: true };
    }),
});

// ─── ADMIN ROUTER ─────────────────────────────────────────────────────────────

const adminRouter = router({
  // Users
  listUsers: adminProcedure.query(async () => {
    const allUsers = await getAllUsers();
    return allUsers.map(u => {
      const { ...safe } = u;
      return safe;
    });
  }),

  listBlocked: adminProcedure.query(() => getBlockedUsers()),

  updateUserRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["member", "admin"]) }))
    .mutation(async ({ input }) => {
      await updateUserRole(input.userId, input.role);
      return { success: true };
    }),

  // Excuses
  grantExcuse: adminProcedure
    .input(z.object({ submissionId: z.string(), reason: z.string().min(5) }))
    .mutation(async ({ ctx, input }) => {
      const sub = await getSubmissionById(input.submissionId);
      if (!sub) throw new TRPCError({ code: "NOT_FOUND" });
      if (sub.status !== "overdue") throw new TRPCError({ code: "BAD_REQUEST", message: "Can only excuse overdue submissions" });
      await createExcuse(input.submissionId, ctx.user.id, input.reason);
      await updateSubmissionStatus(input.submissionId, "excused");
      const stillOverdue = await hasOverdueSubmissions(sub.userId);
      await updateUserBlockStatus(sub.userId, stillOverdue);
      return { success: true };
    }),

  // Curriculum CRUD
  createStage: adminProcedure
    .input(z.object({ name: z.string().min(1), description: z.string().optional(), orderIndex: z.number() }))
    .mutation(async ({ input }) => createStage(input)),

  updateStage: adminProcedure
    .input(z.object({ id: z.string(), name: z.string().optional(), description: z.string().optional(), orderIndex: z.number().optional() }))
    .mutation(async ({ input }) => { const { id, ...data } = input; await updateStage(id, data); return { success: true }; }),

  deleteStage: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => { await deleteStage(input.id); return { success: true }; }),

  createTopic: adminProcedure
    .input(z.object({ stageId: z.string(), name: z.string().min(1), description: z.string().optional(), contextParagraph: z.string().optional(), orderIndex: z.number() }))
    .mutation(async ({ input }) => createTopic(input)),

  updateTopic: adminProcedure
    .input(z.object({ id: z.string(), name: z.string().optional(), description: z.string().optional(), contextParagraph: z.string().optional(), orderIndex: z.number().optional() }))
    .mutation(async ({ input }) => { const { id, ...data } = input; await updateTopic(id, data); return { success: true }; }),

  deleteTopic: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => { await deleteTopic(input.id); return { success: true }; }),

  createResource: adminProcedure
    .input(z.object({
      topicId: z.string(),
      title: z.string().min(1),
      url: z.string().url(),
      type: z.enum(["article", "video", "book", "course", "paper", "docs"]),
      isRequired: z.boolean().default(true),
      isFree: z.boolean().default(true),
      description: z.string().optional(),
      estimatedMinutes: z.number().optional(),
      orderIndex: z.number(),
    }))
    .mutation(async ({ input }) => createResource(input)),

  updateResource: adminProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      url: z.string().url().optional(),
      type: z.enum(["article", "video", "book", "course", "paper", "docs"]).optional(),
      isRequired: z.boolean().optional(),
      isFree: z.boolean().optional(),
      description: z.string().optional(),
      estimatedMinutes: z.number().optional(),
      orderIndex: z.number().optional(),
    }))
    .mutation(async ({ input }) => { const { id, ...data } = input; await updateResource(id, data); return { success: true }; }),

  deleteResource: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => { await deleteResource(input.id); return { success: true }; }),

  createTask: adminProcedure
    .input(z.object({
      topicId: z.string(),
      weekNumber: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      assignedDate: z.string(),
      dueDate: z.string(),
      requiredMilestones: z.array(z.enum(["reading", "video", "notes", "coding", "mini_project", "quiz", "discussion"])),
    }))
    .mutation(async ({ input }) => createWeeklyTask({
      ...input,
      assignedDate: new Date(input.assignedDate),
      dueDate: new Date(input.dueDate),
    })),

  updateTask: adminProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      assignedDate: z.string().optional(),
      dueDate: z.string().optional(),
      requiredMilestones: z.array(z.enum(["reading", "video", "notes", "coding", "mini_project", "quiz", "discussion"])).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, assignedDate, dueDate, ...rest } = input;
      await updateWeeklyTask(id, {
        ...rest,
        ...(assignedDate ? { assignedDate: new Date(assignedDate) } : {}),
        ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
      });
      return { success: true };
    }),

  deleteTask: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => { await deleteWeeklyTask(input.id); return { success: true }; }),

  // Batch reorder
  reorderStages: adminProcedure
    .input(z.array(z.object({ id: z.string(), orderIndex: z.number() })))
    .mutation(async ({ input }) => {
      await Promise.all(input.map(({ id, orderIndex }) => updateStage(id, { orderIndex })));
      return { success: true };
    }),

  reorderTopics: adminProcedure
    .input(z.array(z.object({ id: z.string(), orderIndex: z.number() })))
    .mutation(async ({ input }) => {
      await Promise.all(input.map(({ id, orderIndex }) => updateTopic(id, { orderIndex })));
      return { success: true };
    }),

  reorderResources: adminProcedure
    .input(z.array(z.object({ id: z.string(), orderIndex: z.number() })))
    .mutation(async ({ input }) => {
      await Promise.all(input.map(({ id, orderIndex }) => updateResource(id, { orderIndex })));
      return { success: true };
    }),

  // Overdue processing (also called by cron)
  processOverdue: adminProcedure.mutation(async () => {
    const overdue = await getOverdueSubmissions();
    let processed = 0;
    const affectedUserIds = new Set<number>();
    for (const sub of overdue) {
      await updateSubmissionStatus(sub.id, "overdue");
      affectedUserIds.add(sub.userId);
      processed++;
    }
    for (const userId of Array.from(affectedUserIds)) {
      await updateUserBlockStatus(userId, true);
      notifyOwner({ title: "Member blocked — overdue submissions", content: `User ID ${userId} has been blocked due to overdue submissions.` }).catch(() => {});
    }
    return { processed };
  }),
});

// ─── CRON ROUTER (public, protected by CRON_SECRET header) ───────────────────

const cronRouter = router({
  processOverdue: publicProcedure.mutation(async ({ ctx }) => {
    const secret = (ctx.req as any).headers?.["x-cron-secret"];
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    const overdue = await getOverdueSubmissions();
    let processed = 0;
    const affectedUserIds = new Set<number>();
    for (const sub of overdue) {
      await updateSubmissionStatus(sub.id, "overdue");
      affectedUserIds.add(sub.userId);
      processed++;
    }
    for (const userId of Array.from(affectedUserIds)) {
      await updateUserBlockStatus(userId, true);
    }
    return { processed };
  }),
});

// ─── APP ROUTER ───────────────────────────────────────────────────────────────

export const appRouter = router({

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  curriculum: curriculumRouter,
  submissions: submissionsRouter,
  reviews: reviewsRouter,
  progress: progressRouter,
  leaderboard: leaderboardRouter,
  checkIn: checkInRouter,
  admin: adminRouter,
  cron: cronRouter,
});

export type AppRouter = typeof appRouter;
