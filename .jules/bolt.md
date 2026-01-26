## 2024-05-23 - Context Value Memoization
**Learning:** `DataContext` and `StudyContext` were creating new value objects on every render. Since `StudyProvider` consumes `DataContext`, this caused a chain reaction where `StudyProvider` would re-render whenever `DataProvider` did (even if data was stable), and then `StudyProvider` would create a new value, forcing the entire app to re-render.
**Action:** Always wrap Context value objects in `useMemo` and functions in `useCallback`. This is critical for foundational providers that sit at the top of the component tree.
