---
description: Run lint and fix all issues
allowed-tools: Bash, Read, Edit
---

Run ESLint and fix all linting issues in the project.

## Steps

1. Run `npm run lint` to see all current linting issues

2. Run `npm run lint:fix` to auto-fix what ESLint can handle automatically

3. For remaining issues that can't be auto-fixed:
   - Read each file with issues
   - Apply manual fixes following ESLint rules
   - Common fixes:
     - Remove unused imports
     - Add missing dependencies to useEffect
     - Fix prop-types issues
     - Resolve hook ordering issues

4. Run `npm run lint` again to verify all issues are resolved

5. Optionally run `npm run format` to ensure consistent formatting

## Common ESLint Rules in This Project

- `no-unused-vars` - Remove or prefix with `_`
- `react-hooks/exhaustive-deps` - Add missing deps or use `// eslint-disable-next-line`
- `react/no-unescaped-entities` - Use `&apos;` or escape quotes

## Example Usage

```
/fix-lint
```
