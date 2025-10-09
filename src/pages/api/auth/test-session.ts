import { NextApiRequest, NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate required environment variable
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (!projectId) {
    return res.status(500).json({ 
      error: 'Server configuration error: NEXT_PUBLIC_APPWRITE_PROJECT_ID is not defined' 
    });
  }

  try {
    // Log all cookies
    console.log('All cookies:', req.cookies);
    
    // Check for Appwrite session cookie
    const sessionCookieName = `a_session_${projectId}`;
    const sessionId = req.cookies?.[sessionCookieName];
    
    console.log('Looking for cookie:', sessionCookieName);
    console.log('Session ID found:', sessionId ? 'Yes' : 'No');
    
    if (!sessionId) {
      return res.status(200).json({
        authenticated: false,
        message: 'No session cookie found',
        expectedCookieName: sessionCookieName,
        availableCookies: Object.keys(req.cookies || {}),
      });
    }
    
    // Try to get user with session
    const { account } = createSessionClient(req);
    const user = await account.get();
    
    return res.status(200).json({
      authenticated: true,
      user: {
        $id: user.$id,
        email: user.email,
        name: user.name,
      },
      sessionCookieName,
    });
  } catch (error: any) {
    console.error('Session test error:', error);
    const statusCode = error.code === 401 ? 401 : 500;
    return res.status(statusCode).json({
      authenticated: false,
      error: error.message,
      code: error.code,
      type: error.type,
    });
  }
}
