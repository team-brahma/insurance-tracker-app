# RESTful API Standards & Conventions

This document defines standard practices for designing API contracts, formatting responses, and routing conventions.

---

## 1. RESTful Principles

- **Plural Resource Naming**: Endpoint URIs must always use plural nouns representing the entity collections (e.g. `/api/v1/policies`, `/api/v1/claims`).
- **Correct HTTP Methods**: Map actions to their appropriate HTTP methods:
  - `GET`: Retrieve data without side effects.
  - `POST`: Create a new resource or execute a non-idempotent action.
  - `PUT`: Replace an entire resource or update a resource collection.
  - `PATCH`: Partially update a resource.
  - `DELETE`: Remove a resource.
- **API Versioning**: Prefix endpoints with version segments (e.g. `/api/v1/...`) to maintain backward compatibility.

---

## 2. Standardized Response Format

Every single API response returned by our backend must match this standard JSON structure:

```json
{
  "success": true,
  "message": "Resource retrieved successfully",
  "data": {},
  "errors": null,
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

- **success**: Boolean status.
- **message**: Short user-friendly message.
- **data**: Main payload. Can be an object, array, or null.
- **errors**: Array of validation/business errors if `success` is `false`.
- **meta**: Metadata for collection endpoints (e.g. pagination stats).

---

## 3. Query Parameters

API collections must support:

- **Pagination**: Use query variables `page` and `limit`. Default limits must be capped to prevent memory overloading.
- **Filtering**: Standardized parameters (e.g. `/api/v1/policies?status=ACTIVE`).
- **Sorting**: Format sorting constraints as field/direction pairs (e.g. `sort=createdAt:desc`).
