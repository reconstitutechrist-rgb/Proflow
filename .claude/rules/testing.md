---
paths: '**/*.{test,spec}.{js,jsx}'
---

# Testing Rules

## Framework

- Vitest as test runner (Jest-compatible API)
- Testing Library for React components
- JSDOM environment

## File Location

Test files should be co-located with source:

```
Component.jsx
Component.test.jsx
```

## Test Structure

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Component from './Component';

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByText('Expected text')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    render(<Component />);
    await fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Updated text')).toBeInTheDocument();
  });
});
```

## Mocking

```javascript
// Mock Supabase
vi.mock('@/api/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

// Mock context
vi.mock('@/features/workspace/WorkspaceContext', () => ({
  useWorkspace: () => ({ currentWorkspaceId: 'test-workspace' }),
}));
```

## Best Practices

- Test user interactions, not implementation details
- Use `getByRole`, `getByText` over `getByTestId`
- Test error states and loading states
- Keep tests focused and readable

## Commands

```bash
npm run test          # Watch mode
npm run test:run      # Single run
npm run test:coverage # With coverage report
```
