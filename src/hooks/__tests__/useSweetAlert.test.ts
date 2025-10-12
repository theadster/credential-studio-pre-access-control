import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSweetAlert } from '../useSweetAlert';
import Swal from 'sweetalert2';

// Mock sweetalert2
vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
    close: vi.fn(),
    showLoading: vi.fn(),
  },
}));

// Mock sweetalert-config
vi.mock('@/lib/sweetalert-config', () => ({
  defaultSweetAlertConfig: {
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timerProgressBar: true,
  },
  getSweetAlertTheme: vi.fn((isDark: boolean) => ({
    popup: isDark ? 'dark-popup' : 'light-popup',
    title: isDark ? 'dark-title' : 'light-title',
  })),
}));

describe('useSweetAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup DOM for dark mode detection
    document.documentElement.className = '';
  });

  afterEach(() => {
    document.documentElement.className = '';
  });

  describe('Theme Detection', () => {
    it('should detect light mode by default', () => {
      const { result } = renderHook(() => useSweetAlert());
      
      act(() => {
        result.current.success('Test');
      });

      expect(Swal.fire).toHaveBeenCalled();
    });

    it('should detect dark mode when dark class is present', async () => {
      document.documentElement.classList.add('dark');
      
      const { result } = renderHook(() => useSweetAlert());
      
      await waitFor(() => {
        act(() => {
          result.current.success('Test');
        });
      });

      expect(Swal.fire).toHaveBeenCalled();
    });

    it('should update theme when class changes', async () => {
      const { result } = renderHook(() => useSweetAlert());
      
      // Start in light mode
      act(() => {
        result.current.success('Test Light');
      });

      // Switch to dark mode
      act(() => {
        document.documentElement.classList.add('dark');
      });

      await waitFor(() => {
        act(() => {
          result.current.success('Test Dark');
        });
      });

      expect(Swal.fire).toHaveBeenCalledTimes(2);
    });
  });

  describe('showSuccess method', () => {
    it('should call Swal.fire with success icon and title', () => {
      const { result } = renderHook(() => useSweetAlert());
      
      act(() => {
        result.current.success('Success Title');
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'success',
          title: 'Success Title',
          timer: 3000,
        })
      );
    });

    it('should include description when provided', () => {
      const { result } = renderHook(() => useSweetAlert());
      
      act(() => {
        result.current.success('Success Title', 'Success Description');
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'success',
          title: 'Success Title',
          html: 'Success Description',
        })
      );
    });

    it('should use default timer of 3000ms', () => {
      const { result } = renderHook(() => useSweetAlert());
      
      act(() => {
        result.current.success('Test');
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          timer: 3000,
        })
      );
    });
  });

  describe('showError method', () => {
    it('should call Swal.fire with error icon and title', () => {
      const { result } = renderHook(() => useSweetAlert());
      
      act(() => {
        result.current.error('Error Title');
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'error',
          title: 'Error Title',
          timer: 3000,
        })
      );
    });

    it('should include description when provided', () => {
      const { result } = renderHook(() => useSweetAlert());
      
      act(() => {
        result.current.error('Error Title', 'Error Description');
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'error',
          title: 'Error Title',
          html: 'Error Description',
        })
      );
    });
  });

  describe('showWarning method', () => {
    it('should call Swal.fire with warning icon and title', () => {
      const { result } = renderHook(() => useSweetAlert());
      
      act(() => {
        result.current.warning('Warning Title');
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'warning',
          title: 'Warning Title',
          timer: 3000,
        })
      );
    });

    it('should include description when provided', () => {
      const { result } = renderHook(() => useSweetAlert());
      
      act(() => {
        result.current.warning('Warning Title', 'Warning Description');
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'warning',
          title: 'Warning Title',
          html: 'Warning Description',
        })
      );
    });
  });

  describe('showInfo method', () => {
    it('should call Swal.fire with info icon and title', () => {
      const { result } = renderHook(() => useSweetAlert());
      
      act(() => {
        result.current.info('Info Title');
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'info',
          title: 'Info Title',
          timer: 3000,
        })
      );
    });

    it('should include description when provided', () => {
      const { result } = renderHook(() => useSweetAlert());
      
      act(() => {
        result.current.info('Info Title', 'Info Description');
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'info',
          title: 'Info Title',
          html: 'Info Description',
        })
      );
    });
  });

  describe('toast method with custom options', () => {
    it('should support custom duration', () => {
      const { result } = renderHook(() => useSweetAlert());
      
      act(() => {
        result.current.toast({
          title: 'Custom Duration',
          duration: 5000,
        });
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          timer: 5000,
        })
      );
    });

    it('should support destructive variant', () => {
      const { result } = renderHook(() => useSweetAlert());
      
      act(() => {
        result.current.toast({
          title: 'Destructive',
          variant: 'destructive',
        });
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'error',
        })
      );
    });

    it('should support default variant with no icon', () => {
      const { result } = renderHook(() => useSweetAlert());
      
      act(() => {
        result.current.toast({
          title: 'Default',
          variant: 'default',
        });
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: undefined,
        })
      );
    });

    it('should support action button', () => {
      const { result } = renderHook(() => useSweetAlert());
      const actionMock = vi.fn();
      
      act(() => {
        result.current.toast({
          title: 'With Action',
          action: {
            label: 'Click Me',
            onClick: actionMock,
          },
        });
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'With Action',
          didOpen: expect.any(Function),
        })
      );
    });
  });

  describe('showConfirm method', () => {
    it('should call Swal.fire with confirmation config', async () => {
      const { result } = renderHook(() => useSweetAlert());
      
      await act(async () => {
        await result.current.confirm({
          title: 'Confirm Action',
          text: 'Are you sure?',
        });
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Confirm Action',
          text: 'Are you sure?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Confirm',
          cancelButtonText: 'Cancel',
        })
      );
    });

    it('should return true when confirmed', async () => {
      vi.mocked(Swal.fire).mockResolvedValueOnce({ isConfirmed: true } as any);
      
      const { result } = renderHook(() => useSweetAlert());
      
      let confirmed = false;
      await act(async () => {
        confirmed = await result.current.confirm({
          title: 'Confirm',
        });
      });

      expect(confirmed).toBe(true);
    });

    it('should return false when cancelled', async () => {
      vi.mocked(Swal.fire).mockResolvedValueOnce({ isConfirmed: false } as any);
      
      const { result } = renderHook(() => useSweetAlert());
      
      let confirmed = true;
      await act(async () => {
        confirmed = await result.current.confirm({
          title: 'Confirm',
        });
      });

      expect(confirmed).toBe(false);
    });

    it('should support custom button text', async () => {
      const { result } = renderHook(() => useSweetAlert());
      
      await act(async () => {
        await result.current.confirm({
          title: 'Delete Item',
          confirmButtonText: 'Delete',
          cancelButtonText: 'Keep',
        });
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          confirmButtonText: 'Delete',
          cancelButtonText: 'Keep',
        })
      );
    });

    it('should support custom icon', async () => {
      const { result } = renderHook(() => useSweetAlert());
      
      await act(async () => {
        await result.current.confirm({
          title: 'Info Confirm',
          icon: 'info',
        });
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'info',
        })
      );
    });

    it('should support hiding cancel button', async () => {
      const { result } = renderHook(() => useSweetAlert());
      
      await act(async () => {
        await result.current.confirm({
          title: 'Acknowledge',
          showCancelButton: false,
        });
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          showCancelButton: false,
        })
      );
    });
  });

  describe('showLoading method', () => {
    it('should call Swal.fire with loading config', () => {
      const { result } = renderHook(() => useSweetAlert());
      
      act(() => {
        result.current.loading({
          title: 'Loading...',
        });
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Loading...',
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          didOpen: expect.any(Function),
        })
      );
    });

    it('should include text when provided', () => {
      const { result } = renderHook(() => useSweetAlert());
      
      act(() => {
        result.current.loading({
          title: 'Loading...',
          text: 'Please wait',
        });
      });

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Loading...',
          text: 'Please wait',
        })
      );
    });

    it('should call Swal.showLoading in didOpen', () => {
      const { result } = renderHook(() => useSweetAlert());
      
      act(() => {
        result.current.loading({
          title: 'Loading...',
        });
      });

      const callArgs = vi.mocked(Swal.fire).mock.calls[0][0];
      const didOpen = callArgs.didOpen;
      
      if (didOpen) {
        didOpen(document.createElement('div'));
        expect(Swal.showLoading).toHaveBeenCalled();
      }
    });
  });

  describe('close method', () => {
    it('should call Swal.close', () => {
      const { result } = renderHook(() => useSweetAlert());
      
      act(() => {
        result.current.close();
      });

      expect(Swal.close).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should disconnect MutationObserver on unmount', () => {
      const disconnectSpy = vi.spyOn(MutationObserver.prototype, 'disconnect');
      
      const { unmount } = renderHook(() => useSweetAlert());
      
      unmount();
      
      expect(disconnectSpy).toHaveBeenCalled();
    });
  });
});
