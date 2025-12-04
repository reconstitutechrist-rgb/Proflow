# Claude Code Instructions for Proflow

## Critical: Always Verify, Never Assume

Before claiming files exist, need deletion, or are unused:
1. **Verify file existence** - Use `Glob` or `ls` to confirm files actually exist on disk before claiming they need to be deleted
2. **Verify usage** - Use `Grep` to search for actual imports/references, not just infer from related code
3. **Check filesystem state** - Code references (imports, routes, constants) may exist for backwards compatibility even after files are deleted

Do NOT:
- Assume a file exists just because it's referenced in routing/import code
- Report files as "dead code" without confirming they exist
- Make claims about the codebase without direct verification

## Project Structure

- `/pages/` - Page components (routed via index.jsx)
- `/components/` - Reusable UI components
- `/features/` - Feature-specific modules
- `/hooks/` - Custom React hooks
- `/api/` - API layer and database functions
- `/config/` - Constants and configuration

## Consolidated Pages

These hub pages consolidate multiple features:
- `AIHub.jsx` - Chat, Research, and Generate tabs (replaces old standalone pages)
- `DocumentsHub.jsx` - Library, Studio, and Templates tabs

Old routes redirect to these hubs for backwards compatibility.
