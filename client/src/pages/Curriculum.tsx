import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { BookOpen, ChevronRight, Lock, CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Curriculum() {
  const { data: stages, isLoading } = trpc.curriculum.getStages.useQuery();
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());

  const toggleStage = (id: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Curriculum</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Complete topics in order to unlock the next stage.</p>
      </div>

      <div className="space-y-3">
        {(stages ?? []).map((stage: any, si: number) => {
          const topics = stage.topics ?? [];
          const completedCount = topics.filter((t: any) => t.complete).length;
          const isExpanded = expandedStages.has(stage.id);

          return (
            <div key={stage.id} className="rounded-lg border border-border bg-card overflow-hidden">
              {/* Stage header */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-accent/50 transition-colors"
                onClick={() => toggleStage(stage.id)}
              >
                <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{si + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{stage.name}</p>
                  {stage.description && <p className="text-xs text-muted-foreground truncate">{stage.description}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground">{completedCount}/{topics.length}</span>
                  {completedCount === topics.length && topics.length > 0 && (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  )}
                  <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", isExpanded && "rotate-90")} />
                </div>
              </button>

              {/* Topics */}
              {isExpanded && (
                <div className="border-t border-border divide-y divide-border">
                  {topics.map((topic: any) => (
                    <Link key={topic.id} href={topic.locked ? "#" : `/curriculum/${topic.id}`}>
                      <div className={cn(
                        "flex items-center gap-3 px-4 py-3 transition-colors",
                        topic.locked ? "opacity-50 cursor-not-allowed" : "hover:bg-accent/30 cursor-pointer"
                      )}>
                        <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                          {topic.locked ? (
                            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                          ) : topic.complete ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{topic.name}</p>
                          {topic.description && <p className="text-xs text-muted-foreground truncate">{topic.description}</p>}
                        </div>
                        {!topic.locked && (
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        {topic.locked && (
                          <Badge variant="secondary" className="text-xs shrink-0">Locked</Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {(stages ?? []).length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No curriculum yet. Ask an admin to add stages and topics.</p>
          </div>
        )}
      </div>
    </div>
  );
}
