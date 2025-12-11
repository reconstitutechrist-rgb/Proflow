---
paths: components/**/*.jsx
---

# Component Rules

## Structure

- Functional components with hooks only (no class components)
- Props destructuring in function signature
- Export default for main component
- One component per file (with small helper components allowed)

## Imports

```javascript
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Loader2, Plus, X } from 'lucide-react';
```

## UI Components

- Use shadcn/ui components from `@/components/ui/` when available
- Use Lucide icons from `lucide-react`
- Use `cn()` from `@/lib/utils` for class merging

## Styling

```javascript
// Good - using cn() for conditional classes
<div className={cn('base-class', isActive && 'active-class', className)}>

// Good - shadcn/ui variant
<Button variant="outline" size="sm">Click</Button>
```

## State & Effects

- Use `useState` for local component state
- Use `useEffect` with proper cleanup
- Use `useCallback` for functions passed to children
- Use `useMemo` for expensive computations

## Loading & Error States

- Show skeleton or spinner during loading
- Display user-friendly error messages
- Use `<Suspense>` for lazy-loaded components
