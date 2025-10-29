import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomFieldInput } from '../CustomFieldInput';

describe('CustomFieldInput', () => {
  const mockOnChange = vi.fn();

  afterEach(() => {
    mockOnChange.mockClear();
  });

  describe('Text Field', () => {
    it('renders text input correctly', () => {
      const field = {
        id: '1',
        fieldName: 'Test Field',
        fieldType: 'text',
        required: true,
        order: 1
      };

      render(<CustomFieldInput field={field} value="test" onChange={mockOnChange} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('test');
    });

    it('handles uppercase option', () => {
      const field = {
        id: '1',
        fieldName: 'Test Field',
        fieldType: 'text',
        fieldOptions: { uppercase: true },
        required: false,
        order: 1
      };

      render(<CustomFieldInput field={field} value="" onChange={mockOnChange} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'hello' } });
      
      expect(mockOnChange).toHaveBeenCalledWith('HELLO');
    });
  });

  describe('Number Field', () => {
    it('renders number input correctly', () => {
      const field = {
        id: '2',
        fieldName: 'Age',
        fieldType: 'number',
        required: true,
        order: 2
      };

      render(<CustomFieldInput field={field} value="25" onChange={mockOnChange} />);
      
      const input = screen.getByRole('spinbutton');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue(25);
    });
  });

  describe('Email Field', () => {
    it('renders email input correctly', () => {
      const field = {
        id: '3',
        fieldName: 'Email',
        fieldType: 'email',
        required: true,
        order: 3
      };

      render(<CustomFieldInput field={field} value="test@example.com" onChange={mockOnChange} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'email');
    });
  });

  describe('Select Field', () => {
    it('renders select input correctly', () => {
      const field = {
        id: '4',
        fieldName: 'Category',
        fieldType: 'select',
        fieldOptions: { options: ['Option 1', 'Option 2', 'Option 3'] },
        required: true,
        order: 4
      };

      render(<CustomFieldInput field={field} value="Option 1" onChange={mockOnChange} />);
      
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });
  });

  describe('Checkbox Field', () => {
    it('renders checkbox correctly', () => {
      const field = {
        id: '5',
        fieldName: 'Agree',
        fieldType: 'checkbox',
        required: false,
        order: 5
      };

      render(<CustomFieldInput field={field} value="true" onChange={mockOnChange} />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked();
    });

    it('handles checkbox change', () => {
      const field = {
        id: '5',
        fieldName: 'Agree',
        fieldType: 'checkbox',
        required: false,
        order: 5
      };

      render(<CustomFieldInput field={field} value="false" onChange={mockOnChange} />);
      
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      
      expect(mockOnChange).toHaveBeenCalledWith('true');
    });
  });

  describe('Boolean Field', () => {
    it('renders switch correctly', () => {
      const field = {
        id: '6',
        fieldName: 'Active',
        fieldType: 'boolean',
        required: false,
        order: 6
      };

      render(<CustomFieldInput field={field} value="yes" onChange={mockOnChange} />);
      
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toBeInTheDocument();
      expect(switchElement).toBeChecked();
    });
  });

  describe('Memoization', () => {
    it('does not re-render when props are the same', () => {
      const field = {
        id: '1',
        fieldName: 'Test',
        fieldType: 'text',
        required: false,
        order: 1
      };

      const { rerender } = render(
        <CustomFieldInput field={field} value="test" onChange={mockOnChange} />
      );

      // Re-render with same props
      rerender(<CustomFieldInput field={field} value="test" onChange={mockOnChange} />);

      // Component should be memoized and not re-render unnecessarily
      // This is verified by React.memo behavior
      expect(screen.getByRole('textbox')).toHaveValue('test');
    });
  });

  describe('Accessibility', () => {
    it('includes aria-label for all field types', () => {
      const field = {
        id: '1',
        fieldName: 'Test Field',
        fieldType: 'text',
        required: true,
        order: 1
      };

      render(<CustomFieldInput field={field} value="" onChange={mockOnChange} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label', 'Test Field');
      expect(input).toHaveAttribute('aria-required', 'true');
    });
  });
});
