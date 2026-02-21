/**
 * Integration tests for real-time functionality in the dashboard
 * Tests real-time attendee and log updates
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import type { RealtimeResponseEvent } from 'appwrite';
import { vi } from 'vitest';
import { createBrowserClient } from '@/lib/appwrite';

// Mock the Appwrite client
vi.mock('@/lib/appwrite', () => ({
  createBrowserClient: vi.fn(),
  createAdminClient: vi.fn(() => ({
    tablesDB: { listRows: vi.fn(), getRow: vi.fn(), createRow: vi.fn(), updateRow: vi.fn(), deleteRow: vi.fn() },
  })),
}));

describe('Dashboard Real-time Integration', () => {
  let mockClient: any;
  let mockUnsubscribe: any;
  let mockSubscribe: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUnsubscribe = vi.fn();
    mockSubscribe = vi.fn(() => mockUnsubscribe);
    
    mockClient = {
      subscribe: mockSubscribe,
    };

    vi.mocked(createBrowserClient).mockReturnValue({
      client: mockClient,
      account: {} as any,
      databases: {} as any,
      storage: {} as any,
    });

    // Mock environment variables
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID = 'test-db';
    process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID = 'attendees';
    process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID = 'logs';
    process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID = 'users';
    process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID = 'roles';
    process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID = 'event-settings';
    process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID = 'custom-fields';
  });

  describe('Attendee Real-time Updates', () => {
    it('should receive real-time updates when attendee is created', async () => {
      const callback = vi.fn();
      const channels = [
        `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID}.rows`,
      ];

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalledWith(channels, expect.any(Function));
      });

      const subscribedCallback = mockSubscribe.mock.calls[0][1];
      
      const createEvent: Partial<RealtimeResponseEvent<any>> = {
        events: [
          `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID}.rows.123.create`,
        ],
        payload: {
          $id: '123',
          firstName: 'John',
          lastName: 'Doe',
          barcodeNumber: 'EVT001',
          photoUrl: null,
          customFieldValues: '{}',
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString(),
        },
      };

      subscribedCallback(createEvent);

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith(createEvent);
      });
    });

    it('should receive real-time updates when attendee is updated', async () => {
      const callback = vi.fn();
      const channels = [
        `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID}.rows`,
      ];

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      const subscribedCallback = mockSubscribe.mock.calls[0][1];
      
      const updateEvent: Partial<RealtimeResponseEvent<any>> = {
        events: [
          `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID}.rows.123.update`,
        ],
        payload: {
          $id: '123',
          firstName: 'Jane',
          lastName: 'Doe',
          barcodeNumber: 'EVT001',
          photoUrl: 'https://example.com/photo.jpg',
          customFieldValues: '{"company":"Acme Inc"}',
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString(),
        },
      };

      subscribedCallback(updateEvent);

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith(updateEvent);
      });
    });

    it('should receive real-time updates when attendee is deleted', async () => {
      const callback = vi.fn();
      const channels = [
        `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID}.rows`,
      ];

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      const subscribedCallback = mockSubscribe.mock.calls[0][1];
      
      const deleteEvent: Partial<RealtimeResponseEvent<any>> = {
        events: [
          `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID}.rows.123.delete`,
        ],
        payload: {
          $id: '123',
        },
      };

      subscribedCallback(deleteEvent);

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith(deleteEvent);
      });
    });

    it('should handle multiple attendee updates in sequence', async () => {
      const callback = vi.fn();
      const channels = [
        `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID}.rows`,
      ];

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      const subscribedCallback = mockSubscribe.mock.calls[0][1];

      // Create first attendee
      subscribedCallback({
        events: [
          `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID}.rows.1.create`,
        ],
        payload: { $id: '1', firstName: 'John', lastName: 'Doe' },
      });

      // Create second attendee
      subscribedCallback({
        events: [
          `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID}.rows.2.create`,
        ],
        payload: { $id: '2', firstName: 'Jane', lastName: 'Smith' },
      });

      // Update first attendee
      subscribedCallback({
        events: [
          `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID}.rows.1.update`,
        ],
        payload: { $id: '1', firstName: 'John', lastName: 'Updated' },
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Log Real-time Updates', () => {
    it('should receive real-time updates when log is created', async () => {
      const callback = vi.fn();
      const channels = [
        `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID}.rows`,
      ];

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalledWith(channels, expect.any(Function));
      });

      const subscribedCallback = mockSubscribe.mock.calls[0][1];
      
      const logEvent: Partial<RealtimeResponseEvent<any>> = {
        events: [
          `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID}.rows.log1.create`,
        ],
        payload: {
          $id: 'log1',
          userId: 'user123',
          action: 'attendee_created',
          details: '{"attendeeId":"123","name":"John Doe"}',
          attendeeId: '123',
          $createdAt: new Date().toISOString(),
        },
      };

      subscribedCallback(logEvent);

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith(logEvent);
      });
    });

    it('should handle rapid log creation events', async () => {
      const callback = vi.fn();
      const channels = [
        `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID}.rows`,
      ];

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      const subscribedCallback = mockSubscribe.mock.calls[0][1];

      // Simulate rapid log creation
      for (let i = 1; i <= 5; i++) {
        subscribedCallback({
          events: [
            `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID}.rows.log${i}.create`,
          ],
          payload: {
            $id: `log${i}`,
            userId: 'user123',
            action: `action_${i}`,
            details: '{}',
            $createdAt: new Date().toISOString(),
          },
        });
      }

      await waitFor(() => {
        expect(callback).toHaveBeenCalledTimes(5);
      });
    });
  });

  describe('Multiple Collection Subscriptions', () => {
    it('should subscribe to multiple collections simultaneously', async () => {
      const callback = vi.fn();
      const channels = [
        `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID}.rows`,
        `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID}.rows`,
      ];

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalledWith(channels, expect.any(Function));
      });
    });

    it('should handle events from different collections', async () => {
      const callback = vi.fn();
      const channels = [
        `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID}.rows`,
        `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID}.rows`,
      ];

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      const subscribedCallback = mockSubscribe.mock.calls[0][1];

      // Attendee event
      subscribedCallback({
        events: [
          `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID}.rows.123.create`,
        ],
        payload: { $id: '123', firstName: 'John' },
      });

      // Log event
      subscribedCallback({
        events: [
          `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID}.rows.log1.create`,
        ],
        payload: { $id: 'log1', action: 'attendee_created' },
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('User and Role Real-time Updates', () => {
    it('should receive updates when user is created', async () => {
      const callback = vi.fn();
      const channels = [
        `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID}.rows`,
      ];

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      const subscribedCallback = mockSubscribe.mock.calls[0][1];
      
      subscribedCallback({
        events: [
          `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID}.rows.user1.create`,
        ],
        payload: {
          $id: 'user1',
          userId: 'auth123',
          email: 'test@example.com',
          name: 'Test User',
          roleId: 'role1',
        },
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalled();
      });
    });

    it('should receive updates when role is modified', async () => {
      const callback = vi.fn();
      const channels = [
        `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID}.rows`,
      ];

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      const subscribedCallback = mockSubscribe.mock.calls[0][1];
      
      subscribedCallback({
        events: [
          `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID}.rows.role1.update`,
        ],
        payload: {
          $id: 'role1',
          name: 'Updated Role',
          permissions: '{"attendees":{"read":true,"write":true}}',
        },
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalled();
      });
    });
  });

  describe('Event Settings and Custom Fields Real-time Updates', () => {
    it('should receive updates when event settings change', async () => {
      const callback = vi.fn();
      const channels = [
        `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID}.rows`,
      ];

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      const subscribedCallback = mockSubscribe.mock.calls[0][1];
      
      subscribedCallback({
        events: [
          `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID}.rows.settings1.update`,
        ],
        payload: {
          $id: 'settings1',
          eventName: 'Updated Event',
          eventDate: '2024-12-31',
        },
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalled();
      });
    });

    it('should receive updates when custom field is added', async () => {
      const callback = vi.fn();
      const channels = [
        `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID}.rows`,
      ];

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      const subscribedCallback = mockSubscribe.mock.calls[0][1];
      
      subscribedCallback({
        events: [
          `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID}.rows.field1.create`,
        ],
        payload: {
          $id: 'field1',
          fieldName: 'Company',
          fieldType: 'text',
          required: true,
          order: 1,
        },
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalled();
      });
    });
  });

  describe('Connection Resilience', () => {
    it('should handle subscription errors gracefully', async () => {
      const callback = vi.fn();
      const onError = vi.fn();
      const channels = [
        `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID}.rows`,
      ];

      mockSubscribe.mockImplementationOnce(() => {
        throw new Error('Network error');
      });

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
          onError,
        })
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    it('should continue processing events after callback error', async () => {
      const callback = vi.fn()
        .mockImplementationOnce(() => {
          throw new Error('Callback error');
        })
        .mockImplementationOnce(() => {
          // Second call succeeds
        });
      
      const onError = vi.fn();
      const channels = [
        `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID}.rows`,
      ];

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
          onError,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      const subscribedCallback = mockSubscribe.mock.calls[0][1];

      // First event causes error
      subscribedCallback({
        events: ['databases.test-db.tables.attendees.rows.1.create'],
        payload: { $id: '1' },
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });

      // Second event should still be processed
      subscribedCallback({
        events: ['databases.test-db.tables.attendees.rows.2.create'],
        payload: { $id: '2' },
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledTimes(2);
      });
    });
  });
});
