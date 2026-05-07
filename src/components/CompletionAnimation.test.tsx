import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CompletionAnimation } from './CompletionAnimation';

describe('CompletionAnimation', () => {
  it('renders nothing when show=false', () => {
    const { container } = render(<CompletionAnimation show={false} onDone={() => {}} />);
    expect(container.querySelector('.text-6xl')).toBeNull();
  });

  it('renders 🎉 when show=true', () => {
    const { getByText } = render(<CompletionAnimation show={true} onDone={() => {}} />);
    expect(getByText('🎉')).toBeInTheDocument();
  });
});
