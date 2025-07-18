import { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
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
      case 'POST':
        const { userId } = req.body;

        if (!userId) {
          return res.status(400).json({ error: 'User ID is required' });
        }

        // Check if user exists and is invited
        const invitedUser = await prisma.user.findUnique({
          where: { id: userId }
        });

        if (!invitedUser) {
          return res.status(404).json({ error: 'User not found' });
        }

        if (!invitedUser.isInvited) {
          return res.status(400).json({ error: 'User is not in invited status' });
        }

        // Generate invitation token
        const invitationToken = randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Token expires in 7 days

        // Create invitation record
        const invitation = await prisma.invitation.create({
          data: {
            id: randomUUID(),
            userId: userId,
            token: invitationToken,
            expiresAt: expiresAt,
            createdBy: user.id
          }
        });

        // Generate invitation URL
        const invitationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/signup?invitation=${invitationToken}`;

        return res.status(201).json({
          invitation,
          invitationUrl
        });

      default:
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}