import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/attendees/[id]';
import { mockAccount, mockAdminTablesDB, mockTablesDB, resetAllMocks } from '@/test/mocks/appwrite';

interface AuthenticatedRequest extends NextApiRequest {
  user?: any;
  userProfile?: any;
}

vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    tablesDB: mockTablesDB,
  })),
  createAdminClient: vi.fn(() => ({
    tablesDB: mockAdminTablesDB,
  })),
}));

vi.mock('@/lib/apiMiddleware', () => ({
  withAuth: (handler: any) => async (req: any, res: any) => {
    return handler(req, res);
  },
  AuthenticatedRequest: {} as any,
}));

vi.mock('@/lib/logSettings', () => ({
  shouldLog: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('@/lib/logFormatting', () => ({
  createAttendeeLogDetails: vi.fn((action: string, attendeeData: any, extra?: any) => ({
    type: `attendee_${action}`,
    attendeeId: attendeeData.id || 'attendee-123',
    firstName: attendeeData.firstName,
    lastName: attendeeData.lastName,
    barcodeNumber: attendeeData.barcodeNumber,
    ...extra,
  })),
}));

vi.mock('@/lib/transactions', () => ({
  executeTransactionWithRetry: vi.fn(async (tablesDB: any, operations: any[]) => {
    const transaction = await tablesDB.createTransaction();
    await tablesDB.createOperations({
      transactionId: transaction.$id,
      operations,
    });
    await tablesDB.updateTransaction({
      transactionId: transaction.$id,
      commit: true,
    });
    return { success: true, transactionId: transaction.$id, operationsCount: operations.length };
  }),
  handleTransactionError: vi.fn((error: any, res: any) => {
    res.status(500).json({ error: 'Transaction failed' });
  }),
}));

vi.mock('@/lib/operators', () => ({
  createIncrement: vi.fn((value: number) => ({ __op: 'increment', value })),
  createDecrement: vi.fn((value: number, opts?: any) => ({ __op: 'decrement', value, ...opts })),
  dateOperators: {
    setNow: vi.fn(() => ({ __op: 'setNow' })),
  },
}));

vi.mock('@/util/customFields', () => ({
  parseCustomFieldValues: vi.fn((val: any) => {
    if (!val) return [];
    try {
      const parsed = typeof val === 'string' ? JSON.parse(val) : val;
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === 'object') {
        return Object.entries(parsed).map(([customFieldId, value]) => ({ customFieldId, value }));
      }
    } catch { /* ignore */ }
    return [];
  }),
}));

vi.mock('@/lib/customFieldNormalization', () => ({
  normalizeCustomFieldValues: vi.fn((val: any) => {
    if (!val) return null;
    if (typeof val === 'object' && !Array.isArray(val)) return val;
    return val;
  }),
  stringifyCustomFieldValues: vi.fn((val: any) => {
    if (typeof val === 'string') return val;
    return JSON.stringify(val);
  }),
}));

vi.mock('@/lib/fieldUpdate', () => ({
  updatePhotoFields: vi.fn(),
}));

vi.mock('@/lib/concurrencyErrors', () => ({
  ConcurrencyErrorCode: { MAX_RETRIES_EXCEEDED: 'MAX_RETRIES_EXCEEDED' },
  createConcurrencyErrorResponse: vi.fn(() => ({ error: 'Concurrency error' })),
  getHttpStatusForError: vi.fn(() => 409),
  mapLockErrorToCode: vi.fn(() => 'MAX_RETRIES_EXCEEDED'),
}));

vi.mock('@/lib/conflictResolver', () => ({
  OperationType: { PHOTO_UPLOAD: 'PHOTO_UPLOAD' },
}));

/** Helper to create an Appwrite-style error with a code property */
const createAppwriteError = (message: string, code: number) => {
  const error: any = new Error(message);
  error.code = code;
  return error;
};


describe('Attendee Detail API', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  const AUTH_USER = {
    $id: 'auth-user-123',
    email: 'admin@test.com',
    name: 'Admin User',
  };

  const ADMIN_ROLE = {
    id: 'role-admin',
    name: 'Super Administrator',
    permissions: {
      attendees: { create: true, read: true, update: true, delete: true },
      all: true,
    },
  };

  const READ_ONLY_ROLE = {
    id: 'role-viewer',
    name: 'Viewer',
    permissions: {
      attendees: { create: false, read: true, update: false, delete: false },
      all: false,
    },
  };

  const NO_PERM_ROLE = {
    id: 'role-none',
    name: 'No Permissions',
    permissions: {
      attendees: { create: false, read: false, update: false, delete: false },
      all: false,
    },
  };

  const USER_PROFILE = {
    id: 'profile-123',
    userId: AUTH_USER.$id,
    email: AUTH_USER.email,
    name: AUTH_USER.name,
    roleId: ADMIN_ROLE.id,
    role: ADMIN_ROLE,
  };

  const EXISTING_ATTENDEE = {
    $id: 'attendee-123',
    firstName: 'John',
    lastName: 'Doe',
    barcodeNumber: '12345',
    notes: 'Some notes',
    photoUrl: '',
    customFieldValues: JSON.stringify({}),
    lastSignificantUpdate: '2024-01-01T00:00:00.000Z',
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    resetAllMocks();

    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));

    mockReq = {
      method: 'GET',
      cookies: { 'appwrite-session': 'test-session' },
      query: { id: 'attendee-123' },
      body: {},
      user: AUTH_USER,
      userProfile: USER_PROFILE,
    } as any;

    mockRes = {
      status: statusMock as any,
      setHeader: vi.fn(),
    };

    // Default transaction mocks
    mockTablesDB.createTransaction.mockResolvedValue({ $id: 'txn-123' });
    mockTablesDB.createOperations.mockResolvedValue(undefined);
    mockTablesDB.updateTransaction.mockResolvedValue(undefined);
    mockTablesDB.createRow.mockResolvedValue({ $id: 'log-123' });
  });

  // ─── Validation ───────────────────────────────────────────────

  describe('Validation', () => {
    it('should return 400 if ID is missing', async () => {
      mockReq.query = {};
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid attendee ID' });
    });
  });

  // ─── GET ──────────────────────────────────────────────────────

  describe('GET', () => {
    it('should return attendee successfully', async () => {
      mockTablesDB.getRow.mockResolvedValueOnce(EXISTING_ATTENDEE);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'attendee-123',
          firstName: 'John',
          lastName: 'Doe',
        })
      );
    });

    it('should return 403 if user lacks read permission', async () => {
      mockReq.userProfile = { ...USER_PROFILE, role: NO_PERM_ROLE };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should return 404 if attendee not found', async () => {
      // GET path has no local try/catch - errors fall to outer catch
      // which checks error.code for Appwrite-style errors
      mockTablesDB.getRow.mockRejectedValueOnce(createAppwriteError('Document not found', 404));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should parse customFieldValues from JSON string', async () => {
      const attendeeWithCF = {
        ...EXISTING_ATTENDEE,
        customFieldValues: JSON.stringify({ 'field-1': 'Value 1' }),
      };
      mockTablesDB.getRow.mockResolvedValueOnce(attendeeWithCF);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(Array.isArray(response.customFieldValues)).toBe(true);
    });
  });


  // ─── PUT ──────────────────────────────────────────────────────

  describe('PUT', () => {
    beforeEach(() => {
      mockReq.method = 'PUT';
    });

    /**
     * Helper: set up mocks for a standard PUT update (no barcode change, no custom fields).
     * PUT call sequence for standard field update:
     *   1. getRow - fetch existing attendee
     *   2. listRows (paginated) - custom fields config for printable detection
     *   3. (no barcode check since barcode not changed)
     *   4. (no custom field validation since no customFieldValues)
     *   5. (no access control since env var not set)
     *   6. (no custom fields for logging since no customFieldValues)
     *   7. Transaction (createTransaction, createOperations, updateTransaction)
     *   8. getRow - fetch updated attendee
     */
    const setupStandardPutMocks = (
      existing: any = EXISTING_ATTENDEE,
      updated?: any
    ) => {
      const updatedAttendee = updated || { ...existing, firstName: 'Jane' };
      // 1. getRow - existing attendee
      mockTablesDB.getRow.mockResolvedValueOnce(existing);
      // 2. listRows - custom fields config (empty, no custom fields)
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [], total: 0 });
      // 8. getRow - updated attendee after transaction
      mockTablesDB.getRow.mockResolvedValueOnce(updatedAttendee);
      return updatedAttendee;
    };

    it('should update attendee successfully', async () => {
      mockReq.body = { firstName: 'Jane' };
      setupStandardPutMocks();

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(mockTablesDB.createOperations).toHaveBeenCalled();
    });

    it('should return 403 if user lacks update permission', async () => {
      mockReq.userProfile = { ...USER_PROFILE, role: NO_PERM_ROLE };
      mockReq.body = { firstName: 'Jane' };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should return 404 if attendee not found', async () => {
      mockReq.body = { firstName: 'Jane' };
      // PUT path has its own try/catch around getRow that returns 404 on any error
      mockTablesDB.getRow.mockRejectedValueOnce(new Error('Not found'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should return 400 if custom field IDs are invalid', async () => {
      mockReq.body = {
        customFieldValues: [{ customFieldId: 'nonexistent-field', value: 'test' }],
      };

      // 1. getRow - existing attendee
      mockTablesDB.getRow.mockResolvedValueOnce(EXISTING_ATTENDEE);
      // 2. listRows - custom fields config for printable detection (empty)
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [], total: 0 });
      // 4. listRows - validate custom field IDs (returns empty = no valid fields)
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [], total: 0 });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('custom fields') })
      );
    });

    it('should update only provided fields', async () => {
      mockReq.body = { notes: 'Updated notes' };
      setupStandardPutMocks(EXISTING_ATTENDEE, {
        ...EXISTING_ATTENDEE,
        notes: 'Updated notes',
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const ops = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const updateOp = ops.find((op: any) => op.action === 'update');
      expect(updateOp.data.firstName).toBe('John'); // unchanged
      expect(updateOp.data.notes).toBe('Updated notes');
    });

    it('should create a log entry on update', async () => {
      mockReq.body = { firstName: 'Jane' };
      setupStandardPutMocks();

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const ops = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const logOp = ops.find((op: any) => op.action === 'create' && op.data?.action === 'update');
      expect(logOp).toBeDefined();
      expect(logOp.data.userId).toBe(AUTH_USER.$id);
    });

    it('should return 400 if barcode already exists for another attendee', async () => {
      mockReq.body = { barcodeNumber: 'DUPLICATE-123' };

      // 1. getRow - existing attendee
      mockTablesDB.getRow.mockResolvedValueOnce(EXISTING_ATTENDEE);
      // 2. listRows - custom fields config for printable detection (empty)
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [], total: 0 });
      // 3. listRows - barcode uniqueness check (returns a duplicate!)
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [{
          $id: 'other-attendee-456',
          firstName: 'Other',
          lastName: 'Person',
          barcodeNumber: 'DUPLICATE-123',
        }],
        total: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Barcode number already exists' })
      );
    });
  });


  // ─── DELETE ───────────────────────────────────────────────────

  describe('DELETE', () => {
    beforeEach(() => {
      mockReq.method = 'DELETE';
    });

    it('should delete attendee successfully', async () => {
      mockTablesDB.getRow.mockResolvedValueOnce(EXISTING_ATTENDEE);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Attendee deleted successfully' });
    });

    it('should return 403 if user lacks delete permission', async () => {
      mockReq.userProfile = { ...USER_PROFILE, role: READ_ONLY_ROLE };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should return 404 if attendee not found', async () => {
      // DELETE path has its own try/catch around getRow that returns 404
      mockTablesDB.getRow.mockRejectedValueOnce(new Error('Not found'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should create a log entry on delete', async () => {
      mockTablesDB.getRow.mockResolvedValueOnce(EXISTING_ATTENDEE);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      const ops = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const logOp = ops.find((op: any) => op.action === 'create' && op.data?.action === 'delete');
      expect(logOp).toBeDefined();
      expect(logOp.data.userId).toBe(AUTH_USER.$id);
    });
  });

  // ─── Method Not Allowed ───────────────────────────────────────

  describe('Method Not Allowed', () => {
    it('should return 405 for POST', async () => {
      mockReq.method = 'POST';
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      expect(statusMock).toHaveBeenCalledWith(405);
    });

    it('should return 405 for PATCH', async () => {
      mockReq.method = 'PATCH';
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      expect(statusMock).toHaveBeenCalledWith(405);
    });
  });


  // ─── Printable Field Detection ────────────────────────────────

  describe('Printable Field Detection', () => {
    beforeEach(() => {
      mockReq.method = 'PUT';
    });

    it('should update lastSignificantUpdate when standard fields change', async () => {
      mockReq.body = { firstName: 'Jane' };

      mockTablesDB.getRow.mockResolvedValueOnce(EXISTING_ATTENDEE);
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [], total: 0 });
      mockTablesDB.getRow.mockResolvedValueOnce({ ...EXISTING_ATTENDEE, firstName: 'Jane' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(mockTablesDB.createOperations).toHaveBeenCalled();
      const ops = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const updateOp = ops.find((op: any) => op.action === 'update');
      expect(updateOp.data).toHaveProperty('lastSignificantUpdate');
      expect(updateOp.data.lastSignificantUpdate).not.toBe('2024-01-01T00:00:00.000Z');
    });

    it('should NOT update lastSignificantUpdate when only notes change', async () => {
      mockReq.body = { notes: 'New notes' };

      mockTablesDB.getRow.mockResolvedValueOnce(EXISTING_ATTENDEE);
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [], total: 0 });
      mockTablesDB.getRow.mockResolvedValueOnce({ ...EXISTING_ATTENDEE, notes: 'New notes' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(mockTablesDB.createOperations).toHaveBeenCalled();
      const ops = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const updateOp = ops.find((op: any) => op.action === 'update');
      if (updateOp.data.lastSignificantUpdate) {
        expect(updateOp.data.lastSignificantUpdate).toBe(EXISTING_ATTENDEE.lastSignificantUpdate);
      }
    });

    it('should NOT update lastSignificantUpdate when non-printable custom field changes', async () => {
      const nonPrintableField = {
        $id: 'field-np',
        fieldName: 'Internal Notes',
        fieldType: 'text',
        printable: false,
      };

      mockReq.body = {
        customFieldValues: [{ customFieldId: 'field-np', value: 'New value' }],
      };

      const attendeeWithCF = {
        ...EXISTING_ATTENDEE,
        customFieldValues: JSON.stringify({ 'field-np': 'Old value' }),
      };

      // 1. getRow - existing attendee
      mockTablesDB.getRow.mockResolvedValueOnce(attendeeWithCF);
      // 2. listRows - custom fields config for printable detection
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [nonPrintableField], total: 1 });
      // 4. listRows - validate custom field IDs
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [nonPrintableField], total: 1 });
      // 6. listRows - custom fields for logging
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [nonPrintableField], total: 1 });
      // 8. getRow - updated attendee
      mockTablesDB.getRow.mockResolvedValueOnce({
        ...attendeeWithCF,
        customFieldValues: JSON.stringify({ 'field-np': 'New value' }),
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(mockTablesDB.createOperations).toHaveBeenCalled();
      const ops = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const updateOp = ops.find((op: any) => op.action === 'update');
      if (updateOp.data.lastSignificantUpdate) {
        expect(updateOp.data.lastSignificantUpdate).toBe(EXISTING_ATTENDEE.lastSignificantUpdate);
      }
    });

    it('should update lastSignificantUpdate when printable custom field value changes', async () => {
      const printableField = {
        $id: 'field-p',
        fieldName: 'Company Name',
        fieldType: 'text',
        printable: true,
      };

      mockReq.body = {
        customFieldValues: [{ customFieldId: 'field-p', value: 'New Company' }],
      };

      const attendeeWithCF = {
        ...EXISTING_ATTENDEE,
        customFieldValues: JSON.stringify({ 'field-p': 'Old Company' }),
      };

      // 1. getRow - existing attendee
      mockTablesDB.getRow.mockResolvedValueOnce(attendeeWithCF);
      // 2. listRows - custom fields config for printable detection
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [printableField], total: 1 });
      // 4. listRows - validate custom field IDs
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [printableField], total: 1 });
      // 6. listRows - custom fields for logging
      mockTablesDB.listRows.mockResolvedValueOnce({ rows: [printableField], total: 1 });
      // 8. getRow - updated attendee
      mockTablesDB.getRow.mockResolvedValueOnce({
        ...attendeeWithCF,
        customFieldValues: JSON.stringify({ 'field-p': 'New Company' }),
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(mockTablesDB.createOperations).toHaveBeenCalled();
      const ops = mockTablesDB.createOperations.mock.calls[0][0].operations;
      const updateOp = ops.find((op: any) => op.action === 'update');
      expect(updateOp).toBeDefined();
      expect(updateOp.data).toHaveProperty('lastSignificantUpdate');
      expect(updateOp.data.lastSignificantUpdate).not.toBe('2024-01-01T00:00:00.000Z');
    });
  });
});
