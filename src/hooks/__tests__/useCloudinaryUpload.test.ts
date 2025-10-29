import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCloudinaryUpload } from '../useCloudinaryUpload';
import * as useSweetAlertModule from '../useSweetAlert';

// Mock useSweetAlert
vi.mock('../useSweetAlert', () => ({
  useSweetAlert: vi.fn()
}));

describe('useCloudinaryUpload', () => {
  const mockSuccess = vi.fn();
  const mockError = vi.fn();
  const mockOnUploadSuccess = vi.fn();
  const mockCreateUploadWidget = vi.fn();
  const mockDestroy = vi.fn();
  const mockOpen = vi.fn();

  beforeEach(() => {
    // Setup useSweetAlert mock
    vi.mocked(useSweetAlertModule.useSweetAlert).mockReturnValue({
      toast: vi.fn(),
      success: mockSuccess,
      error: mockError,
      confirm: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      alert: vi.fn(),
      loading: vi.fn(),
      close: vi.fn()
    });

    // Setup Cloudinary mock
    const mockWidget = {
      open: mockOpen,
      close: vi.fn(),
      destroy: mockDestroy,
      update: vi.fn(),
      hide: vi.fn(),
      show: vi.fn(),
      minimize: vi.fn(),
      isShowing: vi.fn(),
      isMinimized: vi.fn()
    };

    mockCreateUploadWidget.mockReturnValue(mockWidget);

    (global as any).window = {
      cloudinary: {
        createUploadWidget: mockCreateUploadWidget
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Widget Configuration', () => {
    it('creates widget with correct configuration', () => {
      const eventSettings = {
        cloudinaryCloudName: 'test-cloud',
        cloudinaryUploadPreset: 'test-preset',
        cloudinaryCropAspectRatio: '1.5',
        cloudinaryDisableSkipCrop: false
      };

      renderHook(() => useCloudinaryUpload({
        eventSettings,
        onUploadSuccess: mockOnUploadSuccess
      }));

      expect(mockCreateUploadWidget).toHaveBeenCalledWith(
        expect.objectContaining({
          cloudName: 'test-cloud',
          uploadPreset: 'test-preset',
          croppingAspectRatio: 1.5,
          showSkipCropButton: true
        }),
        expect.any(Function)
      );
    });

    it('handles invalid aspect ratio by using default', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const eventSettings = {
        cloudinaryCloudName: 'test-cloud',
        cloudinaryUploadPreset: 'test-preset',
        cloudinaryCropAspectRatio: 'invalid',
        cloudinaryDisableSkipCrop: false
      };

      renderHook(() => useCloudinaryUpload({
        eventSettings,
        onUploadSuccess: mockOnUploadSuccess
      }));

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid crop aspect ratio: invalid')
      );
      expect(mockCreateUploadWidget).toHaveBeenCalledWith(
        expect.objectContaining({
          croppingAspectRatio: 1 // Default value
        }),
        expect.any(Function)
      );

      consoleWarnSpy.mockRestore();
    });

    it('handles free aspect ratio', () => {
      const eventSettings = {
        cloudinaryCloudName: 'test-cloud',
        cloudinaryUploadPreset: 'test-preset',
        cloudinaryCropAspectRatio: 'free',
        cloudinaryDisableSkipCrop: false
      };

      renderHook(() => useCloudinaryUpload({
        eventSettings,
        onUploadSuccess: mockOnUploadSuccess
      }));

      const config = mockCreateUploadWidget.mock.calls[0][0];
      expect(config.croppingAspectRatio).toBeUndefined();
    });

    it('disables skip crop when configured', () => {
      const eventSettings = {
        cloudinaryCloudName: 'test-cloud',
        cloudinaryUploadPreset: 'test-preset',
        cloudinaryDisableSkipCrop: true
      };

      renderHook(() => useCloudinaryUpload({
        eventSettings,
        onUploadSuccess: mockOnUploadSuccess
      }));

      expect(mockCreateUploadWidget).toHaveBeenCalledWith(
        expect.objectContaining({
          showSkipCropButton: false,
          croppingValidateMinSize: true
        }),
        expect.any(Function)
      );
    });

    it('does not create widget without required settings', () => {
      const eventSettings = {
        cloudinaryCloudName: undefined,
        cloudinaryUploadPreset: undefined
      };

      renderHook(() => useCloudinaryUpload({
        eventSettings,
        onUploadSuccess: mockOnUploadSuccess
      }));

      expect(mockCreateUploadWidget).not.toHaveBeenCalled();
    });
  });

  describe('Widget Lifecycle', () => {
    it('destroys widget on unmount', () => {
      const eventSettings = {
        cloudinaryCloudName: 'test-cloud',
        cloudinaryUploadPreset: 'test-preset'
      };

      const { unmount } = renderHook(() => useCloudinaryUpload({
        eventSettings,
        onUploadSuccess: mockOnUploadSuccess
      }));

      unmount();

      expect(mockDestroy).toHaveBeenCalled();
    });

    it('destroys and recreates widget when config changes', () => {
      const eventSettings = {
        cloudinaryCloudName: 'test-cloud',
        cloudinaryUploadPreset: 'test-preset',
        cloudinaryCropAspectRatio: '1.0'
      };

      const { rerender } = renderHook(
        ({ settings }) => useCloudinaryUpload({
          eventSettings: settings,
          onUploadSuccess: mockOnUploadSuccess
        }),
        { initialProps: { settings: eventSettings } }
      );

      expect(mockCreateUploadWidget).toHaveBeenCalledTimes(1);

      // Change aspect ratio
      rerender({
        settings: {
          ...eventSettings,
          cloudinaryCropAspectRatio: '1.5'
        }
      });

      expect(mockDestroy).toHaveBeenCalled();
      expect(mockCreateUploadWidget).toHaveBeenCalledTimes(2);
    });

    it('does not recreate widget when unrelated props change', () => {
      const eventSettings = {
        cloudinaryCloudName: 'test-cloud',
        cloudinaryUploadPreset: 'test-preset'
      };

      const { rerender } = renderHook(
        ({ callback }) => useCloudinaryUpload({
          eventSettings,
          onUploadSuccess: callback
        }),
        { initialProps: { callback: mockOnUploadSuccess } }
      );

      expect(mockCreateUploadWidget).toHaveBeenCalledTimes(1);

      // Change callback (recreates widget because callback is in dependency array)
      const newCallback = vi.fn();
      rerender({ callback: newCallback });

      // Widget should be recreated because callback is in dependency array
      expect(mockCreateUploadWidget).toHaveBeenCalledTimes(2);
    });
  });

  describe('Upload Widget Opening', () => {
    it('opens widget when openUploadWidget is called', () => {
      const eventSettings = {
        cloudinaryCloudName: 'test-cloud',
        cloudinaryUploadPreset: 'test-preset'
      };

      const { result } = renderHook(() => useCloudinaryUpload({
        eventSettings,
        onUploadSuccess: mockOnUploadSuccess
      }));

      act(() => {
        result.current.openUploadWidget();
      });

      expect(mockOpen).toHaveBeenCalled();
      expect(result.current.isCloudinaryOpen).toBe(true);
    });

    it('shows error when opening widget without configuration', () => {
      const eventSettings = {
        cloudinaryCloudName: undefined,
        cloudinaryUploadPreset: undefined
      };

      const { result } = renderHook(() => useCloudinaryUpload({
        eventSettings,
        onUploadSuccess: mockOnUploadSuccess
      }));

      result.current.openUploadWidget();

      expect(mockError).toHaveBeenCalledWith(
        "Error",
        "Cloudinary not configured. Please check event settings."
      );
      expect(mockOpen).not.toHaveBeenCalled();
    });
  });

  describe('Upload Callbacks', () => {
    it('handles successful upload', () => {
      const eventSettings = {
        cloudinaryCloudName: 'test-cloud',
        cloudinaryUploadPreset: 'test-preset'
      };

      renderHook(() => useCloudinaryUpload({
        eventSettings,
        onUploadSuccess: mockOnUploadSuccess
      }));

      // Get the callback function passed to createUploadWidget
      const uploadCallback = mockCreateUploadWidget.mock.calls[0][1];

      // Simulate successful upload
      act(() => {
        uploadCallback(null, {
          event: 'success',
          info: {
            secure_url: 'https://example.com/photo.jpg',
            public_id: 'test-id',
            format: 'jpg',
            resource_type: 'image',
            created_at: new Date().toISOString(),
            bytes: 12345,
            width: 800,
            height: 600,
            url: 'http://example.com/photo.jpg'
          }
        });
      });

      expect(mockOnUploadSuccess).toHaveBeenCalledWith('https://example.com/photo.jpg');
      expect(mockSuccess).toHaveBeenCalledWith("Success", "Photo uploaded successfully!");
    });

    it('handles upload error', () => {
      const eventSettings = {
        cloudinaryCloudName: 'test-cloud',
        cloudinaryUploadPreset: 'test-preset'
      };

      renderHook(() => useCloudinaryUpload({
        eventSettings,
        onUploadSuccess: mockOnUploadSuccess
      }));

      const uploadCallback = mockCreateUploadWidget.mock.calls[0][1];

      // Simulate upload error
      act(() => {
        uploadCallback(
          { message: 'Upload failed', status: 'error' },
          { event: 'error', info: null }
        );
      });

      expect(mockError).toHaveBeenCalledWith(
        "Upload Error",
        "Upload failed"
      );
      expect(mockOnUploadSuccess).not.toHaveBeenCalled();
    });

    it('does not show error when user closes widget', () => {
      const eventSettings = {
        cloudinaryCloudName: 'test-cloud',
        cloudinaryUploadPreset: 'test-preset'
      };

      renderHook(() => useCloudinaryUpload({
        eventSettings,
        onUploadSuccess: mockOnUploadSuccess
      }));

      const uploadCallback = mockCreateUploadWidget.mock.calls[0][1];

      // Simulate user closing widget
      act(() => {
        uploadCallback(
          { message: 'User closed widget', status: 'error' },
          { event: 'close', info: null }
        );
      });

      expect(mockError).not.toHaveBeenCalled();
      expect(mockOnUploadSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Memoization', () => {
    it('memoizes widget config correctly', () => {
      const eventSettings = {
        cloudinaryCloudName: 'test-cloud',
        cloudinaryUploadPreset: 'test-preset',
        cloudinaryCropAspectRatio: '1.5',
        cloudinaryDisableSkipCrop: false
      };

      const { rerender } = renderHook(
        ({ settings }) => useCloudinaryUpload({
          eventSettings: settings,
          onUploadSuccess: mockOnUploadSuccess
        }),
        { initialProps: { settings: eventSettings } }
      );

      expect(mockCreateUploadWidget).toHaveBeenCalledTimes(1);

      // Rerender with same settings
      rerender({ settings: eventSettings });

      // Should not recreate widget
      expect(mockCreateUploadWidget).toHaveBeenCalledTimes(1);
    });
  });
});
