---
description: Help write a Supabase query
allowed-tools: Read, Grep
---

Help write a Supabase query for: $ARGUMENTS

## Steps

1. **Understand the requirement**
   - What data needs to be fetched/modified?
   - Which table(s) are involved?
   - What filters are needed?

2. **Check existing patterns**
   - Read `@api/db.js` for entity manager patterns
   - Read `@api/entities.js` for available entities
   - Search for similar queries in the codebase

3. **Generate query**
   - Always include `workspace_id` filter for multi-tenancy
   - Use proper error handling
   - Return consistent response shape

## Query Templates

### Select with filters

```javascript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('workspace_id', workspaceId)
  .eq('status', 'active')
  .order('created_date', { ascending: false })
  .limit(20);
```

### Insert

```javascript
const { data, error } = await supabase
  .from('table_name')
  .insert({
    workspace_id: workspaceId,
    ...otherFields,
  })
  .select()
  .single();
```

### Update

```javascript
const { data, error } = await supabase
  .from('table_name')
  .update({ field: value })
  .eq('id', recordId)
  .eq('workspace_id', workspaceId)
  .select()
  .single();
```

### Delete

```javascript
const { error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', recordId)
  .eq('workspace_id', workspaceId);
```

## Example Usage

```
/db-query fetch all tasks for a project with status filtering
/db-query update document metadata
/db-query get user's recent chat sessions
```
