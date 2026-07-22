import { describe, expect, it } from "vitest";
import {
  isTopicComplete,
  getUnlockedTopicIds,
  getWeekKey,
  nextStreak,
  missingAchievementTypes,
  getXpForMilestone,
} from "./services/accountability";

// ─── isTopicComplete ──────────────────────────────────────────────────────────

describe("isTopicComplete", () => {
  const mockTasks = [
    { id: "t1", topicId: "topic-1", requiredMilestones: ["reading", "coding"] as any },
    { id: "t2", topicId: "topic-1", requiredMilestones: ["notes"] as any },
  ] as any[];

  it("returns true when all milestones across all tasks are approved", () => {
    const subs = [
      { weeklyTaskId: "t1", milestoneType: "reading", status: "approved" } as any,
      { weeklyTaskId: "t1", milestoneType: "coding", status: "approved" } as any,
      { weeklyTaskId: "t2", milestoneType: "notes", status: "approved" } as any,
    ];
    expect(isTopicComplete("topic-1", mockTasks, subs)).toBe(true);
  });

  it("returns false when some milestones are not approved", () => {
    const subs = [
      { weeklyTaskId: "t1", milestoneType: "reading", status: "approved" } as any,
      { weeklyTaskId: "t1", milestoneType: "coding", status: "in_review" } as any,
    ];
    expect(isTopicComplete("topic-1", mockTasks, subs)).toBe(false);
  });

  it("returns false when no submissions exist", () => {
    expect(isTopicComplete("topic-1", mockTasks, [])).toBe(false);
  });

  it("returns false for a topic with no tasks (no tasks = not completable)", () => {
    expect(isTopicComplete("topic-empty", [], [])).toBe(false);
  });
});

// ─── getUnlockedTopicIds ──────────────────────────────────────────────────────

describe("getUnlockedTopicIds", () => {
  const topics = [
    { id: "t1" },
    { id: "t2" },
    { id: "t3" },
  ];
  const tasks = [
    { id: "task1", topicId: "t1", requiredMilestones: ["reading"] as any },
    { id: "task2", topicId: "t2", requiredMilestones: ["coding"] as any },
    { id: "task3", topicId: "t3", requiredMilestones: ["notes"] as any },
  ] as any[];

  it("unlocks only the first topic when nothing is complete", () => {
    const unlocked = getUnlockedTopicIds(topics, tasks, []);
    expect(unlocked.has("t1")).toBe(true);
    expect(unlocked.has("t2")).toBe(false);
    expect(unlocked.has("t3")).toBe(false);
  });

  it("unlocks second topic when first is complete", () => {
    const subs = [{ weeklyTaskId: "task1", milestoneType: "reading", status: "approved" } as any];
    const unlocked = getUnlockedTopicIds(topics, tasks, subs);
    expect(unlocked.has("t1")).toBe(true);
    expect(unlocked.has("t2")).toBe(true);
    expect(unlocked.has("t3")).toBe(false);
  });

  it("unlocks all topics when all are complete", () => {
    const subs = [
      { weeklyTaskId: "task1", milestoneType: "reading", status: "approved" } as any,
      { weeklyTaskId: "task2", milestoneType: "coding", status: "approved" } as any,
      { weeklyTaskId: "task3", milestoneType: "notes", status: "approved" } as any,
    ];
    const unlocked = getUnlockedTopicIds(topics, tasks, subs);
    expect(unlocked.has("t1")).toBe(true);
    expect(unlocked.has("t2")).toBe(true);
    expect(unlocked.has("t3")).toBe(true);
  });
});

// ─── nextStreak ───────────────────────────────────────────────────────────────

describe("nextStreak", () => {
  const baseStreak = { currentStreakWeeks: 3, longestStreakWeeks: 5, lastCompleteWeek: null };

  it("increments streak when completed on time", () => {
    const result = nextStreak(baseStreak, true);
    expect(result.currentStreakWeeks).toBe(4);
    expect(result.longestStreakWeeks).toBe(5); // unchanged, 4 < 5
  });

  it("updates longest streak when current exceeds it", () => {
    const streak = { currentStreakWeeks: 5, longestStreakWeeks: 5, lastCompleteWeek: null };
    const result = nextStreak(streak, true);
    expect(result.currentStreakWeeks).toBe(6);
    expect(result.longestStreakWeeks).toBe(6);
  });

  it("resets current streak when missed, preserves longest", () => {
    const streak = { currentStreakWeeks: 10, longestStreakWeeks: 10, lastCompleteWeek: null };
    const result = nextStreak(streak, false);
    expect(result.currentStreakWeeks).toBe(0);
    expect(result.longestStreakWeeks).toBe(10);
  });

  it("preserves streak when freeze is used", () => {
    const result = nextStreak(baseStreak, false, true);
    // freeze used: streak not incremented but not reset
    expect(result.currentStreakWeeks).toBe(3);
    expect(result.longestStreakWeeks).toBe(5);
  });
});

// ─── getWeekKey ───────────────────────────────────────────────────────────────

describe("getWeekKey", () => {
  it("returns a string in YYYY-WXX format", () => {
    const key = getWeekKey();
    expect(key).toMatch(/^\d{4}-W\d{2}$/);
  });

  it("returns consistent key for same date", () => {
    const date = new Date("2025-01-06");
    const key1 = getWeekKey(date);
    const key2 = getWeekKey(date);
    expect(key1).toBe(key2);
  });
});

// ─── getXpForMilestone ────────────────────────────────────────────────────────

describe("getXpForMilestone", () => {
  it("returns XP for self-approve milestones", () => {
    expect(getXpForMilestone("reading")).toBeGreaterThan(0);
    expect(getXpForMilestone("video")).toBeGreaterThan(0);
    expect(getXpForMilestone("notes")).toBeGreaterThan(0);
  });

  it("coding returns the coding_approved XP value", () => {
    // coding XP is awarded on review approval, not on submission
    expect(getXpForMilestone("coding")).toBeGreaterThan(0);
  });
});

// ─── missingAchievementTypes ─────────────────────────────────────────────────

describe("missingAchievementTypes", () => {
  it("awards first_submission when user has 1 approved submission", () => {
    const missing = missingAchievementTypes([], {
      submissionCount: 1, currentStreakWeeks: 0, completedStageIds: [],
      reviewsGiven: 0, perfectWeek: false, isCapstone: false,
    });
    expect(missing).toContain("first_submission");
  });

  it("does not re-award already earned achievements", () => {
    const missing = missingAchievementTypes(["first_submission"], {
      submissionCount: 5, currentStreakWeeks: 0, completedStageIds: [],
      reviewsGiven: 0, perfectWeek: false, isCapstone: false,
    });
    expect(missing).not.toContain("first_submission");
  });

  it("awards streak_4 when current streak reaches 4", () => {
    const missing = missingAchievementTypes([], {
      submissionCount: 0, currentStreakWeeks: 4, completedStageIds: [],
      reviewsGiven: 0, perfectWeek: false, isCapstone: false,
    });
    expect(missing).toContain("streak_4");
  });

  it("awards streak_12 when current streak reaches 12", () => {
    const missing = missingAchievementTypes(["streak_4"], {
      submissionCount: 0, currentStreakWeeks: 12, completedStageIds: [],
      reviewsGiven: 0, perfectWeek: false, isCapstone: false,
    });
    expect(missing).toContain("streak_12");
  });

  it("awards first_review_given when reviewer has completed 1 review", () => {
    const missing = missingAchievementTypes([], {
      submissionCount: 0, currentStreakWeeks: 0, completedStageIds: [],
      reviewsGiven: 1, perfectWeek: false, isCapstone: false,
    });
    expect(missing).toContain("first_review_given");
  });

  it("awards stage_complete when a stage is completed", () => {
    const missing = missingAchievementTypes([], {
      submissionCount: 0, currentStreakWeeks: 0, completedStageIds: ["stage-1"],
      reviewsGiven: 0, perfectWeek: false, isCapstone: false,
    });
    expect(missing).toContain("stage_complete");
  });

  it("awards multiple achievements at once", () => {
    const missing = missingAchievementTypes([], {
      submissionCount: 1, currentStreakWeeks: 4, completedStageIds: [],
      reviewsGiven: 1, perfectWeek: true, isCapstone: false,
    });
    expect(missing).toContain("first_submission");
    expect(missing).toContain("streak_4");
    expect(missing).toContain("first_review_given");
    expect(missing).toContain("perfect_week");
  });
});
