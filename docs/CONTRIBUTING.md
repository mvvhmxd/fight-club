# Contributing to Fight Club

Thank you for your interest in contributing. Fight Club is an open-source project and welcomes contributions of all kinds — bug fixes, new features, documentation improvements, and design suggestions.

---

## Development Setup

**Prerequisites:** Node.js 22+, pnpm 10+, a MySQL or TiDB database.

```bash
# Clone the repository
git clone https://github.com/mmbalash/fight-club
cd fight-club

# Install dependencies
pnpm install

# Apply the database schema
pnpm db:push

# Start the development server
pnpm dev
```

The development server runs at `http://localhost:3000`. The frontend and backend are served from the same port via Vite's dev proxy.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

See `.env.example` for descriptions of each variable. If you are running on Manus, all variables are injected automatically and you do not need a `.env` file.

---

## Project Conventions

**Schema changes** follow a strict workflow: edit `drizzle/schema.ts`, run `pnpm drizzle-kit generate` to produce migration SQL, then apply it via `pnpm drizzle-kit migrate`. Never edit migration files by hand.

**Backend procedures** live in `server/routers.ts`, split into sub-routers by feature. Keep each sub-router under 150 lines — if it grows beyond that, split it into `server/routers/<feature>.ts`.

**Business logic** belongs in `server/services/`, not inline in procedures. Procedures should be thin: validate input, call a service or db helper, return the result.

**Frontend data fetching** uses tRPC hooks exclusively (`trpc.*.useQuery`, `trpc.*.useMutation`). Do not introduce Axios or raw fetch wrappers.

**Styling** uses Tailwind CSS 4 utility classes with shadcn/ui components. Avoid custom CSS except for global design tokens in `client/src/index.css`. The design language is dark-first, developer-focused, and information-dense — avoid bright gradients, stock photos, and excessive whitespace.

---

## Running Tests

```bash
pnpm test
```

Tests live in `server/*.test.ts`. The test suite covers the accountability service (streak calculation, XP assignment, achievement detection), the auth logout flow, and the GitHub verification service. All new features should include corresponding tests.

---

## Pull Request Guidelines

Before opening a pull request, please ensure the following.

The TypeScript compiler reports no errors (`pnpm check`). The test suite passes (`pnpm test`). Any new database tables or columns include a `tenant_id` column for SaaS-readiness. Any new tRPC procedures are covered by at least one test. The PR description explains what the change does and why.

For significant new features, please open an issue first to discuss the approach before writing code. This avoids wasted effort if the feature direction needs adjustment.

---

## Roadmap Items Open for Contribution

The following features are designed but not yet built. They are good candidates for first contributions.

**Discussion sessions** — Threaded comments per topic so members can ask questions and share notes. The schema already has a placeholder; the feature needs a tRPC router, a database table, and a UI component.

**Accountability partner matching** — Pair members automatically based on stage proximity and submission history. Pairs receive each other's weekly check-ins and can send encouragement messages.

**Weekly cohort digest email** — A weekly summary sent to all members showing the leaderboard, who submitted what, and any members who are blocked. Requires an email provider integration.

**Anonymous review mode** — An admin toggle that hides reviewer identities from submitters until after the review is complete. Reduces social pressure in small groups.

---

## Code of Conduct

Be respectful. Disagreements about technical approach are fine; personal attacks are not. This project follows the [Contributor Covenant](https://www.contributor-covenant.org/) code of conduct.
