# Feature: FIFA World Cup 2026 Predictor & Simulator

## 1. Executive Summary
This application is a highly interactive, visually stunning web-based simulator for the 48-team FIFA World Cup 2026. It allows users to predict group stage matches (manually or through automated simulation), ranks the best third-placed teams, generates the official Round of 32 bracket dynamically using bipartite backtracking matching, and guides the user through the knockout stage up to crowning the champion.

The app also includes a **Family Predictions / Bolão** mode backed by a small PHP + MariaDB service. In this mode, family and friends authenticate with a shared password (or a passwordless invite link), predict the exact score of real World Cup 2026 games before kick-off, and compete on a live leaderboard. Results can be entered manually by an admin or synced automatically from FIFA's official feed.

## 2. User Stories
- **As a** football fan, **I want to** simulate the entire 48-team World Cup group stage automatically **so that** I can skip manual data entry and immediately start predicting the knockout stage.
- **As a** detail-oriented predictor, **I want to** manually input individual group match scores **so that** I can see the standings update dynamically in real time.
- **As a** user, **I want to** see which third-placed teams qualify for the Round of 32 **so that** I can track how close my favorite team is to advancing.
- **As a** tournament simulator, **I want to** click on a team in the bracket to advance them **so that** I can quickly run through knockout matches without entering scores if I prefer speed.
- **As a** user, **I want my progress saved** in the browser **so that** I can leave the tab and resume my tournament simulation later.
- **As a** winner, **I want a visual celebration and summary** of my champion's path to victory **so that** my simulation finishes with an exciting, shareable recap.
- **As a** football fan in a family pool, **I want to** log in with a shared password and my name **so that** I can predict the exact score of real World Cup 2026 games.
- **As a** predictor, **I want to** see upcoming games and enter my predicted score before kick-off **so that** I can compete with friends and family.
- **As a** player, **I want** my picks to lock once a game starts and be revealed to everyone **so that** no one can change their prediction after seeing the real match.
- **As a** player, **I want to** see a live leaderboard **so that** I can track how my predictions compare to others (3 pts exact score, 1 pt correct result).
- **As an** admin, **I want to** enter real results, add/edit games, rotate passwords, and generate invite links **so that** I can manage the family pool.
- **As an** admin, **I want** finished results to be pulled automatically from FIFA **so that** I don't have to enter scores manually for every game.

## 3. Scenarios & Acceptance Criteria (Gherkin Style)

### Scenario 1: Group Standings Calculation
- **Given** a group of 4 teams with no matches played.
- **When** a user enters a score of `3 - 1` for Team A vs Team B.
- **Then** Team A should receive 3 points, +2 Goal Difference, 3 Goals For, and 1 Goal Against.
- **And** Team B should receive 0 points, -2 Goal Difference, 1 Goal For, and 3 Goals Against.
- **And** the group table should immediately re-rank the teams based on Points, GD, GF, and alphabetically.

### Scenario 2: Best Third-Place Teams Selection
- **Given** all group matches are simulated/played.
- **When** the 12 third-placed teams are gathered.
- **Then** they should be ranked in a single table by:
  1. Points (3 for win, 1 for draw)
  2. Goal Difference
  3. Goals Scored
  4. Team Strength/Rank (as a tie-breaker fallback for discipline/drawing lots)
- **And** the top 8 teams must be marked as "Qualified" and allocated to the Round of 32, while the remaining 4 are marked as "Eliminated".

### Scenario 3: Round of 32 Dynamic Matching
- **Given** the 8 qualifying third-place groups are identified.
- **When** the knockout stage is generated.
- **Then** a backtracking matching algorithm must map the 8 third-place teams to the 8 group winners in accordance with official FIFA regulations (A vs 3rd C/E/F/H/I, etc.) such that no team faces their own group winner.

### Scenario 4: Bracket Progression
- **Given** the Round of 32 matchups are populated.
- **When** a user clicks on a team in a knockout match, or inputs a winning score.
- **Then** that team must advance to the corresponding slot in the Round of 16.
- **And** any subsequent stages depending on that slot must reset if the winner changes.

### Scenario 5: Champion Crowning and Paths Recap
- **Given** the final match is completed.
- **When** a champion is crowned.
- **Then** a full-screen confetti effect must trigger.
- **And** a "Path to Glory" card must show the champion's complete list of matches, scores, and opponents throughout the tournament.

### Scenario 6: Family Predictions Login
- **Given** a visitor opens the **Predictions** tab.
- **When** they enter the shared family password and their name.
- **Then** they should be authenticated and see the list of upcoming games they can predict.
- **And** their name should appear on the leaderboard once they save a prediction.

### Scenario 7: Invite Link Login
- **Given** a visitor opens an `/invite/<token>` link.
- **When** the token is valid and enabled and they type their name.
- **Then** they should join the pool without entering the family password.
- **And** the token should be removed from the URL after use.

### Scenario 8: Saving a Prediction
- **Given** an authenticated player viewing an upcoming game.
- **When** they enter a valid predicted score (e.g., `2 - 1`) and save.
- **Then** the prediction should be stored server-side and reflected immediately in the UI.
- **And** they should be able to update the prediction any time before kick-off.

### Scenario 9: Prediction Lock and Reveal
- **Given** a game whose kick-off time has passed.
- **When** the game is marked as started (server clock).
- **Then** the game moves to the "Results & Picks" section.
- **And** every player's pick is revealed, and points are awarded once the result is entered.

### Scenario 10: Leaderboard Scoring
- **Given** a finished game with an official result (e.g., `2 - 1`).
- **When** predictions are scored.
- **Then** players who predicted `2 - 1` receive 3 points.
- **And** players who predicted a home win (e.g., `1 - 0`) receive 1 point.
- **And** all other predictions receive 0 points.

### Scenario 11: Admin Result Entry
- **Given** an admin signed in on the `/admin` page.
- **When** they select a started game and enter the final score.
- **Then** the result is saved and all predictions for that game are scored instantly.

### Scenario 12: FIFA Results Auto-Sync
- **Given** the daily cron runs `api/admin/sync_results.php`.
- **When** finished games are found in the FIFA feed.
- **Then** matching games are updated with the official result and predictions are re-scored.
- **And** manually entered results are never silently overwritten unless `config.sync_force_overwrite=1`.

## 4. Non-Functional Requirements
- **Performance**: Standings calculation, third-place ranking, and bracket matching must occur in `< 5ms`.
- **Theme**: Editorial light theme — crimson/navy/gold accents on a cream paper background, Georgia serif headings over Inter body text. Built with Tailwind CSS v4 (utilities inline + design tokens in `@theme`), with hand-written component primitives retained in `src/index.css`.
- **Persistence**: Simulator state (groups, standings, matches, bracket) must be saved to `localStorage` on any change. Predictions data lives in MariaDB on the server.
- **Responsive**: Layout must look spectacular on desktop, tablet, and mobile.
- **Backend**: Predictions require PHP 8.0+ and MariaDB/MySQL. Session authentication uses same-origin HttpOnly cookies.
- **Security**: The family password only proves membership; player names are trust-based. Predictions cannot be changed after kick-off. The database password lives in a secrets file outside the web root.

## 5. Out of Scope
- Intercontinental playoff matches (starting the simulator with the finalized 48 teams).
- Real-time multiplayer for the simulator (this is a local sandbox simulator).
- Payment handling or paid-entry pools for the predictions feature.
- Official user accounts / email verification; authentication is shared-password + self-typed name.
