# Deploying Sticker Swap — step by step (new to Supabase friendly)

Three free accounts, ~30 minutes. You'll set up the **database (Supabase)**, push the **code (GitHub)**,
and **host it (Vercel)**. Do them in this order.

---

## 0. Before you start
Install **Node.js 18+** (https://nodejs.org). Create free accounts at:
- **GitHub** — https://github.com
- **Supabase** — https://supabase.com
- **Vercel** — https://vercel.com (sign in with GitHub — easiest)

Unzip the project somewhere, e.g. `~/sticker-swap`.

---

## 1. Set up Supabase (the database)

1. Go to https://supabase.com → **New project**. Pick a name (e.g. `sticker-swap`), a strong
   database password (save it somewhere), and a region near you (e.g. *Frankfurt* for Switzerland). Create it
   and wait ~2 minutes for it to finish provisioning.
2. In the left sidebar open **SQL Editor** → **New query**.
3. Open the file `supabase/migrations/0001_init.sql` from the project, copy **all** of it, paste into the
   editor, and click **Run**. You should see "Success". This creates the tables.
4. New query again. Open `supabase/migrations/0002_seed_stickers.sql`, copy all, paste, **Run**. This loads
   all 992 stickers. (It's a big file — that's normal.)
5. Verify: left sidebar → **Table Editor** → open the `stickers` table → it should show 992 rows.

### Get your two keys
6. Left sidebar → **Project Settings** (gear icon) → **API**. You need two values:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **service_role** key (under "Project API keys" — click reveal). **This is secret** — it's a server-only
     admin key. Never put it in client code or share it. Our app only uses it inside server API routes.

---

## 2. Run it locally first (sanity check)

In a terminal, from the project folder:

```bash
npm install
```

Create a file called `.env.local` (copy `.env.local.example`) and fill in your two values:

```
NEXT_PUBLIC_SUPABASE_URL=https://abcd1234.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...
```

Then:

```bash
npm run build   # catches any errors up front
npm run dev     # starts on http://localhost:3000
```

Open http://localhost:3000 → **Create a group** → copy the invite code → switch to **Join**, enter the code
and a username → you land on your collection. Tick a few stickers, try the language switch (top right).
If that works locally, deployment will work.

---

## 3. Put the code on GitHub

```bash
git init
git add .
git commit -m "Sticker Swap"
```

On GitHub: **New repository** (private is fine), don't add a README, then follow GitHub's
"push an existing repository" commands, roughly:

```bash
git remote add origin https://github.com/YOU/sticker-swap.git
git branch -M main
git push -u origin main
```

---

## 4. Deploy on Vercel

1. https://vercel.com → **Add New → Project** → **Import** your `sticker-swap` GitHub repo.
2. Framework should auto-detect as **Next.js**. Before clicking Deploy, expand
   **Environment Variables** and add the same two from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Click **Deploy**. After ~1 minute you get a live URL like `https://sticker-swap-xyz.vercel.app`.

That's the live app. Every future `git push` auto-deploys.

---

## 5. First real use with your group

1. Open the live URL, **Create a group** (e.g. "Bremgarten Swap Club"). Copy the **invite code**.
2. Drop the URL + invite code in your WhatsApp/Signal group.
3. Everyone opens it, **Joins** with a username, and starts marking stickers.
4. **Market** shows each person their matches; **Request swap** files a request that the other person
   sees in **Requests** next time they open the app (nudge them in the chat with "Draft message").
5. **Moving to another device:** go to **Settings → Copy edit link**, open that link on the other device —
   you can now edit there too. Same link is your backup; also use **Export** for a file copy.

---

## Troubleshooting
- **"Missing Supabase env vars"** — the two env vars aren't set (locally in `.env.local`, or in Vercel's
  project settings). After adding them in Vercel, redeploy.
- **Stickers don't appear** — you didn't run `0002_seed_stickers.sql`, or it errored. Re-run it; check the
  `stickers` table has 992 rows.
- **Can't edit, says read-only** — your edit token isn't on this device/browser. Open your personal edit
  link (Settings → Copy edit link on a device that works, or re-join). Clearing browser data removes the
  token (the data is safe in Supabase regardless).
- **You don't need to touch RLS** — all database access goes through server API routes using the service
  key, so you can leave Row Level Security off for these tables in this MVP.
