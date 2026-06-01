# Feature: FIFA World Cup 2026 Predictor & Simulator

## 1. Executive Summary
This application is a highly interactive, visually stunning web-based simulator for the 48-team FIFA World Cup 2026. It allows users to predict group stage matches (manually or through automated simulation), ranks the best third-placed teams, generates the official Round of 32 bracket dynamically using bipartite backtracking matching, and guides the user through the knockout stage up to crowning the champion.

## 2. User Stories
- **As a** football fan, **I want to** simulate the entire 48-team World Cup group stage automatically **so that** I can skip manual data entry and immediately start predicting the knockout stage.
- **As a** detail-oriented predictor, **I want to** manually input individual group match scores **so that** I can see the standings update dynamically in real time.
- **As a** user, **I want to** see which third-placed teams qualify for the Round of 32 **so that** I can track how close my favorite team is to advancing.
- **As a** tournament simulator, **I want to** click on a team in the bracket to advance them **so that** I can quickly run through knockout matches without entering scores if I prefer speed.
- **As a** user, **I want my progress saved** in the browser **so that** I can leave the tab and resume my tournament simulation later.
- **As a** winner, **I want a visual celebration and summary** of my champion's path to victory **so that** my simulation finishes with an exciting, shareable recap.

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

## 4. Non-Functional Requirements
- **Performance**: Stanings calculation, third-place ranking, and bracket matching must occur in `< 5ms`.
- **Theme**: Sport-focused cyberpunk dark theme (neon colors, glassmorphism, responsive cards).
- **Persistence**: All state (groups, standings, matches, bracket) must be saved to `localStorage` on any change.
- **Responsive**: Layout must look spectacular on desktop, tablet, and mobile.

## 5. Out of Scope
- Intercontinental playoff matches (starting the simulator with the finalized 48 teams).
- Real-time multiplayer (this is a local sandbox simulator).
