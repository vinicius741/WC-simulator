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

## Automatic results (daily cron)

Finished results no longer need to be typed by hand. `api/admin/sync_results.php` pulls
finished WC2026 games from FIFA's official JSON feed once a day, matches them to the seeded
`games` rows by team code, fills any missing result, and re-scores predictions (same 3/1/0
rule). It only fills games whose result is still empty — a result you enter by hand is never
silently overwritten (set `config.sync_force_overwrite=1` to let it correct a divergence).

- **Audit log:** the script self-creates a `sync_log` table on first run, so importing
  `db/sync_log.sql` is **optional** (it just documents the shape). To import it explicitly:
  ```bash
  ssh hostinger "mysql -u u915492341_wcpred -p'$DBPASS' u915492341_wcpred" < db/sync_log.sql
  ```
- **Schedule it (one-time, in hPanel):** hPanel → **Advanced → Cron Jobs**, add:
  ```
  0 12 * * * /opt/alt/php83/usr/bin/php /home/u915492341/domains/viniciusmoreira.link/public_html/wc-sim/api/admin/sync_results.php >> /home/u915492341/domains/viniciusmoreira.link/wc-sim-sync.log 2>&1
  ```
  (12:00 UTC catches all the previous day's games; bump to 2×/day on heavy matchdays.)
- **Run manually / test:** from the `/admin` page (a **Sync now** button), or over SSH:
  ```bash
  # dry-run — fetches & prints the plan, writes nothing:
  ssh hostinger '/opt/alt/php83/usr/bin/php ~/domains/viniciusmoreira.link/public_html/wc-sim/api/admin/sync_results.php --dry-run'
  # real run:
  ssh hostinger '/opt/alt/php83/usr/bin/php ~/domains/viniciusmoreira.link/public_html/wc-sim/api/admin/sync_results.php'
  ```
- **Source:** FIFA by default (`config.sync_source=fifa`); ESPN is a built-in fallback
  (`config.sync_source=espn`). Both need no API key and return FIFA team codes directly.
- **Optional external trigger:** to let a GitHub Action fire the sync, set a random
  `config.cron_token`, then `POST /api/admin/sync_results.php` with header `X-Cron-Token`.

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
