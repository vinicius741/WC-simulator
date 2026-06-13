# Family Predictions — one-time Hostinger setup

This feature adds a **Predictions / Palpites** tab where your family logs in with a
shared password, predicts the exact score of real World Cup 2026 games, and sees a
leaderboard. It needs a small **PHP + MariaDB** backend on your Hostinger account.

There are six one-time steps. Steps 1 must be done by you in the Hostinger panel;
the rest can be done by you (commands below) or by Claude over SSH.

---

## Step 1 — Create the database (you, in hPanel)

1. Hostinger hPanel → **Databases → MySQL Databases**.
2. **Create a new database**, e.g. `u915492341_wcpred`.
3. **Create a database user** with full privileges on that DB, and note its password.
4. Keep handy: **DB name**, **DB user**, **DB password**.

Confirm PHP is **8.0+** (hPanel → Advanced → PHP Configuration). It is by default.

## Step 2 — Create the secrets file (above public_html)

This file holds the DB password and must **not** be inside `public_html` (so it can't
be downloaded) and **not** inside `wc-sim/` (so `deploy.sh`'s `--delete` never removes it).
Put it at:

```
/home/u915492341/domains/viniciusmoreira.link/wc-sim-secrets.php
```

Easiest way — over SSH (the `hostinger` alias already works):

```bash
ssh hostinger 'cat > /home/u915492341/domains/viniciusmoreira.link/wc-sim-secrets.php' <<'PHP'
<?php
$DB_HOST = 'localhost';
$DB_NAME = 'u915492341_wcpred';      // <- your DB name
$DB_USER = 'u915492341_wcpred';      // <- your DB user
$DB_PASS = 'PASTE_DB_PASSWORD_HERE'; // <- your DB password
$SETUP_TOKEN = 'CHANGE_THIS_TO_A_LONG_RANDOM_STRING';
PHP
```

(You can also create it in **hPanel → File Manager**. Make up any long random string
for `$SETUP_TOKEN` — it protects the one-time setup page in Step 5.)

## Step 3 — Import the schema + fixtures

Pipe the two SQL files from this `db/` folder straight into the server's MySQL client:

```bash
DBPASS='PASTE_DB_PASSWORD_HERE'
ssh hostinger "mysql -h localhost -u u915492341_wcpred -p'$DBPASS' u915492341_wcpred" < db/schema.sql
ssh hostinger "mysql -h localhost -u u915492341_wcpred -p'$DBPASS' u915492341_wcpred" < db/seed.sql
```

`seed.sql` loads all **72 group-stage matches** (re-runnable: it uses `INSERT IGNORE`).
Alternatively, in hPanel → **phpMyAdmin**, open the DB → **Import** → upload `schema.sql`,
then `seed.sql`.

## Step 4 — Deploy

```bash
npm run deploy
```

This builds the site and rsyncs it (including the `api/*.php` files) to the server.
`deploy.sh` does **not** need changes — the secrets file and `db/` are outside its target.

## Step 5 — Set the two passwords (one-time)

Open this URL once in your browser:

```
https://wc-sim.viniciusmoreira.link/api/setup.php
```

Enter your **Setup token** (the `$SETUP_TOKEN` from Step 2), the **family (shared)
password**, and your **admin password**, then submit. The page self-disables after both
passwords are set. You can delete `api/setup.php` from the server afterwards.

## Step 6 — Validate

1. Health check — should print `{"ok":true,...}`:
   ```
   https://wc-sim.viniciusmoreira.link/api/health.php
   ```
2. PHP syntax (optional, over SSH):
   ```bash
   ssh hostinger 'for f in ~/domains/viniciusmoreira.link/public_html/wc-sim/api/*.php ~/domains/viniciusmoreira.link/public_html/wc-sim/api/admin/*.php; do php -l "$f"; done'
   ```
3. Open the site → **Predictions** tab → log in with the **family password + your name**.
   Predict a score, save it, log out, log in on the **Admin** toggle with the admin
   password, and enter a result for a finished game to see points appear.

---

## Day-to-day use

- **Family:** Predictions tab → enter shared password + name → pick scores. Picks lock
  at kick-off and everyone's picks are revealed once the game starts.
- **Admin (you):** Predictions tab → **Admin** toggle → admin password. Then:
  - **Enter a result** for a game that has kicked off → all picks are scored instantly.
  - **Add a game** (e.g. a knockout match once teams are known).
  - **Change password** for family or admin.

## Notes & gotchas

- **Group F = Sweden.** The real tournament has Sweden (not Poland) with Netherlands,
  Japan, Tunisia. Your `src/data/teams.ts` lists Poland in Group F for the *simulator*;
  the predictions seed uses Sweden to match reality. Tell Claude if you'd like
  `teams.ts` aligned too.
- **Times are UTC**, shown to each visitor in their own local time zone (Brazil = UTC-3).
  The anti-cheat lock uses the server clock, so verify the server time is correct if a
  game won't let you save.
- **Scoring:** 3 pts for exact score, 1 pt for correct result, 0 otherwise. Stored in the
  `config` table (`points_exact`, `points_result`) — editable in phpMyAdmin.
- **Re-running the seed** is safe (`INSERT IGNORE`). Editing/adding games is best done in
  the Admin panel.
- **Local UI dev without a backend:** create `.env.local` with `VITE_PRED_MOCK=true` and
  run `npm run dev` — the Predictions tab uses sample data.
- **Security:** the family "session" only proves someone knows the shared password; the
  player name is typed by the user (trust-based). Predictions can't be changed after
  kick-off, and other people's picks stay hidden until kick-off.
