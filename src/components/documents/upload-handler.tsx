'use client';

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { validateFile, ALLOWED_MIME_TYPES } from '@/lib/documents/validation';
import { documentKeys } from '@/lib/documents/query-keys';
import type { Document } from '@/lib/documents/types';

const MAX_FILES = 20;
const MAX_RETRY_ATTEMPTS = 3;

const ACCEPT_STRING = ALLOWED_MIME_TYPES.join(',');

type FileStatus = 'pending' | 'uploading' | 'success' | 'error';

interface FileEntry {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  error: string | null;
  retryCount: number;
}

/**
 * Uploads a single file via XHR with progress tracking.
 * Mirrors the logic from useUploadDocument hook but allows per-file progress callbacks.
 */
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

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was aborted'));
    });

    xhr.open('POST', '/api/documents');
    xhr.send(formData);
  });
}

/**
 * UploadHandler component provides drag-and-drop multi-file upload
 * with per-file progress tracking, validation, and retry support.
 *
 * Uses useMutation (same pattern as useUploadDocument hook) for each file upload,
 * with query invalidation on success.
 */
export function UploadHandler() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const updateFileEntry = useCallback(
    (id: string, updates: Partial<FileEntry>) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
      );
    },
    []
  );

  const uploadSingleFile = useCallback(
    async (entry: FileEntry) => {
      updateFileEntry(entry.id, { status: 'uploading', progress: 0, error: null });

      try {
        await uploadFileWithProgress(entry.file, (percent) => {
          updateFileEntry(entry.id, { progress: percent });
        });
        updateFileEntry(entry.id, { status: 'success', progress: 100 });
        queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        updateFileEntry(entry.id, { status: 'error', error: message });
      }
    },
    [updateFileEntry, queryClient]
  );

  const processFiles = useCallback(
    (selectedFiles: File[]) => {
      setBatchError(null);

      if (selectedFiles.length > MAX_FILES) {
        setBatchError(
          `Maximum ${MAX_FILES} files allowed per upload. You selected ${selectedFiles.length}.`
        );
        return;
      }

      const entries: FileEntry[] = selectedFiles.map((file) => {
        const id = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
        const validation = validateFile({ type: file.type, size: file.size });

        if (!validation.valid) {
          return {
            id,
            file,
            status: 'error' as FileStatus,
            progress: 0,
            error: validation.error!.message,
            retryCount: 0,
          };
        }

        return {
          id,
          file,
          status: 'pending' as FileStatus,
          progress: 0,
          error: null,
          retryCount: 0,
        };
      });

      setFiles((prev) => [...prev, ...entries]);

      // Start uploading valid files independently
      entries
        .filter((e) => e.status === 'pending')
        .forEach((entry) => {
          uploadSingleFile(entry);
        });
    },
    [uploadSingleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        processFiles(droppedFiles);
      }
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length > 0) {
        processFiles(selectedFiles);
      }
      // Reset input so the same file can be selected again
      e.target.value = '';
    },
    [processFiles]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    },
    []
  );

  const handleDropZoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRetry = useCallback(
    (id: string) => {
      const entry = files.find((f) => f.id === id);
      if (entry && entry.retryCount < MAX_RETRY_ATTEMPTS) {
        const updated: FileEntry = {
          ...entry,
          retryCount: entry.retryCount + 1,
          status: 'pending',
          error: null,
          progress: 0,
        };
        setFiles((prev) => prev.map((f) => (f.id === id ? updated : f)));
        uploadSingleFile(updated);
      }
    },
    [files, uploadSingleFile]
  );

  const handleClearCompleted = useCallback(() => {
    setFiles((prev) => prev.filter((f) => f.status !== 'success'));
  }, []);

  return (
    <div className="w-full space-y-4">
      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        role="button"
        tabIndex={0}
        aria-label="Upload files. Drag and drop files here or press Enter to open file picker."
        className={`
          relative flex flex-col items-center justify-center
          min-h-[200px] rounded-lg border-2 border-dashed
          cursor-pointer transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${
            isDragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onKeyDown={handleKeyDown}
        onClick={handleDropZoneClick}
      >
        <svg
          className="w-12 h-12 text-gray-400 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="text-sm text-gray-600 font-medium">
          Drag and drop files here, or click to browse
        </p>
        <p className="text-xs text-gray-600 mt-1">
          PNG, JPEG, WebP, or PDF — up to 10 MB each — max {MAX_FILES} files
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPT_STRING}
        className="hidden"
        onChange={handleFileInputChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Batch error */}
      {batchError && (
        <div
          role="alert"
          className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700"
        >
          {batchError}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-800">
              Files ({files.length})
            </h3>
            {files.some((f) => f.status === 'success') && (
              <button
                type="button"
                onClick={handleClearCompleted}
                className="text-xs text-gray-600 hover:text-gray-800 underline min-w-[44px] min-h-[44px] flex items-center justify-center md:min-w-0 md:min-h-0"
              >
                Clear completed
              </button>
            )}
          </div>

          <ul className="divide-y divide-gray-100 rounded-md border border-gray-200 bg-white">
            {files.map((entry) => (
              <li key={entry.id} className="px-3 py-3 sm:px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {entry.file.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {formatFileSize(entry.file.size)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status indicator */}
                    {entry.status === 'uploading' && (
                      <span className="text-xs text-blue-600 font-medium whitespace-nowrap">
                        {entry.progress}%
                      </span>
                    )}
                    {entry.status === 'success' && (
                      <span className="text-xs text-green-600 font-medium">
                        Done
                      </span>
                    )}
                    {entry.status === 'error' && (
                      <div className="flex items-center gap-2">
                        {entry.retryCount < MAX_RETRY_ATTEMPTS ? (
                          <button
                            type="button"
                            onClick={() => handleRetry(entry.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium underline min-w-[44px] min-h-[44px] flex items-center justify-center md:min-w-0 md:min-h-0"
                            aria-label={`Retry upload for ${entry.file.name}`}
                          >
                            Retry
                          </button>
                        ) : (
                          <span className="text-xs text-gray-600">
                            Try again later
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {entry.status === 'uploading' && (
                  <div
                    className="mt-2 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={entry.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Upload progress for ${entry.file.name}`}
                  >
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${entry.progress}%` }}
                    />
                  </div>
                )}

                {/* Error message */}
                {entry.status === 'error' && entry.error && (
                  <p className="mt-1 text-xs text-red-600" role="alert">
                    {entry.error}
                  </p>
                )}
              </li>
            ))}
          </ul>
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
