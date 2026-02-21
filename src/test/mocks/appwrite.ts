import { vi } from 'vitest';
import { userProfileCache } from '@/lib/userProfileCache';

/**
 * Create a mock Appwrite Client instance
 */
export const createMockClient = () => {
  const mock = {
    setEndpoint: vi.fn(),
    setProject: vi.fn(),
    setSession: vi.fn(),
    setKey: vi.fn(),
    subscribe: vi.fn(),
  };
  
  // Make chainable
  mock.setEndpoint.mockReturnValue(mock);
  mock.setProject.mockReturnValue(mock);
  mock.setSession.mockReturnValue(mock);
  mock.setKey.mockReturnValue(mock);
  
  return mock;
};

/**
 * Mock Appwrite Client (for backward compatibility)
 */
export const mockClient = createMockClient();

/**
 * Mock Appwrite Account
 */
export const mockAccount = {
  get: vi.fn(),
  create: vi.fn(),
  createEmailPasswordSession: vi.fn(),
  createJWT: vi.fn(),
  createOAuth2Session: vi.fn(),
  createMagicURLSession: vi.fn(),
  createMagicURLToken: vi.fn(),
  createRecovery: vi.fn(),
  updateRecovery: vi.fn(),
  createVerification: vi.fn(),
  updateVerification: vi.fn(),
  updatePassword: vi.fn(),
  updateEmail: vi.fn(),
  updateName: vi.fn(),
  updatePrefs: vi.fn(),
  deleteSession: vi.fn(),
  deleteSessions: vi.fn(),
  listSessions: vi.fn(),
  getSession: vi.fn(),
};

/**
 * Mock Appwrite Storage
 */
export const mockStorage = {
  createFile: vi.fn(),
  getFile: vi.fn(),
  getFilePreview: vi.fn(),
  getFileView: vi.fn(),
  getFileDownload: vi.fn(),
  updateFile: vi.fn(),
  deleteFile: vi.fn(),
  listFiles: vi.fn(),
};

/**
 * Mock Appwrite Functions
 */
export const mockFunctions = {
  createExecution: vi.fn(),
  getExecution: vi.fn(),
  listExecutions: vi.fn(),
};

/**
 * Mock Appwrite Users (Admin only)
 */
export const mockUsers = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateEmail: vi.fn(),
  updateEmailVerification: vi.fn(),
  updateName: vi.fn(),
  updatePassword: vi.fn(),
  updatePrefs: vi.fn(),
  updateLabels: vi.fn(),
  updateStatus: vi.fn(),
  delete: vi.fn(),
  listSessions: vi.fn(),
  deleteSessions: vi.fn(),
  deleteSession: vi.fn(),
  createRecovery: vi.fn(),
  createVerification: vi.fn(),
  createEmailToken: vi.fn(),
};

/**
 * Mock Appwrite Teams (Admin only)
 */
export const mockTeams = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  updateName: vi.fn(),
  delete: vi.fn(),
  listMemberships: vi.fn(),
  createMembership: vi.fn(),
  getMembership: vi.fn(),
  updateMembership: vi.fn(),
  deleteMembership: vi.fn(),
  updateMembershipStatus: vi.fn(),
  getPrefs: vi.fn(),
  updatePrefs: vi.fn(),
};

/**
 * Mock Appwrite TablesDB for admin client (separate instance to avoid mock ordering conflicts)
 * Used by createAdminClient() mock - primarily for role fetching in middleware
 */
export const mockAdminTablesDB = {
  // Row CRUD methods
  listRows: vi.fn(),
  getRow: vi.fn(),
  createRow: vi.fn(),
  updateRow: vi.fn(),
  deleteRow: vi.fn(),
  upsertRow: vi.fn(),
  // Bulk operations
  createRows: vi.fn(),
  updateRows: vi.fn(),
  deleteRows: vi.fn(),
  upsertRows: vi.fn(),
  // Transaction methods
  createTransaction: vi.fn(),
  createOperations: vi.fn(),
  updateTransaction: vi.fn(),
  getTransaction: vi.fn(),
  listTransactions: vi.fn(),
  // Table management
  listTables: vi.fn(),
  getTable: vi.fn(),
};

/**
 * Mock Appwrite TablesDB (row CRUD, bulk, transactions, table management)
 */
export const mockTablesDB = {
  // Row CRUD methods
  listRows: vi.fn(),
  getRow: vi.fn(),
  createRow: vi.fn(),
  updateRow: vi.fn(),
  deleteRow: vi.fn(),
  upsertRow: vi.fn(),
  // Bulk operations
  createRows: vi.fn(),
  updateRows: vi.fn(),
  deleteRows: vi.fn(),
  upsertRows: vi.fn(),
  // Transaction methods
  createTransaction: vi.fn(),
  createOperations: vi.fn(),
  updateTransaction: vi.fn(),
  getTransaction: vi.fn(),
  listTransactions: vi.fn(),
  // Table management
  listTables: vi.fn(),
  getTable: vi.fn(),
};

/**
 * Reset all mocks
 */
export const resetAllMocks = () => {
  Object.values(mockClient).forEach(mock => {
    if (typeof mock === 'function' && 'mockClear' in mock) {
      mock.mockClear();
    }
  });
  Object.values(mockAccount).forEach(mock => {
    if (typeof mock === 'function' && 'mockClear' in mock) {
      mock.mockClear();
    }
  });
  Object.values(mockStorage).forEach(mock => {
    if (typeof mock === 'function' && 'mockClear' in mock) {
      mock.mockClear();
    }
  });
  Object.values(mockFunctions).forEach(mock => {
    if (typeof mock === 'function' && 'mockClear' in mock) {
      mock.mockClear();
    }
  });
  Object.values(mockUsers).forEach(mock => {
    if (typeof mock === 'function' && 'mockClear' in mock) {
      mock.mockClear();
    }
  });
  Object.values(mockTeams).forEach(mock => {
    if (typeof mock === 'function' && 'mockClear' in mock) {
      mock.mockClear();
    }
  });
  Object.values(mockTablesDB).forEach(mock => {
    if (typeof mock === 'function' && 'mockClear' in mock) {
      mock.mockClear();
    }
  });
  Object.values(mockAdminTablesDB).forEach(mock => {
    if (typeof mock === 'function' && 'mockClear' in mock) {
      mock.mockClear();
    }
  });
  // Clear user profile cache to prevent cross-test contamination
  userProfileCache.clear();
};

/**
 * Mock Appwrite module
 */
vi.mock('appwrite', () => ({
  Client: vi.fn(() => createMockClient()),
  Account: vi.fn(() => mockAccount),
  TablesDB: vi.fn(() => mockTablesDB),
  Storage: vi.fn(() => mockStorage),
  Functions: vi.fn(() => mockFunctions),
  Users: vi.fn(() => mockUsers),
  OAuthProvider: {
    Google: 'google',
    Facebook: 'facebook',
    Github: 'github',
    Apple: 'apple',
  },
  Query: {
    equal: vi.fn((field, value) => {
      const serialized = value === undefined ? 'null' : JSON.stringify(value);
      return `equal("${field}", ${serialized})`;
    }),
    notEqual: vi.fn((field, value) => {
      const serialized = value === undefined ? 'null' : JSON.stringify(value);
      return `notEqual("${field}", ${serialized})`;
    }),
    lessThan: vi.fn((field, value) => {
      const serialized = value === undefined ? 'null' : JSON.stringify(value);
      return `lessThan("${field}", ${serialized})`;
    }),
    lessThanEqual: vi.fn((field, value) => {
      const serialized = value === undefined ? 'null' : JSON.stringify(value);
      return `lessThanEqual("${field}", ${serialized})`;
    }),
    greaterThan: vi.fn((field, value) => {
      const serialized = value === undefined ? 'null' : JSON.stringify(value);
      return `greaterThan("${field}", ${serialized})`;
    }),
    greaterThanEqual: vi.fn((field, value) => {
      const serialized = value === undefined ? 'null' : JSON.stringify(value);
      return `greaterThanEqual("${field}", ${serialized})`;
    }),
    search: vi.fn((field, value) => `search("${field}", "${String(value).replace(/"/g, '\\"')}")`),
    isNull: vi.fn((field) => `isNull("${field}")`),
    isNotNull: vi.fn((field) => `isNotNull("${field}")`),
    between: vi.fn((field, start, end) => {
      const startSerialized = start === undefined ? 'null' : JSON.stringify(start);
      const endSerialized = end === undefined ? 'null' : JSON.stringify(end);
      return `between("${field}", ${startSerialized}, ${endSerialized})`;
    }),
    startsWith: vi.fn((field, value) => `startsWith("${field}", "${String(value).replace(/"/g, '\\"')}")`),
    endsWith: vi.fn((field, value) => `endsWith("${field}", "${String(value).replace(/"/g, '\\"')}")`),
    orderAsc: vi.fn((field) => `orderAsc("${field}")`),
    orderDesc: vi.fn((field) => `orderDesc("${field}")`),
    limit: vi.fn((value) => `limit(${value})`),
    offset: vi.fn((value) => `offset(${value})`),
  },
  ID: {
    unique: vi.fn(() => 'unique-id-' + Math.random().toString(36).substring(2, 11)),
  },
  Permission: {
    read: vi.fn((role) => `read("${String(role).replace(/"/g, '\\"')}")`),
    write: vi.fn((role) => `write("${String(role).replace(/"/g, '\\"')}")`),
    create: vi.fn((role) => `create("${String(role).replace(/"/g, '\\"')}")`),
    update: vi.fn((role) => `update("${String(role).replace(/"/g, '\\"')}")`),
    delete: vi.fn((role) => `delete("${String(role).replace(/"/g, '\\"')}")`),
  },
  Role: {
    any: vi.fn(() => 'any'),
    user: vi.fn((id) => `user:${id}`),
    users: vi.fn(() => 'users'),
    guests: vi.fn(() => 'guests'),
    team: vi.fn((id, role) => `team:${id}/${role || ''}`),
  },
}));
