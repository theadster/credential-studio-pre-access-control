import { describe, it, expect } from 'vitest';
import { sanitizeInput, sanitizeInputFinal, sanitizeEmail } from '@/lib/sanitization';

describe('sanitizeInput', () => {
  it('should strip all HTML tags', () => {
    expect(sanitizeInput('<div>Hello</div>')).toBe('Hello');
    expect(sanitizeInput('<b>Bold</b> text')).toBe('Bold text');
  });

  it('should remove script tags and content', () => {
    expect(sanitizeInput('<script>alert("xss")</script>Hello')).toBe('Hello');
  });

  it('should remove event handlers', () => {
    expect(sanitizeInput('<div onclick="alert()">Click</div>')).toBe('Click');
  });

  it('should preserve spaces', () => {
    expect(sanitizeInput('  Hello  World  ')).toBe('  Hello  World  ');
  });

  it('should handle empty input', () => {
    expect(sanitizeInput('')).toBe('');
  });

  it('should handle plain text', () => {
    expect(sanitizeInput('Hello World')).toBe('Hello World');
  });
});

describe('sanitizeInputFinal', () => {
  it('should trim whitespace', () => {
    expect(sanitizeInputFinal('  Hello World  ')).toBe('Hello World');
  });

  it('should strip HTML and trim', () => {
    expect(sanitizeInputFinal('  <div>Hello</div>  ')).toBe('Hello');
  });
});

describe('sanitizeEmail', () => {
  it('should normalize valid email addresses', () => {
    expect(sanitizeEmail('User@Example.COM')).toBe('user@example.com');
    expect(sanitizeEmail('test.user@example.co.uk')).toBe('test.user@example.co.uk');
  });

  it('should strip HTML from email', () => {
    expect(sanitizeEmail('<script>alert()</script>test@example.com')).toBe('test@example.com');
    expect(sanitizeEmail('<b>user</b>@example.com')).toBe('user@example.com');
  });

  it('should return empty string for invalid emails', () => {
    expect(sanitizeEmail('not-an-email')).toBe('');
    expect(sanitizeEmail('missing@domain')).toBe('');
    expect(sanitizeEmail('@example.com')).toBe('');
    expect(sanitizeEmail('user@')).toBe('');
  });

  it('should handle empty input', () => {
    expect(sanitizeEmail('')).toBe('');
  });

  it('should trim whitespace', () => {
    expect(sanitizeEmail('  user@example.com  ')).toBe('user@example.com');
  });

  it('should handle special characters in valid emails', () => {
    expect(sanitizeEmail('user+tag@example.com')).toBe('user+tag@example.com');
    expect(sanitizeEmail('user_name@example.com')).toBe('user_name@example.com');
  });
});
