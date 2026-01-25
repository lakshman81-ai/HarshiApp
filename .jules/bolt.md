## 2024-05-23 - React Context Optimization
**Learning:** Context Providers in this codebase were creating new `value` objects on every render, causing all consumers to re-render even when data hadn't changed. This is a common anti-pattern in React applications that leads to performance degradation as the app grows.
**Action:** Always wrap context values in `useMemo` and functions in `useCallback` when creating Context Providers to ensure stable references.
