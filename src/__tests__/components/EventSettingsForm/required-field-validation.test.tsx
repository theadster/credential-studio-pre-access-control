/**
 * Tests for OneSimpleAPI Required Field Validation
 * 
 * Verifies that the Webhook URL field is required when OneSimpleAPI is enabled
 */

import { describe, it, expect } from 'vitest';
import { validateEventSettings } from '@/lib/validation';

describe('OneSimpleAPI Required Field Validation', () => {
  const baseSettings = {
    eventName: 'Test Event',
    eventDate: '2024-12-31',
    eventLocation: 'Test Location'
  };

  describe('When OneSimpleAPI is enabled', () => {
    it('should require Webhook URL field', () => {
      const settings = {
        ...baseSettings,
        oneSimpleApiEnabled: true
      };

      const result = validateEventSettings(settings);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Webhook URL is required');
    });

    it('should reject empty Webhook URL', () => {
      const settings = {
        ...baseSettings,
        oneSimpleApiEnabled: true,
        oneSimpleApiUrl: ''
      };

      const result = validateEventSettings(settings);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Webhook URL is required');
    });

    it('should reject whitespace-only Webhook URL', () => {
      const settings = {
        ...baseSettings,
        oneSimpleApiEnabled: true,
        oneSimpleApiUrl: '   '
      };

      const result = validateEventSettings(settings);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Webhook URL is required');
    });

    it('should reject invalid URL format', () => {
      const settings = {
        ...baseSettings,
        oneSimpleApiEnabled: true,
        oneSimpleApiUrl: 'not-a-valid-url'
      };

      const result = validateEventSettings(settings);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid URL');
    });

    it('should accept valid Webhook URL', () => {
      const settings = {
        ...baseSettings,
        oneSimpleApiEnabled: true,
        oneSimpleApiUrl: 'https://api.example.com/webhook'
      };

      const result = validateEventSettings(settings);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept various valid URL formats', () => {
      const validUrls = [
        'https://api.example.com/webhook',
        'http://localhost:3000/webhook',
        'https://api.example.com/v1/webhooks/attendee',
        'https://subdomain.example.com:8080/webhook'
      ];

      validUrls.forEach(url => {
        const settings = {
          ...baseSettings,
          oneSimpleApiEnabled: true,
          oneSimpleApiUrl: url
        };

        const result = validateEventSettings(settings);
        
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });
  });

  describe('When OneSimpleAPI is disabled', () => {
    it('should not require Webhook URL', () => {
      const settings = {
        ...baseSettings,
        oneSimpleApiEnabled: false
      };

      const result = validateEventSettings(settings);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should not validate Webhook URL format when disabled', () => {
      const settings = {
        ...baseSettings,
        oneSimpleApiEnabled: false,
        oneSimpleApiUrl: 'not-a-valid-url'
      };

      const result = validateEventSettings(settings);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should allow empty Webhook URL when disabled', () => {
      const settings = {
        ...baseSettings,
        oneSimpleApiEnabled: false,
        oneSimpleApiUrl: ''
      };

      const result = validateEventSettings(settings);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Integration with other validations', () => {
    it('should validate other required fields even when OneSimpleAPI is enabled', () => {
      const settings = {
        eventName: '',
        eventDate: '2024-12-31',
        eventLocation: 'Test Location',
        oneSimpleApiEnabled: true,
        oneSimpleApiUrl: 'https://api.example.com/webhook'
      };

      const result = validateEventSettings(settings);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('eventName');
    });

    it('should validate barcode length along with OneSimpleAPI', () => {
      const settings = {
        ...baseSettings,
        oneSimpleApiEnabled: true,
        oneSimpleApiUrl: 'https://api.example.com/webhook',
        barcodeLength: 25
      };

      const result = validateEventSettings(settings);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Barcode length');
    });

    it('should pass all validations when everything is correct', () => {
      const settings = {
        ...baseSettings,
        oneSimpleApiEnabled: true,
        oneSimpleApiUrl: 'https://api.example.com/webhook',
        barcodeLength: 8
      };

      const result = validateEventSettings(settings);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});
