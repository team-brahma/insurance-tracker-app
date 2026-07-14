# Insurance Tracker

> Enterprise-grade Turborepo monorepo — Ionic React + Fastify + Prisma + MySQL

---

## Technology Stack

| Layer           | Technology                                              |
| --------------- | ------------------------------------------------------- |
| Monorepo        | Turborepo 2.10.1                                        |
| Package Manager | pnpm 11.9.0 (Node 22 required)                          |
| Frontend        | Ionic React 8, Vite 8, Tailwind CSS 4, shadcn/ui, MUI 9 |
| State / Data    | TanStack Query 5, Zustand 5, Axios 1.18                 |
| Routing         | React Router 8                                          |
| Backend         | Fastify 5.9.0                                           |
| ORM             | Prisma 7.8.0                                            |
| Database        | MySQL                                                   |
| Language        | TypeScript 6.0.3 (strict)                               |
| Linting         | ESLint 10 + typescript-eslint 8                         |
| Formatting      | Prettier 3.9.4                                          |
| Git Hooks       | Husky 9.1.7 + lint-staged 17.0.8                        |

---

## Repository Structure

```
Insurance_Tracker/
├── .ai/
│   └── ENGINEERING.md       Engineering standards (AI agents must read this)
├── .husky/
│   ├── pre-commit           Runs lint-staged
│   └── commit-msg           Enforces Conventional Commits
├── apps/
│   ├── mobile/              Ionic React application (port 5173)
│   └── api/                 Fastify REST API (port 3001)
├── packages/
│   ├── tsconfig/            Shared TypeScript configs
│   ├── eslint-config/       Shared ESLint flat configs
│   ├── types/               @repo/types — shared TS types
│   ├── constants/           @repo/constants — shared constants
│   ├── utils/               @repo/utils — shared utilities
│   ├── hooks/               @repo/hooks — shared React hooks
│   ├── ui/                  @repo/ui — shared React components
│   └── configs/             @repo/configs — shared config helpers
├── AGENTS.md                AI agent instructions
├── README.md
├── package.json             Root workspace (pnpm + turbo + husky)
├── pnpm-workspace.yaml
├── turbo.json               Pipeline configuration
├── .prettierrc
├── .editorconfig
├── .gitignore
├── .nvmrc                   Node 22
└── .env.example
```

---

## Prerequisites

- **Node.js** `>= 22.0.0` — [Download](https://nodejs.org/)
- **pnpm** `>= 11.9.0` — Install via `npm install -g pnpm@11.9.0`
- **MySQL** `>= 8.0` running locally or via Docker
- **Git** for hooks (Husky)

> ⚠️ pnpm 11 requires Node 22+. Using Node 20 will fail.

---

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd Insurance_Tracker
```

### 2. Verify Node version

```bash
node --version  # Must be >= 22.0.0
# If using nvm:
nvm use
```

### 3. Install dependencies

```bash
pnpm install
```

### 4. Configure environment variables

```bash
# API
cp apps/api/.env.example apps/api/.env

# Mobile
cp apps/mobile/.env.example apps/mobile/.env

# Edit the .env files with your values
```

### 5. Set up the database

```bash
# Ensure MySQL is running, then:
cd apps/api

# Generate Prisma client
pnpm db:generate

# Create database and run migrations
pnpm db:migrate
```

### 6. Set up Git hooks

```bash
pnpm prepare
```

---

## Development

### Start all apps in development mode

```bash
pnpm dev
```

This starts:

- Mobile app at `http://localhost:5173`
- API server at `http://localhost:3001`

### Start individual apps

```bash
# Mobile only
cd apps/mobile && pnpm dev

# API only
cd apps/api && pnpm dev
```

---

## Build

```bash
# Build all apps and packages
pnpm build

# Build a specific app
cd apps/mobile && pnpm build
cd apps/api && pnpm build
```

Turborepo caches builds — repeated builds are near-instant if nothing has changed.

---

## Lint

```bash
# Check all packages
pnpm lint

# Auto-fix all packages
pnpm lint:fix

# Lint a specific package
cd apps/mobile && pnpm lint
```

---

## Type Checking

```bash
# Typecheck all packages
pnpm typecheck

# Typecheck a specific package
cd apps/mobile && pnpm typecheck
```

---

## Formatting

```bash
# Format all files
pnpm format

# Check formatting (CI mode)
pnpm format:check
```

---

## Database (Prisma)

```bash
# Generate Prisma client after schema changes
pnpm --filter @repo/api db:generate

# Create a new migration
pnpm --filter @repo/api db:migrate

# Apply migrations in production
pnpm --filter @repo/api db:migrate:deploy

# Open Prisma Studio (GUI)
pnpm --filter @repo/api db:studio
```

---

## Adding a New Shared Package

1. Create the package directory under `packages/`:

```bash
mkdir packages/my-package
```

2. Create `package.json`:

```json
{
  "name": "@repo/my-package",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts"
    }
  },
  "devDependencies": {
    "@repo/tsconfig": "workspace:*"
  }
}
```

3. Create `tsconfig.json` extending the appropriate shared config:

```json
{
  "extends": "../../packages/tsconfig/base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

4. Create `src/index.ts` as the barrel export.

5. Reference it in any app:

```json
{
  "dependencies": {
    "@repo/my-package": "workspace:*"
  }
}
```

---

## Adding a New Application

1. Create the app directory under `apps/`.
2. Create a `package.json` with `"name": "@repo/<app-name>"`.
3. Add the app to the Turborepo pipeline — most tasks inherit automatically.
4. Reference shared packages via `"@repo/*": "workspace:*"`.

---

## Commit Convention

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional-scope>): <description>
```

| Type       | When to use                   |
| ---------- | ----------------------------- |
| `feat`     | New feature                   |
| `fix`      | Bug fix                       |
| `docs`     | Documentation only            |
| `style`    | Code style (no logic change)  |
| `refactor` | Refactor without fix/feat     |
| `perf`     | Performance improvement       |
| `test`     | Adding or fixing tests        |
| `build`    | Build system changes          |
| `ci`       | CI configuration              |
| `chore`    | Miscellaneous (deps, tooling) |
| `revert`   | Revert a commit               |

---

## AI Agent Guidelines

See [AGENTS.md](./AGENTS.md) and [.ai/ENGINEERING.md](./.ai/ENGINEERING.md).
