import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AuthUserSearch from '../AuthUserSearch';

// Mock the toast hook
vi.mock('@/hooks/useSweetAlert', () => ({
  useSweetAlert: () => ({
    toast: vi.fn(),
  }),
}));

describe('AuthUserSearch', () => {
  const mockOnSelect = vi.fn();
  const mockFetch = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    
    // Default mock response for initial load
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        users: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 0 }
      }),
    });
  });

  it('renders search input with correct placeholder', () => {
    render(<AuthUserSearch onSelect={mockOnSelect} />);
    
    expect(screen.getByLabelText(/search users/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search by email or name/i)).toBeInTheDocument();
  });

  it('calls API on initial mount', async () => {
    render(<AuthUserSearch onSelect={mockOnSelect} />);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users/search',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: '',
            page: 1,
            limit: 25
          }),
        })
      );
    });
  });

  it('displays "No users found" message when search returns empty', async () => {
    render(<AuthUserSearch onSelect={mockOnSelect} />);
    
    await waitFor(() => {
      expect(screen.getByText(/no users found matching your search/i)).toBeInTheDocument();
    });
  });

  it('displays error message when API call fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to search users' }),
    });

    render(<AuthUserSearch onSelect={mockOnSelect} />);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to search users/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('displays user count when users are found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        users: [
          {
            $id: '1',
            email: 'test@example.com',
            name: 'Test User',
            $createdAt: '2024-01-01',
            emailVerification: true,
            phoneVerification: false,
            isLinked: false
          }
        ],
        pagination: { page: 1, limit: 25, total: 1, totalPages: 1 }
      }),
    });

    render(<AuthUserSearch onSelect={mockOnSelect} />);
    
    await waitFor(() => {
      expect(screen.getByText(/found 1 user/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

});
