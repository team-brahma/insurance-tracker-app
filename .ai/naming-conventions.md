# Naming Conventions Reference

This document establishes casing and naming rules for directories, code tokens, and database structures.

---

## 1. Files & Directories

- **Folders**: Use `kebab-case` for all directories in the workspace (e.g. `policy-details`, `api-client`).
- **Files**: Use `kebab-case` for all TS/JS files, assets, and styles (e.g. `auth-controller.ts`, `use-insurance-policy.ts`).
  - _Exception_: React Components files may use PascalCase (e.g. `PolicyCard.tsx`) if matching the component name exactly.

---

## 2. Code Tokens

- **React Components**: Use PascalCase (e.g. `PolicyList`, `Button`).
- **Hooks**: Use camelCase prefixed with `use` (e.g. `usePolicies`, `useWindowDimensions`).
- **Interfaces & Type Aliases**: Use PascalCase (e.g. `PolicySchema`, `UserRole`). Do not prefix interfaces with `I` (e.g. prefer `PolicyRepository` over `IPolicyRepository` unless representing a strict abstract interface definition).
- **Constants**: Use UPPER_SNAKE_CASE (e.g. `MAX_LIMIT_COUNT`, `API_URL`).
- **Variables & Functions**: Use camelCase (e.g. `policyId`, `calculatePremium()`).
- **Enums (Objects)**: Use PascalCase for the object key name, and UPPER_SNAKE_CASE for member keys (e.g. `PolicyStatus.ACTIVE`).

---

## 3. Database Casing

- **Tables**: Use snake_case, plural nouns (e.g. `insurance_policies`, `claim_attachments`).
- **Columns**: Use snake_case (e.g. `policy_number`, `created_at`).
- **Indexes & Keys**: Prefix indexes logically based on column mapping (e.g. `policies_customer_id_idx`).
