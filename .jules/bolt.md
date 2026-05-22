## 2024-05-22 - Repeated array operations in React Render
**Learning:** Found that `getCredentialOptions` inside `NodePropertiesForm.tsx` was filtering and mapping the `credentials` array every time it was called, and it was being called up to 3 times per render phase in the JSX return. This is a common React performance anti-pattern.
**Action:** Extract repeating inline function calls inside components to a memoized variable using `useMemo` so that the result is computed once per render and only recomputed when dependencies change.
