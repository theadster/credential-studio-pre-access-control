import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { checkApiPermission } from '@/lib/permissions';
import { clearLogSettingsCache } from '@/lib/logSettings';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res);
  
  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET':
        // Check if user has permission to view log settings
        const { hasPermission: canRead } = await checkApiPermission(user.id, 'logs', 'configure', prisma);
        if (!canRead) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }

        // Get or create log settings (there should only be one record)
        let logSettings = await prisma.logSettings.findFirst();
        
        if (!logSettings) {
          // Create default log settings if none exist
          logSettings = await prisma.logSettings.create({
            data: {}
          });
        }

        return res.status(200).json(logSettings);

      case 'PUT':
        // Check if user has permission to update log settings
        const { hasPermission: canUpdate } = await checkApiPermission(user.id, 'logs', 'configure', prisma);
        if (!canUpdate) {
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
        let existingSettings = await prisma.logSettings.findFirst();
        
        let updatedSettings;
        if (existingSettings) {
          updatedSettings = await prisma.logSettings.update({
            where: { id: existingSettings.id },
            data: {
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
            }
          });
        } else {
          updatedSettings = await prisma.logSettings.create({
            data: {
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
            }
          });
        }

        // Clear the cache so new settings take effect immediately
        clearLogSettingsCache();

        // Log the settings update
        await prisma.log.create({
          data: {
            userId: user.id,
            action: 'update',
            details: { 
              type: 'log_settings',
              changes: req.body
            }
          }
        });

        return res.status(200).json(updatedSettings);

      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}