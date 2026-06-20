# Tasks: World Cup 2026 Simulator

- [x] **Task 1: Project Setup and Constants Data**
  - [x] Sub-task A: Define 48 teams list grouped into Groups A to L with names, codes, emoji flags, and ratings.
  - [x] Sub-task B: Define group match schedules (6 matches per group, 72 matches in total).
  - [x] Sub-task C: Define allowed lists for the 8 third-place spots.
  - [x] Sub-task D: Verify data models match the design in `plan.md`.

- [x] **Task 2: Core Logic and Helpers**
  - [x] Sub-task A: Create `simulateMatch` helper using Poisson distribution based on team ratings.
  - [x] Sub-task B: Create `calculateGroupStandings` with full tie-breaking rules.
  - [x] Sub-task C: Create `calculateThirdPlaceStandings` to rank the 12 third-placed teams.
  - [x] Sub-task D: Implement the backtracking matching algorithm (`allocateThirdPlaces`) to pair group winners with third-placed teams.
  - [x] Sub-task E: Implement the recursive bracket clearing function (`clearDownstreamMatches`).

- [x] **Task 3: State Management & Setup Page**
  - [x] Sub-task A: Initialize main states: `matches` (group stage), `knockoutMatches` (knockout stage), `activeTab` ('groups' | 'third-place' | 'knockout' | 'recap').
  - [x] Sub-task B: Implement functions: `updateGroupScore`, `simulateGroupMatches`, `simulateAllGroupMatches`, `resetSimulator`.
  - [x] Sub-task C: Build custom hook for `localStorage` persistence.

- [x] **Task 4: User Interface - Design Tokens & Group Stage View**
  - [x] Sub-task A: Establish the design-token layer and group-stage styling (now the editorial crimson/navy/gold palette exposed as Tailwind `@theme` tokens in `src/index.css`).
  - [x] Sub-task B: Create group page component displaying the 12 groups in a grid.
  - [x] Sub-task C: Add score input fields with automatic standings updates and group simulation buttons.

- [x] **Task 5: User Interface - Third-Place Rankings & Knockout Bracket**
  - [x] Sub-task A: Render the 3rd-place table, showing qualified and eliminated teams.
  - [x] Sub-task B: Create bracket view showing the Round of 32 down to the Final.
  - [x] Sub-task C: Add interactive progression: clicking a team advances them, or entering scores advances them, with visual link connections.

- [x] **Task 6: User Interface - Champion Recap & Path to Glory**
  - [x] Sub-task A: Build the confetti celebration triggered when the champion is chosen.
  - [x] Sub-task B: Create the "Path to Glory" summary displaying the champion's group stage and knockout stage match history.

- [x] **Task 7: Polishing, Refactoring & Dev Validation**
  - [x] Sub-task A: Run Vite local server to test the simulator end-to-end.
  - [x] Sub-task B: Polish responsiveness for mobile screens (tabbed bracket stages, collapsible group cards).
  - [x] Sub-task C: Add quick-fill mock results buttons to make testing and playing fast.

- [x] **Task 8: Family Predictions / Bolão Feature**
  - [x] Sub-task A: Design and implement the MariaDB schema (`db/schema.sql`) for games, predictions, players, config, and sync log.
  - [x] Sub-task B: Seed the 72 group-stage matches (`db/seed.sql`) for the predictions pool.
  - [x] Sub-task C: Build PHP API endpoints for public login, games, leaderboard, save prediction, and session state.
  - [x] Sub-task D: Build admin-only PHP endpoints for result entry, game management, password changes, invite links, player deletion, and FIFA results sync.
  - [x] Sub-task E: Implement the React Predictions tab UI: login, invite join, upcoming/locked game cards, leaderboard, and name change.
  - [x] Sub-task F: Implement the dedicated `/admin` page with result entry, add/edit game, invite link management, player management, password rotation, and auto-sync controls.
  - [x] Sub-task G: Add `usePredictions` and `usePredictionsAuth` hooks and the `apiClient.ts` utility; support `VITE_PRED_MOCK=true` for local development.
  - [x] Sub-task H: Implement `/invite/<token>` deep-link routing and passwordless invite login.
  - [x] Sub-task I: Implement FIFA results auto-sync (`api/admin/sync_results.php`) with cron scheduling and audit logging.
  - [x] Sub-task J: Document one-time backend setup in `db/SETUP.md` and align project docs (README, spec, plan) with the new feature.

- [x] **Task 9: Tailwind v4 Migration**
  - [x] Sub-task A: Add the `@tailwindcss/vite` plugin and `tailwindcss` v4 dependency; import `tailwindcss` from `src/index.css`.
  - [x] Sub-task B: Map the brand palette (crimson/navy/gold) and font stacks into an `@theme` block, generating utilities (`bg-crimson`, `text-navy`, `font-serif`) and mirroring the legacy `--accent-*` custom properties for any inline `var()` usage.
  - [x] Sub-task C: Re-express every component's styling with Tailwind utilities, keeping only non-utility primitives (`.btn`, `.tab-btn`, bracket connectors, keyframe animations) in `@layer components`.
  - [x] Sub-task D: Recreate the former responsive tiers as the `phone:` (≤600px) and `tablet:` (≤1024px) custom variants.
  - [x] Sub-task E: Delete the per-feature `src/styles/*.css` files and make `src/index.css` the single CSS entry, imported once by `src/main.tsx` (no `<link>` in `index.html`).
  - [x] Sub-task F: Add a Vitest suite (`src/tailwindMigration.test.ts`) guarding the migration: legacy stylesheets stay deleted, no source re-imports them, `index.css` pulls in Tailwind and exposes the brand tokens, and `main.tsx` is its sole importer.
  - [x] Sub-task G: Update project docs (README, spec, plan, constitution, tasks) to describe the Tailwind v4 layer and the editorial theme instead of the former vanilla-CSS / dark-cyberpunk framing.
