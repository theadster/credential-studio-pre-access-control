import type { NextApiRequest, NextApiResponse } from 'next';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { barcode } = req.query;

    if (!barcode || typeof barcode !== 'string') {
      return res.status(400).json({ error: 'Barcode parameter is required' });
    }

    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const collectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;

    // Check if barcode exists in database
    const response = await databases.listDocuments(
      databaseId,
      collectionId,
      [
        Query.equal('barcodeNumber', barcode),
        Query.limit(1)
      ]
    );

    return res.status(200).json({
      exists: response.documents.length > 0
    });
  } catch (error) {
    console.error('Error checking barcode uniqueness:', error);
    return res.status(500).json({ 
      error: 'Failed to check barcode uniqueness',
      exists: false // Return false to allow operation to continue
    });
  }
}
