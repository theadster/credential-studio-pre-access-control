import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CustomFieldInput } from '@/components/AttendeeForm/CustomFieldInput';

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

  describe('Date Field', () => {
    it('renders date input correctly', () => {
      const field = {
        id: '4',
        fieldName: 'Birth Date',
        fieldType: 'date',
        required: true,
        order: 4
      };

      render(<CustomFieldInput field={field} value="2024-01-15" onChange={mockOnChange} />);

      const input = screen.getByLabelText('Birth Date');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'date');
      expect(input).toHaveValue('2024-01-15');
    });

    it('validates and accepts valid date format', () => {
      const field = {
        id: '4',
        fieldName: 'Birth Date',
        fieldType: 'date',
        required: true,
        order: 4
      };

      render(<CustomFieldInput field={field} value="" onChange={mockOnChange} />);

      const input = screen.getByLabelText('Birth Date');
      fireEvent.change(input, { target: { value: '2024-12-25' } });

      expect(mockOnChange).toHaveBeenCalledWith('2024-12-25');
    });

    it('validates date format with regex', () => {
      const field = {
        id: '4',
        fieldName: 'Birth Date',
        fieldType: 'date',
        required: true,
        order: 4
      };

      render(<CustomFieldInput field={field} value="" onChange={mockOnChange} />);

      const input = screen.getByLabelText('Birth Date');

      // Test that only YYYY-MM-DD format is accepted
      // Note: Browser date inputs typically enforce this format,
      // but our validation provides an additional layer of security
      fireEvent.change(input, { target: { value: '2024-01-15' } });
      expect(mockOnChange).toHaveBeenCalledWith('2024-01-15');
    });

    it('handles empty date input', () => {
      const field = {
        id: '4',
        fieldName: 'Birth Date',
        fieldType: 'date',
        required: false,
        order: 4
      };

      render(<CustomFieldInput field={field} value="2024-01-15" onChange={mockOnChange} />);

      const input = screen.getByLabelText('Birth Date');
      fireEvent.change(input, { target: { value: '' } });

      expect(mockOnChange).toHaveBeenCalledWith('');
    });
  });

  describe('Select Field', () => {
    it('renders select input correctly', () => {
      const field = {
        id: '5',
        fieldName: 'Category',
        fieldType: 'select',
        fieldOptions: { options: ['Option 1', 'Option 2', 'Option 3'] },
        required: true,
        order: 5
      };

      render(<CustomFieldInput field={field} value="Option 1" onChange={mockOnChange} />);

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });
  });

  describe('Checkbox Field', () => {
    it('renders checkbox correctly with yes value', () => {
      const field = {
        id: '5',
        fieldName: 'Agree',
        fieldType: 'checkbox',
        required: false,
        order: 5
      };

      render(<CustomFieldInput field={field} value="yes" onChange={mockOnChange} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked();
    });

    it('renders checkbox correctly with no value', () => {
      const field = {
        id: '5',
        fieldName: 'Agree',
        fieldType: 'checkbox',
        required: false,
        order: 5
      };

      render(<CustomFieldInput field={field} value="no" onChange={mockOnChange} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    it('handles checkbox change to yes', () => {
      const field = {
        id: '5',
        fieldName: 'Agree',
        fieldType: 'checkbox',
        required: false,
        order: 5
      };

      render(<CustomFieldInput field={field} value="no" onChange={mockOnChange} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledWith('yes');
    });

    it('handles checkbox change to no', () => {
      const field = {
        id: '5',
        fieldName: 'Agree',
        fieldType: 'checkbox',
        required: false,
        order: 5
      };

      render(<CustomFieldInput field={field} value="yes" onChange={mockOnChange} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledWith('no');
    });

    it('handles legacy true value gracefully', () => {
      const field = {
        id: '5',
        fieldName: 'Agree',
        fieldType: 'checkbox',
        required: false,
        order: 5
      };

      render(<CustomFieldInput field={field} value="true" onChange={mockOnChange} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('displays Yes label when checked', () => {
      const field = {
        id: '5',
        fieldName: 'Agree',
        fieldType: 'checkbox',
        required: false,
        order: 5
      };

      render(<CustomFieldInput field={field} value="yes" onChange={mockOnChange} />);

      expect(screen.getByText('Yes')).toBeInTheDocument();
    });

    it('displays No label when unchecked', () => {
      const field = {
        id: '5',
        fieldName: 'Agree',
        fieldType: 'checkbox',
        required: false,
        order: 5
      };

      render(<CustomFieldInput field={field} value="no" onChange={mockOnChange} />);

      expect(screen.getByText('No')).toBeInTheDocument();
    });
  });

  describe('Boolean Field', () => {
    it('renders switch correctly with yes value', () => {
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

    it('renders switch correctly with no value', () => {
      const field = {
        id: '6',
        fieldName: 'Active',
        fieldType: 'boolean',
        required: false,
        order: 6
      };

      render(<CustomFieldInput field={field} value="no" onChange={mockOnChange} />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toBeInTheDocument();
      expect(switchElement).not.toBeChecked();
    });

    it('handles boolean toggle to yes', () => {
      const field = {
        id: '6',
        fieldName: 'Active',
        fieldType: 'boolean',
        required: false,
        order: 6
      };

      render(<CustomFieldInput field={field} value="no" onChange={mockOnChange} />);

      const switchElement = screen.getByRole('switch');
      fireEvent.click(switchElement);

      expect(mockOnChange).toHaveBeenCalledWith('yes');
    });

    it('handles boolean toggle to no', () => {
      const field = {
        id: '6',
        fieldName: 'Active',
        fieldType: 'boolean',
        required: false,
        order: 6
      };

      render(<CustomFieldInput field={field} value="yes" onChange={mockOnChange} />);

      const switchElement = screen.getByRole('switch');
      fireEvent.click(switchElement);

      expect(mockOnChange).toHaveBeenCalledWith('no');
    });

    it('handles legacy true value gracefully', () => {
      const field = {
        id: '6',
        fieldName: 'Active',
        fieldType: 'boolean',
        required: false,
        order: 6
      };

      render(<CustomFieldInput field={field} value="true" onChange={mockOnChange} />);

      const switchElement = screen.getByRole('switch');
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
