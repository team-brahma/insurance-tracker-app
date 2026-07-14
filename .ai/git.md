# Git & Source Control Conventions

This document defines standard practices for commits, branch naming, and formatting before publishing changes.

---

## 1. Conventional Commits

All commit messages must follow the Conventional Commits specification:

```
<type>(<scope>): <subject>

[optional body]
```

### Supported Commit Types

- **feat**: Introducing a new production feature (e.g. `feat(api): register customer routes`).
- **fix**: Resolving a bug (e.g. `fix(mobile): patch memory leak in policy cards`).
- **docs**: Modifying/adding documentation files (e.g. `docs: update deployment guidelines`).
- **style**: Code format adjustments, missing semi-colons, style tweaks (no logic changes).
- **refactor**: Rewriting active code without changing its functional behavior.
- **perf**: Improving network, render, or database query performance.
- **test**: Injecting or modifying unit/integration tests.
- **chore**: Updating build processes, workspace tasks, package dependencies, configs.

---

## 2. Commit Hygeine

- **Focused Scope**: Commit early and often. Avoid committing hundreds of unrelated modifications spanning different applications and features.
- **No Dead Code**: Never commit commented-out code blocks, experimental scratch files, or dead variables to the main branch.
- **TODO Annotations**: Avoid leaving raw `// TODO:` comments inside the codebase unless they are referenced by an explicit issue number or ticket (e.g. `// TODO: (ISSUE-104) Refactor this loop once API v2 launches`).
