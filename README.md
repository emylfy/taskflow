# TaskFlow

A task management and team collaboration web app: projects, kanban boards, task cards, comments with @mentions, project chat, and real-time collaborative editing of task descriptions.

> Русская версия — [README.ru.md](README.ru.md)

---

## Contents

1. [What it is](#what-it-is)
2. [Stack](#stack)
3. [Architecture](#architecture)
4. [Quick start](#quick-start)
5. [Environment variables](#environment-variables)
6. [Database](#database)
7. [Development](#development)
8. [Production build](#production-build)
9. [Deployment](#deployment)
10. [Verification checklist](#verification-checklist)
11. [Troubleshooting](#troubleshooting)
12. [Project structure](#project-structure)
13. [npm commands](#npm-commands)

---

## What it is

TaskFlow is a private workspace for a team: organizations, projects, kanban boards, task cards, comments, project chat, and real-time collaborative editing.

**Implemented:**

- Sign in via **Yandex ID** (OAuth) and a **one-time email magic link**.
- Organization registration and member invitations with roles (OWNER / ADMIN / MEMBER).
- **Kanban board** on `@dnd-kit` with optimistic UI and persistence to PostgreSQL in a transaction.
- **Calendar view** of tasks by due date.
- **Collaborative editing** of a task description: BlockNote + Yjs over WebSocket (`/api/collaboration/task-<id>`), live cursors, CRDT snapshots autosaved on a debounce.
- **Version history** with rollback, Markdown export, and an offline IndexedDB cache.
- **Comments** with `@mentions` and server-side notification + email delivery.
- **Project chat** and due-date reminders.
- **Admin area** — metrics, audit log with CSV export, members, subscription.
- **Plans & billing** — per-plan limits and feature flags, **YuKassa** payments (create payment, redirect to the payment form, webhook verified against the YuKassa API).
- **Dark theme** with a toggle (dark by default).
- **Docker Compose** (app + PostgreSQL 16 + Caddy with automatic HTTPS) and a database backup script (`pg_dump`).

---

## Stack

| Layer | Technologies |
| --- | --- |
| Frontend | Next.js 15 (App Router) + React 19, TypeScript, CSS Modules |
| Design system | custom (`src/components/ui/*`), design tokens in `src/styles/tokens.css` — **no** Tailwind, shadcn/ui, Radix or lucide-react |
| Backend | Next.js Server Actions, custom `server.ts` with a WebSocket upgrade |
| Database | PostgreSQL 16 + Prisma ORM (15 models) |
| Auth | BetterAuth (Prisma adapter, magic link, generic OAuth for Yandex ID) |
| Collaborative editing | BlockNote 0.27 + Yjs 13 + y-websocket |
| Drag-and-drop | @dnd-kit (core, sortable, utilities) |
| Payments | YuKassa HTTP API |
| Infrastructure | Docker Compose, Caddy 2 (auto-HTTPS via Let's Encrypt) |

---

## Architecture

```
           ┌────────────────┐
 browser ─►│     Caddy      │── 443 → reverse proxy → app:3000
           │    (HTTPS)     │
           └────────────────┘
                   │
                   ▼
           ┌────────────────┐
           │  Next.js app   │   ── HTTP routes (pages, API, auth)
           │   server.ts    │   ── WebSocket upgrade /api/collaboration/*
           └────┬──────┬────┘
                │      │
       SQL ─────┘      └───── WebSocket (Yjs broadcast)
                │
                ▼
         ┌────────────┐
         │ PostgreSQL │  (pg-data volume)
         └────────────┘
```

Key decisions:

- A **custom server** ([`server.ts`](server.ts)) hosts both the regular Next.js app and y-websocket. In development collab runs on a separate port (PORT+1); in production it shares the port with Next.
- **Server Actions** instead of REST: all data mutations go through `src/server/actions/*`, with permissions checked against the `Member` table.
- **Yjs is the source of truth for task descriptions**, while `Task.description` in Prisma stays a short annotation; the full body is stored as a binary snapshot in `YjsSnapshot` and updated with a debounce.
- **Payment idempotency** is enforced by a unique index on `Payment.providerId` and a status check in the webhook.

---

## Quick start

### Prerequisites

- **Node.js 22+** (tested on 22 and 25).
- **Docker** (for PostgreSQL and/or the full stack).
- macOS, Linux or WSL2.

### Steps

```bash
# 1. Enter the project folder
cd taskflow

# 2. Install dependencies (~40s)
npm install

# 3. Copy the env template and fill in the values
cp .env.example .env
#   Required: DATABASE_URL, BETTER_AUTH_SECRET
#   For full functionality: Yandex ID, YuKassa, SMTP

# 4. Start PostgreSQL in Docker
docker compose up -d db

# 5. Apply migrations and load demo data
npx prisma migrate dev --name init
npm run db:seed

# 6. Run in development mode
npm run dev
```

The app is at <http://localhost:3000>.

---

## Environment variables

All settings live in `.env`. The file is **not committed** (see `.gitignore`).

### Required

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://taskflow:password@localhost:5432/taskflow` |
| `BETTER_AUTH_SECRET` | Session signing secret, **at least 32 characters**. Generate: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Full app URL. Local: `http://localhost:3000`; production: `https://your-domain` |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Same URL exposed to the browser (used by the auth client for OAuth and magic link) |

### Yandex ID (sign in with Yandex)

| Variable | Where to get it |
| --- | --- |
| `YANDEX_CLIENT_ID` | [oauth.yandex.ru](https://oauth.yandex.ru/client/new) → create an app → Client ID |
| `YANDEX_CLIENT_SECRET` | same place — Client Secret |

In the Yandex OAuth app set the redirect URI: `https://<your-domain>/api/auth/callback/yandex` (locally `http://localhost:3000/api/auth/callback/yandex`). Required scopes: `login:email`, `login:info`.

### SMTP (email magic link)

| Variable | Example |
| --- | --- |
| `SMTP_HOST` | `smtp.example.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `noreply@your-domain` |
| `SMTP_PASSWORD` | App password (not the account password) |

Without SMTP the magic link is printed to the console instead of being emailed.

### YuKassa (subscription payments)

| Variable | Where to get it |
| --- | --- |
| `YOOKASSA_SHOP_ID` | YuKassa dashboard → Settings → API |
| `YOOKASSA_SECRET_KEY` | same place, "Secret key" |
| `YOOKASSA_WEBHOOK_SECRET` | generate your own (`openssl rand -hex 32`) and set it in the YuKassa webhook settings |

Webhook URL: `https://<your-domain>/api/webhooks/yookassa`. Events: `payment.succeeded`, `payment.canceled`.

### PostgreSQL (for docker-compose)

| Variable | Default |
| --- | --- |
| `POSTGRES_USER` | `taskflow` |
| `POSTGRES_PASSWORD` | **change** to a strong password |
| `POSTGRES_DB` | `taskflow` |

Keep these in sync with `DATABASE_URL` or the app won't connect.

### Optional

| Variable | Purpose | Default |
| --- | --- | --- |
| `APP_DOMAIN` | Domain (without `https://`) for Caddy TLS | `taskflow.ru` |
| `NEXT_PUBLIC_COLLAB_URL` | WebSocket collab server (leave empty to proxy through the app) | empty |
| `DEMO_MODE` | Quick login with demo users (no email/OAuth) | `true` |
| `SEED_OWNER_EMAIL` / `SEED_OWNER_NAME` | Owner identity for the seeded workspace | demo user |
| `NPM_REGISTRY` / `PRISMA_ENGINES_MIRROR` | Registry mirrors for builds on restricted networks | official registries |

---

## Database

### Initial setup

```bash
docker compose up -d db              # start PostgreSQL
npx prisma migrate dev --name init   # create the schema (15 models)
npm run db:seed                      # load demo data
```

**Demo data** (`prisma/seed.ts`): one organization, 5 users (configurable via `SEED_OWNER_EMAIL`/`SEED_OWNER_NAME`), 3 projects, 15 tasks with varied statuses and priorities, and 3 plans (Free, Team, Business) with an active subscription.

### Re-run / inspect

```bash
npm run db:seed     # wipes and recreates demo data
npm run db:studio   # Prisma Studio at http://localhost:5555
```

### Changing the schema

1. Edit `prisma/schema.prisma`.
2. `npx prisma migrate dev --name <short-description>`.
3. Prisma creates a migration in `prisma/migrations/` and applies it to the dev DB.

Production: `npx prisma migrate deploy`.

---

## Development

```bash
npm run dev
```

- Runs `tsx server.ts` — a custom Next.js server with WebSocket on `:3000`.
- Hot reload works for everything: TSX, CSS, server actions.
- Yandex ID works in dev when `YANDEX_CLIENT_ID/SECRET` and the redirect URI are set.
- Without SMTP the magic link is logged to the console instead of emailed.

### Testing collaborative editing locally

1. Open the same task in two browser windows (e.g. Chrome + Firefox).
2. Start typing in one — the change appears in the other within ~100 ms.
3. Other participants' cursors render with name and color (palette `tokens.css → --rt-*`).

---

## Production build

```bash
npm run build    # next build (type-check, optimization)
npm start        # run the built app (tsx server.ts)
```

The build runs **without a database** — pages that read from Prisma handle the connection error gracefully and show demo data. For real operation the database must be reachable via `DATABASE_URL`.

---

## Deployment

The project is designed to run on **any VPS with Docker**. The full stack (app + PostgreSQL + Caddy) comes up with one command, and Caddy issues a Let's Encrypt certificate automatically.

```bash
# on the server (Ubuntu 22.04+ with Docker installed)
git clone <your-repo-url> taskflow && cd taskflow
cp .env.example .env
nano .env   # fill in production values (see below)

docker compose up -d --build
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run db:seed   # optional, demo data only
```

**Required in a production `.env`:**

- `APP_DOMAIN=your-domain` (without `https://`) — Caddy reads it to obtain TLS.
- `BETTER_AUTH_URL=https://your-domain` and `NEXT_PUBLIC_BETTER_AUTH_URL=https://your-domain`.
- `DATABASE_URL=postgresql://taskflow:...@db:5432/taskflow` — host **`db`** (the compose service name), not `localhost`.
- A strong `POSTGRES_PASSWORD`.
- Real Yandex ID / YuKassa / SMTP keys if you use those integrations.

Point a DNS A-record at the server IP for `APP_DOMAIN` (and `www`). Caddy obtains the certificate on first start. Database backups: [`scripts/backup-db.sh`](scripts/backup-db.sh) runs `pg_dump` with rotation — schedule it via cron.

> A detailed step-by-step VPS deployment guide (in Russian) lives in [DEPLOY.md](DEPLOY.md).

---

## Verification checklist

After `npm run dev`, check in order:

1. The landing opens at <http://localhost:3000>.
2. "Sign in" leads to `/login`.
3. With Yandex ID configured, the button redirects to `oauth.yandex.ru`; otherwise the magic link is used (a console error without SMTP is fine).
4. After sign-in, `/projects` shows 3 projects.
5. Opening a project shows the kanban with 15 tasks.
6. Dragging a task between columns persists (reload — the order holds).
7. Opening a task shows the BlockNote editor.
8. Two tabs show live text and cursor updates.
9. A comment with `@mention` is sent and saved.
10. `/admin/members` lists all members with roles.
11. `npm run build` finishes without errors.

---

## Troubleshooting

**`BETTER_AUTH_SECRET should be at least 32 characters`** — generate a new one: `openssl rand -base64 32`.

**`Can't reach database server at localhost:5432`** — PostgreSQL isn't running. `docker compose up -d db` and wait a few seconds.

**Migration won't apply** — reset the dev DB (drops data): `npx prisma migrate reset --force && npm run db:seed`.

**BlockNote doesn't render / empty task card** — ensure `@blocknote/mantine` is installed.

**Magic-link emails don't arrive** — verify SMTP settings (use an app password) and set up SPF/DKIM/DMARC so mail isn't flagged as spam.

**YuKassa webhook returns 403 "bad signature"** — `YOOKASSA_WEBHOOK_SECRET` doesn't match the secret in the YuKassa webhook settings.

---

## Project structure

```
taskflow/
├── prisma/
│   ├── schema.prisma            # 15 models + 4 enums
│   └── seed.ts                  # demo data
├── src/
│   ├── app/                     # App Router
│   │   ├── (auth)/              # /login, /register, /onboarding
│   │   ├── (app)/               # /projects, /my-tasks, /notifications, /settings, /chat, /search
│   │   ├── (admin)/             # /admin, /admin/members, /admin/billing, /admin/journal
│   │   ├── (marketing)/         # pricing, legal pages
│   │   └── api/
│   │       ├── auth/[...all]/   # BetterAuth
│   │       ├── collaboration/   # WebSocket marker
│   │       └── webhooks/yookassa/
│   ├── components/
│   │   ├── ui/                  # Button, Input, Avatar, Badge, Dialog, Dropdown, Tabs, ...
│   │   ├── nav/                 # Sidebar, TopBar
│   │   ├── kanban/              # Board, Column, TaskCard
│   │   └── task/                # CollaborativeEditor, CommentList, VersionHistory
│   ├── lib/                     # auth, prisma, session, yookassa, yjs-provider, theme
│   ├── server/
│   │   ├── actions/             # tasks, projects, comments, members, billing
│   │   ├── ws-broadcast.ts      # in-process event bus
│   │   └── ws-handler.ts        # y-websocket upgrade handler
│   └── styles/
│       ├── globals.css
│       └── tokens.css           # design tokens (colors, radii, shadows)
├── scripts/
│   └── backup-db.sh             # pg_dump with rotation
├── server.ts                    # custom Next.js server with WebSocket
├── Dockerfile                   # multi-stage build
├── docker-compose.yml           # app + db + caddy
├── Caddyfile                    # reverse proxy + auto-HTTPS
├── render.yaml                  # Render Blueprint (free demo)
├── .env.example
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## npm commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server with WebSocket on `:3000` |
| `npm run build` | Production Next.js build |
| `npm start` | Run the built app |
| `npm run lint` | ESLint |
| `npm test` | Run the Vitest suite |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Apply migrations (dev) |
| `npm run db:seed` | Load demo data |
| `npm run db:studio` | Prisma Studio on `:5555` |
