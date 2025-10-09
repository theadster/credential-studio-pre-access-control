import type { NextApiRequest, NextApiResponse } from 'next';
import { Client, Account } from 'appwrite';

/**
 * Creates a public client for user-scoped operations
 * Used for password recovery which doesn't require admin privileges
 * 
 * @throws {Error} If required environment variables are missing
 */
const createPublicClient = () => {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

  if (!endpoint) {
    throw new Error('NEXT_PUBLIC_APPWRITE_ENDPOINT environment variable is required');
  }

  if (!projectId) {
    throw new Error('NEXT_PUBLIC_APPWRITE_PROJECT_ID environment variable is required');
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId);

  return {
    client,
    account: new Account(client),
  };
};

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

    // Use public client to complete the password recovery
    // This is a user-scoped operation that doesn't require admin privileges
    const { account } = createPublicClient();

    // Complete the recovery by updating the password
    await account.updateRecovery(userId, secret, password);

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Password recovery error:', {
      message: error.message,
      type: error.type,
      code: error.code
    });
    return res.status(500).json({
      error: error.message || 'Failed to complete password recovery'
    });
  }
}
