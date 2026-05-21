'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2,
  Calendar,
  DollarSign,
  Coins,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSubmitReview } from '@/hooks/use-submit-review';
import type { ExtractionResult } from '@/lib/documents/types';

// Zod schema for form validation
const itemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  quantity: z.number().min(0.01, 'Min 0.01').max(999999.99),
  unit_price: z.number().min(0, 'Min 0').max(999999999.99),
  amount: z.number().min(0, 'Min 0').max(999999999.99),
});

const reviewSchema = z.object({
  vendor_name: z.string().min(1, 'Vendor name is required').max(200, 'Max 200 characters'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  total: z.number().min(0, 'Must be 0 or greater').max(999999999.99, 'Max 999,999,999.99'),
  currency: z.string().regex(/^[A-Z]{3}$/, 'Must be 3 uppercase letters (e.g. USD, IDR)'),
  items: z.array(itemSchema).max(100, 'Maximum 100 items'),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  documentId: number;
  extractionResult: ExtractionResult;
  onSuccess?: () => void;
}

export function ReviewForm({ documentId, extractionResult, onSuccess }: ReviewFormProps) {
  const router = useRouter();
  const submitReview = useSubmitReview();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid, isDirty },
    watch,
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      vendor_name: extractionResult.vendor_name ?? '',
      date: extractionResult.date ?? '',
      total: extractionResult.total ?? 0,
      currency: extractionResult.currency ?? '',
      items: extractionResult.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
      })),
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');
  const itemsTotal = watchedItems?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) ?? 0;

  const onSubmit = (data: ReviewFormData) => {
    submitReview.mutate(
      {
        id: documentId,
        data: {
          vendor_name: data.vendor_name,
          date: data.date,
          total: data.total,
          currency: data.currency,
          items: data.items,
        },
      },
      {
        onSuccess: () => {
          onSuccess?.();
        },
      }
    );
  };

  if (submitReview.isSuccess) {
    return (
      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-400" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">Review Saved!</h3>
        <p className="mt-1 text-sm text-muted-foreground">Redirecting to documents...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {/* Form header */}
      <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 px-5 py-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <div>
            <p className="text-sm font-medium text-purple-400">Review Extracted Data</p>
            <p className="text-xs text-muted-foreground">
              Verify and correct the AI-extracted information below before finalizing.
            </p>
          </div>
        </div>
      </div>

      {/* Submission error */}
      {submitReview.isError && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">
            {submitReview.error?.message || 'Failed to save. Please try again.'}
          </p>
        </div>
      )}

      {/* Main fields grid */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground">Document Information</h3>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {/* Vendor Name */}
          <FormField
            label="Vendor Name"
            icon={<Building2 className="h-4 w-4" />}
            error={errors.vendor_name?.message}
            confidence={extractionResult.confidence_scores.vendor_name}
          >
            <Input
              {...register('vendor_name')}
              placeholder="e.g. PT Maju Jaya"
              className="bg-secondary/30 text-foreground placeholder:text-muted-foreground"
            />
          </FormField>

          {/* Date */}
          <FormField
            label="Date"
            icon={<Calendar className="h-4 w-4" />}
            error={errors.date?.message}
            confidence={extractionResult.confidence_scores.date}
          >
            <Input
              {...register('date')}
              type="date"
              className="bg-secondary/30 text-foreground"
            />
          </FormField>

          {/* Total */}
          <FormField
            label="Total Amount"
            icon={<DollarSign className="h-4 w-4" />}
            error={errors.total?.message}
            confidence={extractionResult.confidence_scores.total}
          >
            <Input
              {...register('total', { valueAsNumber: true })}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="bg-secondary/30 tabular-nums text-foreground placeholder:text-muted-foreground"
            />
          </FormField>

          {/* Currency */}
          <FormField
            label="Currency"
            icon={<Coins className="h-4 w-4" />}
            error={errors.currency?.message}
            confidence={extractionResult.confidence_scores.currency}
          >
            <Input
              {...register('currency', {
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase();
                },
              })}
              placeholder="USD"
              maxLength={3}
              className="bg-secondary/30 uppercase text-foreground placeholder:text-muted-foreground"
            />
          </FormField>
        </div>
      </div>

      {/* Line Items */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Line Items</h3>
            <p className="text-xs text-muted-foreground">
              {fields.length} item{fields.length !== 1 ? 's' : ''} • Total:{' '}
              <span className="font-medium tabular-nums text-foreground">
                {itemsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 border-border text-foreground"
            onClick={() => append({ description: '', quantity: 1, unit_price: 0, amount: 0 })}
            disabled={fields.length >= 100}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Item
          </Button>
        </div>

        {fields.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No line items. Click "Add Item" to add one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qty</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unit Price</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fields.map((field, index) => (
                  <tr key={field.id} className="group transition-colors hover:bg-muted/20">
                    <td className="px-4 py-2 text-xs text-muted-foreground">{index + 1}</td>
                    <td className="px-4 py-2">
                      <Input
                        {...register(`items.${index}.description`)}
                        placeholder="Item description"
                        className="h-8 min-w-[160px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-1"
                      />
                      {errors.items?.[index]?.description && (
                        <p className="mt-0.5 text-[10px] text-destructive">{errors.items[index]?.description?.message}</p>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="h-8 w-20 bg-transparent text-sm tabular-nums text-foreground focus-visible:ring-1"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        min="0"
                        className="h-8 w-28 bg-transparent text-sm tabular-nums text-foreground focus-visible:ring-1"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        {...register(`items.${index}.amount`, { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        min="0"
                        className="h-8 w-28 bg-transparent text-sm tabular-nums text-foreground focus-visible:ring-1"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                        aria-label={`Remove item ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-6 py-4">
        <p className="text-xs text-muted-foreground">
          {Object.keys(errors).length > 0 ? (
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3 w-3" />
              Please fix {Object.keys(errors).length} error{Object.keys(errors).length !== 1 ? 's' : ''} above
            </span>
          ) : (
            'All fields look good'
          )}
        </p>
        <Button
          type="submit"
          size="lg"
          className="gap-2 px-8"
          disabled={submitReview.isPending}
        >
          {submitReview.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Save & Finalize
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

/* ─── Form Field Wrapper ─── */
function FormField({
  label,
  icon,
  error,
  confidence,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  error?: string;
  confidence?: number;
  children: React.ReactNode;
}) {
  const percent = confidence != null ? Math.round(confidence * 100) : null;
  const confidenceColor =
    percent != null && percent >= 80
      ? 'text-green-400'
      : percent != null && percent >= 50
        ? 'text-amber-400'
        : 'text-red-400';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span className="text-muted-foreground">{icon}</span>
          {label}
        </label>
        {percent != null && (
          <span className={`text-[10px] font-semibold tabular-nums ${confidenceColor}`}>
            AI: {percent}%
          </span>
        )}
      </div>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
