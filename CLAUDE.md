# CLAUDE.md

## Working style
- The user writes all the source code themselves. Guide and explain; hand them the
  code to type, don't edit source files for them. (Docs like this and the README
  are fine to edit when asked.)

## What this is
Daily confidence quote app: React + Vite frontend, Supabase Postgres, deployed on
Vercel. Quotes are scraped once from Wikiquote into `quote_pool`; a daily Vercel
cron (`/api/cron-insert`, 00:05 UTC) copies one unused quote into `daily_quotes`,
which the frontend reads. See README for setup and commands.

## Gotchas
- Don't re-run `scripts/seed_pool.mjs` casually — it inserts duplicates. Clear the table first if reseeding.
- Cron time is UTC, not local.
- Never commit `.env.local` (it holds the service-role key and cron secret).
- Supabase RLS: anon can only read `daily_quotes`; `quote_pool` is service-key only.

## After changes
- `node --check <file>` for serverless/script syntax.
- `npm run build` to confirm the frontend still builds.
