# FIFA World Cup 2026 Predictor & Simulator

An interactive, high-fidelity Single Page React application to predict, simulate, and map out the entire tournament path for the expanded 48-team **FIFA World Cup 2026**.

Built with a sport-themed dark cyberpunk interface, real-time standings calculations, automated third-place pairing math (using a backtracking matching solver), and custom canvas-confetti celebration.

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

### 3. Build for Production
Compile a optimized static bundle in the `dist/` directory:
```bash
npm run build
```

---

## 🎯 Key Features

- **⚽ Real-Time Group Standings**: 12 groups (A to L) recalculate rankings automatically as you type scores. Adheres to official FIFA tie-breakers:
  $$\text{Points} \rightarrow \text{Goal Difference (GD)} \rightarrow \text{Goals For (GF)} \rightarrow \text{Head-to-Head} \rightarrow \text{Team Rating}$$
- **⚡ Smart Simulation Engine**: Uses a Poisson distribution model based on historical/custom team strength ratings to generate realistic match scores (e.g. 2-1, 1-0) rather than random numbers.
- **📊 Bipartite Backtracking Solver (Annex C)**: Evaluates the 12 third-place teams, ranks them, and runs a backtracking search in microseconds to match the top 8 qualified teams to their correct Round of 32 slots according to official regulations.
- **🏆 Interactive Knockout Bracket**: Click on any team row to advance them immediately, or enter scorelines. Features penalty shootout support (`PK` badges) for draws.
- **🔄 Auto-Cascading Resets**: Recursively cleanses downstream matches if you modify an earlier match score or group stage standings, keeping the bracket mathematically consistent.
- **🏅 Path to Glory Recap**: Explodes confetti when the Champion is crowned and displays a timeline summarizing the winner's entire journey from group stage to the final.
- **💾 Local Storage Persistence**: Saves your predictions automatically so you don't lose progress on page refresh.

---

## 📂 Project Architecture

```
├── index.html            # Main HTML document
├── package.json          # Project dependencies & scripts
├── src/
│   ├── main.jsx          # Entry point
│   ├── App.jsx           # Main coordinator / state controller
│   ├── index.css         # Styling system & responsive flex/grid layouts
│   ├── data/
│   │   ├── teams.js      # List of 48 teams, flags, and strength ratings
│   │   └── constants.js  # R32 bracket schema and Annex C allowed lists
│   ├── components/
│   │   ├── GroupCard.jsx            # Group tables & fixture inputs
│   │   ├── ThirdPlaceStandings.jsx  # Best 3rd-placed ranking board
│   │   ├── KnockoutBracket.jsx      # Interactive tree bracket
│   │   └── RecapModal.jsx           # Champions recap modal
│   ├── utils/
│   │   └── simulatorEngine.js       # Core math, standings sorting, and backtracking solver
│   └── hooks/
│       └── useLocalStorage.js       # Custom state persistence hook
```

---

## 🛠️ Customization & Ratings

Team ratings (governing Poisson simulation probabilities) are located in `src/data/teams.js`. You can modify a team's `rating` (e.g., from `70` to `95`) to weight simulated outcomes in their favor:
```javascript
{ id: 'fra', name: 'France', code: 'FRA', flag: '🇫🇷', group: 'I', rating: 93 }
```
