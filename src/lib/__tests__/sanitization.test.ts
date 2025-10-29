import { describe, it, expect } from 'vitest';
import {
  sanitizeInput,
  sanitizeInputFinal,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeNotes,
  sanitizeNotesFinal,
  sanitizeBarcode
} from '../sanitization';

describe('sanitizeInput', () => {
  it('should remove HTML tags and content', () => {
    expect(sanitizeInput('<script>alert("xss")</script>John')).toBe('scriptalert("xss")/scriptJohn');
    expect(sanitizeInput('John<b>Doe</b>')).toBe('JohnbDoe/b');
    expect(sanitizeInput('<div>Test</div>')).toBe('divTest/div');
  });

  it('should remove javascript: protocol', () => {
    expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)');
    expect(sanitizeInput('JAVASCRIPT:alert(1)')).toBe('alert(1)');
  });

  it('should remove event handlers', () => {
    expect(sanitizeInput('test onclick=alert(1)')).toBe('test alert(1)');
    expect(sanitizeInput('test onload=alert(1)')).toBe('test alert(1)');
    expect(sanitizeInput('test onerror=alert(1)')).toBe('test alert(1)');
  });

  it('should remove angle brackets', () => {
    expect(sanitizeInput('test<>test')).toBe('testtest');
    expect(sanitizeInput('<test>')).toBe('test');
  });

  it('should NOT trim whitespace during typing', () => {
    expect(sanitizeInput('  John  ')).toBe('  John  ');
    expect(sanitizeInput('\n\tJohn\n\t')).toBe('\n\tJohn\n\t');
  });

  it('should handle empty strings', () => {
    expect(sanitizeInput('')).toBe('');
  });

  it('should preserve normal text', () => {
    expect(sanitizeInput('John Doe')).toBe('John Doe');
    expect(sanitizeInput('Test-123')).toBe('Test-123');
    expect(sanitizeInput("O'Brien")).toBe("O'Brien");
  });
});

describe('sanitizeInputFinal', () => {
  it('should trim whitespace on final sanitization', () => {
    expect(sanitizeInputFinal('  John  ')).toBe('John');
    expect(sanitizeInputFinal('\n\tJohn\n\t')).toBe('John');
  });

  it('should handle empty strings', () => {
    expect(sanitizeInputFinal('')).toBe('');
    expect(sanitizeInputFinal('   ')).toBe('');
  });

  it('should remove XSS and trim', () => {
    expect(sanitizeInputFinal('  <script>alert(1)</script>John  ')).toBe('scriptalert(1)/scriptJohn');
  });
});

describe('sanitizeEmail', () => {
  it('should trim and lowercase', () => {
    expect(sanitizeEmail('  John@Example.COM  ')).toBe('john@example.com');
    expect(sanitizeEmail('TEST@TEST.COM')).toBe('test@test.com');
  });

  it('should handle empty strings', () => {
    expect(sanitizeEmail('')).toBe('');
    expect(sanitizeEmail('   ')).toBe('');
  });

  it('should preserve valid email format', () => {
    expect(sanitizeEmail('user@example.com')).toBe('user@example.com');
    expect(sanitizeEmail('user+tag@example.co.uk')).toBe('user+tag@example.co.uk');
  });
});

describe('sanitizeUrl', () => {
  it('should allow valid http/https URLs', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    expect(sanitizeUrl('https://example.com/path?query=value')).toBe('https://example.com/path?query=value');
  });

  it('should reject non-http protocols', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(sanitizeUrl('file:///etc/passwd')).toBe('');
    expect(sanitizeUrl('ftp://example.com')).toBe('');
  });

  it('should handle empty strings', () => {
    expect(sanitizeUrl('')).toBe('');
    expect(sanitizeUrl('   ')).toBe('');
  });

  it('should trim whitespace', () => {
    expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
  });

  it('should reject URLs without protocol', () => {
    expect(sanitizeUrl('example.com')).toBe('');
    expect(sanitizeUrl('www.example.com')).toBe('');
  });
});

describe('sanitizeNotes', () => {
  it('should remove script tags', () => {
    expect(sanitizeNotes('<script>alert("xss")</script>Notes')).toBe('Notes');
    expect(sanitizeNotes('Test<script src="evil.js"></script>Notes')).toBe('TestNotes');
  });

  it('should remove event handlers', () => {
    expect(sanitizeNotes('test onclick=alert(1)')).toBe('test alert(1)');
    expect(sanitizeNotes('test onload=alert(1)')).toBe('test alert(1)');
  });

  it('should NOT trim whitespace during typing', () => {
    expect(sanitizeNotes('  Notes  ')).toBe('  Notes  ');
    expect(sanitizeNotes('Notes with spaces')).toBe('Notes with spaces');
  });

  it('should handle empty strings', () => {
    expect(sanitizeNotes('')).toBe('');
  });

  it('should preserve normal text with punctuation', () => {
    expect(sanitizeNotes('This is a note with punctuation!')).toBe('This is a note with punctuation!');
    expect(sanitizeNotes('Multi-line\nnotes\nare\nok')).toBe('Multi-line\nnotes\nare\nok');
  });

  it('should handle complex XSS attempts', () => {
    expect(sanitizeNotes('<img src=x onerror=alert(1)>')).toBe('<img src=x alert(1)>');
    expect(sanitizeNotes('<svg onload=alert(1)>')).toBe('<svg alert(1)>');
  });
});

describe('sanitizeNotesFinal', () => {
  it('should trim whitespace on final sanitization', () => {
    expect(sanitizeNotesFinal('  Notes  ')).toBe('Notes');
    expect(sanitizeNotesFinal('\n\tNotes\n\t')).toBe('Notes');
  });

  it('should handle empty strings', () => {
    expect(sanitizeNotesFinal('')).toBe('');
    expect(sanitizeNotesFinal('   ')).toBe('');
  });

  it('should remove XSS and trim', () => {
    expect(sanitizeNotesFinal('  <script>alert(1)</script>Notes  ')).toBe('Notes');
  });
});

describe('sanitizeBarcode', () => {
  it('should only allow alphanumeric characters', () => {
    expect(sanitizeBarcode('ABC123')).toBe('ABC123');
    expect(sanitizeBarcode('abc123')).toBe('ABC123');
  });

  it('should remove special characters', () => {
    expect(sanitizeBarcode('ABC-123')).toBe('ABC123');
    expect(sanitizeBarcode('ABC_123')).toBe('ABC123');
    expect(sanitizeBarcode('ABC@123')).toBe('ABC123');
  });

  it('should convert to uppercase', () => {
    expect(sanitizeBarcode('abc')).toBe('ABC');
    expect(sanitizeBarcode('AbC123')).toBe('ABC123');
  });

  it('should trim whitespace', () => {
    expect(sanitizeBarcode('  ABC123  ')).toBe('ABC123');
  });

  it('should handle empty strings', () => {
    expect(sanitizeBarcode('')).toBe('');
    expect(sanitizeBarcode('   ')).toBe('');
  });

  it('should remove XSS attempts', () => {
    expect(sanitizeBarcode('<script>alert(1)</script>')).toBe('SCRIPTALERT1SCRIPT');
    expect(sanitizeBarcode('ABC<>123')).toBe('ABC123');
  });
});
