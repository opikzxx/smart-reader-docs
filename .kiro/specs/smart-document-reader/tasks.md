# Implementation Plan: Smart Document Reader

## Overview

This plan implements the Smart Document Reader feature incrementally: database schema and types first, then core utility functions, API routes, client-side hooks, and finally UI components. Each step builds on the previous, ensuring no orphaned code. Property-based tests validate correctness properties from the design, and unit tests cover component behavior.

## Tasks

- [x] 1. Set up database schema and core types
  - [x] 1.1 Create D1 database migration with documents and extracted_items tables
    - Create `src/lib/db/migrations/0001_smart_document_reader.sql` with the full schema from the design (documents table, extracted_items table, indexes)
    - Include CHECK constraints for status, field lengths, and value ranges
    - Include CASCADE delete on extracted_items foreign key
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 1.2 Create TypeScript interfaces and type definitions
    - Create `src/lib/documents/types.ts` with all interfaces: DocumentStatus, ConfidenceScores, ExtractedItem, ExtractionResult, Document, DocumentFilters, PresignedUploadResponse, ReviewSubmission
    - Create `src/lib/documents/query-keys.ts` with the documentKeys factory
    - _Requirements: 3.1, 3.2, 8.2_

  - [x] 1.3 Create validation utility functions
    - Create `src/lib/documents/validation.ts` with: `validateFile()` (MIME type + size check), `validateExtractionResult()` (schema validation), `validateReviewForm()` (form submission validation), `getConfidenceLevel()` (threshold classification)
    - _Requirements: 1.5, 1.6, 1.7, 3.1, 3.2, 4.2, 4.3, 4.5, 4.6_

- [x] 2. Implement validation utilities and property tests
  - [x] 2.1 Implement file validation function
    - Implement `validateFile()` in `src/lib/documents/validation.ts` accepting MIME types image/png, image/jpeg, image/webp, application/pdf and max size 10MB (10,485,760 bytes)
    - Return structured error with reason (invalid type or size exceeded)
    - _Requirements: 1.5, 1.6, 1.7_

  - [x] 2.2 Write property test for file validation (Property 1)
    - **Property 1: File validation accepts only valid MIME types and sizes**
    - Create `src/__tests__/file-validation.property.test.ts`
    - Generate arbitrary MIME types and file sizes, assert acceptance iff MIME is in allowed set AND size ≤ 10MB
    - **Validates: Requirements 1.5, 1.6, 1.7**

  - [x] 2.3 Implement ExtractionResult schema validation function
    - Implement `validateExtractionResult()` in `src/lib/documents/validation.ts`
    - Validate all field constraints: vendor_name (null or 1-200 chars), date (null or YYYY-MM-DD), total (null or 0-999999999.99), currency (null or 3 uppercase letters), items (0-100 with sub-field constraints), confidence scores (0.0-1.0)
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 2.4 Write property test for ExtractionResult schema validation (Property 2)
    - **Property 2: ExtractionResult schema validation**
    - Create `src/__tests__/extraction-result.property.test.ts`
    - Generate valid and invalid ExtractionResult objects, assert validation passes iff all constraints are met
    - **Validates: Requirements 3.1, 3.2**

  - [x] 2.5 Write property test for ExtractionResult serialization round-trip (Property 3)
    - **Property 3: ExtractionResult serialization round-trip**
    - Add to `src/__tests__/extraction-result.property.test.ts`
    - Generate valid ExtractionResult objects, serialize to JSON, parse back, assert structural equality
    - **Validates: Requirements 3.4**

  - [x] 2.6 Implement confidence threshold classification function
    - Implement `getConfidenceLevel()` in `src/lib/documents/validation.ts`
    - Return "low" if score < 0.7, "normal" otherwise
    - _Requirements: 4.2, 4.3_

  - [x] 2.7 Write property test for confidence threshold classification (Property 5)
    - **Property 5: Confidence threshold classification**
    - Create `src/__tests__/confidence-threshold.property.test.ts`
    - Generate arbitrary numbers 0.0-1.0, assert "low" iff score < 0.7
    - **Validates: Requirements 4.2, 4.3**

  - [x] 2.8 Implement review form validation function
    - Implement `validateReviewForm()` in `src/lib/documents/validation.ts`
    - Validate: vendor_name non-empty/non-whitespace, date valid ISO 8601, total ≥ 0, currency 3 uppercase letters
    - Return field-level error messages for invalid fields
    - _Requirements: 4.5, 4.6_

  - [x] 2.9 Write property test for review form validation (Property 6)
    - **Property 6: Review form validation correctness**
    - Create `src/__tests__/review-validation.property.test.ts`
    - Generate arbitrary form data, assert acceptance iff all required fields are valid
    - **Validates: Requirements 4.5, 4.6**

- [x] 3. Checkpoint - Ensure all validation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement LLM response parser and document filter
  - [x] 4.1 Implement LLM response parser
    - Create `src/lib/documents/llm-parser.ts` with `parseLLMResponse()` function
    - Parse raw JSON string from LLM, validate against ExtractionResult schema, return validated result
    - On parse failure, return empty ExtractionResult with all confidence scores set to 0
    - _Requirements: 2.3, 2.5, 3.1, 3.3_

  - [x] 4.2 Write property test for LLM response parsing (Property 4)
    - **Property 4: LLM response parsing produces valid ExtractionResult**
    - Create `src/__tests__/llm-parser.property.test.ts`
    - Generate valid JSON strings conforming to expected schema, assert parsed result passes schema validation
    - **Validates: Requirements 2.3**

  - [x] 4.3 Implement document filter function
    - Create `src/lib/documents/filter.ts` with `filterDocuments()` function
    - Filter by: status set (subset match), vendor_name (case-insensitive partial match), date range (created_at within bounds)
    - All filters are optional; no filter means include all
    - _Requirements: 5.3, 5.4, 5.5_

  - [x] 4.4 Write property test for document filter correctness (Property 7)
    - **Property 7: Document filter correctness**
    - Create `src/__tests__/document-filter.property.test.ts`
    - Generate arbitrary document lists and filter combinations, assert result contains exactly matching documents
    - **Validates: Requirements 5.3, 5.4, 5.5**

  - [x] 4.5 Implement CSV export utility
    - Create `src/lib/csv-export.ts` with `generateCsv()` function
    - Generate UTF-8 CSV with header row (file_name, vendor_name, date, total, currency, item_count)
    - Properly escape fields containing commas, double quotes, or newlines
    - Trigger browser download with filename `documents-export-YYYY-MM-DD.csv`
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

  - [x] 4.6 Write property test for CSV generation round-trip (Property 8)
    - **Property 8: CSV generation round-trip**
    - Create `src/__tests__/csv-export.property.test.ts`
    - Generate document arrays with arbitrary strings (including special chars), assert CSV parse yields original values
    - **Validates: Requirements 6.2, 6.3, 6.5**

- [x] 5. Checkpoint - Ensure all utility and property tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement API routes
 - [x] 6.1 Implement R2 Document Upload & Creation Route
    - Create `src/app/api/documents/route.ts` with POST handler
    - Accept FormData containing the file
    - Validate file client-side & server-side using `validateFile()`
    - Upload file directly to Cloudflare R2 using Native Binding: `env.BUCKET.put()`
    - On R2 success, insert document metadata into D1 database with status "uploaded"
    - Return the created document object
    - _Requirements: 1.3, 1.4, 7.1, 7.5_

  - [x] 6.2 Implement document creation route
    - Create `src/app/api/documents/route.ts` with POST handler
    - Accept `{ file_name, r2_key }`, insert into D1 with status "uploaded"
    - Set created_at and updated_at to current UTC timestamp
    - _Requirements: 1.4, 7.1, 7.5_

  - [x] 6.3 Implement document list route
    - Add GET handler to `src/app/api/documents/route.ts`
    - Accept query params: statuses (comma-separated), vendor_name, date_from, date_to
    - Query D1 with filters, return sorted by created_at DESC
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 6.4 Implement single document detail route
    - Create `src/app/api/documents/[id]/route.ts` with GET handler
    - Return document with joined extracted_items
    - _Requirements: 8.2_

  - [x] 6.5 Implement document update route (review submission)
    - Add PUT handler to `src/app/api/documents/[id]/route.ts`
    - Accept ReviewSubmission payload, validate with `validateReviewForm()`
    - Update document fields, replace extracted_items, set status to "ready"
    - Update updated_at timestamp
    - _Requirements: 4.7, 7.1_

  - [x] 6.6 Implement AI extraction trigger route
    - Create `src/app/api/documents/[id]/extract/route.ts` with POST handler
    - Reject if document status is already "processing"
    - Set status to "processing", fetch file from R2, encode as Base64
    - Send to LLM Vision model with structured prompt
    - Parse response with `parseLLMResponse()`, store result, set status to "review"
    - On failure: set status to "review" with empty ExtractionResult (confidence scores all 0)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 7. Implement TanStack Query hooks
  - [x] 7.1 Implement useDocuments hook
    - Create `src/hooks/use-documents.ts`
    - useQuery with documentKeys.list(filters), staleTime 30s, retry 3
    - Fetch from GET /api/documents with filter params
    - _Requirements: 5.2, 8.2, 8.5_

  - [x] 7.2 Implement useDocument hook
    - Create `src/hooks/use-document.ts`
    - useQuery with documentKeys.detail(id), staleTime 30s, retry 3
    - Fetch from GET /api/documents/[id]
    - _Requirements: 8.2, 8.5_

- [x] 7.3 Implement useUploadDocument hook
    - Create `src/hooks/use-upload-document.ts`
    - useMutation that POSTs FormData directly to /api/documents
    - Track upload progress locally if using standard fetch streams (or simplify for Edge)
    - Invalidate document list query on success
    - _Requirements: 1.3, 1.9, 1.11, 8.3, 8.4, 8.6, 8.8_
  - [x] 7.4 Implement useExtractDocument hook
    - Create `src/hooks/use-extract-document.ts`
    - useMutation that POSTs to /api/documents/[id]/extract
    - Invalidate document detail query on success
    - No auto-retry on failure
    - _Requirements: 2.1, 2.2, 8.3, 8.4, 8.6, 8.8_

  - [x] 7.5 Implement useSubmitReview hook
    - Create `src/hooks/use-submit-review.ts`
    - useMutation that PUTs to /api/documents/[id]
    - Invalidate document list and detail queries on success
    - No auto-retry on failure
    - _Requirements: 4.7, 4.9, 8.3, 8.4, 8.6, 8.8_

- [x] 8. Checkpoint - Ensure API routes and hooks are wired correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement Upload UI components
  - [x] 9.1 Implement UploadHandler component
    - Create `src/components/documents/upload-handler.tsx`
    - Drag-and-drop zone with file picker fallback
    - Validate files client-side (MIME type, size, max 20 files)
    - Display per-file progress indicators (0-100%)
    - Show per-file error messages for validation failures or upload failures
    - Retry button for failed uploads (max 3 attempts)
    - Keyboard accessible: Tab to focus, Enter/Space to activate
    - Use useUploadDocument hook for mutations
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 9.2, 10.3, 10.5_

  - [x] 9.2 Write unit tests for UploadHandler component
    - Create `src/__tests__/upload-handler.test.tsx`
    - Test: drag-drop interaction, file validation rejection, progress display, batch limit enforcement, retry behavior
    - _Requirements: 1.1, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

- [x] 10. Implement Review UI components
  - [x] 10.1 Implement ConfidenceIndicator component
    - Create `src/components/documents/confidence-indicator.tsx`
    - Display visual confidence score with aria-valuenow and aria-valuetext
    - Use `getConfidenceLevel()` for styling logic
    - _Requirements: 4.2, 4.3, 10.6_

  - [x] 10.2 Implement ItemsTable component
    - Create `src/components/documents/items-table.tsx`
    - Editable table for line items (description, quantity, unit_price, amount)
    - Add/remove rows, min 0 max 100 items
    - Semantic HTML table with th scope attributes and caption
    - _Requirements: 4.4, 10.7_

  - [x] 10.3 Implement ReviewForm component
    - Create `src/components/documents/review-form.tsx`
    - Display all ExtractionResult fields in editable inputs
    - Highlight fields with confidence < 0.7 using distinct border color
    - Include ItemsTable for line items
    - "Save & Ready" button with client-side validation via `validateReviewForm()`
    - Display field-level validation errors
    - Use useSubmitReview hook, disable button during pending state
    - On success: show success indication, navigate to dashboard within 2 seconds
    - On failure: show error, preserve form data, allow retry
    - Labels with `for` attribute, confidence indicators with ARIA attributes
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 10.6_

  - [x] 10.4 Write unit tests for ReviewForm component
    - Create `src/__tests__/review-form.test.tsx`
    - Test: field rendering, confidence highlighting, validation errors, submission flow, error recovery
    - _Requirements: 4.1, 4.2, 4.5, 4.6, 4.8_

- [x] 11. Implement Dashboard UI
  - [x] 11.1 Implement DocumentStatusBadge component
    - Create `src/components/documents/status-badge.tsx`
    - Visual badge for each DocumentStatus value with distinct colors
    - _Requirements: 5.1_

  - [x] 11.2 Implement Dashboard page with document table
    - Create `src/app/dashboard/documents/page.tsx`
    - Semantic HTML table with columns: file name, vendor name, date, total, currency, status, upload timestamp
    - Sorted by upload timestamp DESC by default
    - Use useDocuments hook for data fetching
    - Loading indicator while query is loading
    - Empty state message when no documents exist
    - No-results message with clear filters option when filters produce no matches
    - Table with th scope attributes and caption element
    - Responsive: single-column below 768px, multi-column at 768px+
    - _Requirements: 5.1, 5.2, 5.6, 5.7, 5.8, 5.9, 8.2, 8.7, 10.1, 10.2, 10.7_

  - [x] 11.3 Implement Dashboard filters
    - Add filter controls to the Dashboard page
    - Status multi-select filter (all statuses shown by default)
    - Vendor name text filter (case-insensitive partial match, filters as user types)
    - Date range filter (optional start and end dates)
    - Update results without full page reload using `filterDocuments()` or query param changes
    - _Requirements: 5.3, 5.4, 5.5, 5.6_

  - [x] 11.4 Implement CSV export button
    - Add export button to Dashboard
    - Enabled when at least one "ready" document matches current filters, disabled otherwise
    - On click: generate CSV via `generateCsv()` and trigger download
    - Show error message if generation fails
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 11.5 Write unit tests for Dashboard component
    - Create `src/__tests__/dashboard.test.tsx`
    - Test: table rendering, filter interactions, empty states, loading states, export button state
    - _Requirements: 5.1, 5.3, 5.7, 5.8, 5.9, 6.1_

- [x] 12. Implement document detail page and extraction trigger
  - [x] 12.1 Create document detail page
    - Create `src/app/dashboard/documents/[id]/page.tsx`
    - Fetch document with useDocument hook
    - Show document info and status
    - If status is "uploaded": show "Extract" button to trigger AI extraction
    - If status is "processing": show processing indicator, disable extract button
    - If status is "review": render ReviewForm component
    - If status is "ready": show read-only view of finalized data
    - Use useExtractDocument hook for extraction trigger
    - _Requirements: 2.1, 2.2, 2.6, 4.1, 8.2, 8.3, 8.7, 8.8_

- [x] 13. Implement error handling and resilience
  - [x] 13.1 Configure TanStack Query client with retry and error defaults
    - Update QueryProvider in `src/components/providers/query-provider.tsx`
    - Set staleTime 30s, retry 3 with exponential backoff for queries
    - Set retry false for mutations
    - _Requirements: 8.1, 8.5, 8.6, 9.4_

  - [x] 13.2 Add error boundaries for major sections
    - Create `src/components/error-boundary.tsx` wrapping Upload, Dashboard, and Review sections
    - Render fallback UI with "Try Again" action
    - Log errors to console with component origin (no stack traces/server addresses in UI)
    - _Requirements: 9.1, 9.4, 9.5_

  - [x] 13.3 Implement retry logic for failed uploads
    - Add retry button (max 3 attempts) to UploadHandler for failed file uploads
    - Disable retry button after all attempts exhausted with "try again later" message
    - _Requirements: 9.2, 9.6_

  - [x] 13.4 Implement D1 connection error handling with retry
    - Add retry logic (3 attempts, 2s delay) for D1 unreachable errors in API routes
    - Return appropriate error responses for client-side display
    - _Requirements: 9.3, 9.6_

- [x] 14. Implement responsive layout and accessibility
  - [x] 14.1 Apply responsive Tailwind CSS layout
    - Ensure all pages render without horizontal scrolling at 320px-1920px
    - Single-column layout below 768px, multi-column at 768px+
    - Minimum 44x44px touch targets for interactive elements below 768px
    - Color contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 14.2 Ensure accessibility compliance across all components
    - Verify keyboard navigation on upload drop zone (Tab, Enter/Space) with visible focus indicator (3:1 contrast)
    - Verify all form inputs have programmatic labels (for attribute)
    - Verify confidence indicators have aria-valuenow and aria-valuetext
    - Verify tables use semantic HTML with th scope and caption
    - _Requirements: 10.5, 10.6, 10.7_

- [x] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project already has Vitest and fast-check configured
- TanStack Query v5 and Tailwind CSS are already installed
- The QueryProvider component already exists at `src/components/providers/`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3"] },
    { "id": 2, "tasks": ["2.1", "2.3", "2.6", "2.8"] },
    { "id": 3, "tasks": ["2.2", "2.4", "2.5", "2.7", "2.9"] },
    { "id": 4, "tasks": ["4.1", "4.3", "4.5"] },
    { "id": 5, "tasks": ["4.2", "4.4", "4.6"] },
    { "id": 6, "tasks": ["6.1", "6.2", "6.3"] },
    { "id": 7, "tasks": ["6.4", "6.5", "6.6"] },
    { "id": 8, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5"] },
    { "id": 9, "tasks": ["9.1", "9.2", "10.1", "10.2", "11.1"] },
    { "id": 10, "tasks": ["10.3", "11.2", "11.3", "12.1"] },
    { "id": 11, "tasks": ["10.4", "11.4", "11.5"] },
    { "id": 12, "tasks": ["13.1", "13.2", "13.3", "13.4"] },
    { "id": 13, "tasks": ["14.1", "14.2"] }
  ]
}
```
