# Locking the database down — two steps

The app no longer talks to Supabase from the browser. Everything goes through
`/api/data` and `/api/coaches`, which run on the server. That means the database
can stop accepting anonymous requests altogether.

Until these two steps are done the server falls back to the public key, so the
app works either way — but the public key still works for anyone else too.

**Do them in this order.** Step 2 before step 1 will take the app down.

---

## Step 1 — give the server its own key

1. Supabase dashboard → your project (`plmmfyseqrxalujgdibz`)
2. **Project Settings → API keys**
3. Copy the **`service_role`** key (the secret one, *not* `anon`)
4. Vercel → **tf-monday-night-bible-studies** → **Settings → Environment Variables**
5. Add:

   | Name | Value | Environments |
   |---|---|---|
   | `SUPABASE_SERVICE_ROLE_KEY` | the service_role key | Production, Preview, Development |

   The name must not start with `NEXT_PUBLIC_`. That prefix is what tells
   Next.js to inline a value into the browser bundle, which is exactly what
   must not happen to this one.

6. **Redeploy** (Deployments → latest → ⋯ → Redeploy). Environment variables are
   read at build time, so nothing changes until a new build runs.
7. Check the app still loads and your studies are there.

---

## Step 2 — stop the database answering anonymous requests

Supabase dashboard → **SQL Editor** → run:

```sql
-- See what is currently allowed.
select policyname, roles, cmd
from pg_policies
where schemaname = 'public' and tablename = 'user_data';
```

Then:

```sql
-- With RLS on and no policies granting access, anon and authenticated get
-- nothing. service_role bypasses RLS, so the app's API routes keep working.
alter table public.user_data enable row level security;

-- Drop anything permissive that already exists. Add any extra names the
-- query above returned.
drop policy if exists "Enable read access for all users"   on public.user_data;
drop policy if exists "Enable insert access for all users" on public.user_data;
drop policy if exists "Enable update access for all users" on public.user_data;
drop policy if exists "Enable delete for all users"        on public.user_data;
drop policy if exists "public read"                        on public.user_data;
drop policy if exists "public write"                       on public.user_data;
```

---

## Verify it worked

From the project folder:

```bash
npm run verify:security
```

Expected: the public key is refused for read, insert, update and delete, while
the live app still loads its studies.

If the app breaks instead, step 1 didn't take effect — re-check that
`SUPABASE_SERVICE_ROLE_KEY` is set and that you redeployed afterwards. To undo:

```sql
alter table public.user_data disable row level security;
```

---

## Backups

`npm run backup` writes every row to `~/tf-bible-backups/`, keeping the last 30.
It refuses to write an empty snapshot over good ones, so a failure can't quietly
destroy earlier copies.

Once the database is locked down the public key reads nothing, so backups need
the service key locally. Add the same value that is set in Vercel to
`.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=<the service_role key>
```

`.env.local` is gitignored. Backup files are too — they contain coach PINs.
