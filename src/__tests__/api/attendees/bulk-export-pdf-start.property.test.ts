/**
 * Property-based tests for the bulk-export-pdf-start API endpoint.
 *
 * Uses fast-check to generate random inputs and verify invariants hold
 * across all valid/invalid input combinations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import handler from '@/pages/api/attendees/bulk-export-pdf-start';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn(),
}));

// Pass-through auth middleware
vi.mock('@/lib/apiMiddleware', () => ({
  withAuth: (fn: any) => async (req: any, res: any) => fn(req, res),
}));

vi.mock('appwrite', () => ({
  Query: {
    limit: vi.fn((n: number) => `limit(${n})`),
    equal: vi.fn((field: string, value: string) => `equal(${field},${value})`),
  },
  ID: {
    unique: vi.fn(() => 'generated-job-id'),
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRes() {
  const jsonMock = vi.fn();
  const statusMock = vi.fn(() => ({ json: jsonMock }));
  return {
    res: { status: statusMock, json: jsonMock } as any,
    statusMock,
    jsonMock,
  };
}

function makeTablesDB(overrides: Partial<Record<string, any>> = {}) {
  return {
    listRows: vi.fn(),
    getRow: vi.fn(),
    createRow: vi.fn().mockResolvedValue({ $id: 'generated-job-id' }),
    updateRow: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function makeFunctions(overrides: Partial<Record<string, any>> = {}) {
  return {
    createExecution: vi.fn().mockResolvedValue({ $id: 'exec-1' }),
    ...overrides,
  };
}

const validEventSettings = {
  $id: 'event-settings-1',
  eventName: 'Test Event',
  eventDate: '2024-06-01',
};

const validOneSimpleApi = {
  $id: 'osa-1',
  enabled: true,
  url: 'https://api.onesimple.com/pdf',
  formDataKey: 'html',
  formDataValue: '<html>{{credentialRecords}}</html>',
  recordTemplate: '<div>{{firstName}}</div>',
  eventSettingsId: 'event-settings-1',
};

function makeValidAttendee(id: string) {
  return {
    $id: id,
    firstName: 'Alice',
    lastName: 'Smith',
    credentialUrl: `https://example.com/cred/${id}.png`,
    credentialGeneratedAt: '2024-05-10T10:00:00.000Z',
    lastSignificantUpdate: '2024-05-01T10:00:00.000Z', // before credential
  };
}

async function setupMocks(tablesDB: any, functions: any) {
  const appwrite = await import('@/lib/appwrite');
  vi.mocked(appwrite.createSessionClient).mockReturnValue({
    tablesDB,
    functions,
  } as any);
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const nonEmptyAttendeeIds = fc.array(fc.uuid(), { minLength: 1, maxLength: 10 });

const permittedUserProfile = fc.record({
  $id: fc.uuid(),
  userId: fc.uuid(),
  role: fc.constant({
    permissions: { attendees: { bulkGeneratePDFs: true } },
  }),
});

const unpermittedUserProfile = fc.oneof(
  fc.constant({ $id: 'p1', userId: 'u1', role: { permissions: { attendees: { bulkGeneratePDFs: false } } } }),
  fc.constant({ $id: 'p2', userId: 'u2', role: { permissions: {} } }),
  fc.constant({ $id: 'p3', userId: 'u3', role: null }),
  fc.constant({ $id: 'p4', userId: 'u4', role: undefined }),
);

// ─── Property 4: Invalid inputs produce errors without job creation ──────────

// Feature: async-pdf-generation, Property 4: Invalid inputs produce errors without job creation
// Validates: Requirements 2.1, 2.4

describe('Property 4: Invalid inputs produce errors without job creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('empty attendeeIds always returns 4xx and never creates a job', async () => {
    await fc.assert(
      fc.asyncProperty(permittedUserProfile, async (userProfile) => {
        vi.clearAllMocks();
        const tablesDB = makeTablesDB();
        const functions = makeFunctions();
        await setupMocks(tablesDB, functions);

        const { res, statusMock } = makeRes();
        const req = {
          method: 'POST',
          cookies: {},
          body: { attendeeIds: [] },
          user: { $id: 'user-1' },
          userProfile,
        };

        await handler(req as any, res);

        const statusCode = (statusMock.mock.calls[0] as any)?.[0];
        expect(statusCode).toBeGreaterThanOrEqual(400);
        expect(tablesDB.createRow).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it('missing bulkGeneratePDFs permission always returns 403 and never creates a job', async () => {
    await fc.assert(
      fc.asyncProperty(nonEmptyAttendeeIds, unpermittedUserProfile, async (attendeeIds, userProfile) => {
        vi.clearAllMocks();
        const tablesDB = makeTablesDB();
        const functions = makeFunctions();
        await setupMocks(tablesDB, functions);

        const { res, statusMock } = makeRes();
        const req = {
          method: 'POST',
          cookies: {},
          body: { attendeeIds },
          user: { $id: 'user-1' },
          userProfile,
        };

        await handler(req as any, res);

        const statusCode = (statusMock.mock.calls[0] as any)?.[0];
        expect(statusCode).toBe(403);
        expect(tablesDB.createRow).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it('disabled OneSimpleAPI always returns 4xx and never creates a job', async () => {
    await fc.assert(
      fc.asyncProperty(nonEmptyAttendeeIds, async (attendeeIds) => {
        vi.clearAllMocks();
        const tablesDB = makeTablesDB({
          listRows: vi.fn()
            .mockResolvedValueOnce({ rows: [validEventSettings] })
            .mockResolvedValueOnce({ rows: [{ ...validOneSimpleApi, enabled: false }] }),
        });
        const functions = makeFunctions();
        await setupMocks(tablesDB, functions);

        const { res, statusMock } = makeRes();
        const req = {
          method: 'POST',
          cookies: {},
          body: { attendeeIds },
          user: { $id: 'user-1' },
          userProfile: { role: { permissions: { attendees: { bulkGeneratePDFs: true } } } },
        };

        await handler(req as any, res);

        const statusCode = (statusMock.mock.calls[0] as any)?.[0];
        expect(statusCode).toBeGreaterThanOrEqual(400);
        expect(tablesDB.createRow).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it('missing record template always returns 4xx and never creates a job', async () => {
    await fc.assert(
      fc.asyncProperty(nonEmptyAttendeeIds, async (attendeeIds) => {
        vi.clearAllMocks();
        const tablesDB = makeTablesDB({
          listRows: vi.fn()
            .mockResolvedValueOnce({ rows: [validEventSettings] })
            .mockResolvedValueOnce({ rows: [{ ...validOneSimpleApi, recordTemplate: null }] }),
          getRow: vi.fn().mockResolvedValue(makeValidAttendee('a1')),
        });
        const functions = makeFunctions();
        await setupMocks(tablesDB, functions);

        const { res, statusMock } = makeRes();
        const req = {
          method: 'POST',
          cookies: {},
          body: { attendeeIds },
          user: { $id: 'user-1' },
          userProfile: { role: { permissions: { attendees: { bulkGeneratePDFs: true } } } },
        };

        await handler(req as any, res);

        const statusCode = (statusMock.mock.calls[0] as any)?.[0];
        expect(statusCode).toBeGreaterThanOrEqual(400);
        expect(tablesDB.createRow).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it('attendees with missing credentials always returns 4xx and never creates a job', async () => {
    await fc.assert(
      fc.asyncProperty(nonEmptyAttendeeIds, async (attendeeIds) => {
        vi.clearAllMocks();
        const tablesDB = makeTablesDB({
          listRows: vi.fn()
            .mockResolvedValueOnce({ rows: [validEventSettings] })
            .mockResolvedValueOnce({ rows: [validOneSimpleApi] }),
          getRow: vi.fn().mockResolvedValue({
            $id: 'a1',
            firstName: 'Bob',
            lastName: 'Jones',
            credentialUrl: null,
          }),
        });
        const functions = makeFunctions();
        await setupMocks(tablesDB, functions);

        const { res, statusMock } = makeRes();
        const req = {
          method: 'POST',
          cookies: {},
          body: { attendeeIds },
          user: { $id: 'user-1' },
          userProfile: { role: { permissions: { attendees: { bulkGeneratePDFs: true } } } },
        };

        await handler(req as any, res);

        const statusCode = (statusMock.mock.calls[0] as any)?.[0];
        expect(statusCode).toBeGreaterThanOrEqual(400);
        expect(tablesDB.createRow).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it('attendees with outdated credentials always returns 4xx and never creates a job', async () => {
    await fc.assert(
      fc.asyncProperty(nonEmptyAttendeeIds, async (attendeeIds) => {
        vi.clearAllMocks();
        const tablesDB = makeTablesDB({
          listRows: vi.fn()
            .mockResolvedValueOnce({ rows: [validEventSettings] })
            .mockResolvedValueOnce({ rows: [validOneSimpleApi] }),
          getRow: vi.fn().mockResolvedValue({
            $id: 'a1',
            firstName: 'Bob',
            lastName: 'Jones',
            credentialUrl: 'https://example.com/cred.png',
            credentialGeneratedAt: '2024-01-01T00:00:00.000Z',
            lastSignificantUpdate: '2024-06-01T00:00:00.000Z', // after credential
          }),
        });
        const functions = makeFunctions();
        await setupMocks(tablesDB, functions);

        const { res, statusMock } = makeRes();
        const req = {
          method: 'POST',
          cookies: {},
          body: { attendeeIds },
          user: { $id: 'user-1' },
          userProfile: { role: { permissions: { attendees: { bulkGeneratePDFs: true } } } },
        };

        await handler(req as any, res);

        const statusCode = (statusMock.mock.calls[0] as any)?.[0];
        expect(statusCode).toBeGreaterThanOrEqual(400);
        expect(tablesDB.createRow).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 5: Valid inputs produce a pending job and HTTP 202 ─────────────

// Feature: async-pdf-generation, Property 5: Valid inputs produce a pending job and HTTP 202
// Validates: Requirements 2.2, 2.3

describe('Property 5: Valid inputs produce a pending job and HTTP 202', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('valid request always returns 202 with jobId and creates a pending job', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyAttendeeIds,
        fc.uuid(),
        async (attendeeIds, userId) => {
          vi.clearAllMocks();

          const tablesDB = makeTablesDB({
            listRows: vi.fn()
              .mockResolvedValueOnce({ rows: [validEventSettings] })
              .mockResolvedValueOnce({ rows: [validOneSimpleApi] }),
            getRow: vi.fn().mockImplementation((params: any) =>
              Promise.resolve(makeValidAttendee(params.rowId))
            ),
          });
          const functions = makeFunctions();
          await setupMocks(tablesDB, functions);

          const { res, statusMock, jsonMock } = makeRes();
          const req = {
            method: 'POST',
            cookies: {},
            body: { attendeeIds },
            user: { $id: userId },
            userProfile: { role: { permissions: { attendees: { bulkGeneratePDFs: true } } } },
          };

          await handler(req as any, res);

          // Must return 202
          expect(statusMock).toHaveBeenCalledWith(202);

          // Must include jobId
          const responseBody = jsonMock.mock.calls[0]?.[0];
          expect(responseBody).toHaveProperty('jobId');
          expect(typeof responseBody.jobId).toBe('string');

          // Must have created a row with status: 'pending'
          expect(tablesDB.createRow).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                status: 'pending',
                attendeeCount: attendeeIds.length,
                requestedBy: userId,
              }),
            })
          );

          // Must have triggered the function asynchronously
          expect(functions.createExecution).toHaveBeenCalledWith(
            expect.objectContaining({ async: true })
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
