---
description: Run all checks before committing
allowed-tools: Bash, Read
---

Run all pre-commit checks to ensure code quality before committing.

## Checks to Run

1. **Lint Check**

   ```bash
   npm run lint
   ```

   - Must pass with no errors
   - Warnings are acceptable but should be minimized

2. **Format Check**

   ```bash
   npm run format:check
   ```

   - Ensures code follows Prettier formatting
   - Run `npm run format` if this fails

3. **Test Suite**

   ```bash
   npm run test:run
   ```

   - All tests must pass
   - Check for any skipped tests that should be enabled

4. **Build Check** (optional but recommended)

   ```bash
   npm run build
   ```

   - Ensures production build succeeds
   - Catches TypeScript/import errors

## Report

After running all checks, report:

- ✅ Passing checks
- ❌ Failing checks with details
- Suggested fixes for any failures

## Example Usage

```
/pre-commit
```
