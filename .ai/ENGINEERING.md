# Engineering Standards & Architecture Guide

> **MANDATORY**: Every AI coding agent MUST read this document in full before making any changes to this repository.

---

## Repository Overview

This is a **production-ready enterprise Turborepo monorepo** built for the Insurance Tracker application.

| Dimension       | Value                                                  |
| --------------- | ------------------------------------------------------ |
| Monorepo tool   | Turborepo 2.x                                          |
| Package manager | pnpm 11.x (Node 22+ required)                          |
| Frontend        | Ionic React + Vite 8 + Tailwind v4 + shadcn/ui + MUI 9 |
| Backend         | Fastify 5 + Prisma 7 + MySQL                           |
| Language        | TypeScript 6 (strict)                                  |

---

## Critical Rules for AI Agents

### 1. Never Use Relative Cross-Package Imports

```typescript
// ❌ WRONG — never do this across package boundaries
import { SomeType } from '../../../packages/types/src/index';

// ✅ CORRECT — always use package exports
import { SomeType } from '@repo/types';
```

### 2. Always Use Path Aliases Within an App

```typescript
// ❌ WRONG — relative imports within an app
import { MyComponent } from '../../components/MyComponent';

// ✅ CORRECT — use configured path aliases
import { MyComponent } from '@components/MyComponent';
import { useMyHook } from '@hooks/useMyHook';
import { myService } from '@services/myService';
```

### 3. Strict TypeScript — No `any`, No `!`

```typescript
// ❌ WRONG
const result: any = fetchData();
const value = result!.data;

// ✅ CORRECT
const result: ApiResponse<PolicyData> = await fetchData();
if (!result.data) throw new NotFoundError('Policy');
```

### 4. Error Handling — Use AppError in the API

```typescript
// ❌ WRONG — throwing raw errors
throw new Error('Not found');

// ✅ CORRECT — use typed error classes
import { NotFoundError, ValidationError } from '@errors/AppError';
throw new NotFoundError('Policy', policyId);
```

### 5. Environment Variables — Never Hardcode Values

```typescript
// ❌ WRONG
const API_URL = 'http://localhost:3001';

// ✅ CORRECT
const API_URL = import.meta.env['VITE_API_BASE_URL']; // frontend
const port = requireEnv('API_PORT'); // backend
```

### 6. Shared Package Placement Rules

| If the code is...          | Place it in...                         |
| -------------------------- | -------------------------------------- |
| Cross-app utility function | `@repo/utils`                          |
| Cross-app React hook       | `@repo/hooks`                          |
| Cross-app UI component     | `@repo/ui`                             |
| Cross-app TypeScript type  | `@repo/types`                          |
| Cross-app constant         | `@repo/constants`                      |
| App-specific feature       | The feature's directory within the app |
| App-specific component     | `apps/<app>/src/components/`           |

---

## Package Version Reference (Do Not Downgrade)

| Package                     | Version |
| --------------------------- | ------- |
| `turbo`                     | 2.10.1  |
| `typescript`                | 6.0.3   |
| `react` / `react-dom`       | ^19.0.0 |
| `@ionic/react`              | 8.8.12  |
| `vite`                      | 8.1.1   |
| `tailwindcss`               | 4.3.2   |
| `@mui/material`             | 9.1.2   |
| `@tanstack/react-query`     | 5.101.2 |
| `axios`                     | 1.18.1  |
| `zustand`                   | 5.0.14  |
| `react-router`              | 8.0.1   |
| `fastify`                   | 5.9.0   |
| `@fastify/cors`             | 11.2.0  |
| `@fastify/helmet`           | 13.0.2  |
| `@fastify/sensible`         | 6.0.4   |
| `prisma` / `@prisma/client` | 7.8.0   |
| `eslint`                    | ^10.6.0 |
| `typescript-eslint`         | ^8.62.0 |
| `prettier`                  | 3.9.4   |
| `husky`                     | 9.1.7   |
| `lint-staged`               | 17.0.8  |

---

## Frontend Architecture (apps/mobile)

### Folder Structure

```
src/
├── assets/         Static files (images, fonts, icons)
├── components/     Reusable, domain-agnostic UI components
│   ├── ui/         Primitive base components (wrapping shadcn/ui)
│   ├── layout/     Layout helpers (Container, Stack)
│   └── feedback/   Toast, Modal, Skeleton, etc.
├── config/         App configuration from env
├── contexts/       React Contexts (lightweight global state)
├── features/       Vertical feature slices (see Feature Slice Pattern)
├── hooks/          App-specific React hooks
├── layouts/        Page wrapper layouts
├── pages/          Route-level page components
├── routes/         React Router route definitions
├── services/       Axios HTTP service layer
├── styles/         Global CSS (Tailwind v4 @theme tokens)
├── types/          App-specific TypeScript types
└── utils/          App-specific utility functions
```

### Feature Slice Pattern

Each feature under `src/features/<name>/` must follow:

```
features/<name>/
├── components/     Feature UI components
├── hooks/          Feature TanStack Query hooks
├── services/       Feature API calls
├── types/          Feature-specific types
├── utils/          Feature-specific helpers
└── index.ts        Public barrel export (only export what's needed outside)
```

### TanStack Query Rules

- Use TanStack Query for ALL server state — never useState + useEffect for data fetching
- Define query keys as constants
- Separate query hooks from component files

### Zustand Usage

- Use Zustand **only** for global client-side UI state that needs to persist across routes
- Never put server data in Zustand
- Keep stores small and focused

---

## Backend Architecture (apps/api)

### Folder Structure

```
src/
├── config/          Config from env variables
├── controllers/     Request handlers (thin — delegate to services)
├── database/        Prisma client singleton
├── errors/          AppError and error subclasses
├── middlewares/     Fastify middleware (errorHandler, etc.)
├── plugins/         Fastify plugin registrations (cors, helmet, sensible)
├── repositories/    Data access layer (Prisma queries)
├── routes/          Route definitions (schema + controller binding)
├── schemas/         Fastify JSON schemas for request/response
├── services/        Business logic layer
├── types/           TypeScript type augmentations
├── utils/           API utility functions
└── validators/      Input validation helpers
prisma/
├── schema.prisma    Prisma schema (MySQL)
└── migrations/      Migration files (auto-generated)
```

### Request Lifecycle

```
Request → Route (schema validation) → Controller → Service → Repository → Database
         ← Response ← Controller ← Service ← Repository ←──────────────────────
```

### Prisma Conventions

1. All models use `@id @default(uuid())` — never auto-increment integers
2. All models include `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`
3. All table names use `@@map("snake_case_plural")`
4. Generate the Prisma client after schema changes: `pnpm db:generate`
5. Create migrations: `pnpm db:migrate`

---

## Turborepo Pipeline

```bash
pnpm dev        # Start all apps in development mode
pnpm build      # Build all apps and packages (respects dependency order)
pnpm typecheck  # Run TypeScript type checking across all packages
pnpm lint       # Run ESLint across all packages
pnpm lint:fix   # Run ESLint with auto-fix
pnpm format     # Run Prettier across all files
```

### Windows Fallbacks (if Turborepo crashes/fails with exit code `3221225781`)

If `turbo` is blocked or fails, use the following `pnpm` workspace scripts:

- `pnpm dev:local`
- `pnpm build:local`
- `pnpm typecheck:local`
- `pnpm lint:local`

---

## Commit Convention

All commits must follow Conventional Commits:

```
<type>(<optional-scope>): <description>

Types: feat | fix | docs | style | refactor | perf | test | build | ci | chore | revert
```

Examples:

- `feat(mobile): add policy listing page`
- `fix(api): handle null database response`
- `chore(deps): upgrade @tanstack/react-query to 5.101.2`
- `docs: update README installation steps`
