import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res);
  
  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET':
        // Test database connection first
        try {
          await prisma.$queryRaw`SELECT 1`;
          console.log('✅ Database query test successful');
        } catch (dbError) {
          console.error('❌ Database connection test failed:', dbError);
          return res.status(500).json({ 
            error: 'Database connection failed', 
            details: dbError instanceof Error ? dbError.message : 'Unknown database error'
          });
        }

        // Users can always fetch their own profile - no permission check needed
        const userProfile = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            role: true
          }
        });

        if (!userProfile) {
          return res.status(404).json({ error: 'User profile not found' });
        }

        return res.status(200).json(userProfile);

      default:
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
}