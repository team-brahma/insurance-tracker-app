// @ts-check
import globals from 'globals';
import tseslint from 'typescript-eslint';
import baseConfig from './base.js';

/**
 * Node.js / Fastify ESLint flat config.
 * Extends base config with Node.js globals.
 *
 * @type {import('typescript-eslint').ConfigArray}
 */
const nodeConfig = tseslint.config(...baseConfig, {
  languageOptions: {
    globals: {
      ...globals.node,
    },
  },
  rules: {
    // Allow process.env access in Node.js
    'no-process-env': 'off',
    // Node-specific overrides
    'no-console': 'off',
  },
});

export default nodeConfig;
