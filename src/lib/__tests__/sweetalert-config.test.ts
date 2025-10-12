import { describe, it, expect } from 'vitest';
import { getSweetAlertTheme, defaultSweetAlertConfig } from '../sweetalert-config';

describe('sweetalert-config', () => {
  describe('getSweetAlertTheme', () => {
    it('should return theme config for light mode', () => {
      const theme = getSweetAlertTheme(false);

      expect(theme).toEqual({
        popup: 'bg-card text-card-foreground border border-border',
        title: 'text-foreground font-semibold',
        htmlContainer: 'text-muted-foreground',
        confirmButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
        cancelButton: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
      });
    });

    it('should return theme config for dark mode', () => {
      const theme = getSweetAlertTheme(true);

      expect(theme).toEqual({
        popup: 'bg-card text-card-foreground border border-border',
        title: 'text-foreground font-semibold',
        htmlContainer: 'text-muted-foreground',
        confirmButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
        cancelButton: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
      });
    });

    it('should return consistent theme classes', () => {
      const lightTheme = getSweetAlertTheme(false);
      const darkTheme = getSweetAlertTheme(true);

      // Both themes should use the same CSS variable-based classes
      expect(lightTheme.popup).toBe(darkTheme.popup);
      expect(lightTheme.title).toBe(darkTheme.title);
      expect(lightTheme.htmlContainer).toBe(darkTheme.htmlContainer);
    });

    it('should include all required theme properties', () => {
      const theme = getSweetAlertTheme(false);

      expect(theme).toHaveProperty('popup');
      expect(theme).toHaveProperty('title');
      expect(theme).toHaveProperty('htmlContainer');
      expect(theme).toHaveProperty('confirmButton');
      expect(theme).toHaveProperty('cancelButton');
    });

    it('should use Tailwind CSS classes', () => {
      const theme = getSweetAlertTheme(false);

      // Verify it uses Tailwind utility classes
      expect(theme.popup).toContain('bg-card');
      expect(theme.popup).toContain('text-card-foreground');
      expect(theme.popup).toContain('border');
      expect(theme.title).toContain('text-foreground');
      expect(theme.title).toContain('font-semibold');
      expect(theme.htmlContainer).toContain('text-muted-foreground');
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
      expect(defaultSweetAlertConfig.timer).toBe(3000);
      expect(defaultSweetAlertConfig.timerProgressBar).toBe(true);
    });

    it('should have correct button configuration', () => {
      expect(defaultSweetAlertConfig.showConfirmButton).toBe(false);
      expect(defaultSweetAlertConfig.buttonsStyling).toBe(false);
    });

    it('should have animation classes', () => {
      expect(defaultSweetAlertConfig.showClass).toEqual({
        popup: 'animate-in fade-in-0 zoom-in-95 duration-200',
      });
      expect(defaultSweetAlertConfig.hideClass).toEqual({
        popup: 'animate-out fade-out-0 zoom-out-95 duration-150',
      });
    });

    it('should include custom class configuration', () => {
      expect(defaultSweetAlertConfig.customClass).toBeDefined();
      expect(defaultSweetAlertConfig.customClass).toHaveProperty('popup');
      expect(defaultSweetAlertConfig.customClass).toHaveProperty('title');
    });

    it('should use entrance animation', () => {
      const showClass = defaultSweetAlertConfig.showClass.popup;

      expect(showClass).toContain('animate-in');
      expect(showClass).toContain('fade-in-0');
      expect(showClass).toContain('zoom-in-95');
      expect(showClass).toContain('duration-200');
    });

    it('should use exit animation', () => {
      const hideClass = defaultSweetAlertConfig.hideClass.popup;

      expect(hideClass).toContain('animate-out');
      expect(hideClass).toContain('fade-out-0');
      expect(hideClass).toContain('zoom-out-95');
      expect(hideClass).toContain('duration-150');
    });

    it('should have faster exit than entrance animation', () => {
      // Extract duration values with a flexible pattern that captures numeric values
      // Pattern matches: duration-<number> or duration-<number>ms
      const durationPattern = /duration-(\d+)(?:ms)?/;

      const showClass = defaultSweetAlertConfig.showClass.popup;
      const hideClass = defaultSweetAlertConfig.hideClass.popup;

      const showMatch = showClass.match(durationPattern);
      const hideMatch = hideClass.match(durationPattern);

      // Defensively check that both matches exist
      if (!showMatch || !showMatch[1]) {
        throw new Error(
          `Failed to extract show duration from class: "${showClass}". ` +
          `Expected format: "duration-<number>" (e.g., "duration-200" or "duration-200ms")`
        );
      }

      if (!hideMatch || !hideMatch[1]) {
        throw new Error(
          `Failed to extract hide duration from class: "${hideClass}". ` +
          `Expected format: "duration-<number>" (e.g., "duration-150" or "duration-150ms")`
        );
      }

      // Convert captured strings to numbers
      const showDuration = Number(showMatch[1]);
      const hideDuration = Number(hideMatch[1]);

      // Validate that conversions produced valid numbers
      if (isNaN(showDuration) || showDuration <= 0) {
        throw new Error(
          `Invalid show duration value: "${showMatch[1]}" from class "${showClass}". ` +
          `Expected a positive number.`
        );
      }

      if (isNaN(hideDuration) || hideDuration <= 0) {
        throw new Error(
          `Invalid hide duration value: "${hideMatch[1]}" from class "${hideClass}". ` +
          `Expected a positive number.`
        );
      }

      // Assert with descriptive message
      expect(hideDuration).toBeLessThan(showDuration);
      expect(hideDuration,
        `Hide duration (${hideDuration}ms) should be less than show duration (${showDuration}ms) ` +
        `for snappier exit animations`
      ).toBeLessThan(showDuration);
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

  describe('CSS Variable Usage', () => {
    it('should use CSS variables for theming', () => {
      const theme = getSweetAlertTheme(false);

      // Verify it uses Tailwind's CSS variable-based color system
      expect(theme.popup).toMatch(/bg-card|text-card-foreground/);
      expect(theme.title).toMatch(/text-foreground/);
      expect(theme.htmlContainer).toMatch(/text-muted-foreground/);
      expect(theme.confirmButton).toMatch(/bg-primary|text-primary-foreground/);
      expect(theme.cancelButton).toMatch(/bg-secondary|text-secondary-foreground/);
    });

    it('should not use hardcoded color values', () => {
      const theme = getSweetAlertTheme(false);

      // Ensure no hex colors or rgb values are used
      const allClasses = Object.values(theme).join(' ');
      expect(allClasses).not.toMatch(/#[0-9a-fA-F]{3,6}/);
      expect(allClasses).not.toMatch(/rgb\(/);
      expect(allClasses).not.toMatch(/rgba\(/);
    });
  });
});
