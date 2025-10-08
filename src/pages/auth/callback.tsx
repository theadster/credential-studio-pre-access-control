import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { createBrowserClient } from '@/lib/appwrite'
import { ID } from 'appwrite'
import { useToast } from '@/components/ui/use-toast'

export default function AuthCallback() {
  const router = useRouter()
  const { account, databases } = createBrowserClient()
  const { toast } = useToast()
  const [processing, setProcessing] = useState(true)

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
      // Check if user profile already exists
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
        [`userId=${userId}`]
      );
      
      if (response.documents.length === 0) {
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
      }
    } catch (error) {
      console.error('Failed to create user profile:', error);
    }
  };

  useEffect(() => {
    const handleCallback = async () => {
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
            document.cookie = `appwrite-session=${jwt.jwt}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${
              window.location.protocol === 'https:' ? '; Secure' : ''
            }`
            
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
          await createUserProfile(user.$id, user.email, user.name)
          
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
                document.cookie = `appwrite-session=${jwt.jwt}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${
                  window.location.protocol === 'https:' ? '; Secure' : ''
                }`
                
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
              await createUserProfile(user.$id, user.email, user.name)
              
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
              document.cookie = 'appwrite-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
            } catch (cleanupError) {
              console.error('[OAuth Callback] Failed to cleanup cookies:', cleanupError)
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
          document.cookie = 'appwrite-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        } catch (cleanupError) {
          console.error('[Auth Callback] Failed to cleanup cookies:', cleanupError)
        }
        
        router.push('/login')
      } finally {
        setProcessing(false)
      }
    }

    if (router.isReady) {
      handleCallback()
    }
  }, [router.isReady, router.query])

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