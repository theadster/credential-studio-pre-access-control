
export interface SweetAlertTheme {
  popup: string;
  title: string;
  htmlContainer: string;
  confirmButton: string;
  cancelButton: string;
  icon: string;
}

export const getSweetAlertTheme = (isDark: boolean): Partial<SweetAlertTheme> => {
  return {
    popup: 'bg-card text-card-foreground border border-border',
    title: 'text-foreground font-semibold',
    htmlContainer: 'text-muted-foreground',
    confirmButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
    cancelButton: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
    icon: 'swal2-icon-custom',
  };
};

export const defaultSweetAlertConfig = {
  customClass: getSweetAlertTheme(false),
  buttonsStyling: false,
  showClass: {
    popup: 'animate-in fade-in-0 zoom-in-95 duration-200',
  },
  hideClass: {
    popup: 'animate-out fade-out-0 zoom-out-95 duration-150',
  },
  position: 'top-end' as const,
  timer: 5000,
  timerProgressBar: true,
  showConfirmButton: false,
  toast: true,
  // Note: backdrop parameter is incompatible with toasts - don't set it
};
