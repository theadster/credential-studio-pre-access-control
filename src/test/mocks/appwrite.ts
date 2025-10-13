import { vi } from 'vitest';

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
 * Mock Appwrite Databases
 */
export const mockDatabases = {
  listDocuments: vi.fn(),
  getDocument: vi.fn(),
  createDocument: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
  listCollections: vi.fn(),
  getCollection: vi.fn(),
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
  Object.values(mockDatabases).forEach(mock => {
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
};

/**
 * Mock Appwrite module
 */
vi.mock('appwrite', () => ({
  Client: vi.fn(() => createMockClient()),
  Account: vi.fn(() => mockAccount),
  Databases: vi.fn(() => mockDatabases),
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
    equal: vi.fn((field, value) => `equal("${field}", ${JSON.stringify(value)})`),
    notEqual: vi.fn((field, value) => `notEqual("${field}", ${JSON.stringify(value)})`),
    lessThan: vi.fn((field, value) => `lessThan("${field}", ${JSON.stringify(value)})`),
    lessThanEqual: vi.fn((field, value) => `lessThanEqual("${field}", ${JSON.stringify(value)})`),
    greaterThan: vi.fn((field, value) => `greaterThan("${field}", ${JSON.stringify(value)})`),
    greaterThanEqual: vi.fn((field, value) => `greaterThanEqual("${field}", ${JSON.stringify(value)})`),
    search: vi.fn((field, value) => `search("${field}", "${value}")`),
    isNull: vi.fn((field) => `isNull("${field}")`),
    isNotNull: vi.fn((field) => `isNotNull("${field}")`),
    between: vi.fn((field, start, end) => `between("${field}", ${JSON.stringify(start)}, ${JSON.stringify(end)})`),
    startsWith: vi.fn((field, value) => `startsWith("${field}", "${value}")`),
    endsWith: vi.fn((field, value) => `endsWith("${field}", "${value}")`),
    orderAsc: vi.fn((field) => `orderAsc("${field}")`),
    orderDesc: vi.fn((field) => `orderDesc("${field}")`),
    limit: vi.fn((value) => `limit(${value})`),
    offset: vi.fn((value) => `offset(${value})`),
  },
  ID: {
    unique: vi.fn(() => 'unique-id-' + Math.random().toString(36).substring(2, 11)),
  },
  Permission: {
    read: vi.fn((role) => `read("${role}")`),
    write: vi.fn((role) => `write("${role}")`),
    create: vi.fn((role) => `create("${role}")`),
    update: vi.fn((role) => `update("${role}")`),
    delete: vi.fn((role) => `delete("${role}")`),
  },
  Role: {
    any: vi.fn(() => 'any'),
    user: vi.fn((id) => `user:${id}`),
    users: vi.fn(() => 'users'),
    guests: vi.fn(() => 'guests'),
    team: vi.fn((id, role) => `team:${id}/${role || ''}`),
  },
}));
