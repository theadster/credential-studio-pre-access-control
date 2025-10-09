import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/router';

/**
 * Hook to handle token refresh before API calls
 * Ensures the JWT token is fresh before making important requests
 */
export function useTokenRefresh() {
  const { refreshToken, isTokenRefreshing, user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  /**
   * Ensure token is fresh before making an API call
   * @returns Promise that resolves to true if token is ready, false if refresh failed
   */
  const ensureFreshToken = async (): Promise<boolean> => {
    // If no user, can't refresh
    if (!user) {
      console.warn('[useTokenRefresh] No user logged in, cannot refresh token');
      return false;
    }

    // If already refreshing, wait a bit and check again
    if (isTokenRefreshing()) {
      console.log('[useTokenRefresh] Token refresh already in progress, waiting...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if still refreshing after wait
      if (isTokenRefreshing()) {
        console.warn('[useTokenRefresh] Token refresh taking too long');
        return false;
      }

      return true;
    }

    // Try to refresh the token
    console.log('[useTokenRefresh] Refreshing token before API call');
    const success = await refreshToken();

    if (!success) {
      console.error('[useTokenRefresh] Token refresh failed');

      toast({
        variant: "destructive",
        title: "Session Error",
        description: "Your session has expired. Please log in again.",
        duration: 5000,
      });

      // Preserve current URL for post-login redirect
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('returnUrl', router.asPath);
      }
      router.push('/login');

      return false;
    }

    console.log('[useTokenRefresh] Token refreshed successfully');
    return true;
  };

  /**
   * Wrap an API call with automatic token refresh
   * @param apiCall - The API call function to execute
   * @returns Promise with the API call result
   */
  const withFreshToken = async <T>(apiCall: () => Promise<T>): Promise<T> => {
    const tokenReady = await ensureFreshToken();

    if (!tokenReady) {
      throw new Error('Token refresh failed - session expired');
    }

    return await apiCall();
  };

  return {
    ensureFreshToken,
    withFreshToken,
    isRefreshing: isTokenRefreshing,
  };
}
