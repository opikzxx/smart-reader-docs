/**
 * Document status lifecycle.
 * Represents the four stages: Upload → Processing → Review → Ready.
 */
export type DocumentStatus = 'uploaded' | 'processing' | 'review' | 'ready' | 'failed';

/**
 * Confidence scores for each top-level extracted field.
 * Each score is a number between 0.0 and 1.0 inclusive.
 */
export interface ConfidenceScores {
  vendor_name: number;
  date: number;
  total: number;
  currency: number;
  items: number;
}

/**
 * Individual line item extracted from a document.
 */
export interface ExtractedItem {
  id?: number;
  description: string;    // 1-500 chars
  quantity: number;       // 0.01 - 999,999.99
  unit_price: number;    // 0.00 - 999,999,999.99
  amount: number;        // 0.00 - 999,999,999.99
}

/**
 * Full extraction result from the AI Vision model.
 */
export interface ExtractionResult {
  vendor_name: string | null;  // 1-200 chars
  date: string | null;         // ISO 8601 YYYY-MM-DD
  total: number | null;        // 0.00 - 999,999,999.99
  currency: string | null;     // ISO 4217 (3 uppercase letters)
  items: ExtractedItem[];      // 0-100 items
  confidence_scores: ConfidenceScores;
}

/**
 * Document record from the database.
 */
export interface Document {
  id: number;
  file_name: string;
  r2_key: string;
  status: DocumentStatus;
  user_id: string | null;
  vendor_name: string | null;
  date: string | null;
  total: number | null;
  currency: string | null;
  confidence_scores: ConfidenceScores | null;
  created_at: string;
  updated_at: string;
  items?: ExtractedItem[];
}

/**
 * Filters for the document list query.
 */
export interface DocumentFilters {
  statuses?: DocumentStatus[];
  vendor_name?: string;
  date_from?: string;
  date_to?: string;
}

/**
 * Response from the presigned upload URL endpoint.
 */
export interface PresignedUploadResponse {
  url: string;
  r2_key: string;
}

/**
 * Payload for the review form submission.
 */
export interface ReviewSubmission {
  vendor_name: string;
  date: string;
  total: number;
  currency: string;
  items: ExtractedItem[];
}
