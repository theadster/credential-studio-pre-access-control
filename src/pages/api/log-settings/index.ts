import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { clearLogSettingsCache } from '@/lib/logSettings';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { handleApiError } from '@/lib/errorHandling';

const DEFAULT_LOG_SETTINGS = {
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
} as const;

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  try {
    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;
    const { tablesDB } = createSessionClient(req);

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const logSettingsTableId = process.env.NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_TABLE_ID!;
    const logsTableId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID!;

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
        const logSettingsResult = await tablesDB.listRows(
          dbId,
          logSettingsTableId,
          [Query.limit(1)]
        );

        let logSettings;
        if (logSettingsResult.rows.length === 0) {
          // Create default log settings if none exist
          logSettings = await tablesDB.createRow(
            dbId,
            logSettingsTableId,
            ID.unique(),
            DEFAULT_LOG_SETTINGS
          );
        } else {
          logSettings = logSettingsResult.rows[0];
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
        const existingSettingsResult = await tablesDB.listRows(
          dbId,
          logSettingsTableId,
          [Query.limit(1)]
        );

        // Prepare update data - only include fields that are defined
        const fields = [
          'attendeeCreate', 'attendeeUpdate', 'attendeeDelete', 'attendeeView',
          'attendeeBulkDelete', 'attendeeImport', 'attendeeExport',
          'credentialGenerate', 'credentialClear',
          'userCreate', 'userUpdate', 'userDelete', 'userView', 'userInvite',
          'roleCreate', 'roleUpdate', 'roleDelete', 'roleView',
          'eventSettingsUpdate',
          'customFieldCreate', 'customFieldUpdate', 'customFieldDelete', 'customFieldReorder',
          'authLogin', 'authLogout',
          'logsDelete', 'logsExport', 'logsView',
          'systemViewEventSettings', 'systemViewAttendeeList', 'systemViewRolesList', 'systemViewUsersList'
        ];

        const buildUpdateData = (body: any, fieldNames: string[]) => {
          const data: any = {};
          for (const field of fieldNames) {
            if (body[field] !== undefined) {
              data[field] = body[field];
            }
          }
          return data;
        };

        const updateData = buildUpdateData(req.body, fields);

        let updatedSettings;
        if (existingSettingsResult.rows.length > 0) {
          // Update existing settings
          updatedSettings = await tablesDB.updateRow(
            dbId,
            logSettingsTableId,
            existingSettingsResult.rows[0].$id,
            updateData
          );
        } else {
          // Create new settings with provided values, using defaults for undefined fields
          updatedSettings = await tablesDB.createRow(
            dbId,
            logSettingsTableId,
            ID.unique(),
            {
              attendeeCreate: attendeeCreate ?? DEFAULT_LOG_SETTINGS.attendeeCreate,
              attendeeUpdate: attendeeUpdate ?? DEFAULT_LOG_SETTINGS.attendeeUpdate,
              attendeeDelete: attendeeDelete ?? DEFAULT_LOG_SETTINGS.attendeeDelete,
              attendeeView: attendeeView ?? DEFAULT_LOG_SETTINGS.attendeeView,
              attendeeBulkDelete: attendeeBulkDelete ?? DEFAULT_LOG_SETTINGS.attendeeBulkDelete,
              attendeeImport: attendeeImport ?? DEFAULT_LOG_SETTINGS.attendeeImport,
              attendeeExport: attendeeExport ?? DEFAULT_LOG_SETTINGS.attendeeExport,
              credentialGenerate: credentialGenerate ?? DEFAULT_LOG_SETTINGS.credentialGenerate,
              credentialClear: credentialClear ?? DEFAULT_LOG_SETTINGS.credentialClear,
              userCreate: userCreate ?? DEFAULT_LOG_SETTINGS.userCreate,
              userUpdate: userUpdate ?? DEFAULT_LOG_SETTINGS.userUpdate,
              userDelete: userDelete ?? DEFAULT_LOG_SETTINGS.userDelete,
              userView: userView ?? DEFAULT_LOG_SETTINGS.userView,
              userInvite: userInvite ?? DEFAULT_LOG_SETTINGS.userInvite,
              roleCreate: roleCreate ?? DEFAULT_LOG_SETTINGS.roleCreate,
              roleUpdate: roleUpdate ?? DEFAULT_LOG_SETTINGS.roleUpdate,
              roleDelete: roleDelete ?? DEFAULT_LOG_SETTINGS.roleDelete,
              roleView: roleView ?? DEFAULT_LOG_SETTINGS.roleView,
              eventSettingsUpdate: eventSettingsUpdate ?? DEFAULT_LOG_SETTINGS.eventSettingsUpdate,
              customFieldCreate: customFieldCreate ?? DEFAULT_LOG_SETTINGS.customFieldCreate,
              customFieldUpdate: customFieldUpdate ?? DEFAULT_LOG_SETTINGS.customFieldUpdate,
              customFieldDelete: customFieldDelete ?? DEFAULT_LOG_SETTINGS.customFieldDelete,
              customFieldReorder: customFieldReorder ?? DEFAULT_LOG_SETTINGS.customFieldReorder,
              authLogin: authLogin ?? DEFAULT_LOG_SETTINGS.authLogin,
              authLogout: authLogout ?? DEFAULT_LOG_SETTINGS.authLogout,
              logsDelete: logsDelete ?? DEFAULT_LOG_SETTINGS.logsDelete,
              logsExport: logsExport ?? DEFAULT_LOG_SETTINGS.logsExport,
              logsView: logsView ?? DEFAULT_LOG_SETTINGS.logsView,
              systemViewEventSettings: systemViewEventSettings ?? DEFAULT_LOG_SETTINGS.systemViewEventSettings,
              systemViewAttendeeList: systemViewAttendeeList ?? DEFAULT_LOG_SETTINGS.systemViewAttendeeList,
              systemViewRolesList: systemViewRolesList ?? DEFAULT_LOG_SETTINGS.systemViewRolesList,
              systemViewUsersList: systemViewUsersList ?? DEFAULT_LOG_SETTINGS.systemViewUsersList
            }
          );
        }

        // Clear the cache so new settings take effect immediately
        clearLogSettingsCache();

        // Detect what actually changed for logging
        const oldSettings = existingSettingsResult.rows.length > 0
          ? existingSettingsResult.rows[0]
          : DEFAULT_LOG_SETTINGS;

        const changes: Record<string, { from: boolean; to: boolean }> = {};
        for (const field of fields) {
          const oldValue = (oldSettings as any)[field] ?? DEFAULT_LOG_SETTINGS[field as keyof typeof DEFAULT_LOG_SETTINGS];
          const newValue = req.body[field] ?? oldValue;
          if (oldValue !== newValue) {
            changes[field] = { from: oldValue, to: newValue };
          }
        }

        // Only log if there were actual changes
        if (Object.keys(changes).length > 0) {
          try {
            const { createSettingsLogDetails } = await import('@/lib/logFormatting');
            await tablesDB.createRow(
              dbId,
              logsTableId,
              ID.unique(),
              {
                userId: user.$id,
                action: 'update',
                details: JSON.stringify(
                  createSettingsLogDetails('update', 'log', {
                    changes: Object.keys(changes),
                    changeDetails: changes
                  })
                )
              }
            );
          } catch (logError) {
            console.error('Failed to write log settings audit log:', logError);
          }
        }

        return res.status(200).json(updatedSettings);

      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    handleApiError(error, res);
  }
});