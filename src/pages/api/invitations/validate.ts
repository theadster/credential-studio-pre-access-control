import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invitation token is required' });
    }

    // Find the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            role: true
          }
        }
      }
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invalid invitation token' });
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Check if invitation has already been used
    if (invitation.usedAt) {
      return res.status(400).json({ error: 'Invitation has already been used' });
    }

    // Check if user is still in invited status
    if (!invitation.user.isInvited) {
      return res.status(400).json({ error: 'User is no longer in invited status' });
    }

    return res.status(200).json({
      valid: true,
      user: {
        id: invitation.user.id,
        email: invitation.user.email,
        name: invitation.user.name,
        role: invitation.user.role
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}