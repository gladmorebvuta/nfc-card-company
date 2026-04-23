import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.claude/worktrees/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Allow unused vars prefixed with _ (TypeScript convention)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    ...jsxA11y.flatConfigs.recommended,
    files: ['**/*.{ts,tsx}'],
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // Pre-existing issues in form components — tracked in STATUS.md tech debt
      // TODO: fix by wrapping inputs with <label htmlFor> or adding htmlFor props
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/img-redundant-alt': 'warn',
      'jsx-a11y/anchor-has-content': 'warn',
      'jsx-a11y/heading-has-content': 'warn',
    },
  },
  // shadcn/ui components use non-component exports (CVA variants, etc.) — suppress fast-refresh noise
  {
    files: ['src/app/components/ui/**/*.{ts,tsx}', 'src/app/contexts/**/*.{ts,tsx}', 'src/app/routes.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
