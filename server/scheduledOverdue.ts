/**
 * scheduledOverdue.ts — Daily overdue submission processor
 *
 * Runs every day at midnight UTC via node-cron.
 * Flips submitted/in_review submissions past their due date to "overdue"
 * and hard-blocks the affected members.
 *
 * Call startOverdueCron() once at server startup.
 */
import cron from "node-cron";
import {
  getOverdueSubmissions,
  updateSubmissionStatus,
  updateUserBlockStatus,
} from "./db";
import { notifyOwner } from "./_core/notification";

export async function processOverdueSubmissions(): Promise<{ processed: number; blocked: number }> {
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
    const count = overdue.filter(s => s.userId === userId).length;
    notifyOwner({
      title: "Member blocked — overdue submissions",
      content: `User ID ${userId} has been blocked due to ${count} overdue submission(s).`,
    }).catch(() => {});
  }

  if (processed > 0) {
    console.log(`[Cron] Processed ${processed} overdue submissions, blocked ${affectedUserIds.size} members.`);
  }

  return { processed, blocked: affectedUserIds.size };
}

/**
 * Start the daily overdue cron job.
 * Fires at midnight UTC every day: "0 0 * * *"
 * Override with OVERDUE_CRON env var, e.g. "0 * * * *" for hourly.
 */
export function startOverdueCron() {
  const cronExpression = process.env.OVERDUE_CRON ?? "0 0 * * *";

  if (!cron.validate(cronExpression)) {
    console.error(`[Cron] Invalid OVERDUE_CRON expression: "${cronExpression}". Cron not started.`);
    return;
  }

  cron.schedule(cronExpression, async () => {
    console.log("[Cron] Running overdue submission check...");
    try {
      await processOverdueSubmissions();
    } catch (err) {
      console.error("[Cron] Overdue check failed:", err);
    }
  }, { timezone: "UTC" });

  console.log(`[Cron] Overdue processor scheduled: "${cronExpression}" (UTC)`);
}
