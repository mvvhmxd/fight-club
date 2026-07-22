import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Flame, GitBranch, ListChecks, BookOpen, Star, MessageSquare, Trophy, Zap } from "lucide-react";
import { useMemo } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const MILESTONE_ICONS: Record<string, React.ReactNode> = {
  reading: <BookOpen className="w-3.5 h-3.5" />,
  video: <span className="text-xs">▶</span>,
  notes: <span className="text-xs">📝</span>,
  coding: <GitBranch className="w-3.5 h-3.5" />,
  mini_project: <Star className="w-3.5 h-3.5" />,
  quiz: <ListChecks className="w-3.5 h-3.5" />,
  discussion: <MessageSquare className="w-3.5 h-3.5" />,
};

const ACHIEVEMENT_META: Record<string, { label: string; icon: string; color: string }> = {
  first_submission: { label: "First Submission", icon: "🚀", color: "text-blue-400" },
  streak_4: { label: "4-Week Streak", icon: "🔥", color: "text-amber-400" },
  streak_12: { label: "12-Week Streak", icon: "⚡", color: "text-yellow-400" },
  stage_complete: { label: "Stage Complete", icon: "🏆", color: "text-green-400" },
  capstone_complete: { label: "Capstone Complete", icon: "💎", color: "text-purple-400" },
  first_review_given: { label: "First Review", icon: "⭐", color: "text-cyan-400" },
  perfect_week: { label: "Perfect Week", icon: "✨", color: "text-pink-400" },
};

function ActivityHeatmap({ data }: { data: Record<string, number> }) {
  const weeks = useMemo(() => {
    const cells: { date: string; count: number }[] = [];
    const now = new Date();
    for (let i = 83; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      cells.push({ date: key, count: data[key] ?? 0 });
    }
    const grouped: { date: string; count: number }[][] = [];
    for (let i = 0; i < cells.length; i += 7) grouped.push(cells.slice(i, i + 7));
    return grouped;
  }, [data]);

  const getLevel = (count: number) => Math.min(count, 4);

  return (
    <div className="flex gap-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((day, di) => (
            <div key={di} title={`${day.date}: ${day.count}`} className={cn("w-3 h-3 rounded-sm", `heatmap-cell-${getLevel(day.count)}`)} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: progress, isLoading } = trpc.progress.myProgress.useQuery();
  const { data: heatmap } = trpc.progress.heatmapData.useQuery();
  const { data: pendingReviews } = trpc.reviews.myPendingReviews.useQuery();
  const { data: curriculum } = trpc.curriculum.getStages.useQuery();
  const { data: checkIn } = trpc.checkIn.current.useQuery();
  const utils = trpc.useUtils();

  const upsertCheckIn = trpc.checkIn.upsert.useMutation({ onSuccess: () => utils.checkIn.current.invalidate() });

  const streak = progress?.streak;
  const achievements = progress?.achievements ?? [];
  const xp = progress?.xp ?? 0;

  const currentTasks = useMemo(() => {
    if (!curriculum) return [];
    const tasks: any[] = [];
    for (const stage of curriculum) {
      for (const topic of (stage as any).topics ?? []) {
        if (!topic.locked && topic.tasks) {
          for (const task of topic.tasks) {
            if (new Date(task.dueDate) >= new Date()) {
              tasks.push({ task, topic, stage, submissions: task.submissions ?? [] });
            }
          }
        }
      }
    }
    return tasks.slice(0, 5);
  }, [curriculum]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Flame className="w-4 h-4 streak-fire" />, label: "Current Streak", value: `${streak?.currentStreakWeeks ?? 0}w`, sub: `Best: ${streak?.longestStreakWeeks ?? 0}w` },
          { icon: <Zap className="w-4 h-4 text-primary" />, label: "Total XP", value: xp.toLocaleString(), sub: "All time" },
          { icon: <CheckCircle2 className="w-4 h-4 text-green-400" />, label: "Approved", value: String(progress?.submissions?.filter(s => s.status === "approved").length ?? 0), sub: "Submissions" },
          { icon: <Trophy className="w-4 h-4 text-yellow-400" />, label: "Achievements", value: String(achievements.length), sub: "Earned" },
        ].map((s, i) => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">{s.icon}<span className="text-xs text-muted-foreground">{s.label}</span></div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* This week's tasks */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />This Week's Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">All caught up! No pending tasks.</p>
                  <Link href="/curriculum"><Button variant="outline" size="sm" className="mt-3">Browse Curriculum</Button></Link>
                </div>
              ) : (
                currentTasks.map(({ task, topic, submissions }) => {
                  const milestones = (task.requiredMilestones as string[]) ?? [];
                  const dueDate = new Date(task.dueDate);
                  const isOverdue = dueDate < new Date();
                  return (
                    <div key={task.id} className="p-3 rounded-lg bg-background border border-border">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{task.title}</p>
                          <p className="text-xs text-muted-foreground">{topic.name}</p>
                        </div>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full border shrink-0", isOverdue ? "status-overdue" : "status-pending")}>
                          {isOverdue ? "Overdue" : `Due ${dueDate.toLocaleDateString()}`}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {milestones.map(m => {
                          const sub = submissions.find((s: any) => s.milestoneType === m);
                          const isDone = sub?.status === "approved";
                          const isInReview = sub?.status === "in_review";
                          return (
                            <Link key={m} href={`/curriculum/${topic.id}`}>
                              <div className={cn("flex items-center gap-1 px-2 py-1 rounded text-xs border cursor-pointer transition-colors", isDone ? "status-approved" : isInReview ? "status-in-review" : "bg-muted border-border text-muted-foreground hover:text-foreground")}>
                                {MILESTONE_ICONS[m]}<span className="capitalize">{m.replace("_", " ")}</span>
                                {isDone && <CheckCircle2 className="w-3 h-3" />}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Heatmap */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Activity (Last 12 Weeks)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto pb-1">
                <ActivityHeatmap data={heatmap ?? {}} />
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <span>Less</span>
                {[0,1,2,3,4].map(l => <div key={l} className={cn("w-3 h-3 rounded-sm", `heatmap-cell-${l}`)} />)}
                <span>More</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Pending reviews */}
          {(pendingReviews?.length ?? 0) > 0 && (
            <Card className="bg-card border-border border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-primary" />Pending Reviews
                  <Badge className="ml-auto bg-primary/20 text-primary border-0 text-xs">{pendingReviews?.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">{pendingReviews?.length} review{(pendingReviews?.length ?? 0) > 1 ? "s" : ""} waiting.</p>
                <Link href="/reviews"><Button size="sm" className="w-full">Go to Reviews</Button></Link>
              </CardContent>
            </Card>
          )}

          {/* Weekly check-in */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Weekly Check-in</CardTitle></CardHeader>
            <CardContent>
              {checkIn?.mondayGoal ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">This week's goal</p>
                  <p className="text-sm text-foreground">{checkIn.mondayGoal}</p>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); const g = (e.currentTarget.elements.namedItem("goal") as HTMLInputElement).value; if (g.trim()) upsertCheckIn.mutate({ mondayGoal: g }); }}>
                  <p className="text-xs text-muted-foreground mb-2">What's your goal this week?</p>
                  <input name="goal" className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="e.g. Complete transformers topic..." />
                  <Button type="submit" size="sm" className="w-full mt-2" disabled={upsertCheckIn.isPending}>Set goal</Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-400" />Achievements</CardTitle></CardHeader>
            <CardContent>
              {achievements.length === 0 ? (
                <p className="text-xs text-muted-foreground">Complete your first milestone to earn achievements.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {achievements.slice(-6).map(a => {
                    const meta = ACHIEVEMENT_META[a.type];
                    return (
                      <div key={a.id} title={meta?.label} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background border border-border text-xs">
                        <span>{meta?.icon}</span><span className={cn("font-medium", meta?.color)}>{meta?.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
