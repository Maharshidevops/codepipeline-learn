// ESLint flat config — see Phases/PHASE-8-QUALITY-GATES.md.
// Lints src/** only; Backup/ (legacy Flask app), UI/ (snapshots), Node tooling
// under scripts/, and build output are ignored.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'node_modules',
      'Backup',
      'UI',
      'scripts',
      '.claude',
      '.cursor',
      '*.config.js',
      '*.config.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Phase 35: accessibility lint — recommended jsx-a11y ruleset, scoped to JSX files.
  { files: ['**/*.{jsx,tsx}'], ...jsxA11y.flatConfigs.recommended },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // The codebase uses `interface XProps extends HTMLAttributes<…> {}` — allow that single pattern.
      '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],
    },
  },
);
