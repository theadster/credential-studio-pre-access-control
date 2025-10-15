/**
 * Tests for transaction error handling utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextApiResponse } from 'next';
import {
  TransactionErrorType,
  handleTransactionError,
  detectTransactionErrorType,
  isRetryableError,
  createErrorMessage
} from '../transactions';

describe('Transaction Error Handling', () => {
  describe('detectTransactionErrorType', () => {
    it('should detect CONFLICT errors by code', () => {
      const error = { code: 409, message: 'Conflict occurred' };
      expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.CONFLICT);
    });

    it('should detect CONFLICT errors by message', () => {
      const error = { code: 500, message: 'Transaction conflict detected' };
      expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.CONFLICT);
    });

    it('should detect VALIDATION errors', () => {
      const error = { code: 400, message: 'Invalid data provided' };
      expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.VALIDATION);
    });

    it('should detect PLAN_LIMIT errors', () => {
      const error = { code: 400, message: 'Operation exceeds plan limit' };
      expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.PLAN_LIMIT);
    });

    it('should detect PERMISSION errors by code', () => {
      const error = { code: 403, message: 'Access denied' };
      expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.PERMISSION);
    });

    it('should detect PERMISSION errors by message', () => {
      const error = { code: 500, message: 'Permission denied for this operation' };
      expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.PERMISSION);
    });

    it('should detect NOT_FOUND errors by code', () => {
      const error = { code: 404, message: 'Resource not found' };
      expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.NOT_FOUND);
    });

    it('should detect NOT_FOUND errors by message', () => {
      const error = { code: 500, message: 'Document not found' };
      expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.NOT_FOUND);
    });

    it('should detect ROLLBACK errors', () => {
      const error = { code: 500, message: 'Rollback failed' };
      expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.ROLLBACK);
    });

    it('should detect NETWORK errors by code 500', () => {
      const error = { code: 500, message: 'Server error' };
      expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.NETWORK);
    });

    it('should detect NETWORK errors by code 503', () => {
      const error = { code: 503, message: 'Service unavailable' };
      expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.NETWORK);
    });

    it('should detect NETWORK errors by timeout message', () => {
      const error = { code: 0, message: 'Request timeout' };
      expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.NETWORK);
    });

    it('should detect NETWORK errors by network message', () => {
      const error = { code: 0, message: 'Network connection failed' };
      expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.NETWORK);
    });

    it('should default to UNKNOWN for unrecognized errors', () => {
      const error = { code: 418, message: "I'm a teapot" };
      expect(detectTransactionErrorType(error)).toBe(TransactionErrorType.UNKNOWN);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for CONFLICT errors', () => {
      const error = { code: 409, message: 'Conflict' };
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for NETWORK errors', () => {
      const error = { code: 500, message: 'Network timeout' };
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for VALIDATION errors', () => {
      const error = { code: 400, message: 'Invalid data' };
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for PERMISSION errors', () => {
      const error = { code: 403, message: 'Access denied' };
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for NOT_FOUND errors', () => {
      const error = { code: 404, message: 'Not found' };
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for PLAN_LIMIT errors', () => {
      const error = { code: 400, message: 'Exceeds plan limit' };
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for ROLLBACK errors', () => {
      const error = { code: 500, message: 'Rollback failed' };
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for UNKNOWN errors', () => {
      const error = { code: 418, message: 'Unknown error' };
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('createErrorMessage', () => {
    it('should create message for CONFLICT errors', () => {
      const error = { code: 409, message: 'Conflict' };
      const message = createErrorMessage(error);
      expect(message).toContain('modified by another user');
      expect(message).toContain('refresh');
    });

    it('should create message for VALIDATION errors', () => {
      const error = { code: 400, message: 'Invalid email format' };
      const message = createErrorMessage(error);
      expect(message).toBe('Invalid email format');
    });

    it('should create default message for VALIDATION errors without message', () => {
      const error = { code: 400 };
      const message = createErrorMessage(error);
      expect(message).toContain('invalid');
    });

    it('should create message for PERMISSION errors', () => {
      const error = { code: 403, message: 'Access denied' };
      const message = createErrorMessage(error);
      expect(message).toContain('permission');
    });

    it('should create message for NOT_FOUND errors', () => {
      const error = { code: 404, message: 'Resource not found' };
      const message = createErrorMessage(error);
      expect(message.toLowerCase()).toContain('could not be found');
      expect(message).toContain('deleted');
    });

    it('should create message for PLAN_LIMIT errors', () => {
      const error = { code: 400, message: 'Exceeds plan limit' };
      const message = createErrorMessage(error);
      expect(message).toContain('plan limit');
      expect(message).toContain('support');
    });

    it('should create message for NETWORK errors', () => {
      const error = { code: 500, message: 'Timeout' };
      const message = createErrorMessage(error);
      expect(message).toContain('Network');
      expect(message).toContain('connection');
    });

    it('should create message for ROLLBACK errors', () => {
      const error = { code: 500, message: 'Rollback failed' };
      const message = createErrorMessage(error);
      expect(message.toLowerCase()).toContain('rolled back');
      expect(message).toContain('support immediately');
    });

    it('should create message for UNKNOWN errors', () => {
      const error = { code: 418, message: 'Strange error' };
      const message = createErrorMessage(error);
      expect(message).toBe('Strange error');
    });

    it('should create default message for UNKNOWN errors without message', () => {
      const error = { code: 418 };
      const message = createErrorMessage(error);
      expect(message).toContain('unexpected error');
    });
  });

  describe('handleTransactionError', () => {
    let mockRes: Partial<NextApiResponse>;
    let statusMock: ReturnType<typeof vi.fn>;
    let jsonMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      jsonMock = vi.fn();
      statusMock = vi.fn().mockReturnValue({ json: jsonMock });
      mockRes = {
        status: statusMock
      } as any;
    });

    it('should handle CONFLICT errors with 409 status', () => {
      const error = { code: 409, message: 'Conflict occurred' };
      handleTransactionError(error, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Transaction conflict',
          retryable: true,
          type: TransactionErrorType.CONFLICT
        })
      );
    });

    it('should handle VALIDATION errors with 400 status', () => {
      const error = { code: 400, message: 'Invalid data' };
      handleTransactionError(error, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation error',
          retryable: false,
          type: TransactionErrorType.VALIDATION
        })
      );
    });

    it('should handle PLAN_LIMIT errors with 400 status', () => {
      const error = { code: 400, message: 'Exceeds plan limit' };
      handleTransactionError(error, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Plan limit exceeded',
          retryable: false,
          type: TransactionErrorType.PLAN_LIMIT
        })
      );
    });

    it('should handle PERMISSION errors with 403 status', () => {
      const error = { code: 403, message: 'Access denied' };
      handleTransactionError(error, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Permission denied',
          retryable: false,
          type: TransactionErrorType.PERMISSION
        })
      );
    });

    it('should handle NOT_FOUND errors with 404 status', () => {
      const error = { code: 404, message: 'Resource not found' };
      handleTransactionError(error, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Resource not found',
          retryable: false,
          type: TransactionErrorType.NOT_FOUND
        })
      );
    });

    it('should handle ROLLBACK errors with 500 status and critical flag', () => {
      const error = { code: 500, message: 'Rollback failed' };
      handleTransactionError(error, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Transaction rollback failed',
          retryable: false,
          type: TransactionErrorType.ROLLBACK,
          details: expect.objectContaining({
            critical: true
          })
        })
      );
    });

    it('should handle NETWORK errors with 500 status', () => {
      const error = { code: 500, message: 'Network timeout' };
      handleTransactionError(error, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Network error',
          retryable: true,
          type: TransactionErrorType.NETWORK
        })
      );
    });

    it('should handle UNKNOWN errors with 500 status', () => {
      const error = { code: 418, message: 'Unknown error' };
      handleTransactionError(error, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal server error',
          retryable: false,
          type: TransactionErrorType.UNKNOWN
        })
      );
    });

    it('should include helpful suggestions in error responses', () => {
      const error = { code: 409, message: 'Conflict' };
      handleTransactionError(error, mockRes as NextApiResponse);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            suggestion: expect.any(String)
          })
        })
      );
    });

    it('should handle errors without message gracefully', () => {
      const error = { code: 400 };
      handleTransactionError(error, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String)
        })
      );
    });

    it('should log errors for debugging', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = { code: 409, message: 'Conflict', stack: 'stack trace' };
      
      handleTransactionError(error, mockRes as NextApiResponse);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Transaction Error]',
        expect.objectContaining({
          message: 'Conflict',
          code: 409
        })
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
