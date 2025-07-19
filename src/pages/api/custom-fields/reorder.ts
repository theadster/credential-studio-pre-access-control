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

  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { fieldOrders } = req.body;

    if (!fieldOrders || !Array.isArray(fieldOrders)) {
      return res.status(400).json({ error: 'Invalid field orders data' });
    }

    // Update each field's order in a transaction
    await prisma.$transaction(
      fieldOrders.map(({ id, order }: { id: string; order: number }) =>
        prisma.customField.update({
          where: { id },
          data: { order }
        })
      )
    );

    // Log the reorder action
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id }
    });
    
    if (existingUser) {
      await prisma.log.create({
        data: {
          userId: user.id,
          action: 'update',
          details: { 
            type: 'custom_fields_reorder',
            fieldCount: fieldOrders.length
          }
        }
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}