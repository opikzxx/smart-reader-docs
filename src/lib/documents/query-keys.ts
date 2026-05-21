import type { DocumentFilters } from './types';

/**
 * TanStack Query key factory for document-related queries.
 * Provides structured, hierarchical query keys for cache management and invalidation.
 */
export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (filters: DocumentFilters) => [...documentKeys.lists(), filters] as const,
  details: () => [...documentKeys.all, 'detail'] as const,
  detail: (id: number) => [...documentKeys.details(), id] as const,
};
