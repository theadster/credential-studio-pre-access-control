import { vi, describe, it, expect, beforeAll, beforeEach } from 'vitest';

// Use vi.hoisted so these are available inside vi.mock factory functions
const { mockUpdateRow, mockGetRow, mockListRows, mockBuildPdfHtml, mockParseOneSimpleApiResponse } =
  vi.hoisted(() => ({
    mockUpdateRow: vi.fn(),
    mockGetRow: vi.fn(),
    mockListRows: vi.fn(),
    mockBuildPdfHtml: vi.fn().mockReturnValue('<html>PDF</html>'),
    mockParseOneSimpleApiResponse: vi
      .fn()
      .mockReturnValue({ url: 'https://example.com/output.pdf' }),
  }));

// Helper to create the node-appwrite mock factory
function createAppwriteMock() {
  return () => {
    function MockClient() {
      return {
        setEndpoint: vi.fn().mockReturnThis(),
        setProject: vi.fn().mockReturnThis(),
        setKey: vi.fn().mockReturnThis(),
      };
    }

    function MockTablesDB() {
      return {
        updateRow: mockUpdateRow,
        getRow: mockGetRow,
        listRows: mockListRows,
      };
    }

    return {
      Client: MockClient,
      TablesDB: MockTablesDB,
      Query: {
        equal: vi.fn((field, val) => `equal(${field},${val})`),
        limit: vi.fn((n) => `limit(${n})`),
      },
    };
  };
}

vi.mock('node-appwrite', createAppwriteMock());

vi.mock('../../../src/lib/pdfTemplateBuilder', () => ({
  buildPdfHtml: mockBuildPdfHtml,
  parseOneSimpleApiResponse: mockParseOneSimpleApiResponse,
}));

// Worker is loaded dynamically after env vars are set
let workerHandler: (ctx: any) => Promise<any>;

beforeAll(async () => {
  // Set env vars before the worker module is imported
  // (module-level constants are captured at load time)
  process.env.DATABASE_ID = 'db-123';
  process.env.PDF_JOBS_TABLE_ID = 'pdf-jobs';
  process.env.EVENT_SETTINGS_TABLE_ID = 'event-settings';
  process.env.ATTENDEES_TABLE_ID = 'attendees';
  process.env.ONESIMPLEAPI_TABLE_ID = 'onesimpleapi';
  process.env.CUSTOM_FIELDS_TABLE_ID = 'custom-fields';
  process.env.SITE_URL = 'https://example.com';

  // Reset modules so the worker re-evaluates its module-level constants with the env vars above
  vi.resetModules();

  // Re-apply mocks after resetModules (they are cleared by resetModules)
  vi.mock('node-appwrite', createAppwriteMock());

  vi.mock('../../../src/lib/pdfTemplateBuilder', () => ({
    buildPdfHtml: mockBuildPdfHtml,
    parseOneSimpleApiResponse: mockParseOneSimpleApiResponse,
  }));

  const mod = await import('../../../functions/pdf-worker/src/main');
  workerHandler = mod.default;
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function createMockContext(bodyOverride?: Record<string, unknown>) {
  const mockRes = { json: vi.fn(), send: vi.fn() };
  return {
    req: {
      body: JSON.stringify({ jobId: 'job-123', eventSettingsId: 'es-456', ...bodyOverride }),
    },
    res: mockRes,
    log: vi.fn(),
    error: vi.fn(),
  };
}

function setupDefaultMocks() {
  mockGetRow.mockImplementation(({ tableId, rowId }: { tableId: string; rowId?: string }) => {
    if (tableId === 'pdf-jobs') {
      return Promise.resolve({
        $id: 'job-123',
        attendeeIds: JSON.stringify(['att-1', 'att-2']),
        eventSettingsId: 'es-456',
      });
    }
    if (tableId === 'event-settings') {
      return Promise.resolve({ $id: 'es-456', eventName: 'Test Event' });
    }
    if (tableId === 'attendees') {
      return Promise.resolve({
        $id: rowId ?? 'att-1',
        firstName: rowId === 'att-2' ? 'Jane' : 'John',
        lastName: rowId === 'att-2' ? 'Smith' : 'Doe',
        credentialUrl: 'https://example.com/cred',
      });
    }
    return Promise.resolve({});
  });

  mockListRows.mockImplementation(({ tableId }) => {
    if (tableId === 'onesimpleapi') {
      return Promise.resolve({
        rows: [
          {
            $id: 'osa-1',
            enabled: true,
            url: 'https://api.onesimple.com',
            formDataKey: 'html',
            formDataValue: '<html>{{credentialRecords}}</html>',
            recordTemplate: '<div>{{firstName}}</div>',
          },
        ],
      });
    }
    if (tableId === 'custom-fields') {
      return Promise.resolve({ rows: [] });
    }
    return Promise.resolve({ rows: [] });
  });

  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: vi.fn().mockResolvedValue('https://example.com/output.pdf'),
      json: vi.fn().mockResolvedValue({ url: 'https://example.com/output.pdf' }),
    })
  );
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  setupDefaultMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PDF Worker', () => {
  it('updates job to processing on start', async () => {
    const ctx = createMockContext();
    await workerHandler(ctx);

    expect(mockUpdateRow).toHaveBeenCalledWith(
      expect.objectContaining({
        tableId: 'pdf-jobs',
        rowId: 'job-123',
        data: { status: 'processing' },
      })
    );
  });

  it('fetches attendees, event settings, OneSimpleAPI config, and custom fields', async () => {
    const ctx = createMockContext();
    await workerHandler(ctx);

    expect(mockGetRow).toHaveBeenCalledWith(
      expect.objectContaining({ tableId: 'event-settings', rowId: 'es-456' })
    );
    expect(mockListRows).toHaveBeenCalledWith(
      expect.objectContaining({ tableId: 'onesimpleapi' })
    );
    expect(mockListRows).toHaveBeenCalledWith(
      expect.objectContaining({ tableId: 'custom-fields' })
    );
    expect(mockGetRow).toHaveBeenCalledWith(
      expect.objectContaining({ tableId: 'attendees', rowId: 'att-1' })
    );
    expect(mockGetRow).toHaveBeenCalledWith(
      expect.objectContaining({ tableId: 'attendees', rowId: 'att-2' })
    );
  });

  it('calls OneSimpleAPI with generated HTML', async () => {
    const ctx = createMockContext();
    await workerHandler(ctx);

    expect(mockBuildPdfHtml).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      'https://api.onesimple.com',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('updates job to completed with pdfUrl on valid OneSimpleAPI response', async () => {
    mockParseOneSimpleApiResponse.mockReturnValueOnce({ url: 'https://example.com/output.pdf' });

    const ctx = createMockContext();
    await workerHandler(ctx);

    expect(mockUpdateRow).toHaveBeenCalledWith(
      expect.objectContaining({
        tableId: 'pdf-jobs',
        rowId: 'job-123',
        data: { status: 'completed', pdfUrl: 'https://example.com/output.pdf' },
      })
    );
  });

  it('updates job to failed on OneSimpleAPI network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    const ctx = createMockContext();
    await workerHandler(ctx);

    expect(mockUpdateRow).toHaveBeenCalledWith(
      expect.objectContaining({
        tableId: 'pdf-jobs',
        rowId: 'job-123',
        data: expect.objectContaining({
          status: 'failed',
          error: expect.stringContaining('Unexpected error'),
        }),
      })
    );
  });

  it('updates job to failed on OneSimpleAPI non-200 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: vi.fn().mockResolvedValue(''),
      })
    );

    const ctx = createMockContext();
    await workerHandler(ctx);

    expect(mockUpdateRow).toHaveBeenCalledWith(
      expect.objectContaining({
        tableId: 'pdf-jobs',
        rowId: 'job-123',
        data: expect.objectContaining({
          status: 'failed',
          error: expect.stringContaining('OneSimpleAPI returned error'),
        }),
      })
    );
  });

  it('updates job to failed when response has no valid URL', async () => {
    mockParseOneSimpleApiResponse.mockReturnValueOnce({ error: 'not a valid URL' });

    const ctx = createMockContext();
    await workerHandler(ctx);

    expect(mockUpdateRow).toHaveBeenCalledWith(
      expect.objectContaining({
        tableId: 'pdf-jobs',
        rowId: 'job-123',
        data: expect.objectContaining({
          status: 'failed',
          error: 'OneSimpleAPI response is not a valid URL',
        }),
      })
    );
  });

  it('updates job to failed on unhandled exception', async () => {
    let getRowCallCount = 0;
    mockGetRow.mockImplementation(({ tableId }) => {
      if (tableId === 'pdf-jobs') {
        getRowCallCount++;
        if (getRowCallCount === 1) {
          return Promise.reject(new Error('DB connection lost'));
        }
      }
      return Promise.resolve({});
    });

    const ctx = createMockContext();
    await workerHandler(ctx);

    expect(mockUpdateRow).toHaveBeenCalledWith(
      expect.objectContaining({
        tableId: 'pdf-jobs',
        rowId: 'job-123',
        data: expect.objectContaining({
          status: 'failed',
          error: expect.stringContaining('Unexpected error'),
        }),
      })
    );
  });

  it('marks job as failed when job record is not found (404)', async () => {
    mockGetRow.mockImplementation(({ tableId }) => {
      if (tableId === 'pdf-jobs') {
        const err: any = new Error('Row not found');
        err.code = 404;
        return Promise.reject(err);
      }
      return Promise.resolve({});
    });

    const ctx = createMockContext();
    await workerHandler(ctx);

    expect(mockUpdateRow).toHaveBeenCalledWith(
      expect.objectContaining({
        tableId: 'pdf-jobs',
        rowId: 'job-123',
        data: expect.objectContaining({ status: 'failed' }),
      })
    );
  });
});
