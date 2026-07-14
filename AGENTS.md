# AGENTS.md — AI Agent Instructions

**Read this first. Then read `.ai/ENGINEERING.md` before making any changes.**

---

## Required Reading Order

1. `AGENTS.md` (this file)
2. `.ai/ENGINEERING.md` — architecture guide, version pinning, feature slice patterns
3. The app/package `package.json`, `tsconfig.json`, `eslint.config.js` you're editing

---

## Golden Rules

- **Never use relative imports across packages** — use `@repo/*` package exports
- **Never downgrade package versions** — see version table in `.ai/ENGINEERING.md`
- **Never add business logic to `packages/*`** — domain-agnostic only
- **Use path aliases within apps** (`@components/*`, `@services/*`, `@routes/*`, etc.) — see each app's `tsconfig.json` for the full list
- **Use the correct architecture layer** — follow the Request Lifecycle and Feature Slice Pattern in `.ai/ENGINEERING.md`

---

## Commands

| Task               | Command                                         |
| ------------------ | ----------------------------------------------- |
| Start all apps     | `pnpm dev`                                      |
| Start mobile only  | `pnpm --filter @repo/mobile dev`                |
| Start api only     | `pnpm --filter @repo/api dev`                   |
| Build all          | `pnpm build`                                    |
| Typecheck all      | `pnpm typecheck`                                |
| Lint all           | `pnpm lint`                                     |
| Lint with fix      | `pnpm lint:fix`                                 |
| Format             | `pnpm format`                                   |
| Prisma generate    | `pnpm --filter @repo/api db:generate`           |
| Prisma migrate     | `pnpm --filter @repo/api db:migrate`            |
| Prisma studio      | `pnpm --filter @repo/api db:studio`             |
| Seed comprehensive | `pnpm --filter @repo/api db:seed:comprehensive` |

**Turborepo sometimes crashes on Windows** (exit code `3221225781`). Fallbacks:

- `pnpm dev:local` instead of `pnpm dev`
- `pnpm build:local` instead of `pnpm build`
- `pnpm typecheck:local` instead of `pnpm typecheck`
- `pnpm lint:local` instead of `pnpm lint`

---

## Conventions

### Error Handling (API)

- Throw `NotFoundError`, `ValidationError`, `ConflictError` from `@errors/AppError` — never raw `Error`
- Global error handler in `src/middlewares/errorHandler.ts` returns consistent JSON

### Route Plugins (API)

- Each route file is a `FastifyPluginAsync` (no `fp()` wrapper unless it's a shared utility plugin)
- `fp()` breaks encapsulation — if two route plugins both define `GET /` they'll conflict
- Register routes in `src/routes/index.ts` with optional prefix (e.g. `/api/v1/policies`)

### Data Fetching (Mobile)

- All server state via **TanStack Query 5** — never `useState` + `useEffect` for data
- Query keys as constants; separate query hooks from components
- Axios calls live in `src/features/<name>/services/`

### Global UI State

- **Zustand 5** only for client-side UI state (e.g. filter state, settings) — never server data

### Feature Slices

```
features/<name>/
├── components/  (UI components)
├── hooks/       (TanStack Query hooks)
├── services/    (Axios calls)
├── types/       (feature types)
├── utils/       (helpers)
└── index.ts     (barrel export)
```

### Git Hooks

- `pre-commit` runs `lint-staged` (auto-lint + format staged files)
- `commit-msg` enforces Conventional Commits: `type(scope?): description`
- Types: `feat | fix | docs | style | refactor | perf | test | build | ci | chore | revert`

### Prettier

`semi: true`, `singleQuote: true`, `trailingComma: all`, `printWidth: 100`, `endOfLine: lf`

---

## Project Map

```
Insurance_Tracker/
├── .ai/ENGINEERING.md           ← architecture, versions, patterns
├── apps/
│   ├── mobile/                  Ionic React (Vite 8, TW4, MUI 9, shadcn)
│   │   └── src/
│   │       ├── App.tsx          Entry: QueryClientProvider → IonApp → IonicRouter
│   │       ├── routes/          Route definitions (IonRouterOutlet + Switch)
│   │       ├── pages/           Route-level pages
│   │       ├── features/        Vertical feature slices
│   │       └── components/      Shared UI components
│   └── api/                     Fastify (Prisma 7, MySQL)
│       └── src/
│           ├── server.ts        Process entry
│           └── routes/          Plugins registered in routes/index.ts
└── packages/
    ├── types/          @repo/types       — shared TS types
    ├── constants/      @repo/constants   — HTTP_STATUS, ERROR_CODES, PAGINATION
    ├── utils/          @repo/utils       — pure utility functions
    ├── configs/        @repo/configs     — env helpers (requireEnv, optionalEnv)
    ├── hooks/          @repo/hooks       — shared React hooks
    ├── ui/             @repo/ui          — shared React components
    ├── tsconfig/       shared tsconfigs  (base, react, node)
    └── eslint-config/  shared ESLint configs (base, react, node)
```
