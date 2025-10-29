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
  it('should remove HTML tags and dangerous content', () => {
    expect(sanitizeInput('<script>alert("xss")</script>John')).toBe('John');
    expect(sanitizeInput('John<b>Doe</b>')).toBe('JohnDoe');
    expect(sanitizeInput('<div>Test</div>')).toBe('Test');
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

  it('should remove all HTML tags', () => {
    expect(sanitizeInput('test<>test')).toBe('testtest');
    expect(sanitizeInput('<test>')).toBe(''); // <test> is treated as a complete tag
    expect(sanitizeInput('<test>content</test>')).toBe('content'); // Content is preserved
    expect(sanitizeInput('<img src=x onerror=alert(1)>')).toBe('');
    expect(sanitizeInput('<div onclick=alert(1)>content</div>')).toBe('content');
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

  it('should handle complex XSS attempts', () => {
    expect(sanitizeInput('<img src=x onerror=alert(1)>Name')).toBe('Name');
    expect(sanitizeInput('<svg onload=alert(1)>Text</svg>')).toBe('Text');
    expect(sanitizeInput('Before<script>evil()</script>After')).toBe('BeforeAfter');
  });

  it('should remove style tags with content', () => {
    expect(sanitizeInput('<style>body{display:none}</style>Text')).toBe('Text');
    expect(sanitizeInput('Normal<style>css</style>Text')).toBe('NormalText');
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
    expect(sanitizeInputFinal('  <script>alert(1)</script>John  ')).toBe('John');
    expect(sanitizeInputFinal('  <b>Bold</b> text  ')).toBe('Bold text');
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
  it('should remove all HTML tags', () => {
    expect(sanitizeNotes('<script>alert("xss")</script>Notes')).toBe('Notes');
    expect(sanitizeNotes('Test<script src="evil.js"></script>Notes')).toBe('TestNotes');
    expect(sanitizeNotes('<b>Bold</b> text')).toBe('Bold text');
    expect(sanitizeNotes('<div>Test</div>')).toBe('Test');
    expect(sanitizeNotes('<p>Paragraph</p>')).toBe('Paragraph');
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
    expect(sanitizeNotes('<img src=x onerror=alert(1)>')).toBe('');
    expect(sanitizeNotes('<svg onload=alert(1)>')).toBe('');
    expect(sanitizeNotes('<iframe src="evil.com"></iframe>')).toBe('');
    expect(sanitizeNotes('<div onclick=alert(1)>text</div>')).toBe('text');
  });

  it('should remove dangerous tags with content', () => {
    expect(sanitizeNotes('<script>malicious code</script>')).toBe('');
    expect(sanitizeNotes('<style>body{display:none}</style>')).toBe('');
    expect(sanitizeNotes('Before<script>alert(1)</script>After')).toBe('BeforeAfter');
  });

  it('should handle mixed content safely', () => {
    expect(sanitizeNotes('Normal text <b>bold</b> more text')).toBe('Normal text bold more text');
    expect(sanitizeNotes('<a href="javascript:alert(1)">Click</a>')).toBe('Click');
    expect(sanitizeNotes('<img src=x onerror=alert(1)>Text')).toBe('Text');
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
