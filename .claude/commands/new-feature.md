---
description: Scaffold a new feature module
allowed-tools: Read, Write, Edit, Glob
---

Create a new feature module in `/features/$1/` following existing patterns.

## Steps

1. First, read existing feature structures for reference:
   - `@features/tasks/` - Task management feature
   - `@features/projects/` - Project management feature

2. Create the feature directory structure:

   ```
   features/$1/
   ├── [MainComponent].jsx  # Primary feature component
   ├── [SubComponents].jsx  # Supporting components
   └── index.js             # Exports
   ```

3. Follow these conventions:
   - Use PascalCase for component files
   - Import shared components from `@/components/`
   - Import hooks from `@/hooks/`
   - Use `useWorkspace()` for workspace_id
   - Use `useAuth()` for user info

4. Create an index.js that exports the main component:
   ```javascript
   export { default as FeatureName } from './FeatureName';
   ```

## Example Usage

```
/new-feature notifications
/new-feature analytics
```
