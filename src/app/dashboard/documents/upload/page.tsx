'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  CloudUpload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateFile, ALLOWED_MIME_TYPES } from '@/lib/documents/validation';
import { documentKeys } from '@/lib/documents/query-keys';
import type { Document } from '@/lib/documents/types';

const MAX_FILES = 20;
const ACCEPT_STRING = ALLOWED_MIME_TYPES.join(',');

type FileStage = 'pending' | 'uploading' | 'extracting' | 'success' | 'failed' | 'error';

interface FileEntry {
  id: string;
  file: File;
  stage: FileStage;
  progress: number; // 0-100 for upload, simulated for extraction
  error: string | null;
  documentId: number | null;
}

function uploadFileWithProgress(
  file: File,
  onProgress: (percent: number) => void
): Promise<Document> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const document = JSON.parse(xhr.responseText) as Document;
          resolve(document);
        } catch {
          reject(new Error('Failed to parse upload response'));
        }
      } else {
        try {
          const errorBody = JSON.parse(xhr.responseText);
          reject(new Error(errorBody.error || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload was aborted')));

    xhr.open('POST', '/api/documents');
    xhr.send(formData);
  });
}

async function extractDocument(documentId: number): Promise<Document> {
  const response = await fetch(`/api/documents/${documentId}/extract`, {
    method: 'POST',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(errorData?.error || `Extraction failed with status ${response.status}`);
  }

  return response.json();
}

export default function UploadPage() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  const updateFile = useCallback((id: string, updates: Partial<FileEntry>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }, []);

  const processFile = useCallback(
    async (entry: FileEntry) => {
      // Stage 1: Upload
      updateFile(entry.id, { stage: 'uploading', progress: 0 });

      let doc: Document;
      try {
        doc = await uploadFileWithProgress(entry.file, (percent) => {
          updateFile(entry.id, { progress: percent });
        });
        updateFile(entry.id, { documentId: doc.id, progress: 100 });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        updateFile(entry.id, { stage: 'error', error: message });
        return;
      }

      // Stage 2: Auto-extract
      updateFile(entry.id, { stage: 'extracting', progress: 0 });

      // Simulate progress during extraction
      let extractProgress = 0;
      const progressInterval = setInterval(() => {
        extractProgress = Math.min(extractProgress + Math.random() * 15, 90);
        updateFile(entry.id, { progress: Math.round(extractProgress) });
      }, 800);

      try {
        const result = await extractDocument(doc.id);
        clearInterval(progressInterval);
        updateFile(entry.id, { stage: 'success', progress: 100 });

        queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
        queryClient.invalidateQueries({ queryKey: documentKeys.detail(doc.id) });
      } catch (err) {
        clearInterval(progressInterval);
        const message = err instanceof Error ? err.message : 'Extraction failed';
        updateFile(entry.id, { stage: 'failed', progress: 100, error: message });
        queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      }
    },
    [updateFile, queryClient]
  );

  const processFiles = useCallback(
    (selectedFiles: File[]) => {
      setBatchError(null);

      if (selectedFiles.length > MAX_FILES) {
        setBatchError(`Maximum ${MAX_FILES} files allowed. You selected ${selectedFiles.length}.`);
        return;
      }

      const entries: FileEntry[] = selectedFiles.map((file) => {
        const id = `${file.name}-${Date.now()}-${Math.random()}`;
        const validation = validateFile({ type: file.type, size: file.size });

        if (!validation.valid) {
          return {
            id,
            file,
            stage: 'error' as FileStage,
            progress: 0,
            error: validation.error!.message,
            documentId: null,
          };
        }

        return {
          id,
          file,
          stage: 'pending' as FileStage,
          progress: 0,
          error: null,
          documentId: null,
        };
      });

      setFiles((prev) => [...prev, ...entries]);

      entries
        .filter((e) => e.stage === 'pending')
        .forEach((entry) => processFile(entry));
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) processFiles(droppedFiles);
    },
    [processFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || []);
      if (selected.length > 0) processFiles(selected);
      e.target.value = '';
    },
    [processFiles]
  );

  const successCount = files.filter((f) => f.stage === 'success').length;
  const failedCount = files.filter((f) => f.stage === 'failed' || f.stage === 'error').length;
  const processingCount = files.filter((f) => f.stage === 'uploading' || f.stage === 'extracting').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Upload Documents</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Upload financial documents for automatic AI extraction.
          </p>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload files. Drag and drop or click to browse."
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background ${
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-border bg-card hover:border-muted-foreground/40 hover:bg-muted/20'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <CloudUpload className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">
          Drag and drop files here, or click to browse
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          PNG, JPEG, WebP, or PDF — up to 10 MB each — max {MAX_FILES} files
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPT_STRING}
        className="hidden"
        onChange={handleFileInput}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Batch error */}
      {batchError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3" role="alert">
          <p className="text-sm text-destructive">{batchError}</p>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              Files ({files.length})
              {successCount > 0 && (
                <span className="ml-2 text-xs text-green-400">{successCount} completed</span>
              )}
              {failedCount > 0 && (
                <span className="ml-2 text-xs text-red-400">{failedCount} failed</span>
              )}
            </h3>
            {successCount > 0 && processingCount === 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => router.push('/dashboard/documents')}
              >
                View all documents →
              </Button>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {files.map((entry) => (
                <li key={entry.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      {entry.stage === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      ) : entry.stage === 'failed' || entry.stage === 'error' ? (
                        <XCircle className="h-4 w-4 text-red-400" />
                      ) : entry.stage === 'extracting' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                      ) : entry.stage === 'uploading' ? (
                        <Upload className="h-4 w-4 text-blue-400" />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {entry.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(entry.file.size)}
                        {entry.stage === 'uploading' && ' • Uploading...'}
                        {entry.stage === 'extracting' && ' • Extracting with AI...'}
                        {entry.stage === 'success' && ' • Extraction complete'}
                        {entry.stage === 'failed' && ` • ${entry.error || 'Failed'}`}
                        {entry.stage === 'error' && ` • ${entry.error || 'Error'}`}
                      </p>
                    </div>

                    {/* Status badge */}
                    <div className="shrink-0">
                      {entry.stage === 'uploading' && (
                        <span className="text-xs font-medium text-blue-400">{entry.progress}%</span>
                      )}
                      {entry.stage === 'extracting' && (
                        <span className="text-xs font-medium text-purple-400">{entry.progress}%</span>
                      )}
                      {entry.stage === 'success' && entry.documentId && (
                        <Link
                          href={`/dashboard/documents/${entry.documentId}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          View →
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {(entry.stage === 'uploading' || entry.stage === 'extracting') && (
                    <div className="mt-2 ml-12">
                      <div
                        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-valuenow={entry.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Progress for ${entry.file.name}`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            entry.stage === 'uploading' ? 'bg-blue-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${entry.progress}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {entry.stage === 'uploading' ? 'Uploading to storage...' : 'AI is reading your document...'}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
