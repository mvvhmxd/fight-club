import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, Loader2, Shield } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function AdminBlocked() {
  const { data: blocked, isLoading, refetch } = trpc.admin.listBlocked.useQuery();
  const { data: allSubs } = trpc.submissions.mySubmissions.useQuery();
  const [excuseData, setExcuseData] = useState<Record<string, { submissionId: string; reason: string }>>({});

  const grantExcuse = trpc.admin.grantExcuse.useMutation({
    onSuccess: () => { toast.success("Excuse granted. Member unblocked."); refetch(); },
    onError: e => toast.error(e.message),
  });

  const processOverdue = trpc.admin.processOverdue.useMutation({
    onSuccess: (d) => { toast.success(`Processed ${d.processed} overdue submissions.`); refetch(); },
    onError: e => toast.error(e.message),
  });

  if (isLoading) return <div className="space-y-3 max-w-2xl">{[1,2].map(i => <Skeleton key={i} className="h-32 rounded-lg" />)}</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Blocked Members</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{blocked?.length ?? 0} members currently blocked.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => processOverdue.mutate()} disabled={processOverdue.isPending}>
          {processOverdue.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
          Process Overdue Now
        </Button>
      </div>

      {(blocked?.length ?? 0) === 0 ? (
        <div className="text-center py-16 border border-border rounded-lg bg-card text-muted-foreground">
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-40 text-green-400" />
          <p className="text-sm">No blocked members. Everyone is on track!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(blocked ?? []).map((u: any) => {
            const userExcuse = excuseData[u.id] ?? { submissionId: "", reason: "" };
            return (
              <Card key={u.id} className="bg-card border-red-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    {u.name ?? "Unknown"}
                    <span className="text-muted-foreground font-normal text-xs">{u.email}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Grant an excuse to unblock this member. Their streak will not be restored.
                    You need the overdue submission ID to proceed.
                  </p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Overdue Submission ID</label>
                      <input
                        value={userExcuse.submissionId}
                        onChange={e => setExcuseData(p => ({ ...p, [u.id]: { ...userExcuse, submissionId: e.target.value } }))}
                        placeholder="e.g. sub_abc123..."
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Reason for excuse</label>
                      <textarea
                        value={userExcuse.reason}
                        onChange={e => setExcuseData(p => ({ ...p, [u.id]: { ...userExcuse, reason: e.target.value } }))}
                        placeholder="e.g. Medical emergency, travel, etc."
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none h-16"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="gap-2"
                      disabled={grantExcuse.isPending || !userExcuse.submissionId.trim() || userExcuse.reason.trim().length < 5}
                      onClick={() => grantExcuse.mutate({ submissionId: userExcuse.submissionId, reason: userExcuse.reason })}
                    >
                      {grantExcuse.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Grant Excuse & Unblock
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
