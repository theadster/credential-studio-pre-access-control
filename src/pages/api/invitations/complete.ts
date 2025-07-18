import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { token, supabaseUserId } = req.body;

    if (!token || !supabaseUserId) {
      return res.status(400).json({ error: 'Token and Supabase user ID are required' });
    }

    // Find the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        user: true
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

    // Update the user record with the Supabase user ID and mark as no longer invited
    const updatedUser = await prisma.user.update({
      where: { id: invitation.user.id },
      data: {
        id: supabaseUserId, // Replace the temporary UUID with the real Supabase user ID
        isInvited: false
      },
      include: {
        role: true
      }
    });

    // Mark the invitation as used
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        usedAt: new Date()
      }
    });

    // Log the completion
    await prisma.log.create({
      data: {
        userId: supabaseUserId,
        action: 'complete_invitation',
        details: {
          type: 'invitation_completed',
          originalUserId: invitation.user.id,
          email: updatedUser.email
        }
      }
    });

    return res.status(200).json({
      success: true,
      user: updatedUser
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}