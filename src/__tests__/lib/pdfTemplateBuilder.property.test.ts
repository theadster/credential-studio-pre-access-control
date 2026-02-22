import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  escapeHtml,
  absolutizeUrl,
  buildRecordHtml,
  parseOneSimpleApiResponse,
} from '@/lib/pdfTemplateBuilder';

// ─── Property 6: HTML template placeholder replacement ────────────────────────
// Feature: async-pdf-generation, Property 6: HTML template placeholder replacement
// Validates: Requirement 3.4

describe('Property 6: HTML template placeholder replacement', () => {
  it('buildRecordHtml output contains no unreplaced {{firstName}} token', () => {
    fc.assert(
      fc.property(fc.string(), (firstName) => {
        const attendee = {
          firstName,
          lastName: '',
          barcodeNumber: '',
          credentialUrl: '',
          photoUrl: '',
          customFieldValues: {},
        };
        const eventSettings = {
          eventName: '',
          eventDate: null,
          eventTime: '',
          eventLocation: '',
        };
        const customFieldsMap = new Map<string, any>();
        const recordTemplate = '<span>{{firstName}}</span>';

        const html = buildRecordHtml(
          attendee,
          eventSettings,
          customFieldsMap,
          recordTemplate,
          'https://site.com'
        );

        // No unreplaced token should remain
        expect(html).not.toContain('{{firstName}}');
        // The escaped value of firstName should appear in the output
        expect(html).toContain(escapeHtml(firstName));
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 7: HTML escaping correctness ────────────────────────────────────
// Feature: async-pdf-generation, Property 7: HTML escaping correctness
// Validates: Requirement 3.4

describe('Property 7: HTML escaping correctness', () => {
  it('escapeHtml output contains no raw < > " or single-quote', () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        const escaped = escapeHtml(str);
        expect(escaped).not.toMatch(/</);
        expect(escaped).not.toMatch(/>/);
        expect(escaped).not.toMatch(/"/);
        expect(escaped).not.toMatch(/'/);
      }),
      { numRuns: 100 }
    );
  });

  it('any & in escapeHtml output is part of a known entity reference', () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        const escaped = escapeHtml(str);
        // Every & must be followed by amp;, lt;, gt;, quot;, or #39;
        const ampMatches = escaped.match(/&[^;]*/g) ?? [];
        for (const match of ampMatches) {
          expect(['&amp', '&lt', '&gt', '&quot', '&#39']).toContain(match);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 8: URL absolutization ──────────────────────────────────────────
// Feature: async-pdf-generation, Property 8: URL absolutization
// Validates: Requirement 3.4

describe('Property 8: URL absolutization', () => {
  it('relative paths get base URL prepended', () => {
    fc.assert(
      fc.property(
        fc.webUrl(),
        fc.string({ minLength: 1 }).filter((s) => !s.startsWith('http')),
        (base, relativePath) => {
          const result = absolutizeUrl(relativePath, base);
          expect(result.startsWith(base)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('absolute http:// URLs pass through unchanged', () => {
    fc.assert(
      fc.property(fc.webUrl(), (url) => {
        const httpUrl = url.replace(/^https:\/\//, 'http://');
        expect(absolutizeUrl(httpUrl, 'https://other.com')).toBe(httpUrl);
      }),
      { numRuns: 100 }
    );
  });

  it('absolute https:// URLs pass through unchanged', () => {
    fc.assert(
      fc.property(fc.webUrl(), (url) => {
        expect(absolutizeUrl(url, 'https://other.com')).toBe(url);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 9: OneSimpleAPI response parsing ────────────────────────────────
// Feature: async-pdf-generation, Property 9: OneSimpleAPI response parsing
// Validates: Requirements 3.6, 3.8

describe('Property 9: OneSimpleAPI response parsing', () => {
  it('valid JSON with url field returns { url } with no error', () => {
    fc.assert(
      fc.property(fc.webUrl(), (url) => {
        const json = JSON.stringify({ url });
        const result = parseOneSimpleApiResponse(json);
        expect(result).toHaveProperty('url', url);
        expect(result).not.toHaveProperty('error');
      }),
      { numRuns: 100 }
    );
  });

  it('plain text https URL returns { url } with no error', () => {
    fc.assert(
      fc.property(fc.webUrl(), (url) => {
        const result = parseOneSimpleApiResponse(url);
        expect(result).toHaveProperty('url', url);
        expect(result).not.toHaveProperty('error');
      }),
      { numRuns: 100 }
    );
  });

  it('plain text http URL returns { url } with no error', () => {
    fc.assert(
      fc.property(fc.webUrl(), (url) => {
        const httpUrl = url.replace(/^https:\/\//, 'http://');
        const result = parseOneSimpleApiResponse(httpUrl);
        expect(result).toHaveProperty('url', httpUrl);
        expect(result).not.toHaveProperty('error');
      }),
      { numRuns: 100 }
    );
  });

  it('strings that are neither valid JSON-with-url nor valid URLs return { error }', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => {
          const trimmed = s.trim();
          if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return false;
          try {
            const p = JSON.parse(s);
            return typeof p?.url !== 'string';
          } catch {
            return true;
          }
        }),
        (invalidInput) => {
          const result = parseOneSimpleApiResponse(invalidInput);
          expect(result).toHaveProperty('error');
          expect(result).not.toHaveProperty('url');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 12: attendeeIds JSON round-trip ─────────────────────────────────
// Feature: async-pdf-generation, Property 12: attendeeIds JSON round-trip
// Validates: Requirements 1.1, 3.2

describe('Property 12: attendeeIds JSON round-trip', () => {
  it('JSON.parse(JSON.stringify(arr)) deep-equals the original array', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (arr) => {
        const serialized = JSON.stringify(arr);
        const deserialized = JSON.parse(serialized);
        expect(deserialized).toEqual(arr);
      }),
      { numRuns: 100 }
    );
  });
});
