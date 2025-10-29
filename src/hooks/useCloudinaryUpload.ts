import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { FORM_LIMITS, CLOUDINARY_CONFIG } from '@/constants/formLimits';
import type {
  CloudinaryWidget,
  CloudinaryInstance,
  CloudinaryWidgetConfig,
  CloudinaryUploadResult,
  CloudinaryError
} from '@/types/cloudinary';

interface EventSettings {
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
  cloudinaryCropAspectRatio?: string;
  cloudinaryDisableSkipCrop?: boolean;
}

interface UseCloudinaryUploadProps {
  eventSettings?: EventSettings;
  onUploadSuccess: (url: string) => void;
}

/**
 * Custom hook for managing Cloudinary photo upload widget
 * 
 * Handles Cloudinary widget initialization, configuration, and upload callbacks.
 * Memoizes widget configuration to prevent unnecessary recreations.
 * 
 * @param {UseCloudinaryUploadProps} props - Hook configuration
 * @param {EventSettings} [props.eventSettings] - Event settings with Cloudinary config
 * @param {Function} props.onUploadSuccess - Callback when upload succeeds with photo URL
 * 
 * @returns {Object} Upload widget state and controls
 * @returns {boolean} isCloudinaryOpen - Whether the upload widget is currently open
 * @returns {Function} openUploadWidget - Opens the Cloudinary upload widget
 * 
 * @throws {Error} If Cloudinary is not configured in event settings
 * 
 * @remarks
 * - Widget configuration is memoized for performance
 * - Automatically destroys widget on unmount to prevent memory leaks
 * - Handles upload success and error states
 * - Sets isCloudinaryOpen flag to prevent dialog closure during upload
 * 
 * @example
 * ```typescript
 * const { isCloudinaryOpen, openUploadWidget } = useCloudinaryUpload({
 *   eventSettings,
 *   onUploadSuccess: (url) => setPhotoUrl(url)
 * });
 * ```
 */
export function useCloudinaryUpload({ eventSettings, onUploadSuccess }: UseCloudinaryUploadProps) {
  const { success, error } = useSweetAlert();
  const [isCloudinaryOpen, setIsCloudinaryOpen] = useState(false);
  const cloudinaryRef = useRef<CloudinaryInstance | null>(null);
  const widgetRef = useRef<CloudinaryWidget | null>(null);

  // Memoize widget configuration to prevent unnecessary recreations
  const widgetConfig = useMemo(() => {
    if (!eventSettings?.cloudinaryCloudName || !eventSettings?.cloudinaryUploadPreset) {
      return null;
    }

    let croppingAspectRatio = CLOUDINARY_CONFIG.DEFAULT_CROP_ASPECT_RATIO;
    if (eventSettings.cloudinaryCropAspectRatio && eventSettings.cloudinaryCropAspectRatio !== 'free') {
      croppingAspectRatio = parseFloat(eventSettings.cloudinaryCropAspectRatio);
    }

    const config: CloudinaryWidgetConfig = {
      cloudName: eventSettings.cloudinaryCloudName,
      uploadPreset: eventSettings.cloudinaryUploadPreset,
      sources: [...CLOUDINARY_CONFIG.SOURCES],
      defaultSource: CLOUDINARY_CONFIG.DEFAULT_SOURCE,
      multiple: false,
      cropping: true,
      croppingShowDimensions: true,
      croppingCoordinatesMode: 'custom',
      showSkipCropButton: !eventSettings.cloudinaryDisableSkipCrop,
      folder: CLOUDINARY_CONFIG.FOLDER,
      clientAllowedFormats: [...FORM_LIMITS.PHOTO_ALLOWED_FORMATS],
      maxFileSize: FORM_LIMITS.PHOTO_MAX_FILE_SIZE,
      maxImageWidth: FORM_LIMITS.PHOTO_MAX_DIMENSION,
      maxImageHeight: FORM_LIMITS.PHOTO_MAX_DIMENSION,
      theme: CLOUDINARY_CONFIG.THEME,
      styles: {
        palette: CLOUDINARY_CONFIG.PALETTE
      },
      showAdvancedOptions: false,
      showPoweredBy: false
    };

    if (eventSettings.cloudinaryCropAspectRatio !== 'free') {
      config.croppingAspectRatio = croppingAspectRatio;
    }

    if (eventSettings.cloudinaryDisableSkipCrop) {
      config.croppingValidateMinSize = true;
    }

    return config;
  }, [
    eventSettings?.cloudinaryCloudName,
    eventSettings?.cloudinaryUploadPreset,
    eventSettings?.cloudinaryCropAspectRatio,
    eventSettings?.cloudinaryDisableSkipCrop
  ]);

  // Memoize upload callback to prevent widget recreation
  const handleUploadCallback = useCallback((
    uploadError: CloudinaryError | null,
    result: CloudinaryUploadResult
  ) => {
    setIsCloudinaryOpen(false);
    if (!uploadError && result && result.event === 'success' && result.info) {
      onUploadSuccess(result.info.secure_url);
      success("Success", "Photo uploaded successfully!");
    } else if (uploadError) {
      if (result && result.event !== 'close') {
        error("Upload Error", uploadError.message || "Failed to upload photo");
      }
    }
  }, [onUploadSuccess, success, error]);

  // Create widget only when config changes
  useEffect(() => {
    if (!widgetConfig || typeof window === 'undefined' || !window.cloudinary) {
      return;
    }

    // Destroy previous widget if it exists
    if (widgetRef.current) {
      widgetRef.current.destroy();
    }

    cloudinaryRef.current = window.cloudinary;
    widgetRef.current = cloudinaryRef.current.createUploadWidget(
      widgetConfig,
      handleUploadCallback
    );

    // Cleanup on unmount or config change
    return () => {
      if (widgetRef.current) {
        widgetRef.current.destroy();
        widgetRef.current = null;
      }
    };
  }, [widgetConfig, handleUploadCallback]);

  const openUploadWidget = () => {
    if (!eventSettings?.cloudinaryCloudName || !eventSettings?.cloudinaryUploadPreset) {
      error("Error", "Cloudinary not configured. Please check event settings.");
      return;
    }

    if (widgetRef.current) {
      setIsCloudinaryOpen(true);
      widgetRef.current.open();
    } else {
      error("Error", "Cloudinary widget not initialized. Please refresh the page.");
    }
  };

  return {
    isCloudinaryOpen,
    openUploadWidget
  };
}
