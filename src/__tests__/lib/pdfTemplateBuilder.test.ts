import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  absolutizeUrl,
  replacePlaceholders,
  buildRecordHtml,
  buildPdfHtml,
  parseOneSimpleApiResponse,
} from '@/lib/pdfTemplateBuilder';

// ─── escapeHtml ───────────────────────────────────────────────────────────────

describe('escapeHtml', () => {
  it('escapes &', () => expect(escapeHtml('&')).toBe('&amp;'));
  it('escapes <', () => expect(escapeHtml('<')).toBe('&lt;'));
  it('escapes >', () => expect(escapeHtml('>')).toBe('&gt;'));
  it('escapes "', () => expect(escapeHtml('"')).toBe('&quot;'));
  it("escapes '", () => expect(escapeHtml("'")).toBe('&#39;'));
  it('escapes mixed string', () =>
    expect(escapeHtml('Hello & <World>')).toBe('Hello &amp; &lt;World&gt;'));
  it('returns empty string unchanged', () => expect(escapeHtml('')).toBe(''));
  it('leaves plain text unchanged', () =>
    expect(escapeHtml('no special chars')).toBe('no special chars'));
});

// ─── absolutizeUrl ────────────────────────────────────────────────────────────

describe('absolutizeUrl', () => {
  it('prepends base to path with leading slash', () =>
    expect(absolutizeUrl('/path', 'http://example.com')).toBe('http://example.com/path'));

  it('prepends base to path without leading slash', () =>
    expect(absolutizeUrl('path', 'http://example.com')).toBe('http://example.com/path'));

  it('leaves http:// URL unchanged', () =>
    expect(absolutizeUrl('http://already.com/abs', 'http://example.com')).toBe(
      'http://already.com/abs'
    ));

  it('leaves https:// URL unchanged', () =>
    expect(absolutizeUrl('https://already.com/abs', 'http://example.com')).toBe(
      'https://already.com/abs'
    ));

  it('returns empty string when url is empty', () =>
    expect(absolutizeUrl('', 'http://example.com')).toBe(''));

  it('handles empty base URL', () =>
    expect(absolutizeUrl('/path', '')).toBe('/path'));
});

// ─── replacePlaceholders ─────────────────────────────────────────────────────

describe('replacePlaceholders', () => {
  it('replaces a normal placeholder', () =>
    expect(replacePlaceholders('Hello {{name}}', { '{{name}}': 'World' })).toBe('Hello World'));

  it('replaces an HTML-escaped placeholder', () => {
    const template = 'Hello &#123;&#123;name&#125;&#125;';
    expect(replacePlaceholders(template, { '{{name}}': 'World' })).toBe('Hello World');
  });

  it('leaves unknown placeholders unchanged', () =>
    expect(replacePlaceholders('Hello {{missing}}', {})).toBe('Hello {{missing}}'));

  it('replaces multiple placeholders', () => {
    const result = replacePlaceholders('{{a}} and {{b}}', {
      '{{a}}': 'foo',
      '{{b}}': 'bar',
    });
    expect(result).toBe('foo and bar');
  });

  it('replaces all occurrences of the same placeholder', () => {
    const result = replacePlaceholders('{{x}} {{x}}', { '{{x}}': 'hi' });
    expect(result).toBe('hi hi');
  });
});

// ─── buildRecordHtml ──────────────────────────────────────────────────────────

describe('buildRecordHtml', () => {
  const eventSettings = {
    eventName: 'Test Event',
    eventDate: '2025-06-01T00:00:00.000Z',
    eventTime: '09:00',
    eventLocation: 'Main Hall',
  };

  const customFieldsMap = new Map([
    ['cf1', { internalFieldName: 'company', $id: 'cf1' }],
  ]);

  const attendee = {
    firstName: 'Jane',
    lastName: "O'Brien",
    barcodeNumber: 'BC001',
    credentialUrl: '/credentials/jane',
    photoUrl: '/photos/jane.jpg',
    customFieldValues: JSON.stringify({ cf1: 'Acme Corp' }),
  };

  const template =
    '<div>{{firstName}} {{lastName}} {{barcodeNumber}} {{credentialUrl}} {{photoUrl}} {{company}}</div>';

  it('replaces standard attendee fields', () => {
    const html = buildRecordHtml(attendee, eventSettings, customFieldsMap, template, 'https://site.com');
    expect(html).toContain('Jane');
    expect(html).toContain('BC001');
  });

  it('HTML-escapes text values', () => {
    const html = buildRecordHtml(attendee, eventSettings, customFieldsMap, template, 'https://site.com');
    expect(html).toContain('O&#39;Brien');
    expect(html).not.toContain("O'Brien");
  });

  it('absolutizes credentialUrl', () => {
    const html = buildRecordHtml(attendee, eventSettings, customFieldsMap, template, 'https://site.com');
    expect(html).toContain('https://site.com/credentials/jane');
  });

  it('absolutizes photoUrl', () => {
    const html = buildRecordHtml(attendee, eventSettings, customFieldsMap, template, 'https://site.com');
    expect(html).toContain('https://site.com/photos/jane.jpg');
  });

  it('replaces custom field placeholders', () => {
    const html = buildRecordHtml(attendee, eventSettings, customFieldsMap, template, 'https://site.com');
    expect(html).toContain('Acme Corp');
  });

  it('handles customFieldValues as an object (not string)', () => {
    const attendeeObj = { ...attendee, customFieldValues: { cf1: 'Direct Corp' } };
    const html = buildRecordHtml(attendeeObj, eventSettings, customFieldsMap, template, 'https://site.com');
    expect(html).toContain('Direct Corp');
  });
});

// ─── buildPdfHtml ─────────────────────────────────────────────────────────────

describe('buildPdfHtml', () => {
  it('composes two records into the main template', () => {
    const attendees = [
      { firstName: 'Alice', lastName: 'A', barcodeNumber: '1', credentialUrl: '', photoUrl: '', customFieldValues: {} },
      { firstName: 'Bob', lastName: 'B', barcodeNumber: '2', credentialUrl: '', photoUrl: '', customFieldValues: {} },
    ];
    const eventSettings = { eventName: 'Conf', eventDate: null, eventTime: '', eventLocation: '' };
    const customFieldsMap = new Map<string, any>();
    const recordTemplate = '<p>{{firstName}}</p>';
    const mainTemplate = '<html>{{credentialRecords}}</html>';

    const html = buildPdfHtml({
      attendees,
      eventSettings,
      customFieldsMap,
      recordTemplate,
      mainTemplate,
      siteUrl: 'https://site.com',
    });

    expect(html).toContain('<p>Alice</p>');
    expect(html).toContain('<p>Bob</p>');
    expect(html).toContain('<html>');
  });

  it('replaces event-level placeholders in main template', () => {
    const attendees = [
      { firstName: 'X', lastName: '', barcodeNumber: '', credentialUrl: '', photoUrl: '', customFieldValues: {} },
    ];
    const eventSettings = { eventName: 'Summit', eventDate: null, eventTime: '10:00', eventLocation: 'Hall A' };
    const customFieldsMap = new Map<string, any>();
    const mainTemplate = '{{eventName}} - {{eventLocation}} {{credentialRecords}}';

    const html = buildPdfHtml({
      attendees,
      eventSettings,
      customFieldsMap,
      recordTemplate: '',
      mainTemplate,
      siteUrl: '',
    });

    expect(html).toContain('Summit');
    expect(html).toContain('Hall A');
  });
});

// ─── parseOneSimpleApiResponse ────────────────────────────────────────────────

describe('parseOneSimpleApiResponse', () => {
  it('parses JSON with url field', () => {
    const result = parseOneSimpleApiResponse('{"url":"https://example.com/file.pdf"}');
    expect(result).toEqual({ url: 'https://example.com/file.pdf' });
  });

  it('parses plain https URL', () => {
    const result = parseOneSimpleApiResponse('https://example.com/file.pdf');
    expect(result).toEqual({ url: 'https://example.com/file.pdf' });
  });

  it('parses plain http URL', () => {
    const result = parseOneSimpleApiResponse('http://example.com/file.pdf');
    expect(result).toEqual({ url: 'http://example.com/file.pdf' });
  });

  it('returns error for JSON missing url field', () => {
    const result = parseOneSimpleApiResponse('{"other":"value"}');
    expect(result).toHaveProperty('error');
    expect((result as any).url).toBeUndefined();
  });

  it('returns error for non-URL plain text', () => {
    const result = parseOneSimpleApiResponse('not-a-url');
    expect(result).toHaveProperty('error');
  });

  it('returns error for empty string', () => {
    const result = parseOneSimpleApiResponse('');
    expect(result).toHaveProperty('error');
  });

  it('returns error for invalid JSON that is not a URL', () => {
    const result = parseOneSimpleApiResponse('invalid json{');
    expect(result).toHaveProperty('error');
  });

  it('handles plain URL with surrounding whitespace', () => {
    const result = parseOneSimpleApiResponse('  https://example.com/file.pdf  ');
    expect(result).toEqual({ url: 'https://example.com/file.pdf' });
  });
});
