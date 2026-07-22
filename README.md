<div align="center">
  <h1>⚔️ Fight Club</h1>
  <p><strong>You and your friends want to study together. You make a group chat.<br>Everyone's hyped for two weeks. Then life happens, the chat goes quiet,<br>and six months later nobody finished anything.</strong></p>
  <p>Fight Club replaces the group chat.</p>
  <p>
    <a href="https://fightclub.manus.space">Live Demo</a> ·
    <a href="docs/DEPLOYMENT.md">Deploy Guide</a> ·
    <a href="docs/ARCHITECTURE.md">Architecture</a> ·
    <a href="docs/CONTRIBUTING.md">Contributing</a>
  </p>
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" />
  <img src="https://img.shields.io/badge/node-%3E%3D22-green" alt="Node 22+" />
  <img src="https://img.shields.io/badge/stack-React%2019%20%2B%20tRPC%2011%20%2B%20Drizzle-purple" alt="Stack" />
</div>

---

## The Problem

Informal study groups fail for a predictable set of reasons. There is no shared definition of what "done" looks like for a given week. Progress is invisible — nobody knows if their friends are ahead or behind. There is no social cost to going quiet. And there is no structure for giving or receiving feedback on actual work.

Group chats are great for coordination but terrible for accountability. Fight Club is built specifically to solve the accountability problem.

---

## How It Works

The workflow has three roles: **admin**, **member**, and **reviewer** (any member can be a reviewer).

**Admins** build the curriculum once: ordered stages containing topics, each with curated resources (papers, videos, books, courses, docs), estimated reading times, and context paragraphs explaining why each topic matters. Admins also create weekly tasks that assign specific milestones to the group.

**Members** browse the curriculum, mark resources as read, and submit weekly task milestones. Self-study milestones (reading notes, quizzes) are self-approved. Coding and project milestones require a public GitHub repo URL and go to a peer reviewer. Miss a deadline and you are hard-blocked from submitting new work until the overdue item is resolved or an admin grants an excuse.

**Reviewers** are automatically assigned from members who have already completed the same topic. They review submissions against a structured rubric and can approve, request changes, or reject with written feedback.

---

## Features

| Category | Feature |
|---|---|
| **Curriculum** | Ordered stages → topics → resources with type tags (article/video/book/course/paper/docs), estimated time, free/paid flag, and admin context paragraph |
| **Submissions** | Self-approve (reading, notes, quiz) or peer review (coding, project with GitHub URL verification) |
| **Peer Review** | Structured rubric scoring, approve / request changes / reject, flag unhelpful reviews |
| **Accountability** | Weekly streaks, hard blocking on overdue, one streak freeze per month, daily cron job |
| **Gamification** | XP system, weekly leaderboard, achievement badges, GitHub-style activity heatmap |
| **Social** | Member directory, public profiles, weekly check-ins |
| **Admin** | Curriculum editor with drag-to-reorder, inline rename, context paragraph editor, weekly task assignment, excuse management |
| **Mobile** | Fully responsive — hamburger menu + slide-out drawer on mobile |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Tailwind CSS 4, shadcn/ui, Wouter, Framer Motion |
| **Backend** | Express 4, tRPC 11 (end-to-end type safety) |
| **Database** | MySQL / PostgreSQL via Drizzle ORM |
| **Auth** | Google OAuth 2.0 + JWT session cookies |
| **Validation** | Zod 4 |
| **Testing** | Vitest |
| **Scheduling** | node-cron (daily overdue processor) |
| **Email** | Nodemailer (optional SMTP notifications) |
| **Build** | Vite 7, esbuild, TypeScript 5.9 |

The schema includes a `tenant_id` column on every table, making the architecture SaaS-ready for future multi-tenancy without a database rewrite.

---

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10+ (`npm install -g pnpm`)
- A MySQL or PostgreSQL database (local or hosted — see [Deployment Guide](docs/DEPLOYMENT.md))
- A Google OAuth 2.0 app (see [Setting up Google OAuth](#setting-up-google-oauth))

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/fight-club
cd fight-club

# Install dependencies
pnpm install

# Copy the example environment file
cp env.example .env
# Edit .env with your database URL, Google OAuth credentials, and JWT secret

# Apply the database schema
pnpm db:push

# Start the development server
pnpm dev
```

The app runs at `http://localhost:3000`.

### Setting up Google OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).
3. Navigate to **APIs & Services → Credentials**.
4. Click **Create Credentials → OAuth 2.0 Client ID**.
5. Set the application type to **Web application**.
6. Add `http://localhost:3000/api/auth/google/callback` to **Authorized redirect URIs** (for development). For production, add your production URL.
7. Copy the **Client ID** and **Client Secret** into your `.env` file.

### Promoting yourself to admin

After signing in for the first time, run this SQL against your database to promote your account:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

Or set `OWNER_EMAIL=your@email.com` in your `.env` — this email is automatically promoted to admin on first login.

---

## Project Structure

```
fight-club/
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── pages/           # Page-level components
│       │   └── admin/       # Admin-only pages
│       ├── components/      # Reusable UI components
│       └── index.css        # Global dark theme tokens
├── server/                  # Express backend
│   ├── routers.ts           # All tRPC procedures
│   ├── db.ts                # Database query helpers
│   ├── scheduledOverdue.ts  # Daily cron handler (node-cron)
│   └── services/
│       ├── accountability.ts # Streak, XP, achievement logic
│       └── github.ts        # GitHub repo verification
├── drizzle/
│   └── schema.ts            # Full database schema (14 tables)
├── shared/                  # Types shared between client and server
└── docs/                    # Documentation
    ├── DEPLOYMENT.md        # Self-hosting guide
    ├── ARCHITECTURE.md      # System design and data model
    └── CONTRIBUTING.md      # How to contribute
```

---

## Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for the full guide covering Railway, Render, Fly.io, and Docker Compose.

---

## Environment Variables

Copy `env.example` to `.env` and fill in the values. The table below describes each variable.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | MySQL or PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for signing session cookies. Use `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth 2.0 client secret |
| `APP_URL` | Yes | Full URL of your deployed app (e.g. `https://fightclub.example.com`) |
| `OWNER_EMAIL` | Recommended | Email auto-promoted to admin on first login |
| `SMTP_HOST` | Optional | SMTP server hostname for email notifications |
| `SMTP_PORT` | Optional | SMTP port (default: 587) |
| `SMTP_USER` | Optional | SMTP username |
| `SMTP_PASS` | Optional | SMTP password |
| `SMTP_FROM` | Optional | From address for notification emails |
| `OVERDUE_CRON` | Optional | Cron expression for overdue check (default: `0 0 * * *` = midnight UTC) |

---

## Contributing

See **[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)**. Pull requests are welcome.

---

## Roadmap

The following features are designed but not yet built.

**Near-term:** Discussion sessions per topic, accountability partner matching, weekly cohort digest email, anonymous review mode.

**SaaS tier (multi-tenant):** Tenant onboarding flow, per-tenant curriculum templates, billing and subscription management, team analytics dashboard.

---

## License

MIT — free to use, modify, and self-host. See [LICENSE](LICENSE).
