import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/attendees/bulk-export-pdf-start';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

// Mock the API middleware — pass through with user/userProfile attached
vi.mock('@/lib/apiMiddleware', () => ({
  withAuth: (fn: any) => async (req: any, res: any) => fn(req, res),
}));

// Mock appwrite Query and ID
vi.mock('node-appwrite', () => ({
  Query: {
    limit: vi.fn((n: number) => `limit(${n})`),
    equal: vi.fn((field: string, value: string) => `equal(${field},${value})`),
  },
  ID: {
    unique: vi.fn(() => 'generated-job-id'),
  },
}));

const mockAuthUser = {
  $id: 'user-123',
  email: 'admin@example.com',
  name: 'Admin User',
};

const mockUserProfile = {
  $id: 'profile-123',
  userId: 'user-123',
  role: {
    permissions: {
      attendees: { bulkGeneratePDFs: true },
    },
  },
};

const mockEventSettings = {
  $id: 'event-settings-1',
  eventName: 'Test Event',
  eventDate: '2024-06-01',
  eventTime: '09:00',
  eventLocation: 'Convention Center',
};

const mockOneSimpleApi = {
  $id: 'osa-1',
  enabled: true,
  url: 'https://api.onesimple.com/pdf',
  formDataKey: 'html',
  formDataValue: '<html>{{credentialRecords}}</html>',
  recordTemplate: '<div>{{firstName}} {{lastName}}</div>',
  eventSettingsId: 'event-settings-1',
};

const makeAttendee = (overrides: Record<string, any> = {}) => ({
  $id: 'attendee-1',
  firstName: 'Alice',
  lastName: 'Smith',
  barcodeNumber: '001',
  credentialUrl: 'https://example.com/cred/001.png',
  credentialGeneratedAt: '2024-05-01T10:00:00.000Z',
  lastSignificantUpdate: '2024-04-30T10:00:00.000Z',
  ...overrides,
});

describe('bulk-export-pdf-start API', () => {
  let mockTablesDB: any;
  let mockFunctions: any;
  let mockReq: any;
  let mockRes: any;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockTablesDB = {
      listRows: vi.fn(),
      getRow: vi.fn(),
      createRow: vi.fn().mockResolvedValue({ $id: 'generated-job-id' }),
      updateRow: vi.fn().mockResolvedValue({}),
    };

    mockFunctions = {
      createExecution: vi.fn().mockResolvedValue({ $id: 'exec-1' }),
    };

    const appwrite = await import('@/lib/appwrite');
    vi.mocked(appwrite.createSessionClient).mockReturnValue({
      tablesDB: mockTablesDB,
      functions: mockFunctions,
    } as any);
    vi.mocked(appwrite.createAdminClient).mockReturnValue({
      functions: mockFunctions,
    } as any);

    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));

    mockReq = {
      method: 'POST',
      cookies: { 'appwrite-session': 'test-jwt' },
      body: { attendeeIds: ['attendee-1'] },
      user: mockAuthUser,
      userProfile: mockUserProfile,
    };

    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    // Default DB responses: event settings, OneSimpleAPI
    mockTablesDB.listRows
      .mockResolvedValueOnce({ rows: [mockEventSettings] })
      .mockResolvedValueOnce({ rows: [mockOneSimpleApi] });

    // Default attendee
    mockTablesDB.getRow.mockResolvedValue(makeAttendee());
  });

  it('returns 401 when Appwrite throws a 401 error', async () => {
    const appwrite = await import('@/lib/appwrite');
    vi.mocked(appwrite.createSessionClient).mockReturnValue({
      tablesDB: {
        listRows: vi.fn().mockRejectedValue({ code: 401, message: 'Unauthorized' }),
        getRow: vi.fn(),
        createRow: vi.fn(),
        updateRow: vi.fn(),
      },
      functions: mockFunctions,
    } as any);

    await handler(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: 'Unauthorized' }));
  });

  it('returns 403 when missing bulkGeneratePDFs permission', async () => {
    mockReq.userProfile = {
      ...mockUserProfile,
      role: { permissions: { attendees: { bulkGeneratePDFs: false } } },
    };

    await handler(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Insufficient permissions') })
    );
    expect(mockTablesDB.createRow).not.toHaveBeenCalled();
  });

  it('returns 400 when attendeeIds is empty', async () => {
    mockReq.body = { attendeeIds: [] };

    await handler(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Attendee IDs are required' })
    );
    expect(mockTablesDB.createRow).not.toHaveBeenCalled();
  });

  it('returns 400 when event settings not configured', async () => {
    mockTablesDB.listRows.mockReset().mockResolvedValueOnce({ rows: [] });

    await handler(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Event settings not configured' })
    );
    expect(mockTablesDB.createRow).not.toHaveBeenCalled();
  });

  it('returns 400 when OneSimpleAPI not enabled', async () => {
    mockTablesDB.listRows
      .mockReset()
      .mockResolvedValueOnce({ rows: [mockEventSettings] })
      .mockResolvedValueOnce({ rows: [{ ...mockOneSimpleApi, enabled: false }] });

    await handler(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'OneSimpleAPI integration is not enabled' })
    );
    expect(mockTablesDB.createRow).not.toHaveBeenCalled();
  });

  it('returns 400 when OneSimpleAPI not properly configured (missing url)', async () => {
    mockTablesDB.listRows
      .mockReset()
      .mockResolvedValueOnce({ rows: [mockEventSettings] })
      .mockResolvedValueOnce({ rows: [{ ...mockOneSimpleApi, url: null }] });

    await handler(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'OneSimpleAPI is not properly configured' })
    );
    expect(mockTablesDB.createRow).not.toHaveBeenCalled();
  });

  it('returns 400 when record template not configured', async () => {
    mockTablesDB.listRows
      .mockReset()
      .mockResolvedValueOnce({ rows: [mockEventSettings] })
      .mockResolvedValueOnce({ rows: [{ ...mockOneSimpleApi, recordTemplate: null }] });

    await handler(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'OneSimpleAPI record template is not configured' })
    );
    expect(mockTablesDB.createRow).not.toHaveBeenCalled();
  });

  it('returns 400 with errorType missing_credentials when attendees have no credentials', async () => {
    mockTablesDB.getRow.mockResolvedValue(makeAttendee({ credentialUrl: null }));

    await handler(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        errorType: 'missing_credentials',
        attendeesWithoutCredentials: expect.arrayContaining(['Alice Smith']),
      })
    );
    expect(mockTablesDB.createRow).not.toHaveBeenCalled();
  });

  it('returns 400 with errorType outdated_credentials when credentials are outdated', async () => {
    mockTablesDB.getRow.mockResolvedValue(
      makeAttendee({
        credentialGeneratedAt: '2024-04-01T10:00:00.000Z',
        lastSignificantUpdate: '2024-05-01T10:00:00.000Z', // after credential
      })
    );

    await handler(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        errorType: 'outdated_credentials',
        attendeesWithOutdatedCredentials: expect.arrayContaining(['Alice Smith']),
      })
    );
    expect(mockTablesDB.createRow).not.toHaveBeenCalled();
  });

  it('happy path: creates job, triggers function, returns 202 with jobId', async () => {
    await handler(mockReq, mockRes);

    // Job created with pending status using named object parameters
    expect(mockTablesDB.createRow).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'pending',
          attendeeCount: 1,
          requestedBy: 'user-123',
        }),
      })
    );

    // Function triggered asynchronously
    expect(mockFunctions.createExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        async: true,
        body: expect.stringContaining('jobId'),
      })
    );

    expect(statusMock).toHaveBeenCalledWith(202);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: expect.any(String) })
    );
  });

  it('function trigger failure: updates job to failed and returns 500', async () => {
    mockFunctions.createExecution.mockRejectedValue(new Error('Function unavailable'));

    await handler(mockReq, mockRes);

    // Job was created first
    expect(mockTablesDB.createRow).toHaveBeenCalled();

    // Then updated to failed
    expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'failed' }),
      })
    );

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Failed to start PDF generation' })
    );
  });
});
