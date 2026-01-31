## 2026-01-31 - DataTransformer Case Sensitivity
**Learning:** The `DataTransformer` service strictly requires input data objects to use uppercase keys (e.g., `SUBJECTS`, `TOPICS`) to correctly map and transform data.
**Action:** When mocking `fetchLocalExcelData` or similar data sources in tests, ensure the mock data structure uses uppercase keys to match the expected schema of `DataTransformer.js`.
