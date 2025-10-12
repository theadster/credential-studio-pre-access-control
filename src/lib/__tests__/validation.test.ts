import { describe, it, expect } from 'vitest';
import { ValidationError, EMAIL_REGEX, validateEmail } from '../validation';

describe('validation', () => {
  describe('ValidationError', () => {
    it('should create error with default values', () => {
      const error = new ValidationError('Test error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(400);
      expect(error.type).toBe('validation_error');
      expect(error.name).toBe('ValidationError');
    });

    it('should create error with custom code and type', () => {
      const error = new ValidationError('Custom error', 422, 'custom_type');
      
      expect(error.message).toBe('Custom error');
      expect(error.code).toBe(422);
      expect(error.type).toBe('custom_type');
    });

    it('should maintain proper stack trace', () => {
      const error = new ValidationError('Stack test');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ValidationError');
    });

    it('should be catchable as Error', () => {
      try {
        throw new ValidationError('Test');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(ValidationError);
      }
    });
  });

  describe('EMAIL_REGEX', () => {
    it('should match valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.com',
        'user+tag@example.co.uk',
        'user_name@example-domain.com',
        'a@b.c',
        '123@456.789',
      ];

      validEmails.forEach(email => {
        expect(EMAIL_REGEX.test(email)).toBe(true);
      });
    });

    it('should not match invalid email addresses', () => {
      const invalidEmails = [
        'invalid',
        'invalid@',
        '@example.com',
        'invalid@example',
        'invalid @example.com',
        'invalid@example .com',
        'invalid@.com',
        '',
        ' ',
        'invalid@@example.com',
      ];

      invalidEmails.forEach(email => {
        expect(EMAIL_REGEX.test(email)).toBe(false);
      });
    });
  });

  describe('validateEmail', () => {
    it('should not throw for valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.com',
        'user+tag@example.co.uk',
      ];

      validEmails.forEach(email => {
        expect(() => validateEmail(email)).not.toThrow();
      });
    });

    it('should throw ValidationError for invalid email addresses', () => {
      const invalidEmails = [
        'invalid',
        'invalid@',
        '@example.com',
        'invalid@example',
        'invalid @example.com',
      ];

      invalidEmails.forEach(email => {
        expect(() => validateEmail(email)).toThrow(ValidationError);
      });
    });

    it('should throw ValidationError with correct properties', () => {
      try {
        validateEmail('invalid-email');
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.message).toBe('Please enter a valid email address');
          expect(error.code).toBe(400);
          expect(error.type).toBe('invalid_email');
        }
      }
    });

    it('should be usable in try-catch blocks', () => {
      let caughtError: ValidationError | null = null;

      try {
        validateEmail('invalid');
      } catch (error) {
        if (error instanceof ValidationError) {
          caughtError = error;
        }
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError?.message).toBe('Please enter a valid email address');
      expect(caughtError?.code).toBe(400);
      expect(caughtError?.type).toBe('invalid_email');
    });

    it('should handle edge cases', () => {
      const edgeCases = [
        '',
        ' ',
        '   ',
        '\n',
        '\t',
      ];

      edgeCases.forEach(email => {
        expect(() => validateEmail(email)).toThrow(ValidationError);
      });
    });
  });
});
