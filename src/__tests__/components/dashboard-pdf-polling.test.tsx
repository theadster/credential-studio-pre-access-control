/**
 * Unit Tests for Dashboard PDF Export Polling Logic
 *
 * Tests the async start-then-poll flow implemented in handleBulkExportPdf
 * in src/pages/dashboard.tsx. Since the full dashboard component has many
 * heavy dependencies, we test the polling logic in isolation via a minimal
 * wrapper that replicates the exact same flow.
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.6, 5.7, 7.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRef, useCallback } from 'react';
import { showProgressModal, closeProgressModal } from '@/lib/sweetalert-progress';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUpdateProgress = vi.fn();
const mockShowProgressModal = vi.fn(() => mockUpdateProgress);
const mockCloseProgressModal = vi.fn();
vi.mock('@/lib/sweetalert-progress', () => ({
  showProgressModal: (...args: any[]) => mockShowProgressModal(...args),
  closeProgressModal: () => mockCloseProgressModal(),
}));

// ---------------------------------------------------------------------------
// Minimal hook replicating the polling logic from dashboard.tsx
//
// The hook accepts an optional `isModalVisible` function so tests can
// control modal-close detection without relying on Swal internals.
// ---------------------------------------------------------------------------

function usePdfPollingLogic({
  onError,
  onSuccess,
  onTimeout,
  isModalVisible = () => true,
}: {
  onError: (msg: string) => void;
  onSuccess: (pdfUrl: string, attendeeCount: number) => void;
  onTimeout: () => void;
  isModalVisible?: () => boolean;
}) {
  const pdfPollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPdfPolling = useCallback(() => {
    if (pdfPollingIntervalRef.current !== null) {
      clearInterval(pdfPollingIntervalRef.current);
      pdfPollingIntervalRef.current = null;
    }
  }, []);

  const startExport = useCallback(async (attendeeIds: string[]) => {
    try {
      const startResponse = await fetch('/api/attendees/bulk-export-pdf-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendeeIds }),
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json();

        if (errorData.errorType === 'missing_credentials') {
          onError('missing_credentials:' + JSON.stringify(errorData.attendeesWithoutCredentials));
          return;
        }

        if (errorData.errorType === 'outdated_credentials') {
          onError('outdated_credentials:' + JSON.stringify(errorData.attendeesWithOutdatedCredentials));
          return;
        }

        throw new Error(errorData.error || 'Failed to start PDF generation');
      }

      const { jobId } = await startResponse.json();
      const attendeeCount = attendeeIds.length;

      // Step 2: Show progress modal
      const updateProgress = showProgressModal(false);
      updateProgress({
        title: 'Generating PDF',
        text: `Generating PDF for ${attendeeCount} attendee${attendeeCount === 1 ? '' : 's'}...`,
        current: 0,
        total: 0,
      });

      const pollStartTime = Date.now();
      const POLL_INTERVAL_MS = 3000;
      const TIMEOUT_MS = 10 * 60 * 1000;

      // Step 6: Watch for modal close (mirrors dashboard.tsx logic)
      const modalCloseWatcher = setInterval(() => {
        if (pdfPollingIntervalRef.current === null) {
          clearInterval(modalCloseWatcher);
          return;
        }
        if (!isModalVisible()) {
          stopPdfPolling();
          clearInterval(modalCloseWatcher);
        }
      }, 1000);

      // Step 3: Poll Status Endpoint every 3 seconds
      pdfPollingIntervalRef.current = setInterval(async () => {
        // Step 7: Timeout after 10 minutes
        if (Date.now() - pollStartTime >= TIMEOUT_MS) {
          stopPdfPolling();
          clearInterval(modalCloseWatcher);
          closeProgressModal();
          onTimeout();
          return;
        }

        try {
          const statusResponse = await fetch(
            `/api/attendees/pdf-job-status?jobId=${encodeURIComponent(jobId)}`
          );

          if (!statusResponse.ok) {
            return; // Non-fatal — keep polling
          }

          const statusData = await statusResponse.json();

          if (statusData.status === 'completed' && statusData.pdfUrl) {
            stopPdfPolling();
            clearInterval(modalCloseWatcher);
            closeProgressModal();
            window.open(statusData.pdfUrl, '_blank');
            onSuccess(statusData.pdfUrl, statusData.attendeeCount ?? attendeeCount);
            return;
          }

          if (statusData.status === 'failed') {
            stopPdfPolling();
            clearInterval(modalCloseWatcher);
            closeProgressModal();
            onError('job_failed:' + (statusData.error || 'PDF generation failed. Please try again.'));
            return;
          }
        } catch {
          // Keep polling on transient network errors
        }
      }, POLL_INTERVAL_MS);

    } catch (err: any) {
      stopPdfPolling();
      closeProgressModal();
      onError('start_error:' + (err.message || 'Failed to start PDF generation'));
    }
  }, [stopPdfPolling, onError, onSuccess, onTimeout, isModalVisible]);

  return { startExport, stopPdfPolling, pdfPollingIntervalRef };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Dashboard PDF Export Polling Logic', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockWindowOpen: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;
  let onSuccess: ReturnType<typeof vi.fn>;
  let onTimeout: ReturnType<typeof vi.fn>;
  let isModalVisible: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    mockWindowOpen = vi.fn();
    global.window.open = mockWindowOpen;
    onError = vi.fn();
    onSuccess = vi.fn();
    onTimeout = vi.fn();
    isModalVisible = vi.fn(() => true); // modal open by default
    mockShowProgressModal.mockReturnValue(mockUpdateProgress);
    mockCloseProgressModal.mockReset();
    mockUpdateProgress.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Successful flow (Requirements 5.1, 5.2, 5.3, 5.4)
  // -------------------------------------------------------------------------
  it('successful flow — start returns jobId, poll returns completed, window.open called', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'job-abc-123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'pending' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'completed',
          pdfUrl: 'https://cdn.example.com/output.pdf',
          attendeeCount: 5,
        }),
      });

    const { result } = renderHook(() =>
      usePdfPollingLogic({ onError, onSuccess, onTimeout, isModalVisible })
    );

    await act(async () => {
      await result.current.startExport(['a1', 'a2', 'a3', 'a4', 'a5']);
    });

    // First poll (pending)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    // Second poll (completed)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/attendees/bulk-export-pdf-start',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ attendeeIds: ['a1', 'a2', 'a3', 'a4', 'a5'] }),
      })
    );
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/attendees/pdf-job-status?jobId=job-abc-123'
    );
    expect(mockWindowOpen).toHaveBeenCalledWith('https://cdn.example.com/output.pdf', '_blank');
    expect(onSuccess).toHaveBeenCalledWith('https://cdn.example.com/output.pdf', 5);
    expect(onError).not.toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();
    expect(mockCloseProgressModal).toHaveBeenCalled();
    expect(result.current.pdfPollingIntervalRef.current).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Failed flow (Requirement 5.4)
  // -------------------------------------------------------------------------
  it('failed flow — poll returns failed with error message, error callback called', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'job-fail-456' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'failed',
          error: 'OneSimpleAPI returned error: 503 Service Unavailable',
          attendeeCount: 3,
        }),
      });

    const { result } = renderHook(() =>
      usePdfPollingLogic({ onError, onSuccess, onTimeout, isModalVisible })
    );

    await act(async () => {
      await result.current.startExport(['b1', 'b2', 'b3']);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(onError).toHaveBeenCalledWith(
      'job_failed:OneSimpleAPI returned error: 503 Service Unavailable'
    );
    expect(onSuccess).not.toHaveBeenCalled();
    expect(mockWindowOpen).not.toHaveBeenCalled();
    expect(mockCloseProgressModal).toHaveBeenCalled();
    expect(result.current.pdfPollingIntervalRef.current).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Timeout after 10 minutes (Requirement 7.4)
  // -------------------------------------------------------------------------
  it('timeout — after 10 minutes of polling, polling stops and timeout callback called', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'job-timeout-789' }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'pending' }),
      });

    const { result } = renderHook(() =>
      usePdfPollingLogic({ onError, onSuccess, onTimeout, isModalVisible })
    );

    await act(async () => {
      await result.current.startExport(['c1']);
    });

    // Advance past 10 minutes — triggers timeout on the next poll tick
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000 + 3000);
    });

    expect(onTimeout).toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(mockCloseProgressModal).toHaveBeenCalled();
    expect(result.current.pdfPollingIntervalRef.current).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Validation error — missing credentials (Requirement 5.7)
  // -------------------------------------------------------------------------
  it('validation error — missing credentials dialog shown', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Some attendees are missing credentials',
        errorType: 'missing_credentials',
        attendeesWithoutCredentials: ['Alice Smith', 'Bob Jones'],
      }),
    });

    const { result } = renderHook(() =>
      usePdfPollingLogic({ onError, onSuccess, onTimeout, isModalVisible })
    );

    await act(async () => {
      await result.current.startExport(['d1', 'd2']);
    });

    expect(onError).toHaveBeenCalledWith(expect.stringContaining('missing_credentials:'));
    expect(onError.mock.calls[0][0]).toContain('Alice Smith');
    expect(onError.mock.calls[0][0]).toContain('Bob Jones');
    expect(result.current.pdfPollingIntervalRef.current).toBeNull();
    expect(mockWindowOpen).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Validation error — outdated credentials (Requirement 5.7)
  // -------------------------------------------------------------------------
  it('validation error — outdated credentials dialog shown', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Some attendees have outdated credentials',
        errorType: 'outdated_credentials',
        attendeesWithOutdatedCredentials: ['Carol White', 'Dave Brown'],
      }),
    });

    const { result } = renderHook(() =>
      usePdfPollingLogic({ onError, onSuccess, onTimeout, isModalVisible })
    );

    await act(async () => {
      await result.current.startExport(['e1', 'e2']);
    });

    expect(onError).toHaveBeenCalledWith(expect.stringContaining('outdated_credentials:'));
    expect(onError.mock.calls[0][0]).toContain('Carol White');
    expect(onError.mock.calls[0][0]).toContain('Dave Brown');
    expect(result.current.pdfPollingIntervalRef.current).toBeNull();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Modal close stops polling (Requirement 5.6)
  // -------------------------------------------------------------------------
  it('modal close stops polling — isModalVisible() returns false, polling stops', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'job-modal-close' }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'pending' }),
      });

    // Modal starts open
    isModalVisible.mockReturnValue(true);

    const { result } = renderHook(() =>
      usePdfPollingLogic({ onError, onSuccess, onTimeout, isModalVisible })
    );

    await act(async () => {
      await result.current.startExport(['f1', 'f2']);
    });

    // First poll — pending, modal still open
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(result.current.pdfPollingIntervalRef.current).not.toBeNull();

    // User closes the modal
    isModalVisible.mockReturnValue(false);

    // Modal close watcher fires (1-second interval)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.pdfPollingIntervalRef.current).toBeNull();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Progress modal shown with correct attendee count (Requirement 5.5)
  // -------------------------------------------------------------------------
  it('shows progress modal with correct attendee count after receiving jobId', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'job-progress-test' }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'pending' }),
      });

    const { result } = renderHook(() =>
      usePdfPollingLogic({ onError, onSuccess, onTimeout, isModalVisible })
    );

    await act(async () => {
      await result.current.startExport(['g1', 'g2', 'g3']);
    });

    expect(mockShowProgressModal).toHaveBeenCalled();
    expect(mockUpdateProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Generating PDF',
        text: expect.stringContaining('3 attendees'),
      })
    );

    result.current.stopPdfPolling();
  });

  // -------------------------------------------------------------------------
  // Non-OK status poll is non-fatal (keeps polling)
  // -------------------------------------------------------------------------
  it('non-OK status poll response is non-fatal — polling continues until success', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'job-retry' }),
      })
      .mockResolvedValueOnce({ ok: false }) // first poll: network hiccup
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'completed',
          pdfUrl: 'https://cdn.example.com/retry.pdf',
          attendeeCount: 1,
        }),
      });

    const { result } = renderHook(() =>
      usePdfPollingLogic({ onError, onSuccess, onTimeout, isModalVisible })
    );

    await act(async () => {
      await result.current.startExport(['h1']);
    });

    // First poll — non-OK, keep polling
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.pdfPollingIntervalRef.current).not.toBeNull();

    // Second poll — completed
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(onSuccess).toHaveBeenCalledWith('https://cdn.example.com/retry.pdf', 1);
    expect(result.current.pdfPollingIntervalRef.current).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Start Endpoint generic error
  // -------------------------------------------------------------------------
  it('start endpoint generic error — error callback called, no polling started', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Internal server error' }),
    });

    const { result } = renderHook(() =>
      usePdfPollingLogic({ onError, onSuccess, onTimeout, isModalVisible })
    );

    await act(async () => {
      await result.current.startExport(['i1']);
    });

    expect(onError).toHaveBeenCalledWith(expect.stringContaining('Internal server error'));
    expect(result.current.pdfPollingIntervalRef.current).toBeNull();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Polling does not time out before 10 minutes
  // -------------------------------------------------------------------------
  it('polling does not time out before 10 minutes have elapsed', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'job-boundary' }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'processing' }),
      });

    const { result } = renderHook(() =>
      usePdfPollingLogic({ onError, onSuccess, onTimeout, isModalVisible })
    );

    await act(async () => {
      await result.current.startExport(['j1']);
    });

    // Advance just under 10 minutes (9 min 57 sec)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9 * 60 * 1000 + 57 * 1000);
    });

    expect(onTimeout).not.toHaveBeenCalled();
    expect(result.current.pdfPollingIntervalRef.current).not.toBeNull();

    result.current.stopPdfPolling();
  });
});
