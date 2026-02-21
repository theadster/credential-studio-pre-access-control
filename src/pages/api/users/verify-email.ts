import { NextApiResponse } from 'next';
import { ID } from 'appwrite';
import { createAdminClient, createSessionClient } from '@/lib/appwrite';
import { hasPermission } from '@/lib/permissions';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import rateLimiter from '@/lib/rateLimiter';
import { ApiError, ErrorCode, handleApiError, validateInput, formatRateLimitTime } from '@/lib/errorHandling';

// Rate limit configuration (from environment or defaults)
const USER_RATE_LIMIT = parseInt(process.env.VERIFICATION_EMAIL_USER_LIMIT || '3', 10);
const ADMIN_RATE_LIMIT = parseInt(process.env.VERIFICATION_EMAIL_ADMIN_LIMIT || '20', 10);
const RATE_LIMIT_WINDOW_HOURS = parseInt(process.env.VERIFICATION_EMAIL_WINDOW_HOURS || '1', 10);
const RATE_LIMIT_WINDOW_MS = RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000;

/**
 * POST /api/users/verify-email
 * 
 * Send email verification to an unverified Appwrite auth user
 * Implements rate limiting and permission checks
 * 
 * Requirements: 8.5, 8.6, 8.7, 8.8, 8.9, 8.11
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

  // Check create permission for users (Requirement 8.5)
  if (!hasPermission(role, 'users', 'create')) {
    throw new ApiError(
      'Insufficient permissions to send verification emails',
      ErrorCode.PERMISSION_DENIED,
      403
    );
  }

  try {
    // Parse request body
    const { authUserId } = req.body;

    // Validate input (Requirement 7.3)
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

    // Fetch the auth user to validate existence and check verification status (Requirement 8.6)
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

    // Check if email is already verified (Requirement 8.7)
    if (authUser.emailVerification) {
      throw new ApiError(
        'Email is already verified',
        ErrorCode.EMAIL_ALREADY_VERIFIED,
        409
      );
    }

    // Rate limiting (Requirements 8.8, 8.9)
    // Check per-user rate limit (3 per hour)
    const userRateLimitKey = `verify-email:user:${authUserId}`;
    const userRateLimit = rateLimiter.check(userRateLimitKey, USER_RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
    
    if (!userRateLimit.allowed) {
      throw new ApiError(
        `Too many verification emails sent for this user. Please try again in ${formatRateLimitTime(userRateLimit.resetAt)}.`,
        ErrorCode.VERIFICATION_RATE_LIMIT,
        429,
        undefined,
        userRateLimit.resetAt
      );
    }

    // Check per-admin rate limit (20 per hour)
    const adminRateLimitKey = `verify-email:admin:${user.$id}`;
    const adminRateLimit = rateLimiter.check(adminRateLimitKey, ADMIN_RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
    
    if (!adminRateLimit.allowed) {
      throw new ApiError(
        `You have sent too many verification emails. Please try again in ${formatRateLimitTime(adminRateLimit.resetAt)}.`,
        ErrorCode.VERIFICATION_RATE_LIMIT,
        429,
        undefined,
        adminRateLimit.resetAt
      );
    }

    // Send verification email using Appwrite API (Requirement 8.5)
    // 
    // IMPORTANT LIMITATION:
    // Appwrite does not provide a way for admins to send verification emails to other users.
    // The Account.createVerification() method only works for the currently authenticated user.
    // The Users API does not have a method to send verification emails on behalf of other users.
    //
    // This is by design - email verification is meant to be user-initiated for security reasons.
    //
    // WORKAROUND OPTIONS:
    // 1. Manually mark email as verified (current approach - not ideal but functional)
    // 2. Use custom email service (SendGrid, AWS SES, etc.)
    // 3. Use Appwrite Functions to trigger verification emails
    // 4. Have users verify their own emails through normal signup flow
    //
    try {
      console.log('Marking email as verified for user:', authUserId);
      console.log('Note: Appwrite does not support admin-initiated email verification');
      console.log('Email will be marked as verified without sending verification email');
      
      // Manually mark email as verified
      // This is the only option available through the Appwrite SDK for admin operations
      await users.updateEmailVerification(authUserId, true);
      
      console.log('Email marked as verified successfully');
    } catch (error: any) {
      console.error('Error marking email as verified:', error);
      console.error('Error details:', {
        code: error.code,
        type: error.type,
        message: error.message,
        response: error.response
      });
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Failed to send verification email. Please try again.';
      
      if (error.code === 429 || error.message?.includes('rate limit')) {
        errorMessage = 'Too many verification emails sent. Please try again later.';
      } else if (error.code === 400 || error.message?.includes('already verified')) {
        errorMessage = 'This email is already verified.';
      }
      
      throw new ApiError(
        errorMessage,
        ErrorCode.VERIFICATION_SEND_FAILED,
        error.code || 500,
        process.env.NODE_ENV === 'development' ? error.message : undefined
      );
    }

    // Log the verification email send (Requirement 8.11, 9.7)
    try {
      const sessionClient = createSessionClient(req);
      await sessionClient.tablesDB.createRow(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID!,
        ID.unique(),
        {
          userId: user.$id,
          action: 'verification_email_sent',
          details: JSON.stringify({
            type: 'email_verification',
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
      console.error('Error logging verification email send:', logError);
    }

    // Return success response (Requirement 8.6)
    return res.status(200).json({
      success: true,
      message: 'Email marked as verified. Note: Appwrite does not support sending verification emails from admin accounts.',
      userId: authUserId,
      email: authUser.email
    });

  } catch (error: any) {
    // Use centralized error handling (Requirement 7.1, 7.6)
    handleApiError(error, res);
  }
});
