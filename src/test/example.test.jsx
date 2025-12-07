import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Example Test Suite', () => {
  it('should render a simple element', () => {
    render(<div data-testid="hello">Hello World</div>);
    expect(screen.getByTestId('hello')).toHaveTextContent('Hello World');
  });

  it('should pass a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });
});
