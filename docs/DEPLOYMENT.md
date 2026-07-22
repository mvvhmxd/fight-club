# Deployment Guide

This guide covers deploying Fight Club to production. The app is a standard Node.js web server with a MySQL/PostgreSQL database — it runs anywhere Node.js runs.

---

## Prerequisites

Before deploying, you need:

1. A **Google OAuth 2.0 app** — see [Setting up Google OAuth](#setting-up-google-oauth)
2. A **MySQL or PostgreSQL database** — see [Database options](#database-options)
3. A **JWT secret** — generate one with `openssl rand -base64 32`

---

## Setting up Google OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. Navigate to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**.
3. Set the application type to **Web application**.
4. Add your production callback URL to **Authorized redirect URIs**: `https://your-domain.com/api/auth/google/callback`
5. Copy the **Client ID** and **Client Secret** — you will need them as environment variables.

---

## Database Options

Fight Club uses Drizzle ORM with MySQL dialect by default. Any MySQL-compatible database works.

| Provider | Notes |
|---|---|
| **PlanetScale** | Serverless MySQL, generous free tier |
| **Railway MySQL** | Simple managed MySQL, works well with Railway deployment |
| **Neon** | PostgreSQL — change `dialect: "mysql"` to `dialect: "postgresql"` in `drizzle.config.ts` |
| **Supabase** | PostgreSQL — same note as Neon |
| **Self-hosted MySQL** | Any MySQL 8+ instance |

---

## Option 1: Railway (Recommended)

Railway is the simplest deployment option — it handles the database, environment variables, and deploys from GitHub automatically.

**Step 1** — Go to [railway.app](https://railway.app), create a new project, and add a **MySQL** database service.

**Step 2** — Add a new service, choose **Deploy from GitHub repo**, and select your fork.

**Step 3** — In the service settings, add these environment variables:

```
DATABASE_URL=         (copy from the MySQL service connection string)
JWT_SECRET=           (openssl rand -base64 32)
GOOGLE_CLIENT_ID=     (from Google Cloud Console)
GOOGLE_CLIENT_SECRET= (from Google Cloud Console)
APP_URL=              (your Railway URL, e.g. https://fight-club.up.railway.app)
OWNER_EMAIL=          (your email — auto-promoted to admin)
```

**Step 4** — Apply the schema (run once, locally with the production DATABASE_URL):

```bash
DATABASE_URL="your-production-url" pnpm db:push
```

**Step 5** — Add your Railway URL to Google OAuth authorized redirect URIs: `https://your-app.up.railway.app/api/auth/google/callback`

---

## Option 2: Render

1. Create a new **Web Service** on [render.com](https://render.com) connected to your GitHub repo.
2. Set build command: `pnpm install && pnpm build`
3. Set start command: `pnpm start`
4. Add a **PostgreSQL** database (update `drizzle.config.ts` dialect to `"postgresql"`).
5. Set the same environment variables as listed above.

---

## Option 3: Fly.io

```bash
# Install Fly CLI and login
curl -L https://fly.io/install.sh | sh && fly auth login

# Launch the app
cd fight-club && fly launch

# Set secrets
fly secrets set JWT_SECRET="$(openssl rand -base64 32)"
fly secrets set GOOGLE_CLIENT_ID="your-client-id"
fly secrets set GOOGLE_CLIENT_SECRET="your-client-secret"
fly secrets set APP_URL="https://your-app.fly.dev"
fly secrets set OWNER_EMAIL="your@email.com"
fly secrets set DATABASE_URL="your-database-url"

# Deploy
fly deploy
```

---

## Option 4: Docker Compose (Self-hosted)

Create a `docker-compose.yml`:

```yaml
version: "3.9"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: mysql://fight_club:password@db:3306/fight_club
      JWT_SECRET: ${JWT_SECRET}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      APP_URL: ${APP_URL}
      OWNER_EMAIL: ${OWNER_EMAIL}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: fight_club
      MYSQL_USER: fight_club
      MYSQL_PASSWORD: password
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  mysql_data:
```

Create a `Dockerfile`:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```bash
docker compose up -d
```

---

## Post-deployment

**Promote yourself to admin**

Set `OWNER_EMAIL=your@email.com` in your environment variables — this email is automatically promoted to admin on first login. Alternatively, run:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

**Verify the cron job**

The daily overdue processor runs automatically via `node-cron` when the server starts. Check your logs for:

```
[Cron] Overdue processor scheduled: "0 0 * * *" (UTC)
```

Override the schedule with `OVERDUE_CRON=0 * * * *` (e.g., hourly) in your environment.

---

## Troubleshooting

**"redirect_uri_mismatch" from Google** — The callback URL in Google Cloud Console must exactly match `APP_URL + /api/auth/google/callback`. No trailing slashes, correct protocol.

**Database connection errors** — Verify `DATABASE_URL` is correct and the database is reachable. For PlanetScale, add `?ssl={"rejectUnauthorized":true}` to the connection string.

**Admin section not visible** — Set `OWNER_EMAIL` to your email, or update your user's `role` to `admin` directly in the database.

**Cron not running on free hosting** — Free tiers on Render/Railway may sleep the server. Use a paid always-on tier, or trigger the overdue check externally via a cron service calling `POST /api/trpc/cron.processOverdue` with the `x-cron-secret` header.
