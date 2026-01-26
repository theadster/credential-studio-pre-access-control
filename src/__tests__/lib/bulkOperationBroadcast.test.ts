/**
 * Tests for Bulk Operation Broadcast Service
 * 
 * Validates: Requirements 5.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BulkOperationBroadcastService,
  createBulkOperationBroadcast,
  generateOperationId,
  BulkOperationMessage,
  BulkOperationType,
} from '@/lib/bulkOperationBroadcast';

describe('BulkOperationBroadcast', () => {
  let broadcast: BulkOperationBroadcastService;
  let mockBroadcastChannel: any;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Mock BroadcastChannel
    mockBroadcastChannel = {
      postMessage: vi.fn(),
      close: vi.fn(),
      onmessage: null as ((event: MessageEvent) => void) | null,
    };

    global.BroadcastChannel = vi.fn(() => mockBroadcastChannel) as any;

    broadcast = createBulkOperationBroadcast();
  });

  afterEach(() => {
    broadcast.cleanup();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should create BroadcastChannel with correct name', () => {
      broadcast.initialize();
      expect(global.BroadcastChannel).toHaveBeenCalledWith('bulk-operations');
    });

    it('should use custom channel name when provided', () => {
      const customBroadcast = createBulkOperationBroadcast({
        channelName: 'custom-bulk-ops',
      });
      customBroadcast.initialize();

      expect(global.BroadcastChannel).toHaveBeenCalledWith('custom-bulk-ops');

      customBroadcast.cleanup();
    });

    it('should generate unique source ID', () => {
      const broadcast1 = createBulkOperationBroadcast();
      const broadcast2 = createBulkOperationBroadcast();

      expect(broadcast1.getSourceId()).not.toBe(broadcast2.getSourceId());

      broadcast1.cleanup();
      broadcast2.cleanup();
    });

    it('should fallback to localStorage if BroadcastChannel unavailable', () => {
      // Remove BroadcastChannel
      (global as any).BroadcastChannel = undefined;

      const storageListeners: any[] = [];
      const mockAddEventListener = vi.fn((event, handler) => {
        if (event === 'storage') {
          storageListeners.push(handler);
        }
      });
      const mockRemoveEventListener = vi.fn();

      global.window = {
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      } as any;

      const fallbackBroadcast = createBulkOperationBroadcast();
      fallbackBroadcast.initialize();

      expect(mockAddEventListener).toHaveBeenCalledWith('storage', expect.any(Function));

      fallbackBroadcast.cleanup();

      // Restore BroadcastChannel
      global.BroadcastChannel = vi.fn(() => mockBroadcastChannel) as any;
    });
  });

  describe('broadcastStart', () => {
    it('should broadcast start message with correct structure', () => {
      broadcast.initialize();
      
      broadcast.broadcastStart('credential_generation', 'op-123', 100);

      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'bulk-operation',
          operationType: 'credential_generation',
          status: 'started',
          operationId: 'op-123',
          details: expect.objectContaining({
            totalCount: 100,
            progress: 0,
          }),
        })
      );
    });

    it('should include source ID in message', () => {
      broadcast.initialize();
      
      broadcast.broadcastStart('bulk_edit', 'op-456', 50);

      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: broadcast.getSourceId(),
        })
      );
    });
  });

  describe('broadcastProgress', () => {
    it('should broadcast progress with correct percentage', () => {
      broadcast.initialize();
      
      broadcast.broadcastProgress('credential_generation', 'op-123', 50, 100);

      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'bulk-operation',
          status: 'progress',
          details: expect.objectContaining({
            totalCount: 100,
            successCount: 50,
            progress: 50,
          }),
        })
      );
    });

    it('should handle zero total count', () => {
      broadcast.initialize();
      
      broadcast.broadcastProgress('bulk_delete', 'op-789', 0, 0);

      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            progress: 0,
          }),
        })
      );
    });
  });

  describe('broadcastComplete', () => {
    it('should broadcast completion with all details', () => {
      broadcast.initialize();
      
      broadcast.broadcastComplete('credential_generation', 'op-123', {
        totalCount: 100,
        successCount: 95,
        failureCount: 5,
        conflictCount: 2,
        affectedIds: ['id1', 'id2', 'id3'],
      });

      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'bulk-operation',
          status: 'completed',
          operationId: 'op-123',
          details: expect.objectContaining({
            totalCount: 100,
            successCount: 95,
            failureCount: 5,
            conflictCount: 2,
            affectedIds: ['id1', 'id2', 'id3'],
            progress: 100,
          }),
        })
      );
    });

    it('should limit affected IDs to maxAffectedIds', () => {
      const limitedBroadcast = createBulkOperationBroadcast({
        maxAffectedIds: 2,
      });
      limitedBroadcast.initialize();

      limitedBroadcast.broadcastComplete('bulk_edit', 'op-456', {
        totalCount: 10,
        successCount: 10,
        failureCount: 0,
        affectedIds: ['id1', 'id2', 'id3', 'id4', 'id5'],
      });

      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            affectedIds: ['id1', 'id2'],
          }),
        })
      );

      limitedBroadcast.cleanup();
    });

    it('should exclude affected IDs when includeAffectedIds is false', () => {
      const noIdsBroadcast = createBulkOperationBroadcast({
        includeAffectedIds: false,
      });
      noIdsBroadcast.initialize();

      noIdsBroadcast.broadcastComplete('bulk_delete', 'op-789', {
        totalCount: 5,
        successCount: 5,
        failureCount: 0,
        affectedIds: ['id1', 'id2'],
      });

      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            affectedIds: undefined,
          }),
        })
      );

      noIdsBroadcast.cleanup();
    });
  });

  describe('broadcastFailure', () => {
    it('should broadcast failure with error message', () => {
      broadcast.initialize();
      
      broadcast.broadcastFailure(
        'credential_generation',
        'op-123',
        'Network error occurred'
      );

      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'bulk-operation',
          status: 'failed',
          operationId: 'op-123',
          details: expect.objectContaining({
            errorMessage: 'Network error occurred',
          }),
        })
      );
    });

    it('should include partial details when provided', () => {
      broadcast.initialize();
      
      broadcast.broadcastFailure(
        'bulk_import',
        'op-456',
        'Import failed at row 50',
        {
          totalCount: 100,
          successCount: 49,
          failureCount: 51,
        }
      );

      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            totalCount: 100,
            successCount: 49,
            failureCount: 51,
            errorMessage: 'Import failed at row 50',
          }),
        })
      );
    });
  });

  describe('subscribe', () => {
    it('should call callback when message is received', () => {
      broadcast.initialize();
      const callback = vi.fn();
      
      broadcast.subscribe(callback);

      // Simulate receiving a message
      const message: BulkOperationMessage = {
        type: 'bulk-operation',
        operationType: 'credential_generation',
        status: 'completed',
        operationId: 'op-123',
        sourceId: 'other-session',
        timestamp: new Date().toISOString(),
        details: {
          totalCount: 100,
          successCount: 100,
          failureCount: 0,
        },
      };

      if (mockBroadcastChannel.onmessage) {
        mockBroadcastChannel.onmessage({ data: message } as MessageEvent);
      }

      expect(callback).toHaveBeenCalledWith(message);
    });

    it('should return unsubscribe function', () => {
      broadcast.initialize();
      const callback = vi.fn();
      
      const unsubscribe = broadcast.subscribe(callback);
      unsubscribe();

      // Simulate receiving a message
      const message: BulkOperationMessage = {
        type: 'bulk-operation',
        operationType: 'bulk_edit',
        status: 'completed',
        operationId: 'op-456',
        sourceId: 'other-session',
        timestamp: new Date().toISOString(),
        details: {},
      };

      if (mockBroadcastChannel.onmessage) {
        mockBroadcastChannel.onmessage({ data: message } as MessageEvent);
      }

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple subscribers', () => {
      broadcast.initialize();
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      broadcast.subscribe(callback1);
      broadcast.subscribe(callback2);

      const message: BulkOperationMessage = {
        type: 'bulk-operation',
        operationType: 'bulk_delete',
        status: 'started',
        operationId: 'op-789',
        sourceId: 'other-session',
        timestamp: new Date().toISOString(),
        details: { totalCount: 10 },
      };

      if (mockBroadcastChannel.onmessage) {
        mockBroadcastChannel.onmessage({ data: message } as MessageEvent);
      }

      expect(callback1).toHaveBeenCalledWith(message);
      expect(callback2).toHaveBeenCalledWith(message);
    });
  });

  describe('isOwnMessage', () => {
    it('should return true for own messages', () => {
      const message: BulkOperationMessage = {
        type: 'bulk-operation',
        operationType: 'credential_generation',
        status: 'completed',
        operationId: 'op-123',
        sourceId: broadcast.getSourceId(),
        timestamp: new Date().toISOString(),
        details: {},
      };

      expect(broadcast.isOwnMessage(message)).toBe(true);
    });

    it('should return false for other messages', () => {
      const message: BulkOperationMessage = {
        type: 'bulk-operation',
        operationType: 'credential_generation',
        status: 'completed',
        operationId: 'op-123',
        sourceId: 'other-session-id',
        timestamp: new Date().toISOString(),
        details: {},
      };

      expect(broadcast.isOwnMessage(message)).toBe(false);
    });
  });

  describe('generateOperationId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateOperationId();
      const id2 = generateOperationId();

      expect(id1).not.toBe(id2);
    });

    it('should start with "op-" prefix', () => {
      const id = generateOperationId();

      expect(id).toMatch(/^op-/);
    });
  });

  describe('cleanup', () => {
    it('should close BroadcastChannel', () => {
      broadcast.initialize();
      broadcast.cleanup();

      expect(mockBroadcastChannel.close).toHaveBeenCalled();
    });

    it('should clear all callbacks', () => {
      broadcast.initialize();
      const callback = vi.fn();
      broadcast.subscribe(callback);
      
      broadcast.cleanup();

      // Re-initialize and send message
      broadcast.initialize();
      const message: BulkOperationMessage = {
        type: 'bulk-operation',
        operationType: 'bulk_edit',
        status: 'completed',
        operationId: 'op-123',
        sourceId: 'other-session',
        timestamp: new Date().toISOString(),
        details: {},
      };

      if (mockBroadcastChannel.onmessage) {
        mockBroadcastChannel.onmessage({ data: message } as MessageEvent);
      }

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Operation Types', () => {
    const operationTypes: BulkOperationType[] = [
      'credential_generation',
      'bulk_edit',
      'bulk_delete',
      'bulk_import',
      'bulk_clear_credentials',
    ];

    it.each(operationTypes)('should support %s operation type', (opType) => {
      broadcast.initialize();
      
      broadcast.broadcastStart(opType, 'op-test', 10);

      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: opType,
        })
      );
    });
  });
});
