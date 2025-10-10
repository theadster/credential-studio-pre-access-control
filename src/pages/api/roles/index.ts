import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { hasPermission } from '@/lib/permissions';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { shouldLog } from '@/lib/logSettings';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  // User and userProfile are already attached by middleware
  const { user, userProfile } = req;
  const { databases } = createSessionClient(req);
  
  // Extract role from userProfile for permission checks
  const role = userProfile.role;

    switch (req.method) {
      case 'GET':
        // List all roles with user count
        const rolesResponse = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
          [Query.orderAsc('$createdAt')]
        );

        // Get user count for each role and parse permissions
        const rolesWithCount = await Promise.all(
          rolesResponse.documents.map(async (roleDoc) => {
            const usersWithRole = await databases.listDocuments(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
              [Query.equal('roleId', roleDoc.$id), Query.limit(1)]
            );
            
            return {
              ...roleDoc,
              permissions: typeof roleDoc.permissions === 'string' 
                ? JSON.parse(roleDoc.permissions) 
                : roleDoc.permissions,
              _count: {
                users: usersWithRole.total
              }
            };
          })
        );

        // Log the view action if enabled
        if (await shouldLog('systemViewRolesList')) {
          try {
            // Check for recent duplicate logs (within last 5 seconds)
            const recentLogs = await databases.listDocuments(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
              [
                Query.equal('userId', user.$id),
                Query.equal('action', 'view'),
                Query.greaterThan('$createdAt', new Date(Date.now() - 5000).toISOString()),
                Query.limit(5)
              ]
            );

            // Check if there's already a recent roles view log
            const hasDuplicate = recentLogs.documents.some(log => {
              try {
                const details = JSON.parse(log.details);
                return details.target === 'Roles' || (details.type === 'system' && details.operation === 'view_roles');
              } catch {
                return false;
              }
            });

            if (!hasDuplicate) {
              await databases.createDocument(
                process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
                ID.unique(),
                {
                  userId: user.$id,
                  action: 'view',
                  details: JSON.stringify({
                    type: 'system',
                    target: 'Roles',
                    description: `Viewed ${rolesWithCount.length} role${rolesWithCount.length !== 1 ? 's' : ''}`,
                    count: rolesWithCount.length
                  })
                }
              );
            }
          } catch (logError) {
            console.error('Error creating log:', logError);
            // Continue even if logging fails
          }
        }

        return res.status(200).json(rolesWithCount);

      case 'POST':
        // Check permission to create roles
        if (!role || !hasPermission(role, 'roles', 'create')) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const { name, description, permissions } = req.body;

        if (!name || !permissions) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate permissions structure
        if (typeof permissions !== 'object') {
          return res.status(400).json({ error: 'Permissions must be a valid JSON object' });
        }

        // Check if role name already exists
        const existingRoles = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
          [Query.equal('name', name)]
        );

        if (existingRoles.documents.length > 0) {
          return res.status(400).json({ error: 'Role name already exists' });
        }

        // Create new role
        const newRole = await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
          ID.unique(),
          {
            name,
            description: description || '',
            permissions: JSON.stringify(permissions)
          }
        );

        // Add user count (0 for new role)
        const newRoleWithCount = {
          ...newRole,
          _count: {
            users: 0
          }
        };

        // Log the create action
        try {
          const { createRoleLogDetails } = await import('@/lib/logFormatting');
          await databases.createDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
            ID.unique(),
            {
              userId: user.$id,
              action: 'create',
              details: JSON.stringify(createRoleLogDetails('create', {
                name: newRole.name,
                id: newRole.$id
              }, {
                description: newRole.description,
                permissions: Object.keys(permissions)
              }))
            }
          );
        } catch (logError) {
          console.error('Error creating log:', logError);
          // Continue even if logging fails
        }

        return res.status(201).json(newRoleWithCount);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
});