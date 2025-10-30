/**
 * Tests for AuthUserSelector component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthUserSelector from '../AuthUserSelector';
import type { AppwriteAuthUser } from '../types';

// Mock the child components
vi.mock('@/components/AuthUserSearch', () => ({
  default: ({ onSearch }: { onSearch: (query: string) => void }) => (
    <input
      data-testid="auth-user-search"
      placeholder="Search users..."
      onChange={(e) => onSearch(e.target.value)}
    />
  ),
}));

vi.mock('@/components/AuthUserList', () => ({
  default: ({
    users,
    onSelect,
    loading,
  }: {
    users: AppwriteAuthUser[];
    onSelect: (user: AppwriteAuthUser) => void;
    loading: boolean;
  }) => (
    <div data-testid="auth-user-list">
      {loading && <div>Loading...</div>}
      {users.map((user) => (
        <button
          key={user.$id}
          onClick={() => onSelect(user)}
          data-testid={`user-${user.$id}`}
        >
          {user.name || user.email}
        </button>
      ))}
    </div>
  ),
}));

describe('AuthUserSelector', () => {
  const mockAuthUsers: AppwriteAuthUser[] = [
    {
      $id: 'auth-1',
      email: 'user1@example.com',
      name: 'User One',
    },
    {
      $id: 'auth-2',
      email: 'user2@example.com',
      name: 'User Two',
    },
    {
      $id: 'auth-3',
      email: 'user3@example.com',
      name: '',
    },
  ];

  const defaultProps = {
    authUsers: mockAuthUsers,
    selectedUser: mockAuthUsers[0],
    onSelect: vi.fn(),
    loading: false,
    onSearch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render search and list components', () => {
    render(<AuthUserSelector {...defaultProps} />);

    expect(screen.getByTestId('auth-user-search')).toBeInTheDocument();
    expect(screen.getByTestId('auth-user-list')).toBeInTheDocument();
  });

  it('should display selected user card with name and email', () => {
    render(<AuthUserSelector {...defaultProps} />);

    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('user1@example.com')).toBeInTheDocument();
  });

  it('should display email only when name is empty', () => {
    render(
      <AuthUserSelector {...defaultProps} selectedUser={mockAuthUsers[2]} />
    );

    expect(screen.getByText('user3@example.com')).toBeInTheDocument();
  });

  it('should call onSearch when search input changes', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<AuthUserSelector {...defaultProps} onSearch={onSearch} />);

    const searchInput = screen.getByTestId('auth-user-search');
    await user.type(searchInput, 'test');

    expect(onSearch).toHaveBeenCalled();
  });

  it('should call onSelect when user is selected from list', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<AuthUserSelector {...defaultProps} onSelect={onSelect} />);

    const userButton = screen.getByTestId('user-auth-2');
    await user.click(userButton);

    expect(onSelect).toHaveBeenCalledWith(mockAuthUsers[1]);
  });

  it('should show loading state in list', () => {
    render(<AuthUserSelector {...defaultProps} loading={true} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should handle empty auth users array', () => {
    render(<AuthUserSelector {...defaultProps} authUsers={[]} />);

    expect(screen.getByTestId('auth-user-list')).toBeInTheDocument();
  });

  it('should not display selected user card when no user is selected', () => {
    render(<AuthUserSelector {...defaultProps} selectedUser={null} />);

    expect(screen.queryByText('User One')).not.toBeInTheDocument();
  });
});
