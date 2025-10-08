import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  switch (req.method) {
    case 'GET':
      // Users can always fetch their own profile - no permission check needed
      // User profile is already attached to request by middleware
      const { userProfile } = req;

      // Return user profile with role information
      return res.status(200).json(userProfile);

    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
});