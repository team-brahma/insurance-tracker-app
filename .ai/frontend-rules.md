# Frontend Architecture & Guidelines

This document governs the development of the frontend client application (`apps/mobile`), leveraging React, Ionic React, Tailwind CSS, shadcn/ui, Axios, and TanStack Query.

---

## 1. State Management Split

State management must be divided strictly into client state and server state:

### Server State (TanStack Query)

- **Rule**: All asynchronous data retrieved from the API must be managed by TanStack Query. Do not use local `useState` + `useEffect` combinations for fetching/syncing backend data.
- **No Zustand/Redux for Server Data**: Never mirror server response payloads inside Zustand or any client-side state manager.

```typescript
// ✅ CORRECT: Custom query hook encapsulating server state
export function useInsurancePolicies() {
  return useQuery({
    queryKey: ['policies'],
    queryFn: () => policyService.getAll(),
  });
}
```

### Client State (Zustand)

- **Rule**: Use Zustand only for global client-side state that must persist across page views and route transitions (e.g., app theme, active user sessions, active offline queue, global sidebar state).
- Keep stores small, modular, and specialized. Avoid large monolithic stores.

---

## 2. API Integration & Axios Client

- All network requests must go through a centralized Axios instance. Never use the raw `fetch` API directly.
- The centralized Axios client must implement:
  - **Request Interceptors**: Injecting JWT headers into outgoing requests.
  - **Response Interceptors**: Catching error status codes (e.g., 401 Unauthorized, 403 Forbidden) and initiating token refresh routines.
  - **Centralized Error Handling**: Standardizing Axios errors into predictable application exceptions before passing them to the UI context.

---

## 3. Forms & Schema Validation

- All interactive forms must use **React Hook Form**.
- Validation schemas must be defined with **Zod** and kept separated from components.
- Design validation schemas to be reusable between different UI representations.

```typescript
import { z } from 'zod';

export const policyFormSchema = z.object({
  policyNumber: z.string().min(5, 'Policy number must be at least 5 characters'),
  coverageAmount: z.number().positive('Coverage must be positive'),
});

export type PolicyFormValues = z.infer<typeof policyFormSchema>;
```
