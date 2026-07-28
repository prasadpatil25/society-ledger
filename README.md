# Society Cash Book — shared ledger on Cloudflare

A transparent society ledger with:

- **Public read-only page** (`/`) — the shareable link for all members. No login, just the numbers.
- **Login-gated admin** (`/admin`) — the treasurer adds / edits / deletes transactions and sets the period.
- **Shared database** — everyone sees the same figures the instant the admin saves, because the data lives in one Cloudflare **D1** database (server-side SQLite), not in a browser.

Balances, the running-balance chart, collection status and the expense breakdown are all computed from the raw entries — no hand-typed totals.

Everything here runs on Cloudflare's **free tier**.

---

## Architecture

```
Browser ──▶ /              index.html  (read-only, fetch /api/ledger)
        ──▶ /admin         admin.html  (login + CRUD)
                              │
                              ▼
                     Pages Functions  (/functions/api/*)
                              │  D1 binding: env.DB
                              ▼
                        Cloudflare D1  (SQLite)
```

Auth: the admin signs in with a username + password. The password is checked against a
**PBKDF2-SHA256** hash (never stored in plaintext). On success the server sets an
**HttpOnly, Secure, HMAC-signed session cookie**; every write endpoint verifies it.

---

## One-time setup

You need a free Cloudflare account and Node.js installed.

```bash
# 1. Install the CLI and sign in
npm install -g wrangler
wrangler login

# 2. Install dev deps (optional, for `npm run` shortcuts)
npm install

# 3. Create the D1 database
wrangler d1 create society_ledger
#   -> copy the printed database_id into wrangler.toml (replace REPLACE_WITH_YOUR_DATABASE_ID)

# 4. Create the tables (and default settings)
wrangler d1 execute society_ledger --remote --file=./schema.sql

# 5. (optional) load the Avir sample data
wrangler d1 execute society_ledger --remote --file=./seed-avir.sql

# 6. Create the Pages project
wrangler pages project create society-ledger
```

### Set the admin secrets

```bash
# Generate a password hash locally (never commit the password itself)
node hash-password.mjs 'choose-a-strong-passphrase'
#   -> prints something like 210000$<salt>$<hash>

# Store the three secrets on the Pages project
wrangler pages secret put ADMIN_PASSWORD_HASH   # paste the value above
wrangler pages secret put SESSION_SECRET        # paste a long random string
wrangler pages secret put ADMIN_USERNAME        # e.g. admin  (optional; defaults to "admin")
```

Generate a random `SESSION_SECRET` with: `openssl rand -hex 32`

> If you set secrets via the CLI before the first deploy, also add them again in the
> dashboard under **Workers & Pages → society-ledger → Settings → Variables and Secrets**
> if a deploy ever reports them missing. Bindings/secrets apply after a redeploy.

---

## Deploy

```bash
wrangler pages deploy
```

You'll get a URL like `https://society-ledger.pages.dev`.

- Share **`https://society-ledger.pages.dev/`** with members (read-only).
- Go to **`/admin`** yourself to sign in and manage entries.

Redeploy any time with the same command. To update the database schema later, run another
`wrangler d1 execute … --file=…`.

---

## Local development

```bash
# runs Pages + Functions against a LOCAL D1 copy
wrangler pages dev
# load schema into the local db (drop --remote to target local)
wrangler d1 execute society_ledger --local --file=./schema.sql
wrangler d1 execute society_ledger --local --file=./seed-avir.sql
```

For local auth, create a `.env` file (git-ignored) next to `wrangler.toml`.
(Wrangler 4.47+ reads `.env`, not `.dev.vars`, for local dev.)

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=210000.your.hash
SESSION_SECRET=any-long-random-string
```

---

## API

| Method | Path                | Auth | Purpose                        |
| ------ | ------------------- | ---- | ------------------------------ |
| GET    | `/api/ledger?year=` | no   | selected year's meta + entries |
| GET    | `/api/session`      | no   | `{ authed }` for the admin UI  |
| POST   | `/api/login`        | no   | sign in, sets session cookie   |
| POST   | `/api/logout`       | no   | clears the cookie              |
| PUT    | `/api/meta`         | yes  | update name / period / opening |
| POST   | `/api/entries`      | yes  | add an entry                   |
| PUT    | `/api/entries/:id`  | yes  | edit an entry                  |
| DELETE | `/api/entries/:id`  | yes  | delete an entry                |
| POST   | `/api/years`        | yes  | create a financial year        |
| PUT    | `/api/years/:id`    | yes  | edit a year (label / dates)    |
| DELETE | `/api/years/:id`    | yes  | remove a year window           |
| GET    | `/api/members`      | yes  | full roster (incl. contact)    |
| POST   | `/api/members`      | yes  | add a member                   |
| PUT    | `/api/members/:id`  | yes  | edit a member (renames cascade)|
| DELETE | `/api/members/:id`  | yes  | remove a member from roster    |

---

## Reusing this for another society

1. Deploy a second copy (new D1 database + new Pages project), **or**
2. Just change the settings in `/admin` (society name, period, opening balance, annual due).

The schema and code are society-agnostic. Colours live as CSS variables at the top of
`public/app.css`.

## Financial years

Each year is a named period window in the `years` table; entries belong to a year by their
date, so nothing about an entry changes when you add a new year. Pick the year from the
dropdown on either page. In admin, **+ New year** creates the next 12-month window (you can
adjust its dates), and each year's opening balance is computed automatically as the previous
year's closing — no manual carry-over entry. "Opening before first year" (a society setting)
is only the genesis balance before your very first year.

> **Upgrading an existing database:** re-run the schema once to add the `years` / `members` / `login_attempts` tables —
> `wrangler d1 execute society_ledger --remote --file=./schema.sql` (locally use `--local`).
> It's safe to re-run: tables use `IF NOT EXISTS` and the first year is only seeded if none exist.

## Members & dues

The **Members** section in admin is the roster (flat, name, optional contact, active flag).
When you record a maintenance payment, you pick the payer from this roster, so names stay
consistent. The Collections view is driven by the roster: it lists **every** active member —
including those who have paid nothing — sorted with defaulters first, and shows the total
outstanding for the year. Renaming a member updates their past entries automatically;
removing a member keeps their historical entries intact.

## Notes / limits

- Login is rate-limited per IP: 5 failed attempts in 15 minutes locks that IP out for 15 minutes (tracked in the `login_attempts` table).
- Admin password hashing uses PBKDF2 with 100,000 iterations — the Cloudflare Workers runtime rejects higher counts, so do not raise it in `hash-password.mjs`.

- Single admin account. For multiple committee members with separate logins, add a `users`
  table and look the password hash up per-username instead of from an env var.
- The session cookie is stateless (HMAC-signed). To force-logout everyone, rotate
  `SESSION_SECRET` and redeploy.
- D1 free tier limits (rows read/written per day) are far above what a small society needs.
