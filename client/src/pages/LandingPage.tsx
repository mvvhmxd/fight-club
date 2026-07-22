import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import {
  Swords, Flame, BookOpen, Users, Trophy, Shield,
  MessageSquareOff, CheckCircle2, GitBranch, Zap,
} from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [loading, isAuthenticated]);

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Nav */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <Swords className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-foreground">Fight Club</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/mvvhmxd/fight-club"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          >
            GitHub
          </a>
          <Button onClick={() => startLogin()} size="sm">
            Sign in
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center py-16 md:py-24">

        {/* Problem statement badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium mb-8">
          <MessageSquareOff className="w-3.5 h-3.5" />
          You know the feeling — the group chat is dead again
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-6 leading-tight max-w-3xl">
          Study with your friends.<br />
          <span className="text-primary">Actually finish this time.</span>
        </h1>

        {/* Sub-headline */}
        <p className="text-base md:text-lg text-muted-foreground mb-4 max-w-2xl">
          You and your friends want to study together. You make a group chat.
          Everyone's hyped for two weeks. Then life happens, the chat goes quiet, and six months
          later nobody finished anything.
        </p>
        <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-2xl">
          <strong className="text-foreground">Fight Club replaces the group chat.</strong> It gives your study group
          a shared curriculum, weekly tasks with real deadlines, peer code reviews, and a streak
          system that makes it genuinely uncomfortable to fall behind.
        </p>

        <Button size="lg" onClick={() => startLogin()} className="px-10 text-base h-12">
          Start your study group
        </Button>
        <p className="text-xs text-muted-foreground mt-3">Free to self-host · Open source</p>

        {/* How it works */}
        <div className="mt-20 w-full max-w-4xl text-left">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 text-center mb-8">
            How it works
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Admin builds the curriculum",
                desc: "One person sets up the roadmap — stages, topics, and curated resources (papers, videos, books, courses). Everyone studies the same material in the same order.",
              },
              {
                step: "02",
                title: "Everyone submits weekly",
                desc: "Each week has tasks: reading notes, a quiz, a coding project. Self-study tasks are self-approved. Code goes to a peer for review. Miss the deadline and you're blocked.",
              },
              {
                step: "03",
                title: "The group keeps each other honest",
                desc: "Streaks, XP, and a leaderboard make progress visible. Peer reviews keep quality high. The blocked state makes it impossible to ghost the group without anyone noticing.",
              },
            ].map((s) => (
              <div key={s.step} className="p-5 rounded-xl bg-card border border-border">
                <p className="text-3xl font-bold text-primary/30 font-mono mb-3">{s.step}</p>
                <p className="text-sm font-semibold text-foreground mb-2">{s.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Problem vs solution */}
        <div className="mt-16 w-full max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Before */}
            <div className="p-5 rounded-xl bg-red-500/5 border border-red-500/20 text-left">
              <p className="text-xs font-semibold uppercase tracking-widest text-red-400/70 mb-4">Without Fight Club</p>
              <div className="space-y-3">
                {[
                  "\"We should study together\" → group chat created",
                  "Week 1: everyone's active and excited",
                  "Week 3: two people dropped off, nobody said anything",
                  "Week 6: chat is muted, you're studying alone again",
                  "Month 3: the group chat is a meme channel now",
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-red-400/60 text-xs mt-0.5 shrink-0">✕</span>
                    <p className="text-xs text-muted-foreground">{t}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* After */}
            <div className="p-5 rounded-xl bg-green-500/5 border border-green-500/20 text-left">
              <p className="text-xs font-semibold uppercase tracking-widest text-green-400/70 mb-4">With Fight Club</p>
              <div className="space-y-3">
                {[
                  "Admin sets up the curriculum once",
                  "Everyone sees the same roadmap and weekly tasks",
                  "Miss a deadline → blocked until you submit",
                  "Code submissions go to a peer for review",
                  "Streaks, XP, and leaderboard keep everyone moving",
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Features grid */}
        <div className="mt-16 w-full max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 text-center mb-8">
            Everything your study group needs
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-left">
            {[
              {
                icon: <BookOpen className="w-4 h-4 text-primary" />,
                title: "Structured Curriculum",
                desc: "Ordered stages and topics with curated resources — papers, videos, books, courses. Everyone studies the same thing in the same order.",
              },
              {
                icon: <Users className="w-4 h-4 text-green-400" />,
                title: "Peer Code Reviews",
                desc: "Coding submissions get assigned to a peer reviewer with a rubric. Approve, request changes, or reject — with written feedback.",
              },
              {
                icon: <Flame className="w-4 h-4 text-amber-400" />,
                title: "Streak System",
                desc: "Weekly streaks that grow when you submit on time and reset when you miss. One freeze per month for life emergencies.",
              },
              {
                icon: <Shield className="w-4 h-4 text-red-400" />,
                title: "Hard Blocking",
                desc: "Overdue submissions block all new work until resolved or excused by an admin. No ghosting allowed.",
              },
              {
                icon: <Trophy className="w-4 h-4 text-yellow-400" />,
                title: "XP & Leaderboard",
                desc: "Earn XP for every submission and review. Compete on the weekly leaderboard. Achievements for milestones.",
              },
              {
                icon: <GitBranch className="w-4 h-4 text-blue-400" />,
                title: "GitHub Verification",
                desc: "Coding submissions require a public GitHub repo URL. The system verifies it exists and has commits before accepting.",
              },
              {
                icon: <Zap className="w-4 h-4 text-purple-400" />,
                title: "Activity Heatmap",
                desc: "A GitHub-style contribution grid showing your submission activity. Makes progress (and inactivity) impossible to hide.",
              },
              {
                icon: <CheckCircle2 className="w-4 h-4 text-teal-400" />,
                title: "Weekly Check-ins",
                desc: "Set a goal at the start of each week. A simple ritual that keeps intentions visible to the whole group.",
              },
              {
                icon: <Swords className="w-4 h-4 text-primary" />,
                title: "Admin Controls",
                desc: "Manage curriculum, assign weekly tasks, grant excuses to blocked members, and promote members to admin.",
              },
            ].map((f, i) => (
              <div key={i} className="p-4 rounded-lg bg-card border border-border">
                <div className="mb-2">{f.icon}</div>
                <p className="text-sm font-semibold text-foreground mb-1">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 p-8 md:p-12 rounded-2xl bg-card border border-border w-full max-w-2xl text-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Swords className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Ready to actually finish?</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Self-host Fight Club for free in under 10 minutes, or fork it on GitHub and make it your own.
            No credit card, no vendor lock-in.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => startLogin()} className="px-8">
              Sign in to get started
            </Button>
            <Button size="lg" variant="outline" className="px-8" asChild>
              <a href="https://github.com/mvvhmxd/fight-club" target="_blank" rel="noopener noreferrer">
                View on GitHub
              </a>
            </Button>
          </div>
        </div>

      </main>

      <footer className="border-t border-border px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
            <Swords className="w-3 h-3 text-primary" />
          </div>
          <span>Fight Club — Open source peer study group tool</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="https://github.com/mvvhmxd/fight-club" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
          <a href="https://github.com/mvvhmxd/fight-club/blob/main/docs/DEPLOYMENT.md" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Deploy Guide</a>
        </div>
      </footer>
    </div>
  );
}
