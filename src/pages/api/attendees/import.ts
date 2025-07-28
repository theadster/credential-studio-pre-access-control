import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import { checkApiPermission } from '@/lib/permissions';
import prisma from '@/lib/prisma';
import formidable from 'formidable';
import fs from 'fs';
import csv from 'csv-parser';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(req, res);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !session.user || !session.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { hasPermission: canImport, user } = await checkApiPermission(
    session.user.id,
    'attendees',
    'import',
    prisma
  );

  if (!canImport) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const results: any[] = [];
    fs.createReadStream(file.filepath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          // Fetch custom fields to map internal names to IDs
          const customFields = await prisma.customField.findMany({
            select: { id: true, internalName: true },
          });
          const customFieldMap = new Map(customFields.map(cf => [cf.internalName, cf.id]));

          const attendeesToCreate = results.map(row => {
            const { firstName, lastName, barcodeNumber, ...customFieldValues } = row;

            if (!firstName || !lastName) {
              // Skip rows that are missing required fields
              return null;
            }

            const customFieldsData = Object.entries(customFieldValues)
              .map(([internalName, value]) => {
                const customFieldId = customFieldMap.get(internalName);
                if (customFieldId && value) {
                  return {
                    customFieldId,
                    value: String(value),
                  };
                }
                return null;
              })
              .filter(Boolean) as { customFieldId: string; value: string }[];

            return {
              firstName,
              lastName,
              barcodeNumber: barcodeNumber || '',
              customFieldValues: {
                create: customFieldsData,
              },
            };
          }).filter(Boolean) as any[];

          let createdCount = 0;
          for (const attendeeData of attendeesToCreate) {
            try {
              await prisma.attendee.create({
                data: attendeeData,
              });
              createdCount++;
            } catch (e: any) {
              // Handle potential duplicate barcode errors gracefully if `skipDuplicates` is not available for nested creates
              if (e.code === 'P2002' && e.meta?.target?.includes('barcodeNumber')) {
                console.warn(`Skipping duplicate barcode: ${attendeeData.barcodeNumber}`);
              } else {
                // Re-throw other errors
                throw e;
              }
            }
          }

          // Log the import action
          await prisma.log.create({
            data: {
              userId: user.id,
              action: 'import',
              details: {
                type: 'attendee',
                count: createdCount,
                fileName: file.originalFilename,
              },
            },
          });

          res.status(200).json({
            message: 'Attendees imported successfully',
            count: createdCount,
          });
        } catch (error) {
          console.error('Error importing attendees:', error);
          res.status(500).json({ error: 'Failed to import attendees' });
        } finally {
          // Clean up the uploaded file
          fs.unlinkSync(file.filepath);
        }
      });
  } catch (error) {
    console.error('Error parsing form data:', error);
    res.status(500).json({ error: 'Failed to process upload' });
  }
}