
export interface SweetAlertTheme {
  popup: string;
  title: string;
  htmlContainer: string;
  confirmButton: string;
  cancelButton: string;
  icon: string;
}

/**
 * Returns Tailwind utility classes for SweetAlert2 elements.
 *
 * IMPORTANT: We intentionally do NOT apply bg-* or text-* classes to the popup.
 * SweetAlert2's success icon uses masking elements (circular-line, success-fix)
 * whose background color is set via JS by reading getComputedStyle(popup).backgroundColor.
 * Tailwind v4 CSS variables can produce color formats that break this mechanism.
 * Instead, we set --swal2-background and --swal2-color via CSS (see sweetalert-custom.css).
 *
 * We also do NOT override showClass/hideClass with Tailwind animation classes.
 * SweetAlert2's icon animations are gated behind @container queries that depend
 * on the native swal2-show class being present. Replacing it breaks icon animations.
 */
export const getSweetAlertTheme = (isDark: boolean): Partial<SweetAlertTheme> => {
  return {
    popup: '', // Background/color handled via CSS variables — see sweetalert-custom.css
    title: 'font-semibold',
    htmlContainer: '',
    confirmButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
    cancelButton: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
  };
};

export const defaultSweetAlertConfig = {
  customClass: getSweetAlertTheme(false),
  buttonsStyling: false,
  // Use SweetAlert2's native animations — do NOT override with Tailwind animation classes.
  // SweetAlert2's icon animations depend on the native swal2-show class being applied.
  position: 'top-end' as const,
  timer: 5000,
  timerProgressBar: true,
  showConfirmButton: false,
  toast: true,
  // Note: backdrop parameter is incompatible with toasts - don't set it
};
