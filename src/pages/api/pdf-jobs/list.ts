import { NextApiResponse } from 'next';
import { Query } from 'node-appwrite';
import { createSessionClient } from '@/lib/appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { tablesDB } = createSessionClient(req);

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
    const pdfJobsTableId = process.env.NEXT_PUBLIC_APPWRITE_PDF_JOBS_TABLE_ID;

    if (!dbId || !pdfJobsTableId) {
      console.error('Missing env vars: NEXT_PUBLIC_APPWRITE_DATABASE_ID or NEXT_PUBLIC_APPWRITE_PDF_JOBS_TABLE_ID');
      return res.status(500).json({ error: 'Server misconfiguration: missing required environment variables' });
    }

    const { eventSettingsId, limit: limitParam = '50', offset: offsetParam = '0' } = req.query;

    const parsedLimit = parseInt(String(limitParam), 10);
    const parsedOffset = parseInt(String(offsetParam), 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit >= 1 ? Math.min(parsedLimit, 100) : 50;
    const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

    const queries: string[] = [
      Query.orderDesc('$createdAt'),
      Query.limit(limit),
      Query.offset(offset),
      // Restrict to jobs owned by the requesting user
      Query.equal('requestedBy', req.user.$id),
    ];

    if (eventSettingsId && typeof eventSettingsId === 'string') {
      queries.push(Query.equal('eventSettingsId', eventSettingsId));
    }

    // tablesDB.listRows — named parameters, TablesDB API compliant
    const result = await tablesDB.listRows({
      databaseId: dbId,
      tableId: pdfJobsTableId,
      queries,
    });

    return res.status(200).json({
      jobs: result.rows,
      total: result.total,
    });
  } catch (error: any) {
    console.error('Error listing PDF jobs:', error);
    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(500).json({ error: 'Failed to fetch PDF jobs' });
  }
});
