# Prisma ORM Standards

This document establishes Prisma ORM configurations, model structure requirements, and optimization rules.

---

## 1. Schema Conventions

- **No Auto-Increment IDs**: All primary keys must be UUID string keys. Avoid auto-increment integers unless explicitly requested otherwise.
- **Metadata Fields**: Every model must define metadata tracking fields:
  - `id String @id @default(uuid())`
  - `createdAt DateTime @default(now())`
  - `updatedAt DateTime @updatedAt`
- **Table Mapping**: Use explicit database table mapping to enforce snake_case on the database side:
  - `@@map("table_names")` for tables
  - `@map("column_name")` for columns (if the schema naming conventions mismatch code naming conventions)

```prisma
model InsurancePolicy {
  id             String    @id @default(uuid())
  policyNumber   String    @unique @map("policy_number")
  premium        Decimal
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  @@map("insurance_policies")
}
```

---

## 2. Relational Declarations

- **Relations**: Explicitly define relationship rules using Prisma relations. Do not manage keys manually in code.
- **Junction Tables**: When building many-to-many relationships, write explicit junction models rather than letting Prisma maintain implicit tables. This allows easily extending relations with additional fields later.

---

## 3. Query Optimizations

- **Select Exact Fields**: Avoid grabbing heavy, unneeded columns. Use `select` to target precise fields for return payloads.
- **Avoid Nested Includes**: Avoid deep nested `include` blocks that trigger massive JOIN arrays and memory overflows. Query nested data flatly, or execute multiple sequential queries when performance is critical.
- **Transactions**: Wrap multiple write operations (or dependent writes) inside `prisma.$transaction([])` to guarantee relational consistency and rollback on failures.
- **No Direct DB Client**: Never introduce alternative ORMs or run raw SQL bypasses unless standard Prisma queries cannot solve the problem.
