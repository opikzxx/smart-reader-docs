'use client';

import { FileText, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentPreviewProps {
  documentId: number;
  fileName: string;
}
export function DocumentPreview({ documentId, fileName }: DocumentPreviewProps) {
  const fileUrl = `/api/documents/${documentId}/file`;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Original Document</p>
          <p className="truncate text-xs text-muted-foreground">{fileName}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a href={fileUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <ExternalLink className="h-3.5 w-3.5" />
            View
          </Button>
        </a>
        <a href={fileUrl} download={fileName}>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
        </a>
      </div>
    </div>
  );
}
