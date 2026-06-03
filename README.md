# Sticker Swap — Panini World Cup 2026

Track your Panini WC2026 album and swap doubles with a small group of friends.
**Next.js (App Router) + Supabase + Vercel.** No passwords: identity is a username, edits are
authorised by a long random *owner token* (your private edit key); friends' lists are read-only to you.

## What's built in this scaffold
- **Schema migration** + **992-sticker seed** (your validated Swiss-edition album incl. EU Coca-Cola).
- **Collection screen** — fully wired: single-open accordion across all 51 sections, one-tap
  got/need with a centred green tick, separate −/+ spares counter, per-row mini progress bars, filters.
- **Group + join flow** — create a group (get an invite code), friends self-join with a username and
  receive their private edit link/token.
- **Server-mediated API** — all DB access goes through `/api/*` route handlers using the service-role
  key server-side; the browser never holds it. Writes require the matching owner token.
- **Trade** — shareable sheet: got-spares + still-needed lists, copy-to-clipboard, QR + print-to-PDF.
- **Market** — per-member you-give / they-give match ledger with mutual count + Request-swap + draft-for-chat.
- **Requests** — in-app inbox: accept (reserves the doubles), decline, mark-swapped (auto-updates both collections).
- **Settings** — private edit link (cross-device), JSON export/import backup, reset.
- **German switcher** — full EN/DE UI incl. translated country names; remembers your choice.

See **DEPLOY.md** for step-by-step setup if you're new to Supabase.

## Prerequisites
- Node 18+ and npm
- A free Supabase project (https://supabase.com)

## Setup
1. **Install deps** (needs internet — can't be done in the delivery sandbox):
   ```bash
   npm install
   ```
2. **Create a Supabase project**, then in the SQL editor run, in order:
   - `supabase/migrations/0001_init.sql`  (tables)
   - `supabase/migrations/0002_seed_stickers.sql`  (the 992 stickers)
3. **Env vars** — copy `.env.local.example` to `.env.local` and fill in from Supabase → Project
   Settings → API:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...      # server-only, keep secret
   ```
4. **Run:**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 → Create a group → copy the invite code → Join with a username.
   You'll land on `/u/<username>` and can start marking stickers.

## Deploying to Vercel
Push to GitHub, import into Vercel, set the two env vars in the Vercel project settings. Done.

## How the auth model works
- `POST /api/group` → creates a group + `invite_code`.
- `POST /api/join` { invite_code, username } → creates a profile, generates `owner_token`, returns it once.
  The client stores it in `localStorage` as `swap:token:<username>` — that's the edit key.
- Reads (`GET /api/collection/<username>`, the page itself) are open within the group.
- `POST /api/holding` requires the `x-owner-token` header to match the profile — only you can edit your list.

> Bot-protection notes for production: rate-limit `/api/join` and `/api/group`, and the invite code
> gates joining. Tokens are 32-char url-safe random strings (unguessable). You may later hash
> `owner_token` at rest and store reserved-spare logic on the `holdings.reserved_for` column.

## Project structure
```
supabase/migrations/      0001 schema, 0002 the 992-sticker seed
src/lib/                  supabaseServer (admin client), tokens, types + section grouping
src/app/api/              group, join, collection/[username], holding
src/app/                  page.tsx (landing), u/[username]/ (collection + 4 stubs)
src/components/           Shell (masthead/ticker/nav), CollectionClient (the interactive grid)
src/app/globals.css       the full "newsprint album" design system
```

## Next steps (suggested order)
1. **Trade** — derive got-spares / still-needed lists; copy-to-clipboard + share link; QR + PDF.
2. **Market** — for each group member compute `you_give = my.spares ∩ their.needs`,
   `they_give = their.spares ∩ my.needs`; render the ledger + "draft message for chat".
3. **Requests** — `requests` table is already in the schema; build the inbox, accept→reserve, statuses.
4. **Settings** — export/import JSON backup, reset, optional email for notifications.
