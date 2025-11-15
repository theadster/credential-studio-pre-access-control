/**
 * Tests for HTML Sanitization on Form Submit
 * 
 * Verifies that:
 * 1. Dangerous HTML (script tags, event handlers) is removed on save
 * 2. Safe HTML tags (div, span, p, etc.) are preserved
 * 3. Placeholder variables like {{firstName}} are preserved
 * 4. Sanitized HTML displays correctly when form is reopened
 * 
 * Requirements: 1.3, 1.4, 2.4, 2.5
 */

import { describe, it, expect } from 'vitest';
import { sanitizeHTMLTemplate } from '@/lib/sanitization';

describe('HTML Sanitization on Form Submit - OneSimpleAPI Templates', () => {
  describe('Dangerous HTML Removal', () => {
    it('should remove script tags from templates', () => {
      const input = '<div>Test <script>alert("XSS")</script></div>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).not.toContain('<script>');
      expect(output).toContain('<div>');
      expect(output).toContain('Test');
    });

    it('should remove event handlers from templates', () => {
      const input = '<div onclick="alert(\'XSS\')">Click me</div>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).not.toContain('onclick');
      expect(output).toContain('Click me');
      // The div tag should be present, even if malformed after sanitization
      expect(output).toMatch(/<div[^>]*>/);
    });

    it('should remove onerror handlers from img tags', () => {
      const input = '<img src="x" onerror="alert(\'XSS\')" />';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).not.toContain('onerror');
      expect(output).toContain('<img');
    });

    it('should remove iframe tags', () => {
      const input = '<div>Content <iframe src="evil.com"></iframe></div>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).not.toContain('<iframe');
      expect(output).toContain('<div>');
      expect(output).toContain('Content');
    });

    it('should remove javascript: protocol from links', () => {
      const input = '<a href="javascript:alert(\'XSS\')">Link</a>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).not.toContain('javascript:');
      expect(output).toContain('Link');
    });

    it('should remove object tags', () => {
      const input = '<div>Content <object data="evil.swf"></object></div>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).not.toContain('<object');
      expect(output).toContain('<div>');
      expect(output).toContain('Content');
    });

    it('should remove embed tags', () => {
      const input = '<div>Content <embed src="evil.swf"></div>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).not.toContain('<embed');
      expect(output).toContain('<div>');
      expect(output).toContain('Content');
    });

    it('should remove style tags', () => {
      const input = '<div>Content <style>body { background: red; }</style></div>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).not.toContain('<style');
      expect(output).toContain('<div>');
      expect(output).toContain('Content');
    });

    it('should remove multiple dangerous elements at once', () => {
      const input = `
        <div>
          <script>alert("XSS")</script>
          <p onclick="alert()">Paragraph</p>
          <iframe src="evil.com"></iframe>
          <img src="x" onerror="alert()" />
        </div>
      `;
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).not.toContain('<script>');
      expect(output).not.toContain('onclick');
      expect(output).not.toContain('<iframe');
      expect(output).not.toContain('onerror');
      expect(output).toContain('<div>');
      expect(output).toContain('<p>');
      expect(output).toContain('Paragraph');
    });
  });

  describe('Safe HTML Preservation', () => {
    it('should preserve div tags', () => {
      const input = '<div class="container">Content</div>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('<div');
      expect(output).toContain('Content');
      expect(output).toContain('</div>');
    });

    it('should preserve span tags', () => {
      const input = '<span class="highlight">Important</span>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('<span');
      expect(output).toContain('Important');
      expect(output).toContain('</span>');
    });

    it('should preserve p tags', () => {
      const input = '<p>Paragraph text</p>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('<p>');
      expect(output).toContain('Paragraph text');
      expect(output).toContain('</p>');
    });

    it('should preserve heading tags (h1-h6)', () => {
      const input = '<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('<h1>');
      expect(output).toContain('Title');
      expect(output).toContain('<h2>');
      expect(output).toContain('Subtitle');
      expect(output).toContain('<h3>');
      expect(output).toContain('Section');
    });

    it('should preserve img tags with safe attributes', () => {
      const input = '<img src="image.jpg" alt="Description" width="100" height="100" />';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('<img');
      expect(output).toContain('src=');
      expect(output).toContain('alt=');
    });

    it('should preserve a tags with safe href', () => {
      const input = '<a href="https://example.com">Link</a>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('<a');
      expect(output).toContain('href=');
      expect(output).toContain('Link');
    });

    it('should preserve strong and em tags', () => {
      const input = '<strong>Bold</strong> and <em>Italic</em>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('<strong>');
      expect(output).toContain('Bold');
      expect(output).toContain('<em>');
      expect(output).toContain('Italic');
    });

    it('should preserve ul and li tags', () => {
      const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('<ul>');
      expect(output).toContain('<li>');
      expect(output).toContain('Item 1');
      expect(output).toContain('Item 2');
    });

    it('should preserve table tags', () => {
      const input = '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('<table>');
      expect(output).toContain('<thead>');
      expect(output).toContain('<th>');
      expect(output).toContain('<tbody>');
      expect(output).toContain('<td>');
      expect(output).toContain('Header');
      expect(output).toContain('Data');
    });

    it('should preserve complex nested HTML structure', () => {
      const input = `
        <div class="card">
          <h2>Event Details</h2>
          <p>Welcome to our event!</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
          <img src="logo.jpg" alt="Logo" />
        </div>
      `;
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('<div');
      expect(output).toContain('<h2>');
      expect(output).toContain('<p>');
      expect(output).toContain('<ul>');
      expect(output).toContain('<li>');
      expect(output).toContain('<img');
      expect(output).toContain('Event Details');
      expect(output).toContain('Welcome to our event!');
    });

    it('should preserve safe class and id attributes', () => {
      const input = '<div class="container" id="main">Content</div>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('class=');
      expect(output).toContain('id=');
      expect(output).toContain('Content');
    });

    it('should preserve safe style attributes', () => {
      const input = '<div style="color: blue; font-size: 14px;">Styled content</div>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('style=');
      expect(output).toContain('Styled content');
    });
  });

  describe('Placeholder Variable Preservation', () => {
    it('should preserve {{firstName}} placeholder', () => {
      const input = '<div>{{firstName}}</div>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('{{firstName}}');
      expect(output).toContain('<div>');
    });

    it('should preserve {{lastName}} placeholder', () => {
      const input = '<div>{{lastName}}</div>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('{{lastName}}');
    });

    it('should preserve {{barcodeNumber}} placeholder', () => {
      const input = '<p>Barcode: {{barcodeNumber}}</p>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('{{barcodeNumber}}');
      expect(output).toContain('<p>');
    });

    it('should preserve multiple placeholders', () => {
      const input = '<div>{{firstName}} {{lastName}} - {{barcodeNumber}}</div>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('{{firstName}}');
      expect(output).toContain('{{lastName}}');
      expect(output).toContain('{{barcodeNumber}}');
    });

    it('should preserve placeholders with underscores', () => {
      const input = '<div>{{custom_field_name}}</div>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('{{custom_field_name}}');
    });

    it('should preserve placeholders with numbers', () => {
      const input = '<div>{{custom_field_1}} {{custom_field_2}}</div>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('{{custom_field_1}}');
      expect(output).toContain('{{custom_field_2}}');
    });

    it('should preserve placeholders while removing dangerous HTML', () => {
      const input = '<div>{{firstName}} <script>alert("XSS")</script> {{lastName}}</div>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('{{firstName}}');
      expect(output).toContain('{{lastName}}');
      expect(output).not.toContain('<script>');
      expect(output).toContain('<div>');
    });

    it('should preserve placeholders in complex templates', () => {
      const input = `
        <div class="credential">
          <h1>{{eventName}}</h1>
          <p>Name: {{firstName}} {{lastName}}</p>
          <p>Barcode: {{barcodeNumber}}</p>
          <p>Custom: {{custom_field_1}}</p>
          <img src="{{photoUrl}}" alt="Photo" />
        </div>
      `;
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('{{eventName}}');
      expect(output).toContain('{{firstName}}');
      expect(output).toContain('{{lastName}}');
      expect(output).toContain('{{barcodeNumber}}');
      expect(output).toContain('{{custom_field_1}}');
      expect(output).toContain('{{photoUrl}}');
    });

    it('should preserve placeholders in attributes', () => {
      const input = '<img src="{{photoUrl}}" alt="{{firstName}} {{lastName}}" />';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('{{photoUrl}}');
      expect(output).toContain('{{firstName}}');
      expect(output).toContain('{{lastName}}');
    });
  });

  describe('Combined Scenarios', () => {
    it('should handle real-world OneSimpleAPI Form Data Value Template', () => {
      const input = `
        <div class="attendee-card">
          <h2>{{firstName}} {{lastName}}</h2>
          <p>Email: {{email}}</p>
          <p>Barcode: {{barcodeNumber}}</p>
          <script>alert("XSS")</script>
          <img src="{{photoUrl}}" alt="Attendee Photo" />
        </div>
      `;
      const output = sanitizeHTMLTemplate(input);
      
      // Placeholders preserved
      expect(output).toContain('{{firstName}}');
      expect(output).toContain('{{lastName}}');
      expect(output).toContain('{{email}}');
      expect(output).toContain('{{barcodeNumber}}');
      expect(output).toContain('{{photoUrl}}');
      
      // Safe HTML preserved
      expect(output).toContain('<div');
      expect(output).toContain('<h2>');
      expect(output).toContain('<p>');
      expect(output).toContain('<img');
      
      // Dangerous HTML removed
      expect(output).not.toContain('<script>');
    });

    it('should handle real-world OneSimpleAPI Record Template', () => {
      const input = `
        <div class="record">
          <p><strong>Name:</strong> {{firstName}} {{lastName}}</p>
          <p><strong>Barcode:</strong> {{barcodeNumber}}</p>
          <p onclick="alert()"><strong>Status:</strong> {{status}}</p>
        </div>
      `;
      const output = sanitizeHTMLTemplate(input);
      
      // Placeholders preserved
      expect(output).toContain('{{firstName}}');
      expect(output).toContain('{{lastName}}');
      expect(output).toContain('{{barcodeNumber}}');
      expect(output).toContain('{{status}}');
      
      // Safe HTML preserved
      expect(output).toContain('<div');
      expect(output).toContain('<p>');
      expect(output).toContain('<strong>');
      
      // Event handlers removed
      expect(output).not.toContain('onclick');
    });

    it('should handle empty or null input', () => {
      expect(sanitizeHTMLTemplate('')).toBe('');
      expect(sanitizeHTMLTemplate(null as any)).toBe('');
      expect(sanitizeHTMLTemplate(undefined as any)).toBe('');
    });

    it('should handle plain text without HTML', () => {
      const input = '{{firstName}} {{lastName}}';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toBe('{{firstName}} {{lastName}}');
    });

    it('should handle HTML with only safe content', () => {
      const input = '<div><p>{{firstName}}</p></div>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('<div>');
      expect(output).toContain('<p>');
      expect(output).toContain('{{firstName}}');
    });
  });

  describe('Sanitized HTML Display on Reopen', () => {
    it('should maintain sanitized HTML structure when reopened', () => {
      // Simulate first save with dangerous HTML
      const dangerousInput = '<div>Test <script>alert("XSS")</script> {{firstName}}</div>';
      const sanitized = sanitizeHTMLTemplate(dangerousInput);
      
      // Verify sanitization worked
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('{{firstName}}');
      expect(sanitized).toContain('<div>');
      expect(sanitized).toContain('Test');
      
      // Simulate reopening form with sanitized value
      // The sanitized value should remain safe
      const reopened = sanitizeHTMLTemplate(sanitized);
      expect(reopened).toBe(sanitized); // Should be idempotent
    });

    it('should be idempotent - sanitizing twice produces same result', () => {
      const input = '<div>{{firstName}} <script>alert()</script></div>';
      const firstPass = sanitizeHTMLTemplate(input);
      const secondPass = sanitizeHTMLTemplate(firstPass);
      
      expect(firstPass).toBe(secondPass);
    });

    it('should maintain complex structure when reopened', () => {
      const complexInput = `
        <div class="card">
          <h2>{{eventName}}</h2>
          <p>{{firstName}} {{lastName}}</p>
          <script>alert()</script>
        </div>
      `;
      const sanitized = sanitizeHTMLTemplate(complexInput);
      
      // Verify structure is maintained
      expect(sanitized).toContain('<div');
      expect(sanitized).toContain('<h2>');
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('{{eventName}}');
      expect(sanitized).toContain('{{firstName}}');
      expect(sanitized).toContain('{{lastName}}');
      expect(sanitized).not.toContain('<script>');
      
      // Verify idempotency
      const reopened = sanitizeHTMLTemplate(sanitized);
      expect(reopened).toBe(sanitized);
    });
  });
});
