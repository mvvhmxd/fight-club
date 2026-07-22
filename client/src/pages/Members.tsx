import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { AlertTriangle, Flame, Users } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Members() {
  const { data: users, isLoading } = trpc.admin.listUsers.useQuery();

  if (isLoading) return <div className="space-y-3 max-w-3xl">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Members</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{users?.length ?? 0} members in this cohort.</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Cohort Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {(users ?? []).map((u: any) => (
            <Link key={u.id} href={`/profile/${u.id}`}>
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/30 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-primary">{u.name?.charAt(0)?.toUpperCase() ?? "?"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{u.name ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{u.email ?? ""}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {u.isBlocked && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                  <Badge variant="secondary" className="text-xs capitalize">{u.role}</Badge>
                </div>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
