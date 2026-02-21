import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    // Validate required environment variables
    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
    const usersTableId = process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID;
    const logsTableId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID;

    if (!dbId || !usersTableId || !logsTableId) {
      console.error('Missing required environment variables:', {
        dbId: !dbId ? 'NEXT_PUBLIC_APPWRITE_DATABASE_ID' : undefined,
        usersTableId: !usersTableId ? 'NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID' : undefined,
        logsTableId: !logsTableId ? 'NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID' : undefined
      });
      return res.status(500).json({ error: 'Server configuration error: missing database configuration' });
    }

    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Create admin client for database operations
    const { tablesDB, users } = createAdminClient();

    // Check if user already exists in database
    const existingUserDocs = await tablesDB.listRows({
      databaseId: dbId,
      tableId: usersTableId,
      queries: [Query.equal('email', email)]
    });

    if (existingUserDocs.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    try {
      // Create user in Appwrite Auth
      const authUser = await users.create(
        ID.unique(),
        email,
        undefined, // phone
        password,
        name
      );

      // Create new user profile in database
      // NOTE: Self-signup users are NOT automatically added to teams
      // They must be manually linked by an administrator
      await tablesDB.createRow({
        databaseId: dbId,
        tableId: usersTableId,
        rowId: ID.unique(),
        data: {
          userId: authUser.$id,
          email: email,
          name: name,
          roleId: null, // No role assigned for self-signup
          isInvited: false
        }
      });

      // Log the signup
      await tablesDB.createRow({
        databaseId: dbId,
        tableId: logsTableId,
        rowId: ID.unique(),
        data: {
          userId: authUser.$id,
          action: 'signup',
          details: JSON.stringify({
            type: 'self_signup',
            email: email
          })
        }
      });

      return res.status(200).json({
        success: true,
        user: {
          id: authUser.$id,
          email: authUser.email,
          name: authUser.name
        }
      });

    } catch (authError: any) {
      console.error('Error creating user:', authError);
      
      // Check for duplicate email in auth system
      if (authError.code === 409 || authError.message?.includes('already exists')) {
        return res.status(400).json({ 
          error: 'A user with this email already exists' 
        });
      }
      
      // Check for invalid password
      if (authError.code === 400 && authError.message?.includes('password')) {
        return res.status(400).json({ 
          error: 'Password must be at least 8 characters long' 
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to create user account',
        details: authError.message
      });
    }

  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}