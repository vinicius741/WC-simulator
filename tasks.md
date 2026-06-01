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
  - [x] Sub-task A: Update `src/index.css` with dark sport cyberpunk styling (CSS variables, neon glow effects, card layouts).
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
