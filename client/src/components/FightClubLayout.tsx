import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, BookOpen, Flame, GitBranch, LayoutDashboard,
  ListChecks, LogOut, Menu, Shield, Swords, Trophy, User, Users, X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface NavItemProps {
  href: string;
  icon: ReactNode;
  label: string;
  badge?: number;
  onClick?: () => void;
}

function NavItem({ href, icon, label, badge, onClick }: NavItemProps) {
  const [location] = useLocation();
  const isActive = location === href || (href !== "/dashboard" && location.startsWith(href));
  return (
    <Link href={href} onClick={onClick}>
      <div className={cn("nav-item", isActive && "active")}>
        <span className="shrink-0 w-4 h-4">{icon}</span>
        <span className="flex-1 truncate">{label}</span>
        {badge !== undefined && badge > 0 && (
          <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0 h-5 bg-primary/20 text-primary border-0">
            {badge}
          </Badge>
        )}
      </div>
    </Link>
  );
}

interface SidebarContentProps {
  user: any;
  streak: any;
  isBlocked: boolean;
  isAdmin: boolean;
  pendingCount: number;
  blockedCount: number;
  onNavClick?: () => void;
  onLogout: () => void;
}

function SidebarContent({
  user, streak, isBlocked, isAdmin, pendingCount, blockedCount, onNavClick, onLogout,
}: SidebarContentProps) {
  return (
    <>
      {/* Streak widget */}
      {streak && (
        <div className="mx-3 mt-3 px-3 py-2.5 rounded-md bg-card border border-border">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 streak-fire shrink-0" />
            <span className="text-sm font-semibold text-foreground">{streak.currentStreakWeeks}w streak</span>
            {(user as any)?.streakFreezeCount > 0 && (
              <Tooltip>
                <TooltipTrigger>
                  <Shield className="w-3.5 h-3.5 text-blue-400 ml-auto" />
                </TooltipTrigger>
                <TooltipContent>Streak freeze available</TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">Best: {streak.longestStreakWeeks}w</div>
        </div>
      )}

      {/* Blocked banner */}
      {isBlocked && (
        <div className="mx-3 mt-2 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span className="text-xs text-red-400 font-medium">Submissions blocked</span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto min-h-0">
        <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mt-1">Member</p>
        <NavItem href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" onClick={onNavClick} />
        <NavItem href="/curriculum" icon={<BookOpen className="w-4 h-4" />} label="Curriculum" onClick={onNavClick} />
        <NavItem href="/reviews" icon={<ListChecks className="w-4 h-4" />} label="My Reviews" badge={pendingCount} onClick={onNavClick} />
        <NavItem href="/progress" icon={<GitBranch className="w-4 h-4" />} label="Progress" onClick={onNavClick} />
        <NavItem href="/leaderboard" icon={<Trophy className="w-4 h-4" />} label="Leaderboard" onClick={onNavClick} />

        <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mt-3">Cohort</p>
        <NavItem href="/members" icon={<Users className="w-4 h-4" />} label="Members" onClick={onNavClick} />
        <NavItem href={`/profile/${user?.id}`} icon={<User className="w-4 h-4" />} label="My Profile" onClick={onNavClick} />

        {isAdmin && (
          <>
            <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mt-3">Admin</p>
            <NavItem href="/admin/members" icon={<Users className="w-4 h-4" />} label="Members" onClick={onNavClick} />
            <NavItem href="/admin/curriculum" icon={<BookOpen className="w-4 h-4" />} label="Curriculum" onClick={onNavClick} />
            <NavItem href="/admin/tasks" icon={<ListChecks className="w-4 h-4" />} label="Weekly Tasks" onClick={onNavClick} />
            <NavItem href="/admin/blocked" icon={<AlertTriangle className="w-4 h-4" />} label="Blocked" badge={blockedCount} onClick={onNavClick} />
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-border px-3 py-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-primary">
              {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{user?.name ?? "User"}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{user?.role ?? "member"}</p>
          </div>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground" onClick={onLogout}>
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </>
  );
}

interface FightClubLayoutProps {
  children: ReactNode;
}

export default function FightClubLayout({ children }: FightClubLayoutProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: progressData } = trpc.progress.myProgress.useQuery(undefined, { enabled: isAuthenticated });
  const { data: pendingReviews } = trpc.reviews.myPendingReviews.useQuery(undefined, { enabled: isAuthenticated });
  const { data: blockedUsers } = trpc.admin.listBlocked.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => { window.location.href = "/"; } });

  const streak = progressData?.streak;
  const pendingCount = pendingReviews?.length ?? 0;
  const blockedCount = blockedUsers?.length ?? 0;
  const isAdmin = user?.role === "admin";
  const isBlocked = (user as any)?.isBlocked;

  // Close mobile drawer on route change
  const [location] = useLocation();
  useEffect(() => { setMobileOpen(false); }, [location]);

  useEffect(() => {
    if (!loading && !isAuthenticated) startLogin();
  }, [loading, isAuthenticated]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="hidden md:flex w-60 border-r border-border bg-sidebar flex-col gap-2 p-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-md" />)}
        </div>
        <div className="flex-1 p-4 md:p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const sidebarProps: SidebarContentProps = {
    user, streak, isBlocked, isAdmin, pendingCount, blockedCount,
    onLogout: () => logout.mutate(),
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-border bg-sidebar flex-col min-h-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border shrink-0">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
            <Swords className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm text-foreground">Fight Club</span>
        </div>
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* ── Mobile overlay backdrop ──────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile slide-out drawer ──────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-border flex flex-col min-h-0 transition-transform duration-300 ease-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
              <Swords className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm text-foreground">Fight Club</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <SidebarContent {...sidebarProps} onNavClick={() => setMobileOpen(false)} />
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-sidebar shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Swords className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm text-foreground">Fight Club</span>
          </div>
          {pendingCount > 0 && (
            <Badge className="ml-auto bg-primary/20 text-primary border-0 text-xs">{pendingCount}</Badge>
          )}
        </header>

        <main className="flex-1 overflow-y-auto">
          {/* Blocked banner */}
          {isBlocked && (
            <div className="bg-red-500/10 border-b border-red-500/20 px-4 md:px-6 py-3 flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-400 font-medium flex-1 min-w-0">
                You have overdue submissions. New work is blocked.
              </p>
              <Link href="/progress" className="text-xs text-red-400 underline underline-offset-2 hover:text-red-300 shrink-0">
                View
              </Link>
            </div>
          )}
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
