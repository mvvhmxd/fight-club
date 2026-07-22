import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Trophy, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Leaderboard() {
  const { user } = useAuth();
  const { data, isLoading } = trpc.leaderboard.weekly.useQuery({});

  const entries = data?.entries ?? [];
  const weekKey = data?.weekKey ?? "";

  if (isLoading) return <div className="space-y-4 max-w-2xl">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Weekly XP rankings · {weekKey}</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />This Week's Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No XP earned this week yet. Submit your first milestone!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry: any, i: number) => {
                const isMe = entry.userId === user?.id;
                const maxXp = entries[0]?.xp ?? 1;
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                return (
                  <div key={entry.userId} className={cn("flex items-center gap-3 p-3 rounded-lg border transition-colors", isMe ? "border-primary/30 bg-primary/5" : "border-border bg-background")}>
                    <div className="w-8 text-center shrink-0">
                      {medal ? <span className="text-lg">{medal}</span> : <span className="text-sm font-mono text-muted-foreground">#{i + 1}</span>}
                    </div>
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-primary">{entry.name?.charAt(0)?.toUpperCase() ?? "?"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{entry.name ?? "Unknown"}</p>
                        {isMe && <span className="text-xs text-primary font-medium">you</span>}
                      </div>
                      <div className="xp-bar mt-1 w-full max-w-48">
                        <div className="xp-bar-fill" style={{ width: `${(entry.xp / maxXp) * 100}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Zap className="w-3.5 h-3.5 text-primary" />
                      <span className="text-sm font-semibold text-foreground font-mono">{entry.xp}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
