# FIFA World Cup 2026 Predictor & Simulator

An interactive, high-fidelity Single Page React application to predict, simulate, and map out the entire tournament path for the expanded 48-team **FIFA World Cup 2026**.

It now includes a **Family Predictions / Bolão** mode: family and friends can log in with a shared password, predict the exact score of real World Cup 2026 games, and compete on a live leaderboard. Predictions are scored automatically as real results come in (via FIFA auto-sync or manual admin entry).

Built with an editorial light interface (crimson/navy/gold on cream paper, Georgia serif headings, Inter body text), powered by **Tailwind CSS v4**, with real-time standings calculations, automated third-place pairing math (using a backtracking matching solver), custom canvas-confetti celebration, and a small PHP + MariaDB backend for the predictions pool.

---

## 🚀 Quick Start

### 1. Install Dependencies
Ensure you have [Node.js](https://nodejs.org/) installed, then run:
```bash
npm install
```

### 2. Start the Development Server
Run the local Vite dev server:
```bash
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

To develop the **Predictions** tab without a backend, create a `.env.local` file with `VITE_PRED_MOCK=true` and run `npm run dev` — the tab will use sample games and a sample leaderboard. To test against the real backend locally, set up the PHP + MariaDB backend described in [`db/SETUP.md`](db/SETUP.md) and leave `VITE_PRED_MOCK` unset.

### 3. Build for Production
Compile a optimized static bundle in the `dist/` directory:
```bash
npm run build
```

To use the predictions pool in production, deploy the built bundle to a host with PHP 8.0+ and MariaDB/MySQL and follow the one-time setup in [`db/SETUP.md`](db/SETUP.md).

---

## 🎯 Key Features

- **⚽ Real-Time Group Standings**: 12 groups (A to L) recalculate rankings automatically as you type scores. Adheres to official FIFA tie-breakers:
  $$\text{Points} \rightarrow \text{Goal Difference (GD)} \rightarrow \text{Goals For (GF)} \rightarrow \text{Head-to-Head} \rightarrow \text{Team Rating}$$
- **⚡ Smart Simulation Engine**: Uses a Poisson distribution model based on historical/custom team strength ratings to generate realistic match scores (e.g. 2-1, 1-0) rather than random numbers.
- **📊 Official Annex C Allocation**: Uses FIFA's exact 495-option lookup table to place every possible combination of eight qualifying third-place teams in the Round of 32.
- **🏆 Interactive Knockout Bracket**: Click on any team row to advance them immediately, or enter scorelines. Features penalty shootout support (`PK` badges) for draws.
- **🔄 Auto-Cascading Resets**: Recursively cleanses downstream matches if you modify an earlier match score or group stage standings, keeping the bracket mathematically consistent.
- **🏅 Path to Glory Recap**: Explodes confetti when the Champion is crowned and displays a timeline summarizing the winner's entire journey from group stage to the final.
- **💾 Local Storage Persistence**: Saves your simulator state (group scores, standings, and bracket progress) automatically so you don't lose progress on page refresh.
- **👨‍👩‍👧‍👦 Family Predictions / Bolão**: A dedicated Predictions tab where family and friends log in with a shared password (or a passwordless invite link) and predict the exact score of real World Cup 2026 games.
- **🏆 Live Leaderboard**: Predictions are scored automatically (3 points for exact score, 1 point for correct result) and ranked on a real-time leaderboard.
- **🔒 Anti-Cheat Lock**: Predictions can be created or changed any time before kick-off; once a game starts, picks are locked and revealed to everyone.
- **⚙️ Admin Tools**: A dedicated `/admin` page to enter results, add/edit games, manage players, rotate passwords, and generate invite links.
- **🌐 FIFA Auto-Sync**: Finished game results are pulled automatically from FIFA's official feed (daily cron) and scored without manual intervention.

---

## 📂 Project Architecture

```
├── index.html            # Main HTML document
├── package.json          # Project dependencies & scripts
├── db/
│   ├── SETUP.md          # One-time backend setup for the predictions pool
│   ├── schema.sql        # MariaDB schema for games, players, predictions, config
│   └── seed.sql          # 72 group-stage matches for the predictions pool
├── public/api/           # PHP API endpoints for the predictions backend
│   ├── games.php
│   ├── save_prediction.php
│   ├── leaderboard.php
│   ├── me.php
│   ├── login.php
│   ├── logout.php
│   ├── invite_login.php
│   ├── change_name.php
│   └── admin/            # Admin-only endpoints (results, games, passwords, sync)
├── src/
│   ├── main.tsx          # Entry point
│   ├── App.tsx           # Main coordinator / state controller
│   ├── index.css         # Tailwind v4 entry + @theme design tokens + hand-written component layer
│   ├── data/
│   │   ├── teams.ts      # List of 48 teams, flags, and strength ratings
│   │   ├── constants.ts  # R32 bracket schema and Annex C allowed lists
│   │   └── translations.ts # i18n strings (English + Brazilian Portuguese)
│   ├── components/
│   │   ├── GroupCard.tsx            # Group tables & fixture inputs
│   │   ├── ThirdPlaceStandings.tsx  # Best 3rd-placed ranking board
│   │   ├── KnockoutBracket.tsx      # Interactive tree bracket
│   │   ├── RecapModal.tsx           # Champions recap modal
│   │   └── predictions/             # Family predictions UI
│   │       ├── PredictionsView.tsx
│   │       ├── PredictionsLogin.tsx
│   │       ├── InviteLogin.tsx
│   │       ├── UpcomingGameCard.tsx
│   │       ├── LockedGameCard.tsx
│   │       ├── Leaderboard.tsx
│   │       ├── AdminPage.tsx
│   │       └── AdminPanel.tsx
│   ├── utils/
│   │   ├── simulatorEngine.ts       # Core math, standings sorting, and backtracking solver
│   │   ├── apiClient.ts             # API client for the predictions backend
│   │   ├── predictionsMock.ts       # Mock data for local UI development
│   │   ├── inviteRoute.ts           # /invite/<token> deep-link handling
│   │   └── routes.ts                # Lightweight pathname routing helpers
│   └── hooks/
│       ├── useLocalStorage.ts       # Custom state persistence hook
│       ├── useLanguage.tsx          # i18n context
│       ├── useTournamentEngine.ts   # Simulator state engine
│       ├── usePredictions.ts        # Predictions data loader
│       └── usePredictionsAuth.ts    # Family/admin session manager
```

---

## 🛠️ Customization & Ratings

Team ratings (governing Poisson simulation probabilities) are located in `src/data/teams.ts`. You can modify a team's `rating` (e.g., from `70` to `95`) to weight simulated outcomes in their favor:
```javascript
{ id: 'fra', name: 'France', code: 'FRA', flag: '🇫🇷', group: 'I', rating: 93 }
```
