---
description: Create a new component following project patterns
allowed-tools: Read, Write, Edit
---

Create a new component at the specified path following Proflow conventions.

## Arguments

- `$ARGUMENTS` - Component path (e.g., `components/dashboard/MetricsCard`)

## Component Template

```javascript
import { cn } from '@/lib/utils';

export default function ComponentName({ className, ...props }) {
  return (
    <div className={cn('', className)} {...props}>
      {/* Component content */}
    </div>
  );
}
```

## Checklist

1. Use functional component with hooks
2. Import `cn` from `@/lib/utils` for class merging
3. Use shadcn/ui components from `@/components/ui/` when applicable
4. Use Lucide icons from `lucide-react`
5. Export default for main component
6. Accept `className` prop for styling flexibility
7. Destructure props in function signature

## Naming

- PascalCase for component name and file
- File name matches component name: `MetricsCard.jsx` exports `MetricsCard`

## Example Usage

```
/new-component components/dashboard/MetricsCard
/new-component features/tasks/TaskPriorityBadge
```
