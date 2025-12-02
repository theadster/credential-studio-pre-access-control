import { NextApiResponse } from 'next';
import { ID } from 'appwrite';
import { createAdminClient, createSessionClient } from '@/lib/appwrite';
import { hasPermission } from '@/lib/permissions';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import rateLimiter from '@/lib/rateLimiter';
import { ApiError, ErrorCode, handleApiError, validateInput, formatRateLimitTime } from '@/lib/errorHandling';

// Rate limit configuration (from environment or defaults)
const USER_RATE_LIMIT = parseInt(process.env.PASSWORD_RESET_USER_LIMIT || '3', 10);
const ADMIN_RATE_LIMIT = parseInt(process.env.PASSWORD_RESET_ADMIN_LIMIT || '20', 10);
const RATE_LIMIT_WINDOW_HOURS = parseInt(process.env.PASSWORD_RESET_WINDOW_HOURS || '1', 10);
const RATE_LIMIT_WINDOW_MS = RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000;

/**
 * POST /api/users/send-password-reset
 * 
 * Send password reset email to an Appwrite auth user
 * Implements rate limiting and permission checks
 * Allows administrators to help users reset their passwords
 */
export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { user, userProfile } = req;
  
  // Extract role from userProfile for permission checks
  const role = userProfile.role ? {
    ...userProfile.role,
    permissions: userProfile.role.permissions
  } : null;

  // Check users.update permission (password reset is an update operation)
  if (!hasPermission(role, 'users', 'update')) {
    throw new ApiError(
      'Insufficient permissions to send password reset emails',
      ErrorCode.PERMISSION_DENIED,
      403
    );
  }

  try {
    // Parse request body
    const { authUserId } = req.body;

    // Validate input
    validateInput([
      {
        field: 'authUserId',
        value: authUserId,
        rules: {
          required: true,
          message: 'Auth user ID is required'
        }
      }
    ]);

    // Create admin client to access Users API
    const adminClient = createAdminClient();
    const { users } = adminClient;

    // Fetch the auth user to validate existence
    let authUser;
    try {
      authUser = await users.get(authUserId);
    } catch (error: any) {
      if (error.code === 404 || error.type === 'user_not_found') {
        throw new ApiError(
          'User not found',
          ErrorCode.INVALID_AUTH_USER,
          404
        );
      }
      throw error;
    }

    // Rate limiting
    // Check per-user rate limit (3 per hour)
    const userRateLimitKey = `password-reset:user:${authUserId}`;
    const userRateLimit = rateLimiter.check(userRateLimitKey, USER_RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
    
    if (!userRateLimit.allowed) {
      throw new ApiError(
        `Too many password reset emails sent for this user. Please try again in ${formatRateLimitTime(userRateLimit.resetAt)}.`,
        ErrorCode.VERIFICATION_RATE_LIMIT,
        429,
        undefined,
        userRateLimit.resetAt
      );
    }

    // Check per-admin rate limit (20 per hour)
    const adminRateLimitKey = `password-reset:admin:${user.$id}`;
    const adminRateLimit = rateLimiter.check(adminRateLimitKey, ADMIN_RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
    
    if (!adminRateLimit.allowed) {
      throw new ApiError(
        `You have sent too many password reset emails. Please try again in ${formatRateLimitTime(adminRateLimit.resetAt)}.`,
        ErrorCode.VERIFICATION_RATE_LIMIT,
        429,
        undefined,
        adminRateLimit.resetAt
      );
    }

    // Send password reset email using Appwrite API
    try {
      // Get reset URL from environment or use default
      const resetUrl = process.env.NEXT_PUBLIC_PASSWORD_RESET_URL || 
                      (process.env.NEXT_PUBLIC_APP_URL ? process.env.NEXT_PUBLIC_APP_URL + '/reset-password' : null) || 
                      'http://localhost:3000/reset-password';
      

      
      // Create password recovery token
      // Note: Appwrite's Users API (admin) doesn't have a password recovery method
      // We need to use the Account API, which is public and doesn't require authentication
      // Create a new client without authentication for this public operation
      const { Client, Account } = await import('node-appwrite');
      const publicClient = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1')
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');
      
      const publicAccount = new Account(publicClient);
      
      // This generates a secure token and triggers Appwrite to send the password reset email
      await publicAccount.createRecovery(authUser.email, resetUrl);
      
      // Note: The password is NOT reset yet - user must click the link in their email
      // The reset is completed when they visit the reset URL with the token and set a new password
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      console.error('Error details:', {
        code: error.code,
        type: error.type,
        message: error.message,
        response: error.response
      });
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Failed to send password reset email. Please try again.';
      
      if (error.code === 429 || error.message?.includes('rate limit')) {
        errorMessage = 'Too many password reset emails sent. Please try again later.';
      } else if (error.code === 400 || error.message?.includes('invalid email')) {
        errorMessage = 'Invalid email address.';
      } else if (error.message?.includes('SMTP') || error.message?.includes('email')) {
        errorMessage = 'Email service configuration error. Please contact your administrator.';
      }
      
      throw new ApiError(
        errorMessage,
        ErrorCode.VERIFICATION_SEND_FAILED,
        error.code || 500,
        process.env.NODE_ENV === 'development' ? error.message : undefined
      );
    }

    // Log the password reset email send
    try {
      const sessionClient = createSessionClient(req);
      await sessionClient.databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
        ID.unique(),
        {
          userId: user.$id,
          action: 'password_reset_email_sent',
          details: JSON.stringify({
            type: 'password_reset',
            operation: 'send',
            targetUserId: authUserId,
            targetUserEmail: authUser.email,
            targetUserName: authUser.name,
            administratorId: user.$id,
            administratorEmail: user.email,
            administratorName: user.name,
            timestamp: new Date().toISOString()
          })
        }
      );
    } catch (logError) {
      // Log error but don't fail the request
      console.error('Error logging password reset email send:', logError);
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully. User must click the link in their email to reset their password.',
      userId: authUserId,
      email: authUser.email
    });

  } catch (error: any) {
    // Use centralized error handling
    handleApiError(error, res);
  }
});
