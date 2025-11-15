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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEventSettingsForm } from '@/components/EventSettingsForm/useEventSettingsForm';
import { EventSettings } from '@/components/EventSettingsForm/types';
import { sanitizeHTMLTemplate } from '@/lib/sanitization';

// Mock the SweetAlert hook
vi.mock('@/hooks/useSweetAlert', () => ({
  useSweetAlert: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

// Mock fetch for integration status
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ cloudinary: true, switchboard: true }),
  } as Response)
);

describe('HTML Sanitization on Form Submit', () => {
  const mockEventSettings: EventSettings = {
    eventName: 'Test Event',
    barcodeType: 'numerical',
    barcodeLength: 6,
    cloudinaryEnabled: false,
    cloudinaryCloudName: '',
    cloudinaryUploadPreset: '',
    cloudinaryAutoOptimize: false,
    cloudinaryGenerateThumbnails: false,
    cloudinaryDisableSkipCrop: false,
    cloudinaryCropAspectRatio: '1',
    switchboardEnabled: false,
    switchboardApiEndpoint: '',
    switchboardAuthHeaderType: 'Bearer',
    switchboardTemplateId: '',
    switchboardRequestBody: '',
    oneSimpleApiEnabled: true,
    oneSimpleApiUrl: 'https://api.example.com/webhook',
    oneSimpleApiFormDataKey: 'data',
    oneSimpleApiFormDataValue: '',
    oneSimpleApiRecordTemplate: '',
    customFields: [],
    switchboardFieldMappings: []
  };

  let mockOnSave: ReturnType<typeof vi.fn>;
  let mockOnClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSave = vi.fn().mockResolvedValue(undefined);
    mockOnClose = vi.fn();
    vi.clearAllMocks();
  });

  describe('Dangerous HTML Removal', () => {
    it('should remove script tags from Form Data Value Template on submit', async () => {
      const { result } = renderHook(() =>
        useEventSettingsForm({
          eventSettings: mockEventSettings,
          isOpen: true,
          onSave: mockOnSave,
          onClose: mockOnClose,
        })
      );

      // Set dangerous HTML with script tag
      const dangerousHtml = '<div>Test <script>alert("XSS")</script></div>';
      
      act(() => {
        result.current.handleInputChange('oneSimpleApiFormDataValue', dangerousHtml);
      });

      // Submit the form
      await act(async () => {
        await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      });

      // Verify onSave was called with sanitized HTML
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
        const savedSettings = mockOnSave.mock.calls[0][0];
        expect(savedSettings.oneSimpleApiFormDataValue).not.toContain('<script>');
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('<div>');
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('Test');
      });
    });

    it('should remove event handlers from Form Data Value Template on submit', async () => {
      const { result } = renderHook(() =>
        useEventSettingsForm({
          eventSettings: mockEventSettings,
          isOpen: true,
          onSave: mockOnSave,
          onClose: mockOnClose,
        })
      );

      // Set HTML with event handler
      const htmlWithEvent = '<div onclick="alert(\'XSS\')">Click me</div>';
      
      act(() => {
        result.current.handleInputChange('oneSimpleApiFormDataValue', htmlWithEvent);
      });

      // Submit the form
      await act(async () => {
        await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      });

      // Verify onSave was called with sanitized HTML
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
        const savedSettings = mockOnSave.mock.calls[0][0];
        expect(savedSettings.oneSimpleApiFormDataValue).not.toContain('onclick');
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('Click me');
      });
    });

    it('should remove script tags from Record Template on submit', async () => {
      const { result } = renderHook(() =>
        useEventSettingsForm({
          eventSettings: mockEventSettings,
          isOpen: true,
          onSave: mockOnSave,
          onClose: mockOnClose,
        })
      );

      // Set dangerous HTML with script tag
      const dangerousHtml = '<p>Record <script>alert("XSS")</script></p>';
      
      act(() => {
        result.current.handleInputChange('oneSimpleApiRecordTemplate', dangerousHtml);
      });

      // Submit the form
      await act(async () => {
        await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      });

      // Verify onSave was called with sanitized HTML
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
        const savedSettings = mockOnSave.mock.calls[0][0];
        expect(savedSettings.oneSimpleApiRecordTemplate).not.toContain('<script>');
        expect(savedSettings.oneSimpleApiRecordTemplate).toContain('<p>');
        expect(savedSettings.oneSimpleApiRecordTemplate).toContain('Record');
      });
    });

    it('should remove iframe tags on submit', async () => {
      const { result } = renderHook(() =>
        useEventSettingsForm({
          eventSettings: mockEventSettings,
          isOpen: true,
          onSave: mockOnSave,
          onClose: mockOnClose,
        })
      );

      // Set HTML with iframe
      const htmlWithIframe = '<div>Content <iframe src="evil.com"></iframe></div>';
      
      act(() => {
        result.current.handleInputChange('oneSimpleApiFormDataValue', htmlWithIframe);
      });

      // Submit the form
      await act(async () => {
        await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      });

      // Verify onSave was called with sanitized HTML
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
        const savedSettings = mockOnSave.mock.calls[0][0];
        expect(savedSettings.oneSimpleApiFormDataValue).not.toContain('<iframe');
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('Content');
      });
    });

    it('should remove javascript: protocol on submit', async () => {
      const { result } = renderHook(() =>
        useEventSettingsForm({
          eventSettings: mockEventSettings,
          isOpen: true,
          onSave: mockOnSave,
          onClose: mockOnClose,
        })
      );

      // Set HTML with javascript: protocol
      const htmlWithJsProtocol = '<a href="javascript:alert(\'XSS\')">Link</a>';
      
      act(() => {
        result.current.handleInputChange('oneSimpleApiFormDataValue', htmlWithJsProtocol);
      });

      // Submit the form
      await act(async () => {
        await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      });

      // Verify onSave was called with sanitized HTML
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
        const savedSettings = mockOnSave.mock.calls[0][0];
        expect(savedSettings.oneSimpleApiFormDataValue).not.toContain('javascript:');
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('Link');
      });
    });
  });

  describe('Safe HTML Preservation', () => {
    it('should preserve div tags on submit', async () => {
      const { result } = renderHook(() =>
        useEventSettingsForm({
          eventSettings: mockEventSettings,
          isOpen: true,
          onSave: mockOnSave,
          onClose: mockOnClose,
        })
      );

      const safeHtml = '<div class="container">Content</div>';
      
      act(() => {
        result.current.handleInputChange('oneSimpleApiFormDataValue', safeHtml);
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
        const savedSettings = mockOnSave.mock.calls[0][0];
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('<div');
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('Content');
      });
    });

    it('should preserve span tags on submit', async () => {
      const { result } = renderHook(() =>
        useEventSettingsForm({
          eventSettings: mockEventSettings,
          isOpen: true,
          onSave: mockOnSave,
          onClose: mockOnClose,
        })
      );

      const safeHtml = '<span class="highlight">Important</span>';
      
      act(() => {
        result.current.handleInputChange('oneSimpleApiFormDataValue', safeHtml);
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
        const savedSettings = mockOnSave.mock.calls[0][0];
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('<span');
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('Important');
      });
    });

    it('should preserve p tags on submit', async () => {
      const { result } = renderHook(() =>
        useEventSettingsForm({
          eventSettings: mockEventSettings,
          isOpen: true,
          onSave: mockOnSave,
          onClose: mockOnClose,
        })
      );

      const safeHtml = '<p>Paragraph text</p>';
      
      act(() => {
        result.current.handleInputChange('oneSimpleApiFormDataValue', safeHtml);
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
        const savedSettings = mockOnSave.mock.calls[0][0];
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('<p>');
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('Paragraph text');
      });
    });

    it('should preserve heading tags on submit', async () => {
      const { result } = renderHook(() =>
        useEventSettingsForm({
          eventSettings: mockEventSettings,
          isOpen: true,
          onSave: mockOnSave,
          onClose: mockOnClose,
        })
      );

      const safeHtml = '<h1>Title</h1><h2>Subtitle</h2>';
      
      act(() => {
        result.current.handleInputChange('oneSimpleApiFormDataValue', safeHtml);
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
        const savedSettings = mockOnSave.mock.calls[0][0];
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('<h1>');
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('<h2>');
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('Title');
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('Subtitle');
      });
    });

    it('should preserve img tags with safe attributes on submit', async () => {
      const { result } = renderHook(() =>
        useEventSettingsForm({
          eventSettings: mockEventSettings,
          isOpen: true,
          onSave: mockOnSave,
          onClose: mockOnClose,
        })
      );

      const safeHtml = '<img src="image.jpg" alt="Description" />';
      
      act(() => {
        result.current.handleInputChange('oneSimpleApiFormDataValue', safeHtml);
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
        const savedSettings = mockOnSave.mock.calls[0][0];
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('<img');
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('src=');
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('alt=');
      });
    });

    it('should preserve complex nested HTML structure on submit', async () => {
      const { result } = renderHook(() =>
        useEventSettingsForm({
          eventSettings: mockEventSettings,
          isOpen: true,
          onSave: mockOnSave,
          onClose: mockOnClose,
        })
      );

      const complexHtml = `
        <div class="card">
          <h2>Event Details</h2>
          <p>Welcome to our event!</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      `;
      
      act(() => {
        result.current.handleInputChange('oneSimpleApiFormDataValue', complexHtml);
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
        const savedSettings = mockOnSave.mock.calls[0][0];
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('<div');
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('<h2>');
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('<p>');
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('<ul>');
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('<li>');
      });
    });
  });

  describe('Placeholder Variable Preservation', () => {
    it('should preserve {{firstName}} placeholder on submit', async () => {
      const { result } = renderHook(() =>
        useEventSettingsForm({
          eventSettings: mockEventSettings,
          isOpen: true,
          onSave: mockOnSave,
          onClose: mockOnClose,
        })
      );

      const htmlWithPlaceholder = '<div>{{firstName}}</div>';
      
      act(() => {
        result.current.handleInputChange('oneSimpleApiFormDataValue', htmlWithPlaceholder);
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
        const savedSettings = mockOnSave.mock.calls[0][0];
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('{{firstName}}');
      });
    });

    it('should preserve multiple placeholders on submit', async () => {
      const { result } = renderHook(() =>
        useEventSettingsForm({
          eventSettings: mockEventSettings,
          isOpen: true,
          onSave: mockOnSave,
          onClose: mockOnClose,
        })
      );

      const htmlWithPlaceholders = '<div>{{firstName}} {{lastName}} - {{barcodeNumber}}</div>';
      
      act(() => {
        result.current.handleInputChange('oneSimpleApiFormDataValue', htmlWithPlaceholders);
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
        const savedSettings = mockOnSave.mock.calls[0][0];
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('{{firstName}}');
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('{{lastName}}');
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('{{barcodeNumber}}');
      });
    });

    it('should preserve placeholders with underscores on submit', async () => {
      const { result } = renderHook(() =>
        useEventSettingsForm({
          eventSettings: mockEventSettings,
          isOpen: true,
          onSave: mockOnSave,
          onClose: mockOnClose,
        })
      );

      const htmlWithPlaceholder = '<div>{{custom_field_name}}</div>';
      
      act(() => {
        result.current.handleInputChange('oneSimpleApiFormDataValue', htmlWithPlaceholder);
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
        const savedSettings = mockOnSave.mock.calls[0][0];
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('{{custom_field_name}}');
      });
    });

    it('should preserve placeholders while removing dangerous HTML on submit', async () => {
      const { result } = renderHook(() =>
        useEventSettingsForm({
          eventSettings: mockEventSettings,
          isOpen: true,
          onSave: mockOnSave,
          onClose: mockOnClose,
        })
      );

      const mixedHtml = '<div>{{firstName}} <script>alert("XSS")</script> {{lastName}}</div>';
      
      act(() => {
        result.current.handleInputChange('oneSimpleApiFormDataValue', mixedHtml);
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
        const savedSettings = mockOnSave.mock.calls[0][0];
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('{{firstName}}');
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('{{lastName}}');
        expect(savedSettings.oneSimpleApiFormDataValue).not.toContain('<script>');
      });
    });
  });

  describe('Sanitized HTML Display on Reopen', () => {
    it('should display sanitized HTML correctly when form is reopened', async () => {
      // First submission with dangerous HTML
      const { result: result1 } = renderHook(() =>
        useEventSettingsForm({
          eventSettings: mockEventSettings,
          isOpen: true,
          onSave: mockOnSave,
          onClose: mockOnClose,
        })
      );

      const dangerousHtml = '<div>Test <script>alert("XSS")</script> {{firstName}}</div>';
      
      act(() => {
        result1.current.handleInputChange('oneSimpleApiFormDataValue', dangerousHtml);
      });

      await act(async () => {
        await result1.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      });

      // Get the sanitized value that was saved
      const savedSettings = mockOnSave.mock.calls[0][0];
      const sanitizedValue = savedSettings.oneSimpleApiFormDataValue;

      // Reopen form with sanitized settings
      const reopenedSettings = {
        ...mockEventSettings,
        oneSimpleApiFormDataValue: sanitizedValue
      };

      const { result: result2 } = renderHook(() =>
        useEventSettingsForm({
          eventSettings: reopenedSettings,
          isOpen: true,
          onSave: mockOnSave,
          onClose: mockOnClose,
        })
      );

      // Verify the form data contains sanitized HTML
      expect(result2.current.formData.oneSimpleApiFormDataValue).not.toContain('<script>');
      expect(result2.current.formData.oneSimpleApiFormDataValue).toContain('{{firstName}}');
      expect(result2.current.formData.oneSimpleApiFormDataValue).toContain('<div>');
      expect(result2.current.formData.oneSimpleApiFormDataValue).toContain('Test');
    });

    it('should maintain safe HTML structure when reopened', async () => {
      const { result: result1 } = renderHook(() =>
        useEventSettingsForm({
          eventSettings: mockEventSettings,
          isOpen: true,
          onSave: mockOnSave,
          onClose: mockOnClose,
        })
      );

      const safeHtml = '<div class="card"><h2>{{eventName}}</h2><p>{{firstName}} {{lastName}}</p></div>';
      
      act(() => {
        result1.current.handleInputChange('oneSimpleApiFormDataValue', safeHtml);
      });

      await act(async () => {
        await result1.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      });

      const savedSettings = mockOnSave.mock.calls[0][0];
      const sanitizedValue = savedSettings.oneSimpleApiFormDataValue;

      const reopenedSettings = {
        ...mockEventSettings,
        oneSimpleApiFormDataValue: sanitizedValue
      };

      const { result: result2 } = renderHook(() =>
        useEventSettingsForm({
          eventSettings: reopenedSettings,
          isOpen: true,
          onSave: mockOnSave,
          onClose: mockOnClose,
        })
      );

      // Verify structure is maintained
      expect(result2.current.formData.oneSimpleApiFormDataValue).toContain('<div');
      expect(result2.current.formData.oneSimpleApiFormDataValue).toContain('<h2>');
      expect(result2.current.formData.oneSimpleApiFormDataValue).toContain('<p>');
      expect(result2.current.formData.oneSimpleApiFormDataValue).toContain('{{eventName}}');
      expect(result2.current.formData.oneSimpleApiFormDataValue).toContain('{{firstName}}');
      expect(result2.current.formData.oneSimpleApiFormDataValue).toContain('{{lastName}}');
    });
  });

  describe('Sanitization Only When OneSimpleAPI is Enabled', () => {
    it('should not sanitize when OneSimpleAPI is disabled', async () => {
      const disabledSettings = {
        ...mockEventSettings,
        oneSimpleApiEnabled: false
      };

      const { result } = renderHook(() =>
        useEventSettingsForm({
          eventSettings: disabledSettings,
          isOpen: true,
          onSave: mockOnSave,
          onClose: mockOnClose,
        })
      );

      const htmlContent = '<div>Test content</div>';
      
      act(() => {
        result.current.handleInputChange('oneSimpleApiFormDataValue', htmlContent);
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
        const savedSettings = mockOnSave.mock.calls[0][0];
        // When disabled, the value should be passed through as-is
        expect(savedSettings.oneSimpleApiFormDataValue).toBe(htmlContent);
      });
    });

    it('should sanitize both templates when OneSimpleAPI is enabled', async () => {
      const { result } = renderHook(() =>
        useEventSettingsForm({
          eventSettings: mockEventSettings,
          isOpen: true,
          onSave: mockOnSave,
          onClose: mockOnClose,
        })
      );

      const dangerousHtml1 = '<div>Form Data <script>alert(1)</script></div>';
      const dangerousHtml2 = '<p>Record <script>alert(2)</script></p>';
      
      act(() => {
        result.current.handleInputChange('oneSimpleApiFormDataValue', dangerousHtml1);
        result.current.handleInputChange('oneSimpleApiRecordTemplate', dangerousHtml2);
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
        const savedSettings = mockOnSave.mock.calls[0][0];
        expect(savedSettings.oneSimpleApiFormDataValue).not.toContain('<script>');
        expect(savedSettings.oneSimpleApiRecordTemplate).not.toContain('<script>');
        expect(savedSettings.oneSimpleApiFormDataValue).toContain('<div>');
        expect(savedSettings.oneSimpleApiRecordTemplate).toContain('<p>');
      });
    });
  });

  describe('Direct Sanitization Function Tests', () => {
    it('should sanitize HTML template correctly', () => {
      const input = '<div>{{firstName}} <script>alert("XSS")</script></div>';
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('{{firstName}}');
      expect(output).not.toContain('<script>');
      expect(output).toContain('<div>');
    });

    it('should preserve all placeholders in complex template', () => {
      const input = `
        <div class="credential">
          <h1>{{eventName}}</h1>
          <p>Name: {{firstName}} {{lastName}}</p>
          <p>Barcode: {{barcodeNumber}}</p>
          <p>Custom: {{custom_field_1}}</p>
        </div>
      `;
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('{{eventName}}');
      expect(output).toContain('{{firstName}}');
      expect(output).toContain('{{lastName}}');
      expect(output).toContain('{{barcodeNumber}}');
      expect(output).toContain('{{custom_field_1}}');
    });

    it('should remove all dangerous content while preserving safe HTML', () => {
      const input = `
        <div>
          <h1>Title</h1>
          <script>alert("XSS")</script>
          <p onclick="alert()">Paragraph</p>
          <a href="javascript:alert()">Link</a>
          <iframe src="evil.com"></iframe>
          <img src="x" onerror="alert()" />
        </div>
      `;
      const output = sanitizeHTMLTemplate(input);
      
      expect(output).toContain('<div>');
      expect(output).toContain('<h1>');
      expect(output).toContain('<p>');
      expect(output).not.toContain('<script>');
      expect(output).not.toContain('onclick');
      expect(output).not.toContain('javascript:');
      expect(output).not.toContain('<iframe');
      expect(output).not.toContain('onerror');
    });
  });
});
