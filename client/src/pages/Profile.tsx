import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Flame, Trophy, Zap } from "lucide-react";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ACHIEVEMENT_META: Record<string, { label: string; icon: string; color: string }> = {
  first_submission: { label: "First Submission", icon: "🚀", color: "text-blue-400" },
  streak_4: { label: "4-Week Streak", icon: "🔥", color: "text-amber-400" },
  streak_12: { label: "12-Week Streak", icon: "⚡", color: "text-yellow-400" },
  stage_complete: { label: "Stage Complete", icon: "🏆", color: "text-green-400" },
  capstone_complete: { label: "Capstone Complete", icon: "💎", color: "text-purple-400" },
  first_review_given: { label: "First Review", icon: "⭐", color: "text-cyan-400" },
  perfect_week: { label: "Perfect Week", icon: "✨", color: "text-pink-400" },
};

function MiniHeatmap({ data }: { data: Record<string, number> }) {
  const weeks = useMemo(() => {
    const cells: { date: string; count: number }[] = [];
    const now = new Date();
    for (let i = 83; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      cells.push({ date: key, count: data[key] ?? 0 });
    }
    const grouped: { date: string; count: number }[][] = [];
    for (let i = 0; i < cells.length; i += 7) grouped.push(cells.slice(i, i + 7));
    return grouped;
  }, [data]);

  return (
    <div className="flex gap-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((day, di) => (
            <div key={di} title={day.date} className={cn("w-2.5 h-2.5 rounded-sm", `heatmap-cell-${Math.min(day.count, 4)}`)} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Profile({ userId }: { userId: number }) {
  const { user: me } = useAuth();
  const { data: progress, isLoading } = trpc.progress.myProgress.useQuery(undefined, { enabled: userId === me?.id });
  const { data: heatmap } = trpc.progress.heatmapData.useQuery(undefined, { enabled: userId === me?.id });
  const { data: allUsers } = trpc.admin.listUsers.useQuery();

  const profileUser = allUsers?.find((u: any) => u.id === userId);
  const isMe = userId === me?.id;

  if (isLoading || !profileUser) {
    return <div className="space-y-4 max-w-2xl">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-lg" />)}</div>;
  }

  const achievements = isMe ? (progress?.achievements ?? []) : [];
  const streak = isMe ? progress?.streak : null;
  const xp = isMe ? (progress?.xp ?? 0) : (profileUser as any).xp ?? 0;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile header */}
      <div className="flex items-center gap-4 p-6 rounded-xl bg-card border border-border">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <span className="text-2xl font-bold text-primary">{profileUser.name?.charAt(0)?.toUpperCase() ?? "?"}</span>
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{profileUser.name}</h1>
          <p className="text-sm text-muted-foreground capitalize">{profileUser.role}</p>
          <div className="flex items-center gap-4 mt-2">
            {streak && (
              <div className="flex items-center gap-1.5 text-sm">
                <Flame className="w-4 h-4 streak-fire" />
                <span className="font-semibold text-foreground">{streak.currentStreakWeeks}w</span>
                <span className="text-muted-foreground">streak</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground">{xp.toLocaleString()}</span>
              <span className="text-muted-foreground">XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      {isMe && heatmap && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Activity</CardTitle></CardHeader>
          <CardContent><MiniHeatmap data={heatmap} /></CardContent>
        </Card>
      )}

      {/* Achievements */}
      {isMe && achievements.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-400" />Achievements</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {achievements.map(a => {
                const meta = ACHIEVEMENT_META[a.type];
                return (
                  <div key={a.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs">
                    <span>{meta?.icon}</span>
                    <span className={cn("font-medium", meta?.color)}>{meta?.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {!isMe && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Full profile stats are only visible to the member themselves.
        </div>
      )}
    </div>
  );
}
