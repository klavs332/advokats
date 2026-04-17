# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server on localhost:3000
npm run build     # Production build (also runs TypeScript check)
npm run lint      # ESLint
npx tsc --noEmit  # TypeScript check without building
```

## Architecture

**Next.js 16 (App Router) + Supabase + Tailwind CSS + shadcn/ui + TypeScript**

### Auth & routing
- `proxy.ts` (not `middleware.ts` — Next.js 16 renamed it) handles auth redirects. Unauthenticated users go to `/login`, authenticated users are redirected away from `/login`.
- Two roles: `admin` and `partner`. Role is stored in `profiles.role`. Admin is the lawyer; partners are external collaborators.
- Partners require `approved = true` before they can log in (checked in the login page client-side after `signInWithPassword`).

### Database (Supabase)
All schema changes go in `supabase/migrations/` as numbered SQL files, run manually in Supabase SQL Editor. Key tables:
- `profiles` — extends `auth.users` via trigger. Has `role`, `topics[]`, `approved`.
- `tasks` — created by admin, with `categories[]` and `status` ('draft'|'sent').
- `task_recipients` — junction between tasks and partners. Tracks `opened_at` and `replied_at`.
- `messages` — has both `sender_id` and `recipient_id`. Each message belongs to a specific partner's private thread (admin↔partner). Filtering by `recipient_id` is how private chats work.

### Supabase client usage
- `lib/supabase/client.ts` — browser client (use in `'use client'` components)
- `lib/supabase/server.ts` — server client (use in Server Components and route handlers, requires `await`)
- The `Database` type in `lib/types.ts` must include `Relationships: []` on each table — required by `@supabase/supabase-js` v2.103+. Missing this causes all table types to resolve as `never`.

### Chat (private per-partner)
- Each task has separate chat threads per partner. `messages.recipient_id` identifies which partner's thread a message belongs to.
- Admin sees a tab per partner and switches between threads (`TaskDetailChat` component).
- Partner only sees their own thread.
- Realtime uses `supabase.channel()` with `postgres_changes` filtered by `task_id`. The client-side filters by `recipient_id` after receiving the event.
- Realtime requires enabling the table in Supabase: `alter publication supabase_realtime add table public.messages;`

### Open tracking (WhatsApp-style checkmarks)
- When a partner opens `/tasks/[id]`, the server component updates `task_recipients.opened_at`.
- `CheckmarkIcon` renders grey (not opened) or blue (opened) double checkmarks.
- `PartnerStatusDropdown` shows all recipients sorted by: replied → opened → not opened.
