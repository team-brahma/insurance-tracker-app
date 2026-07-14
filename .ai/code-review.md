# Code Quality & AI Review Checklist

This document details tools, pre-commit configuration requirements, and checklists for validating code quality.

---

## 1. Automated Tools Configuration

The project utilizes automated linting, formatting, and validation hooks to prevent sub-standard code from entering remote branches:

- **ESLint**: Enforces code style, typing boundaries, syntax consistency, and security protections (rules defined in `packages/eslint-config/`).
- **Prettier**: Normalizes whitespace, semicolons, quotes, and line breaks.
- **Husky**: Triggers automated scripts during git lifecycles.
- **lint-staged**: Runs ESLint and Prettier auto-fix scripts exclusively on files staged in the active git transaction.

Before pushing any commit, developers and AI agents must ensure that all local staging commands run cleanly without exit failures.

---

## 2. AI Code Review Checklist

Prior to presenting any completed feature or refactoring task to the user, the AI coding agent must review its changes against the following checklist:

| Check Item             | Description                                                                                                       | Verified |
| :--------------------- | :---------------------------------------------------------------------------------------------------------------- | :------: |
| **No `any`**           | Ensure there are absolutely no `any` statements, implicit types, or `@ts-ignore` flags.                           |   [ ]    |
| **Imports**            | Check that all package boundaries utilize standard `@repo/*` workspace links instead of relative routes.          |   [ ]    |
| **No Dead Code**       | Ensure all commented-out code, unused variables, and console logging statements have been removed.                |   [ ]    |
| **Pino Logging**       | Check that all diagnostic or informational messages utilize Pino standard logging in the API.                     |   [ ]    |
| **Validation Schemas** | Verify that every controller endpoint is wrapped with request schemas and validated cleanly.                      |   [ ]    |
| **Layer Boundaries**   | Confirm that no database calls occur outside repositories, and no business logic exists in routes or controllers. |   [ ]    |
| **Component Size**     | Verify that no modified React component file exceeds approximately 250 lines of code.                             |   [ ]    |
| **Pre-commit Hooks**   | Run the workspace typechecks and lints locally to verify that the build is green.                                 |   [ ]    |
