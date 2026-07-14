# Monorepo Guidelines & Package Management

This monorepo is managed using **Turborepo** and **pnpm**. It isolates code into applications (`apps/`) and reusable packages (`packages/`).

---

## 1. Directory Structure

```
Insurance_Tracker/
├── apps/
│   ├── mobile/           # Ionic React Application
│   └── api/              # Fastify API Application
└── packages/
    ├── tsconfig/         # Shared TypeScript configurations
    ├── eslint-config/    # Shared ESLint flat configurations
    ├── types/            # @repo/types — shared types
    ├── constants/        # @repo/constants — shared constants
    ├── utils/            # @repo/utils — shared helpers
    ├── hooks/            # @repo/hooks — shared React hooks
    ├── ui/               # @repo/ui — shared React UI components
    └── configs/          # @repo/configs — shared configurations
```

---

## 2. Cross-Package Imports Rule

- **No Relative Cross-Package Imports**: You must never use relative file paths to import code from another package.
- **Always Use Package Aliases**: Import from the defined `@repo/*` namespace.

```typescript
// ❌ WRONG
import { User } from '../../packages/types/src/index';

// ✅ CORRECT
import { User } from '@repo/types';
```

Ensure the package is declared as a dependency in the importing workspace's `package.json`:

```json
{
  "dependencies": {
    "@repo/types": "workspace:*"
  }
}
```

---

## 3. Package Responsibilities

- **Domain-Agnostic Packages**: Packages inside `packages/*` (such as `ui`, `hooks`, `utils`, `constants`) must remain entirely domain-agnostic and free of project-specific business rules.
- **Composition/Isolation**: If a UI component requires specific business logic or API mutations, it belongs in `apps/mobile/src/features/<feature-name>` instead of `@repo/ui`.
- **Exporting**: Every package must expose its public API via `src/index.ts`. Only export what is necessary; keep internal helper functions hidden.

---

## 4. Avoiding Circular Dependencies

To prevent build issues, circular dependencies between packages are strictly forbidden.

- `@repo/ui` can import from `@repo/utils`, `@repo/types`, or `@repo/constants`.
- `@repo/utils` must not import from `@repo/ui`.
- Keep dependency chains linear and documented.

---

## 5. Development Command Fallbacks

If Turborepo's `turbo` CLI crashes (e.g. exit code `3221225781` on certain Windows configurations), utilize the workspace-native `pnpm` command fallbacks provided in `package.json`:

| Action            | Standard command | Fallback command       |
| :---------------- | :--------------- | :--------------------- |
| **Run Dev**       | `pnpm dev`       | `pnpm dev:local`       |
| **Build Project** | `pnpm build`     | `pnpm build:local`     |
| **Lint Check**    | `pnpm lint`      | `pnpm lint:local`      |
| **Typecheck**     | `pnpm typecheck` | `pnpm typecheck:local` |
