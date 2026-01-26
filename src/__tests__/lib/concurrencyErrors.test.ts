/**
 * Tests for Concurrency Error Messages
 * 
 * Validates: Requirements 5.4
 */

import { describe, it, expect } from 'vitest';
import {
  ConcurrencyErrorCode,
  CONCURRENCY_ERROR_MESSAGES,
  OPERATION_CONTEXT_MESSAGES,
  RESOLUTION_EXPLANATIONS,
  mapLockErrorToCode,
  createUserFriendlyErrorMessage,
  createConcurrencyErrorResponse,
  createResolutionSuccessMessage,
  isRetryableError,
  getHttpStatusForError,
  formatErrorForLogging,
} from '@/lib/concurrencyErrors';
import { OperationType, ResolutionStrategyType } from '@/lib/conflictResolver';

describe('ConcurrencyErrors', () => {
  describe('CONCURRENCY_ERROR_MESSAGES', () => {
    it('should have messages for all error codes', () => {
      const errorCodes = Object.values(ConcurrencyErrorCode);
      
      for (const code of errorCodes) {
        expect(CONCURRENCY_ERROR_MESSAGES[code]).toBeDefined();
        expect(CONCURRENCY_ERROR_MESSAGES[code].title).toBeTruthy();
        expect(CONCURRENCY_ERROR_MESSAGES[code].message).toBeTruthy();
        expect(CONCURRENCY_ERROR_MESSAGES[code].suggestion).toBeTruthy();
      }
    });

    it('should have user-friendly messages without technical jargon', () => {
      const technicalTerms = ['version', 'lock', 'mutex', 'transaction', 'rollback', 'commit'];
      
      for (const code of Object.values(ConcurrencyErrorCode)) {
        const template = CONCURRENCY_ERROR_MESSAGES[code];
        const fullText = `${template.title} ${template.message} ${template.suggestion}`.toLowerCase();
        
        for (const term of technicalTerms) {
          // Allow 'version' only in specific contexts
          if (term === 'version' && code === ConcurrencyErrorCode.VERSION_MISMATCH) {
            continue;
          }
          expect(fullText).not.toContain(term);
        }
      }
    });
  });

  describe('OPERATION_CONTEXT_MESSAGES', () => {
    it('should have context messages for all operation types', () => {
      const operationTypes = Object.values(OperationType);
      
      for (const opType of operationTypes) {
        expect(OPERATION_CONTEXT_MESSAGES[opType]).toBeDefined();
        expect(OPERATION_CONTEXT_MESSAGES[opType]).toBeTruthy();
      }
    });
  });

  describe('RESOLUTION_EXPLANATIONS', () => {
    it('should have explanations for all resolution strategies', () => {
      const strategies = Object.values(ResolutionStrategyType);
      
      for (const strategy of strategies) {
        expect(RESOLUTION_EXPLANATIONS[strategy]).toBeDefined();
        expect(RESOLUTION_EXPLANATIONS[strategy]).toBeTruthy();
      }
    });
  });

  describe('mapLockErrorToCode', () => {
    it('should map VERSION_MISMATCH correctly', () => {
      expect(mapLockErrorToCode('VERSION_MISMATCH')).toBe(ConcurrencyErrorCode.VERSION_MISMATCH);
    });

    it('should map MAX_RETRIES_EXCEEDED correctly', () => {
      expect(mapLockErrorToCode('MAX_RETRIES_EXCEEDED')).toBe(ConcurrencyErrorCode.MAX_RETRIES_EXCEEDED);
    });

    it('should map RECORD_NOT_FOUND to RECORD_DELETED', () => {
      expect(mapLockErrorToCode('RECORD_NOT_FOUND')).toBe(ConcurrencyErrorCode.RECORD_DELETED);
    });

    it('should map UPDATE_FAILED to MERGE_FAILED', () => {
      expect(mapLockErrorToCode('UPDATE_FAILED')).toBe(ConcurrencyErrorCode.MERGE_FAILED);
    });
  });

  describe('createUserFriendlyErrorMessage', () => {
    it('should create message without operation type', () => {
      const message = createUserFriendlyErrorMessage(ConcurrencyErrorCode.VERSION_MISMATCH);
      
      expect(message).toContain('saving your changes');
      expect(message).not.toContain('undefined');
    });

    it('should include operation context when provided', () => {
      const message = createUserFriendlyErrorMessage(
        ConcurrencyErrorCode.VERSION_MISMATCH,
        OperationType.PHOTO_UPLOAD
      );
      
      expect(message).toContain('uploading the photo');
    });

    it('should create different messages for different error codes', () => {
      const versionMessage = createUserFriendlyErrorMessage(ConcurrencyErrorCode.VERSION_MISMATCH);
      const retriesMessage = createUserFriendlyErrorMessage(ConcurrencyErrorCode.MAX_RETRIES_EXCEEDED);
      
      expect(versionMessage).not.toBe(retriesMessage);
    });
  });

  describe('createConcurrencyErrorResponse', () => {
    it('should create a complete error response', () => {
      const response = createConcurrencyErrorResponse({
        code: ConcurrencyErrorCode.VERSION_MISMATCH,
        documentId: 'doc-123',
        operationType: OperationType.CREDENTIAL_GENERATION,
        conflictingFields: ['credentialUrl'],
        retriesAttempted: 3,
      });

      expect(response.error).toBe('Record Updated by Another User');
      expect(response.code).toBe(ConcurrencyErrorCode.VERSION_MISMATCH);
      expect(response.message).toBeTruthy();
      expect(response.retryable).toBe(true);
      expect(response.details.documentId).toBe('doc-123');
      expect(response.details.suggestion).toBeTruthy();
      expect(response.details.operation).toBe('generating credentials');
      expect(response.details.retriesAttempted).toBe(3);
      expect(response.details.conflictingFields).toEqual(['credentialUrl']);
    });

    it('should mark RECORD_DELETED as not retryable', () => {
      const response = createConcurrencyErrorResponse({
        code: ConcurrencyErrorCode.RECORD_DELETED,
      });

      expect(response.retryable).toBe(false);
    });

    it('should mark MERGE_FAILED as not retryable', () => {
      const response = createConcurrencyErrorResponse({
        code: ConcurrencyErrorCode.MERGE_FAILED,
      });

      expect(response.retryable).toBe(false);
    });

    it('should use custom message when provided', () => {
      const customMessage = 'Custom error message for testing';
      const response = createConcurrencyErrorResponse({
        code: ConcurrencyErrorCode.VERSION_MISMATCH,
        customMessage,
      });

      expect(response.message).toBe(customMessage);
    });
  });

  describe('createResolutionSuccessMessage', () => {
    it('should create merge success message', () => {
      const message = createResolutionSuccessMessage(
        ResolutionStrategyType.MERGE,
        OperationType.PHOTO_UPLOAD
      );

      expect(message).toContain('merged');
      expect(message).toContain('uploading the photo');
    });

    it('should create latest-wins success message', () => {
      const message = createResolutionSuccessMessage(ResolutionStrategyType.LATEST_WINS);

      expect(message).toContain('more recent');
    });

    it('should create retry success message', () => {
      const message = createResolutionSuccessMessage(ResolutionStrategyType.RETRY);

      expect(message).toContain('retried');
    });
  });

  describe('isRetryableError', () => {
    it('should return true for VERSION_MISMATCH', () => {
      expect(isRetryableError(ConcurrencyErrorCode.VERSION_MISMATCH)).toBe(true);
    });

    it('should return false for MAX_RETRIES_EXCEEDED (server already exhausted retries)', () => {
      expect(isRetryableError(ConcurrencyErrorCode.MAX_RETRIES_EXCEEDED)).toBe(false);
    });

    it('should return true for LOCK_TIMEOUT', () => {
      expect(isRetryableError(ConcurrencyErrorCode.LOCK_TIMEOUT)).toBe(true);
    });

    it('should return false for RECORD_DELETED', () => {
      expect(isRetryableError(ConcurrencyErrorCode.RECORD_DELETED)).toBe(false);
    });

    it('should return false for MERGE_FAILED', () => {
      expect(isRetryableError(ConcurrencyErrorCode.MERGE_FAILED)).toBe(false);
    });
  });

  describe('getHttpStatusForError', () => {
    it('should return 409 for VERSION_MISMATCH', () => {
      expect(getHttpStatusForError(ConcurrencyErrorCode.VERSION_MISMATCH)).toBe(409);
    });

    it('should return 409 for MERGE_FAILED', () => {
      expect(getHttpStatusForError(ConcurrencyErrorCode.MERGE_FAILED)).toBe(409);
    });

    it('should return 404 for RECORD_DELETED', () => {
      expect(getHttpStatusForError(ConcurrencyErrorCode.RECORD_DELETED)).toBe(404);
    });

    it('should return 503 for LOCK_TIMEOUT', () => {
      expect(getHttpStatusForError(ConcurrencyErrorCode.LOCK_TIMEOUT)).toBe(503);
    });

    it('should return 409 for PARTIAL_FAILURE', () => {
      expect(getHttpStatusForError(ConcurrencyErrorCode.PARTIAL_FAILURE)).toBe(409);
    });
  });

  describe('formatErrorForLogging', () => {
    it('should format error response for logging', () => {
      const response = createConcurrencyErrorResponse({
        code: ConcurrencyErrorCode.VERSION_MISMATCH,
        documentId: 'doc-123',
        operationType: OperationType.PHOTO_UPLOAD,
        conflictingFields: ['photoUrl', 'photoUploadCount'],
        retriesAttempted: 2,
      });

      const logData = formatErrorForLogging(response);

      expect(logData.code).toBe(ConcurrencyErrorCode.VERSION_MISMATCH);
      expect(logData.retryable).toBe(true);
      expect(logData.documentId).toBe('doc-123');
      expect(logData.operation).toBe('uploading the photo');
      expect(logData.retriesAttempted).toBe(2);
      expect(logData.conflictingFieldsCount).toBe(2);
    });

    it('should handle missing optional fields', () => {
      const response = createConcurrencyErrorResponse({
        code: ConcurrencyErrorCode.MAX_RETRIES_EXCEEDED,
      });

      const logData = formatErrorForLogging(response);

      expect(logData.code).toBe(ConcurrencyErrorCode.MAX_RETRIES_EXCEEDED);
      expect(logData.documentId).toBeUndefined();
      expect(logData.conflictingFieldsCount).toBe(0);
    });
  });
});
