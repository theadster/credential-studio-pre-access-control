import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock ResizeObserver for Radix UI components
// Mock ResizeObserver for Radix UI components
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

(globalThis as typeof globalThis & { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver = ResizeObserverMock;

// Mock environment variables
process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT = 'https://test.appwrite.io/v1';
process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID = 'test-project-id';
process.env.APPWRITE_API_KEY = 'test-api-key';
process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID = 'test-database-id';
process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID = 'test-users-collection';
process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID = 'test-attendees-collection';
process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID = 'test-roles-collection';
process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID = 'test-custom-fields-collection';
process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID = 'test-logs-collection';
process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID = 'test-event-settings-collection';
process.env.NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_TABLE_ID = 'test-log-settings-collection';
process.env.NEXT_PUBLIC_APPWRITE_CLOUDINARY_TABLE_ID = 'test-cloudinary-collection';
process.env.NEXT_PUBLIC_APPWRITE_SWITCHBOARD_TABLE_ID = 'test-switchboard-collection';
process.env.NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_TABLE_ID = 'test-onesimpleapi-collection';
process.env.NEXT_PUBLIC_APPWRITE_REPORTS_TABLE_ID = 'test-reports-collection';
