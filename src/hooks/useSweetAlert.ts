import { useCallback, useEffect, useState } from 'react';
import Swal, { SweetAlertIcon, SweetAlertResult } from 'sweetalert2';
import { defaultSweetAlertConfig, getSweetAlertTheme } from '@/lib/sweetalert-config';

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info' | 'destructive';
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

export interface ConfirmOptions {
  title: string;
  text?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  icon?: SweetAlertIcon;
  showCancelButton?: boolean;
}

export interface LoadingOptions {
  title: string;
  text?: string;
}

export interface AlertOptions {
  title: string;
  text?: string;
  html?: string;
  icon?: SweetAlertIcon;
  confirmButtonText?: string;
}

export const useSweetAlert = () => {
  const [isDark, setIsDark] = useState(false);

  // Theme detection with MutationObserver
  useEffect(() => {
    // Detect dark mode
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    // Watch for theme changes using MutationObserver
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Cleanup on unmount
    return () => observer.disconnect();
  }, []);

  // Generic toast method with variant support
  const toast = useCallback((options: ToastOptions) => {
    const icon = getIconFromVariant(options.variant);
    const customClass = getSweetAlertTheme(isDark);
    let actionButton: HTMLButtonElement | null = null;

    return Swal.fire({
      ...defaultSweetAlertConfig,
      customClass,
      icon,
      title: options.title,
      html: options.description,
      timer: options.duration || 3000,
      didOpen: (popup) => {
        // Action button support
        if (options.action) {
          actionButton = document.createElement('button');
          actionButton.textContent = options.action.label;
          actionButton.className = 'swal2-styled swal2-confirm mt-2';
          actionButton.onclick = () => {
            options.action?.onClick();
            Swal.close();
          };
          popup.appendChild(actionButton);
        }
      },
      willClose: () => {
        // Clean up action button to prevent DOM node leaks
        if (actionButton && actionButton.parentNode) {
          actionButton.parentNode.removeChild(actionButton);
          actionButton = null;
        }
      },
    });
  }, [isDark]);

  // Convenience method: success
  const success = useCallback((title: string, description?: string) => {
    return toast({ title, description, variant: 'success' });
  }, [toast]);

  // Convenience method: error
  const error = useCallback((title: string, description?: string) => {
    return toast({ title, description, variant: 'error' });
  }, [toast]);

  // Convenience method: warning
  const warning = useCallback((title: string, description?: string) => {
    return toast({ title, description, variant: 'warning' });
  }, [toast]);

  // Convenience method: info
  const info = useCallback((title: string, description?: string) => {
    return toast({ title, description, variant: 'info' });
  }, [toast]);

  // Confirmation dialog method
  const confirm = useCallback(async (options: ConfirmOptions): Promise<boolean> => {
    const customClass = getSweetAlertTheme(isDark);

    const result: SweetAlertResult = await Swal.fire({
      title: options.title,
      text: options.text,
      icon: options.icon || 'warning',
      showCancelButton: options.showCancelButton !== false,
      confirmButtonText: options.confirmButtonText || 'Confirm',
      cancelButtonText: options.cancelButtonText || 'Cancel',
      customClass: {
        ...customClass,
        confirmButton: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-2 rounded-md',
        cancelButton: 'bg-secondary text-secondary-foreground hover:bg-secondary/90 px-4 py-2 rounded-md ml-2',
      },
      buttonsStyling: false,
      backdrop: true,
      allowOutsideClick: false,
      allowEscapeKey: true,
      showClass: {
        popup: 'animate-in fade-in-0 zoom-in-95 duration-200',
        backdrop: 'swal2-backdrop-show',
      },
      hideClass: {
        popup: 'animate-out fade-out-0 zoom-out-95 duration-150',
        backdrop: 'swal2-backdrop-hide',
      },
    });

    return result.isConfirmed;
  }, [isDark]);

  // Loading state method
  const loading = useCallback((options: LoadingOptions) => {
    const customClass = getSweetAlertTheme(isDark);

    return Swal.fire({
      title: options.title,
      text: options.text,
      customClass,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
  }, [isDark]);

  // Alert method - shows a modal that requires user acknowledgment (OK button)
  const alert = useCallback(async (options: AlertOptions): Promise<void> => {
    const customClass = getSweetAlertTheme(isDark);

    await Swal.fire({
      title: options.title,
      text: options.text,
      html: options.html,
      icon: options.icon || 'error',
      confirmButtonText: options.confirmButtonText || 'OK',
      customClass: {
        ...customClass,
        confirmButton: 'bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md',
      },
      buttonsStyling: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showClass: {
        popup: 'animate-in fade-in-0 zoom-in-95 duration-200',
      },
      hideClass: {
        popup: 'animate-out fade-out-0 zoom-out-95 duration-150',
      },
    });
  }, [isDark]);

  // Close method to dismiss loading state or any active notification
  const close = useCallback(() => {
    Swal.close();
  }, []);

  return {
    toast,
    success,
    error,
    warning,
    info,
    confirm,
    alert,
    loading,
    close,
  };
};

// Helper function to map variant to SweetAlert icon
function getIconFromVariant(variant?: string): SweetAlertIcon | undefined {
  switch (variant) {
    case 'success':
      return 'success';
    case 'error':
    case 'destructive':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
      return 'info';
    default:
      return undefined;
  }
}
