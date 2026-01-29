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
process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID = 'test-users-collection';
process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID = 'test-attendees-collection';
process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID = 'test-roles-collection';
process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID = 'test-custom-fields-collection';
process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID = 'test-logs-collection';
process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID = 'test-event-settings-collection';
process.env.NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_COLLECTION_ID = 'test-log-settings-collection';
process.env.NEXT_PUBLIC_APPWRITE_CLOUDINARY_COLLECTION_ID = 'test-cloudinary-collection';
process.env.NEXT_PUBLIC_APPWRITE_SWITCHBOARD_COLLECTION_ID = 'test-switchboard-collection';
process.env.NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_COLLECTION_ID = 'test-onesimpleapi-collection';
process.env.NEXT_PUBLIC_APPWRITE_REPORTS_COLLECTION_ID = 'test-reports-collection';
