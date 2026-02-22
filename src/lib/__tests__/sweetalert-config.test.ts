import { describe, it, expect } from 'vitest';
import { getSweetAlertTheme, defaultSweetAlertConfig } from '../sweetalert-config';

describe('sweetalert-config', () => {
  describe('getSweetAlertTheme', () => {
    it('should return theme config for light mode', () => {
      const theme = getSweetAlertTheme(false);

      expect(theme).toEqual({
        popup: '', // Background/color handled via CSS variables
        title: 'font-semibold',
        htmlContainer: '',
        confirmButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
        cancelButton: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
      });
    });

    it('should return theme config for dark mode', () => {
      const theme = getSweetAlertTheme(true);

      expect(theme).toEqual({
        popup: '',
        title: 'font-semibold',
        htmlContainer: '',
        confirmButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
        cancelButton: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
      });
    });

    it('should return consistent theme classes across modes', () => {
      const lightTheme = getSweetAlertTheme(false);
      const darkTheme = getSweetAlertTheme(true);

      // Both themes should use the same CSS variable-based classes
      expect(lightTheme.popup).toBe(darkTheme.popup);
      expect(lightTheme.title).toBe(darkTheme.title);
      expect(lightTheme.htmlContainer).toBe(darkTheme.htmlContainer);
      expect(lightTheme.confirmButton).toBe(darkTheme.confirmButton);
      expect(lightTheme.cancelButton).toBe(darkTheme.cancelButton);
    });

    it('should include all required theme properties', () => {
      const theme = getSweetAlertTheme(false);

      expect(theme).toHaveProperty('popup');
      expect(theme).toHaveProperty('title');
      expect(theme).toHaveProperty('htmlContainer');
      expect(theme).toHaveProperty('confirmButton');
      expect(theme).toHaveProperty('cancelButton');
    });

    it('should NOT apply bg/text classes to popup (handled via CSS variables)', () => {
      const theme = getSweetAlertTheme(false);

      // Popup must NOT have Tailwind bg/text classes — SweetAlert2's
      // adjustSuccessIconBackgroundColor() reads getComputedStyle and
      // Tailwind v4 CSS variable colors break the masking elements.
      expect(theme.popup).not.toContain('bg-');
      expect(theme.popup).not.toContain('text-');
    });

    it('should use hover states for buttons', () => {
      const theme = getSweetAlertTheme(false);

      expect(theme.confirmButton).toContain('hover:bg-primary/90');
      expect(theme.cancelButton).toContain('hover:bg-secondary/90');
    });
  });

  describe('defaultSweetAlertConfig', () => {
    it('should have correct toast configuration', () => {
      expect(defaultSweetAlertConfig.toast).toBe(true);
      expect(defaultSweetAlertConfig.position).toBe('top-end');
    });

    it('should have correct timer configuration', () => {
      expect(defaultSweetAlertConfig.timer).toBe(5000);
      expect(defaultSweetAlertConfig.timerProgressBar).toBe(true);
    });

    it('should have correct button configuration', () => {
      expect(defaultSweetAlertConfig.showConfirmButton).toBe(false);
      expect(defaultSweetAlertConfig.buttonsStyling).toBe(false);
    });

    it('should NOT override showClass/hideClass (use native SweetAlert2 animations)', () => {
      // SweetAlert2's icon animations are gated behind @container queries
      // that depend on the native swal2-show class. Overriding showClass
      // with Tailwind animation classes breaks icon rendering.
      expect(defaultSweetAlertConfig).not.toHaveProperty('showClass');
      expect(defaultSweetAlertConfig).not.toHaveProperty('hideClass');
    });

    it('should include custom class configuration', () => {
      expect(defaultSweetAlertConfig.customClass).toBeDefined();
      expect(defaultSweetAlertConfig.customClass).toHaveProperty('popup');
      expect(defaultSweetAlertConfig.customClass).toHaveProperty('title');
    });
  });

  describe('Theme Integration', () => {
    it('should apply light theme to default config', () => {
      const lightTheme = getSweetAlertTheme(false);

      expect(defaultSweetAlertConfig.customClass).toEqual(lightTheme);
    });

    it('should support theme switching', () => {
      const lightTheme = getSweetAlertTheme(false);
      const darkTheme = getSweetAlertTheme(true);

      // Both should be valid theme objects
      expect(lightTheme).toBeDefined();
      expect(darkTheme).toBeDefined();

      // Both should have the same structure
      expect(Object.keys(lightTheme)).toEqual(Object.keys(darkTheme));
    });
  });

  describe('Button CSS Variable Usage', () => {
    it('should use CSS variables for button theming', () => {
      const theme = getSweetAlertTheme(false);

      expect(theme.confirmButton).toMatch(/bg-primary|text-primary-foreground/);
      expect(theme.cancelButton).toMatch(/bg-secondary|text-secondary-foreground/);
    });

    it('should not use hardcoded color values in buttons', () => {
      const theme = getSweetAlertTheme(false);

      const buttonClasses = [theme.confirmButton, theme.cancelButton].join(' ');
      expect(buttonClasses).not.toMatch(/#[0-9a-fA-F]{3,6}/);
      expect(buttonClasses).not.toMatch(/rgb\(/);
      expect(buttonClasses).not.toMatch(/rgba\(/);
    });
  });
});
