# TaskFlow

A team task-management app with **real-time collaborative editing** — kanban boards, projects, and live multi-user task descriptions backed by Yjs CRDTs, with version history and offline support.

Built as a portfolio project to dig into real-time collaboration, custom server infrastructure, and a full self-hosted stack. Русская версия — [README.ru.md](README.ru.md).

## Features

- **Real-time collaborative editor** — several people edit a task description at once (BlockNote + Yjs over WebSocket): live cursors, version history with rollback, Markdown export, offline IndexedDB sync.
- **Kanban boards** — drag-and-drop (@dnd-kit) with optimistic UI; list and calendar views.
- **Organizations & roles** — teams, email invitations, OWNER / ADMIN / MEMBER permissions.
- **Auth** — Yandex ID OAuth and passwordless email magic links (BetterAuth).
- **Comments & @mentions** with notifications and email, project chat, due-date reminders.
- **Billing** — plan limits and feature flags with idempotent YuKassa payment webhooks.
- **Admin** — audit log with CSV export, member management, subscriptions.
- **Dark theme**; self-hosted via Docker Compose with automatic HTTPS.

## Tech stack

| Layer | Tech |
| --- | --- |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, CSS Modules |
| Backend | Next.js Server Actions, custom Node server (`server.ts`) with WebSocket |
| Data | PostgreSQL 16 + Prisma ORM (15 models) |
| Auth | BetterAuth (OAuth + magic link) |
| Realtime | Yjs + y-websocket + BlockNote |
| Infra | Docker Compose, Caddy (auto-HTTPS) |

No UI framework — components and design tokens are hand-built (`src/components/ui`, `src/styles/tokens.css`).

## Architecture

```
browser ──HTTPS──► Caddy ──► Next.js app (server.ts) ──► PostgreSQL
                                 │
                                 └── WebSocket (Yjs sync) for live editing
```

Notable decisions:

- A **custom server** (`server.ts`) runs Next.js and the y-websocket collab server together — separate ports in dev, sharing one port in production.
- **Yjs is the source of truth** for task descriptions; CRDT state is snapshotted to Postgres (`YjsSnapshot`) and restored on reconnect, so edits survive restarts and work offline.
- **Server Actions** handle every mutation, with authorization checked against the `Member` table.
- **Payment webhooks are idempotent** — verified against the YuKassa API with a unique index on `Payment.providerId`.

## Run locally

Requires Node 22+ and Docker.

```bash
npm install
cp .env.example .env          # set DATABASE_URL and BETTER_AUTH_SECRET
docker compose up -d db       # PostgreSQL
npx prisma migrate dev        # apply schema
npm run db:seed               # demo workspace (users, projects, tasks)
npm run dev                   # http://localhost:3000
```

`DEMO_MODE=true` signs you in as a seeded user without email/OAuth. Yandex ID, SMTP, and YuKassa are optional — without them those features are simply disabled. Full self-host / deploy notes live in [DEPLOY.md](DEPLOY.md) (in Russian).

## Project layout

```
src/app/         App Router — (auth), (app), (admin), (marketing), api
src/components/  ui/, nav/, kanban/, task/ (collaborative editor)
src/server/      server actions + WebSocket handler
src/lib/         auth, prisma, yookassa, yjs provider, theme
prisma/          schema (15 models) + seed
server.ts        custom Next.js + WebSocket server
```
