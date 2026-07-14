// @ts-check
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import baseConfig from './base.js';

/**
 * React ESLint flat config.
 * Extends base config with React + React Hooks rules.
 *
 * @type {import('typescript-eslint').ConfigArray}
 */
const reactConfig = tseslint.config(...baseConfig, {
  plugins: {
    react: reactPlugin,
    'react-hooks': reactHooksPlugin,
  },
  languageOptions: {
    globals: {
      ...globals.browser,
    },
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
  settings: {
    react: {
      version: '19.0.0',
    },
  },
  rules: {
    // React rules
    'react/react-in-jsx-scope': 'off', // Not needed with React 17+ JSX transform
    'react/prop-types': 'off', // TypeScript handles this
    'react/display-name': 'warn',
    'react/jsx-no-target-blank': 'error',
    'react/jsx-key': 'error',
    'react/no-deprecated': 'warn',

    // React Hooks rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
});

export default reactConfig;
