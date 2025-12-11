---
paths: hooks/**/*.js
---

# Custom Hook Rules

## Naming

- Always prefix with `use`: `useChat`, `useAskAI`, `useDebouncedValue`
- Name describes what it provides or does

## Return Values

```javascript
// Array for simple state + setter
const [value, setValue] = useCustomHook();

// Object for complex returns
const { data, loading, error, refetch } = useCustomHook();
```

## Structure

```javascript
export function useCustomHook(params) {
  const [state, setState] = useState(initialValue);

  // Effects with cleanup
  useEffect(() => {
    // setup
    return () => {
      // cleanup
    };
  }, [dependencies]);

  // Memoized callbacks
  const handleAction = useCallback(() => {
    // action logic
  }, [dependencies]);

  return { state, handleAction };
}
```

## Best Practices

- Handle cleanup in `useEffect` return function
- Use `useCallback` for functions passed to children or dependencies
- Use `useMemo` for expensive computations
- Keep hooks focused on single responsibility

## Exports

Export all hooks from `hooks/index.js`:

```javascript
export { useDebouncedValue } from './useDebouncedValue';
export { useAskAI, MEMORY_LIMITS } from './useAskAI';
export { useChat } from './useChat';
```

## Testing

- Hooks should be testable in isolation
- Mock external dependencies (Supabase, context)
- Test edge cases and error states
