import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@/util/supabase/component'
import { useAuth } from '@/contexts/AuthContext'

export default function AuthCallback() {
  const router = useRouter()
  const supabase = createClient()

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

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const { createUser } = useAuth();
          await createUser(session.user);
          
          // Log the OAuth login event
          try {
            await logAuthEvent('auth_login', session.user.id, {
              email: session.user.email,
              loginMethod: 'oauth_google',
              timestamp: new Date().toISOString()
            });
          } catch (logError) {
            console.error('Failed to log OAuth login event:', logError);
          }
          
          router.push('/dashboard');
        } catch (error) {
          console.error('Error creating user:', error);
          // You might want to handle this error more gracefully
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [router])

  return null
}