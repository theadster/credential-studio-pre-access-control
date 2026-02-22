/**
 * Scan Log Type Definitions
 * 
 * This module provides TypeScript types and Zod validation schemas for the
 * scan logging system. These types define the structure of scan log records
 * that track badge scan attempts from mobile devices.
 * 
 * @see .kiro/specs/mobile-access-control/design.md
 */

import { z } from 'zod';

/**
 * Scan result type
 */
export type ScanResult = 'approved' | 'denied';

/**
 * Scan Log record stored in Appwrite database
 */
export interface ScanLog {
  /** Unique document ID from Appwrite */
  $id: string;
  /** Reference to the attendee (null if barcode not found) */
  attendeeId: string | null;
  /** The barcode value that was scanned */
  barcodeScanned: string;
  /** Scan result: approved or denied */
  result: ScanResult;
  /** Reason for denial (null if approved) */
  denialReason: string | null;
  /** Profile used for evaluation (null if none) */
  profileId: string | null;
  /** Version of profile used */
  profileVersion: number | null;
  /** Unique device identifier */
  deviceId: string;
  /** User who performed the scan */
  operatorId: string;
  /** ISO datetime when scan occurred on device */
  scannedAt: string;
  /** ISO datetime when synced to server (null if pending) */
  uploadedAt: string | null;
  /** Unique ID generated on device for deduplication */
  localId: string;
  /** Snapshot: attendee first name at time of scan */
  attendeeFirstName: string | null;
  /** Snapshot: attendee last name at time of scan */
  attendeeLastName: string | null;
  /** Snapshot: attendee photo URL at time of scan */
  attendeePhotoUrl: string | null;
  /** Document creation timestamp */
  $createdAt: string;
  /** Document last update timestamp */
  $updatedAt: string;
}

/**
 * Input type for uploading scan logs from mobile devices
 */
export interface ScanLogInput {
  /** Unique ID generated on device for deduplication */
  localId: string;
  /** Reference to the attendee (null if barcode not found) */
  attendeeId: string | null;
  /** The barcode value that was scanned */
  barcodeScanned: string;
  /** Scan result: approved or denied */
  result: ScanResult;
  /** Reason for denial (null if approved) */
  denialReason: string | null;
  /** Profile used for evaluation (null if none) */
  profileId: string | null;
  /** Version of profile used */
  profileVersion: number | null;
  /** Unique device identifier */
  deviceId: string;
  /** ISO datetime when scan occurred on device */
  scannedAt: string;
  /** Snapshot: attendee first name at time of scan */
  attendeeFirstName: string | null;
  /** Snapshot: attendee last name at time of scan */
  attendeeLastName: string | null;
  /** Snapshot: attendee photo URL at time of scan */
  attendeePhotoUrl: string | null;
}

/**
 * Zod schema for validating ISO 8601 datetime strings
 */
const isoDatetimeSchema = z.string().refine(
  (val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  },
  { message: 'Must be a valid ISO 8601 datetime string' }
);

/**
 * Zod schema for validating a single scan log input
 */
export const scanLogInputSchema = z.object({
  localId: z.string().min(1, 'Local ID is required'),
  attendeeId: z.string().nullable(),
  barcodeScanned: z.string().min(1, 'Barcode is required'),
  result: z.enum(['approved', 'denied']),
  denialReason: z.string().nullable(),
  profileId: z.string().nullable(),
  profileVersion: z.number().nullable(),
  deviceId: z.string().min(1, 'Device ID is required'),
  scannedAt: isoDatetimeSchema,
  attendeeFirstName: z.string().nullable().optional(),
  attendeeLastName: z.string().nullable().optional(),
  attendeePhotoUrl: z.string().nullable().optional(),
}).refine(
  (data) => {
    // Per Requirement 8.1-8.5: denied scans must have a denial reason
    if (data.result === 'denied' && !data.denialReason) {
      return false;
    }
    return true;
  },
  {
    message: 'Denied scans must include a denial reason',
    path: ['denialReason'],
  }
);

/**
 * Zod schema for validating batch scan log upload
 */
export const scanLogBatchSchema = z.object({
  logs: z.array(scanLogInputSchema).min(1, 'At least one log is required').max(100, 'Maximum 100 logs per batch'),
});

/**
 * Type inferred from the input schema
 */
export type ScanLogInputType = z.infer<typeof scanLogInputSchema>;

/**
 * Type inferred from the batch schema
 */
export type ScanLogBatchType = z.infer<typeof scanLogBatchSchema>;

/**
 * Response type for scan log upload
 */
export interface ScanLogUploadResponse {
  success: boolean;
  data: {
    received: number;
    duplicates: number;
    errors: Array<{
      index: number;
      localId: string;
      message: string;
    }>;
  };
}

/**
 * Filter options for querying scan logs
 */
export interface ScanLogFilters {
  /** Filter by device ID */
  deviceId?: string;
  /** Filter by operator ID */
  operatorId?: string;
  /** Filter by result (approved/denied) */
  result?: ScanResult;
  /** Filter by profile ID */
  profileId?: string;
  /** Filter by date range start */
  dateFrom?: string;
  /** Filter by date range end */
  dateTo?: string;
  /** Filter by attendee ID */
  attendeeId?: string;
}

/**
 * Export field options for scan logs CSV export
 */
export const SCAN_LOG_EXPORT_FIELDS = [
  'scannedAt',
  'barcodeScanned',
  'result',
  'denialReason',
  'attendeeName',
  'attendeeId',
  'profileName',
  'profileId',
  'profileVersion',
  'deviceId',
  'operatorName',
  'operatorId',
] as const;

export type ScanLogExportField = typeof SCAN_LOG_EXPORT_FIELDS[number];
