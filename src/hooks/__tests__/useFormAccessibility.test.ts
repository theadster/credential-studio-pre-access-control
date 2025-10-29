import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormAccessibility } from '../useFormAccessibility';

describe('useFormAccessibility', () => {
  describe('Validation Errors', () => {
    it('initializes with empty validation state', () => {
      const { result } = renderHook(() => useFormAccessibility());

      expect(result.current.validationMessage).toBe('');
      expect(result.current.validationErrors).toEqual([]);
    });

    it('sets validation error for a field', () => {
      const { result } = renderHook(() => useFormAccessibility());

      act(() => {
        result.current.setValidationError('firstName', 'First name is required');
      });

      expect(result.current.validationErrors).toHaveLength(1);
      expect(result.current.validationErrors[0]).toEqual({
        field: 'firstName',
        message: 'First name is required'
      });
    });

    it('updates existing validation error for same field', () => {
      const { result } = renderHook(() => useFormAccessibility());

      act(() => {
        result.current.setValidationError('firstName', 'First error');
      });

      act(() => {
        result.current.setValidationError('firstName', 'Updated error');
      });

      expect(result.current.validationErrors).toHaveLength(1);
      expect(result.current.validationErrors[0].message).toBe('Updated error');
    });

    it('handles multiple field errors', () => {
      const { result } = renderHook(() => useFormAccessibility());

      act(() => {
        result.current.setValidationError('firstName', 'First name required');
        result.current.setValidationError('lastName', 'Last name required');
        result.current.setValidationError('email', 'Email required');
      });

      expect(result.current.validationErrors).toHaveLength(3);
    });

    it('clears all validation errors', () => {
      const { result } = renderHook(() => useFormAccessibility());

      act(() => {
        result.current.setValidationError('firstName', 'Error 1');
        result.current.setValidationError('lastName', 'Error 2');
      });

      expect(result.current.validationErrors).toHaveLength(2);

      act(() => {
        result.current.clearValidationErrors();
      });

      expect(result.current.validationErrors).toEqual([]);
      expect(result.current.validationMessage).toBe('');
    });
  });

  describe('Validation Announcements', () => {
    it('announces validation message', () => {
      const { result } = renderHook(() => useFormAccessibility());

      act(() => {
        result.current.announceValidation('Please fill in all required fields');
      });

      expect(result.current.validationMessage).toBe('Please fill in all required fields');
    });

    it('clears announcement after timeout', async () => {
      const { result } = renderHook(() => useFormAccessibility());

      act(() => {
        result.current.announceValidation('Test message');
      });

      expect(result.current.validationMessage).toBe('Test message');

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(result.current.validationMessage).toBe('');
    });
  });

  describe('ARIA Props Generation', () => {
    it('formats camelCase field names to human-readable labels', () => {
      const { result } = renderHook(() => useFormAccessibility());

      const props1 = result.current.getFieldAriaProps('firstName', false, false);
      expect(props1['aria-label']).toBe('First Name');

      const props2 = result.current.getFieldAriaProps('barcodeNumber', false, false);
      expect(props2['aria-label']).toBe('Barcode Number');
    });

    it('formats snake_case field names to human-readable labels', () => {
      const { result } = renderHook(() => useFormAccessibility());

      const props = result.current.getFieldAriaProps('barcode_number', false, false);
      expect(props['aria-label']).toBe('Barcode Number');
    });

    it('formats single word field names correctly', () => {
      const { result } = renderHook(() => useFormAccessibility());

      const props = result.current.getFieldAriaProps('notes', false, false);
      expect(props['aria-label']).toBe('Notes');
    });

    it('generates basic ARIA props for required field', () => {
      const { result } = renderHook(() => useFormAccessibility());

      const props = result.current.getFieldAriaProps('firstName', true, false);

      expect(props).toEqual({
        'aria-label': 'First Name',
        'aria-required': 'true',
        'aria-invalid': 'false'
      });
    });

    it('generates ARIA props for optional field', () => {
      const { result } = renderHook(() => useFormAccessibility());

      const props = result.current.getFieldAriaProps('notes', false, false);

      expect(props).toEqual({
        'aria-label': 'Notes',
        'aria-required': 'false',
        'aria-invalid': 'false'
      });
    });

    it('generates ARIA props for field with error', () => {
      const { result } = renderHook(() => useFormAccessibility());

      act(() => {
        result.current.setValidationError('firstName', 'Required field');
      });

      const props = result.current.getFieldAriaProps('firstName', true, true);

      expect(props).toEqual({
        'aria-label': 'First Name',
        'aria-required': 'true',
        'aria-invalid': 'true',
        'aria-describedby': 'firstName-error'
      });
    });

    it('does not include describedby when no error exists', () => {
      const { result } = renderHook(() => useFormAccessibility());

      const props = result.current.getFieldAriaProps('firstName', true, false);

      expect(props['aria-describedby']).toBeUndefined();
    });
  });

  describe('Focus Management', () => {
    it('provides firstErrorRef', () => {
      const { result } = renderHook(() => useFormAccessibility());

      expect(result.current.firstErrorRef).toBeDefined();
      expect(result.current.firstErrorRef.current).toBeNull();
    });

    it('focusFirstError does not throw when ref is null', () => {
      const { result } = renderHook(() => useFormAccessibility());

      expect(() => {
        act(() => {
          result.current.focusFirstError();
        });
      }).not.toThrow();
    });

    it('focusFirstError calls focus when ref is set', () => {
      const { result } = renderHook(() => useFormAccessibility());
      const mockElement = {
        focus: vi.fn()
      } as unknown as HTMLInputElement;

      // Manually set the ref
      act(() => {
        (result.current.firstErrorRef as any).current = mockElement;
      });

      act(() => {
        result.current.focusFirstError();
      });

      expect(mockElement.focus).toHaveBeenCalled();
    });
  });

  describe('Integration', () => {
    it('handles complete validation flow', () => {
      const { result } = renderHook(() => useFormAccessibility());

      // Set multiple errors
      act(() => {
        result.current.setValidationError('firstName', 'First name required');
        result.current.setValidationError('lastName', 'Last name required');
        result.current.announceValidation('Please fill in all required fields');
      });

      expect(result.current.validationErrors).toHaveLength(2);
      expect(result.current.validationMessage).toBe('Please fill in all required fields');

      // Get ARIA props for fields
      const firstNameProps = result.current.getFieldAriaProps('firstName', true, true);
      expect(firstNameProps['aria-invalid']).toBe('true');
      expect(firstNameProps['aria-describedby']).toBe('firstName-error');

      // Clear errors
      act(() => {
        result.current.clearValidationErrors();
      });

      expect(result.current.validationErrors).toEqual([]);
      expect(result.current.validationMessage).toBe('');
    });
  });
});
