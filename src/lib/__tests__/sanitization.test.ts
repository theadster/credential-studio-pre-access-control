/**
 * Tests for HTML Sanitization Utilities
 */

import { sanitizeHTML, sanitizeHTMLTemplate, validateHTMLSafety } from '../sanitization';

describe('sanitizeHTML', () => {
  it('should remove script tags', () => {
    const input = '<div>Hello <script>alert("XSS")</script></div>';
    const output = sanitizeHTML(input);
    expect(output).not.toContain('<script>');
    expect(output).toContain('Hello');
  });

  it('should preserve allowed tags', () => {
    const input = '<div class="test"><p>Hello</p></div>';
    const output = sanitizeHTML(input);
    expect(output).toContain('<div');
    expect(output).toContain('<p>');
    expect(output).toContain('Hello');
  });

  it('should remove dangerous attributes', () => {
    const input = '<div onclick="alert()">Click</div>';
    const output = sanitizeHTML(input);
    expect(output).not.toContain('onclick');
    expect(output).toContain('Click');
  });

  it('should remove event handlers', () => {
    const input = '<img src="x" onerror="alert()" />';
    const output = sanitizeHTML(input);
    expect(output).not.toContain('onerror');
  });

  it('should handle empty input', () => {
    expect(sanitizeHTML('')).toBe('');
    expect(sanitizeHTML(null as any)).toBe('');
    expect(sanitizeHTML(undefined as any)).toBe('');
  });

  it('should remove iframe tags', () => {
    const input = '<div><iframe src="evil.com"></iframe></div>';
    const output = sanitizeHTML(input);
    expect(output).not.toContain('<iframe');
  });

  it('should preserve safe HTML structure', () => {
    const input = `
      <html>
        <head><title>Test</title></head>
        <body>
          <h1>Title</h1>
          <p>Paragraph</p>
          <img src="image.jpg" alt="Image" />
        </body>
      </html>
    `;
    const output = sanitizeHTML(input);
    expect(output).toContain('<h1>');
    expect(output).toContain('<p>');
    expect(output).toContain('<img');
  });
});

describe('sanitizeHTMLTemplate', () => {
  it('should preserve template placeholders', () => {
    const input = '<div>{{firstName}} {{lastName}}</div>';
    const output = sanitizeHTMLTemplate(input);
    expect(output).toContain('{{firstName}}');
    expect(output).toContain('{{lastName}}');
  });

  it('should remove scripts but keep placeholders', () => {
    const input = '<div>{{firstName}} <script>alert("XSS")</script></div>';
    const output = sanitizeHTMLTemplate(input);
    expect(output).toContain('{{firstName}}');
    expect(output).not.toContain('<script>');
  });

  it('should handle multiple placeholders', () => {
    const input = `
      <div>
        <h1>{{eventName}}</h1>
        <p>{{firstName}} {{lastName}}</p>
        <p>{{barcodeNumber}}</p>
      </div>
    `;
    const output = sanitizeHTMLTemplate(input);
    expect(output).toContain('{{eventName}}');
    expect(output).toContain('{{firstName}}');
    expect(output).toContain('{{lastName}}');
    expect(output).toContain('{{barcodeNumber}}');
  });

  it('should handle placeholders with underscores', () => {
    const input = '<div>{{custom_field_name}}</div>';
    const output = sanitizeHTMLTemplate(input);
    expect(output).toContain('{{custom_field_name}}');
  });
});

describe('validateHTMLSafety', () => {
  it('should detect script tags', () => {
    const result = validateHTMLSafety('<script>alert()</script>');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('dangerous');
  });

  it('should detect event handlers', () => {
    const result = validateHTMLSafety('<div onclick="alert()">Click</div>');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('dangerous');
  });

  it('should detect javascript: URLs', () => {
    const result = validateHTMLSafety('<a href="javascript:alert()">Link</a>');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('dangerous');
  });

  it('should detect iframe tags', () => {
    const result = validateHTMLSafety('<iframe src="evil.com"></iframe>');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('dangerous');
  });

  it('should allow safe HTML', () => {
    const result = validateHTMLSafety('<div><p>Hello</p></div>');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should handle empty input', () => {
    const result = validateHTMLSafety('');
    expect(result.valid).toBe(true);
  });
});
