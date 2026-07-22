import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { AlertTriangle, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function AdminMembers() {
  const { data: users, isLoading, refetch } = trpc.admin.listUsers.useQuery();
  const updateRole = trpc.admin.updateUserRole.useMutation({ onSuccess: () => { toast.success("Role updated"); refetch(); }, onError: e => toast.error(e.message) });

  if (isLoading) return <div className="space-y-3 max-w-4xl">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Members</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{users?.length ?? 0} total members</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">All Members</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 text-xs text-muted-foreground font-medium">Name</th>
                <th className="pb-2 text-xs text-muted-foreground font-medium">Email</th>
                <th className="pb-2 text-xs text-muted-foreground font-medium">Role</th>
                <th className="pb-2 text-xs text-muted-foreground font-medium">Status</th>
                <th className="pb-2 text-xs text-muted-foreground font-medium">XP</th>
                <th className="pb-2 text-xs text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {(users ?? []).map((u: any) => (
                <tr key={u.id}>
                  <td className="py-3 font-medium text-foreground">{u.name ?? "-"}</td>
                  <td className="py-3 text-muted-foreground text-xs">{u.email ?? "-"}</td>
                  <td className="py-3"><Badge variant="secondary" className="text-xs capitalize">{u.role}</Badge></td>
                  <td className="py-3">
                    {u.isBlocked ? (
                      <span className="flex items-center gap-1 text-xs text-red-400"><AlertTriangle className="w-3 h-3" />Blocked</span>
                    ) : (
                      <span className="text-xs text-green-400">Active</span>
                    )}
                  </td>
                  <td className="py-3 font-mono text-xs text-foreground">{u.xp ?? 0}</td>
                  <td className="py-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7"
                      disabled={updateRole.isPending}
                      onClick={() => updateRole.mutate({ userId: u.id, role: u.role === "admin" ? "member" : "admin" })}
                    >
                      {u.role === "admin" ? "Demote" : "Make Admin"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
