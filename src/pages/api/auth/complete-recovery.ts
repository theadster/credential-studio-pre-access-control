import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/appwrite';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, secret, password } = req.body;

    if (!userId || !secret || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Use admin client to complete the password recovery
    const { account } = createAdminClient();
    
    // Complete the recovery by updating the password
    await account.updateRecovery(userId, secret, password);

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Password recovery error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to complete password recovery' 
    });
  }
}
