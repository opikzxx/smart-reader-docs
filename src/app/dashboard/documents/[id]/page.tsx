'use client';

import { use } from 'react';
import Link from 'next/link';
import { useDocument } from '@/hooks/use-document';
import { useExtractDocument } from '@/hooks/use-extract-document';
import { ReviewForm } from '@/components/documents/review-form';
import { ErrorBoundary } from '@/components/error-boundary';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RotateCcw,
  Calendar,
  Building2,
  DollarSign,
  Coins,
  Hash,
  Sparkles,
  ShieldCheck,
  Download,
} from 'lucide-react';
import type { Document, DocumentStatus, ExtractedItem, ExtractionResult, ConfidenceScores } from '@/lib/documents/types';

interface DocumentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const { id } = use(params);
  const documentId = parseInt(id, 10);

  if (isNaN(documentId)) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">Invalid document ID.</p>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Documents
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <ErrorBoundary section="Document Detail">
      <DocumentDetailContent documentId={documentId} />
    </ErrorBoundary>
  );
}

function DocumentDetailContent({ documentId }: { documentId: number }) {
  const { data: document, isLoading, isError, error } = useDocument(documentId);
  const extractMutation = useExtractDocument();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              Failed to load document
            </p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {error?.message || 'Unknown error occurred'}
          </p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex flex-col items-center py-16">
          <FileText className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">Document not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="">
      <Link href="/dashboard">
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Documents
        </Button>
      </Link>
</div>
      {/* Document header card */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="relative p-6">

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/50 shadow-sm">
                <FileText className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold text-foreground">{document.file_name}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(document.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(document.created_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" />
                    ID: {document.id}
                  </span>
                </div>
              </div>
            </div>
            <StatusBadge status={document.status} />
          </div>
        </div>
      </div>

      {/* Status-specific content */}
      {document.status === 'uploaded' && (
        <UploadedView documentId={document.id} extractMutation={extractMutation} />
      )}

      {document.status === 'processing' && <ProcessingView />}

      {document.status === 'failed' && (
        <FailedView documentId={document.id} extractMutation={extractMutation} />
      )}

      {document.status === 'review' && (
        <ReviewForm
          documentId={document.id}
          extractionResult={buildExtractionResult(document)}
        />
      )}

      {document.status === 'ready' && <ReadyView document={document} />}
    </div>
  );
}

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: DocumentStatus }) {
  const config: Record<DocumentStatus, { label: string; icon: React.ReactNode; className: string }> = {
    uploaded: {
      label: 'Uploaded',
      icon: <Clock className="h-3.5 w-3.5" />,
      className: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/5',
    },
    processing: {
      label: 'Processing',
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      className: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/5',
    },
    review: {
      label: 'Needs Review',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      className: 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-purple-500/5',
    },
    ready: {
      label: 'Ready',
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      className: 'bg-green-500/10 text-green-400 border-green-500/20 shadow-green-500/5',
    },
    failed: {
      label: 'Failed',
      icon: <XCircle className="h-3.5 w-3.5" />,
      className: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/5',
    },
  };

  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold shadow-sm ${c.className}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

/* ─── Uploaded View ─── */
function UploadedView({
  documentId,
  extractMutation,
}: {
  documentId: number;
  extractMutation: ReturnType<typeof useExtractDocument>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
        <Sparkles className="h-8 w-8 text-blue-400" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-foreground">Ready for AI Extraction</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        This document has been uploaded successfully. Extract financial data like vendor name,
        dates, totals, and line items using AI.
      </p>

      {extractMutation.isError && (
        <div className="mx-auto mt-4 max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">
            {extractMutation.error?.message || 'Extraction failed'}
          </p>
        </div>
      )}

      <Button
        size="lg"
        className="mt-6 gap-2 px-8"
        onClick={() => extractMutation.mutate(documentId)}
        disabled={extractMutation.isPending}
      >
        {extractMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Extracting...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Extract with AI
          </>
        )}
      </Button>
    </div>
  );
}

/* ─── Processing View ─── */
function ProcessingView() {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-8">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-amber-500/20" />
          <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-amber-400" />
          <Sparkles className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-amber-400" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-foreground">AI is Reading Your Document</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Extracting vendor information, dates, amounts, and line items.
          This usually takes 10-30 seconds.
        </p>
        <div className="mt-6 w-full max-w-xs">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full animate-pulse rounded-full bg-gradient-to-r from-amber-500 to-orange-400" style={{ width: '65%' }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Processing...</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Failed View ─── */
function FailedView({
  documentId,
  extractMutation,
}: {
  documentId: number;
  extractMutation: ReturnType<typeof useExtractDocument>;
}) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <XCircle className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">Extraction Failed</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          The AI could not read or extract data from this document. This can happen with
          low-quality scans, heavily stylized documents, handwritten text, or corrupted files.
        </p>

        <div className="mx-auto mt-4 max-w-sm rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Tips:</span> Try uploading a clearer scan,
            ensure the document is not password-protected, and use standard invoice/receipt formats.
          </p>
        </div>

        {extractMutation.isError && (
          <div className="mx-auto mt-4 max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">
              {extractMutation.error?.message || 'Retry failed'}
            </p>
          </div>
        )}

        <Button
          variant="outline"
          size="lg"
          className="mt-6 gap-2 border-border text-foreground hover:bg-muted"
          onClick={() => extractMutation.mutate(documentId)}
          disabled={extractMutation.isPending}
        >
          {extractMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <RotateCcw className="h-4 w-4" />
              Retry Extraction
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/* ─── Ready View ─── */
function ReadyView({ document }: { document: Document }) {
  const items: ExtractedItem[] = document.items || [];
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6">
      {/* Success banner */}
      <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 px-5 py-4">
        <ShieldCheck className="h-5 w-5 text-green-400" />
        <div>
          <p className="text-sm font-medium text-green-400">Extraction Complete</p>
          <p className="text-xs text-muted-foreground">All data has been verified and finalized.</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Building2 className="h-5 w-5" />}
          label="Vendor"
          value={document.vendor_name || '—'}
          color="text-blue-400"
          bg="bg-blue-500/10"
        />
        <SummaryCard
          icon={<Calendar className="h-5 w-5" />}
          label="Date"
          value={document.date || '—'}
          color="text-purple-400"
          bg="bg-purple-500/10"
        />
        <SummaryCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total"
          value={
            document.total != null
              ? document.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : '—'
          }
          color="text-green-400"
          bg="bg-green-500/10"
        />
        <SummaryCard
          icon={<Coins className="h-5 w-5" />}
          label="Currency"
          value={document.currency || '—'}
          color="text-amber-400"
          bg="bg-amber-500/10"
        />
      </div>

      {/* Confidence scores */}
      {document.confidence_scores && (
        <ConfidenceSection scores={document.confidence_scores} />
      )}

      {/* Line items table */}
      {items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Line Items</h3>
              <p className="text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''} extracted</p>
            </div>
            <span className="rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold tabular-nums text-foreground">
              Total: {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {document.currency || ''}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">#</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unit Price</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item, index) => (
                  <tr key={item.id ?? index} className="transition-colors hover:bg-muted/30">
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">{index + 1}</td>
                    <td className="px-6 py-3.5 font-medium text-foreground">{item.description || '—'}</td>
                    <td className="px-6 py-3.5 text-right tabular-nums text-foreground/80">{item.quantity}</td>
                    <td className="px-6 py-3.5 text-right tabular-nums text-foreground/80">{item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-3.5 text-right tabular-nums font-semibold text-foreground">{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/20">
                  <td colSpan={4} className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Grand Total
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-base font-bold text-foreground">
                    {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">No line items were extracted from this document.</p>
        </div>
      )}
    </div>
  );
}

/* ─── Summary Card ─── */
function SummaryCard({
  icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/20">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
          <span className={color}>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Confidence Section ─── */
function ConfidenceSection({ scores }: { scores: ConfidenceScores }) {
  const fields: { key: keyof ConfidenceScores; label: string }[] = [
    { key: 'vendor_name', label: 'Vendor' },
    { key: 'date', label: 'Date' },
    { key: 'total', label: 'Total' },
    { key: 'currency', label: 'Currency' },
    { key: 'items', label: 'Items' },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">AI Confidence Scores</h3>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-5">
        {fields.map(({ key, label }) => {
          const score = scores[key];
          const percent = Math.round(score * 100);
          const color =
            percent >= 80 ? 'bg-green-500' : percent >= 50 ? 'bg-amber-500' : 'bg-red-500';
          const textColor =
            percent >= 80 ? 'text-green-400' : percent >= 50 ? 'text-amber-400' : 'text-red-400';

          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className={`text-xs font-semibold tabular-nums ${textColor}`}>{percent}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${color}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Helpers ─── */
function buildExtractionResult(document: Document): ExtractionResult {
  return {
    vendor_name: document.vendor_name,
    date: document.date,
    total: document.total,
    currency: document.currency,
    items: document.items || [],
    confidence_scores: document.confidence_scores || {
      vendor_name: 0,
      date: 0,
      total: 0,
      currency: 0,
      items: 0,
    },
  };
}
