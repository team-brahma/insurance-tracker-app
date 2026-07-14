# TypeScript Standards & Guidelines

This document governs typing patterns, compiler settings, and strict coding behaviors for the monorepo.

---

## 1. Strict Compiler Enforcement

- **Strict Mode Enabled**: TypeScript's `strict` configuration must remain set to `true` in all tsconfigs.
- **No `any`**: The use of `any` is strictly prohibited. If a type is unknown or dynamic, utilize `unknown` and apply runtime type guards or assertions.
- **No Suppressing Errors**: The use of `@ts-ignore` is forbidden. In rare exceptions where compiler quirks make suppression necessary, you must use `@ts-expect-error` accompanied by a documented comment explaining why.

---

## 2. Exports & Public Contracts

- **Explicit Return Types**: All exported functions, services, and utility helpers must declare their return types explicitly. Do not rely on TypeScript compiler type inference for public package entry points.
- **Interfaces vs. Types**:
  - Use `interface` for defining public API payloads, service contracts, and components props that can be extended or implemented.
  - Use `type` aliases for declaring unions, intersections, primitives, tuples, or specific discriminated variants.
- **Read-only Primitives**: Mark array parameters or object properties that must not be mutated as `readonly`.

---

## 3. Discriminated Unions & Pattern Matching

Always prefer discriminated unions to model state scenarios or API payloads containing optional dependencies.

```typescript
type AsyncState<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'error'; readonly error: Error };
```

---

## 4. Avoid Enums

- **No TypeScript Enums**: Standard TypeScript `enum` constructs are forbidden. They compile into custom JS objects that do not tree-shake well and cause reference resolution complexity.
- **Prefer Const Assertions**: Instead, define read-only objects with literal key unions:

```typescript
export const PolicyStatus = {
  ACTIVE: 'ACTIVE',
  PENDING: 'PENDING',
  EXPIRED: 'EXPIRED',
} as const;

export type PolicyStatus = (typeof PolicyStatus)[keyof typeof PolicyStatus];
```
