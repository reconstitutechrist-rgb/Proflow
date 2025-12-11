---
description: Analyze a feature module structure
allowed-tools: Read, Glob, Grep
---

Analyze the feature module at `features/$1/` and provide a comprehensive overview.

## Analysis Steps

1. **List Components**
   - Find all `.jsx` files in the feature directory
   - Describe each component's purpose based on its name and content

2. **Map Dependencies**
   - External imports (from @/components, @/hooks, @/api)
   - Internal imports (within the feature)
   - Third-party library usage

3. **Identify Patterns**
   - State management approach (useState, useContext, React Query)
   - Data fetching methods
   - Event handling patterns

4. **Component Relationships**
   - Which component is the main entry point?
   - Parent-child relationships
   - Shared state between components

5. **Suggestions**
   - Potential improvements
   - Code organization suggestions
   - Performance optimization opportunities

## Output Format

```
## Feature: [name]

### Components
- ComponentA.jsx - [description]
- ComponentB.jsx - [description]

### Dependencies
- External: [...imports]
- Internal: [...imports]

### Data Flow
[diagram or description]

### Suggestions
- [improvement 1]
- [improvement 2]
```

## Example Usage

```
/analyze-feature tasks
/analyze-feature chat
/analyze-feature ai
```
