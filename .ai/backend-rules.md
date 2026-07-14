# Backend Architecture & Fastify Guidelines

This document governs the development of the backend Fastify API application (`apps/api`), using TypeScript, Prisma ORM, and MySQL.

---

## 1. Request Lifecycle Layers

Every HTTP request must navigate through this sequence of layers without exception:

1. **Route registration**: Defines path, HTTP verb, access control, and payload schema.
2. **Controller validation**: Extracts parameters, calls business services, handles errors, and returns responses.
3. **Service execution**: Houses core business rules, coordinates other services/repositories, handles database transactions.
4. **Repository queries**: Pure Prisma queries matching service requests.

- **Never Bypass Layers**: Controllers must never query Prisma directly. Services must never handle raw HTTP contexts.

---

## 2. Request & Response Validation

- **Validation Rules**: Every endpoint must declare Fastify JSON-schemas for request parameters:
  - `body`
  - `querystring`
  - `params`
  - `headers`
- Validation schema components must be built and bound at the routing layer so Fastify handles pre-parsing and compiles optimized deserializers.
- Never trust client inputs. Avoid loose typing for request bodies.

---

## 3. Error Handling & Custom AppError

We handle errors centrally within Fastify hooks:

- Use a global `errorHandler` Fastify plugin to catch unhandled rejections and standard custom exceptions.
- Always throw specialized subclasses of `AppError` (e.g. `NotFoundError`, `UnauthorizedError`, `ValidationError`).
- **Security Guard**: Never expose server stack traces to API clients. Log details using Pinot, and return a clean JSON payload.

---

## 4. Logging & Pino Standard

- **No Console Logs**: Under no circumstances should `console.log` be present in the backend codebase.
- **Pino Logger**: Always use Fastify's built-in `fastify.log` (Pino) instance or a structured logger utility.
- Log levels must be selected logically:
  - `info`: Key operational milestones.
  - `warn`: Recoverable failures, user-input validation errors, authentication failures.
  - `error`: Uncaught exceptions, critical database connections drops, API integration failures.

---

## 5. Background Jobs

- Long-running operations (such as processing reports, batch notifications, or PDF generation) must never block the HTTP request-response thread.
- Offload these tasks to background workers, task queues, or asynchronous worker processes.
