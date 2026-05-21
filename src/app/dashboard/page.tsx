'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { type SortingState } from '@tanstack/react-table';
import { FileText, Upload } from 'lucide-react';
import { useDocuments } from '@/hooks/use-documents';
import { DataTable } from '@/components/dashboard/data-table';
import { documentsColumns } from '@/components/dashboard/documents-columns';
import { DocumentsToolbar } from '@/components/dashboard/documents-toolbar';
import { Button } from '@/components/ui/button';
import { generateCsv, generateXlsx } from '@/lib/csv-export';
import type { DocumentFilters, DocumentStatus } from '@/lib/documents/types';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function DocumentsPage() {
  // Filter state (drives API calls)
  const [vendorSearch, setVendorSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Sorting state (client-side via TanStack Table)
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'created_at', desc: true },
  ]);

  // Debounce vendor search to avoid excessive API calls
  const debouncedVendor = useDebounce(vendorSearch, 300);

  // Build API filters
  const apiFilters: DocumentFilters = useMemo(() => {
    const filters: DocumentFilters = {};
    if (statusFilter.length > 0) filters.statuses = statusFilter;
    if (debouncedVendor) filters.vendor_name = debouncedVendor;
    if (dateFrom) filters.date_from = dateFrom;
    if (dateTo) filters.date_to = dateTo;
    return filters;
  }, [statusFilter, debouncedVendor, dateFrom, dateTo]);

  const { data: documents, isLoading, isFetching, isError, error } = useDocuments(apiFilters);

  const hasFilters = statusFilter.length > 0 || !!vendorSearch || !!dateFrom || !!dateTo;

  const clearFilters = useCallback(() => {
    setVendorSearch('');
    setStatusFilter([]);
    setDateFrom('');
    setDateTo('');
  }, []);

  const toggleStatus = useCallback((status: DocumentStatus) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }, []);

  // Export
  const handleExportCsv = useCallback(() => {
    if (documents && documents.length > 0) {
      generateCsv(documents);
    }
  }, [documents]);

  const handleExportXlsx = useCallback(() => {
    if (documents && documents.length > 0) {
      generateXlsx(documents);
    }
  }, [documents]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and view your uploaded financial documents.
          </p>
        </div>
        <div className="flex items-center justify-center py-16" role="status" aria-label="Loading documents">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <p className="text-sm text-muted-foreground">Loading documents...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Documents</h1>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            Failed to load documents: {error?.message || 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  // Empty state — no documents at all (no filters active)
  if (!hasFilters && (!documents || documents.length === 0)) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and view your uploaded financial documents.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-lg font-medium text-foreground">
            No documents uploaded
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started by uploading your first financial document.
          </p>
          <Link href="/dashboard/documents/upload" className="mt-4">
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              Upload documents
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage and view your uploaded financial documents.
        </p>
      </div>

      {/* Toolbar with server-side filters */}
      <DocumentsToolbar
        vendorSearch={vendorSearch}
        setVendorSearch={setVendorSearch}
        statusFilter={statusFilter}
        toggleStatus={toggleStatus}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        hasFilters={hasFilters}
        clearFilters={clearFilters}
        isFetching={isFetching}
        totalResults={documents?.length ?? 0}
        onExportCsv={handleExportCsv}
        onExportXlsx={handleExportXlsx}
        canExport={(documents?.length ?? 0) > 0}
      />

      {/* Data Table */}
      <DataTable
        columns={documentsColumns}
        data={documents ?? []}
        sorting={sorting}
        setSorting={setSorting}
      />
    </div>
  );
}
