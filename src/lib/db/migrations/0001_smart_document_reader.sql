-- Migration: Smart Document Reader
-- Creates documents and extracted_items tables for the document processing workflow

-- Documents table: stores document metadata and extraction results
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL CHECK(length(file_name) <= 255),
    r2_key TEXT NOT NULL CHECK(length(r2_key) <= 512),
    status TEXT NOT NULL CHECK(status IN ('uploaded', 'processing', 'review', 'ready')),
    vendor_name TEXT CHECK(vendor_name IS NULL OR length(vendor_name) <= 255),
    date TEXT CHECK(date IS NULL OR date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
    total REAL CHECK(total IS NULL OR (total >= 0 AND total <= 999999999.99)),
    currency TEXT CHECK(currency IS NULL OR (length(currency) = 3 AND currency GLOB '[A-Z][A-Z][A-Z]')),
    confidence_scores TEXT, -- JSON string of ConfidenceScores
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Extracted items table: stores line items from extraction
CREATE TABLE IF NOT EXISTS extracted_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    description TEXT CHECK(description IS NULL OR length(description) <= 500),
    quantity REAL CHECK(quantity IS NULL OR quantity >= 0),
    unit_price REAL,
    amount REAL,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Indexes for dashboard filtering and sorting
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_vendor_name ON documents(vendor_name);
CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(date);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_extracted_items_document_id ON extracted_items(document_id);
