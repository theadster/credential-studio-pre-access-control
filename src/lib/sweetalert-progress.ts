import Swal from 'sweetalert2';
import { getSweetAlertTheme } from './sweetalert-config';

export interface ProgressOptions {
  title: string;
  text?: string;
  current: number;
  total: number;
  currentItemName?: string;
}

/**
 * Show a progress modal using SweetAlert2
 * Returns a function to update the progress
 */
export const showProgressModal = (isDark: boolean) => {
  const customClass = getSweetAlertTheme(isDark);
  
  Swal.fire({
    title: 'Processing...',
    html: `
      <div class="space-y-4">
        <div class="flex justify-center mb-4">
          <div class="swal2-loader" style="display: block; margin: 0;"></div>
        </div>
        <p class="text-sm text-muted-foreground">Initializing...</p>
        <div class="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
          <div id="swal-progress-bar" class="bg-primary h-2.5 rounded-full transition-all duration-300" style="width: 0%"></div>
        </div>
        <div class="flex justify-between text-xs text-muted-foreground">
          <span id="swal-progress-text">0%</span>
          <span id="swal-progress-count">0 of 0</span>
        </div>
        <p id="swal-current-item" class="text-xs text-muted-foreground mt-2"></p>
        <p class="text-xs text-muted-foreground mt-2">Please do not navigate away from this page.</p>
      </div>
    `,
    customClass: {
      ...customClass,
      popup: `${customClass.popup} !w-[500px]`,
      htmlContainer: 'text-left',
    },
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    buttonsStyling: false,
    showClass: {
      popup: 'animate-in fade-in-0 zoom-in-95 duration-200',
    },
    hideClass: {
      popup: 'animate-out fade-out-0 zoom-out-95 duration-150',
    },
  });

  // Return update function
  return (options: ProgressOptions) => {
    const percentage = options.total > 0 ? Math.round((options.current / options.total) * 100) : 0;
    
    // Update title
    const titleElement = Swal.getTitle();
    if (titleElement) {
      titleElement.textContent = options.title;
    }
    
    // Update progress bar
    const progressBar = document.getElementById('swal-progress-bar');
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }
    
    // Update percentage text
    const progressText = document.getElementById('swal-progress-text');
    if (progressText) {
      progressText.textContent = `${percentage}%`;
    }
    
    // Update count
    const progressCount = document.getElementById('swal-progress-count');
    if (progressCount) {
      progressCount.textContent = `${options.current} of ${options.total}`;
    }
    
    // Update current item name
    const currentItem = document.getElementById('swal-current-item');
    if (currentItem) {
      if (options.currentItemName) {
        currentItem.textContent = `Currently processing: ${options.currentItemName}`;
        currentItem.style.display = 'block';
      } else {
        currentItem.style.display = 'none';
      }
    }
    
    // Update description text if provided
    if (options.text) {
      const container = Swal.getHtmlContainer();
      if (container) {
        const descElement = container.querySelector('p.text-sm');
        if (descElement) {
          descElement.textContent = options.text;
        }
      }
    }
  };
};

/**
 * Close the progress modal
 */
export const closeProgressModal = () => {
  Swal.close();
};
