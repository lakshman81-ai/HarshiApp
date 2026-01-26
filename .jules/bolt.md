## 2026-01-23 - React.memo Ineffectiveness with Inline Functions
**Learning:** `React.memo` is completely ineffective if the parent component passes inline functions as props (e.g., `onSelect={() => ...}`). This is because a new function reference is created on every render, causing the shallow prop comparison in `memo` to fail.
**Action:** Always wrap event handlers passed to memoized children in `useCallback` to ensure stable references and prevent unnecessary re-renders.
