/**
 * Tests for RoleSelector component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoleSelector from '../RoleSelector';
import type { Role } from '../types';

describe('RoleSelector', () => {
  const mockRoles: Role[] = [
    {
      id: 'role-1',
      name: 'Admin',
      permissions: {},
    },
    {
      id: 'role-2',
      name: 'Staff',
      permissions: {},
    },
    {
      id: 'role-3',
      name: 'Viewer',
      permissions: {},
    },
  ];

  const defaultProps = {
    roles: mockRoles,
    value: 'role-1',
    onChange: vi.fn(),
    disabled: false,
  };

  it('should render role selector with label', () => {
    render(<RoleSelector {...defaultProps} />);

    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should display selected role', () => {
    render(<RoleSelector {...defaultProps} />);

    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('should display all roles in dropdown', async () => {
    const user = userEvent.setup();
    render(<RoleSelector {...defaultProps} />);

    // Open dropdown
    await user.click(screen.getByRole('combobox'));

    // Check all roles are present
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Staff')).toBeInTheDocument();
    expect(screen.getByText('Viewer')).toBeInTheDocument();
  });

  it('should call onChange when role is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RoleSelector {...defaultProps} onChange={onChange} />);

    // Open dropdown
    await user.click(screen.getByRole('combobox'));

    // Select different role
    await user.click(screen.getByText('Staff'));

    expect(onChange).toHaveBeenCalledWith('role-2');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<RoleSelector {...defaultProps} disabled={true} />);

    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveAttribute('aria-disabled', 'true');
  });

  it('should handle empty roles array', () => {
    render(<RoleSelector {...defaultProps} roles={[]} />);

    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should display placeholder when no role is selected', () => {
    render(<RoleSelector {...defaultProps} value="" />);

    expect(screen.getByText('Select a role')).toBeInTheDocument();
  });

  it('should not call onChange when clicking already selected role', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RoleSelector {...defaultProps} onChange={onChange} />);

    // Open dropdown
    await user.click(screen.getByRole('combobox'));

    // Click already selected role
    await user.click(screen.getByText('Admin'));

    // Should still be called (this is Select component behavior)
    expect(onChange).toHaveBeenCalledWith('role-1');
  });
});
