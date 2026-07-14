# Database Schema & Migration Guidelines

This document outlines relational standards, naming conventions, index practices, and migration protocols for the MySQL database.

---

## 1. Schema Relational Modeling

- **Normal Form**: Database schemas should strive for Third Normal Form (3NF) to eliminate data redundancy and prevent update anomalies.
- **Foreign Key Constraints**: Relational integrity must be maintained using explicit foreign key constraints. Never rely on application logic alone to maintain reference constraints.
- **Nullable Fields**: Avoid nullable fields. Use appropriate default values or fallback constants where possible. Fields should only be nullable when representing data that is genuinely optional.

---

## 2. Naming Conventions

- **Tables**: Lowercase, plural, using snake_case (e.g. `insurance_policies`, `customer_profiles`).
- **Columns**: Lowercase, snake_case (e.g. `policy_number`, `created_at`).
- **Primary Keys**: Name the column `id`.
- **Foreign Keys**: Match the singular parent table name followed by `_id` (e.g. `policy_id`, `customer_profile_id`).

---

## 3. Indexing & Constraints

- **Index Selection**: Place indexes on fields that are frequently used in `WHERE`, `JOIN`, or `ORDER BY` operations.
- **Unique Constraints**: Declare unique constraints on business-level unique fields (e.g. email, policy identifier numbers).
- **Composite Indexes**: Use composite indexes when queries routinely filter on multiple columns simultaneously (e.g. filtering policies by both `customer_id` and `status`).

---

## 4. Migrations & State Changes

- **Migration First**: Every database schema change must be executed via Prisma migration files. Never edit table structures directly in a client tool or production instance.
- **Review Migrations**: Verify migration files locally before merging. Ensure they contain appropriate rollback plans and avoid dangerous operations (e.g. dropping tables containing active client records).
- **Soft Deletes**: Use soft-delete patterns (`deletedAt`) only when specifically requested. Otherwise, use cascades or restricted delete actions.
