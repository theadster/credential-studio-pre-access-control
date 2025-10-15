import { Client, Account, Databases, Storage, Functions } from 'appwrite';
import { Client as AdminClient, Account as AdminAccount, Databases as AdminDatabases, Storage as AdminStorage, Functions as AdminFunctions, Users, Teams, TablesDB } from 'node-appwrite';
import type { NextApiRequest } from 'next';

/**
 * Creates a browser client for client-side operations
 * Used in React components and client-side code
 */
export const createBrowserClient = () => {
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (!projectId) {
    throw new Error('NEXT_PUBLIC_APPWRITE_PROJECT_ID environment variable is required');
  }

  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1')
    .setProject(projectId);

  return {
    client,
    account: new Account(client),
    databases: new Databases(client),
    storage: new Storage(client),
    functions: new Functions(client),
  };
};

/**
 * Creates a session client for API routes with user session
 * Uses JWT stored in custom cookie for authentication
 * @param req - Next.js API request object
 */
export const createSessionClient = (req: NextApiRequest) => {
  const client = new AdminClient()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

  // Get JWT from our custom cookie
  // Each session has its own JWT, so multiple sessions can coexist
  const jwt = req.cookies?.['appwrite-session'];
  
  if (jwt) {
    // Use the JWT with setJWT()
    // JWTs are session-specific and don't invalidate other sessions
    client.setJWT(jwt);
  }

  return {
    client,
    account: new AdminAccount(client),
    databases: new AdminDatabases(client),
    tablesDB: new TablesDB(client),
    storage: new AdminStorage(client),
    functions: new AdminFunctions(client),
  };
};

/**
 * Creates an admin client for server-side admin operations
 * Uses API key for elevated permissions
 * Note: Uses node-appwrite SDK which supports setKey() method
 */
export const createAdminClient = () => {
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!apiKey) {
    throw new Error('APPWRITE_API_KEY environment variable is not set');
  }

  const client = new AdminClient()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
    .setKey(apiKey);

  return {
    client,
    account: new AdminAccount(client),
    databases: new AdminDatabases(client),
    tablesDB: new TablesDB(client),
    storage: new AdminStorage(client),
    functions: new AdminFunctions(client),
    users: new Users(client),
    teams: new Teams(client),
  };
};

// Legacy exports for backward compatibility
// Create a default browser client instance
const defaultClient = createBrowserClient();

export const client = defaultClient.client;
export const account = defaultClient.account;
export const databases = defaultClient.databases;
export const storage = defaultClient.storage;
export const functions = defaultClient.functions;