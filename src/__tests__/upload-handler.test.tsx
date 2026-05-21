import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UploadHandler } from '../components/documents/upload-handler';

// Mock XMLHttpRequest
let xhrInstances: MockXHR[] = [];

class MockXHR {
  status = 200;
  responseText = '';
  upload = {
    addEventListener: vi.fn(),
  };
  addEventListener = vi.fn();
  open = vi.fn();
  send = vi.fn();

  constructor() {
    xhrInstances.push(this);
  }

  // Helper to simulate load event
  simulateLoad(status: number, responseText: string) {
    this.status = status;
    this.responseText = responseText;
    const loadHandler = this.addEventListener.mock.calls.find(
      (call) => call[0] === 'load'
    )?.[1];
    if (loadHandler) loadHandler();
  }

  // Helper to simulate error event
  simulateError() {
    const errorHandler = this.addEventListener.mock.calls.find(
      (call) => call[0] === 'error'
    )?.[1];
    if (errorHandler) errorHandler();
  }

  // Helper to simulate progress
  simulateProgress(loaded: number, total: number) {
    const progressHandler = this.upload.addEventListener.mock.calls.find(
      (call) => call[0] === 'progress'
    )?.[1];
    if (progressHandler) progressHandler({ lengthComputable: true, loaded, total });
  }
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function createFile(name: string, size: number, type: string): File {
  // Create a file with the correct reported size
  // For large files, use a small buffer but override the size via Object.defineProperty
  const content = new Uint8Array(Math.min(size, 64));
  const file = new File([content], name, { type });
  if (size > 64) {
    Object.defineProperty(file, 'size', { value: size, writable: false });
  }
  return file;
}

function dropFiles(dropZone: HTMLElement, files: File[]) {
  const dataTransfer = {
    files,
    items: files.map((f) => ({
      kind: 'file',
      type: f.type,
      getAsFile: () => f,
    })),
    types: ['Files'],
  };
  fireEvent.drop(dropZone, { dataTransfer });
}

describe('UploadHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    xhrInstances = [];
    vi.stubGlobal(
      'XMLHttpRequest',
      vi.fn(() => new MockXHR())
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('drag-drop interaction', () => {
    it('renders the drop zone with instructions', () => {
      render(<UploadHandler />, { wrapper: createWrapper() });
      expect(
        screen.getByText(/drag and drop files here/i)
      ).toBeInTheDocument();
    });

    it('shows visual feedback on drag over', () => {
      render(<UploadHandler />, { wrapper: createWrapper() });
      const dropZone = screen.getByRole('button', { name: /upload files/i });

      fireEvent.dragOver(dropZone, {
        dataTransfer: { files: [], items: [], types: [] },
      });
      expect(dropZone.className).toContain('border-blue-500');
    });

    it('removes visual feedback on drag leave', () => {
      render(<UploadHandler />, { wrapper: createWrapper() });
      const dropZone = screen.getByRole('button', { name: /upload files/i });

      fireEvent.dragOver(dropZone, {
        dataTransfer: { files: [], items: [], types: [] },
      });
      fireEvent.dragLeave(dropZone, {
        dataTransfer: { files: [], items: [], types: [] },
      });
      expect(dropZone.className).not.toContain('border-blue-500');
    });

    it('processes valid files on drop and initiates upload', async () => {
      render(<UploadHandler />, { wrapper: createWrapper() });
      const dropZone = screen.getByRole('button', { name: /upload files/i });

      const file = createFile('invoice.pdf', 1024, 'application/pdf');
      dropFiles(dropZone, [file]);

      // File name should appear in the list
      expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
      // XHR should have been created and opened
      expect(xhrInstances.length).toBe(1);
      expect(xhrInstances[0].open).toHaveBeenCalledWith('POST', '/api/documents');
      expect(xhrInstances[0].send).toHaveBeenCalled();
    });

    it('is keyboard accessible with tabIndex 0', () => {
      render(<UploadHandler />, { wrapper: createWrapper() });
      const dropZone = screen.getByRole('button', { name: /upload files/i });
      expect(dropZone).toHaveAttribute('tabindex', '0');
    });
  });

  describe('file validation rejection', () => {
    it('rejects files with unsupported MIME type and shows error', () => {
      render(<UploadHandler />, { wrapper: createWrapper() });
      const dropZone = screen.getByRole('button', { name: /upload files/i });

      const file = createFile('document.txt', 1024, 'text/plain');
      dropFiles(dropZone, [file]);

      expect(
        screen.getByText(/file type not supported/i)
      ).toBeInTheDocument();
      // No XHR should be created for invalid files
      expect(xhrInstances.length).toBe(0);
    });

    it('rejects files exceeding 10 MB and shows error', () => {
      render(<UploadHandler />, { wrapper: createWrapper() });
      const dropZone = screen.getByRole('button', { name: /upload files/i });

      const file = createFile('large.pdf', 10_485_761, 'application/pdf');
      dropFiles(dropZone, [file]);

      expect(
        screen.getByText(/file size exceeds maximum of 10 mb/i)
      ).toBeInTheDocument();
      expect(xhrInstances.length).toBe(0);
    });

    it('shows error for invalid file while uploading valid files in same batch', () => {
      render(<UploadHandler />, { wrapper: createWrapper() });
      const dropZone = screen.getByRole('button', { name: /upload files/i });

      const validFile = createFile('invoice.pdf', 1024, 'application/pdf');
      const invalidFile = createFile('video.mp4', 1024, 'video/mp4');
      dropFiles(dropZone, [validFile, invalidFile]);

      // Valid file should trigger XHR upload
      expect(xhrInstances.length).toBe(1);
      // Invalid file should show error
      expect(
        screen.getByText(/file type not supported/i)
      ).toBeInTheDocument();
      // Both files should appear in the list
      expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
      expect(screen.getByText('video.mp4')).toBeInTheDocument();
    });
  });

  describe('progress display', () => {
    it('shows file name and size after drop', () => {
      render(<UploadHandler />, { wrapper: createWrapper() });
      const dropZone = screen.getByRole('button', { name: /upload files/i });

      const file = createFile('receipt.png', 2048, 'image/png');
      dropFiles(dropZone, [file]);

      expect(screen.getByText('receipt.png')).toBeInTheDocument();
    });

    it('shows progress percentage during upload', async () => {
      render(<UploadHandler />, { wrapper: createWrapper() });
      const dropZone = screen.getByRole('button', { name: /upload files/i });

      const file = createFile('invoice.pdf', 1024, 'application/pdf');
      dropFiles(dropZone, [file]);

      // Simulate progress
      await act(async () => {
        xhrInstances[0].simulateProgress(512, 1024);
      });

      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('shows "Done" status when upload completes successfully', async () => {
      render(<UploadHandler />, { wrapper: createWrapper() });
      const dropZone = screen.getByRole('button', { name: /upload files/i });

      const file = createFile('invoice.pdf', 1024, 'application/pdf');
      dropFiles(dropZone, [file]);

      // Simulate successful upload
      await act(async () => {
        xhrInstances[0].simulateLoad(
          200,
          JSON.stringify({ id: 1, file_name: 'invoice.pdf', r2_key: 'docs/1/invoice.pdf', status: 'uploaded', vendor_name: null, date: null, total: null, currency: null, confidence_scores: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' })
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Done')).toBeInTheDocument();
      });
    });

    it('shows error message when upload fails', async () => {
      render(<UploadHandler />, { wrapper: createWrapper() });
      const dropZone = screen.getByRole('button', { name: /upload files/i });

      const file = createFile('invoice.pdf', 1024, 'application/pdf');
      dropFiles(dropZone, [file]);

      // Simulate network error
      await act(async () => {
        xhrInstances[0].simulateError();
      });

      await waitFor(() => {
        expect(screen.getByText(/network error during upload/i)).toBeInTheDocument();
      });
    });
  });

  describe('batch limit enforcement', () => {
    it('rejects batch exceeding 20 files with error message', () => {
      render(<UploadHandler />, { wrapper: createWrapper() });
      const dropZone = screen.getByRole('button', { name: /upload files/i });

      const files = Array.from({ length: 21 }, (_, i) =>
        createFile(`file-${i}.pdf`, 1024, 'application/pdf')
      );
      dropFiles(dropZone, files);

      expect(
        screen.getByText(/maximum 20 files allowed/i)
      ).toBeInTheDocument();
      // No uploads should be initiated
      expect(xhrInstances.length).toBe(0);
    });

    it('accepts exactly 20 files without error', () => {
      render(<UploadHandler />, { wrapper: createWrapper() });
      const dropZone = screen.getByRole('button', { name: /upload files/i });

      const files = Array.from({ length: 20 }, (_, i) =>
        createFile(`file-${i}.pdf`, 1024, 'application/pdf')
      );
      dropFiles(dropZone, files);

      expect(
        screen.queryByText(/maximum 20 files allowed/i)
      ).not.toBeInTheDocument();
      // All 20 files should trigger uploads
      expect(xhrInstances.length).toBe(20);
    });

    it('displays the count of selected files in the batch error', () => {
      render(<UploadHandler />, { wrapper: createWrapper() });
      const dropZone = screen.getByRole('button', { name: /upload files/i });

      const files = Array.from({ length: 25 }, (_, i) =>
        createFile(`file-${i}.pdf`, 1024, 'application/pdf')
      );
      dropFiles(dropZone, files);

      expect(screen.getByText(/you selected 25/i)).toBeInTheDocument();
    });
  });

  describe('retry behavior', () => {
    it('shows retry button on upload failure', async () => {
      render(<UploadHandler />, { wrapper: createWrapper() });
      const dropZone = screen.getByRole('button', { name: /upload files/i });

      const file = createFile('invoice.pdf', 1024, 'application/pdf');
      dropFiles(dropZone, [file]);

      await act(async () => {
        xhrInstances[0].simulateError();
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /retry upload for invoice\.pdf/i })
        ).toBeInTheDocument();
      });
    });

    it('retries upload when retry button is clicked', async () => {
      render(<UploadHandler />, { wrapper: createWrapper() });
      const dropZone = screen.getByRole('button', { name: /upload files/i });

      const file = createFile('invoice.pdf', 1024, 'application/pdf');
      dropFiles(dropZone, [file]);

      // First upload fails
      await act(async () => {
        xhrInstances[0].simulateError();
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /retry upload for invoice\.pdf/i })
        ).toBeInTheDocument();
      });

      // Click retry
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /retry upload for invoice\.pdf/i }));
      });

      // A new XHR should be created
      expect(xhrInstances.length).toBe(2);

      // Second upload succeeds
      await act(async () => {
        xhrInstances[1].simulateLoad(
          200,
          JSON.stringify({ id: 1, file_name: 'invoice.pdf', r2_key: 'docs/1/invoice.pdf', status: 'uploaded', vendor_name: null, date: null, total: null, currency: null, confidence_scores: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' })
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Done')).toBeInTheDocument();
      });
    });

    it('disables retry after 3 attempts and shows "Try again later"', async () => {
      render(<UploadHandler />, { wrapper: createWrapper() });
      const dropZone = screen.getByRole('button', { name: /upload files/i });

      const file = createFile('invoice.pdf', 1024, 'application/pdf');
      dropFiles(dropZone, [file]);

      // Initial upload fails
      await act(async () => {
        xhrInstances[0].simulateError();
      });

      // Retry 3 times (max retries)
      for (let i = 0; i < 3; i++) {
        await waitFor(() => {
          expect(
            screen.getByRole('button', { name: /retry upload for invoice\.pdf/i })
          ).toBeInTheDocument();
        });

        await act(async () => {
          fireEvent.click(screen.getByRole('button', { name: /retry upload for invoice\.pdf/i }));
        });

        await act(async () => {
          xhrInstances[xhrInstances.length - 1].simulateError();
        });
      }

      // After 3 retries, should show "Try again later" instead of retry button
      await waitFor(() => {
        expect(screen.getByText(/try again later/i)).toBeInTheDocument();
      });
      expect(
        screen.queryByRole('button', { name: /retry upload for invoice\.pdf/i })
      ).not.toBeInTheDocument();
    });
  });
});
