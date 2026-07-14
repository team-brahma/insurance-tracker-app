# React Coding Standards

This document establishes React-specific implementation guidelines, component boundaries, and performance rules.

---

## 1. Functional Components Only

- **No Class Components**: Every component must be written as a functional component using ES6 arrow functions or normal function declarations.
- **Typing Props**: Always use explicit TypeScript interfaces to define component props.

```typescript
interface PolicyCardProps {
  readonly id: string;
  readonly title: string;
  readonly premium: number;
}

export function PolicyCard({ id, title, premium }: PolicyCardProps): React.JSX.Element {
  return (
    <div className="p-4 border rounded shadow-sm">
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-gray-600">${premium}</p>
    </div>
  );
}
```

---

## 2. Component Size Budget

To preserve readability, component files should be kept compact and single-purpose.

- **Max Line Limit**: Try to keep component files under **250 lines**.
- **Refactoring Threshold**: If a component exceeds 250 lines, refactor by:
  - Splitting layout sub-structures into separate small, reusable components.
  - Moving complex local states or business rules into custom hooks.
  - Moving data mutations or fetches to custom hooks wrapping TanStack Query.
  - Extracting helper functions into external utility files.

---

## 3. Composition over Prop Drilling

- **Avoid Deep Prop Drilling**: Do not pass props down through more than three levels of children.
- **Prefer Children/Slot Composition**: Pass components as `children` or explicit slots to decouple parents and sub-components.
- **Context usage**: Use React Context sparingly, only when global/sub-tree states are stable and do not cause frequent performance-critical re-renders.

---

## 4. Performance Optimization

- **Memoization**: Do not wrap every component in `React.memo` or use `useMemo`/`useCallback` everywhere. Use them only when:
  - Passing callbacks to expensive child components that perform strict reference comparison.
  - Doing heavy mathematical or data transformations on large datasets.
- **Virtualization**: Use virtualized lists (e.g. Ionic virtual scroll or React Window) when rendering lists containing more than 100 entries.
