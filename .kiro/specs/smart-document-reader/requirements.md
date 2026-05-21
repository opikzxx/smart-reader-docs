# Requirements Document

## Introduction

Smart Document Reader is a web application for reading and extracting structured data from financial documents (invoices, receipts, bills) using OCR and AI Vision models. Users upload document images or PDFs, the system extracts key financial data via a free LLM Vision model (Gemini 1.5 Flash / Groq), presents the results in a reviewable form with confidence indicators, and stores finalized data for dashboard viewing and CSV export. The application follows a four-stage workflow: Upload → Processing → Review → Ready.

## Glossary

- **Document_Reader**: The Smart Document Reader web application built with Next.js App Router
- **Upload_Handler**: The client-side component responsible for drag-and-drop file upload to Cloudflare R2
- **AI_Extractor**: The API Route that sends document files to an LLM Vision model for OCR extraction
- **Review_Form**: The dynamic form component that displays extracted JSON data with confidence indicators
- **Dashboard**: The main page displaying a filterable table of all documents and their statuses
- **Query_Provider**: The TanStack Query client provider component wrapping the application layout
- **Document**: A financial file (image or PDF) uploaded by the user, stored in R2
- **Extraction_Result**: The structured JSON output from the AI Vision model containing financial fields and confidence scores
- **Confidence_Score**: A numeric value between 0 and 1 indicating the AI model's certainty for each extracted field
- **Document_Status**: The lifecycle state of a document: "uploaded", "processing", "review", or "ready"

## Requirements

### Requirement 1: Multi-File Upload

**User Story:** As a user, I want to drag and drop multiple financial documents at once, so that I can batch-upload files without selecting them one by one.

#### Acceptance Criteria

1. THE Upload_Handler SHALL accept up to 20 files simultaneously via drag-and-drop interaction
2. THE Upload_Handler SHALL accept up to 20 files simultaneously via a file picker dialog as a fallback
3. WHEN files are dropped or selected, THE Upload_Handler SHALL upload each file independently to Cloudflare R2 storage, so that the failure of one file does not block the upload of other files in the batch
4. WHEN a file upload completes successfully, THE Document_Reader SHALL create a record in the D1 database with Document_Status set to "uploaded"
5. THE Upload_Handler SHALL accept files with MIME types of image/png, image/jpeg, image/webp, and application/pdf, with a maximum file size of 10 MB per file
6. IF a file has an unsupported MIME type, THEN THE Upload_Handler SHALL reject the file and display an error message indicating the supported formats
7. IF a file exceeds the maximum file size of 10 MB, THEN THE Upload_Handler SHALL reject the file and display an error message indicating the maximum allowed size
8. IF a file upload to Cloudflare R2 fails, THEN THE Upload_Handler SHALL display an error message for that specific file indicating the upload failed, while preserving the status of other files in the batch
9. WHEN an upload is in progress, THE Upload_Handler SHALL display a percentage-based progress indicator for each file showing upload completion from 0% to 100%
10. IF the user drops or selects more than 20 files at once, THEN THE Upload_Handler SHALL reject the entire batch and display an error message indicating the maximum number of files allowed per upload
11. THE Upload_Handler SHALL use a TanStack Query useMutation hook and invalidate the document list query on success

### Requirement 2: AI Document Extraction

**User Story:** As a user, I want the system to automatically extract financial data from my uploaded documents using AI, so that I do not have to manually type all the information.

#### Acceptance Criteria

1. WHEN a document has Document_Status "uploaded" and the user triggers extraction, THE AI_Extractor SHALL retrieve the file from R2 and send it to the configured LLM Vision model within 60 seconds
2. WHEN the user triggers extraction, THE Document_Reader SHALL set the Document_Status to "processing" before sending the request to the LLM Vision model
3. WHEN the LLM Vision model returns a successful response, THE AI_Extractor SHALL parse the response into an Extraction_Result containing: vendor name, date, total, currency, item list (maximum 100 items), and a Confidence_Score for each field
4. WHEN extraction completes successfully, THE Document_Reader SHALL store the Extraction_Result in the D1 database and set Document_Status to "review"
5. IF the LLM Vision model returns an error, times out after 60 seconds, or returns a response that cannot be parsed into a valid Extraction_Result, THEN THE AI_Extractor SHALL set Document_Status to "review" and store an empty Extraction_Result with all Confidence_Scores set to 0, allowing the user to fill the form manually
6. IF the user triggers extraction on a document that already has Document_Status "processing", THEN THE AI_Extractor SHALL reject the request and indicate that extraction is already in progress
7. THE AI_Extractor SHALL send the document as a Base64-encoded payload to the LLM Vision model for files up to 10 MB, or as a signed URL for files exceeding 10 MB

### Requirement 3: Extraction Result Data Structure

**User Story:** As a developer, I want a well-defined JSON schema for extraction results, so that the system can consistently store and display extracted data.

#### Acceptance Criteria

1. THE AI_Extractor SHALL produce an Extraction_Result with the following fields: vendor_name (string, 1–200 characters), date (string in ISO 8601 date format YYYY-MM-DD), total (number, 0.00 to 999,999,999.99 with up to 2 decimal places), currency (string, exactly 3 uppercase letters per ISO 4217), items (array of 0 to 100 objects), and a Confidence_Score (number between 0.0 and 1.0 inclusive, rounded to 2 decimal places) for each top-level field (vendor_name, date, total, currency, items)
2. THE AI_Extractor SHALL produce each item in the items array with the fields: description (string, 1–500 characters), quantity (number, 0.01 to 999,999.99 with up to 2 decimal places), unit_price (number, 0.00 to 999,999,999.99 with up to 2 decimal places), and amount (number, 0.00 to 999,999,999.99 with up to 2 decimal places)
3. IF the AI_Extractor cannot determine a value for a required field, THEN THE AI_Extractor SHALL set that field to null and SHALL assign a Confidence_Score of 0.0 to that field
4. THE AI_Extractor SHALL produce Extraction_Result objects that, when serialized to JSON and parsed back, yield a structurally identical object with the same field names, types, and values
5. IF the items array is empty, THEN THE AI_Extractor SHALL still include the items field as an empty array and SHALL assign a Confidence_Score to the items field representing confidence that the document contains no line items

### Requirement 4: Dynamic Review Form

**User Story:** As a user, I want to review and correct the AI-extracted data before finalizing, so that I can ensure accuracy of the stored financial information.

#### Acceptance Criteria

1. WHEN a document has Document_Status "review", THE Review_Form SHALL display all Extraction_Result fields in editable input fields, including fields with empty values from an empty Extraction_Result
2. WHEN a field has a Confidence_Score below 0.7, THE Review_Form SHALL highlight that input field with a visually distinct border color differing from the standard appearance to signal the user to verify the value
3. WHEN a field has a Confidence_Score of 0.7 or above, THE Review_Form SHALL display that input field with a standard appearance (no highlight border)
4. THE Review_Form SHALL display the item list in an editable table format allowing addition and removal of line items, with a minimum of 0 and a maximum of 100 line items
5. WHEN the user clicks "Save & Ready", THE Review_Form SHALL validate that all required fields (vendor_name, date, total, currency) contain non-empty, non-whitespace-only values, that the date field is a valid ISO 8601 date string, that the total field is a numeric value greater than or equal to 0, and that the currency field is a valid ISO 4217 currency code
6. IF required fields are missing or invalid when "Save & Ready" is clicked, THEN THE Review_Form SHALL display a validation error message adjacent to each invalid field indicating the reason for failure, and prevent submission
7. WHEN the user submits a valid review form, THE Document_Reader SHALL update the Extraction_Result in D1 and set Document_Status to "ready"
8. IF the submission to D1 fails after the user submits a valid review form, THEN THE Review_Form SHALL display an error message indicating the save failed, preserve all user-entered form data, and allow the user to retry submission
9. THE Review_Form SHALL use a TanStack Query useMutation hook for submission and invalidate the document list query on success
10. WHEN the submission completes successfully, THE Review_Form SHALL display a success indication and navigate the user to the Dashboard or document list view within 2 seconds

### Requirement 5: Dashboard and Document List

**User Story:** As a user, I want to see all my documents in a table with their status and key details, so that I can track the progress of document processing.

#### Acceptance Criteria

1. THE Dashboard SHALL display a table of all documents with columns: file name, vendor name, date, total, currency, Document_Status, and upload timestamp, sorted by upload timestamp in descending order (newest first) by default
2. THE Dashboard SHALL fetch the document list using a TanStack Query useQuery hook from a D1-backed API route
3. THE Dashboard SHALL provide a filter for Document_Status allowing the user to select one or more statuses ("uploaded", "processing", "review", "ready") to filter the displayed documents, with all statuses shown by default
4. THE Dashboard SHALL provide a filter for date range allowing the user to narrow results by upload timestamp, where both start and end dates are optional
5. THE Dashboard SHALL provide a case-insensitive text filter for vendor name allowing partial match search that filters results as the user types
6. WHEN filters are applied, THE Dashboard SHALL update the displayed results without a full page reload
7. WHILE the document list query is loading, THE Dashboard SHALL display a loading indicator in place of the table content
8. IF no documents exist in the system, THEN THE Dashboard SHALL display an empty state message indicating no documents have been uploaded and directing the user to the upload action
9. IF active filters produce no matching documents, THEN THE Dashboard SHALL display a message indicating no documents match the current filters and provide an option to clear all filters

### Requirement 6: CSV Export

**User Story:** As a user, I want to export finalized document data to CSV, so that I can use the extracted information in spreadsheets or accounting software.

#### Acceptance Criteria

1. THE Dashboard SHALL provide an export button that is enabled when at least one document with Document_Status "ready" matches the current filter criteria, and disabled otherwise
2. WHEN the user clicks the export button, THE Document_Reader SHALL generate a UTF-8 encoded, comma-delimited CSV file containing all documents with Document_Status "ready" that match the current filter criteria
3. THE Document_Reader SHALL include a header row as the first row of the CSV, followed by one data row per document, with the following columns: file name, vendor name, date (in ISO 8601 format YYYY-MM-DD), total, currency (ISO 4217 code), and item count
4. WHEN the CSV is generated, THE Document_Reader SHALL trigger a browser download of the file with a filename in the format "documents-export-YYYY-MM-DD.csv" where YYYY-MM-DD is the current date
5. THE Document_Reader SHALL enclose field values containing commas, double quotes, or newlines in double quotes, and escape any embedded double quotes by doubling them
6. IF CSV generation fails, THEN THE Document_Reader SHALL display an error message indicating the export could not be completed and no file shall be downloaded

### Requirement 7: Database Schema

**User Story:** As a developer, I want a well-structured database schema, so that document metadata and extraction results are stored efficiently and queryable.

#### Acceptance Criteria

1. THE Document_Reader SHALL store document metadata in a "documents" table with columns: id (INTEGER primary key, auto-increment), file_name (TEXT, max 255 characters, NOT NULL), r2_key (TEXT, max 512 characters, NOT NULL), status (TEXT, NOT NULL, constrained to values "uploaded", "processing", "review", or "ready"), vendor_name (TEXT, max 255 characters), date (TEXT in ISO 8601 format), total (REAL), currency (TEXT, max 3 characters, ISO 4217 code), confidence_scores (TEXT storing JSON), created_at (TEXT, NOT NULL, defaults to current timestamp on insert), and updated_at (TEXT, NOT NULL, defaults to current timestamp on insert and updated on modification)
2. THE Document_Reader SHALL store extracted line items in an "extracted_items" table with columns: id (INTEGER primary key, auto-increment), document_id (INTEGER, NOT NULL, foreign key to documents.id), description (TEXT, max 500 characters), quantity (REAL, minimum value 0), unit_price (REAL), and amount (REAL)
3. THE Document_Reader SHALL enforce a foreign key relationship between extracted_items.document_id and documents.id with CASCADE delete behavior, so that deleting a document removes all its associated extracted items
4. THE Document_Reader SHALL create indexes on the documents table for the status, vendor_name, and date columns to support Dashboard filtering and sorting operations
5. IF a record is inserted into the documents table without an explicit created_at or updated_at value, THEN THE Document_Reader SHALL automatically set both fields to the current UTC timestamp

### Requirement 8: TanStack Query Integration

**User Story:** As a developer, I want consistent data fetching and mutation patterns using TanStack Query, so that the UI stays synchronized with server state automatically.

#### Acceptance Criteria

1. THE Query_Provider SHALL be a client component (with 'use client' directive) that wraps the root layout with a QueryClientProvider and creates the QueryClient instance outside the component render cycle to prevent re-creation on re-renders
2. THE Document_Reader SHALL use useQuery hooks for all data fetching operations (document list, single document details) with a default staleTime of 30 seconds
3. THE Document_Reader SHALL use useMutation hooks for all write operations (file upload, AI extraction trigger, review form submission)
4. WHEN a mutation completes successfully, THE Document_Reader SHALL invalidate the document list query after file upload or review form submission, and invalidate the single document detail query after AI extraction trigger or review form submission
5. IF a query fails, THEN THE Document_Reader SHALL retry the request up to 3 times before displaying an inline error message in the component where the data was requested, without crashing the application
6. IF a mutation fails, THEN THE Document_Reader SHALL display an inline error message near the triggering action indicating the operation failed, without crashing the application, and SHALL NOT retry automatically
7. WHILE a useQuery hook is in loading state, THE Document_Reader SHALL display a loading indicator in place of the expected content
8. WHILE a useMutation hook is in pending state, THE Document_Reader SHALL disable the triggering control to prevent duplicate submissions

### Requirement 9: Error Handling and Resilience

**User Story:** As a user, I want the application to handle errors gracefully, so that I can continue working even when something goes wrong.

#### Acceptance Criteria

1. IF the AI_Extractor fails during processing, THEN THE Document_Reader SHALL set the Document_Status to "review", display a notification indicating extraction failed, and present the Review_Form with empty fields for manual data entry
2. IF a file upload to R2 fails, THEN THE Upload_Handler SHALL display an error message identifying the failed file by name, preserve any other successfully uploaded files, and provide a retry button for the failed file that allows up to 3 retry attempts
3. IF the D1 database is unreachable, THEN THE Document_Reader SHALL display a connection error message and provide a retry button that re-attempts the failed operation up to 3 times with a 2-second delay between attempts
4. IF a TanStack Query query or mutation encounters an error, THEN THE Document_Reader SHALL render an inline error message describing the failed action without crashing the application or requiring a full page reload
5. THE Document_Reader SHALL log errors to the browser console including the error type and origin component, without displaying stack traces, server addresses, or internal identifiers to the user in the UI
6. IF all retry attempts for a failed operation are exhausted, THEN THE Document_Reader SHALL disable the retry button and display a message instructing the user to try again later

### Requirement 10: Responsive and Accessible UI

**User Story:** As a user, I want the application to work well on different screen sizes and be accessible, so that I can use it on desktop and mobile devices.

#### Acceptance Criteria

1. THE Document_Reader SHALL render a responsive layout using Tailwind CSS that displays all content without horizontal scrolling at any viewport width between 320px and 1920px
2. THE Document_Reader SHALL use a single-column layout at viewport widths below 768px and a multi-column layout at viewport widths of 768px and above
3. THE Document_Reader SHALL maintain a minimum touch target size of 44x44 CSS pixels for all interactive elements at viewport widths below 768px
4. THE Document_Reader SHALL maintain a color contrast ratio of at least 4.5:1 for normal text and 3:1 for large text (18px or above) against background colors
5. THE Upload_Handler SHALL provide keyboard-accessible file upload via Tab key navigation to the drop zone and Enter or Space key activation, with a visible focus indicator that has a minimum contrast ratio of 3:1 against adjacent colors
6. THE Review_Form SHALL associate each input field with a programmatic label using the HTML `for` attribute, and SHALL provide `aria-valuenow` and `aria-valuetext` attributes on confidence indicators to convey the numeric confidence value to assistive technologies
7. THE Dashboard SHALL use semantic HTML `<table>` elements with `<th>` elements containing `scope` attributes (row or col) and a `<caption>` element describing the table purpose for screen reader compatibility
