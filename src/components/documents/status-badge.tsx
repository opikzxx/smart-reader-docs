import type { DocumentStatus } from '@/lib/documents/types';

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
}

const statusConfig: Record<DocumentStatus, { label: string; className: string }> = {
  uploaded: {
    label: 'Uploaded',
    className: 'bg-blue-100 text-blue-800',
  },
  processing: {
    label: 'Processing',
    className: 'bg-amber-100 text-amber-800',
  },
  review: {
    label: 'Review',
    className: 'bg-purple-100 text-purple-800',
  },
  ready: {
    label: 'Ready',
    className: 'bg-green-100 text-green-800',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-800',
  },
};

/**
 * Visual badge displaying the current document status with distinct colors.
 * Each status has a unique color scheme for quick visual identification:
 * - uploaded: blue (neutral/initial state)
 * - processing: amber (in progress)
 * - review: purple (needs attention)
 * - ready: green (complete)
 */
export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
