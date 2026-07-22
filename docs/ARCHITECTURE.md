# Architecture

This document describes the system design, data model, and key architectural decisions in Fight Club.

---

## Overview

Fight Club is a monorepo full-stack web application with a React frontend, an Express backend, and a MySQL/TiDB database. The frontend and backend share types end-to-end via tRPC, eliminating the need for a separate API contract layer.

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React 19 + Tailwind 4 + tRPC client)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │Dashboard │ │Curriculum│ │ Reviews  │ │  Admin Panel     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ tRPC over HTTP (/api/trpc)
┌────────────────────────▼────────────────────────────────────────┐
│  Express Server                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  tRPC Router (routers.ts)                                │   │
│  │  curriculum · submissions · reviews · progress           │   │
│  │  leaderboard · checkIn · admin · cron                    │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│  ┌──────────────────────▼───────────────────────────────────┐   │
│  │  Services                                                │   │
│  │  accountability.ts  ·  github.ts                        │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│  ┌──────────────────────▼───────────────────────────────────┐   │
│  │  db.ts (Drizzle ORM query helpers)                       │   │
│  └──────────────────────┬───────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│  MySQL / TiDB (14 tables, all with tenant_id)                    │
└─────────────────────────────────────────────────────────────────┘

External:
  Manus OAuth  ──► /api/oauth/callback
  GitHub API   ──► github.ts (repo verification)
  Heartbeat    ──► POST /api/scheduled/overdue (daily midnight UTC)
```

---

## Key Design Decisions

### tRPC for end-to-end type safety

All API communication goes through tRPC procedures defined in `server/routers.ts`. The frontend imports the `AppRouter` type directly, so TypeScript catches mismatches between what the server returns and what the client expects at compile time — no OpenAPI spec, no code generation, no drift.

### Drizzle ORM over raw SQL

The original project used raw SQL with string interpolation. Fight Club replaces this with Drizzle ORM, which provides type-safe query builders, automatic migration generation, and a schema-first workflow. The schema in `drizzle/schema.ts` is the single source of truth for both the TypeScript types and the database structure.

### SaaS-ready `tenant_id` on every table

Every table includes a `tenant_id` column that defaults to `"default"`. This means the application can be converted to multi-tenant SaaS by enforcing tenant isolation at the query layer — without a database schema rewrite. The `tenants` table already exists to hold cohort/organization metadata.

### Service layer separation

Business logic is separated from tRPC procedures into `server/services/`. The `accountability.ts` service owns streak calculation, XP assignment, achievement detection, and block status management. The `github.ts` service owns GitHub repo verification. This makes the logic independently testable and reusable across procedures.

### Heartbeat for scheduled work

The overdue submission processor runs as a Manus Heartbeat job — a platform-managed HTTP cron that POSTs to `/api/scheduled/overdue` daily at midnight UTC. This is preferable to in-process timers (`setInterval`, `node-cron`) which do not survive serverless cold starts. The handler is idempotent and authenticated via the Manus cron identity system.

---

## Data Flow: Submission Lifecycle

```
Member submits work
        │
        ▼
submissions.status = "submitted"
        │
        ├─ Self-approve type (reading, notes, quiz)?
        │         │
        │         ▼
        │   status = "approved"
        │   accountability.ts:
        │     - award XP
        │     - check streak
        │     - check achievements
        │
        └─ Peer review type (coding, project)?
                  │
                  ▼
            GitHub URL verified
                  │
                  ▼
            Reviewer auto-assigned
            (prefers: completed same topic → same stage → any member)
                  │
                  ▼
            status = "in_review"
                  │
                  ├─ Reviewer approves
                  │         │
                  │         ▼
                  │   status = "approved"
                  │   accountability.ts: XP + streak + achievements
                  │
                  ├─ Reviewer requests changes
                  │         │
                  │         ▼
                  │   status = "changes_requested"
                  │   Member resubmits → back to "in_review"
                  │
                  └─ Reviewer rejects
                            │
                            ▼
                      status = "rejected"
                      Member must resubmit

Daily cron (midnight UTC):
  submitted/in_review past due_date → status = "overdue"
  affected users → is_blocked = true
  Admin can grant excuse → is_blocked = false (streak not restored)
```

---

## Streak Calculation

Streaks are calculated weekly. A "week" is defined as the ISO week number (Monday–Sunday UTC).

A streak **increments** when a member has at least one approved submission in a given week and the previous week also had an approved submission (or it is the member's first week).

A streak **resets to zero** when a member has no approved submissions in a week and has not used a streak freeze for that week.

The `streaks` table stores `currentStreakWeeks`, `longestStreakWeeks`, `lastActiveWeek`, and `streakFreezeCount`. Freeze count resets to 1 at the start of each calendar month.

---

## XP Values

| Action | XP |
|---|---|
| Self-approve milestone (reading, notes, quiz) | +10 |
| Coding/project submission approved | +25 |
| Peer review given | +15 |
| Stage completed | +50 |
| Achievement unlocked | +5 |

XP is stored cumulatively on the `users` table and snapshotted weekly in `weeklyXp` for leaderboard calculation.

---

## Authentication

Fight Club uses Manus OAuth. The OAuth flow completes at `/api/oauth/callback`, which sets a signed JWT session cookie. Every tRPC request builds context via `server/_core/context.ts`, which verifies the cookie and injects `ctx.user`. Protected procedures use `protectedProcedure`; admin-only procedures add a role check middleware.

The `OWNER_OPEN_ID` environment variable is used to auto-promote the project owner to admin on first login, so no manual database edit is needed for the initial setup.

---

## File Structure Reference

```
server/
  routers.ts              ← All tRPC procedures (split into sub-routers)
  db.ts                   ← Drizzle query helpers (one function per query)
  scheduledOverdue.ts     ← POST /api/scheduled/overdue handler
  services/
    accountability.ts     ← Streak, XP, achievement, block logic
    github.ts             ← GitHub repo URL verification
  _core/                  ← Framework plumbing (do not edit)
    index.ts              ← Express server entry point
    context.ts            ← tRPC context builder
    sdk.ts                ← Manus OAuth + cron authentication
    heartbeat.ts          ← Heartbeat SDK (create/update/delete cron jobs)
    notification.ts       ← Owner notification helper

client/src/
  pages/
    LandingPage.tsx       ← Public landing page
    Dashboard.tsx         ← Member dashboard (streak, tasks, heatmap)
    Curriculum.tsx        ← Stage/topic browser
    TopicDetail.tsx       ← Topic resources + submission forms
    MyReviews.tsx         ← Reviewer queue + rubric
    Progress.tsx          ← Personal stats, achievements, history
    Leaderboard.tsx       ← Weekly XP leaderboard
    Members.tsx           ← Cohort member directory
    Profile.tsx           ← Public member profile
    admin/
      AdminCurriculum.tsx ← Drag-to-reorder curriculum editor
      AdminTasks.tsx      ← Weekly task creation and assignment
      AdminMembers.tsx    ← Member management and role assignment
      AdminBlocked.tsx    ← Blocked member list + excuse granting
  components/
    FightClubLayout.tsx   ← Sidebar layout with mobile drawer

drizzle/
  schema.ts               ← Single source of truth for all 14 tables
```
