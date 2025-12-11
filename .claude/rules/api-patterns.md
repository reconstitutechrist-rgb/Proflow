---
paths: api/**/*.js
---

# API Layer Rules

## Multi-Tenancy

- All queries MUST filter by `workspace_id` for data isolation
- Never allow cross-workspace data access
- Validate workspace_id before any database operation

## Data Access

- Use `db.js` entity managers for standard CRUD operations
- Entity methods: `list()`, `get()`, `create()`, `update()`, `delete()`, `count()`, `filter()`
- Do not make direct Supabase calls unless extending functionality

## Error Handling

- Log errors with full context: `error.message`, `error.details`, `error.hint`, `error.code`
- Return consistent response shape: `{ data, error }`
- Never expose raw Supabase errors to UI - transform to user-friendly messages
- Use toast notifications for user-facing errors

## Query Patterns

```javascript
// Standard filtered query
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('workspace_id', workspaceId)
  .order('created_date', { ascending: false });

// Entity manager usage
const tasks = await db.entities.Task.filter(
  { workspace_id: workspaceId, status: 'in_progress' },
  '-updated_date',
  20
);
```

## Security

- Validate all input before database operations
- Never trust client-provided workspace_id without verification
- Use parameterized queries (Supabase handles this automatically)
