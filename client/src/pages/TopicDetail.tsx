import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ArrowLeft, BookOpen, CheckCircle2, Circle, Clock, ExternalLink, GitBranch, Loader2, Star } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const RESOURCE_TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  article: { label: "Article", color: "resource-article", icon: "📄" },
  video: { label: "Video", color: "resource-video", icon: "🎥" },
  book: { label: "Book", color: "resource-book", icon: "📚" },
  course: { label: "Course", color: "resource-course", icon: "🎓" },
  paper: { label: "Paper", color: "resource-paper", icon: "📑" },
  docs: { label: "Docs", color: "resource-docs", icon: "📖" },
};

function SubmitMilestoneForm({ task, milestoneType, existingSub, onSuccess }: {
  task: any; milestoneType: string; existingSub?: any; onSuccess: () => void;
}) {
  const [githubUrl, setGithubUrl] = useState("");
  const [notes, setNotes] = useState("");
  const utils = trpc.useUtils();

  const submit = trpc.submissions.submit.useMutation({
    onSuccess: () => {
      toast.success("Submitted successfully!");
      onSuccess();
      utils.curriculum.getStages.invalidate();
      utils.curriculum.getTopic.invalidate();
      utils.progress.myProgress.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const isSelfApprove = ["reading", "video", "notes", "quiz"].includes(milestoneType);
  const isCodeReview = ["coding", "mini_project"].includes(milestoneType);

  if (existingSub) {
    const statusMap: Record<string, string> = {
      approved: "status-approved", in_review: "status-in-review", pending: "status-pending",
      overdue: "status-overdue", rejected: "status-rejected", excused: "status-excused",
    };
    return (
      <div className={cn("flex items-center gap-2 text-xs px-2 py-1 rounded border", statusMap[existingSub.status] ?? "")}>
        <CheckCircle2 className="w-3 h-3" />
        <span className="capitalize">{existingSub.status.replace("_", " ")}</span>
        {existingSub.githubUrl && (
          <a href={existingSub.githubUrl} target="_blank" rel="noopener noreferrer" className="ml-1 hover:underline flex items-center gap-0.5">
            View <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      {milestoneType === "notes" && (
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Paste your notes here..."
          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none h-24"
        />
      )}
      {isCodeReview && (
        <input
          value={githubUrl}
          onChange={e => setGithubUrl(e.target.value)}
          placeholder="https://github.com/username/repo"
          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      )}
      <Button
        size="sm"
        disabled={submit.isPending || (isCodeReview && !githubUrl.trim())}
        onClick={() => submit.mutate({
          weeklyTaskId: task.id,
          milestoneType: milestoneType as any,
          githubUrl: isCodeReview ? githubUrl : undefined,
          notesContent: milestoneType === "notes" ? notes : undefined,
        })}
      >
        {submit.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
        {isSelfApprove ? "Mark Complete" : "Submit for Review"}
      </Button>
    </div>
  );
}

export default function TopicDetail({ topicId }: { topicId: string }) {
  const { data: topic, isLoading } = trpc.curriculum.getTopic.useQuery({ topicId });
  const utils = trpc.useUtils();
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const toggleResource = trpc.curriculum.toggleResourceCompletion.useMutation({
    onSuccess: () => utils.curriculum.getTopic.invalidate(),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!topic) return <div className="text-muted-foreground text-sm">Topic not found.</div>;

  const requiredResources = (topic.resources ?? []).filter((r: any) => r.isRequired);
  const optionalResources = (topic.resources ?? []).filter((r: any) => !r.isRequired);
  const completedRequired = requiredResources.filter((r: any) => r.completed).length;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back */}
      <Link href="/curriculum">
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />Back to Curriculum
        </button>
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{topic.name}</h1>
        {topic.description && <p className="text-sm text-muted-foreground mt-1">{topic.description}</p>}
      </div>

      {/* Context paragraph */}
      {topic.contextParagraph && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm text-foreground/80 leading-relaxed">
          {topic.contextParagraph}
        </div>
      )}

      {/* Required Resources */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />Required Resources</span>
            <span className="text-xs text-muted-foreground font-normal">{completedRequired}/{requiredResources.length} completed</span>
          </CardTitle>
          {requiredResources.length > 0 && (
            <div className="xp-bar mt-2">
              <div className="xp-bar-fill" style={{ width: `${(completedRequired / requiredResources.length) * 100}%` }} />
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {requiredResources.length === 0 && <p className="text-xs text-muted-foreground">No required resources added yet.</p>}
          {requiredResources.map((r: any) => {
            const meta = RESOURCE_TYPE_META[r.type] ?? { label: r.type, color: "", icon: "📄" };
            return (
              <div key={r.id} className={cn("flex items-start gap-3 p-3 rounded-lg border transition-colors", r.completed ? "border-green-500/20 bg-green-500/5" : "border-border bg-background")}>
                <button
                  className="mt-0.5 shrink-0"
                  onClick={() => toggleResource.mutate({ resourceId: r.id })}
                >
                  {r.completed ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Circle className="w-4 h-4 text-muted-foreground hover:text-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-primary hover:underline flex items-center gap-1">
                      {r.title}<ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded", meta.color)}>{meta.icon} {meta.label}</span>
                    {!r.isFree && <Badge variant="secondary" className="text-xs">Paid</Badge>}
                    {r.estimatedMinutes && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{r.estimatedMinutes}min</span>}
                  </div>
                  {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Optional Resources */}
      {optionalResources.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />Optional Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {optionalResources.map((r: any) => {
              const meta = RESOURCE_TYPE_META[r.type] ?? { label: r.type, color: "", icon: "📄" };
              return (
                <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background">
                  <button className="mt-0.5 shrink-0" onClick={() => toggleResource.mutate({ resourceId: r.id })}>
                    {r.completed ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Circle className="w-4 h-4 text-muted-foreground hover:text-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-primary hover:underline flex items-center gap-1">
                        {r.title}<ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                      <span className={cn("text-xs px-1.5 py-0.5 rounded", meta.color)}>{meta.icon} {meta.label}</span>
                      {!r.isFree && <Badge variant="secondary" className="text-xs">Paid</Badge>}
                      {r.estimatedMinutes && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{r.estimatedMinutes}min</span>}
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Weekly Tasks */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary" />Assignments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(topic.tasks ?? []).length === 0 && <p className="text-xs text-muted-foreground">No tasks assigned yet.</p>}
          {(topic.tasks ?? []).map((task: any) => {
            const milestones = (task.requiredMilestones as string[]) ?? [];
            const dueDate = new Date(task.dueDate);
            const isOverdue = dueDate < new Date();
            const isOpen = expandedTask === task.id;

            return (
              <div key={task.id} className="rounded-lg border border-border bg-background overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
                  onClick={() => setExpandedTask(isOpen ? null : task.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{task.title}</p>
                    {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full border shrink-0", isOverdue ? "status-overdue" : "status-pending")}>
                    {isOverdue ? "Overdue" : `Due ${dueDate.toLocaleDateString()}`}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-border px-4 py-3 space-y-3">
                    {milestones.map(m => {
                      const sub = task.submissions?.find((s: any) => s.milestoneType === m);
                      return (
                        <div key={m}>
                          <p className="text-xs font-semibold text-foreground capitalize mb-1">{m.replace("_", " ")}</p>
                          <SubmitMilestoneForm
                            task={task}
                            milestoneType={m}
                            existingSub={sub}
                            onSuccess={() => setExpandedTask(null)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
