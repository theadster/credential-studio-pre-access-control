import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { tablesDB } = createSessionClient(req);

    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({ error: 'jobId is required' });
    }

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
    const pdfJobsTableId = process.env.NEXT_PUBLIC_APPWRITE_PDF_JOBS_TABLE_ID;

    if (!dbId || !pdfJobsTableId) {
      console.error('Missing env vars: NEXT_PUBLIC_APPWRITE_DATABASE_ID or NEXT_PUBLIC_APPWRITE_PDF_JOBS_TABLE_ID');
      return res.status(500).json({ error: 'Server misconfiguration: missing required environment variables' });
    }

    let job: any;
    try {
      job = await tablesDB.getRow({
        databaseId: dbId,
        tableId: pdfJobsTableId,
        rowId: jobId,
      });
    } catch (error: any) {
      if (error.code === 404) {
        return res.status(404).json({ error: 'Job not found' });
      }
      throw error;
    }

    // Authorization: ensure the requesting user owns this job
    if (job.requestedBy !== req.user.$id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.status(200).json({
      status: job.status,
      pdfUrl: job.pdfUrl ?? null,
      error: job.error ? 'PDF generation failed. Please try again.' : null,
      attendeeCount: job.attendeeCount,
    });
  } catch (error: any) {
    console.error('Error fetching PDF job status:', error);

    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Failed to fetch job status' });
  }
});
