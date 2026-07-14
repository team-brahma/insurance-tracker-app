# Testing Guidelines

This document outlines architectural requirements for building testable systems, defining scopes for Unit, Integration, and End-to-End tests.

---

## 1. Testability Design

- **Decoupled Business Rules**: Business logic must reside in pure domain services rather than within UI presentation controllers or express frameworks. This allows testing calculations and policy rules independently of network/rendering environments.
- **Dependency Injection (DI)**: Services must receive their repository/database instances as explicit arguments or constructor dependencies rather than instantiating database connections globally. This makes it trivial to inject mocks or in-memory equivalents in tests.

```typescript
// ✅ TESTABLE SERVICE DESIGN
export class PolicyService {
  constructor(private readonly policyRepository: IPolicyRepository) {}

  public async calculatePremium(policyId: string): Promise<number> {
    const policy = await this.policyRepository.findById(policyId);
    if (!policy) throw new NotFoundError('Policy');
    // perform calculation...
    return 100;
  }
}
```

---

## 2. Testing Layers

- **Unit Tests**:
  - **Scope**: Reusable utilities, custom hooks, services (with mocked repositories), schema validators.
  - **Goal**: Fast, low-overhead validation of internal functions.
- **Integration Tests**:
  - **Scope**: Controllers + Services + Repositories communicating with a real or isolated database container.
  - **Goal**: Verify transactional consistency, relational queries, error cascades, and Fastify schema serialization.
- **End-to-End (E2E) Tests**:
  - **Scope**: Complete user flows linking the client application to the API backend.
  - **Goal**: Validate happy-path interactions (e.g. login ➔ policy creation ➔ payment confirmation).
