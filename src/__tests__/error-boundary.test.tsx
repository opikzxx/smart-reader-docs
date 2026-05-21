import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../components/error-boundary';

// Component that throws an error for testing
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Content rendered successfully</div>;
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary section="Upload">
        <div>Child content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders fallback UI when an error occurs', () => {
    render(
      <ErrorBoundary section="Dashboard">
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText('An error occurred in the Dashboard section.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('displays the section name in the error message', () => {
    render(
      <ErrorBoundary section="Review">
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(
      screen.getByText('An error occurred in the Review section.')
    ).toBeInTheDocument();
  });

  it('logs error to console with component origin', () => {
    render(
      <ErrorBoundary section="Upload">
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ErrorBoundary][Upload] An error occurred:',
      'Test error'
    );
  });

  it('does not display stack traces or server addresses in the UI', () => {
    render(
      <ErrorBoundary section="Dashboard">
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const alertElement = screen.getByRole('alert');
    const textContent = alertElement.textContent || '';

    // Should not contain stack trace patterns
    expect(textContent).not.toMatch(/at\s+\w+/);
    expect(textContent).not.toMatch(/localhost/);
    expect(textContent).not.toMatch(/:\d{4}/);
    // Should only contain user-friendly text
    expect(textContent).toContain('Something went wrong');
    expect(textContent).toContain('Dashboard');
    expect(textContent).toContain('Try Again');
  });

  it('resets error state when "Try Again" is clicked', () => {
    // Use a component that can be controlled to stop throwing
    let shouldThrow = true;
    function ControlledComponent() {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>Content rendered successfully</div>;
    }

    const { rerender } = render(
      <ErrorBoundary section="Upload">
        <ControlledComponent />
      </ErrorBoundary>
    );

    // Error state should be shown
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Stop throwing before clicking Try Again
    shouldThrow = false;

    // Click Try Again - this resets the error boundary state
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    expect(screen.getByText('Content rendered successfully')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error UI</div>;

    render(
      <ErrorBoundary section="Review" fallback={customFallback}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('has proper accessibility attributes on fallback UI', () => {
    render(
      <ErrorBoundary section="Dashboard">
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const alertElement = screen.getByRole('alert');
    expect(alertElement).toHaveAttribute('aria-live', 'assertive');
  });
});
