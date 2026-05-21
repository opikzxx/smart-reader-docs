import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReviewForm } from '../components/documents/review-form';
import type { ExtractionResult } from '@/lib/documents/types';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock useSubmitReview hook
const mockMutate = vi.fn();
let mockSubmitReview = {
  mutate: mockMutate,
  isPending: false,
  isError: false,
  isSuccess: false,
  error: null as Error | null,
};

vi.mock('@/hooks/use-submit-review', () => ({
  useSubmitReview: () => mockSubmitReview,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function createExtractionResult(overrides?: Partial<ExtractionResult>): ExtractionResult {
  return {
    vendor_name: 'Acme Corp',
    date: '2024-01-15',
    total: 1250.0,
    currency: 'USD',
    items: [
      { description: 'Widget A', quantity: 2, unit_price: 500, amount: 1000 },
      { description: 'Widget B', quantity: 1, unit_price: 250, amount: 250 },
    ],
    confidence_scores: {
      vendor_name: 0.95,
      date: 0.88,
      total: 0.92,
      currency: 0.99,
      items: 0.85,
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSubmitReview = {
    mutate: mockMutate,
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
  };
});

describe('ReviewForm', () => {
  describe('rendering', () => {
    it('renders the form with pre-filled extraction data', () => {
      render(
        <ReviewForm documentId={1} extractionResult={createExtractionResult()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument();
      expect(screen.getByDisplayValue('USD')).toBeInTheDocument();
    });

    it('renders the review header banner', () => {
      render(
        <ReviewForm documentId={1} extractionResult={createExtractionResult()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Review Extracted Data')).toBeInTheDocument();
    });

    it('renders line items', () => {
      render(
        <ReviewForm documentId={1} extractionResult={createExtractionResult()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByDisplayValue('Widget A')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Widget B')).toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(
        <ReviewForm documentId={1} extractionResult={createExtractionResult()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /save & finalize/i })).toBeInTheDocument();
    });

    it('renders confidence scores', () => {
      render(
        <ReviewForm documentId={1} extractionResult={createExtractionResult()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('AI: 95%')).toBeInTheDocument();
    });
  });

  describe('line items', () => {
    it('can add a new item', () => {
      render(
        <ReviewForm documentId={1} extractionResult={createExtractionResult()} />,
        { wrapper: createWrapper() }
      );

      const addButton = screen.getByRole('button', { name: /add item/i });
      fireEvent.click(addButton);

      // Should now have 3 description inputs (2 original + 1 new)
      const descInputs = screen.getAllByPlaceholderText('Item description');
      expect(descInputs).toHaveLength(3);
    });

    it('can remove an item', () => {
      render(
        <ReviewForm documentId={1} extractionResult={createExtractionResult()} />,
        { wrapper: createWrapper() }
      );

      const removeButtons = screen.getAllByRole('button', { name: /remove item/i });
      fireEvent.click(removeButtons[0]);

      const descInputs = screen.getAllByPlaceholderText('Item description');
      expect(descInputs).toHaveLength(1);
    });
  });

  describe('submission', () => {
    it('calls mutate on form submit', async () => {
      render(
        <ReviewForm documentId={42} extractionResult={createExtractionResult()} />,
        { wrapper: createWrapper() }
      );

      const submitButton = screen.getByRole('button', { name: /save & finalize/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 42,
            data: expect.objectContaining({
              vendor_name: 'Acme Corp',
              date: '2024-01-15',
              currency: 'USD',
            }),
          }),
          expect.anything()
        );
      });
    });

    it('shows loading state when pending', () => {
      mockSubmitReview.isPending = true;

      render(
        <ReviewForm documentId={1} extractionResult={createExtractionResult()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('shows error message when submission fails', () => {
      mockSubmitReview.isError = true;
      mockSubmitReview.error = new Error('Network error');

      render(
        <ReviewForm documentId={1} extractionResult={createExtractionResult()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('shows success state', () => {
      mockSubmitReview.isSuccess = true;

      render(
        <ReviewForm documentId={1} extractionResult={createExtractionResult()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Review Saved!')).toBeInTheDocument();
    });
  });

  describe('handles empty extraction', () => {
    it('renders with null values', () => {
      const emptyResult = createExtractionResult({
        vendor_name: null,
        date: null,
        total: null,
        currency: null,
        items: [],
      });

      render(
        <ReviewForm documentId={1} extractionResult={emptyResult} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Review Extracted Data')).toBeInTheDocument();
      expect(screen.getByText(/no line items/i)).toBeInTheDocument();
    });
  });
});
