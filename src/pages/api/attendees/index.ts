import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { checkApiPermission } from '@/lib/permissions';
import { shouldLog } from '@/lib/logSettings';

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
        // Check read permission for attendees
        const readPermission = await checkApiPermission(user.id, 'attendees', 'read', prisma);
        if (!readPermission.hasPermission) {
          return res.status(403).json({ error: 'Insufficient permissions to view attendees' });
        }

        const {
          firstName: firstNameFilter,
          lastName: lastNameFilter,
          barcode: barcodeFilter,
          photoFilter,
          customFields: customFieldsJSON,
        } = req.query;

        const where: any = { AND: [] };

        if (typeof firstNameFilter === 'string' && firstNameFilter) {
          where.AND.push({ firstName: { contains: firstNameFilter, mode: 'insensitive' } });
        }
        if (typeof lastNameFilter === 'string' && lastNameFilter) {
          where.AND.push({ lastName: { contains: lastNameFilter, mode: 'insensitive' } });
        }
        if (typeof barcodeFilter === 'string' && barcodeFilter) {
          where.AND.push({ barcodeNumber: { contains: barcodeFilter, mode: 'insensitive' } });
        }
        if (photoFilter === 'with') {
          where.AND.push({ photoUrl: { not: null } });
          where.AND.push({ photoUrl: { not: '' } });
        }
        if (photoFilter === 'without') {
          where.AND.push({ OR: [{ photoUrl: null }, { photoUrl: '' }] });
        }

        if (typeof customFieldsJSON === 'string' && customFieldsJSON) {
          try {
            const customFields = JSON.parse(customFieldsJSON);
            for (const fieldId in customFields) {
              const { value, operator } = customFields[fieldId];

              if (operator === 'isEmpty') {
                where.AND.push({
                  NOT: {
                    customFieldValues: {
                      some: {
                        customFieldId: fieldId,
                        value: { not: '' },
                      },
                    },
                  },
                });
              } else if (operator === 'isNotEmpty') {
                where.AND.push({
                  customFieldValues: {
                    some: {
                      customFieldId: fieldId,
                      value: { not: '' },
                    },
                  },
                });
              } else if (value) {
                const mode = 'insensitive';
                let condition;

                switch (operator) {
                  case 'contains':
                    condition = { contains: value, mode };
                    break;
                  case 'equals':
                    condition = { equals: value, mode };
                    break;
                  case 'startsWith':
                    condition = { startsWith: value, mode };
                    break;
                  case 'endsWith':
                    condition = { endsWith: value, mode };
                    break;
                  default:
                    // Default to equals for select/boolean fields
                    condition = { equals: value, mode };
                }
                
                where.AND.push({
                  customFieldValues: {
                    some: {
                      customFieldId: fieldId,
                      value: condition,
                    },
                  },
                });
              }
            }
          } catch (e) {
            console.error("Failed to parse customFields JSON:", e);
            // Don't apply custom field filters if JSON is invalid
          }
        }

        const attendees = await prisma.attendee.findMany({
          where: where.AND.length > 0 ? where : undefined,
          include: {
            customFieldValues: {
              include: {
                customField: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        // Log the view action if enabled
        if (readPermission.user && await shouldLog('systemViewAttendeeList')) {
          await prisma.log.create({
            data: {
              userId: user.id,
              action: 'view',
              details: { type: 'attendees_list', count: attendees.length }
            }
          });
        }

        return res.status(200).json(attendees);

      case 'POST':
        // Check create permission for attendees
        const createPermission = await checkApiPermission(user.id, 'attendees', 'create', prisma);
        if (!createPermission.hasPermission) {
          return res.status(403).json({ error: 'Insufficient permissions to create attendees' });
        }

        const { firstName, lastName, barcodeNumber, photoUrl, customFieldValues } = req.body;

        if (!firstName || !lastName || !barcodeNumber) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if barcode is unique
        const existingAttendee = await prisma.attendee.findUnique({
          where: { barcodeNumber }
        });

        if (existingAttendee) {
          return res.status(400).json({ error: 'Barcode number already exists' });
        }

        // Validate custom field IDs if provided
        if (customFieldValues && Array.isArray(customFieldValues) && customFieldValues.length > 0) {
          const customFieldIds = customFieldValues.map((cfv: any) => cfv.customFieldId);
          const existingCustomFields = await prisma.customField.findMany({
            where: {
              id: {
                in: customFieldIds
              }
            },
            select: { id: true }
          });

          const existingCustomFieldIds = existingCustomFields.map(cf => cf.id);
          const invalidCustomFieldIds = customFieldIds.filter(id => !existingCustomFieldIds.includes(id));

          if (invalidCustomFieldIds.length > 0) {
            console.error('Invalid custom field IDs:', invalidCustomFieldIds);
            return res.status(400).json({ 
              error: 'Some custom fields no longer exist. Please refresh the page and try again.',
              invalidIds: invalidCustomFieldIds
            });
          }
        }

        // Filter out empty custom field values
        const validCustomFieldValues = customFieldValues?.filter((cfv: any) => 
          cfv.customFieldId && cfv.value !== null && cfv.value !== undefined && cfv.value !== ''
        ) || [];

        const newAttendee = await prisma.attendee.create({
          data: {
            firstName,
            lastName,
            barcodeNumber,
            photoUrl,
            customFieldValues: {
              create: validCustomFieldValues.map((cfv: any) => ({
                customFieldId: cfv.customFieldId,
                value: String(cfv.value)
              }))
            }
          },
          include: {
            customFieldValues: {
              include: {
                customField: true
              }
            }
          }
        });

        // Log the create action
        if (createPermission.user) {
          await prisma.log.create({
            data: {
              userId: user.id,
              attendeeId: newAttendee.id,
              action: 'create',
              details: { 
                type: 'attendee',
                firstName: newAttendee.firstName,
                lastName: newAttendee.lastName,
                barcodeNumber: newAttendee.barcodeNumber
              }
            }
          });
        }

        return res.status(201).json(newAttendee);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}