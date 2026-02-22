import { describe, it, expect, beforeEach, vi } from 'vitest';
import handler from '@/pages/api/attendees/pdf-job-status';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn(),
}));

// Mock the API middleware — pass through with user/userProfile attached
vi.mock('@/lib/apiMiddleware', () => ({
  withAuth: (fn: any) => async (req: any, res: any) => fn(req, res),
}));

const mockAuthUser = {
  $id: 'user-123',
  email: 'admin@example.com',
};

const mockUserProfile = {
  $id: 'profile-123',
  userId: 'user-123',
  role: { permissions: { attendees: { bulkGeneratePDFs: true } } },
};

describe('pdf-job-status API', () => {
  let mockTablesDB: any;
  let mockReq: any;
  let mockRes: any;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockTablesDB = {
      getRow: vi.fn(),
    };

    const appwrite = await import('@/lib/appwrite');
    vi.mocked(appwrite.createSessionClient).mockReturnValue({
      tablesDB: mockTablesDB,
    } as any);

    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));

    mockReq = {
      method: 'GET',
      query: { jobId: 'job-abc-123' },
      cookies: { 'appwrite-session': 'test-jwt' },
      user: mockAuthUser,
      userProfile: mockUserProfile,
    };

    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
  });

  it('returns 401 when Appwrite throws a 401 error', async () => {
    const appwrite = await import('@/lib/appwrite');
    vi.mocked(appwrite.createSessionClient).mockReturnValue({
      tablesDB: {
        getRow: vi.fn().mockRejectedValue({ code: 401, message: 'Unauthorized' }),
      },
    } as any);

    await handler(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: 'Unauthorized' }));
  });

  it('returns 400 when jobId query param is missing', async () => {
    mockReq.query = {};

    await handler(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'jobId is required' });
    expect(mockTablesDB.getRow).not.toHaveBeenCalled();
  });

  it('returns 400 when jobId is an array (multiple values)', async () => {
    mockReq.query = { jobId: ['job-1', 'job-2'] };

    await handler(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'jobId is required' });
  });

  it('returns 404 when job does not exist', async () => {
    mockTablesDB.getRow.mockRejectedValue({ code: 404, message: 'Row not found' });

    await handler(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Job not found' });
  });

  it('returns correct fields for a pending job', async () => {
    mockTablesDB.getRow.mockResolvedValue({
      $id: 'job-abc-123',
      status: 'pending',
      pdfUrl: null,
      error: null,
      attendeeCount: 5,
    });

    await handler(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      status: 'pending',
      pdfUrl: null,
      error: null,
      attendeeCount: 5,
    });
  });

  it('returns correct fields for a processing job', async () => {
    mockTablesDB.getRow.mockResolvedValue({
      $id: 'job-abc-123',
      status: 'processing',
      pdfUrl: null,
      error: null,
      attendeeCount: 10,
    });

    await handler(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      status: 'processing',
      pdfUrl: null,
      error: null,
      attendeeCount: 10,
    });
  });

  it('returns status, pdfUrl, and attendeeCount for a completed job', async () => {
    mockTablesDB.getRow.mockResolvedValue({
      $id: 'job-abc-123',
      status: 'completed',
      pdfUrl: 'https://cdn.example.com/output.pdf',
      error: null,
      attendeeCount: 25,
    });

    await handler(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      status: 'completed',
      pdfUrl: 'https://cdn.example.com/output.pdf',
      error: null,
      attendeeCount: 25,
    });
  });

  it('returns status, error, and attendeeCount for a failed job', async () => {
    mockTablesDB.getRow.mockResolvedValue({
      $id: 'job-abc-123',
      status: 'failed',
      pdfUrl: null,
      error: 'OneSimpleAPI returned error: 503 Service Unavailable',
      attendeeCount: 8,
    });

    await handler(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      status: 'failed',
      pdfUrl: null,
      error: 'OneSimpleAPI returned error: 503 Service Unavailable',
      attendeeCount: 8,
    });
  });

  it('uses named object parameters when calling tablesDB.getRow', async () => {
    mockTablesDB.getRow.mockResolvedValue({
      $id: 'job-abc-123',
      status: 'pending',
      pdfUrl: null,
      error: null,
      attendeeCount: 3,
    });

    await handler(mockReq, mockRes);

    const callArg = mockTablesDB.getRow.mock.calls[0][0];
    expect(typeof callArg).toBe('object');
    expect(callArg).toHaveProperty('databaseId');
    expect(callArg).toHaveProperty('tableId');
    expect(callArg).toHaveProperty('rowId', 'job-abc-123');
  });

  it('returns 500 for unexpected errors', async () => {
    mockTablesDB.getRow.mockRejectedValue(new Error('Network timeout'));

    await handler(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to fetch job status' });
  });

  it('returns null for pdfUrl and error when fields are undefined in DB record', async () => {
    mockTablesDB.getRow.mockResolvedValue({
      $id: 'job-abc-123',
      status: 'pending',
      attendeeCount: 2,
    });

    await handler(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      status: 'pending',
      pdfUrl: null,
      error: null,
      attendeeCount: 2,
    });
  });

  it('returns 403 when job requestedBy does not match authenticated user', async () => {
    mockTablesDB.getRow.mockResolvedValue({
      $id: 'job-abc-123',
      requestedBy: 'other-user-id',
      status: 'completed',
      pdfUrl: 'https://cdn.example.com/output.pdf',
      error: null,
      attendeeCount: 5,
    });

    await handler(mockReq, mockRes);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Forbidden' });
  });
});
