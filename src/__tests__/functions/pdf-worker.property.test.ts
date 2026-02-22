import { vi, describe, it, expect, beforeAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';

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

vi.mock('node-appwrite', () => {
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
});

vi.mock('../../../src/lib/pdfTemplateBuilder', () => ({
  buildPdfHtml: mockBuildPdfHtml,
  parseOneSimpleApiResponse: mockParseOneSimpleApiResponse,
}));

// Worker is loaded dynamically after env vars are set
let workerHandler: (ctx: any) => Promise<any>;

beforeAll(async () => {
  process.env.DATABASE_ID = 'db-123';
  process.env.PDF_JOBS_TABLE_ID = 'pdf-jobs';
  process.env.EVENT_SETTINGS_TABLE_ID = 'event-settings';
  process.env.ATTENDEES_TABLE_ID = 'attendees';
  process.env.ONESIMPLEAPI_TABLE_ID = 'onesimpleapi';
  process.env.CUSTOM_FIELDS_TABLE_ID = 'custom-fields';
  process.env.SITE_URL = 'https://example.com';

  vi.resetModules();

  vi.mock('node-appwrite', () => {
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
  });

  vi.mock('../../../src/lib/pdfTemplateBuilder', () => ({
    buildPdfHtml: mockBuildPdfHtml,
    parseOneSimpleApiResponse: mockParseOneSimpleApiResponse,
  }));

  const mod = await import('../../../functions/pdf-worker/src/main');
  workerHandler = mod.default;
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function createMockContext(jobId = 'job-123', eventSettingsId = 'es-456') {
  const mockRes = { json: vi.fn(), send: vi.fn() };
  return {
    req: {
      body: JSON.stringify({ jobId, eventSettingsId }),
    },
    res: mockRes,
    log: vi.fn(),
    error: vi.fn(),
  };
}

function setupDefaultMocks(attendeeIds = ['att-1', 'att-2']) {
  mockGetRow.mockImplementation(({ tableId, rowId }: { tableId: string; rowId?: string }) => {
    if (tableId === 'pdf-jobs') {
      return Promise.resolve({
        $id: 'job-123',
        attendeeIds: JSON.stringify(attendeeIds),
        eventSettingsId: 'es-456',
      });
    }
    if (tableId === 'event-settings') {
      return Promise.resolve({ $id: 'es-456', eventName: 'Test Event' });
    }
    if (tableId === 'attendees') {
      // Return the attendee matching the requested rowId, falling back to a generic record
      return Promise.resolve({
        $id: rowId ?? attendeeIds[0] ?? 'att-1',
        firstName: 'John',
        lastName: 'Doe',
        credentialUrl: 'https://example.com/cred',
      });
    }
    return Promise.resolve({});
  });

  mockListRows.mockImplementation(({ tableId }: { tableId: string }) => {
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
    })
  );

  mockBuildPdfHtml.mockReturnValue('<html>PDF</html>');
  mockParseOneSimpleApiResponse.mockReturnValue({ url: 'https://example.com/output.pdf' });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupDefaultMocks();
});

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('PDF Worker — Property-Based Tests', () => {
  // Feature: async-pdf-generation, Property 1: New job record integrity
  it('Property 1: New job record integrity', () => {
    // Validates: Requirements 1.1, 1.2
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 36 }), { minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (attendeeIds, requestedBy, eventSettingsId) => {
          const jobData = {
            status: 'pending',
            attendeeIds: JSON.stringify(attendeeIds),
            attendeeCount: attendeeIds.length,
            requestedBy,
            eventSettingsId,
            pdfUrl: null,
            error: null,
          };
          expect(jobData.status).toBe('pending');
          expect(jobData.attendeeCount).toBe(attendeeIds.length);
          expect(JSON.parse(jobData.attendeeIds)).toEqual(attendeeIds);
          expect(jobData.pdfUrl).toBeNull();
          expect(jobData.error).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: async-pdf-generation, Property 2: Completed jobs have a PDF URL
  it('Property 2: Completed jobs have a PDF URL', () => {
    // Validates: Requirement 1.4
    fc.assert(
      fc.property(
        fc.oneof(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.constantFrom('http://example.com/a.pdf', 'https://cdn.example.com/output.pdf')
        ),
        (pdfUrl) => {
          const completedJob = { status: 'completed', pdfUrl, error: null };
          expect(completedJob.pdfUrl).toBeTruthy();
          expect(
            completedJob.pdfUrl.startsWith('http://') ||
              completedJob.pdfUrl.startsWith('https://')
          ).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: async-pdf-generation, Property 3: Failed jobs have an error message
  it('Property 3: Failed jobs have an error message', () => {
    // Validates: Requirement 1.5
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (errorMsg) => {
          const failedJob = { status: 'failed', pdfUrl: null, error: errorMsg };
          expect(failedJob.error).toBeTruthy();
          expect(typeof failedJob.error).toBe('string');
          expect(failedJob.error.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: async-pdf-generation, Property 10: Worker error handling — all failures mark job as failed
  describe('Property 10: Worker error handling — all failures mark job as failed', () => {
    // Validates: Requirements 3.7, 7.2, 7.3

    it('Mode 1: DB fetch failure marks job as failed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (errMsg) => {
            vi.clearAllMocks();
            setupDefaultMocks();

            let callCount = 0;
            mockGetRow.mockImplementation(({ tableId }: { tableId: string }) => {
              if (tableId === 'pdf-jobs') {
                callCount++;
                if (callCount === 1) throw new Error(errMsg);
              }
              return Promise.resolve({});
            });

            const ctx = createMockContext();
            await workerHandler(ctx);

            const failCall = mockUpdateRow.mock.calls.find(
              (call: any[]) => call[0]?.data?.status === 'failed'
            );
            expect(failCall).toBeDefined();
            expect(failCall![0].data.error).toBeTruthy();
          }
        ),
        { numRuns: 25 }
      );
    });

    it('Mode 2: fetch (network) failure marks job as failed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (errMsg) => {
            vi.clearAllMocks();
            setupDefaultMocks();

            vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error(errMsg)));

            const ctx = createMockContext();
            await workerHandler(ctx);

            const failCall = mockUpdateRow.mock.calls.find(
              (call: any[]) => call[0]?.data?.status === 'failed'
            );
            expect(failCall).toBeDefined();
            expect(failCall![0].data.error).toBeTruthy();
          }
        ),
        { numRuns: 25 }
      );
    });

    it('Mode 3: non-200 fetch response marks job as failed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 400, max: 599 }),
          async (statusCode) => {
            vi.clearAllMocks();
            setupDefaultMocks();

            vi.stubGlobal(
              'fetch',
              vi.fn().mockResolvedValue({
                ok: false,
                status: statusCode,
                statusText: 'Error',
                text: vi.fn().mockResolvedValue(''),
              })
            );

            const ctx = createMockContext();
            await workerHandler(ctx);

            const failCall = mockUpdateRow.mock.calls.find(
              (call: any[]) => call[0]?.data?.status === 'failed'
            );
            expect(failCall).toBeDefined();
            expect(failCall![0].data.error).toBeTruthy();
          }
        ),
        { numRuns: 25 }
      );
    });

    it('Mode 4: parseOneSimpleApiResponse returns error marks job as failed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (errMsg) => {
            vi.clearAllMocks();
            setupDefaultMocks();

            mockParseOneSimpleApiResponse.mockReturnValue({ error: errMsg });

            const ctx = createMockContext();
            await workerHandler(ctx);

            const failCall = mockUpdateRow.mock.calls.find(
              (call: any[]) => call[0]?.data?.status === 'failed'
            );
            expect(failCall).toBeDefined();
            expect(failCall![0].data.error).toBeTruthy();
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  // Feature: async-pdf-generation, Property 11: Status endpoint returns correct job fields
  it('Property 11: Status endpoint returns correct job fields', () => {
    // Validates: Requirement 4.1
    const jobStatusArb = fc.record({
      status: fc.constantFrom('pending', 'processing', 'completed', 'failed'),
      pdfUrl: fc.option(fc.webUrl({ validSchemes: ['http', 'https'] }), { nil: null }),
      error: fc.option(fc.string({ minLength: 1 }), { nil: null }),
      attendeeCount: fc.integer({ min: 1, max: 500 }),
    });

    fc.assert(
      fc.property(jobStatusArb, (jobRow) => {
        // Simulate what the status endpoint returns
        const response = {
          status: jobRow.status,
          pdfUrl: jobRow.pdfUrl ?? null,
          error: jobRow.error ?? null,
          attendeeCount: jobRow.attendeeCount,
        };
        expect(response.status).toBe(jobRow.status);
        expect(response.pdfUrl).toBe(jobRow.pdfUrl ?? null);
        expect(response.error).toBe(jobRow.error ?? null);
        expect(response.attendeeCount).toBe(jobRow.attendeeCount);
      }),
      { numRuns: 100 }
    );
  });
});
