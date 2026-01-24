## 2024-05-23 - Context Performance
**Learning:** Context Providers (`DataContext`, `StudyContext`) were re-creating their `value` object on every render. This caused all consumers (Dashboard, etc.) to re-render whenever the provider re-rendered, even if the data was unchanged.
**Action:** Always memoize Context `value` objects with `useMemo` to ensure referential stability.
