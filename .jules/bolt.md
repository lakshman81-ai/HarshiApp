## 2025-01-28 - Context Value Memoization
**Learning:** `DataContext` and `StudyContext` were providing new object references on every render, causing cascading re-renders across the entire application, including heavy components like `Dashboard` and `TopicStudyView`.
**Action:** Always memoize context values with `useMemo` and ensure function properties are stable with `useCallback`.
