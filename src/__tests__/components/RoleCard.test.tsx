import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RoleCard from '@/components/RoleCard';

describe('RoleCard', () => {
  const mockRole = {
    id: 'role-1',
    name: 'Test Role',
    description: 'Test description',
    permissions: {
      attendees: { read: true, write: true, create: true, delete: false },
      users: { read: true, write: false, create: false, delete: false },
      roles: { read: true, write: false, create: false, delete: false }
    },
    createdAt: '2024-01-01T00:00:00.000Z'
  };

  const mockUsers = [
    { id: 'user-1', name: 'User One', email: 'user1@test.com', role: { id: 'role-1' } },
    { id: 'user-2', name: 'User Two', email: 'user2@test.com', role: { id: 'role-1' } }
  ];

  it('should render without errors', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <RoleCard
        role={mockRole}
        users={mockUsers}
        canEdit={true}
        canDelete={true}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText('Test Role')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should calculate permission count correctly', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <RoleCard
        role={mockRole}
        users={mockUsers}
        canEdit={true}
        canDelete={true}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    // Should count: attendees (read, write, create), users (read), roles (read) = 5 permissions
    const permissionElements = screen.getAllByText(/5 permissions/i);
    expect(permissionElements.length).toBeGreaterThan(0);
  });

  it('should handle nested permission objects', () => {
    const roleWithNestedPerms = {
      ...mockRole,
      permissions: {
        attendees: {
          read: true,
          write: { basic: true, advanced: false },
          create: true,
          delete: false
        }
      }
    };

    const onEdit = vi.fn();
    const onDelete = vi.fn();

    // Should not throw error with nested permissions
    expect(() => {
      render(
        <RoleCard
          role={roleWithNestedPerms}
          users={mockUsers}
          canEdit={true}
          canDelete={true}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );
    }).not.toThrow();
  });

  it('should handle empty permissions', () => {
    const roleWithNoPerms = {
      ...mockRole,
      permissions: {}
    };

    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <RoleCard
        role={roleWithNoPerms}
        users={mockUsers}
        canEdit={true}
        canDelete={true}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    const permissionElements = screen.getAllByText(/0 permissions/i);
    expect(permissionElements.length).toBeGreaterThan(0);
  });
});
