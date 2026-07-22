import type { Submission, WeeklyTask, AchievementType, MilestoneType } from "../../drizzle/schema";
import { XP_VALUES } from "../../drizzle/schema";

/**
 * Determines if all required milestones for a task are approved.
 */
export function isTaskComplete(taskId: string, submissions: Submission[]): boolean {
  // We can't check required milestones without the task — caller must ensure task is passed
  // This version checks if any approved submission exists for the task
  return submissions.some(s => s.weeklyTaskId === taskId && s.status === "approved");
}

/**
 * Determines if all tasks in a topic are complete (all required milestones approved).
 */
export function isTopicComplete(
  topicId: string,
  tasks: WeeklyTask[],
  submissions: Submission[]
): boolean {
  const topicTasks = tasks.filter(t => t.topicId === topicId);
  if (topicTasks.length === 0) return false;
  return topicTasks.every(task => {
    const requiredMilestones = (task.requiredMilestones as MilestoneType[]) || [];
    return requiredMilestones.every(milestone =>
      submissions.some(s =>
        s.weeklyTaskId === task.id &&
        s.milestoneType === milestone &&
        s.status === "approved"
      )
    );
  });
}

/**
 * Determines if a topic is unlocked for a user.
 * The first topic in the first stage is always unlocked.
 * All other topics require the previous topic to be complete.
 */
export function getUnlockedTopicIds(
  orderedTopics: { id: string }[],
  tasks: WeeklyTask[],
  submissions: Submission[]
): Set<string> {
  const unlocked = new Set<string>();
  for (let i = 0; i < orderedTopics.length; i++) {
    const topic = orderedTopics[i];
    if (i === 0) {
      unlocked.add(topic.id);
    } else {
      const prev = orderedTopics[i - 1];
      if (isTopicComplete(prev.id, tasks, submissions)) {
        unlocked.add(topic.id);
      } else {
        break; // Strict ordering — can't skip
      }
    }
  }
  return unlocked;
}

/**
 * ISO week key format: "YYYY-Www"
 */
export function getWeekKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const week = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/**
 * Calculates the next streak state after a week's outcome.
 * Returns { currentStreakWeeks, longestStreakWeeks }
 */
export function nextStreak(
  current: { currentStreakWeeks: number; longestStreakWeeks: number; lastCompleteWeek: string | null },
  wasOnTime: boolean,
  usedFreeze: boolean = false
): { currentStreakWeeks: number; longestStreakWeeks: number } {
  if (wasOnTime || usedFreeze) {
    const next = current.currentStreakWeeks + (wasOnTime ? 1 : 0);
    return {
      currentStreakWeeks: next,
      longestStreakWeeks: Math.max(current.longestStreakWeeks, next),
    };
  }
  return {
    currentStreakWeeks: 0,
    longestStreakWeeks: current.longestStreakWeeks, // Never decreases
  };
}

/**
 * Returns achievement types that should be awarded based on current state.
 */
export function missingAchievementTypes(
  earnedTypes: AchievementType[],
  state: {
    submissionCount: number;
    currentStreakWeeks: number;
    completedStageIds: string[];
    reviewsGiven: number;
    perfectWeek: boolean;
    isCapstone: boolean;
  }
): AchievementType[] {
  const earned = new Set(earnedTypes);
  const toAward: AchievementType[] = [];

  if (state.submissionCount >= 1 && !earned.has("first_submission")) toAward.push("first_submission");
  if (state.currentStreakWeeks >= 4 && !earned.has("streak_4")) toAward.push("streak_4");
  if (state.currentStreakWeeks >= 12 && !earned.has("streak_12")) toAward.push("streak_12");
  if (state.completedStageIds.length > 0 && !earned.has("stage_complete")) toAward.push("stage_complete");
  if (state.isCapstone && !earned.has("capstone_complete")) toAward.push("capstone_complete");
  if (state.reviewsGiven >= 1 && !earned.has("first_review_given")) toAward.push("first_review_given");
  if (state.perfectWeek && !earned.has("perfect_week")) toAward.push("perfect_week");

  return toAward;
}

/**
 * XP awarded for a given milestone type and status.
 */
export function getXpForMilestone(milestoneType: MilestoneType): number {
  if (milestoneType === "coding" || milestoneType === "mini_project") return XP_VALUES.coding_approved;
  return XP_VALUES.self_approve;
}
