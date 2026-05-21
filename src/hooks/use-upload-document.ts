'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { documentKeys } from '@/lib/documents/query-keys';
import type { Document } from '@/lib/documents/types';

interface UploadProgress {
  /** Upload progress percentage (0-100) */
  percent: number;
}

interface UseUploadDocumentOptions {
  onSuccess?: (document: Document) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: UploadProgress) => void;
}

/**
 * Uploads a file to /api/documents using XMLHttpRequest for progress tracking.
 * Returns a promise that resolves with the created Document.
 */
function uploadFile(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<Document> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress({ percent });
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
 * Hook for uploading a document file.
 *
 * Uses useMutation to POST FormData to /api/documents.
 * Tracks upload progress via XMLHttpRequest.
 * Invalidates the document list query on success.
 */
export function useUploadDocument(options?: UseUploadDocumentOptions) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<UploadProgress>({ percent: 0 });

  const handleProgress = useCallback(
    (p: UploadProgress) => {
      setProgress(p);
      options?.onProgress?.(p);
    },
    [options]
  );

  const mutation = useMutation<Document, Error, File>({
    mutationFn: (file: File) => uploadFile(file, handleProgress),
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      options?.onSuccess?.(document);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
    onMutate: () => {
      setProgress({ percent: 0 });
    },
  });

  return {
    ...mutation,
    progress,
  };
}
