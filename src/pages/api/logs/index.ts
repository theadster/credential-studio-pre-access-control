import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

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
        const { page = '1', limit = '50', action, userId: filterUserId } = req.query;
        
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        // Build where clause
        const where: any = {};
        if (action && action !== 'all') {
          where.action = action;
        }
        if (filterUserId && filterUserId !== 'all') {
          where.userId = filterUserId;
        }

        const [logs, totalCount] = await Promise.all([
          prisma.log.findMany({
            where,
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true
                }
              },
              attendee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            skip,
            take: limitNum
          }),
          prisma.log.count({ where })
        ]);

        const totalPages = Math.ceil(totalCount / limitNum);

        return res.status(200).json({
          logs,
          pagination: {
            page: pageNum,
            limit: limitNum,
            totalCount,
            totalPages,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
          }
        });

      case 'POST':
        // Create a new log entry (usually called internally by other API routes)
        const { action, attendeeId, details } = req.body;

        if (!action) {
          return res.status(400).json({ error: 'Action is required' });
        }

        const newLog = await prisma.log.create({
          data: {
            userId: user.id,
            attendeeId,
            action,
            details: details || {}
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true
              }
            },
            attendee: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        });

        return res.status(201).json(newLog);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}