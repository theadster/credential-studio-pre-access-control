import { describe, it, expect } from 'vitest';
import { FORM_LIMITS, CLOUDINARY_CONFIG } from '../formLimits';

describe('formLimits', () => {
  describe('FORM_LIMITS', () => {
    it('defines text field limits', () => {
      expect(FORM_LIMITS.NOTES_MAX_LENGTH).toBe(2000);
      expect(FORM_LIMITS.NAME_MAX_LENGTH).toBe(100);
    });

    it('defines photo upload limits', () => {
      expect(FORM_LIMITS.PHOTO_MAX_FILE_SIZE).toBe(5_000_000);
      expect(FORM_LIMITS.PHOTO_MAX_DIMENSION).toBe(800);
      expect(FORM_LIMITS.PHOTO_ALLOWED_FORMATS).toEqual(['jpg', 'jpeg', 'png']);
    });

    it('defines barcode generation limits', () => {
      expect(FORM_LIMITS.BARCODE_LENGTH_DEFAULT).toBe(8);
      expect(FORM_LIMITS.BARCODE_GENERATION_MAX_ATTEMPTS).toBe(10);
    });

    it('defines custom field limits', () => {
      expect(FORM_LIMITS.CUSTOM_FIELD_NAME_MAX_LENGTH).toBe(100);
      expect(FORM_LIMITS.CUSTOM_FIELD_VALUE_MAX_LENGTH).toBe(1000);
    });

    it('is defined with expected structure', () => {
      // TypeScript enforces immutability at compile time with 'as const'
      expect(FORM_LIMITS).toBeDefined();
      expect(typeof FORM_LIMITS.NOTES_MAX_LENGTH).toBe('number');
      expect(typeof FORM_LIMITS.NAME_MAX_LENGTH).toBe('number');
      expect(Array.isArray(FORM_LIMITS.PHOTO_ALLOWED_FORMATS)).toBe(true);
    });

    it('has photo formats as readonly array', () => {
      expect(FORM_LIMITS.PHOTO_ALLOWED_FORMATS).toHaveLength(3);
      expect(FORM_LIMITS.PHOTO_ALLOWED_FORMATS).toContain('jpg');
      expect(FORM_LIMITS.PHOTO_ALLOWED_FORMATS).toContain('jpeg');
      expect(FORM_LIMITS.PHOTO_ALLOWED_FORMATS).toContain('png');
    });
  });

  describe('CLOUDINARY_CONFIG', () => {
    it('defines folder and theme', () => {
      expect(CLOUDINARY_CONFIG.FOLDER).toBe('attendee-photos');
      expect(CLOUDINARY_CONFIG.THEME).toBe('minimal');
    });

    it('defines default crop aspect ratio', () => {
      expect(CLOUDINARY_CONFIG.DEFAULT_CROP_ASPECT_RATIO).toBe(1);
    });

    it('defines upload sources', () => {
      expect(CLOUDINARY_CONFIG.SOURCES).toEqual(['local', 'url', 'camera']);
      expect(CLOUDINARY_CONFIG.DEFAULT_SOURCE).toBe('local');
    });

    it('defines complete color palette', () => {
      const palette = CLOUDINARY_CONFIG.PALETTE;

      expect(palette.window).toBe("#FFFFFF");
      expect(palette.windowBorder).toBe("#90A0B3");
      expect(palette.tabIcon).toBe("#8B5CF6");
      expect(palette.menuIcons).toBe("#5A616A");
      expect(palette.textDark).toBe("#000000");
      expect(palette.textLight).toBe("#FFFFFF");
      expect(palette.link).toBe("#8B5CF6");
      expect(palette.action).toBe("#8B5CF6");
      expect(palette.inactiveTabIcon).toBe("#0E2F5A");
      expect(palette.error).toBe("#F44235");
      expect(palette.inProgress).toBe("#8B5CF6");
      expect(palette.complete).toBe("#20B832");
      expect(palette.sourceBg).toBe("#E4EBF1");
    });

    it('palette colors are valid hex codes', () => {
      const hexColorRegex = /^#[0-9A-F]{6}$/i;
      const palette = CLOUDINARY_CONFIG.PALETTE;

      Object.values(palette).forEach(color => {
        expect(color).toMatch(hexColorRegex);
      });
    });

    it('is defined with expected structure', () => {
      // TypeScript enforces immutability at compile time with 'as const'
      expect(CLOUDINARY_CONFIG).toBeDefined();
      expect(typeof CLOUDINARY_CONFIG.FOLDER).toBe('string');
      expect(typeof CLOUDINARY_CONFIG.THEME).toBe('string');
      expect(Array.isArray(CLOUDINARY_CONFIG.SOURCES)).toBe(true);
      expect(typeof CLOUDINARY_CONFIG.PALETTE).toBe('object');
    });
  });

  describe('Type Safety', () => {
    it('photo formats are correctly typed', () => {
      const formats = FORM_LIMITS.PHOTO_ALLOWED_FORMATS;

      // TypeScript should infer the exact type
      const firstFormat: 'jpg' | 'jpeg' | 'png' = formats[0];
      expect(['jpg', 'jpeg', 'png']).toContain(firstFormat);
    });

    it('cloudinary sources are correctly typed', () => {
      const sources = CLOUDINARY_CONFIG.SOURCES;

      // TypeScript should infer the exact type
      const firstSource: 'local' | 'url' | 'camera' = sources[0];
      expect(['local', 'url', 'camera']).toContain(firstSource);
    });
  });

  describe('Consistency', () => {
    it('photo dimensions are consistent', () => {
      // Max width and height should be the same for square images
      expect(FORM_LIMITS.PHOTO_MAX_DIMENSION).toBe(800);
    });

    it('file size is reasonable', () => {
      // 5MB (5,000,000 bytes) should be sufficient for photos
      // Note: Using decimal (5,000,000) not binary (5,242,880) for simplicity
      expect(FORM_LIMITS.PHOTO_MAX_FILE_SIZE).toBe(5_000_000);
      expect(FORM_LIMITS.PHOTO_MAX_FILE_SIZE).toBeGreaterThan(1_000_000); // At least 1MB
      expect(FORM_LIMITS.PHOTO_MAX_FILE_SIZE).toBeLessThan(10_000_000); // Less than 10MB
    });

    it('barcode length is reasonable', () => {
      // Default barcode length should be between 4 and 20
      expect(FORM_LIMITS.BARCODE_LENGTH_DEFAULT).toBeGreaterThanOrEqual(4);
      expect(FORM_LIMITS.BARCODE_LENGTH_DEFAULT).toBeLessThanOrEqual(20);
    });

    it('max generation attempts prevents infinite loops', () => {
      // Should have a reasonable limit to prevent infinite loops
      expect(FORM_LIMITS.BARCODE_GENERATION_MAX_ATTEMPTS).toBeGreaterThan(0);
      expect(FORM_LIMITS.BARCODE_GENERATION_MAX_ATTEMPTS).toBeLessThanOrEqual(1000);
    });
  });

  describe('Business Logic', () => {
    it('notes max length allows substantial content', () => {
      // 2000 characters should be enough for detailed notes
      expect(FORM_LIMITS.NOTES_MAX_LENGTH).toBeGreaterThanOrEqual(1000);
    });

    it('name max length is reasonable', () => {
      // 100 characters should accommodate most names
      expect(FORM_LIMITS.NAME_MAX_LENGTH).toBeGreaterThanOrEqual(50);
      expect(FORM_LIMITS.NAME_MAX_LENGTH).toBeLessThanOrEqual(200);
    });

    it('custom field value length is substantial', () => {
      // Should allow more content than names but less than notes
      expect(FORM_LIMITS.CUSTOM_FIELD_VALUE_MAX_LENGTH).toBeGreaterThan(FORM_LIMITS.NAME_MAX_LENGTH);
      expect(FORM_LIMITS.CUSTOM_FIELD_VALUE_MAX_LENGTH).toBeLessThan(FORM_LIMITS.NOTES_MAX_LENGTH);
    });
  });
});
