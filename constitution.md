# Project Constitution: World Cup 2026 Simulator

## 1. Technical Stack
- Language: JavaScript (ES6+)
- UI Framework: React 19 (Vite)
- CSS: Vanilla CSS with custom properties (CSS variables) for modern theme tokens, flexbox/grid layout, and smooth animations.
- Icons: Lucide React for modern, vector iconography.

## 2. Architectural Layering
- The application will be structured as a Single Page Application (SPA).
- **State Management**: React state hooks (`useState`, `useMemo`, `useEffect`) to store groups, match scores, 3rd place rankings, and knockout bracket state.
- **Data Models**:
  - `Team`: `{ id: string, name: string, code: string, group: string, rank: number }`
  - `Match`: `{ id: string, type: 'group' | 'knockout', home: string, away: string, homeScore: number | null, awayScore: number | null, group?: string, stage?: string, nextMatchId?: string, winner?: string }`
  - `GroupStandings`: `{ teamId: string, played: number, won: number, drawn: number, lost: number, gf: number, ga: number, gd: number, points: number }`

## 3. Naming Conventions
- React Components: PascalCase (e.g., `GroupCard`, `KnockoutBracket`).
- Custom hooks: camelCase starting with `use` (e.g., `useLocalStorage`).
- Variables, functions, and files: camelCase (e.g., `calculateStandings`, `app.js`).
- CSS classes: kebab-case (e.g., `bracket-card`, `team-row`).

## 4. Design & Style Invariants
- High-end dark theme with sport accents (deep indigo/slate background, neon green, electric violet, gold).
- Pure CSS styling (no Tailwind CSS, for maximum styling flexibility and to keep CSS isolated in `index.css` and dedicated CSS files).
- Transitions and micro-animations on all interactive items (hover effects, card scaling, active state changes).
- Responsive layouts using CSS Flexbox and Grid.
- Confetti celebration upon crowning a champion.

## 5. Security & Accessibility Mandates
- Standard semantic HTML tags (`header`, `main`, `section`, `footer`, `nav`, `button`).
- Fully local operation (no external data fetches needed; team lists, rankings, and schedules are embedded directly).
