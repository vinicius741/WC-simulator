import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // This new react-hooks v7 rule flags *any* setState inside an effect,
      // including the legitimate client-side patterns this app relies on:
      // fetch-on-mount (usePredictions, AdminPage's AutoSync), interval polling
      // (useLiveGames), and syncing local input state to a changed prop
      // (UpcomingGameCard). Satisfying it would mean adopting Suspense/data
      // frameworks or render-phase state-adjustment refactors — out of scope.
      // The setState calls here are async (after await) or intentional resets,
      // not the cascading-render anti-pattern the rule targets.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
