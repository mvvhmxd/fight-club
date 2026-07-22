import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { CheckCircle2, Flame, Shield, Trophy, Zap } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const ACHIEVEMENT_META: Record<string, { label: string; icon: string; color: string }> = {
  first_submission: { label: "First Submission", icon: "🚀", color: "text-blue-400" },
  streak_4: { label: "4-Week Streak", icon: "🔥", color: "text-amber-400" },
  streak_12: { label: "12-Week Streak", icon: "⚡", color: "text-yellow-400" },
  stage_complete: { label: "Stage Complete", icon: "🏆", color: "text-green-400" },
  capstone_complete: { label: "Capstone Complete", icon: "💎", color: "text-purple-400" },
  first_review_given: { label: "First Review", icon: "⭐", color: "text-cyan-400" },
  perfect_week: { label: "Perfect Week", icon: "✨", color: "text-pink-400" },
};

const ALL_ACHIEVEMENTS = Object.keys(ACHIEVEMENT_META);

function ActivityHeatmap({ data }: { data: Record<string, number> }) {
  const weeks = useMemo(() => {
    const cells: { date: string; count: number }[] = [];
    const now = new Date();
    for (let i = 363; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      cells.push({ date: key, count: data[key] ?? 0 });
    }
    const grouped: { date: string; count: number }[][] = [];
    for (let i = 0; i < cells.length; i += 7) grouped.push(cells.slice(i, i + 7));
    return grouped;
  }, [data]);

  return (
    <div className="flex gap-1 overflow-x-auto pb-2">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((day, di) => (
            <div key={di} title={`${day.date}: ${day.count}`} className={cn("w-3 h-3 rounded-sm shrink-0", `heatmap-cell-${Math.min(day.count, 4)}`)} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Progress() {
  const { user } = useAuth();
  const { data: progress, isLoading } = trpc.progress.myProgress.useQuery();
  const { data: heatmap } = trpc.progress.heatmapData.useQuery();
  const utils = trpc.useUtils();

  const useFreeze = trpc.progress.useStreakFreeze.useMutation({
    onSuccess: () => { toast.success("Streak freeze used! Your streak is protected."); utils.progress.myProgress.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const streak = progress?.streak;
  const achievements = progress?.achievements ?? [];
  const submissions = progress?.submissions ?? [];
  const earnedTypes = new Set(achievements.map(a => a.type));

  const stats = useMemo(() => {
    const approved = submissions.filter(s => s.status === "approved").length;
    const inReview = submissions.filter(s => s.status === "in_review").length;
    const overdue = submissions.filter(s => s.status === "overdue").length;
    const total = submissions.length;
    return { approved, inReview, overdue, total, rate: total > 0 ? Math.round((approved / total) * 100) : 0 };
  }, [submissions]);

  if (isLoading) return <div className="space-y-4 max-w-3xl">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-lg" />)}</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Progress</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your learning journey at a glance.</p>
      </div>

      {/* Streak */}
      <Card className="bg-card border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="grid grid-cols-3 gap-3 sm:flex sm:items-center sm:gap-4">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 streak-fire shrink-0" />
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{streak?.currentStreakWeeks ?? 0}w</p>
                  <p className="text-xs text-muted-foreground">Current</p>
                </div>
              </div>
              <div className="hidden sm:block w-px h-10 bg-border" />
              <div>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{streak?.longestStreakWeeks ?? 0}w</p>
                <p className="text-xs text-muted-foreground">Longest</p>
              </div>
              <div className="hidden sm:block w-px h-10 bg-border" />
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{progress?.xp?.toLocaleString() ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Total XP</p>
                </div>
              </div>
            </div>
            {(user as any)?.streakFreezeCount > 0 && (
              <Button size="sm" variant="outline" className="gap-2 self-start sm:self-auto" onClick={() => useFreeze.mutate()} disabled={useFreeze.isPending}>
                <Shield className="w-3.5 h-3.5 text-blue-400" />Use Freeze
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity heatmap */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Activity (Last Year)</CardTitle></CardHeader>
        <CardContent>
          <ActivityHeatmap data={heatmap ?? {}} />
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <span>Less</span>
            {[0,1,2,3,4].map(l => <div key={l} className={cn("w-3 h-3 rounded-sm", `heatmap-cell-${l}`)} />)}
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Approved", value: stats.approved, color: "text-green-400" },
          { label: "In Review", value: stats.inReview, color: "text-blue-400" },
          { label: "Overdue", value: stats.overdue, color: "text-red-400" },
        ].map(s => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="pt-3 pb-3 text-center">
              <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Achievements */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-400" />Achievements</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ALL_ACHIEVEMENTS.map(type => {
              const meta = ACHIEVEMENT_META[type];
              const earned = earnedTypes.has(type as any);
              const earnedDate = achievements.find(a => a.type === type)?.earnedAt;
              return (
                <div key={type} className={cn("p-3 rounded-lg border text-center transition-opacity", earned ? "border-border bg-card" : "border-border/50 bg-card/50 opacity-40")}>
                  <div className="text-2xl mb-1">{meta.icon}</div>
                  <p className={cn("text-xs font-semibold", earned ? meta.color : "text-muted-foreground")}>{meta.label}</p>
                  {earned && earnedDate && <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(earnedDate).toLocaleDateString()}</p>}
                  {!earned && <p className="text-[10px] text-muted-foreground mt-0.5">Locked</p>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Submission history */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Submission History</CardTitle></CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No submissions yet.</p>
          ) : (
            <div className="space-y-1">
              {submissions.slice(0, 20).map(s => (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", s.status === "approved" ? "bg-green-400" : s.status === "in_review" ? "bg-blue-400" : s.status === "overdue" ? "bg-red-400" : "bg-muted-foreground")} />
                  <span className="text-xs text-muted-foreground capitalize flex-1">{s.milestoneType.replace("_", " ")}</span>
                  <span className={cn("text-xs px-1.5 py-0.5 rounded border capitalize", `status-${s.status.replace("_", "-")}`)}>{s.status.replace("_", " ")}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : "-"}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
