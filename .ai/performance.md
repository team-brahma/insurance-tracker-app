# Performance Optimization Guidelines

This document provides guidelines for maintaining high responsiveness, fast build times, and optimized page loads.

---

## 1. Frontend Performance

- **Lazy Loading**: Lazy-load all route components using dynamic imports (`React.lazy`). Do not bundle all pages into a single main package.
- **Tree Shaking**: Ensure third-party library imports are structured to enable tree-shaking. Avoid importing entire packages if only a few functions are needed:

```typescript
// ❌ WRONG
import lodash from 'lodash';

// ✅ CORRECT
import { debounce } from 'lodash';
// OR
import debounce from 'lodash/debounce';
```

- **Image Optimization**: Always utilize optimized responsive image sizes and set appropriate loading properties (e.g. `loading="lazy"`).
- **Render Audits**: Keep component trees clean. Avoid creating inline object structures or functions in component render blocks that invalidate references and trigger redundant re-renders.

---

## 2. Backend Performance

- **Connection Pooling**: Optimize database connections using Prisma's default connection pooling parameters. Keep pool sizes aligned with deployment scaling metrics.
- **Avoid N+1 Queries**: When retrieving parent lists and child dependencies, either join them using selective relationship queries, or batch them explicitly using transactional mappings. Avoid querying child items in sequential loops.
- **API Caching**: cache stable, high-read endpoints (e.g. policy plans catalog, lookup tables) using server-side key-value stores.
- **Batch Operations**: Use batch insertions or updates (`createMany`, `updateMany`) when handling lists of data to reduce roundtrip delays.
