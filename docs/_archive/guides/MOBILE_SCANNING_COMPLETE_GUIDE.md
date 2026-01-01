# Mobile Scanning Component - Complete Technical & Functional Guide

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [API Documentation](#api-documentation)
5. [Integration Guide](#integration-guide)
6. [Data Flow](#data-flow)
7. [Testing & Troubleshooting](#testing--troubleshooting)
8. [AI Prompt for Mobile App Generation](#ai-prompt-for-mobile-app-generation)
9. [User Experience (Consumer Perspective)](#user-experience-consumer-perspective)
10. [Technical Process (System Perspective)](#technical-process-system-perspective)

---

## Overview

The Mobile Scanning Component is an offline-first badge scanning system that enables event staff to verify attendee credentials using mobile devices. The system integrates with credential.studio's web platform and supports:

- **Real-time barcode scanning** using device cameras
- **Offline operation** with local data caching
- **Flexible rule-based access control** via configurable approval profiles
- **Automatic synchronization** when connectivity is available
- **Comprehensive audit logging** of all scan attempts

### Key Features

| Feature | Description |
|---------|-------------|
| Offline-First | Full functionality without network connectivity |
| Rule Engine | Configurable approval profiles with AND/OR logic |
| Validity Windows | Time-based badge validity (validFrom/validUntil) |
| Access Toggle | Instant enable/disable per attendee |
| Audit Trail | Complete scan history with device/operator tracking |
| Delta Sync | Efficient incremental data synchronization |

---

## Technology Stack

### Backend Technologies

| Technology | Role | Version |
|------------|------|---------|
| **Next.js** | API Routes & Web Application | 16.0.3 |
| **Appwrite** | Authentication, Database, Realtime | Cloud |
| **TypeScript** | Type-safe development | 5.9.3 |
| **Zod** | Runtime validation schemas | Latest |

### Mobile Technologies (Recommended)

| Technology | Role | Notes |
|------------|------|-------|
| **React Native** | Cross-platform mobile framework | Via Expo |
| **Expo** | Development toolchain | Managed workflow |
| **Expo Camera** | Barcode scanning | expo-camera package |
| **SQLite** | Local data storage | expo-sqlite |
| **AsyncStorage** | Key-value storage | @react-native-async-storage |
| **Appwrite SDK** | Authentication | react-native-appwrite |

### Database Collections

| Collection | Purpose |
|------------|---------|
| `attendees` | Core attendee records |
| `access_control` | Per-attendee access settings |
| `approval_profiles` | Rule-based access profiles |
| `scan_logs` | Audit trail of all scans |
| `custom_fields` | Event-specific field definitions |

---

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CREDENTIAL.STUDIO PLATFORM                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────┐         ┌──────────────────────────────────┐  │
│  │   Web Application    │         │        Appwrite Backend          │  │
│  │     (Next.js)        │         │                                  │  │
│  │                      │         │  ┌────────────┐ ┌─────────────┐  │  │
│  │  ┌────────────────┐  │         │  │   Auth     │ │  Database   │  │  │
│  │  │ Admin UI       │  │◄───────►│  │  Service   │ │  Service    │  │  │
│  │  │ - Profiles     │  │         │  └────────────┘ └─────────────┘  │  │
│  │  │ - Access Ctrl  │  │         │                                  │  │
│  │  │ - Scan Logs    │  │         │  ┌────────────┐ ┌─────────────┐  │  │
│  │  └────────────────┘  │         │  │  Realtime  │ │   Storage   │  │  │
│  │                      │         │  │  Service   │ │   Service   │  │  │
│  │  ┌────────────────┐  │         │  └────────────┘ └─────────────┘  │  │
│  │  │ API Routes     │  │         │                                  │  │
│  │  │ /api/mobile/*  │  │         └──────────────────────────────────┘  │
│  │  └────────────────┘  │                                               │
│  └──────────────────────┘                                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS/REST
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         MOBILE APPLICATION                               │
│                      (React Native / Expo)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │   Scanner    │  │    Sync      │  │    Rule      │  │   Local     │  │
│  │    Screen    │  │   Service    │  │   Engine     │  │   Storage   │  │
│  │              │  │              │  │              │  │             │  │
│  │  - Camera    │  │  - Full Sync │  │  - Evaluate  │  │  - SQLite   │  │
│  │  - Barcode   │  │  - Delta     │  │  - AND/OR    │  │  - Photos   │  │
│  │  - Profile   │  │  - Photos    │  │  - Operators │  │  - Logs     │  │
│  │    Selector  │  │  - Logs      │  │              │  │             │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Scan Evaluation Flow

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Scan      │────►│  Find Attendee  │────►│  Check Access   │
│  Barcode    │     │   by Barcode    │     │    Enabled      │
└─────────────┘     └─────────────────┘     └─────────────────┘
                            │                        │
                            │ Not Found              │ Disabled
                            ▼                        ▼
                    ┌───────────────┐        ┌───────────────┐
                    │ DENY: Badge   │        │ DENY: Access  │
                    │  not found    │        │   disabled    │
                    └───────────────┘        └───────────────┘
                                                     │
                                                     │ Enabled
                                                     ▼
                                            ┌─────────────────┐
                                            │ Check Validity  │
                                            │    Window       │
                                            └─────────────────┘
                                                     │
                            ┌────────────────────────┼────────────────────────┐
                            │                        │                        │
                            ▼                        ▼                        ▼
                    ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
                    │ DENY: Not yet │        │ DENY: Badge   │        │   Evaluate    │
                    │    valid      │        │   expired     │        │ Profile Rules │
                    └───────────────┘        └───────────────┘        └───────────────┘
                                                                              │
                                                            ┌─────────────────┴─────────────────┐
                                                            │                                   │
                                                            ▼                                   ▼
                                                    ┌───────────────┐                   ┌───────────────┐
                                                    │   APPROVE     │                   │ DENY: Rules   │
                                                    │               │                   │   not met     │
                                                    └───────────────┘                   └───────────────┘
```

---

## API Documentation

### Authentication

All API endpoints require authentication via Appwrite session tokens.

#### Appwrite Configuration

```typescript
// Configuration (same Appwrite project as web app)
const APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

// Initialize Appwrite Client (React Native)
import { Client, Account } from 'react-native-appwrite';

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

const account = new Account(client);

// Login
async function login(email: string, password: string) {
  return await account.createEmailPasswordSession(email, password);
}

// Get current session
async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

// Logout
async function logout() {
  await account.deleteSession('current');
}
```

#### Required Permissions

Users must have the following role permissions:
- `attendees.read` - View attendee data
- `accessControl.read` - View access control settings
- `approvalProfiles.read` - View approval profiles
- `scanLogs.write` - Upload scan logs

---

### API Endpoint Reference

#### Base URL
```
https://<your-domain>/api
```

---

### 1. Sync Attendees

Downloads attendee data with access control settings for local caching.

**Endpoint:** `GET /api/mobile/sync/attendees`

**Authentication:** Required (Appwrite session)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `since` | ISO 8601 datetime | No | - | Only return records modified after this timestamp |
| `limit` | number | No | 1000 | Max records per page (max: 5000) |
| `offset` | number | No | 0 | Pagination offset |

**Example Request:**
```bash
# Full sync (first time)
curl -X GET "https://example.com/api/mobile/sync/attendees?limit=1000" \
  -H "Authorization: Bearer <session-token>"

# Delta sync (subsequent)
curl -X GET "https://example.com/api/mobile/sync/attendees?since=2025-01-10T15:00:00.000Z" \
  -H "Authorization: Bearer <session-token>"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "attendees": [
      {
        "id": "att_abc123",
        "firstName": "John",
        "lastName": "Doe",
        "barcodeNumber": "1234567890",
        "photoUrl": "https://res.cloudinary.com/demo/image/upload/photo.jpg",
        "customFieldValues": {
          "credentialType": "VIP",
          "company": "Acme Corp",
          "backstageAccess": true
        },
        "accessControl": {
          "accessEnabled": true,
          "validFrom": "2025-01-15T08:00:00.000Z",
          "validUntil": "2025-01-17T23:59:59.000Z"
        },
        "updatedAt": "2025-01-10T14:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 1500,
      "limit": 1000,
      "offset": 0,
      "hasMore": true
    },
    "syncTimestamp": "2025-01-10T15:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Invalid or expired session |
| 403 | FORBIDDEN | User lacks attendees.read permission |
| 400 | VALIDATION_ERROR | Invalid query parameters |
| 500 | SERVER_ERROR | Internal server error |

---

### 2. Sync Approval Profiles

Downloads approval profiles for local rule evaluation.

**Endpoint:** `GET /api/mobile/sync/profiles`

**Authentication:** Required (Appwrite session)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `versions` | JSON string | No | Object mapping profile IDs to local versions |

**Example Request:**
```bash
# Full sync (get all profiles)
curl -X GET "https://example.com/api/mobile/sync/profiles" \
  -H "Authorization: Bearer <session-token>"

# Version comparison sync (only get updated profiles)
curl -X GET "https://example.com/api/mobile/sync/profiles?versions=%7B%22prof_123%22%3A2%2C%22prof_456%22%3A1%7D" \
  -H "Authorization: Bearer <session-token>"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "id": "prof_abc123",
        "name": "General Admission",
        "description": "Standard entry for all attendees",
        "version": 3,
        "rules": {
          "logic": "AND",
          "conditions": [
            {
              "field": "customFieldValues.credentialType",
              "operator": "in_list",
              "value": ["General", "VIP", "Staff"]
            }
          ]
        },
        "isDeleted": false,
        "updatedAt": "2025-01-10T12:00:00.000Z"
      },
      {
        "id": "prof_def456",
        "name": "VIP Backstage",
        "description": "VIP access to backstage areas",
        "version": 2,
        "rules": {
          "logic": "AND",
          "conditions": [
            {
              "field": "customFieldValues.credentialType",
              "operator": "equals",
              "value": "VIP"
            },
            {
              "field": "customFieldValues.backstageAccess",
              "operator": "is_true",
              "value": null
            }
          ]
        },
        "isDeleted": false,
        "updatedAt": "2025-01-09T16:30:00.000Z"
      }
    ],
    "syncTimestamp": "2025-01-10T15:00:00.000Z"
  }
}
```

**Rule Structure:**
```typescript
interface RuleGroup {
  logic: 'AND' | 'OR';
  conditions: (Rule | RuleGroup)[];
}

interface Rule {
  field: string;      // Dot notation path (e.g., "customFieldValues.vipStatus")
  operator: RuleOperator;
  value: any;
}

type RuleOperator = 
  | 'equals'        // Field === value
  | 'not_equals'    // Field !== value
  | 'in_list'       // Field in [values] (case-insensitive)
  | 'not_in_list'   // Field not in [values]
  | 'greater_than'  // Field > value
  | 'less_than'     // Field < value
  | 'between'       // value[0] <= Field <= value[1]
  | 'is_true'       // Field === true
  | 'is_false'      // Field === false
  | 'is_empty'      // Field is null/undefined/''
  | 'is_not_empty'; // Field has value
```

---

### 3. Upload Scan Logs

Uploads scan log records from the mobile device.

**Endpoint:** `POST /api/mobile/scan-logs`

**Authentication:** Required (Appwrite session)

**Request Body:**
```json
{
  "logs": [
    {
      "localId": "uuid-generated-on-device",
      "attendeeId": "att_abc123",
      "barcodeScanned": "1234567890",
      "result": "approved",
      "denialReason": null,
      "profileId": "prof_abc123",
      "profileVersion": 3,
      "deviceId": "device_xyz789",
      "scannedAt": "2025-01-15T09:30:45.000Z"
    }
  ]
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `localId` | string | Yes | UUID generated on device (for deduplication) |
| `attendeeId` | string \| null | Yes | Attendee ID if found, null if not |
| `barcodeScanned` | string | Yes | The scanned barcode value |
| `result` | 'approved' \| 'denied' | Yes | Scan result |
| `denialReason` | string \| null | Yes | Reason for denial (null if approved) |
| `profileId` | string \| null | Yes | Profile used (null if none) |
| `profileVersion` | number \| null | Yes | Profile version used |
| `deviceId` | string | Yes | Unique device identifier |
| `scannedAt` | string | Yes | ISO datetime when scan occurred |

**Example Request:**
```bash
curl -X POST "https://example.com/api/mobile/scan-logs" \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "logs": [
      {
        "localId": "550e8400-e29b-41d4-a716-446655440000",
        "attendeeId": "att_abc123",
        "barcodeScanned": "1234567890",
        "result": "approved",
        "denialReason": null,
        "profileId": "prof_abc123",
        "profileVersion": 3,
        "deviceId": "iPhone-ABC123",
        "scannedAt": "2025-01-15T09:30:45.000Z"
      }
    ]
  }'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "received": 1,
    "duplicates": 0,
    "errors": []
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid log format",
    "details": [
      { "index": 0, "field": "scannedAt", "message": "Invalid datetime format" }
    ]
  }
}
```

---

### 4. Get Custom Fields

Returns custom field definitions for the event.

**Endpoint:** `GET /api/mobile/custom-fields`

**Authentication:** Required (Appwrite session)

**Example Request:**
```bash
curl -X GET "https://example.com/api/mobile/custom-fields" \
  -H "Authorization: Bearer <session-token>"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "fields": [
      {
        "id": "cf_123",
        "fieldName": "Credential Type",
        "internalFieldName": "credentialType",
        "fieldType": "select",
        "fieldOptions": ["General", "VIP", "Staff", "Press"],
        "required": true
      },
      {
        "id": "cf_456",
        "fieldName": "Backstage Access",
        "internalFieldName": "backstageAccess",
        "fieldType": "boolean",
        "fieldOptions": null,
        "required": false
      },
      {
        "id": "cf_789",
        "fieldName": "Company",
        "internalFieldName": "company",
        "fieldType": "text",
        "fieldOptions": null,
        "required": false
      }
    ]
  }
}
```

---

### 5. Access Control API (Web Admin)

**Get Access Control:**
```
GET /api/access-control/[attendeeId]
```

**Update Access Control:**
```
PUT /api/access-control/[attendeeId]
```

**Request Body:**
```json
{
  "accessEnabled": true,
  "validFrom": "2025-01-15T08:00:00.000Z",
  "validUntil": "2025-01-17T23:59:59.000Z"
}
```

---

### 6. Approval Profiles API (Web Admin)

**List Profiles:**
```
GET /api/approval-profiles
```

**Get Single Profile:**
```
GET /api/approval-profiles/[id]
```

**Create Profile:**
```
POST /api/approval-profiles
```

**Update Profile:**
```
PUT /api/approval-profiles/[id]
```

**Delete Profile (Soft):**
```
DELETE /api/approval-profiles/[id]
```

---

### 7. Scan Logs Viewer API (Web Admin)

**List Scan Logs:**
```
GET /api/scan-logs?deviceId=xxx&operatorId=xxx&result=approved&startDate=xxx&endDate=xxx
```

**Export Scan Logs:**
```
GET /api/scan-logs/export?format=csv
```

---

## Integration Guide

### Step 1: Initial Setup

#### 1.1 Configure Appwrite

```typescript
// config/appwrite.ts
import { Client, Account } from 'react-native-appwrite';

const APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = 'your-project-id';
const API_BASE_URL = 'https://your-domain.com/api';

export const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);
export { API_BASE_URL };
```

#### 1.2 Set Up Local Database

```typescript
// database/schema.ts
import * as SQLite from 'expo-sqlite';

export async function initDatabase() {
  const db = await SQLite.openDatabaseAsync('scanner.db');
  
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS attendees (
      id TEXT PRIMARY KEY,
      firstName TEXT,
      lastName TEXT,
      barcodeNumber TEXT UNIQUE,
      photoUrl TEXT,
      photoLocalPath TEXT,
      customFieldValues TEXT,
      accessEnabled INTEGER DEFAULT 1,
      validFrom TEXT,
      validUntil TEXT,
      updatedAt TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_barcode ON attendees(barcodeNumber);
    
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      version INTEGER,
      rules TEXT,
      isDeleted INTEGER DEFAULT 0,
      updatedAt TEXT
    );
    
    CREATE TABLE IF NOT EXISTS scan_logs (
      localId TEXT PRIMARY KEY,
      attendeeId TEXT,
      barcodeScanned TEXT,
      result TEXT,
      denialReason TEXT,
      profileId TEXT,
      profileVersion INTEGER,
      deviceId TEXT,
      scannedAt TEXT,
      uploaded INTEGER DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  
  return db;
}
```

### Step 2: Implement Authentication

```typescript
// services/auth.ts
import { account } from '../config/appwrite';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function login(email: string, password: string) {
  const session = await account.createEmailPasswordSession(email, password);
  await AsyncStorage.setItem('session', JSON.stringify(session));
  return session;
}

export async function logout() {
  await account.deleteSession('current');
  await AsyncStorage.removeItem('session');
}

export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

export async function getSessionToken(): Promise<string | null> {
  const session = await AsyncStorage.getItem('session');
  if (session) {
    const parsed = JSON.parse(session);
    return parsed.secret;
  }
  return null;
}
```

### Step 3: Implement Sync Service

```typescript
// services/sync.ts
import { API_BASE_URL } from '../config/appwrite';
import { getSessionToken } from './auth';
import { db } from '../database';

export async function syncAttendees(fullSync = false) {
  const token = await getSessionToken();
  if (!token) throw new Error('Not authenticated');
  
  // Get last sync timestamp
  let since = '';
  if (!fullSync) {
    const result = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM sync_state WHERE key = ?',
      ['lastAttendeesSync']
    );
    since = result?.value || '';
  }
  
  // Fetch from API
  const url = new URL(`${API_BASE_URL}/mobile/sync/attendees`);
  if (since) url.searchParams.set('since', since);
  url.searchParams.set('limit', '5000');
  
  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Store attendees locally
  for (const attendee of data.data.attendees) {
    await db.runAsync(`
      INSERT OR REPLACE INTO attendees 
      (id, firstName, lastName, barcodeNumber, photoUrl, customFieldValues, 
       accessEnabled, validFrom, validUntil, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      attendee.id,
      attendee.firstName,
      attendee.lastName,
      attendee.barcodeNumber,
      attendee.photoUrl,
      JSON.stringify(attendee.customFieldValues),
      attendee.accessControl.accessEnabled ? 1 : 0,
      attendee.accessControl.validFrom,
      attendee.accessControl.validUntil,
      attendee.updatedAt
    ]);
  }
  
  // Update sync timestamp
  await db.runAsync(
    'INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)',
    ['lastAttendeesSync', data.data.syncTimestamp]
  );
  
  return data.data.attendees.length;
}

export async function syncProfiles() {
  const token = await getSessionToken();
  if (!token) throw new Error('Not authenticated');
  
  // Get local profile versions
  const localProfiles = await db.getAllAsync<{ id: string; version: number }>(
    'SELECT id, version FROM profiles WHERE isDeleted = 0'
  );
  
  const versions: Record<string, number> = {};
  for (const p of localProfiles) {
    versions[p.id] = p.version;
  }
  
  // Fetch from API
  const url = new URL(`${API_BASE_URL}/mobile/sync/profiles`);
  if (Object.keys(versions).length > 0) {
    url.searchParams.set('versions', JSON.stringify(versions));
  }
  
  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    throw new Error(`Profile sync failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Store profiles locally
  for (const profile of data.data.profiles) {
    await db.runAsync(`
      INSERT OR REPLACE INTO profiles 
      (id, name, description, version, rules, isDeleted, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      profile.id,
      profile.name,
      profile.description,
      profile.version,
      JSON.stringify(profile.rules),
      profile.isDeleted ? 1 : 0,
      profile.updatedAt
    ]);
  }
  
  return data.data.profiles.length;
}

export async function uploadPendingLogs() {
  const token = await getSessionToken();
  if (!token) return 0;
  
  // Get unuploaded logs
  const logs = await db.getAllAsync<any>(
    'SELECT * FROM scan_logs WHERE uploaded = 0 LIMIT 100'
  );
  
  if (logs.length === 0) return 0;
  
  const response = await fetch(`${API_BASE_URL}/mobile/scan-logs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ logs })
  });
  
  if (!response.ok) {
    throw new Error(`Log upload failed: ${response.status}`);
  }
  
  // Mark as uploaded
  const localIds = logs.map(l => l.localId);
  await db.runAsync(
    `UPDATE scan_logs SET uploaded = 1 WHERE localId IN (${localIds.map(() => '?').join(',')})`,
    localIds
  );
  
  return logs.length;
}
```

### Step 4: Implement Rule Engine

```typescript
// services/ruleEngine.ts

interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  barcodeNumber: string;
  customFieldValues: Record<string, any>;
  accessEnabled: boolean;
  validFrom: string | null;
  validUntil: string | null;
}

interface Rule {
  field: string;
  operator: string;
  value: any;
}

interface RuleGroup {
  logic: 'AND' | 'OR';
  conditions: (Rule | RuleGroup)[];
}

interface EvaluationResult {
  approved: boolean;
  denialReason: string | null;
  attendee: Attendee | null;
}

export function evaluateScan(
  barcode: string,
  attendees: Map<string, Attendee>,
  profile: { rules: RuleGroup } | null
): EvaluationResult {
  // Step 1: Find attendee
  let attendee: Attendee | null = null;
  for (const a of attendees.values()) {
    if (a.barcodeNumber === barcode) {
      attendee = a;
      break;
    }
  }
  
  if (!attendee) {
    return { approved: false, denialReason: 'Badge not found', attendee: null };
  }
  
  // Step 2: Check accessEnabled (highest priority)
  if (!attendee.accessEnabled) {
    return { approved: false, denialReason: 'Access disabled', attendee };
  }
  
  // Step 3: Check validity window
  const now = new Date();
  
  if (attendee.validFrom) {
    const validFrom = new Date(attendee.validFrom);
    if (now < validFrom) {
      return {
        approved: false,
        denialReason: `Badge not yet valid (valid from: ${formatDate(validFrom)})`,
        attendee
      };
    }
  }
  
  if (attendee.validUntil) {
    const validUntil = new Date(attendee.validUntil);
    if (now > validUntil) {
      return {
        approved: false,
        denialReason: `Badge has expired (expired: ${formatDate(validUntil)})`,
        attendee
      };
    }
  }
  
  // Step 4: Evaluate profile rules
  if (profile && profile.rules) {
    const rulesPass = evaluateRuleGroup(profile.rules, attendee);
    if (!rulesPass) {
      return {
        approved: false,
        denialReason: 'Access requirements not met',
        attendee
      };
    }
  }
  
  return { approved: true, denialReason: null, attendee };
}

function evaluateRuleGroup(group: RuleGroup, attendee: Attendee): boolean {
  const results = group.conditions.map(condition => {
    if ('logic' in condition) {
      return evaluateRuleGroup(condition as RuleGroup, attendee);
    }
    return evaluateRule(condition as Rule, attendee);
  });
  
  if (group.logic === 'AND') {
    return results.every(r => r);
  }
  return results.some(r => r);
}

function evaluateRule(rule: Rule, attendee: Attendee): boolean {
  const value = getFieldValue(attendee, rule.field);
  
  switch (rule.operator) {
    case 'equals':
      return value === rule.value;
    case 'not_equals':
      return value !== rule.value;
    case 'in_list':
      if (value === null || value === undefined) return false;
      return (rule.value as any[]).some(v =>
        String(v).toLowerCase() === String(value).toLowerCase()
      );
    case 'not_in_list':
      if (value === null || value === undefined) return true;
      return !(rule.value as any[]).some(v =>
        String(v).toLowerCase() === String(value).toLowerCase()
      );
    case 'greater_than':
      return value > rule.value;
    case 'less_than':
      return value < rule.value;
    case 'between':
      const [min, max] = rule.value as [any, any];
      return value >= min && value <= max;
    case 'is_true':
      return value === true;
    case 'is_false':
      return value === false;
    case 'is_empty':
      return value === null || value === undefined || value === '';
    case 'is_not_empty':
      return value !== null && value !== undefined && value !== '';
    default:
      return false;
  }
}

function getFieldValue(attendee: Attendee, fieldPath: string): any {
  const parts = fieldPath.split('.');
  let value: any = attendee;
  
  for (const part of parts) {
    if (value === null || value === undefined) return null;
    value = value[part];
  }
  
  return value;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
```

### Step 5: Implement Scanner Screen

```typescript
// screens/ScannerScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { evaluateScan } from '../services/ruleEngine';
import { db } from '../database';
import * as Crypto from 'expo-crypto';

export function ScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [attendees, setAttendees] = useState(new Map());
  const [scanning, setScanning] = useState(true);
  
  useEffect(() => {
    loadData();
  }, []);
  
  async function loadData() {
    // Load profiles
    const profileRows = await db.getAllAsync(
      'SELECT * FROM profiles WHERE isDeleted = 0'
    );
    setProfiles(profileRows.map(p => ({
      ...p,
      rules: JSON.parse(p.rules)
    })));
    
    // Load attendees into Map for fast lookup
    const attendeeRows = await db.getAllAsync('SELECT * FROM attendees');
    const map = new Map();
    for (const a of attendeeRows) {
      map.set(a.barcodeNumber, {
        ...a,
        customFieldValues: JSON.parse(a.customFieldValues || '{}'),
        accessEnabled: a.accessEnabled === 1
      });
    }
    setAttendees(map);
  }
  
  async function handleBarcodeScan({ data }) {
    if (!scanning) return;
    setScanning(false);
    
    // Evaluate scan
    const result = evaluateScan(data, attendees, selectedProfile);
    
    // Create scan log
    const scanLog = {
      localId: Crypto.randomUUID(),
      attendeeId: result.attendee?.id || null,
      barcodeScanned: data,
      result: result.approved ? 'approved' : 'denied',
      denialReason: result.denialReason,
      profileId: selectedProfile?.id || null,
      profileVersion: selectedProfile?.version || null,
      deviceId: await getDeviceId(),
      scannedAt: new Date().toISOString()
    };
    
    // Save to local database
    await db.runAsync(`
      INSERT INTO scan_logs 
      (localId, attendeeId, barcodeScanned, result, denialReason, 
       profileId, profileVersion, deviceId, scannedAt, uploaded)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      scanLog.localId,
      scanLog.attendeeId,
      scanLog.barcodeScanned,
      scanLog.result,
      scanLog.denialReason,
      scanLog.profileId,
      scanLog.profileVersion,
      scanLog.deviceId,
      scanLog.scannedAt
    ]);
    
    // Navigate to result screen
    navigation.navigate('Result', {
      approved: result.approved,
      attendee: result.attendee,
      denialReason: result.denialReason
    });
  }
  
  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text>Camera permission required</Text>
        <TouchableOpacity onPress={requestPermission}>
          <Text>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['code128', 'qr'] }}
        onBarcodeScanned={scanning ? handleBarcodeScan : undefined}
      />
      
      {/* Profile Selector */}
      <View style={styles.profileSelector}>
        <Text style={styles.label}>Profile:</Text>
        <TouchableOpacity onPress={() => {/* Show profile picker */}}>
          <Text>{selectedProfile?.name || 'None (basic validation)'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  profileSelector: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8
  },
  label: { color: 'white', fontSize: 12 }
});
```

---

## Data Flow

### Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                       │
└─────────────────────────────────────────────────────────────────────────────┘

1. INITIAL SYNC (On Login)
   ┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
   │  Mobile  │────►│ GET /mobile/ │────►│   Appwrite   │────►│  Mobile  │
   │   App    │     │sync/attendees│     │   Database   │     │  SQLite  │
   └──────────┘     └──────────────┘     └──────────────┘     └──────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ GET /mobile/ │
                    │sync/profiles │
                    └──────────────┘

2. BARCODE SCAN (Offline Capable)
   ┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
   │  Camera  │────►│   Barcode    │────►│    Rule      │────►│  Result  │
   │  Scan    │     │   Lookup     │     │   Engine     │     │  Screen  │
   └──────────┘     │  (SQLite)    │     │  (Local)     │     └──────────┘
                    └──────────────┘     └──────────────┘
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │  Save Log    │
                                         │  (SQLite)    │
                                         └──────────────┘

3. LOG UPLOAD (When Online)
   ┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
   │  Mobile  │────►│ POST /mobile │────►│   Appwrite   │────►│   Web    │
   │  SQLite  │     │  /scan-logs  │     │   Database   │     │  Admin   │
   └──────────┘     └──────────────┘     └──────────────┘     └──────────┘

4. DELTA SYNC (Periodic)
   ┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
   │  Mobile  │────►│ GET /mobile/ │────►│   Compare    │────►│  Update  │
   │   App    │     │sync/attendees│     │  Timestamps  │     │  SQLite  │
   │          │     │?since=<ts>   │     │              │     │          │
   └──────────┘     └──────────────┘     └──────────────┘     └──────────┘
```

### Sync Strategy

| Scenario | Action | Frequency |
|----------|--------|-----------|
| First login | Full sync of all data | Once |
| App foreground | Delta sync | Every 5 minutes |
| Network reconnect | Delta sync + log upload | Immediately |
| Manual refresh | Delta sync | On demand |
| Stale data (>1 hour) | Show warning, continue | N/A |

---

## Testing & Troubleshooting

### Testing Checklist

#### Authentication Tests
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (expect error)
- [ ] Session persistence after app restart
- [ ] Logout clears local data

#### Sync Tests
- [ ] Full sync downloads all attendees
- [ ] Delta sync only downloads changed records
- [ ] Profile sync respects version comparison
- [ ] Sync works with large datasets (5000+ attendees)
- [ ] Sync handles network errors gracefully

#### Scanning Tests
- [ ] Barcode lookup completes in <500ms
- [ ] Approved scan shows green screen
- [ ] Denied scan shows red screen with reason
- [ ] Scan works offline
- [ ] Scan logs are saved locally

#### Rule Engine Tests
- [ ] AND logic requires all conditions true
- [ ] OR logic requires at least one condition true
- [ ] Nested groups evaluate correctly
- [ ] Case-insensitive list matching works
- [ ] Null field handling works correctly

#### Log Upload Tests
- [ ] Logs upload when online
- [ ] Duplicate logs are deduplicated (localId)
- [ ] Failed uploads are retried

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Badge not found" | Attendee not synced | Perform full sync |
| Slow barcode lookup | Large dataset | Index barcodeNumber column |
| Logs not uploading | Network issue | Check connectivity, retry |
| Profile rules not working | Outdated profile | Sync profiles |
| "Access disabled" unexpected | Admin disabled access | Check web admin |
| Date validation failing | Timezone mismatch | Ensure UTC storage |

### Debug Logging

```typescript
// Enable debug logging
const DEBUG = __DEV__;

function log(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[Scanner] ${message}`, data || '');
  }
}

// Usage
log('Scan result', { barcode, result, attendee });
log('Sync completed', { count: attendees.length });
```

---

## AI Prompt for Mobile App Generation

Use the following prompt with an AI code generation tool (like Rork, Cursor, or similar) to generate the complete mobile scanning application:

---

### Complete AI Generation Prompt

```
Create a React Native/Expo mobile application for event badge scanning with the following specifications:

## Project Setup
- Use Expo managed workflow with TypeScript
- Install dependencies: expo-camera, expo-sqlite, @react-native-async-storage/async-storage, react-native-appwrite, expo-crypto

## Core Features

### 1. Authentication Screen
- Email/password login form
- Connect to Appwrite backend (endpoint: https://cloud.appwrite.io/v1, project: <PROJECT_ID>)
- Store session securely using AsyncStorage
- Navigate to Scanner screen on successful login
- Show error messages for failed login attempts

### 2. Scanner Screen
- Full-screen camera view using expo-camera
- Support barcode types: code128, qr, ean13
- Profile selector dropdown at top of screen showing available approval profiles
- Sync status indicator showing last sync time
- Settings button to access sync and logout options

### 3. Result Screen
- Full-screen result display
- GREEN background with checkmark for APPROVED scans
- RED background with X for DENIED scans
- Show attendee photo (if available), name, and barcode
- Show denial reason for denied scans
- Auto-return to scanner after 3 seconds
- Manual "Scan Next" button

### 4. Local Database (SQLite)
Create tables:
- attendees: id, firstName, lastName, barcodeNumber (indexed), photoUrl, photoLocalPath, customFieldValues (JSON), accessEnabled, validFrom, validUntil, updatedAt
- profiles: id, name, description, version, rules (JSON), isDeleted, updatedAt
- scan_logs: localId (primary), attendeeId, barcodeScanned, result, denialReason, profileId, profileVersion, deviceId, scannedAt, uploaded
- sync_state: key, value

### 5. Sync Service
Implement these functions:
- syncAttendees(fullSync: boolean): Fetch from GET /api/mobile/sync/attendees, support delta sync with 'since' parameter
- syncProfiles(): Fetch from GET /api/mobile/sync/profiles, compare versions
- uploadPendingLogs(): POST to /api/mobile/scan-logs, mark as uploaded on success
- Background sync every 5 minutes when app is active

### 6. Rule Engine
Implement scan evaluation with this priority:
1. Find attendee by barcode (deny if not found: "Badge not found")
2. Check accessEnabled (deny if false: "Access disabled")
3. Check validFrom (deny if current time < validFrom: "Badge not yet valid")
4. Check validUntil (deny if current time > validUntil: "Badge has expired")
5. Evaluate profile rules if profile selected (deny if rules fail: "Access requirements not met")
6. Approve if all checks pass

Support these rule operators:
- equals, not_equals: Direct comparison
- in_list, not_in_list: Case-insensitive array membership
- greater_than, less_than, between: Numeric/date comparison
- is_true, is_false: Boolean checks
- is_empty, is_not_empty: Null/undefined/empty string checks

Support nested rule groups with AND/OR logic.

### 7. Offline Support
- All scanning works offline using local SQLite data
- Scan logs are queued locally and uploaded when online
- Show offline indicator when no network
- Show warning if last sync > 1 hour ago

## API Integration

Base URL: https://<your-domain>/api

Endpoints:
- GET /api/mobile/sync/attendees?since=<ISO_DATE>&limit=5000
- GET /api/mobile/sync/profiles?versions=<JSON>
- POST /api/mobile/scan-logs (body: { logs: [...] })
- GET /api/mobile/custom-fields

All requests require Authorization header with Appwrite session token.

## UI/UX Requirements
- Large, readable text for scan results
- High contrast colors (green #22c55e for approved, red #ef4444 for denied)
- Haptic feedback on scan (vibrate)
- Sound feedback (optional, configurable)
- Portrait orientation lock
- Keep screen awake during scanning

## Error Handling
- Network errors: Show toast, continue with cached data
- Camera permission denied: Show permission request screen
- Invalid barcode: Show "Badge not found" result
- Sync failures: Retry with exponential backoff

## Security
- Store session tokens securely
- Clear all local data on logout
- Validate all API responses
- Use HTTPS for all requests

Generate the complete application with all screens, services, and components. Include TypeScript types for all data structures.
```

---

## User Experience (Consumer Perspective)

### User Journey: Event Staff (Scanner Operator)

#### 1. Getting Started

**First-Time Setup:**
1. Download the scanner app from your organization
2. Open the app and see the login screen
3. Enter your email and password (same credentials as web portal)
4. Wait for initial data sync (progress indicator shows download status)
5. Once sync completes, you're ready to scan

**Returning User:**
1. Open the app
2. If session is valid, go directly to scanner screen
3. App automatically syncs in background

#### 2. Selecting an Approval Profile

Before scanning, you may need to select which access point you're managing:

1. Tap the profile selector at the top of the screen
2. See list of available profiles:
   - "General Admission" - Standard entry
   - "VIP Backstage" - VIP-only areas
   - "Staff Only" - Staff areas
   - "None" - Basic validation only (access enabled + dates)
3. Select the appropriate profile for your location
4. Profile name displays on screen for confirmation

#### 3. Scanning a Badge

**Successful Scan (Approved):**
1. Point camera at attendee's badge barcode
2. Camera automatically detects and reads barcode
3. Screen flashes GREEN
4. See attendee's photo and name
5. "APPROVED" displayed prominently
6. Phone vibrates briefly (success feedback)
7. After 3 seconds, returns to scanner (or tap "Scan Next")

**Unsuccessful Scan (Denied):**
1. Point camera at attendee's badge barcode
2. Camera reads barcode
3. Screen flashes RED
4. See denial reason:
   - "Badge not found" - Barcode not in system
   - "Access disabled" - Admin has disabled this badge
   - "Badge not yet valid (valid from: Jan 15, 8:00 AM)" - Too early
   - "Badge has expired (expired: Jan 17, 11:59 PM)" - Too late
   - "Access requirements not met" - Doesn't meet profile rules
5. Phone vibrates twice (denial feedback)
6. Inform attendee of the issue
7. Tap "Scan Next" to continue

#### 4. Working Offline

The app works without internet connection:

1. Notice the "Offline" indicator in the corner
2. Continue scanning normally - all data is cached locally
3. Scan results are saved locally
4. When connection returns:
   - App automatically syncs new data
   - Pending scan logs upload to server
   - "Online" indicator appears

**Stale Data Warning:**
- If last sync was >1 hour ago, see warning banner
- "Data may be outdated - sync when possible"
- Scanning still works, but recent changes may not be reflected

#### 5. Manual Sync

To force a data refresh:
1. Tap the settings/menu icon
2. Select "Sync Now"
3. Wait for sync to complete
4. See confirmation: "Synced 1,234 attendees, 5 profiles"

#### 6. Logging Out

When your shift ends:
1. Tap settings/menu icon
2. Select "Logout"
3. Confirm logout
4. All local data is cleared
5. Return to login screen

---

### User Journey: Event Administrator (Web Portal)

#### 1. Managing Access Control

**Setting Validity Windows:**
1. Navigate to Attendees in the web portal
2. Click on an attendee to edit
3. Find the "Access Control" section
4. Set "Valid From" date/time (when badge becomes active)
5. Set "Valid Until" date/time (when badge expires)
6. Toggle "Access Enabled" on/off
7. Save changes
8. Changes sync to mobile devices within 5 minutes

**Bulk Access Control:**
1. Select multiple attendees
2. Click "Bulk Edit"
3. Set access control values for all selected
4. Save changes

#### 2. Creating Approval Profiles

**Creating a New Profile:**
1. Navigate to "Access Control" > "Approval Profiles"
2. Click "Create Profile"
3. Enter profile name (e.g., "VIP Backstage")
4. Add description (optional)
5. Build rules:
   - Click "Add Rule"
   - Select field (e.g., "Credential Type")
   - Select operator (e.g., "equals")
   - Enter value (e.g., "VIP")
6. Add more rules as needed
7. Set logic (AND = all rules must pass, OR = any rule passes)
8. Save profile
9. Profile syncs to mobile devices

**Example Profiles:**

| Profile | Rules |
|---------|-------|
| General Admission | Credential Type IN [General, VIP, Staff] |
| VIP Only | Credential Type = VIP |
| VIP Backstage | Credential Type = VIP AND Backstage Access = true |
| Staff Areas | Credential Type = Staff OR Role = Security |

#### 3. Viewing Scan Logs

**Accessing Scan Logs:**
1. Navigate to "Access Control" > "Scan Logs"
2. See all scan attempts in chronological order
3. Filter by:
   - Date range
   - Device ID
   - Operator
   - Result (Approved/Denied)
   - Attendee
4. Export to CSV for reporting

**Log Information:**
- Timestamp of scan
- Attendee name and barcode
- Result (Approved/Denied)
- Denial reason (if applicable)
- Profile used
- Device and operator who performed scan

---

## Technical Process (System Perspective)

### Technical Process: Authentication

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

1. User enters email/password
   │
   ▼
2. Mobile app calls Appwrite SDK:
   account.createEmailPasswordSession(email, password)
   │
   ▼
3. Appwrite validates credentials against Users collection
   │
   ├── Invalid → Return error, show "Invalid credentials"
   │
   └── Valid → Create session, return session object
       │
       ▼
4. Mobile app stores session in AsyncStorage:
   AsyncStorage.setItem('session', JSON.stringify(session))
   │
   ▼
5. Mobile app fetches user's role from Appwrite:
   GET /api/users/me → Returns user with role and permissions
   │
   ▼
6. Verify user has required permissions:
   - attendees.read
   - accessControl.read
   - approvalProfiles.read
   - scanLogs.write
   │
   ├── Missing permissions → Show error, logout
   │
   └── Has permissions → Proceed to initial sync
```

### Technical Process: Data Synchronization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SYNC PROCESS (FULL)                                  │
└─────────────────────────────────────────────────────────────────────────────┘

1. Mobile app initiates sync
   │
   ▼
2. GET /api/mobile/sync/attendees?limit=5000
   │
   ▼
3. API Route Handler:
   a. Authenticate request (verify Appwrite session)
   b. Check permissions (attendees.read)
   c. Query Appwrite Database:
      - Collection: attendees
      - Include: all fields
      - Limit: 5000
   d. For each attendee, fetch access_control record:
      - Query: attendeeId = attendee.$id
      - Default if not found: { accessEnabled: true, validFrom: null, validUntil: null }
   e. Parse customFieldValues from JSON string
   f. Return combined response
   │
   ▼
4. Mobile app receives response:
   {
     attendees: [...],
     pagination: { total, limit, offset, hasMore },
     syncTimestamp: "2025-01-10T15:00:00.000Z"
   }
   │
   ▼
5. Mobile app stores in SQLite:
   INSERT OR REPLACE INTO attendees (...)
   │
   ▼
6. If hasMore = true, fetch next page (offset += limit)
   │
   ▼
7. Store syncTimestamp for delta sync:
   INSERT OR REPLACE INTO sync_state (key, value)
   VALUES ('lastAttendeesSync', syncTimestamp)
   │
   ▼
8. Repeat for profiles:
   GET /api/mobile/sync/profiles
   │
   ▼
9. Sync complete
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SYNC PROCESS (DELTA)                                 │
└─────────────────────────────────────────────────────────────────────────────┘

1. Mobile app retrieves last sync timestamp:
   SELECT value FROM sync_state WHERE key = 'lastAttendeesSync'
   │
   ▼
2. GET /api/mobile/sync/attendees?since=2025-01-10T15:00:00.000Z
   │
   ▼
3. API Route Handler:
   a. Parse 'since' parameter
   b. Query Appwrite Database:
      - Filter: $updatedAt > since
      - This returns only modified records
   c. Return filtered results
   │
   ▼
4. Mobile app updates only changed records:
   INSERT OR REPLACE INTO attendees (...)
   │
   ▼
5. Update sync timestamp
```

### Technical Process: Barcode Scan Evaluation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SCAN EVALUATION PROCESS                              │
└─────────────────────────────────────────────────────────────────────────────┘

1. Camera detects barcode: "1234567890"
   │
   ▼
2. Query local SQLite:
   SELECT * FROM attendees WHERE barcodeNumber = '1234567890'
   │
   ├── Not found → DENY: "Badge not found"
   │
   └── Found → Continue evaluation
       │
       ▼
3. Check accessEnabled field:
   │
   ├── accessEnabled = false → DENY: "Access disabled"
   │
   └── accessEnabled = true → Continue
       │
       ▼
4. Check validity window:
   const now = new Date();
   │
   ├── validFrom && now < validFrom → DENY: "Badge not yet valid"
   │
   ├── validUntil && now > validUntil → DENY: "Badge has expired"
   │
   └── Within window → Continue
       │
       ▼
5. Check if profile selected:
   │
   ├── No profile → APPROVE (basic validation passed)
   │
   └── Profile selected → Evaluate rules
       │
       ▼
6. Parse profile rules from JSON:
   {
     "logic": "AND",
     "conditions": [
       { "field": "customFieldValues.credentialType", "operator": "equals", "value": "VIP" },
       { "field": "customFieldValues.backstageAccess", "operator": "is_true", "value": null }
     ]
   }
   │
   ▼
7. Evaluate each condition:
   
   Condition 1: customFieldValues.credentialType equals "VIP"
   - Extract value: attendee.customFieldValues.credentialType = "VIP"
   - Compare: "VIP" === "VIP" → true
   
   Condition 2: customFieldValues.backstageAccess is_true
   - Extract value: attendee.customFieldValues.backstageAccess = true
   - Compare: true === true → true
   │
   ▼
8. Apply logic:
   - AND: all conditions must be true
   - [true, true] → every(r => r) → true
   │
   ├── Rules fail → DENY: "Access requirements not met"
   │
   └── Rules pass → APPROVE
       │
       ▼
9. Create scan log record:
   {
     localId: "uuid-v4",
     attendeeId: "att_abc123",
     barcodeScanned: "1234567890",
     result: "approved",
     denialReason: null,
     profileId: "prof_def456",
     profileVersion: 2,
     deviceId: "iPhone-ABC123",
     scannedAt: "2025-01-15T09:30:45.000Z"
   }
   │
   ▼
10. Save to local SQLite:
    INSERT INTO scan_logs (...) VALUES (...)
    │
    ▼
11. Display result to user
```

### Technical Process: Log Upload

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LOG UPLOAD PROCESS                                   │
└─────────────────────────────────────────────────────────────────────────────┘

1. Trigger: Network available OR periodic timer (5 min)
   │
   ▼
2. Query pending logs:
   SELECT * FROM scan_logs WHERE uploaded = 0 LIMIT 100
   │
   ├── No pending logs → Exit
   │
   └── Has pending logs → Continue
       │
       ▼
3. POST /api/mobile/scan-logs
   Body: { logs: [...] }
   │
   ▼
4. API Route Handler:
   a. Authenticate request
   b. Check permissions (scanLogs.write)
   c. Validate each log entry (Zod schema)
   d. For each log:
      - Check if localId already exists (deduplication)
      - If exists, skip (count as duplicate)
      - If new, insert into scan_logs collection
   e. Return summary:
      { received: 10, duplicates: 2, errors: [] }
   │
   ▼
5. Mobile app marks logs as uploaded:
   UPDATE scan_logs SET uploaded = 1 WHERE localId IN (...)
   │
   ▼
6. If more pending logs, repeat
```

### Technical Process: Profile Version Sync

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROFILE VERSION SYNC                                 │
└─────────────────────────────────────────────────────────────────────────────┘

1. Mobile app queries local profile versions:
   SELECT id, version FROM profiles WHERE isDeleted = 0
   │
   ▼
2. Build versions object:
   { "prof_123": 2, "prof_456": 1 }
   │
   ▼
3. GET /api/mobile/sync/profiles?versions={"prof_123":2,"prof_456":1}
   │
   ▼
4. API Route Handler:
   a. Parse versions parameter
   b. Query all non-deleted profiles from Appwrite
   c. For each profile:
      - If profile.id not in versions → include (new profile)
      - If profile.version > versions[profile.id] → include (updated)
      - Otherwise → exclude (up-to-date)
   d. Return filtered profiles
   │
   ▼
5. Mobile app receives only changed profiles:
   {
     profiles: [
       { id: "prof_123", version: 3, ... }  // Updated from v2 to v3
     ]
   }
   │
   ▼
6. Update local SQLite:
   INSERT OR REPLACE INTO profiles (...)
```

---

## Appendix

### Data Type Reference

```typescript
// Core Types
interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  barcodeNumber: string;
  photoUrl: string | null;
  customFieldValues: Record<string, any>;
  accessControl: {
    accessEnabled: boolean;
    validFrom: string | null;  // ISO 8601 UTC
    validUntil: string | null; // ISO 8601 UTC
  };
  updatedAt: string;
}

interface ApprovalProfile {
  id: string;
  name: string;
  description: string | null;
  version: number;
  rules: RuleGroup;
  isDeleted: boolean;
  updatedAt: string;
}

interface RuleGroup {
  logic: 'AND' | 'OR';
  conditions: (Rule | RuleGroup)[];
}

interface Rule {
  field: string;
  operator: RuleOperator;
  value: any;
}

type RuleOperator = 
  | 'equals' | 'not_equals'
  | 'in_list' | 'not_in_list'
  | 'greater_than' | 'less_than' | 'between'
  | 'is_true' | 'is_false'
  | 'is_empty' | 'is_not_empty';

interface ScanLog {
  localId: string;
  attendeeId: string | null;
  barcodeScanned: string;
  result: 'approved' | 'denied';
  denialReason: string | null;
  profileId: string | null;
  profileVersion: number | null;
  deviceId: string;
  operatorId: string;
  scannedAt: string;
  uploadedAt: string | null;
}

interface EvaluationResult {
  approved: boolean;
  denialReason: string | null;
  attendee: Attendee | null;
}
```

### Denial Reason Constants

```typescript
const DENIAL_REASONS = {
  NOT_FOUND: 'Badge not found',
  ACCESS_DISABLED: 'Access disabled',
  NOT_YET_VALID: 'Badge not yet valid (valid from: {date})',
  EXPIRED: 'Badge has expired (expired: {date})',
  REQUIREMENTS_NOT_MET: 'Access requirements not met'
};

// Priority order (highest to lowest):
// 1. NOT_FOUND
// 2. ACCESS_DISABLED
// 3. NOT_YET_VALID / EXPIRED
// 4. REQUIREMENTS_NOT_MET
```

### Environment Variables

```bash
# Web Application (.env.local)
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your-database-id
NEXT_PUBLIC_APPWRITE_ACCESS_CONTROL_COLLECTION_ID=access_control
NEXT_PUBLIC_APPWRITE_APPROVAL_PROFILES_COLLECTION_ID=approval_profiles
NEXT_PUBLIC_APPWRITE_SCAN_LOGS_COLLECTION_ID=scan_logs

# Mobile Application
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
API_BASE_URL=https://your-domain.com/api
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-05 | Initial release |

---

*This document is part of the credential.studio platform documentation.*
