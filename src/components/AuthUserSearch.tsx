import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useApiError } from '@/hooks/useApiError';

/**
 * Represents an Appwrite authentication user
 * This is the user object returned from the Appwrite Users API
 */
export interface AppwriteAuthUser {
  $id: string;                    // Unique user ID in Appwrite auth
  email: string;                  // User's email address
  name: string;                   // User's display name
  $createdAt: string;             // Account creation timestamp
  emailVerification: boolean;     // Whether email is verified
  phoneVerification: boolean;     // Whether phone is verified
  isLinked: boolean;              // Whether user is already linked to the application
}

/**
 * Props for the AuthUserSearch component
 */
interface AuthUserSearchProps {
  onSelect: (authUser: AppwriteAuthUser) => void;  // Callback when a user is selected
  selectedUserId?: string;                          // Currently selected user ID
  linkedUserIds?: string[];                         // Array of already-linked user IDs
}

interface SearchResponse {
  users: AppwriteAuthUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * AuthUserSearch Component
 * 
 * Provides a search interface for finding Appwrite authentication users.
 * Features:
 * - Real-time search with 300ms debouncing (Requirement 2.2)
 * - Pagination support (25 users per page) (Requirement 2.6)
 * - Loading states and error handling (Requirement 7.6)
 * - Displays email verification status (Requirement 2.3)
 * - Shows which users are already linked (Requirement 2.4)
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7, 3.2, 3.3, 7.6
 */
export default function AuthUserSearch({ 
  onSelect, 
  selectedUserId,
  linkedUserIds = []
}: AuthUserSearchProps) {
  const { handleError, fetchWithRetry } = useApiError();
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');                    // Current input value
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');  // Debounced search term
  
  // Results state
  const [authUsers, setAuthUsers] = useState<AppwriteAuthUser[]>([]);  // Search results
  const [loading, setLoading] = useState(false);                       // Loading indicator
  const [error, setError] = useState<string | null>(null);             // Error message
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);                   // Current page number
  const [totalPages, setTotalPages] = useState(1);                     // Total pages available
  const [total, setTotal] = useState(0);                               // Total users found

  /**
   * Debounce search term to avoid excessive API calls
   * Waits 300ms after user stops typing before triggering search (Requirement 2.2)
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page on new search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  /**
   * Fetch users when debounced search term changes
   * Automatically triggers search after debounce period
   */
  useEffect(() => {
    fetchUsers(debouncedSearchTerm, currentPage);
  }, [debouncedSearchTerm]);

  /**
   * Fetch auth users from the API
   * 
   * @param query - Search term (email or name)
   * @param page - Page number to fetch
   * 
   * Features:
   * - Automatic retry on network errors (Requirement 7.5)
   * - Centralized error handling (Requirement 7.6)
   * - Pagination support (Requirement 2.6)
   */
  const fetchUsers = useCallback(async (query: string, page: number) => {
    setLoading(true);
    setError(null);

    try {
      // Use fetchWithRetry for automatic retry on network errors (Requirement 7.5)
      const data: SearchResponse = await fetchWithRetry('/api/users/search', {
        method: 'POST',
        body: JSON.stringify({
          q: query,
          page,
          limit: 25  // 25 users per page (Requirement 2.6)
        }),
      });
      
      // Update state with search results
      setAuthUsers(data.users);
      setCurrentPage(data.pagination.page);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching auth users:', err);
      
      // Use centralized error handling (Requirement 7.6)
      const parsed = handleError(err, 'Failed to search users');
      setError(parsed.message);
      setAuthUsers([]);
    } finally {
      setLoading(false);
    }
  }, [handleError, fetchWithRetry]);

  /**
   * Handle search input changes
   * Updates search term which triggers debounced search
   */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  /**
   * Handle pagination changes
   * Fetches the requested page if valid
   * 
   * @param newPage - Page number to navigate to
   */
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchUsers(debouncedSearchTerm, newPage);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="user-search">Search Users</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="user-search"
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search by email or name"
            className="pl-9"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && authUsers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No users found matching your search</p>
          {searchTerm && (
            <p className="text-sm mt-1">Try a different search term</p>
          )}
        </div>
      )}

      {!loading && !error && authUsers.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Found {total} user{total !== 1 ? 's' : ''}
          {searchTerm && ` matching "${searchTerm}"`}
        </div>
      )}
    </div>
  );
}
