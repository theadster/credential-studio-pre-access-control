import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';

interface IntegrationStatus {
  cloudinary: boolean;
  switchboard: boolean;
}

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    // Check if required environment variables are configured
    const status: IntegrationStatus = {
      cloudinary: !!(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      ),
      switchboard: !!process.env.SWITCHBOARD_API_KEY
    };

    return res.status(200).json(status);
  } catch (error: any) {
    console.error('Integration status check error:', error);
    return res.status(500).json({ error: 'Failed to check integration status' });
  }
});
