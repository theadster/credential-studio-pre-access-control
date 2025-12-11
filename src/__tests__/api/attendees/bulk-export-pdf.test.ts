/**
 * Tests for Bulk Export PDF API
 * 
 * Verifies that the outdated credential detection logic correctly respects
 * the "printable fields" toggle in custom field settings.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/attendees/bulk-export-pdf';

// Mock fetch for OneSimpleAPI calls
global.fetch = vi.fn();

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn(),
}));

// Mock the API middleware
vi.mock('@/lib/apiMiddleware', () => ({
  withAuth: (handler: any) => async (req: any, res: any) => {
    return handler(req, res);
  },
}));

describe('Bulk Export PDF API - Outdated Credential Detection', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let mockDatabases: any;

  const mockAuthUser = {
    $id: 'user123',
    email: 'admin@example.com',
    name: 'Admin User',
  };

  const mockUserProfile = {
    $id: 'profile-123',
    userId: 'user123',
    email: 'admin@example.com',
    name: 'Admin User',
    role: {
      permissions: {
        attendees: { bulkGeneratePDFs: true },
        all: true,
      },
    },
  };

  const mockEventSettings = {
    $id: 'event123',
    eventName: 'Test Event',
    eventDate: '2024-01-15',
    eventTime: '10:00 AM',
    eventLocation: 'Test Venue',
  };

  const mockOneSimpleApi = {
    enabled: true,
    url: 'https://api.example.com/generate',
    formDataKey: 'html',
    formDataValue: '<html>{{credentialRecords}}</html>',
    recordTemplate: '<div>{{firstName}} {{lastName}}</div>',
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup mock databases
    mockDatabases = {
      listDocuments: vi.fn(),
      getDocument: vi.fn(),
    };

    // Import and mock after clearing
    const appwrite = await import('@/lib/appwrite');
    vi.mocked(appwrite.createSessionClient).mockReturnValue({
      databases: mockDatabases,
    } as any);

    // Mock successful PDF generation response
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('https://example.com/generated.pdf'),
    } as any);

    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));

    mockReq = {
      method: 'POST',
      cookies: { 'appwrite-session': 'test-session' },
      body: {},
      user: mockAuthUser,
      userProfile: mockUserProfile,
    } as any;

    mockRes = {
      status: statusMock,
      json: jsonMock,
    } as any;
  });

  describe('Printable Field Logic', () => {
    it('should NOT flag credential as outdated when only non-printable fields changed', async () => {
      mockReq.body = { attendeeIds: ['attendee1'] };

      const credentialGeneratedAt = '2024-01-10T10:00:00.000Z';
      const lastSignificantUpdate = '2024-01-09T10:00:00.000Z'; // Before credential generation
      const updatedAt = '2024-01-11T10:00:00.000Z'; // After credential generation (non-printable field update)

      const mockAttendee = {
        $id: 'attendee1',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        credentialUrl: 'https://example.com/credential.png',
        credentialGeneratedAt,
        lastSignificantUpdate, // Only printable fields update this
        $updatedAt: updatedAt, // All fields update this
        updatedAt,
      };

      // Mock database responses
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockEventSettings] }) // Event settings
        .mockResolvedValueOnce({ documents: [mockOneSimpleApi] }) // OneSimpleAPI config
        .mockResolvedValueOnce({ documents: [] }); // Custom fields

      mockDatabases.getDocument.mockResolvedValue(mockAttendee);

      await handler(mockReq as any, mockRes as any);

      // Should succeed without outdated credential error
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          url: 'https://example.com/generated.pdf',
        })
      );
    });

    it('should flag credential as outdated when printable fields changed', async () => {
      mockReq.body = { attendeeIds: ['attendee1'] };

      const credentialGeneratedAt = '2024-01-10T10:00:00.000Z';
      const lastSignificantUpdate = '2024-01-11T10:00:00.000Z'; // After credential generation

      const mockAttendee = {
        $id: 'attendee1',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        credentialUrl: 'https://example.com/credential.png',
        credentialGeneratedAt,
        lastSignificantUpdate, // Printable field was updated after credential generation
        $updatedAt: '2024-01-11T10:00:00.000Z',
      };

      // Mock database responses
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockEventSettings] })
        .mockResolvedValueOnce({ documents: [mockOneSimpleApi] })
        .mockResolvedValueOnce({ documents: [] });

      mockDatabases.getDocument.mockResolvedValue(mockAttendee);

      await handler(mockReq as any, mockRes as any);

      // Should return error with outdated credentials
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: 'outdated_credentials',
          attendeesWithOutdatedCredentials: expect.arrayContaining(['John Doe']),
        })
      );
    });

    it('should treat credential as current when generated at same time as significant update', async () => {
      mockReq.body = { attendeeIds: ['attendee1'] };

      const timestamp = '2024-01-10T10:00:00.000Z';

      const mockAttendee = {
        $id: 'attendee1',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        credentialUrl: 'https://example.com/credential.png',
        credentialGeneratedAt: timestamp,
        lastSignificantUpdate: timestamp, // Same time (within 5 second tolerance)
        $updatedAt: timestamp,
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockEventSettings] })
        .mockResolvedValueOnce({ documents: [mockOneSimpleApi] })
        .mockResolvedValueOnce({ documents: [] });

      mockDatabases.getDocument.mockResolvedValue(mockAttendee);

      await handler(mockReq as any, mockRes as any);

      // Should succeed - credential is current
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('should use 5-second tolerance for same-update detection', async () => {
      mockReq.body = { attendeeIds: ['attendee1'] };

      const credentialGeneratedAt = '2024-01-10T10:00:00.000Z';
      const lastSignificantUpdate = '2024-01-10T10:00:03.000Z'; // 3 seconds later (within tolerance)

      const mockAttendee = {
        $id: 'attendee1',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        credentialUrl: 'https://example.com/credential.png',
        credentialGeneratedAt,
        lastSignificantUpdate,
        $updatedAt: lastSignificantUpdate,
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockEventSettings] })
        .mockResolvedValueOnce({ documents: [mockOneSimpleApi] })
        .mockResolvedValueOnce({ documents: [] });

      mockDatabases.getDocument.mockResolvedValue(mockAttendee);

      await handler(mockReq as any, mockRes as any);

      // Should succeed - within 5 second tolerance
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('Legacy Record Support', () => {
    it('should fall back to updatedAt when lastSignificantUpdate does not exist', async () => {
      mockReq.body = { attendeeIds: ['attendee1'] };

      const credentialGeneratedAt = '2024-01-10T10:00:00.000Z';
      const updatedAt = '2024-01-11T10:00:00.000Z'; // After credential generation

      const mockAttendee = {
        $id: 'attendee1',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        credentialUrl: 'https://example.com/credential.png',
        credentialGeneratedAt,
        // No lastSignificantUpdate field (legacy record)
        $updatedAt: updatedAt,
        updatedAt,
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockEventSettings] })
        .mockResolvedValueOnce({ documents: [mockOneSimpleApi] })
        .mockResolvedValueOnce({ documents: [] });

      mockDatabases.getDocument.mockResolvedValue(mockAttendee);

      await handler(mockReq as any, mockRes as any);

      // Should flag as outdated using updatedAt fallback
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: 'outdated_credentials',
        })
      );
    });

    it('should treat legacy record as current when credential is newer than updatedAt', async () => {
      mockReq.body = { attendeeIds: ['attendee1'] };

      const credentialGeneratedAt = '2024-01-11T10:00:00.000Z';
      const updatedAt = '2024-01-10T10:00:00.000Z'; // Before credential generation

      const mockAttendee = {
        $id: 'attendee1',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        credentialUrl: 'https://example.com/credential.png',
        credentialGeneratedAt,
        // No lastSignificantUpdate field
        $updatedAt: updatedAt,
        updatedAt,
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockEventSettings] })
        .mockResolvedValueOnce({ documents: [mockOneSimpleApi] })
        .mockResolvedValueOnce({ documents: [] });

      mockDatabases.getDocument.mockResolvedValue(mockAttendee);

      await handler(mockReq as any, mockRes as any);

      // Should succeed - credential is current
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('Edge Cases', () => {
    it('should flag credential as outdated when credentialGeneratedAt is missing', async () => {
      mockReq.body = { attendeeIds: ['attendee1'] };

      const mockAttendee = {
        $id: 'attendee1',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        credentialUrl: 'https://example.com/credential.png',
        // No credentialGeneratedAt field
        lastSignificantUpdate: '2024-01-10T10:00:00.000Z',
        updatedAt: '2024-01-10T10:00:00.000Z',
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockEventSettings] })
        .mockResolvedValueOnce({ documents: [mockOneSimpleApi] })
        .mockResolvedValueOnce({ documents: [] });

      mockDatabases.getDocument.mockResolvedValue(mockAttendee);

      await handler(mockReq as any, mockRes as any);

      // Should flag as outdated
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: 'outdated_credentials',
        })
      );
    });

    it('should handle multiple attendees with mixed credential statuses', async () => {
      mockReq.body = { attendeeIds: ['attendee1', 'attendee2'] };

      const currentAttendee = {
        $id: 'attendee1',
        firstName: 'John',
        lastName: 'Doe',
        credentialUrl: 'https://example.com/credential1.png',
        credentialGeneratedAt: '2024-01-11T10:00:00.000Z',
        lastSignificantUpdate: '2024-01-10T10:00:00.000Z', // Before credential
      };

      const outdatedAttendee = {
        $id: 'attendee2',
        firstName: 'Jane',
        lastName: 'Smith',
        credentialUrl: 'https://example.com/credential2.png',
        credentialGeneratedAt: '2024-01-10T10:00:00.000Z',
        lastSignificantUpdate: '2024-01-11T10:00:00.000Z', // After credential
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockEventSettings] })
        .mockResolvedValueOnce({ documents: [mockOneSimpleApi] })
        .mockResolvedValueOnce({ documents: [] });

      mockDatabases.getDocument
        .mockResolvedValueOnce(currentAttendee)
        .mockResolvedValueOnce(outdatedAttendee);

      await handler(mockReq as any, mockRes as any);

      // Should flag only the outdated attendee
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: 'outdated_credentials',
          attendeesWithOutdatedCredentials: ['Jane Smith'],
        })
      );
    });
  });

  describe('Missing Credentials', () => {
    it('should return error when attendees have no credentials', async () => {
      mockReq.body = { attendeeIds: ['attendee1'] };

      const mockAttendee = {
        $id: 'attendee1',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        // No credentialUrl
      };

      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockEventSettings] })
        .mockResolvedValueOnce({ documents: [mockOneSimpleApi] });

      mockDatabases.getDocument.mockResolvedValue(mockAttendee);

      await handler(mockReq as any, mockRes as any);

      // Should return missing credentials error
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: 'missing_credentials',
          attendeesWithoutCredentials: expect.arrayContaining(['John Doe']),
        })
      );
    });
  });

  describe('Permission Checks', () => {
    it('should deny access without bulkGeneratePDFs permission', async () => {
      mockReq.body = { attendeeIds: ['attendee1'] };
      
      // Remove permission
      mockReq.userProfile = {
        ...mockUserProfile,
        role: {
          permissions: {
            attendees: { bulkGeneratePDFs: false },
          },
        },
      } as any;

      await handler(mockReq as any, mockRes as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Insufficient permissions'),
        })
      );
    });
  });
});
