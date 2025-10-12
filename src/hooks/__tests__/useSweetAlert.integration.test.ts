import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSweetAlert } from '../useSweetAlert';
import Swal from 'sweetalert2';

// Mock sweetalert2 with more realistic behavior
vi.mock('sweetalert2', () => {
  let currentAlert: any = null;
  
  return {
    default: {
      fire: vi.fn((config: any) => {
        currentAlert = config;
        return Promise.resolve({ 
          isConfirmed: true,
          isDismissed: false,
          value: true,
        });
      }),
      close: vi.fn(() => {
        currentAlert = null;
      }),
      showLoading: vi.fn(),
      isVisible: vi.fn(() => currentAlert !== null),
      getTimerLeft: vi.fn(() => 2000),
    },
  };
});

vi.mock('@/lib/sweetalert-config', () => ({
  defaultSweetAlertConfig: {
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timerProgressBar: true,
  },
  getSweetAlertTheme: vi.fn(() => ({
    popup: 'test-popup',
    title: 'test-title',
  })),
}));

describe('useSweetAlert Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.className = '';
  });

  afterEach(() => {
    document.documentElement.className = '';
  });

  describe('Notification Display and Auto-dismiss', () => {
    it('should display notification with default 3000ms timer', async () => {
      const { result } = renderHook(() => useSweetAlert());
      
      await act(async () => {
        await result.current.success('Test Success');
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          timer: 3000,
          timerProgressBar: true,
        })
      );
    });

    it('should display notification with custom timer', async () => {
      const { result } = renderHook(() => useSweetAlert());
      
      await act(async () => {
        await result.current.toast({
          title: 'Custom Timer',
          duration: 5000,
        });
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          timer: 5000,
        })
      );
    });

    it('should show timer progress bar', async () => {
      const { result } = renderHook(() => useSweetAlert());
      
      await act(async () => {
        await result.current.info('With Progress');
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          timerProgressBar: true,
        })
      );
    });
  });

  describe('Confirmation Dialog Flows', () => {
    it('should handle confirm flow - user accepts', async () => {
      vi.mocked(Swal.fire).mockResolvedValueOnce({ 
        isConfirmed: true,
        isDismissed: false,
      } as any);

      const { result } = renderHook(() => useSweetAlert());
      
      let confirmed = false;
      await act(async () => {
        confirmed = await result.current.confirm({
          title: 'Delete Item?',
          text: 'This action cannot be undone',
        });
      });

      expect(confirmed).toBe(true);
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Delete Item?',
          text: 'This action cannot be undone',
          showCancelButton: true,
        })
      );
    });

    it('should handle confirm flow - user rejects', async () => {
      vi.mocked(Swal.fire).mockResolvedValueOnce({ 
        isConfirmed: false,
        isDismissed: true,
      } as any);

      const { result } = renderHook(() => useSweetAlert());
      
      let confirmed = true;
      await act(async () => {
        confirmed = await result.current.confirm({
          title: 'Delete Item?',
        });
      });

      expect(confirmed).toBe(false);
    });

    it('should handle confirm with custom buttons', async () => {
      const { result } = renderHook(() => useSweetAlert());
      
      await act(async () => {
        await result.current.confirm({
          title: 'Proceed?',
          confirmButtonText: 'Yes, proceed',
          cancelButtonText: 'No, cancel',
        });
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          confirmButtonText: 'Yes, proceed',
          cancelButtonText: 'No, cancel',
        })
      );
    });
  });

  describe('Loading State Transitions', () => {
    it('should show loading state', async () => {
      const { result } = renderHook(() => useSweetAlert());
      
      await act(async () => {
        await result.current.loading({
          title: 'Processing...',
          text: 'Please wait',
        });
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Processing...',
          text: 'Please wait',
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
        })
      );
    });

    it('should transition from loading to success', async () => {
      const { result } = renderHook(() => useSweetAlert());
      
      // Show loading
      await act(async () => {
        await result.current.loading({
          title: 'Saving...',
        });
      });

      expect(Swal.fire).toHaveBeenCalledTimes(1);

      // Close loading and show success
      await act(async () => {
        result.current.close();
        await result.current.success('Saved successfully!');
      });

      expect(Swal.close).toHaveBeenCalled();
      expect(Swal.fire).toHaveBeenCalledTimes(2);
      expect(Swal.fire).toHaveBeenLastCalledWith(
        expect.objectContaining({
          icon: 'success',
          title: 'Saved successfully!',
        })
      );
    });

    it('should transition from loading to error', async () => {
      const { result } = renderHook(() => useSweetAlert());
      
      // Show loading
      await act(async () => {
        await result.current.loading({
          title: 'Deleting...',
        });
      });

      // Close loading and show error
      await act(async () => {
        result.current.close();
        await result.current.error('Delete failed', 'Please try again');
      });

      expect(Swal.close).toHaveBeenCalled();
      expect(Swal.fire).toHaveBeenLastCalledWith(
        expect.objectContaining({
          icon: 'error',
          title: 'Delete failed',
          html: 'Please try again',
        })
      );
    });

    it('should allow manual dismissal of loading state', async () => {
      const { result } = renderHook(() => useSweetAlert());
      
      await act(async () => {
        await result.current.loading({
          title: 'Loading...',
        });
      });

      act(() => {
        result.current.close();
      });

      expect(Swal.close).toHaveBeenCalled();
    });
  });

  describe('Multiple Notifications in Sequence', () => {
    it('should handle multiple notifications one after another', async () => {
      const { result } = renderHook(() => useSweetAlert());
      
      await act(async () => {
        await result.current.success('First notification');
      });

      await act(async () => {
        await result.current.info('Second notification');
      });

      await act(async () => {
        await result.current.warning('Third notification');
      });

      expect(Swal.fire).toHaveBeenCalledTimes(3);
    });

    it('should handle rapid successive notifications', async () => {
      const { result } = renderHook(() => useSweetAlert());
      
      await act(async () => {
        result.current.success('Notification 1');
        result.current.info('Notification 2');
        result.current.warning('Notification 3');
      });

      // All three should be called
      expect(Swal.fire).toHaveBeenCalledTimes(3);
    });

    it('should handle notification after confirmation', async () => {
      vi.mocked(Swal.fire).mockResolvedValueOnce({ 
        isConfirmed: true,
      } as any);

      const { result } = renderHook(() => useSweetAlert());
      
      // Show confirmation
      let confirmed = false;
      await act(async () => {
        confirmed = await result.current.confirm({
          title: 'Confirm action?',
        });
      });

      expect(confirmed).toBe(true);

      // Show success notification after confirmation
      await act(async () => {
        await result.current.success('Action completed!');
      });

      expect(Swal.fire).toHaveBeenCalledTimes(2);
    });
  });

  describe('Custom Options Override', () => {
    it('should allow overriding default duration', async () => {
      const { result } = renderHook(() => useSweetAlert());
      
      await act(async () => {
        await result.current.toast({
          title: 'Quick message',
          duration: 1000,
        });
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          timer: 1000,
        })
      );
    });

    it('should support action button with custom handler', async () => {
      const { result } = renderHook(() => useSweetAlert());
      const actionHandler = vi.fn();
      
      await act(async () => {
        await result.current.toast({
          title: 'Action notification',
          action: {
            label: 'Undo',
            onClick: actionHandler,
          },
        });
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Action notification',
          didOpen: expect.any(Function),
        })
      );
    });

    it('should support all notification variants', async () => {
      const { result } = renderHook(() => useSweetAlert());
      
      const variants = ['success', 'error', 'warning', 'info', 'destructive'] as const;
      
      for (const variant of variants) {
        await act(async () => {
          await result.current.toast({
            title: `${variant} notification`,
            variant,
          });
        });
      }

      expect(Swal.fire).toHaveBeenCalledTimes(variants.length);
    });

    it('should support notification without icon', async () => {
      const { result } = renderHook(() => useSweetAlert());
      
      await act(async () => {
        await result.current.toast({
          title: 'Plain notification',
          variant: 'default',
        });
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: undefined,
        })
      );
    });
  });

  describe('Complex Workflows', () => {
    it('should handle complete CRUD workflow', async () => {
      vi.mocked(Swal.fire)
        .mockResolvedValueOnce({ isConfirmed: true } as any) // Confirm delete
        .mockResolvedValueOnce({} as any); // Success notification

      const { result } = renderHook(() => useSweetAlert());
      
      // Step 1: Show loading
      await act(async () => {
        await result.current.loading({ title: 'Loading data...' });
      });

      // Step 2: Close loading and show data loaded
      await act(async () => {
        result.current.close();
        await result.current.success('Data loaded');
      });

      // Step 3: Confirm delete
      let confirmed = false;
      await act(async () => {
        confirmed = await result.current.confirm({
          title: 'Delete item?',
        });
      });

      expect(confirmed).toBe(true);

      // Step 4: Show loading for delete
      await act(async () => {
        await result.current.loading({ title: 'Deleting...' });
      });

      // Step 5: Show success
      await act(async () => {
        result.current.close();
        await result.current.success('Deleted successfully');
      });

      expect(Swal.fire).toHaveBeenCalledTimes(5);
      expect(Swal.close).toHaveBeenCalledTimes(2);
    });

    it('should handle error recovery workflow', async () => {
      const { result } = renderHook(() => useSweetAlert());
      
      // Show loading
      await act(async () => {
        await result.current.loading({ title: 'Saving...' });
      });

      // Show error
      await act(async () => {
        result.current.close();
        await result.current.error('Save failed', 'Network error');
      });

      // Retry - show loading again
      await act(async () => {
        await result.current.loading({ title: 'Retrying...' });
      });

      // Show success
      await act(async () => {
        result.current.close();
        await result.current.success('Saved successfully');
      });

      expect(Swal.fire).toHaveBeenCalledTimes(4);
    });
  });

  describe('Theme Reactivity', () => {
    it('should update notifications when theme changes', async () => {
      const { result } = renderHook(() => useSweetAlert());
      
      // Show notification in light mode
      await act(async () => {
        await result.current.info('Light mode');
      });

      // Switch to dark mode
      act(() => {
        document.documentElement.classList.add('dark');
      });

      // Wait for theme detection
      await waitFor(() => {
        act(() => {
          result.current.info('Dark mode');
        });
      });

      expect(Swal.fire).toHaveBeenCalledTimes(2);
    });
  });
});
