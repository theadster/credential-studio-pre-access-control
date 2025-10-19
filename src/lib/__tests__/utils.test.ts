import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../utils';

describe('escapeHtml', () => {
  it('should escape ampersand', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('should escape less than', () => {
    expect(escapeHtml('5 < 10')).toBe('5 &lt; 10');
  });

  it('should escape greater than', () => {
    expect(escapeHtml('10 > 5')).toBe('10 &gt; 5');
  });

  it('should escape double quotes', () => {
    expect(escapeHtml('Say "hello"')).toBe('Say &quot;hello&quot;');
  });

  it('should escape single quotes', () => {
    expect(escapeHtml("It's working")).toBe('It&#x27;s working');
  });

  it('should escape forward slash', () => {
    expect(escapeHtml('path/to/file')).toBe('path&#x2F;to&#x2F;file');
  });

  it('should escape script tags', () => {
    const malicious = '<script>alert("xss")</script>';
    const escaped = '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;';
    expect(escapeHtml(malicious)).toBe(escaped);
  });

  it('should escape multiple special characters', () => {
    const input = '<div class="test" data-value=\'5 & 10\'>Content</div>';
    const expected = '&lt;div class=&quot;test&quot; data-value=&#x27;5 &amp; 10&#x27;&gt;Content&lt;&#x2F;div&gt;';
    expect(escapeHtml(input)).toBe(expected);
  });

  it('should not modify safe strings', () => {
    expect(escapeHtml('user@example.com')).toBe('user@example.com');
    expect(escapeHtml('Hello World')).toBe('Hello World');
    expect(escapeHtml('123-456-7890')).toBe('123-456-7890');
  });

  it('should handle empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('should handle strings with only special characters', () => {
    expect(escapeHtml('&<>"\'/'))
      .toBe('&amp;&lt;&gt;&quot;&#x27;&#x2F;');
  });

  it('should prevent XSS in email addresses with malicious content', () => {
    const maliciousEmail = 'user+<script>alert(1)</script>@example.com';
    const escaped = 'user+&lt;script&gt;alert(1)&lt;&#x2F;script&gt;@example.com';
    expect(escapeHtml(maliciousEmail)).toBe(escaped);
  });

  it('should handle consecutive special characters', () => {
    expect(escapeHtml('<<>>')).toBe('&lt;&lt;&gt;&gt;');
    expect(escapeHtml('&&')).toBe('&amp;&amp;');
  });

  it('should preserve unicode characters', () => {
    expect(escapeHtml('Hello 世界')).toBe('Hello 世界');
    expect(escapeHtml('Café ☕')).toBe('Café ☕');
  });

  it('should handle mixed content', () => {
    const input = 'Email: user@example.com & Name: <John "Doe">';
    const expected = 'Email: user@example.com &amp; Name: &lt;John &quot;Doe&quot;&gt;';
    expect(escapeHtml(input)).toBe(expected);
  });
});
