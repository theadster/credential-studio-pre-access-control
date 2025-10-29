import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../check-barcode';
import { databases } from '@/lib/appwrite';

vi.mock('@/lib/appwrite', () => ({
  databases: {
    listDocuments: vi.fn()
  }
}));

describe('/api/attendees/check-barcode', () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    req = {
      method: 'GET',
      query: {}
    };
    
    res = {
      status: statusMock as any
    };

    vi.clearAllMocks();
  });

  it('should return 405 for non-GET requests', async () => {
    req.method = 'POST';

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(statusMock).toHaveBeenCalledWith(405);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('should return 400 if barcode parameter is missing', async () => {
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Barcode parameter is required' });
  });

  it('should return exists: true when barcode exists', async () => {
    req.query = { barcode: 'ABC123' };
    
    vi.mocked(databases.listDocuments).mockResolvedValue({
      documents: [{ $id: '1', barcodeNumber: 'ABC123' }],
      total: 1
    } as any);

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({ exists: true });
  });

  it('should return exists: false when barcode does not exist', async () => {
    req.query = { barcode: 'XYZ789' };
    
    vi.mocked(databases.listDocuments).mockResolvedValue({
      documents: [],
      total: 0
    } as any);

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({ exists: false });
  });

  it('should handle database errors gracefully', async () => {
    req.query = { barcode: 'ABC123' };
    
    vi.mocked(databases.listDocuments).mockRejectedValue(new Error('Database error'));

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Failed to check barcode uniqueness. Please try again.'
    });
  });

  it('should properly encode barcode in query', async () => {
    const specialBarcode = 'ABC#123';
    req.query = { barcode: specialBarcode };
    
    vi.mocked(databases.listDocuments).mockResolvedValue({
      documents: [],
      total: 0
    } as any);

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(databases.listDocuments).toHaveBeenCalled();
    const callArgs = vi.mocked(databases.listDocuments).mock.calls[0];
    
    // Verify the query includes the barcode
    expect(callArgs[2]).toBeDefined();
    const queryString = JSON.stringify(callArgs[2]);
    expect(queryString).toContain(specialBarcode);
    expect(queryString).toContain('barcodeNumber');
  });
});
