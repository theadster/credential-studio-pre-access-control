import React, { createContext, useState, ReactNode, useContext, useEffect } from 'react';
import { createBrowserClient } from '@/lib/appwrite';
import { Models, OAuthProvider, ID, Query } from 'appwrite';
import { useSweetAlert } from "@/hooks/useSweetAlert";
import { useRouter } from 'next/router';
import { TokenRefreshManager } from '@/lib/tokenRefresh';
import { createTabCoordinator, TabCoordinator } from '@/lib/tabCoordinator';
import { validateEmail } from '@/lib/validation';

interface UserProfile {
  $id: string;
  userId: string;
  email: string;
  name: string | null;
  roleId: string | null;
  isInvited: boolean;
  $createdAt: string;
  $updatedAt: string;
}

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  userProfile: UserProfile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  initializing: boolean;
  refreshToken: () => Promise<boolean>;
  isTokenRefreshing: () => boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  signIn: async () => { },
  signUp: async () => { },
  signInWithMagicLink: async () => { },
  signInWithGoogle: async () => { },
  signOut: async () => { },
  resetPassword: async () => { },
  updatePassword: async () => { },
  initializing: false,
  refreshToken: async () => false,
  isTokenRefreshing: () => false,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const { account, databases } = createBrowserClient();
  const { toast } = useSweetAlert();

  // Initialize TokenRefreshManager and TabCoordinator
  const [tokenRefreshManager] = useState(() => new TokenRefreshManager());
  const [tabCoordinator] = useState<TabCoordinator>(() => createTabCoordinator());

  // Track if we've already shown a session expiration notification
  // This prevents spam from multiple failed API calls
  const [hasShownExpirationNotification, setHasShownExpirationNotification] = useState(false);

  // Setup token refresh callbacks and cleanup
  useEffect(() => {
    // Handle token refresh success/failure
    const handleRefreshResult = (success: boolean, error?: Error) => {
      if (!success) {
        console.error('[AuthContext] Token refresh failed:', error);

        // Check if this is a session expiration error
        const isSessionExpired = error && (
          (error as any).code === 401 ||
          (error as any).type === 'session_expired' ||
          (error as any).type === 'user_unauthorized' ||
          error.message.toLowerCase().includes('session expired')
        );

        if (isSessionExpired) {
          // Session is truly expired - force logout
          console.error('[AuthContext] Session expired, forcing logout', {
            timestamp: new Date().toISOString(),
            error: error?.message,
          });

          // Clear state
          setUser(null);
          setUserProfile(null);
          tokenRefreshManager.stop();
          tokenRefreshManager.clearUserContext();

          // Clear session cookie
          document.cookie = 'appwrite-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

          // Show notification and redirect to login
          if (!hasShownExpirationNotification) {
            setHasShownExpirationNotification(true);

            toast({
              variant: "destructive",
              title: "Session Expired",
              description: "Your session has expired. Please log in again.",
              duration: 5000,
            });
          }

          // Preserve current URL for post-login redirect
          const currentPath = router.pathname;
          const protectedPaths = ['/dashboard', '/private', '/profile'];
          const isProtectedPath = protectedPaths.some(path => currentPath.startsWith(path));

          if (isProtectedPath) {
            sessionStorage.setItem('returnUrl', router.asPath);
          }

          router.push('/login');
        } else {
          // Network or temporary error - show warning but don't logout
          if (!hasShownExpirationNotification) {
            setHasShownExpirationNotification(true);

            toast({
              variant: "destructive",
              title: "Session Warning",
              description: "Unable to refresh your session. You may need to log in again if you encounter errors.",
              duration: 10000, // Show for 10 seconds
            });
          }

          console.warn('[AuthContext] Token refresh failed (temporary), keeping user logged in. They will be prompted to login if API calls fail.');
        }
      } else {
        console.log('[AuthContext] Token refresh successful');
        // Reset notification flag on successful refresh
        setHasShownExpirationNotification(false);
      }
    };

    // Handle refresh completion from other tabs
    const handleTabRefreshComplete = (success: boolean) => {
      if (!success) {
        console.error('[AuthContext] Token refresh failed in another tab');

        // Only show notification if we haven't already shown one
        if (!hasShownExpirationNotification) {
          setHasShownExpirationNotification(true);

          toast({
            variant: "destructive",
            title: "Session Warning",
            description: "Unable to refresh your session in another tab. You may need to log in again if you encounter errors.",
            duration: 10000, // Show for 10 seconds
          });
        }

        // Don't auto-logout if refresh failed in another tab
        // Let the user continue working
        console.warn('[AuthContext] Token refresh failed in another tab, but keeping user logged in.');
      } else {
        console.log('[AuthContext] Token refresh successful in another tab');
        // Reset notification flag on successful refresh
        setHasShownExpirationNotification(false);
      }
    };

    // Register callbacks
    tokenRefreshManager.onRefresh(handleRefreshResult);
    tabCoordinator.onRefreshComplete(handleTabRefreshComplete);

    // Cleanup on unmount
    return () => {
      console.log('[AuthContext] Cleaning up token refresh and tab coordination');
      tokenRefreshManager.stop();
      tabCoordinator.cleanup();
    };
  }, [hasShownExpirationNotification]);

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log('[AuthContext] Fetching user profile', {
        userId,
        databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        collectionId: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
      });

      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
        [Query.equal('userId', userId)]
      );

      console.log('[AuthContext] User profile query result', {
        userId,
        documentsFound: response.documents.length,
        totalDocuments: response.total,
      });

      if (response.documents.length > 0) {
        const profile = response.documents[0] as unknown as UserProfile;
        console.log('[AuthContext] User profile data', {
          profileId: profile.$id,
          userId: profile.userId,
          email: profile.email,
          roleId: profile.roleId,
          hasRole: !!profile.roleId,
        });
        return profile;
      }

      console.warn('[AuthContext] No user profile found for userId', { userId });
      return null;
    } catch (error) {
      console.error('[AuthContext] Error fetching user profile:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: (error as any)?.type,
      });
      return null;
    }
  };

  React.useEffect(() => {
    const fetchSession = async () => {
      const startTime = Date.now();

      try {
        console.log('[AuthContext] Initializing session restoration', {
          timestamp: new Date().toISOString(),
          currentPath: router.pathname,
        });

        // Validate existing session
        const currentUser = await account.get();
        console.log('[AuthContext] ✓ Session valid, user found', {
          timestamp: new Date().toISOString(),
          userId: currentUser.$id,
          email: currentUser.email,
          name: currentUser.name,
        });

        setUser(currentUser);

        // Fetch user profile from database
        const profile = await fetchUserProfile(currentUser.$id);
        setUserProfile(profile);

        console.log('[AuthContext] User profile fetched', {
          timestamp: new Date().toISOString(),
          userId: currentUser.$id,
          hasRole: !!profile?.roleId,
          roleId: profile?.roleId || 'none',
        });

        // Create fresh JWT for this session
        // This ensures we have a valid token even if the previous one expired
        console.log('[AuthContext] Creating fresh JWT for session restoration', {
          timestamp: new Date().toISOString(),
          userId: currentUser.$id,
        });

        try {
          const jwt = await account.createJWT();

          // Update session cookie with fresh JWT
          document.cookie = `appwrite-session=${jwt.jwt}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''
            }`;

          // Set user context for token refresh logging
          tokenRefreshManager.setUserContext(currentUser.$id);

          // Start token refresh timer with the new JWT expiry
          const jwtExpiry = (jwt as any).expire || Math.floor(Date.now() / 1000) + (15 * 60);
          tokenRefreshManager.start(jwtExpiry);

          const duration = Date.now() - startTime;
          console.log('[AuthContext] ✓ Session restoration successful', {
            timestamp: new Date().toISOString(),
            userId: currentUser.$id,
            durationMs: duration,
            jwtExpiry: new Date(jwtExpiry * 1000).toISOString(),
          });

          // Show success notification for session restoration
          // Only show on protected pages to avoid notification spam on public pages
          const currentPath = router.pathname;
          const protectedPaths = ['/dashboard', '/private', '/profile'];
          const isProtectedPath = protectedPaths.some(path => currentPath.startsWith(path));

          if (isProtectedPath) {
            toast({
              title: "Welcome Back",
              description: "Your session has been restored successfully.",
            });
          }
        } catch (jwtError) {
          console.error('[AuthContext] ✗ Failed to create JWT during session restoration', {
            timestamp: new Date().toISOString(),
            userId: currentUser.$id,
            error: jwtError instanceof Error ? jwtError.message : 'Unknown error',
            errorType: (jwtError as any)?.type || 'unknown',
          });
          // If JWT creation fails, we still have a valid session but token refresh won't work
          // This is a degraded state - log the user out to be safe
          throw jwtError;
        }

      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorType = (error as any)?.type || 'unknown';
        const errorCode = (error as any)?.code;

        // 401 errors are expected when not logged in - don't log as error
        if (errorCode === 401) {
          console.log('[AuthContext] No active session (expected when not logged in)', {
            timestamp: new Date().toISOString(),
            currentPath: router.pathname,
          });
        } else {
          console.log('[AuthContext] ✗ Session restoration failed', {
            timestamp: new Date().toISOString(),
            durationMs: duration,
            error: errorMessage,
            errorType,
            errorCode,
            currentPath: router.pathname,
          });
        }

        // Session is invalid or expired - cleanup and redirect to login
        setUser(null);
        setUserProfile(null);
        tokenRefreshManager.stop();
        tokenRefreshManager.clearUserContext();

        // Clear any stale session cookies
        document.cookie = 'appwrite-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

        // If we're on a protected page, preserve the URL for post-login redirect
        const currentPath = router.pathname;
        const protectedPaths = ['/dashboard', '/private', '/profile'];
        const isProtectedPath = protectedPaths.some(path => currentPath.startsWith(path));

        if (isProtectedPath && currentPath !== '/login') {
          console.log('[AuthContext] Preserving return URL for post-login redirect', {
            timestamp: new Date().toISOString(),
            returnUrl: router.asPath,
          });

          // Store the return URL in sessionStorage for post-login redirect
          sessionStorage.setItem('returnUrl', router.asPath);

          // Only show notification if we haven't already shown one
          if (!hasShownExpirationNotification) {
            setHasShownExpirationNotification(true);

            // Redirect to login with a message
            toast({
              variant: "destructive",
              title: "Session Expired",
              description: "Your session has expired. Please log in again.",
            });
          }

          router.push('/login');
        }
      } finally {
        setInitializing(false);
      }
    };

    // Skip session check on public pages to avoid unnecessary 401 errors in console
    const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/'];
    const isPublicPath = publicPaths.includes(router.pathname);

    if (!isPublicPath) {
      fetchSession();
    } else {
      // On public pages, just mark as not initializing
      setInitializing(false);
      console.log('[AuthContext] Skipping session check on public page', {
        path: router.pathname,
      });
    }
  }, [router.pathname]);

  const logAuthEvent = async (action: string, userId: string, details?: any) => {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action,
          details: details || {},
        }),
      });
    } catch (error) {
      console.error('Failed to log authentication event:', error);
    }
  };

  const createUserProfile = async (userId: string, email: string, name?: string) => {
    try {
      console.log('[AuthContext] Checking for existing user profile', {
        timestamp: new Date().toISOString(),
        userId,
        email,
      });

      // Check if user profile already exists
      const existingProfile = await fetchUserProfile(userId);

      if (!existingProfile) {
        console.log('[AuthContext] Creating new user profile', {
          timestamp: new Date().toISOString(),
          userId,
          email,
          name: name || email.split('@')[0] || null,
        });

        // Create user profile in database
        await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
          ID.unique(),
          {
            userId,
            email,
            name: name || email.split('@')[0] || null,
            isInvited: false,
          }
        );

        console.log('[AuthContext] ✓ User profile created successfully', {
          timestamp: new Date().toISOString(),
          userId,
        });
      } else {
        console.log('[AuthContext] User profile already exists', {
          timestamp: new Date().toISOString(),
          userId,
          profileId: existingProfile.$id,
        });
      }
    } catch (error: any) {
      console.error('[AuthContext] ✗ Failed to create user profile', {
        timestamp: new Date().toISOString(),
        userId,
        email,
        error: error.message || 'Unknown error',
        errorType: error.type || 'unknown',
        errorCode: error.code || 'unknown',
        fullError: error,
      });

      // Don't show toast here - let the calling function handle it
      // This prevents duplicate error messages
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[AuthContext] Starting sign in', {
        timestamp: new Date().toISOString(),
        email,
        loginMethod: 'password',
      });

      // Validate email format before making API call
      validateEmail(email);

      // Reset notification flag on new login
      setHasShownExpirationNotification(false);

      // Delete any existing session first to prevent "session already active" error
      // This can happen after a refresh or if the user was logged out but session wasn't cleared
      try {
        await account.deleteSession('current');
        console.log('[AuthContext] Cleared existing session before login');
      } catch (error) {
        // Ignore errors - there might not be an existing session
        console.log('[AuthContext] No existing session to clear (expected on first login)');
      }

      // Create new session - this creates a session in Appwrite
      const session = await account.createEmailPasswordSession(email, password);

      console.log('[AuthContext] Session created', {
        sessionId: session.$id,
        userId: session.userId,
      });

      // Create a JWT for this session
      // JWTs are session-specific but don't invalidate other sessions
      const jwt = await account.createJWT();

      console.log('[AuthContext] JWT created', {
        jwtLength: jwt.jwt.length,
        jwtPreview: jwt.jwt.substring(0, 50) + '...',
      });

      // Store JWT in a cookie that our API routes can access
      // This JWT is tied to the current session but won't affect other sessions
      const isSecure = window.location.protocol === 'https:';
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

      // Try multiple cookie setting strategies for maximum compatibility
      // Strategy 1: Most permissive for localhost (no SameSite for older browsers)
      if (isLocalhost) {
        document.cookie = `appwrite-session=${jwt.jwt}; path=/; max-age=${60 * 60 * 24 * 7}`;
      } else if (isSecure) {
        // Strategy 2: For HTTPS, use SameSite=None with Secure (works in iframes)
        document.cookie = `appwrite-session=${jwt.jwt}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=None; Secure`;
      } else {
        // Strategy 3: Fallback for HTTP non-localhost
        document.cookie = `appwrite-session=${jwt.jwt}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      }

      // Check if cookie was actually set
      const cookieWasSet = document.cookie.includes('appwrite-session=');

      console.log('[AuthContext] Cookie set attempt', {
        isSecure,
        isLocalhost,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        cookieWasSet,
        documentCookieLength: document.cookie.length,
        isInIframe: window.self !== window.top,
      });

      // If cookie wasn't set (blocked by browser), store in localStorage as fallback
      // Note: localStorage won't be sent to API automatically, but we can use it client-side
      if (!cookieWasSet) {
        console.error('[AuthContext] ⚠️ COOKIE BLOCKED BY BROWSER', {
          message: 'Cookies are being blocked, likely due to iframe/third-party restrictions',
          isInIframe: window.self !== window.top,
          recommendation: 'Open in external browser or allow cookies in browser settings',
        });

        localStorage.setItem('appwrite-session-fallback', jwt.jwt);
        localStorage.setItem('appwrite-session-expiry', String(Date.now() + (60 * 60 * 24 * 7 * 1000)));

        // Show user-friendly error
        toast({
          variant: "destructive",
          title: "Cookie Blocked",
          description: "Your browser is blocking cookies. Some features may not work. Try opening in an external browser.",
          duration: 10000,
        });
      }

      // Additional verification logging
      console.log('[AuthContext] Final cookie verification', {
        cookieExists: cookieWasSet,
        allCookies: document.cookie.split(';').map(c => c.trim().split('=')[0]),
        documentCookieLength: document.cookie.length,
        fallbackUsed: !cookieWasSet,
      });

      // Get user account
      const currentUser = await account.get();
      setUser(currentUser);

      console.log('[AuthContext] ✓ User authenticated', {
        timestamp: new Date().toISOString(),
        userId: currentUser.$id,
        email: currentUser.email,
        sessionId: session.$id,
      });

      // Ensure user profile exists
      try {
        await createUserProfile(currentUser.$id, currentUser.email, currentUser.name);
      } catch (profileError: any) {
        console.error('[AuthContext] Profile creation failed, but continuing with login', {
          timestamp: new Date().toISOString(),
          userId: currentUser.$id,
          error: profileError.message || 'Unknown error',
        });
        // Continue with login even if profile creation fails
        // The user can still access the app, but some features may not work
      }

      // Fetch user profile
      const profile = await fetchUserProfile(currentUser.$id);
      setUserProfile(profile);

      console.log('[AuthContext] User profile fetched after login', {
        timestamp: new Date().toISOString(),
        userId: currentUser.$id,
        profileFound: !!profile,
        profileId: profile?.$id,
        roleId: profile?.roleId,
        hasRole: !!profile?.roleId,
        email: profile?.email,
      });

      if (!profile) {
        console.error('[AuthContext] ⚠️ User profile not found after login!', {
          timestamp: new Date().toISOString(),
          userId: currentUser.$id,
          email: currentUser.email,
        });
      } else if (!profile.roleId) {
        console.error('[AuthContext] ⚠️ User profile exists but has no role assigned!', {
          timestamp: new Date().toISOString(),
          userId: currentUser.$id,
          profileId: profile.$id,
          email: profile.email,
        });
      }

      // Set user context for token refresh logging
      tokenRefreshManager.setUserContext(currentUser.$id, session.$id);

      // Start token refresh timer (JWT expires in 15 minutes, refresh at 10 minutes)
      console.log('[AuthContext] Starting token refresh timer after login', {
        timestamp: new Date().toISOString(),
        userId: currentUser.$id,
        sessionId: session.$id,
      });

      // JWT object has jwt (string) and expire (number) properties
      const jwtExpiry = (jwt as any).expire || Math.floor(Date.now() / 1000) + (15 * 60);
      tokenRefreshManager.start(jwtExpiry);

      // Log the login event
      try {
        await logAuthEvent('auth_login', currentUser.$id, {
          email: currentUser.email,
          loginMethod: 'password',
          timestamp: new Date().toISOString()
        });
      } catch (logError) {
        console.error('[AuthContext] Failed to log login event:', logError);
      }

      toast({
        title: "Success",
        description: "You have successfully signed in",
      });

      // Check for return URL from session expiration
      const returnUrl = sessionStorage.getItem('returnUrl');
      if (returnUrl) {
        console.log('[AuthContext] Redirecting to preserved URL after session expiration', {
          timestamp: new Date().toISOString(),
          returnUrl,
        });
        sessionStorage.removeItem('returnUrl');
        router.push(returnUrl);
      }
    } catch (error: any) {
      console.error('[AuthContext] ✗ Sign in failed', {
        timestamp: new Date().toISOString(),
        email,
        error: error.message || 'Unknown error',
        errorType: error.type || 'unknown',
        errorCode: error.code || 'unknown',
        fullError: error,
      });

      // Provide more specific error messages based on error type
      let errorTitle = "Login Failed";
      let errorMessage = error.message || "Failed to sign in";

      if (error.type === 'invalid_email' || (error.message && error.message.toLowerCase().includes('valid email'))) {
        errorTitle = "Invalid Email";
        errorMessage = "Please enter a valid email address (e.g., user@example.com)";
      } else if (error.code === 401 || error.type === 'user_invalid_credentials') {
        errorMessage = "Invalid email or password. Please check your credentials and try again.";
      } else if (error.code === 429 || error.type === 'general_rate_limit_exceeded') {
        errorTitle = "Too Many Attempts";
        errorMessage = "You've made too many login attempts. Please wait a few minutes and try again.";
      } else if (error.type === 'user_blocked') {
        errorTitle = "Account Blocked";
        errorMessage = "Your account has been blocked. Please contact support for assistance.";
      } else if (error.message && error.message.includes('network')) {
        errorTitle = "Connection Error";
        errorMessage = "Unable to connect. Please check your internet connection and try again.";
      } else if (error.message && error.message.toLowerCase().includes('rate limit')) {
        errorTitle = "Too Many Attempts";
        errorMessage = "You've made too many login attempts. Please wait 5-10 minutes before trying again.";
      }

      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorMessage,
      });
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      // Create account in Appwrite Auth
      const newUser = await account.create(
        ID.unique(),
        email,
        password,
        name
      );

      // Create user profile in database
      await createUserProfile(newUser.$id, newUser.email, name);

      toast({
        title: "Success",
        description: "Sign up successful! Please login to continue.",
      });
    } catch (error: any) {
      console.error('Sign up error:', error);

      let errorTitle = "Sign Up Failed";
      let errorMessage = error.message || "Failed to sign up";

      if (error.code === 429 || error.type === 'general_rate_limit_exceeded') {
        errorTitle = "Too Many Attempts";
        errorMessage = "You've made too many sign up attempts. Please wait a few minutes and try again.";
      } else if (error.message && error.message.toLowerCase().includes('rate limit')) {
        errorTitle = "Too Many Attempts";
        errorMessage = "You've made too many sign up attempts. Please wait 5-10 minutes before trying again.";
      }

      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorMessage,
      });
      throw error;
    }
  };

  const signInWithMagicLink = async (email: string) => {
    try {
      // Create magic URL token
      await account.createMagicURLToken(
        ID.unique(),
        email,
        `${window.location.origin}/auth/callback`
      );

      toast({
        title: "Success",
        description: "Check your email for the login link",
      });
    } catch (error: any) {
      console.error('Magic link error:', error);

      let errorTitle = "Magic Link Failed";
      let errorMessage = error.message || "Failed to send magic link";

      if (error.code === 429 || error.type === 'general_rate_limit_exceeded') {
        errorTitle = "Too Many Attempts";
        errorMessage = "You've made too many magic link requests. Please wait a few minutes and try again.";
      } else if (error.message && error.message.toLowerCase().includes('rate limit')) {
        errorTitle = "Too Many Attempts";
        errorMessage = "You've made too many magic link requests. Please wait 5-10 minutes before trying again.";
      }

      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorMessage,
      });
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Initiate OAuth flow with Google
      account.createOAuth2Session(
        OAuthProvider.Google,
        `${window.location.origin}/auth/callback`,
        `${window.location.origin}/login`
      );
    } catch (error: any) {
      console.error('Google OAuth error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to sign in with Google",
      });
      throw error;
    }
  };

  const signOut = async () => {
    const currentUser = user;

    try {
      console.log('[AuthContext] Starting sign out', {
        timestamp: new Date().toISOString(),
        userId: currentUser?.$id || 'unknown',
      });

      // Stop token refresh timer
      tokenRefreshManager.stop();
      tokenRefreshManager.clearUserContext();

      // Reset notification flag
      setHasShownExpirationNotification(false);

      // Log the logout event before signing out
      if (currentUser) {
        try {
          await logAuthEvent('auth_logout', currentUser.$id, {
            email: currentUser.email,
            timestamp: new Date().toISOString()
          });
        } catch (logError) {
          console.error('[AuthContext] Failed to log logout event:', logError);
        }
      }

      // Delete current session in Appwrite
      await account.deleteSession('current');

      // Clear our custom session cookie
      document.cookie = 'appwrite-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

      // Clear state
      setUser(null);
      setUserProfile(null);

      console.log('[AuthContext] ✓ Sign out successful', {
        timestamp: new Date().toISOString(),
        userId: currentUser?.$id || 'unknown',
      });

      toast({
        title: "Success",
        description: "You have successfully signed out",
      });

      router.push('/');
    } catch (error: any) {
      console.error('[AuthContext] ✗ Sign out failed', {
        timestamp: new Date().toISOString(),
        userId: currentUser?.$id || 'unknown',
        error: error.message || 'Unknown error',
        errorType: error.type || 'unknown',
      });

      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to sign out",
      });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await account.createRecovery(
        email,
        `${window.location.origin}/reset-password`
      );

      toast({
        title: "Success",
        description: "Check your email for the password reset link",
      });
    } catch (error: any) {
      console.error('Password reset error:', error);

      let errorTitle = "Password Reset Failed";
      let errorMessage = error.message || "Failed to send password reset email";

      if (error.code === 429 || error.type === 'general_rate_limit_exceeded') {
        errorTitle = "Too Many Attempts";
        errorMessage = "You've made too many password reset requests. Please wait a few minutes and try again.";
      } else if (error.message && error.message.toLowerCase().includes('rate limit')) {
        errorTitle = "Too Many Attempts";
        errorMessage = "You've made too many password reset requests. Please wait 5-10 minutes before trying again.";
      }

      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorMessage,
      });
      throw error;
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      await account.updatePassword(newPassword);

      toast({
        title: "Success",
        description: "Password updated successfully",
      });
    } catch (error: any) {
      console.error('Password update error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update password",
      });
      throw error;
    }
  };

  /**
   * Manually trigger a token refresh
   * @returns Promise that resolves to true if refresh succeeded
   */
  const refreshToken = async (): Promise<boolean> => {
    console.log('[AuthContext] Manual token refresh requested');
    return await tokenRefreshManager.refresh();
  };

  /**
   * Check if token refresh is currently in progress
   * @returns true if refresh is in progress
   */
  const isTokenRefreshing = (): boolean => {
    return tokenRefreshManager.isRefreshing();
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      signIn,
      signUp,
      signInWithMagicLink,
      signInWithGoogle,
      signOut,
      resetPassword,
      updatePassword,
      initializing,
      refreshToken,
      isTokenRefreshing,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);