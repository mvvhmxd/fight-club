import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { CheckCircle2, ExternalLink, Flag, Loader2, Star, XCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

function RubricStars({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => onChange(n)} className="transition-colors">
            <Star className={cn("w-4 h-4", n <= value ? "text-amber-400 fill-amber-400" : "text-muted-foreground")} />
          </button>
        ))}
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: any }) {
  const [feedback, setFeedback] = useState("");
  const [codeQuality, setCodeQuality] = useState(0);
  const [problemUnderstanding, setProblemUnderstanding] = useState(0);
  const [documentation, setDocumentation] = useState(0);
  const [flagReason, setFlagReason] = useState("");
  const [showFlag, setShowFlag] = useState(false);
  const utils = trpc.useUtils();

  const submitReview = trpc.reviews.submitReview.useMutation({
    onSuccess: () => { toast.success("Review submitted!"); utils.reviews.myPendingReviews.invalidate(); utils.reviews.myCompletedReviews.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const flagReview = trpc.reviews.flagReview.useMutation({
    onSuccess: () => { toast.success("Review flagged for admin review."); setShowFlag(false); utils.reviews.myPendingReviews.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const sub = review.submission;
  const submitter = review.submitter;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">{submitter?.name ?? "Unknown"}</p>
            <p className="text-xs text-muted-foreground capitalize">{sub?.milestoneType?.replace("_", " ")} · {sub?.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : ""}</p>
          </div>
          <Badge variant="secondary" className="text-xs capitalize">{sub?.milestoneType?.replace("_", " ")}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sub?.githubUrl && (
          <a href={sub.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline font-mono">
            <ExternalLink className="w-4 h-4 shrink-0" />
            <span className="truncate">{sub.githubUrl}</span>
          </a>
        )}
        {sub?.notesContent && (
          <div className="p-3 rounded-md bg-background border border-border text-sm text-foreground/80 max-h-40 overflow-y-auto">
            {sub.notesContent}
          </div>
        )}

        {/* Rubric */}
        <div className="space-y-2 p-3 rounded-lg bg-background border border-border">
          <p className="text-xs font-semibold text-foreground mb-2">Review Rubric</p>
          <RubricStars label="Code Quality" value={codeQuality} onChange={setCodeQuality} />
          <RubricStars label="Problem Understanding" value={problemUnderstanding} onChange={setProblemUnderstanding} />
          <RubricStars label="Documentation" value={documentation} onChange={setDocumentation} />
        </div>

        {/* Feedback */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Feedback (required)</label>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Provide constructive feedback on the submission..."
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none h-24"
          />
        </div>

        {/* Decision buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            disabled={submitReview.isPending || feedback.trim().length < 10}
            onClick={() => submitReview.mutate({ reviewId: review.id, feedback, decision: "approve", codeQuality: codeQuality || undefined, problemUnderstanding: problemUnderstanding || undefined, documentation: documentation || undefined })}
          >
            {submitReview.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            disabled={submitReview.isPending || feedback.trim().length < 10}
            onClick={() => submitReview.mutate({ reviewId: review.id, feedback, decision: "changes_requested", codeQuality: codeQuality || undefined, problemUnderstanding: problemUnderstanding || undefined, documentation: documentation || undefined })}
          >
            Request Changes
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
            disabled={submitReview.isPending || feedback.trim().length < 10}
            onClick={() => submitReview.mutate({ reviewId: review.id, feedback, decision: "reject", codeQuality: codeQuality || undefined, problemUnderstanding: problemUnderstanding || undefined, documentation: documentation || undefined })}
          >
            <XCircle className="w-3.5 h-3.5" />Reject
          </Button>
        </div>

        {/* Flag */}
        {!showFlag ? (
          <button onClick={() => setShowFlag(true)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <Flag className="w-3 h-3" />Flag as unhelpful/inappropriate
          </button>
        ) : (
          <div className="space-y-2">
            <input
              value={flagReason}
              onChange={e => setFlagReason(e.target.value)}
              placeholder="Reason for flagging..."
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-red-400 border-red-500/30" disabled={flagReview.isPending || !flagReason.trim()} onClick={() => flagReview.mutate({ reviewId: review.id, reason: flagReason })}>
                {flagReview.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}Submit Flag
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowFlag(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MyReviews() {
  const { data: pending, isLoading } = trpc.reviews.myPendingReviews.useQuery();
  const { data: completed } = trpc.reviews.myCompletedReviews.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        {[1, 2].map(i => <Skeleton key={i} className="h-64 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Reviews</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Peer reviews assigned to you.</p>
      </div>

      {/* Pending */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          Pending
          {(pending?.length ?? 0) > 0 && <Badge className="bg-primary/20 text-primary border-0 text-xs">{pending?.length}</Badge>}
        </h2>
        {(pending?.length ?? 0) === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-border rounded-lg bg-card">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No pending reviews. You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending?.map(r => <ReviewCard key={r.id} review={r} />)}
          </div>
        )}
      </div>

      {/* Completed */}
      {(completed?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Completed ({completed?.length})</h2>
          <div className="space-y-2">
            {completed?.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                <div className={cn("w-2 h-2 rounded-full shrink-0", r.decision === "approve" ? "bg-green-400" : r.decision === "reject" ? "bg-red-400" : "bg-amber-400")} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Reviewed {r.reviewedAt ? new Date(r.reviewedAt).toLocaleDateString() : ""}</p>
                  <p className="text-sm text-foreground truncate">{r.feedback}</p>
                </div>
                <Badge variant="secondary" className="text-xs capitalize shrink-0">{r.decision?.replace("_", " ")}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
