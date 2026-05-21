'use client';

import { type ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { ArrowUpDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Document, DocumentStatus } from '@/lib/documents/types';

const statusConfig: Record<DocumentStatus, { label: string; dot: string; bg: string }> = {
  uploaded: { label: 'Uploaded', dot: 'bg-blue-400', bg: 'bg-blue-400/10 text-blue-400' },
  processing: { label: 'Processing', dot: 'bg-amber-400', bg: 'bg-amber-400/10 text-amber-400' },
  review: { label: 'Review', dot: 'bg-purple-400', bg: 'bg-purple-400/10 text-purple-400' },
  ready: { label: 'Ready', dot: 'bg-green-400', bg: 'bg-green-400/10 text-green-400' },
  failed: { label: 'Failed', dot: 'bg-red-400', bg: 'bg-red-400/10 text-red-400' },
};

export const documentsColumns: ColumnDef<Document>[] = [
  {
    accessorKey: 'file_name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        File Name
        <ArrowUpDown className="h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const doc = row.original;
      return (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <Link
            href={`/dashboard/documents/${doc.id}`}
            className="truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
          >
            {doc.file_name}
          </Link>
        </div>
      );
    },
  },
  {
    accessorKey: 'vendor_name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Vendor
        <ArrowUpDown className="h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-foreground/80">
        {row.getValue('vendor_name') || <span className="text-muted-foreground">—</span>}
      </span>
    ),
  },
  {
    accessorKey: 'date',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Date
        <ArrowUpDown className="h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = row.getValue('date') as string | null;
      if (!date) return <span className="text-muted-foreground">—</span>;
      return <span className="text-sm text-foreground/80">{date}</span>;
    },
  },
  {
    accessorKey: 'total',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Total
        <ArrowUpDown className="h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const total = row.getValue('total') as number | null;
      const currency = row.original.currency;
      if (total === null) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="text-sm font-medium tabular-nums text-foreground">
          {total.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          {currency && (
            <span className="ml-1 text-xs text-muted-foreground">{currency}</span>
          )}
        </span>
      );
    },
  },
  {
    accessorKey: 'status',
    header: () => (
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Status
      </span>
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as DocumentStatus;
      const config = statusConfig[status];
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bg}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
          {config.label}
        </span>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Uploaded
        <ArrowUpDown className="h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const timestamp = row.getValue('created_at') as string;
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let relative: string;
      if (diffDays === 0) relative = 'Today';
      else if (diffDays === 1) relative = 'Yesterday';
      else if (diffDays < 7) relative = `${diffDays} days ago`;
      else relative = date.toLocaleDateString();

      return (
        <span className="text-sm text-muted-foreground" title={date.toLocaleString()}>
          {relative}
        </span>
      );
    },
  },
  {
    id: 'actions',
    header: () => null,
    cell: ({ row }) => {
      const doc = row.original;
      return (
        <Link
          href={`/dashboard/documents/${doc.id}`}
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="h-3 w-3" />
          View
        </Link>
      );
    },
  },
];
