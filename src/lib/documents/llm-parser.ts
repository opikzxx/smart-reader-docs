import type { ExtractionResult } from './types';
import { validateExtractionResult } from './validation';

/**
 * Creates an empty ExtractionResult with all fields set to null/empty
 * and all confidence scores set to 0.
 *
 * Used as a fallback when LLM response parsing or validation fails.
 */
export function createEmptyExtractionResult(): ExtractionResult {
  return {
    vendor_name: null,
    date: null,
    total: null,
    currency: null,
    items: [],
    confidence_scores: {
      vendor_name: 0,
      date: 0,
      total: 0,
      currency: 0,
      items: 0,
    },
  };
}

/**
 * Strips markdown code block fencing from a string if present.
 * Handles formats like:
 *   ```json\n{...}\n```
 *   ```\n{...}\n```
 */
function stripMarkdownCodeBlock(text: string): string {
  const trimmed = text.trim();

  // Match ```json ... ``` or ``` ... ```
  const codeBlockMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  return trimmed;
}

/**
 * Parses a raw JSON string from the LLM Vision model into a validated ExtractionResult.
 *
 * - Strips markdown code block fencing if present (Gemini often wraps JSON in ```json blocks)
 * - If JSON parsing fails, returns an empty ExtractionResult with all confidence scores set to 0.
 * - If the parsed object fails schema validation, returns an empty ExtractionResult.
 * - If validation passes, returns the parsed result as ExtractionResult.
 *
 * @param rawResponse - The raw JSON string returned by the LLM Vision model
 * @returns A validated ExtractionResult, or an empty one on failure
 */
export function parseLLMResponse(rawResponse: string): ExtractionResult {
  let parsed: unknown;

  try {
    const cleanedResponse = stripMarkdownCodeBlock(rawResponse);
    parsed = JSON.parse(cleanedResponse);
  } catch {
    return createEmptyExtractionResult();
  }

  const validationResult = validateExtractionResult(parsed);

  if (!validationResult.valid) {
    return createEmptyExtractionResult();
  }

  return parsed as ExtractionResult;
}
