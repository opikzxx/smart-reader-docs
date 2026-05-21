-- Migration: Add user_id to documents and support 'failed' status
-- Each document is now associated with the user who uploaded it

-- Add user_id column (nullable for backward compatibility with existing data)
ALTER TABLE documents ADD COLUMN user_id TEXT REFERENCES users(id);

-- Create index for filtering documents by user
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);

-- Update status check constraint to include 'failed'
-- SQLite doesn't support ALTER CONSTRAINT, so we recreate via a new check
-- For D1, we'll handle 'failed' status at the application level
