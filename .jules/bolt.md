## 2024-05-22 - Context Value Recreation & Dead Code
**Learning:** Context providers (`DataContext`, `StudyContext`) were recreating their `value` object on every render, causing cascading re-renders. Additionally, `StudyContext` contained unused `Toast` state/component which cluttered the context.
**Action:** Memoize context values using `useMemo`. Verify unused state/functions with `grep` before removal. Always revert build artifacts.
