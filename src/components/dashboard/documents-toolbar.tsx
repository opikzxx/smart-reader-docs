'use client';

import { Search, X, Upload, Calendar, Loader2, Download, FileSpreadsheet, FileText } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DocumentStatus } from '@/lib/documents/types';

interface DocumentsToolbarProps {
  vendorSearch: string;
  setVendorSearch: (value: string) => void;
  statusFilter: DocumentStatus[];
  toggleStatus: (status: DocumentStatus) => void;
  dateFrom: string;
  setDateFrom: (value: string) => void;
  dateTo: string;
  setDateTo: (value: string) => void;
  hasFilters: boolean;
  clearFilters: () => void;
  isFetching: boolean;
  totalResults: number;
  onExportCsv?: () => void;
  onExportXlsx?: () => void;
  canExport?: boolean;
}

const statuses: { value: DocumentStatus; label: string; dot: string }[] = [
  { value: 'uploaded', label: 'Uploaded', dot: 'bg-blue-400' },
  { value: 'processing', label: 'Processing', dot: 'bg-amber-400' },
  { value: 'review', label: 'Review', dot: 'bg-purple-400' },
  { value: 'ready', label: 'Ready', dot: 'bg-green-400' },
];

export function DocumentsToolbar({
  vendorSearch,
  setVendorSearch,
  statusFilter,
  toggleStatus,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  hasFilters,
  clearFilters,
  isFetching,
  totalResults,
  onExportCsv,
  onExportXlsx,
  canExport,
}: DocumentsToolbarProps) {
  return (
    <div className="space-y-3">
      {/* Row 1: Search + Upload */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by vendor name..."
            value={vendorSearch}
            onChange={(e) => setVendorSearch(e.target.value)}
            className="h-10 bg-secondary/50 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/50"
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40" disabled={!canExport}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onExportCsv?.()} className="gap-2 cursor-pointer">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportXlsx?.()} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4 text-green-500" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/dashboard/documents/upload">
            <Button size="sm" className="h-10 w-full gap-2 px-4 sm:w-auto">
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </Link>
        </div>
      </div>

      {/* Row 2: Date range (hidden on very small screens, shown on sm+) */}
      <div className="hidden items-center gap-2 sm:flex">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-[150px] bg-secondary/50 pl-9 text-xs text-foreground"
            aria-label="Date from"
          />
        </div>
        <span className="text-xs text-muted-foreground">to</span>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-[150px] bg-secondary/50 pl-9 text-xs text-foreground"
            aria-label="Date to"
          />
        </div>
      </div>

      {/* Row 3: Status chips + results count */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {statuses.map((s) => {
            const isActive = statusFilter.includes(s.value);
            return (
              <button
                key={s.value}
                onClick={() => toggleStatus(s.value)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition-all sm:px-3 sm:text-xs ${
                  isActive
                    ? 'border-primary/40 bg-primary/15 text-primary shadow-sm shadow-primary/10'
                    : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/30 hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2 ${s.dot}`} />
                {s.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {totalResults} document{totalResults !== 1 ? 's' : ''}
          </span>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
