'use client';

import { getConfidenceLevel } from '@/lib/documents/validation';

interface ConfidenceIndicatorProps {
  /** Confidence score between 0.0 and 1.0 */
  score: number;
  /** Optional label for the field this indicator represents */
  label?: string;
}

/**
 * Displays a visual confidence score indicator with accessible ARIA attributes.
 * Uses getConfidenceLevel() to determine styling: "low" (< 0.7) shows a warning
 * appearance, "normal" (>= 0.7) shows a standard/success appearance.
 */
export function ConfidenceIndicator({ score, label }: ConfidenceIndicatorProps) {
  const level = getConfidenceLevel(score);
  const percentage = Math.round(score * 100);
  const valueText = `${percentage}% confidence - ${level}`;

  return (
    <div className="flex items-center gap-2">
      <div
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuetext={valueText}
        aria-label={label ? `${label} confidence` : 'Confidence score'}
        className="relative h-2 w-16 overflow-hidden rounded-full bg-gray-200"
      >
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${
            level === 'low'
              ? 'bg-amber-500'
              : 'bg-green-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span
        className={`text-xs font-medium ${
          level === 'low'
            ? 'text-amber-700'
            : 'text-green-700'
        }`}
      >
        {percentage}%
      </span>
    </div>
  );
}
