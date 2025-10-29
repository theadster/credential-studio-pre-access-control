/**
 * Cloudinary Widget Type Definitions
 * 
 * These types provide proper TypeScript support for the Cloudinary Upload Widget.
 * Based on Cloudinary's official widget documentation.
 */

export interface CloudinaryWidgetPalette {
  window: string;
  windowBorder: string;
  tabIcon: string;
  menuIcons: string;
  textDark: string;
  textLight: string;
  link: string;
  action: string;
  inactiveTabIcon: string;
  error: string;
  inProgress: string;
  complete: string;
  sourceBg: string;
}

export interface CloudinaryWidgetStyles {
  palette: CloudinaryWidgetPalette;
}

export interface CloudinaryWidgetConfig {
  cloudName: string;
  uploadPreset: string;
  sources: string[];
  defaultSource: string;
  multiple: boolean;
  cropping: boolean;
  croppingShowDimensions: boolean;
  croppingCoordinatesMode: string;
  croppingAspectRatio?: number;
  showSkipCropButton: boolean;
  croppingValidateMinSize?: boolean;
  folder: string;
  clientAllowedFormats: string[];
  maxFileSize: number;
  maxImageWidth: number;
  maxImageHeight: number;
  theme: string;
  styles: CloudinaryWidgetStyles;
  showAdvancedOptions: boolean;
  showPoweredBy: boolean;
}

export interface CloudinaryUploadInfo {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
  resource_type: string;
  type: string;
  url: string;
}

export interface CloudinaryUploadResult {
  event: 'success' | 'close' | 'abort' | 'queues-start' | 'queues-end' | 'source-changed' | 'upload-added' | 'display-changed';
  info?: CloudinaryUploadInfo;
}

export interface CloudinaryError {
  message?: string;
  status?: number;
  statusText?: string;
}

export interface CloudinaryWidget {
  open: () => void;
  close: () => void;
  destroy: () => void;
  update: (options: Partial<CloudinaryWidgetConfig>) => void;
  hide: () => void;
  show: () => void;
  minimize: () => void;
  isShowing: () => boolean;
  isMinimized: () => boolean;
}

export interface CloudinaryInstance {
  createUploadWidget: (
    config: CloudinaryWidgetConfig,
    callback: (error: CloudinaryError | null, result: CloudinaryUploadResult) => void
  ) => CloudinaryWidget;
}

declare global {
  interface Window {
    cloudinary?: CloudinaryInstance;
  }
}
