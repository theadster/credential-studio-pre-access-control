import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { clearLogSettingsCache } from '@/lib/logSettings';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  try {
    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;
    const { databases } = createSessionClient(req);

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const logSettingsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_COLLECTION_ID!;
    const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;

    // Check permissions
    const permissions = userProfile.role ? userProfile.role.permissions : {};
    const canConfigureLogs = permissions.logs?.configure || false;

    switch (req.method) {
      case 'GET':
        // Check if user has permission to view log settings
        if (!canConfigureLogs) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }

        // Get or create log settings (there should only be one record)
        const logSettingsResult = await databases.listDocuments(
          dbId,
          logSettingsCollectionId,
          [Query.limit(1)]
        );

        let logSettings;
        if (logSettingsResult.documents.length === 0) {
          // Create default log settings if none exist
          logSettings = await databases.createDocument(
            dbId,
            logSettingsCollectionId,
            ID.unique(),
            {
              attendeeCreate: true,
              attendeeUpdate: true,
              attendeeDelete: true,
              attendeeView: false,
              attendeeBulkDelete: true,
              attendeeImport: true,
              attendeeExport: true,
              credentialGenerate: true,
              credentialClear: true,
              userCreate: true,
              userUpdate: true,
              userDelete: true,
              userView: false,
              userInvite: true,
              roleCreate: true,
              roleUpdate: true,
              roleDelete: true,
              roleView: false,
              eventSettingsUpdate: true,
              customFieldCreate: true,
              customFieldUpdate: true,
              customFieldDelete: true,
              customFieldReorder: true,
              authLogin: true,
              authLogout: true,
              logsDelete: true,
              logsExport: true,
              logsView: false,
              systemViewEventSettings: false,
              systemViewAttendeeList: false,
              systemViewRolesList: false,
              systemViewUsersList: false
            }
          );
        } else {
          logSettings = logSettingsResult.documents[0];
        }

        return res.status(200).json(logSettings);

      case 'PUT':
        // Check if user has permission to update log settings
        if (!canConfigureLogs) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const {
          attendeeCreate,
          attendeeUpdate,
          attendeeDelete,
          attendeeView,
          attendeeBulkDelete,
          attendeeImport,
          attendeeExport,
          credentialGenerate,
          credentialClear,
          userCreate,
          userUpdate,
          userDelete,
          userView,
          userInvite,
          roleCreate,
          roleUpdate,
          roleDelete,
          roleView,
          eventSettingsUpdate,
          customFieldCreate,
          customFieldUpdate,
          customFieldDelete,
          customFieldReorder,
          authLogin,
          authLogout,
          logsDelete,
          logsExport,
          logsView,
          systemViewEventSettings,
          systemViewAttendeeList,
          systemViewRolesList,
          systemViewUsersList
        } = req.body;

        // Get existing settings or create new ones
        const existingSettingsResult = await databases.listDocuments(
          dbId,
          logSettingsCollectionId,
          [Query.limit(1)]
        );

        // Prepare update data
        const updateData: any = {};
        if (attendeeCreate !== undefined) updateData.attendeeCreate = attendeeCreate;
        if (attendeeUpdate !== undefined) updateData.attendeeUpdate = attendeeUpdate;
        if (attendeeDelete !== undefined) updateData.attendeeDelete = attendeeDelete;
        if (attendeeView !== undefined) updateData.attendeeView = attendeeView;
        if (attendeeBulkDelete !== undefined) updateData.attendeeBulkDelete = attendeeBulkDelete;
        if (attendeeImport !== undefined) updateData.attendeeImport = attendeeImport;
        if (attendeeExport !== undefined) updateData.attendeeExport = attendeeExport;
        if (credentialGenerate !== undefined) updateData.credentialGenerate = credentialGenerate;
        if (credentialClear !== undefined) updateData.credentialClear = credentialClear;
        if (userCreate !== undefined) updateData.userCreate = userCreate;
        if (userUpdate !== undefined) updateData.userUpdate = userUpdate;
        if (userDelete !== undefined) updateData.userDelete = userDelete;
        if (userView !== undefined) updateData.userView = userView;
        if (userInvite !== undefined) updateData.userInvite = userInvite;
        if (roleCreate !== undefined) updateData.roleCreate = roleCreate;
        if (roleUpdate !== undefined) updateData.roleUpdate = roleUpdate;
        if (roleDelete !== undefined) updateData.roleDelete = roleDelete;
        if (roleView !== undefined) updateData.roleView = roleView;
        if (eventSettingsUpdate !== undefined) updateData.eventSettingsUpdate = eventSettingsUpdate;
        if (customFieldCreate !== undefined) updateData.customFieldCreate = customFieldCreate;
        if (customFieldUpdate !== undefined) updateData.customFieldUpdate = customFieldUpdate;
        if (customFieldDelete !== undefined) updateData.customFieldDelete = customFieldDelete;
        if (customFieldReorder !== undefined) updateData.customFieldReorder = customFieldReorder;
        if (authLogin !== undefined) updateData.authLogin = authLogin;
        if (authLogout !== undefined) updateData.authLogout = authLogout;
        if (logsDelete !== undefined) updateData.logsDelete = logsDelete;
        if (logsExport !== undefined) updateData.logsExport = logsExport;
        if (logsView !== undefined) updateData.logsView = logsView;
        if (systemViewEventSettings !== undefined) updateData.systemViewEventSettings = systemViewEventSettings;
        if (systemViewAttendeeList !== undefined) updateData.systemViewAttendeeList = systemViewAttendeeList;
        if (systemViewRolesList !== undefined) updateData.systemViewRolesList = systemViewRolesList;
        if (systemViewUsersList !== undefined) updateData.systemViewUsersList = systemViewUsersList;

        let updatedSettings;
        if (existingSettingsResult.documents.length > 0) {
          // Update existing settings
          updatedSettings = await databases.updateDocument(
            dbId,
            logSettingsCollectionId,
            existingSettingsResult.documents[0].$id,
            updateData
          );
        } else {
          // Create new settings with provided values
          updatedSettings = await databases.createDocument(
            dbId,
            logSettingsCollectionId,
            ID.unique(),
            {
              attendeeCreate: attendeeCreate ?? true,
              attendeeUpdate: attendeeUpdate ?? true,
              attendeeDelete: attendeeDelete ?? true,
              attendeeView: attendeeView ?? false,
              attendeeBulkDelete: attendeeBulkDelete ?? true,
              attendeeImport: attendeeImport ?? true,
              attendeeExport: attendeeExport ?? true,
              credentialGenerate: credentialGenerate ?? true,
              credentialClear: credentialClear ?? true,
              userCreate: userCreate ?? true,
              userUpdate: userUpdate ?? true,
              userDelete: userDelete ?? true,
              userView: userView ?? false,
              userInvite: userInvite ?? true,
              roleCreate: roleCreate ?? true,
              roleUpdate: roleUpdate ?? true,
              roleDelete: roleDelete ?? true,
              roleView: roleView ?? false,
              eventSettingsUpdate: eventSettingsUpdate ?? true,
              customFieldCreate: customFieldCreate ?? true,
              customFieldUpdate: customFieldUpdate ?? true,
              customFieldDelete: customFieldDelete ?? true,
              customFieldReorder: customFieldReorder ?? true,
              authLogin: authLogin ?? true,
              authLogout: authLogout ?? true,
              logsDelete: logsDelete ?? true,
              logsExport: logsExport ?? true,
              logsView: logsView ?? false,
              systemViewEventSettings: systemViewEventSettings ?? false,
              systemViewAttendeeList: systemViewAttendeeList ?? false,
              systemViewRolesList: systemViewRolesList ?? false,
              systemViewUsersList: systemViewUsersList ?? false
            }
          );
        }

        // Clear the cache so new settings take effect immediately
        clearLogSettingsCache();

        // Log the settings update
        await databases.createDocument(
          dbId,
          logsCollectionId,
          ID.unique(),
          {
            userId: user.$id,
            action: 'update',
            details: JSON.stringify({
              type: 'log_settings',
              changes: req.body
            })
          }
        );

        return res.status(200).json(updatedSettings);

      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('API Error:', error);
    
    // Handle Appwrite-specific errors
    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    } else if (error.code === 404) {
      return res.status(404).json({ error: 'Resource not found' });
    } else if (error.code === 409) {
      return res.status(409).json({ error: 'Conflict - resource already exists' });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
});