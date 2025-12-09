/**
 * Integration tests for mobile settings passcode validation
 * Tests the Event Settings API validation for passcode format
 */

import { describe, it, expect } from 'vitest';
import { validateEventSettings } from '@/lib/validation';

describe('Event Settings API - Mobile Passcode Validation', () => {
  describe('Valid passcode formats', () => {
    it('should accept valid 4-digit passcode', () => {
      const settings = {
        eventName: 'Test Event',
        eventDate: '2024-12-31',
        eventLocation: 'Test Location',
        mobileSettingsPasscode: '1234'
      };
      const result = validateEventSettings(settings);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept passcode with leading zeros', () => {
      const settings = {
        eventName: 'Test Event',
        eventDate: '2024-12-31',
        eventLocation: 'Test Location',
        mobileSettingsPasscode: '0001'
      };
      const result = validateEventSettings(settings);
      expect(result.valid).toBe(true);
    });

    it('should accept all zeros', () => {
      const settings = {
        eventName: 'Test Event',
        eventDate: '2024-12-31',
        eventLocation: 'Test Location',
        mobileSettingsPasscode: '0000'
      };
      const result = validateEventSettings(settings);
      expect(result.valid).toBe(true);
    });

    it('should accept all nines', () => {
      const settings = {
        eventName: 'Test Event',
        eventDate: '2024-12-31',
        eventLocation: 'Test Location',
        mobileSettingsPasscode: '9999'
      };
      const result = validateEventSettings(settings);
      expect(result.valid).toBe(true);
    });

    it('should accept null to disable passcode protection', () => {
      const settings = {
        eventName: 'Test Event',
        eventDate: '2024-12-31',
        eventLocation: 'Test Location',
        mobileSettingsPasscode: null
      };
      const result = validateEventSettings(settings);
      expect(result.valid).toBe(true);
    });

    it('should accept undefined (field not provided)', () => {
      const settings = {
        eventName: 'Test Event',
        eventDate: '2024-12-31',
        eventLocation: 'Test Location'
        // mobileSettingsPasscode not provided
      };
      const result = validateEventSettings(settings);
      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid passcode formats', () => {
    it('should reject passcode with less than 4 digits', () => {
      const settings = {
        eventName: 'Test Event',
        eventDate: '2024-12-31',
        eventLocation: 'Test Location',
        mobileSettingsPasscode: '123'
      };
      const result = validateEventSettings(settings);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('4 numerical digits');
    });

    it('should reject passcode with more than 4 digits', () => {
      const settings = {
        eventName: 'Test Event',
        eventDate: '2024-12-31',
        eventLocation: 'Test Location',
        mobileSettingsPasscode: '12345'
      };
      const result = validateEventSettings(settings);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('4 numerical digits');
    });

    it('should reject passcode with letters', () => {
      const settings = {
        eventName: 'Test Event',
        eventDate: '2024-12-31',
        eventLocation: 'Test Location',
        mobileSettingsPasscode: '12ab'
      };
      const result = validateEventSettings(settings);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('4 numerical digits');
    });

    it('should reject passcode with special characters', () => {
      const settings = {
        eventName: 'Test Event',
        eventDate: '2024-12-31',
        eventLocation: 'Test Location',
        mobileSettingsPasscode: '12@4'
      };
      const result = validateEventSettings(settings);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('4 numerical digits');
    });

    it('should reject passcode with spaces', () => {
      const settings = {
        eventName: 'Test Event',
        eventDate: '2024-12-31',
        eventLocation: 'Test Location',
        mobileSettingsPasscode: '12 4'
      };
      const result = validateEventSettings(settings);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('4 numerical digits');
    });

    it('should reject passcode with hyphens', () => {
      const settings = {
        eventName: 'Test Event',
        eventDate: '2024-12-31',
        eventLocation: 'Test Location',
        mobileSettingsPasscode: '12-4'
      };
      const result = validateEventSettings(settings);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('4 numerical digits');
    });

    it('should reject empty string', () => {
      const settings = {
        eventName: 'Test Event',
        eventDate: '2024-12-31',
        eventLocation: 'Test Location',
        mobileSettingsPasscode: ''
      };
      const result = validateEventSettings(settings);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('4 numerical digits');
    });

    it('should reject whitespace-only string', () => {
      const settings = {
        eventName: 'Test Event',
        eventDate: '2024-12-31',
        eventLocation: 'Test Location',
        mobileSettingsPasscode: '    '
      };
      const result = validateEventSettings(settings);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('4 numerical digits');
    });
  });

  describe('Update mode validation', () => {
    it('should validate passcode in update mode', () => {
      const settings = {
        mobileSettingsPasscode: '5678'
      };
      const result = validateEventSettings(settings, true);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid passcode in update mode', () => {
      const settings = {
        mobileSettingsPasscode: 'abcd'
      };
      const result = validateEventSettings(settings, true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('4 numerical digits');
    });

    it('should allow clearing passcode in update mode', () => {
      const settings = {
        mobileSettingsPasscode: null
      };
      const result = validateEventSettings(settings, true);
      expect(result.valid).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle numeric type (JavaScript coerces to string)', () => {
      const settings = {
        eventName: 'Test Event',
        eventDate: '2024-12-31',
        eventLocation: 'Test Location',
        mobileSettingsPasscode: 1234 as any // Type coercion test
      };
      const result = validateEventSettings(settings);
      // JavaScript's regex.test() coerces numbers to strings, so this passes
      // This is acceptable behavior - the frontend sends strings anyway
      expect(result.valid).toBe(true);
    });

    it('should not interfere with other validations', () => {
      const settings = {
        eventName: '', // Invalid
        eventDate: '2024-12-31',
        eventLocation: 'Test Location',
        mobileSettingsPasscode: '1234' // Valid
      };
      const result = validateEventSettings(settings);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('eventName');
    });

    it('should validate passcode even when other fields are valid', () => {
      const settings = {
        eventName: 'Test Event',
        eventDate: '2024-12-31',
        eventLocation: 'Test Location',
        barcodeLength: 8, // Valid
        mobileSettingsPasscode: 'invalid' // Invalid
      };
      const result = validateEventSettings(settings);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('4 numerical digits');
    });
  });
});
