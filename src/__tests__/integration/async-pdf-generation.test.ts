/**
 * Integration tests for the full async PDF generation flow.
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.2, 3.6, 3.7, 4.1, 7.1, 7.2
 *
 * Worker tests use runWorker() with an injected tablesDB mock — avoids the
 * node-appwrite module-level mock problem where the worker's bundled copy
 * cannot be intercepted by vi.mock at test time.
 *
 * All TablesDB calls use named object parameters exclusively (ZERO TOLERANCE).
 */
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

// ─── Hoisted mocks ───────────────────────────────────────────────────────────
const {
  mockCreateRow,
  mockUpdateRow,
  mockGetRow,
  mockListRows,
  mockCreateExecution,
  mockBuildPdfHtml,
  mockParseOneSimpleApiResponse,
} = vi.hoisted(() => ({
  mockCreateRow: vi.fn(),
  mockUpdateRow: vi.fn(),
  mockGetRow: vi.fn(),
  mockListRows: vi.fn(),
  mockCreateExecution: vi.fn(),
  mockBuildPdfHtml: vi.fn().mockReturnValue('<html>PDF content</html>'),
  mockParseOneSimpleApiResponse: vi
    .fn()
    .mockReturnValue({ url: 'https://cdn.example.com/output.pdf' }),
}));

// ─── Mock @/lib/appwrite (Start + Status endpoints) ─────────────────────────
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn(() => ({
    tablesDB: {
      createRow: mockCreateRow,
      updateRow: mockUpdateRow,
      getRow: mockGetRow,
      listRows: mockListRows,
    },
    functions: { createExecution: mockCreateExecution },
  })),
}));

// ─── Mock withAuth — pass through ───────────────────────────────────────────
vi.mock('@/lib/apiMiddleware', () => ({
  withAuth: (fn: any) => async (req: any, res: any) => fn(req, res),
}));

// ─── Mock appwrite client SDK (used by Start/Status endpoints) ───────────────
vi.mock('appwrite', () => ({
  Query: {
    limit: vi.fn((n: number) => `limit(${n})`),
    equal: vi.fn((f: string, v: string) => `equal(${f},${v})`),
  },
  ID: { unique: vi.fn(() => 'generated-job-id') },
}));

// ─── Mock pdfTemplateBuilder ─────────────────────────────────────────────────
// Mock the Next.js alias path (used by Start/Status endpoints)
vi.mock('@/lib/pdfTemplateBuilder', () => ({
  buildPdfHtml: mockBuildPdfHtml,
  parseOneSimpleApiResponse: mockParseOneSimpleApiResponse,
}));

// Mock the worker's local bundled copy (used by functions/pdf-worker/src/main.ts)
vi.mock('../../../functions/pdf-worker/src/lib/pdfTemplateBuilder', () => ({
  buildPdfHtml: mockBuildPdfHtml,
  parseOneSimpleApiResponse: mockParseOneSimpleApiResponse,
}));

// ─── Lazy-loaded handlers ────────────────────────────────────────────────────
let startHandler: (req: any, res: any) => Promise<void>;
let statusHandler: (req: any, res: any) => Promise<void>;
// runWorker accepts an injected tablesDB — no node-appwrite mock needed
let runWorker: (ctx: any, tablesDB: any) => Promise<any>;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID = 'db-test';
  process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID = 'attendees';
  process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID = 'event-settings';
  process.env.NEXT_PUBLIC_APPWRITE_PDF_JOBS_TABLE_ID = 'pdf-jobs';
  process.env.NEXT_PUBLIC_APPWRITE_PDF_WORKER_FUNCTION_ID = 'fn-pdf-worker';
  process.env.NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_TABLE_ID = 'onesimpleapi';
  process.env.DATABASE_ID = 'db-test';
  process.env.PDF_JOBS_TABLE_ID = 'pdf-jobs';
  process.env.EVENT_SETTINGS_TABLE_ID = 'event-settings';
  process.env.ATTENDEES_TABLE_ID = 'attendees';
  process.env.ONESIMPLEAPI_TABLE_ID = 'onesimpleapi';
  process.env.CUSTOM_FIELDS_TABLE_ID = 'custom-fields';
  process.env.SITE_URL = 'https://example.com';

  const startMod = await import('@/pages/api/attendees/bulk-export-pdf-start');
  const statusMod = await import('@/pages/api/attendees/pdf-job-status');
  const workerMod = await import('../../../functions/pdf-worker/src/main');

  startHandler = startMod.default as any;
  statusHandler = statusMod.default as any;
  runWorker = (workerMod as any).runWorker;
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockAuthUser = { $id: 'user-123', email: 'admin@example.com', name: 'Admin' };
const mockUserProfile = {
  $id: 'profile-123',
  userId: 'user-123',
  role: { permissions: { attendees: { bulkGeneratePDFs: true } } },
};
const mockEventSettings = { $id: 'event-settings-1', eventName: 'Test Event' };
const mockOneSimpleApi = {
  $id: 'osa-1',
  enabled: true,
  url: 'https://api.onesimple.com/pdf',
  formDataKey: 'html',
  formDataValue: '<html>{{credentialRecords}}</html>',
  recordTemplate: '<div>{{firstName}} {{lastName}}</div>',
  eventSettingsId: 'event-settings-1',
};
const mockAttendee = {
  $id: 'attendee-1',
  firstName: 'Alice',
  lastName: 'Smith',
  barcodeNumber: '001',
  credentialUrl: 'https://example.com/cred/001.png',
  credentialGeneratedAt: '2024-05-01T10:00:00.000Z',
  lastSignificantUpdate: '2024-04-30T10:00:00.000Z',
};

function makeStartReq(overrides: Partial<any> = {}): any {
  return {
    method: 'POST',
    cookies: { 'appwrite-session': 'test-jwt' },
    body: { attendeeIds: ['attendee-1'] },
    user: mockAuthUser,
    userProfile: mockUserProfile,
    ...overrides,
  };
}

function makeStatusReq(jobId: string): any {
  return {
    method: 'GET',
    query: { jobId },
    cookies: { 'appwrite-session': 'test-jwt' },
    user: mockAuthUser,
    userProfile: mockUserProfile,
  };
}

function makeWorkerCtx(jobId: string, eventSettingsId = 'event-settings-1') {
  return {
    req: { body: JSON.stringify({ jobId, eventSettingsId }) },
    res: { json: vi.fn() },
    log: vi.fn(),
    error: vi.fn(),
  };
}

/** Creates a fresh injected tablesDB mock for the worker */
function makeWorkerTablesDB(jobId: string, overrides: Partial<any> = {}) {
  return {
    updateRow: vi.fn().mockResolvedValue({}),
    getRow: vi.fn().mockImplementation(({ tableId }: any) => {
      if (tableId === 'pdf-jobs')
        return Promise.resolve({
          $id: jobId,
          attendeeIds: JSON.stringify(['attendee-1']),
          eventSettingsId: 'event-settings-1',
        });
      if (tableId === 'event-settings') return Promise.resolve(mockEventSettings);
      if (tableId === 'attendees') return Promise.resolve(mockAttendee);
      return Promise.resolve({});
    }),
    listRows: vi.fn().mockImplementation(({ tableId }: any) => {
      if (tableId === 'onesimpleapi') return Promise.resolve({ rows: [mockOneSimpleApi] });
      if (tableId === 'custom-fields') return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    }),
    ...overrides,
  };
}

function makeMockRes() {
  const jsonMock = vi.fn();
  const statusMock = vi.fn(() => ({ json: jsonMock }));
  return { res: { status: statusMock, json: jsonMock }, statusMock, jsonMock };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Async PDF Generation - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: vi.fn().mockResolvedValue('https://cdn.example.com/output.pdf'),
      })
    );
    mockParseOneSimpleApiResponse.mockReturnValue({ url: 'https://cdn.example.com/output.pdf' });
    mockBuildPdfHtml.mockReturnValue('<html>PDF content</html>');
  });

  describe('Full happy path: Start creates job, Worker completes, Status returns completed', () => {
    it('Start Endpoint creates a pending job and returns 202 with jobId', async () => {
      mockListRows
        .mockResolvedValueOnce({ rows: [mockEventSettings] })
        .mockResolvedValueOnce({ rows: [mockOneSimpleApi] });
      mockGetRow.mockResolvedValue(mockAttendee);
      mockCreateRow.mockResolvedValue({ $id: 'generated-job-id' });
      mockCreateExecution.mockResolvedValue({ $id: 'exec-1' });

      const { res, statusMock, jsonMock } = makeMockRes();
      await startHandler(makeStartReq(), res);

      expect(statusMock).toHaveBeenCalledWith(202);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ jobId: expect.any(String) })
      );
      // createRow uses named object params with status pending (Req 1.2, 2.2)
      expect(mockCreateRow).toHaveBeenCalledWith(
        expect.objectContaining({
          databaseId: expect.any(String),
          tableId: expect.any(String),
          rowId: expect.any(String),
          data: expect.objectContaining({
            status: 'pending',
            attendeeCount: 1,
            requestedBy: 'user-123',
          }),
        })
      );
      // Function triggered asynchronously (Req 2.3)
      expect(mockCreateExecution).toHaveBeenCalledWith(
        expect.objectContaining({ async: true })
      );
    });

    it('Worker updates job to processing then completed with pdfUrl', async () => {
      const jobId = 'job-happy-1';
      const workerTablesDB = makeWorkerTablesDB(jobId);
      await runWorker(makeWorkerCtx(jobId), workerTablesDB);

      // Req 3.1: processing update
      expect(workerTablesDB.updateRow).toHaveBeenCalledWith(
        expect.objectContaining({
          databaseId: expect.any(String),
          tableId: 'pdf-jobs',
          rowId: jobId,
          data: { status: 'processing' },
        })
      );
      // Req 1.4, 3.6: completed with pdfUrl
      expect(workerTablesDB.updateRow).toHaveBeenCalledWith(
        expect.objectContaining({
          databaseId: expect.any(String),
          tableId: 'pdf-jobs',
          rowId: jobId,
          data: { status: 'completed', pdfUrl: 'https://cdn.example.com/output.pdf' },
        })
      );
    });

    it('Status Endpoint returns completed with pdfUrl', async () => {
      const jobId = 'job-happy-1';
      mockGetRow.mockResolvedValue({
        $id: jobId,
        status: 'completed',
        pdfUrl: 'https://cdn.example.com/output.pdf',
        error: null,
        attendeeCount: 1,
        requestedBy: 'user-123',
      });

      const { res, statusMock, jsonMock } = makeMockRes();
      await statusHandler(makeStatusReq(jobId), res);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'completed',
        pdfUrl: 'https://cdn.example.com/output.pdf',
        error: null,
        attendeeCount: 1,
      });
      // getRow uses named object params (Req 4.1)
      expect(mockGetRow).toHaveBeenCalledWith(
        expect.objectContaining({
          databaseId: expect.any(String),
          tableId: expect.any(String),
          rowId: jobId,
        })
      );
    });
  });

  describe('Full error path: Worker encounters error, Status returns failed', () => {
    it('Start Endpoint creates a pending job successfully', async () => {
      mockListRows
        .mockResolvedValueOnce({ rows: [mockEventSettings] })
        .mockResolvedValueOnce({ rows: [mockOneSimpleApi] });
      mockGetRow.mockResolvedValue(mockAttendee);
      mockCreateRow.mockResolvedValue({ $id: 'generated-job-id' });
      mockCreateExecution.mockResolvedValue({ $id: 'exec-1' });

      const { res, statusMock, jsonMock } = makeMockRes();
      await startHandler(makeStartReq(), res);

      expect(statusMock).toHaveBeenCalledWith(202);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ jobId: expect.any(String) })
      );
    });

    it('Worker marks job as failed when OneSimpleAPI returns non-200', async () => {
      const jobId = 'job-error-1';
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          text: vi.fn().mockResolvedValue(''),
        })
      );
      const workerTablesDB = makeWorkerTablesDB(jobId);
      await runWorker(makeWorkerCtx(jobId), workerTablesDB);

      // Req 1.5, 3.7, 7.3: failed with error message
      expect(workerTablesDB.updateRow).toHaveBeenCalledWith(
        expect.objectContaining({
          tableId: 'pdf-jobs',
          rowId: jobId,
          data: expect.objectContaining({
            status: 'failed',
            error: expect.stringContaining('OneSimpleAPI returned error'),
          }),
        })
      );
    });

    it('Status Endpoint returns failed with error message', async () => {
      const jobId = 'job-error-1';
      mockGetRow.mockResolvedValue({
        $id: jobId,
        status: 'failed',
        pdfUrl: null,
        error: 'OneSimpleAPI returned error: 503 Service Unavailable',
        attendeeCount: 1,
        requestedBy: 'user-123',
      });

      const { res, statusMock, jsonMock } = makeMockRes();
      await statusHandler(makeStatusReq(jobId), res);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'failed',
        pdfUrl: null,
        error: 'PDF generation failed. Please try again.',
        attendeeCount: 1,
      });
    });
  });

  describe('Function trigger failure: Start creates job, trigger fails, Status returns failed', () => {
    it('Start Endpoint creates job, trigger fails, updates job to failed, returns 500', async () => {
      mockListRows
        .mockResolvedValueOnce({ rows: [mockEventSettings] })
        .mockResolvedValueOnce({ rows: [mockOneSimpleApi] });
      mockGetRow.mockResolvedValue(mockAttendee);
      mockCreateRow.mockResolvedValue({ $id: 'generated-job-id' });
      mockCreateExecution.mockRejectedValue(new Error('Function service unavailable'));
      mockUpdateRow.mockResolvedValue({});

      const { res, statusMock, jsonMock } = makeMockRes();
      await startHandler(makeStartReq(), res);

      // Job created first with pending status (Req 1.2)
      expect(mockCreateRow).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'pending' }),
        })
      );
      // Then updated to failed using named object params (Req 7.1)
      expect(mockUpdateRow).toHaveBeenCalledWith(
        expect.objectContaining({
          databaseId: expect.any(String),
          tableId: expect.any(String),
          rowId: expect.any(String),
          data: expect.objectContaining({
            status: 'failed',
            error: expect.stringContaining('Failed to trigger PDF worker'),
          }),
        })
      );
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to start PDF generation' })
      );
    });

    it('Status Endpoint returns failed for job marked failed by trigger error', async () => {
      const jobId = 'generated-job-id';
      mockGetRow.mockResolvedValue({
        $id: jobId,
        status: 'failed',
        pdfUrl: null,
        error: 'Failed to trigger PDF worker: Function service unavailable',
        attendeeCount: 1,
        requestedBy: 'user-123',
      });

      const { res, statusMock, jsonMock } = makeMockRes();
      await statusHandler(makeStatusReq(jobId), res);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'failed',
        pdfUrl: null,
        error: 'PDF generation failed. Please try again.',
        attendeeCount: 1,
      });
    });
  });

  describe('TablesDB named object parameter compliance (Req 8.1)', () => {
    it('Start Endpoint createRow uses named object params { databaseId, tableId, rowId, data }', async () => {
      mockListRows
        .mockResolvedValueOnce({ rows: [mockEventSettings] })
        .mockResolvedValueOnce({ rows: [mockOneSimpleApi] });
      mockGetRow.mockResolvedValue(mockAttendee);
      mockCreateRow.mockResolvedValue({ $id: 'generated-job-id' });
      mockCreateExecution.mockResolvedValue({ $id: 'exec-1' });

      const { res } = makeMockRes();
      await startHandler(makeStartReq(), res);

      const arg = mockCreateRow.mock.calls[0][0];
      expect(typeof arg).toBe('object');
      expect(arg).toHaveProperty('databaseId');
      expect(arg).toHaveProperty('tableId');
      expect(arg).toHaveProperty('rowId');
      expect(arg).toHaveProperty('data');
    });

    it('Start Endpoint updateRow on trigger failure uses named object params', async () => {
      mockListRows
        .mockResolvedValueOnce({ rows: [mockEventSettings] })
        .mockResolvedValueOnce({ rows: [mockOneSimpleApi] });
      mockGetRow.mockResolvedValue(mockAttendee);
      mockCreateRow.mockResolvedValue({ $id: 'generated-job-id' });
      mockCreateExecution.mockRejectedValue(new Error('trigger fail'));
      mockUpdateRow.mockResolvedValue({});

      const { res } = makeMockRes();
      await startHandler(makeStartReq(), res);

      const arg = mockUpdateRow.mock.calls[0][0];
      expect(typeof arg).toBe('object');
      expect(arg).toHaveProperty('databaseId');
      expect(arg).toHaveProperty('tableId');
      expect(arg).toHaveProperty('rowId');
      expect(arg).toHaveProperty('data');
    });

    it('Status Endpoint getRow uses named object params { databaseId, tableId, rowId }', async () => {
      mockGetRow.mockResolvedValue({
        $id: 'job-xyz',
        status: 'pending',
        pdfUrl: null,
        error: null,
        attendeeCount: 3,
      });

      const { res } = makeMockRes();
      await statusHandler(makeStatusReq('job-xyz'), res);

      const arg = mockGetRow.mock.calls[0][0];
      expect(typeof arg).toBe('object');
      expect(arg).toHaveProperty('databaseId');
      expect(arg).toHaveProperty('tableId');
      expect(arg).toHaveProperty('rowId', 'job-xyz');
    });

    it('Worker all updateRow calls use named object params', async () => {
      const jobId = 'job-compliance-1';
      const workerTablesDB = makeWorkerTablesDB(jobId);
      await runWorker(makeWorkerCtx(jobId), workerTablesDB);

      for (const call of workerTablesDB.updateRow.mock.calls) {
        const arg = call[0];
        expect(typeof arg).toBe('object');
        expect(arg).toHaveProperty('databaseId');
        expect(arg).toHaveProperty('tableId');
        expect(arg).toHaveProperty('rowId');
        expect(arg).toHaveProperty('data');
      }
    });

    it('Worker all getRow calls use named object params', async () => {
      const jobId = 'job-compliance-2';
      const workerTablesDB = makeWorkerTablesDB(jobId);
      await runWorker(makeWorkerCtx(jobId), workerTablesDB);

      for (const call of workerTablesDB.getRow.mock.calls) {
        const arg = call[0];
        expect(typeof arg).toBe('object');
        expect(arg).toHaveProperty('databaseId');
        expect(arg).toHaveProperty('tableId');
        expect(arg).toHaveProperty('rowId');
      }
    });
  });

  describe('Worker error handling (Req 3.7, 7.2, 7.3)', () => {
    it('marks job failed when OneSimpleAPI response has no valid URL', async () => {
      const jobId = 'job-invalid-url';
      mockParseOneSimpleApiResponse.mockReturnValueOnce({ error: 'not a valid URL' });
      const workerTablesDB = makeWorkerTablesDB(jobId);
      await runWorker(makeWorkerCtx(jobId), workerTablesDB);

      expect(workerTablesDB.updateRow).toHaveBeenCalledWith(
        expect.objectContaining({
          tableId: 'pdf-jobs',
          rowId: jobId,
          data: expect.objectContaining({
            status: 'failed',
            error: 'OneSimpleAPI response is not a valid URL',
          }),
        })
      );
    });

    it('marks job failed on network error calling OneSimpleAPI', async () => {
      const jobId = 'job-network-err';
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
      const workerTablesDB = makeWorkerTablesDB(jobId);
      await runWorker(makeWorkerCtx(jobId), workerTablesDB);

      expect(workerTablesDB.updateRow).toHaveBeenCalledWith(
        expect.objectContaining({
          tableId: 'pdf-jobs',
          rowId: jobId,
          data: expect.objectContaining({
            status: 'failed',
            error: expect.stringContaining('Unexpected error'),
          }),
        })
      );
    });
  });
});
