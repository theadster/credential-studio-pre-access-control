import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { createBrowserClient } from '@/lib/appwrite'
import { ID, Query } from 'appwrite'
import { useToast } from '@/components/ui/use-toast'

/**
 * Creates a standardized cookie string with consistent formatting
 * 
 * @param name - Cookie name
 * @param value - Cookie value
 * @param maxAge - Max age in seconds (default: 7 days)
 * @returns Formatted cookie string with path, max-age, SameSite, and conditional Secure
 */
const createCookieString = (name: string, value: string, maxAge: number = 60 * 60 * 24 * 7): string => {
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  return `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
};

export default function AuthCallback() {
  const router = useRouter()
  const { account, databases } = createBrowserClient()
  const { toast } = useToast()
  const [processing, setProcessing] = useState(true)
  const callbackExecuted = useRef(false)

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

  const createUserProfile = async (userId: string, email: string, name?: string): Promise<boolean> => {
    try {
      // Check if user profile already exists
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
        [Query.equal('userId', userId)]
      );

      if (response.documents.length === 0) {
        // Create user profile in database with retry logic
        const maxRetries = 3;
        let lastError: any;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
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
            console.log(`[User Profile] ✓ Created user profile for ${email} (attempt ${attempt})`);
            return true;
          } catch (error: any) {
            lastError = error;
            console.warn(`[User Profile] Attempt ${attempt}/${maxRetries} failed:`, error.message);

            if (attempt < maxRetries) {
              // Exponential backoff: 500ms, 1000ms
              const backoffMs = attempt * 500;
              await new Promise(resolve => setTimeout(resolve, backoffMs));
            }
          }
        }

        // All retries failed
        console.error('[User Profile] ✗ Failed to create user profile after all retries:', lastError);
        return false;
      }

      // Profile already exists
      console.log(`[User Profile] Profile already exists for ${email}`);
      return true;
    } catch (error) {
      console.error('[User Profile] ✗ Failed to check/create user profile:', error);
      return false;
    }
  };

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent double-invocation
      if (callbackExecuted.current) return
      callbackExecuted.current = true

      try {
        const { userId, secret } = router.query

        if (userId && secret) {
          // Handle magic link authentication
          console.log('[Magic Link Callback] Starting magic link authentication', {
            timestamp: new Date().toISOString(),
            userId: userId as string,
            loginMethod: 'magic_link',
          })

          const session = await account.createSession(userId as string, secret as string)

          console.log('[Magic Link Callback] ✓ Session created', {
            timestamp: new Date().toISOString(),
            userId: userId as string,
            sessionId: session.$id,
          })

          // Get user account
          const user = await account.get()

          console.log('[Magic Link Callback] ✓ User authenticated', {
            timestamp: new Date().toISOString(),
            userId: user.$id,
            email: user.email,
          })

          // Create JWT for this session
          console.log('[Magic Link Callback] Creating JWT for magic link session', {
            timestamp: new Date().toISOString(),
            userId: user.$id,
            sessionId: session.$id,
          })

          try {
            const jwt = await account.createJWT()

            // Store JWT in cookie for API routes
            document.cookie = createCookieString('appwrite-session', jwt.jwt)

            console.log('[Magic Link Callback] ✓ JWT created and stored', {
              timestamp: new Date().toISOString(),
              userId: user.$id,
              sessionId: session.$id,
              jwtExpiry: new Date((jwt as any).expire * 1000).toISOString(),
            })
          } catch (jwtError) {
            console.error('[Magic Link Callback] ✗ Failed to create JWT', {
              timestamp: new Date().toISOString(),
              userId: user.$id,
              error: jwtError instanceof Error ? jwtError.message : 'Unknown error',
              errorType: (jwtError as any)?.type || 'unknown',
            })
            throw jwtError
          }

          // Create user profile if needed
          const profileCreated = await createUserProfile(user.$id, user.email, user.name)

          if (!profileCreated) {
            console.error('[Magic Link Callback] ✗ Failed to create user profile', {
              timestamp: new Date().toISOString(),
              userId: user.$id,
              email: user.email,
            })

            toast({
              variant: "destructive",
              title: "Profile Creation Failed",
              description: "Failed to create your user profile. Please contact support.",
            })

            throw new Error('Failed to create user profile')
          }

          // Log the magic link login event
          console.log('[Magic Link Callback] Logging magic link authentication event', {
            timestamp: new Date().toISOString(),
            userId: user.$id,
            email: user.email,
          })

          await logAuthEvent('auth_login', user.$id, {
            email: user.email,
            loginMethod: 'magic_link',
            timestamp: new Date().toISOString()
          })

          console.log('[Magic Link Callback] ✓ Magic link authentication complete', {
            timestamp: new Date().toISOString(),
            userId: user.$id,
            email: user.email,
          })

          toast({
            title: "Success",
            description: "You have successfully signed in",
          })

          // Redirect to dashboard
          // Note: Token refresh will be started by AuthContext when it detects the new session
          router.push('/dashboard')
        } else {
          // Handle OAuth callback
          try {
            console.log('[OAuth Callback] Starting OAuth authentication', {
              timestamp: new Date().toISOString(),
              loginMethod: 'oauth_google',
            })

            const user = await account.get()

            if (user) {
              console.log('[OAuth Callback] ✓ User authenticated', {
                timestamp: new Date().toISOString(),
                userId: user.$id,
                email: user.email,
                name: user.name,
              })

              // Get current session
              const session = await account.getSession('current')

              console.log('[OAuth Callback] Session retrieved', {
                timestamp: new Date().toISOString(),
                userId: user.$id,
                sessionId: session.$id,
              })

              // Create JWT for this session
              // This is critical for API authentication and token refresh
              console.log('[OAuth Callback] Creating JWT for OAuth session', {
                timestamp: new Date().toISOString(),
                userId: user.$id,
                sessionId: session.$id,
              })

              try {
                const jwt = await account.createJWT()

                // Store JWT in cookie for API routes
                document.cookie = createCookieString('appwrite-session', jwt.jwt)

                console.log('[OAuth Callback] ✓ JWT created and stored', {
                  timestamp: new Date().toISOString(),
                  userId: user.$id,
                  sessionId: session.$id,
                  jwtExpiry: new Date((jwt as any).expire * 1000).toISOString(),
                })
              } catch (jwtError) {
                console.error('[OAuth Callback] ✗ Failed to create JWT', {
                  timestamp: new Date().toISOString(),
                  userId: user.$id,
                  error: jwtError instanceof Error ? jwtError.message : 'Unknown error',
                  errorType: (jwtError as any)?.type || 'unknown',
                })
                throw jwtError
              }

              // Create user profile if needed
              const profileCreated = await createUserProfile(user.$id, user.email, user.name)

              if (!profileCreated) {
                console.error('[OAuth Callback] ✗ Failed to create user profile', {
                  timestamp: new Date().toISOString(),
                  userId: user.$id,
                  email: user.email,
                })

                toast({
                  variant: "destructive",
                  title: "Profile Creation Failed",
                  description: "Failed to create your user profile. Please contact support.",
                })

                throw new Error('Failed to create user profile')
              }

              // Log the OAuth login event
              console.log('[OAuth Callback] Logging OAuth authentication event', {
                timestamp: new Date().toISOString(),
                userId: user.$id,
                email: user.email,
              })

              await logAuthEvent('auth_login', user.$id, {
                email: user.email,
                loginMethod: 'oauth_google',
                timestamp: new Date().toISOString()
              })

              console.log('[OAuth Callback] ✓ OAuth authentication complete', {
                timestamp: new Date().toISOString(),
                userId: user.$id,
                email: user.email,
              })

              toast({
                title: "Success",
                description: "You have successfully signed in with Google",
              })

              // Redirect to dashboard
              // Note: Token refresh will be started by AuthContext when it detects the new session
              router.push('/dashboard')
            } else {
              throw new Error('No user found after OAuth')
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            const errorType = (error as any)?.type || 'unknown'

            console.error('[OAuth Callback] ✗ OAuth authentication failed', {
              timestamp: new Date().toISOString(),
              error: errorMessage,
              errorType,
            })

            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to complete authentication",
            })

            // Clean up any partial state
            try {
              // Force delete cookie with all possible attributes
              const isSecure = window.location.protocol === 'https:'
              const cookieOptions = `path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${isSecure ? '; Secure' : ''}`
              document.cookie = `appwrite-session=; ${cookieOptions}`

              // Retry with empty value to ensure cleanup
              document.cookie = `appwrite-session=''; ${cookieOptions}`
            } catch (cleanupError) {
              console.error('[OAuth Callback] Failed to cleanup cookies:', cleanupError)

              // Log full error for diagnostics
              await logAuthEvent('auth_cookie_cleanup_failed', 'unknown', {
                error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
                context: 'oauth_callback_error',
                timestamp: new Date().toISOString()
              }).catch(logError => console.error('Failed to log cleanup error:', logError))

              // Show user-visible warning
              toast({
                variant: "destructive",
                title: "Warning",
                description: "Failed to clean up session data. Please clear your browser cookies if you experience issues.",
              })
            }

            router.push('/login')
          }
        }
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        const errorType = (error as any)?.type || 'unknown'

        console.error('[Auth Callback] ✗ Authentication callback failed', {
          timestamp: new Date().toISOString(),
          error: errorMessage,
          errorType,
          hasUserId: !!router.query.userId,
          hasSecret: !!router.query.secret,
        })

        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Authentication failed",
        })

        // Clean up any partial state
        try {
          // Force delete cookie with all possible attributes
          const isSecure = window.location.protocol === 'https:'
          const cookieOptions = `path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${isSecure ? '; Secure' : ''}`
          document.cookie = `appwrite-session=; ${cookieOptions}`

          // Retry with empty value to ensure cleanup
          document.cookie = `appwrite-session=''; ${cookieOptions}`
        } catch (cleanupError) {
          console.error('[Auth Callback] Failed to cleanup cookies:', cleanupError)

          // Log full error for diagnostics
          await logAuthEvent('auth_cookie_cleanup_failed', 'unknown', {
            error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
            context: 'auth_callback_error',
            timestamp: new Date().toISOString()
          }).catch(logError => console.error('Failed to log cleanup error:', logError))

          // Show user-visible warning
          toast({
            variant: "destructive",
            title: "Warning",
            description: "Failed to clean up session data. Please clear your browser cookies if you experience issues.",
          })
        }

        router.push('/login')
      } finally {
        setProcessing(false)
      }
    }

    if (router.isReady) {
      handleCallback()
    }
  }, [router.isReady])

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Completing authentication...</p>
        </div>
      </div>
    )
  }

  return null
}
