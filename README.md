# Carpe Diem

### A daily confidence quote app!

<img width="1188" height="627" alt="image" src="https://github.com/user-attachments/assets/b6dcc929-c466-499e-9ec6-3ca62c6620fb" />

Quotes live in a Supabase `quote_pool` table. A daily cron job copies one
into `daily_quotes`, and the frontend displays it.

## Run

```bash
npm install
npm run dev
```

* The deployed app is at https://carpe-diem-2026.vercel.app/.
* Open http://localhost:5173 in your browser.

Running locally needs a `.env.local` with the Supabase keys (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`).

`CRON_SECRET` guards the daily cron endpoint so only the scheduled job can publish a
quote (not random visitors). Generate one with
`node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`, and set
the same value in `.env.local` and in Vercel.

## Updating the quote pool

Append to the pool to add, flip used to retire, and leave published history untouched.

Add quotes by hand in the Supabase table editor, or with SQL:

```sql
insert into quote_pool (text, author) values ('Quote text.', 'Author');
```

Only rows with `used = false` get picked for future days.
