import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { shouldLog } from '@/lib/logSettings';
import { ID } from 'node-appwrite';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'DELETE') {
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

    // Verify the job exists and the requesting user owns it
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

    if (job.requestedBy !== req.user.$id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      await tablesDB.deleteRow({
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

    // Activity log: PDF export deleted
    try {
      const loggingEnabled = await shouldLog('pdfExportDelete');
      if (loggingEnabled) {
        const logsTableId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID;
        if (!logsTableId) {
          console.warn('[pdf-jobs/delete] Skipping activity log: NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID is not set');
        } else {
          await tablesDB.createRow({
            databaseId: dbId,
            tableId: logsTableId,
            rowId: ID.unique(),
            data: {
              userId: req.user.$id,
              action: 'delete',
              details: JSON.stringify({
                type: 'system',
                target: 'PDF Export',
                description: `Deleted PDF export record (job ${jobId})`,
                jobId,
              }),
            },
          });
        }
      }
    } catch (logError: any) {
      console.error('[pdf-jobs/delete] Failed to write activity log:', logError.message);
    }

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('Error deleting PDF job:', error);
    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(500).json({ error: 'Failed to delete job' });
  }
});
