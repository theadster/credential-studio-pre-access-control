import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createBrowserClient } from '@/lib/appwrite';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

/**
 * Email Verification Page
 * 
 * Handles email verification callback from Appwrite verification emails.
 * Users are redirected here after clicking the verification link in their email.
 * 
 * URL format: /verify-email?userId={userId}&secret={secret}
 */
export default function VerifyEmail() {
  const router = useRouter();
  const { userId, secret } = router.query;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const verifyEmail = async () => {
      // Wait for router to be ready
      if (!router.isReady) {
        return;
      }

      // Check if required params are present
      if (!userId || !secret) {
        setStatus('error');
        setErrorMessage('Missing or invalid verification link. Please request a new verification email.');
        return;
      }

      try {
        const { account } = createBrowserClient();

        // Complete email verification using the token
        await account.updateVerification(
          userId as string,
          secret as string
        );

        setStatus('success');

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login?verified=true');
        }, 3000);
      } catch (error: any) {
        console.error('Email verification error:', error);

        let message = 'Failed to verify email. The verification link may be invalid or expired.';

        if (error.code === 401) {
          message = 'Invalid verification link. Please request a new verification email.';
        } else if (error.code === 404) {
          message = 'Verification link not found. It may have already been used.';
        } else if (error.message) {
          message = error.message;
        }

        setErrorMessage(message);
        setStatus('error');
      }
    };

    verifyEmail();
  }, [router.isReady, userId, secret, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Email Verification</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Verifying your email address...'}
            {status === 'success' && 'Your email has been verified!'}
            {status === 'error' && 'Verification failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground text-center">
                Please wait while we verify your email address...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-green-700 dark:text-green-400">
                  Email verified successfully!
                </p>
                <p className="text-sm text-muted-foreground">
                  Your email address has been verified. You can now log in to your account.
                </p>
                <p className="text-sm text-muted-foreground">
                  Redirecting to login page...
                </p>
              </div>
              <Button onClick={() => router.push('/login?verified=true')}>
                Go to Login
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-red-500" />
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-red-700 dark:text-red-400">
                  Verification Failed
                </p>
                <p className="text-sm text-muted-foreground">
                  {errorMessage}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push('/login')}>
                  Go to Login
                </Button>
                <Button onClick={() => router.push('/signup')}>
                  Sign Up Again
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
