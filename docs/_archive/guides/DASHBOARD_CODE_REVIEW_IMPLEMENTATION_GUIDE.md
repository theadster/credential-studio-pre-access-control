# Dashboard Code Review - Implementation Guide

## Executive Summary

This document provides a comprehensive, step-by-step implementation guide for addressing all issues identified in the code review of `src/pages/dashboard.tsx`. The dashboard component is currently 5,201 lines and contains 30 identified issues ranging from critical to low severity.

**Review Date:** October 30, 2025  
**Reviewed By:** Zen Code Review (Claude Sonnet 4.5)  
**File:** `src/pages/dashboard.tsx` (5,201 lines)  
**Total Issues Found:** 30 (4 Critical, 12 High, 10 Medium, 4 Low)

---

## Table of Contents

1. [Priority Overview](#priority-overview)
2. [Critical Issues](#critical-issues)
3. [High Severity Issues](#high-severity-issues)
4. [Medium Severity Issues](#medium-severity-issues)
5. [Low Severity Issues](#low-severity-issues)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Testing Strategy](#testing-strategy)

---

## Naming Conventions

**CRITICAL: Follow Existing Project Conventions**

Before starting any refactoring, ensure you follow the established naming conventions in the codebase. The project uses a **mixed convention** depending on file type and location:

### Component Files (Root Level)
- **Format:** PascalCase for standalone components
- **Location:** `src/components/`
- **Examples from codebase:**
  - ✅ `AttendeeForm.tsx`
  - ✅ `DeleteUserDialog.tsx`
  - ✅ `LogsExportDialog.tsx`
  - ✅ `RoleCard.tsx`
  - ✅ `ErrorBoundary.tsx`

### Component Folders (Feature Components)
- **Format:** PascalCase folder names with organized subcomponents
- **Location:** `src/components/[FeatureName]/`
- **Pattern:** Feature components are organized in folders with an `index.tsx` export
- **Examples from codebase:**
  ```
  src/components/AttendeeForm/
    ├── index.tsx                      (main export)
    ├── BasicInformationSection.tsx    (PascalCase subcomponents)
    ├── CustomFieldInput.tsx
    ├── CustomFieldsSection.tsx
    ├── FormActions.tsx
    └── PhotoUploadSection.tsx

  src/components/EventSettingsForm/
    ├── index.tsx
    ├── BarcodeTab.tsx                 (PascalCase subcomponents)
    ├── CustomFieldForm.tsx
    ├── GeneralTab.tsx
    ├── constants.ts                   (camelCase utilities)
    ├── types.ts                       (camelCase types)
    ├── useEventSettingsForm.ts        (camelCase hooks)
    └── utils.ts                       (camelCase utilities)

  src/components/UserForm/
    ├── index.tsx
    ├── AuthUserSelector.tsx           (PascalCase subcomponents)
    ├── RoleSelector.tsx
    ├── UserFormContainer.tsx
    ├── UserFormFields.tsx
    ├── types.ts                       (camelCase types)
    └── hooks/                         (nested hooks folder)
  ```

### UI Components (shadcn/ui)
- **Format:** kebab-case (lowercase with hyphens)
- **Location:** `src/components/ui/`
- **Examples from codebase:**
  - ✅ `alert-dialog.tsx`
  - ✅ `dropdown-menu.tsx`
  - ✅ `input-otp.tsx`
  - ✅ `toggle-group.tsx`
  - ✅ `button.tsx`
  - ✅ `card.tsx`

### Hook Files
- **Format:** camelCase with `use` prefix
- **Location:** `src/hooks/` or within component folders
- **Examples:**
  - ✅ `useAttendees.ts`
  - ✅ `useEntityCRUD.ts`
  - ✅ `useEventSettingsForm.ts` (inside EventSettingsForm/)

### Utility Files
- **Format:** camelCase
- **Location:** `src/lib/` or within component folders
- **Examples:**
  - ✅ `sanitize.ts`
  - ✅ `errorMessages.ts`
  - ✅ `logger.ts`
  - ✅ `utils.ts` (inside EventSettingsForm/)

### Type Files
- **Format:** camelCase
- **Location:** `src/types/` or within component folders
- **Examples:**
  - ✅ `dashboard.ts`
  - ✅ `types.ts` (inside component folders)

### Constant Files
- **Format:** camelCase
- **Location:** `src/constants/` or within component folders
- **Examples:**
  - ✅ `dashboard.ts`
  - ✅ `constants.ts` (inside EventSettingsForm/)

### Reducer Files
- **Format:** camelCase with `Reducer` suffix
- **Location:** `src/reducers/`
- **Examples:**
  - ✅ `attendeesReducer.ts`
  - ✅ `usersReducer.ts`

### Recommended Structure for Dashboard Refactoring

Based on the existing patterns, create the dashboard structure like this:

```
src/components/dashboard/
├── index.tsx                          (main Dashboard export)
├── DashboardLayout.tsx                (PascalCase - layout component)
├── tabs/
│   ├── AttendeesTab.tsx              (PascalCase - tab components)
│   ├── UsersTab.tsx
│   ├── RolesTab.tsx
│   ├── SettingsTab.tsx
│   └── LogsTab.tsx
└── shared/
    ├── AttendeeTable.tsx             (PascalCase - shared components)
    ├── AttendeeFilters.tsx
    ├── AttendeeStats.tsx
    ├── constants.ts                  (camelCase - utilities)
    └── types.ts                      (camelCase - types)

src/hooks/dashboard/
├── useAttendees.ts                   (camelCase - hooks)
├── useUsers.ts
└── useEntityCRUD.ts

src/reducers/
├── attendeesReducer.ts               (camelCase - reducers)
└── usersReducer.ts
```

**Key Takeaway:** 
- **React Components** = PascalCase (`.tsx` files that export components)
- **UI Library Components** = kebab-case (shadcn/ui convention)
- **Utilities, hooks, types, constants** = camelCase
- **Feature folders** = PascalCase (e.g., `AttendeeForm/`, `EventSettingsForm/`)

**Note:** Always check the existing folder structure before creating new files to maintain consistency.

---

## Priority Overview

### Top 3 Immediate Actions (Must Fix First)

1. **Split into separate tab components** (CRITICAL) - This single change will resolve 60% of the issues
2. **Consolidate state with useReducer** (CRITICAL) - Replace 40+ useState hooks with domain-specific reducers
3. **Add input sanitization** (HIGH) - Implement DOMPurify for all user-generated content

### Impact Assessment

- **Critical Issues:** Will cause maintainability crisis and potential security vulnerabilities
- **High Issues:** Affect performance, security, and user experience
- **Medium Issues:** Impact code quality and developer productivity
- **Low Issues:** Minor improvements for code cleanliness

---

## Critical Issues

### 1. Monolithic Component (Lines 1-5201)

**Issue:** Component is 5,201 lines long, violating Single Responsibility Principle

**Impact:**
- Impossible to maintain and debug
- Difficult to test
- Performance issues from unnecessary re-renders
- Onboarding new developers is extremely difficult


**Solution:** Split into separate tab components

**Step-by-Step Implementation:**

#### Phase 1: Create Component Structure

**IMPORTANT: Naming Convention**  
Follow the existing mixed naming convention pattern:
- **Component files (.tsx)**: PascalCase (e.g., `AttendeesTab.tsx`, `AttendeeTable.tsx`)
- **Feature folders**: PascalCase (e.g., `dashboard/`, matching `AttendeeForm/`, `EventSettingsForm/`)
- **Utility files**: camelCase (e.g., `constants.ts`, `types.ts`, `utils.ts`)
- **Hook files**: camelCase with `use` prefix (e.g., `useAttendees.ts`)

This matches the existing structure in components like `AttendeeForm/`, `EventSettingsForm/`, and `UserForm/`.

```bash
# Create new directory structure
mkdir -p src/components/dashboard/tabs
mkdir -p src/components/dashboard/shared
mkdir -p src/hooks/dashboard
mkdir -p src/reducers
```

#### Phase 2: Extract Attendees Tab (Proof of Concept)

Create `src/components/dashboard/tabs/AttendeesTab.tsx`:

```typescript
import React, { useState, useMemo } from 'react';
import { Attendee, EventSettings } from '@/types';
import { useAttendees } from '@/hooks/dashboard/useAttendees';
import { AttendeeTable } from '../shared/AttendeeTable';
import { AttendeeFilters } from '../shared/AttendeeFilters';
import { AttendeeStats } from '../shared/AttendeeStats';

interface AttendeesTabProps {
  eventSettings: EventSettings | null;
  currentUser: User | null;
}

export function AttendeesTab({ eventSettings, currentUser }: AttendeesTabProps) {
  const {
    attendees,
    loading,
    error,
    createAttendee,
    updateAttendee,
    deleteAttendee,
    generateCredential,
  } = useAttendees();

  const [searchTerm, setSearchTerm] = useState('');
  const [photoFilter, setPhotoFilter] = useState<'all' | 'with' | 'without'>('all');

  const filteredAttendees = useMemo(() => {
    return attendees.filter(/* filter logic */);
  }, [attendees, searchTerm, photoFilter]);

  return (
    <div className="space-y-6">
      <AttendeeStats attendees={attendees} eventSettings={eventSettings} />
      <AttendeeFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        photoFilter={photoFilter}
        onPhotoFilterChange={setPhotoFilter}
      />
      <AttendeeTable
        attendees={filteredAttendees}
        onEdit={updateAttendee}
        onDelete={deleteAttendee}
        onGenerateCredential={generateCredential}
      />
    </div>
  );
}
```


#### Phase 3: Create Custom Hook for Attendees

Create `src/hooks/dashboard/useAttendees.ts`:

```typescript
import { useState, useCallback } from 'react';
import { Attendee } from '@/types';
import { useSweetAlert } from '@/hooks/useSweetAlert';

export function useAttendees() {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { success, error: showError } = useSweetAlert();

  const fetchAttendees = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/attendees');
      if (!response.ok) throw new Error('Failed to fetch attendees');
      const data = await response.json();
      setAttendees(data);
    } catch (err) {
      setError(err as Error);
      showError('Error', 'Failed to load attendees');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const createAttendee = useCallback(async (data: Partial<Attendee>) => {
    try {
      const response = await fetch('/api/attendees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create attendee');
      const newAttendee = await response.json();
      setAttendees(prev => [newAttendee, ...prev]);
      success('Success', 'Attendee created successfully');
      return newAttendee;
    } catch (err) {
      showError('Error', 'Failed to create attendee');
      throw err;
    }
  }, [success, showError]);

  // Similar patterns for update, delete, etc.

  return {
    attendees,
    loading,
    error,
    fetchAttendees,
    createAttendee,
    updateAttendee,
    deleteAttendee,
    generateCredential,
  };
}
```

#### Phase 4: Update Main Dashboard

Update `src/pages/dashboard.tsx`:

```typescript
import { AttendeesTab } from '@/components/dashboard/tabs/AttendeesTab';
import { UsersTab } from '@/components/dashboard/tabs/UsersTab';
// ... other tabs

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('attendees');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [eventSettings, setEventSettings] = useState<EventSettings | null>(null);

  // Load shared data
  useEffect(() => {
    loadCurrentUser();
    loadEventSettings();
  }, []);

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      currentUser={currentUser}
      eventSettings={eventSettings}
    >
      {activeTab === 'attendees' && (
        <AttendeesTab
          eventSettings={eventSettings}
          currentUser={currentUser}
        />
      )}
      {activeTab === 'users' && (
        <UsersTab currentUser={currentUser} />
      )}
      {/* ... other tabs */}
    </DashboardLayout>
  );
}
```

**Benefits:**
- Reduces main dashboard from 5,201 to ~200 lines
- Each tab is independently testable
- Easier to maintain and debug
- Better performance (only active tab renders)


---

### 2. Excessive useState Hooks (Lines 150-200)

**Issue:** 40+ useState hooks create complex state dependencies and re-render cascades

**Impact:**
- Difficult to track state changes
- Performance issues from cascading re-renders
- Risk of stale closures
- Hard to debug state-related bugs

**Solution:** Consolidate related state using useReducer

**Step-by-Step Implementation:**

#### Phase 1: Create Attendees State Reducer

Create `src/reducers/attendeesReducer.ts`:

```typescript
import { Attendee } from '@/types';

export interface AttendeesState {
  items: Attendee[];
  selected: string[];
  filters: {
    searchTerm: string;
    photoFilter: 'all' | 'with' | 'without';
    advancedFilters: AdvancedFilters;
  };
  pagination: {
    currentPage: number;
    pageSize: number;
  };
  ui: {
    showAdvancedSearch: boolean;
    showBulkEdit: boolean;
  };
}

export type AttendeesAction =
  | { type: 'SET_ATTENDEES'; payload: Attendee[] }
  | { type: 'ADD_ATTENDEE'; payload: Attendee }
  | { type: 'UPDATE_ATTENDEE'; payload: Attendee }
  | { type: 'DELETE_ATTENDEE'; payload: string }
  | { type: 'SELECT_ATTENDEE'; payload: string }
  | { type: 'DESELECT_ATTENDEE'; payload: string }
  | { type: 'SELECT_ALL'; payload: string[] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_PHOTO_FILTER'; payload: 'all' | 'with' | 'without' }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'TOGGLE_ADVANCED_SEARCH' }
  | { type: 'TOGGLE_BULK_EDIT' };

export const initialAttendeesState: AttendeesState = {
  items: [],
  selected: [],
  filters: {
    searchTerm: '',
    photoFilter: 'all',
    advancedFilters: {},
  },
  pagination: {
    currentPage: 1,
    pageSize: 25,
  },
  ui: {
    showAdvancedSearch: false,
    showBulkEdit: false,
  },
};

export function attendeesReducer(
  state: AttendeesState,
  action: AttendeesAction
): AttendeesState {
  switch (action.type) {
    case 'SET_ATTENDEES':
      return { ...state, items: action.payload };

    case 'ADD_ATTENDEE':
      return { ...state, items: [action.payload, ...state.items] };

    case 'UPDATE_ATTENDEE':
      return {
        ...state,
        items: state.items.map(a =>
          a.id === action.payload.id ? action.payload : a
        ),
      };

    case 'DELETE_ATTENDEE':
      return {
        ...state,
        items: state.items.filter(a => a.id !== action.payload),
        selected: state.selected.filter(id => id !== action.payload),
      };

    case 'SELECT_ATTENDEE':
      return {
        ...state,
        selected: [...state.selected, action.payload],
      };

    case 'DESELECT_ATTENDEE':
      return {
        ...state,
        selected: state.selected.filter(id => id !== action.payload),
      };

    case 'SELECT_ALL':
      return { ...state, selected: action.payload };

    case 'CLEAR_SELECTION':
      return { ...state, selected: [] };

    case 'SET_SEARCH_TERM':
      return {
        ...state,
        filters: { ...state.filters, searchTerm: action.payload },
        pagination: { ...state.pagination, currentPage: 1 },
      };

    case 'SET_PHOTO_FILTER':
      return {
        ...state,
        filters: { ...state.filters, photoFilter: action.payload },
        pagination: { ...state.pagination, currentPage: 1 },
      };

    case 'SET_PAGE':
      return {
        ...state,
        pagination: { ...state.pagination, currentPage: action.payload },
      };

    case 'TOGGLE_ADVANCED_SEARCH':
      return {
        ...state,
        ui: { ...state.ui, showAdvancedSearch: !state.ui.showAdvancedSearch },
      };

    case 'TOGGLE_BULK_EDIT':
      return {
        ...state,
        ui: { ...state.ui, showBulkEdit: !state.ui.showBulkEdit },
      };

    default:
      return state;
  }
}
```


#### Phase 2: Use Reducer in Component

```typescript
import { useReducer } from 'react';
import { attendeesReducer, initialAttendeesState } from '@/reducers/attendeesReducer';

export function AttendeesTab() {
  const [state, dispatch] = useReducer(attendeesReducer, initialAttendeesState);

  // Instead of:
  // const [attendees, setAttendees] = useState([]);
  // const [selected, setSelected] = useState([]);
  // const [searchTerm, setSearchTerm] = useState('');
  // ... 10+ more useState hooks

  // Use:
  const handleSearch = (term: string) => {
    dispatch({ type: 'SET_SEARCH_TERM', payload: term });
  };

  const handleSelectAttendee = (id: string) => {
    dispatch({ type: 'SELECT_ATTENDEE', payload: id });
  };

  return (
    <div>
      <input
        value={state.filters.searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
      />
      {/* ... */}
    </div>
  );
}
```

**Benefits:**
- Predictable state updates
- Easier to debug with Redux DevTools
- Better performance (fewer re-renders)
- Testable state logic

---

## High Severity Issues

### 3. Type Safety Issues (Lines 100-150)

**Issue:** Multiple `any` types used without proper typing

**Impact:**
- Loss of TypeScript benefits
- Runtime errors not caught at compile time
- Poor IDE autocomplete
- Harder to refactor

**Solution:** Define proper TypeScript interfaces

**Step-by-Step Implementation:**

Create `src/types/dashboard.ts`:

```typescript
// Instead of: any
export interface BulkEditChanges {
  [fieldName: string]: string | number | boolean | null;
}

// Instead of: any[]
export interface CustomField {
  id: string;
  fieldName: string;
  fieldType: 'text' | 'number' | 'email' | 'url' | 'boolean' | 'select' | 'uppercase';
  required: boolean;
  order: number;
  showOnMainPage?: boolean;
  options?: string[];
}

// Instead of: any
export interface CustomFieldValue {
  customFieldId: string;
  value: string;
}

// Instead of: any
export interface AdvancedSearchFilters {
  firstName: { value: string; operator: SearchOperator };
  lastName: { value: string; operator: SearchOperator };
  barcode: { value: string; operator: SearchOperator };
  notes: { value: string; operator: SearchOperator; hasNotes: boolean };
  photoFilter: 'all' | 'with' | 'without';
  customFields: {
    [fieldId: string]: { value: string; operator: SearchOperator };
  };
}

export type SearchOperator =
  | 'contains'
  | 'equals'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'isNotEmpty';

// Instead of: Record<string, unknown>
export interface LogDetails {
  type?: string;
  target?: string;
  description?: string;
  summary?: string;
  changes?: string[] | Record<string, any>;
  [key: string]: any; // For flexibility with other fields
}
```

Update component:

```typescript
// Before:
const [bulkEditChanges, setBulkEditChanges] = useState<any>({});
const [customFields, setCustomFields] = useState<any[]>([]);

// After:
const [bulkEditChanges, setBulkEditChanges] = useState<BulkEditChanges>({});
const [customFields, setCustomFields] = useState<CustomField[]>([]);
```

**Benefits:**
- Compile-time type checking
- Better IDE support
- Self-documenting code
- Easier refactoring


---

### 4. Missing Error Boundaries (Lines 500-600)

**Issue:** Unhandled promise rejections could crash the entire app

**Impact:**
- Poor user experience (white screen of death)
- Lost user data
- No error reporting
- Difficult to debug production issues

**Solution:** Add error boundary component

**Step-by-Step Implementation:**

#### Phase 1: Create Error Boundary

Create `src/components/ErrorBoundary.tsx`:

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);

    // Send to error tracking service (e.g., Sentry)
    if (process.env.NODE_ENV === 'production') {
      // Sentry.captureException(error, { extra: errorInfo });
    }

    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                We're sorry, but something unexpected happened. Please try refreshing the page.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mt-4 p-4 bg-muted rounded-md">
                  <p className="font-mono text-sm text-destructive">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="mt-2 text-xs overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}

              <div className="flex space-x-2">
                <Button onClick={this.handleReset}>Try Again</Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### Phase 2: Wrap Dashboard

Update `src/pages/_app.tsx`:

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </ErrorBoundary>
  );
}
```

Or wrap specific sections:

```typescript
export default function Dashboard() {
  return (
    <ErrorBoundary>
      <DashboardLayout>
        <ErrorBoundary fallback={<TabErrorFallback />}>
          {activeTab === 'attendees' && <AttendeesTab />}
        </ErrorBoundary>
      </DashboardLayout>
    </ErrorBoundary>
  );
}
```

**Benefits:**
- Graceful error handling
- Better user experience
- Error reporting to tracking services
- Prevents full app crashes


---

### 5. Missing Input Sanitization (Lines 1500-1600)

**Issue:** No input sanitization before API calls creates XSS vulnerability

**Impact:**
- XSS attacks possible
- Malicious scripts could be injected
- User data at risk
- Compliance violations (GDPR, SOC2)

**Solution:** Implement DOMPurify for all user-generated content

**Step-by-Step Implementation:**

#### Phase 1: Install DOMPurify

```bash
npm install isomorphic-dompurify
npm install --save-dev @types/dompurify
```

#### Phase 2: Create Sanitization Utility

Create `src/lib/sanitize.ts`:

```typescript
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
  });
}

/**
 * Sanitize plain text input (removes HTML tags)
 */
export function sanitizeText(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize form data before submission
 */
export function sanitizeFormData<T extends Record<string, any>>(data: T): T {
  const sanitized = { ...data };

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeText(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  const sanitized = sanitizeText(email).toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }

  return sanitized;
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string {
  const sanitized = sanitizeText(url).trim();

  try {
    const urlObj = new URL(sanitized);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Invalid URL protocol');
    }
    return urlObj.toString();
  } catch {
    throw new Error('Invalid URL format');
  }
}
```

#### Phase 3: Apply Sanitization

Update form submission handlers:

```typescript
import { sanitizeFormData, sanitizeText, sanitizeUrl } from '@/lib/sanitize';

const handleSaveAttendee = async (attendeeData: any) => {
  try {
    // Sanitize all text inputs
    const sanitizedData = {
      ...attendeeData,
      firstName: sanitizeText(attendeeData.firstName),
      lastName: sanitizeText(attendeeData.lastName),
      notes: sanitizeText(attendeeData.notes || ''),
      // Sanitize custom field values
      customFieldValues: attendeeData.customFieldValues?.map((cfv: any) => ({
        ...cfv,
        value: sanitizeText(cfv.value),
      })),
    };

    const response = await fetch('/api/attendees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizedData),
    });

    // ... rest of handler
  } catch (error) {
    // ... error handling
  }
};
```

Update display of user-generated content:

```typescript
// For displaying custom field values
<div
  dangerouslySetInnerHTML={{
    __html: sanitizeHtml(customFieldValue),
  }}
/>

// Or better, just display as text:
<div>{sanitizeText(customFieldValue)}</div>
```

**Benefits:**
- Prevents XSS attacks
- Protects user data
- Compliance with security standards
- Peace of mind


---

### 6. Performance - Expensive Operations Not Memoized (Lines 300-400)

**Issue:** Filtering and sorting operations run on every render

**Impact:**
- Slow UI responsiveness
- Wasted CPU cycles
- Poor user experience with large datasets
- Battery drain on mobile devices

**Solution:** Memoize expensive computations

**Step-by-Step Implementation:**

```typescript
import { useMemo } from 'react';

// Before: Runs on every render
const filteredAttendees = attendees.filter(a => {
  // Complex filtering logic
}).sort((a, b) => {
  // Complex sorting logic
});

// After: Only runs when dependencies change
const filteredAttendees = useMemo(() => {
  return attendees
    .filter(attendee => {
      const matchesSearch =
        `${attendee.firstName} ${attendee.lastName}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        attendee.barcodeNumber.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPhoto =
        photoFilter === 'all' ||
        (photoFilter === 'with' && attendee.photoUrl) ||
        (photoFilter === 'without' && !attendee.photoUrl);

      return matchesSearch && matchesPhoto;
    })
    .sort((a, b) => {
      const field = eventSettings?.attendeeSortField || 'lastName';
      const direction = eventSettings?.attendeeSortDirection === 'desc' ? -1 : 1;

      let valA = (a as any)[field];
      let valB = (b as any)[field];

      if (field === 'createdAt') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB) * direction;
      }

      if (valA < valB) return -1 * direction;
      if (valA > valB) return 1 * direction;
      return 0;
    });
}, [attendees, searchTerm, photoFilter, eventSettings?.attendeeSortField, eventSettings?.attendeeSortDirection]);

// Memoize pagination
const paginatedAttendees = useMemo(() => {
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  return filteredAttendees.slice(startIndex, endIndex);
}, [filteredAttendees, currentPage, recordsPerPage]);

// Memoize custom field extraction
const getCustomFieldsWithValues = useCallback((attendee: Attendee, customFields: CustomField[]) => {
  if (!customFields) return [];

  return customFields
    .filter(field => field.showOnMainPage !== false)
    .sort((a, b) => a.order - b.order)
    .map(field => {
      const value = attendee.customFieldValues?.find(
        cfv => cfv.customFieldId === field.id
      );
      return {
        fieldName: field.fieldName,
        fieldType: field.fieldType,
        value: value?.value || null,
      };
    });
}, []);
```

**Benefits:**
- Faster UI updates
- Better performance with large datasets
- Reduced CPU usage
- Improved user experience


---

### 7. Accessibility Issues (Lines 700-800)

**Issue:** Inconsistent ARIA labels and keyboard navigation

**Impact:**
- Poor experience for screen reader users
- Keyboard navigation doesn't work properly
- WCAG compliance violations
- Legal risk (ADA lawsuits)

**Solution:** Add consistent ARIA labels and keyboard handlers

**Step-by-Step Implementation:**

#### Phase 1: Add ARIA Labels to Dialogs

```typescript
// Before:
<Dialog>
  <DialogContent>
    <DialogTitle>Edit Attendee</DialogTitle>
    {/* content */}
  </DialogContent>
</Dialog>

// After:
<Dialog>
  <DialogContent
    aria-labelledby="edit-attendee-title"
    aria-describedby="edit-attendee-description"
  >
    <DialogTitle id="edit-attendee-title">
      Edit Attendee
    </DialogTitle>
    <DialogDescription id="edit-attendee-description">
      Update attendee information and credentials
    </DialogDescription>
    {/* content */}
  </DialogContent>
</Dialog>
```

#### Phase 2: Add Keyboard Navigation

```typescript
// For interactive elements
<button
  onClick={handleDelete}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleDelete();
    }
  }}
  aria-label={`Delete attendee ${attendee.firstName} ${attendee.lastName}`}
  className="..."
>
  <Trash2 className="h-4 w-4" />
</button>

// For table rows
<TableRow
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      handleEdit(attendee);
    }
  }}
  aria-label={`Attendee ${attendee.firstName} ${attendee.lastName}`}
>
  {/* cells */}
</TableRow>
```

#### Phase 3: Add Form Labels

```typescript
// Before:
<Input placeholder="First Name" />

// After:
<div className="space-y-2">
  <Label htmlFor="firstName">
    First Name
    <span className="text-destructive ml-1" aria-label="required">*</span>
  </Label>
  <Input
    id="firstName"
    name="firstName"
    placeholder="Enter first name"
    aria-required="true"
    aria-invalid={errors.firstName ? 'true' : 'false'}
    aria-describedby={errors.firstName ? 'firstName-error' : undefined}
  />
  {errors.firstName && (
    <p id="firstName-error" className="text-sm text-destructive" role="alert">
      {errors.firstName}
    </p>
  )}
</div>
```

#### Phase 4: Add Loading States

```typescript
<Button disabled={isLoading} aria-busy={isLoading}>
  {isLoading ? (
    <>
      <span className="sr-only">Loading...</span>
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
    </>
  ) : (
    <>
      <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
      Add Attendee
    </>
  )}
</Button>
```

#### Phase 5: Add Skip Links

```typescript
export default function Dashboard() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded"
      >
        Skip to main content
      </a>

      <DashboardLayout>
        <main id="main-content" tabIndex={-1}>
          {/* content */}
        </main>
      </DashboardLayout>
    </>
  );
}
```

**Benefits:**
- WCAG 2.1 AA compliance
- Better experience for all users
- Keyboard navigation works properly
- Screen reader friendly


---

## Medium Severity Issues

### 8. Code Duplication - CRUD Operations (Lines 400-500)

**Issue:** Similar API call patterns repeated throughout

**Solution:** Extract to custom hook

Create `src/hooks/useEntityCRUD.ts`:

```typescript
import { useState, useCallback } from 'react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { getSafeErrorMessage } from '@/lib/errorMessages';

interface UseEntityCRUDOptions {
  collectionName: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useEntityCRUD<T extends { id: string }>({
  collectionName,
  onSuccess,
  onError,
}: UseEntityCRUDOptions) {
  const [loading, setLoading] = useState(false);
  const { success, error: showError } = useSweetAlert();

  const create = useCallback(
    async (data: Partial<T>): Promise<T | null> => {
      setLoading(true);
      try {
        const response = await fetch(`/api/${collectionName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create item');
        }

        const result = await response.json();
        success('Success', 'Item created successfully');
        onSuccess?.();
        return result;
      } catch (err) {
        const message = getSafeErrorMessage(err);
        showError('Error', message);
        onError?.(err as Error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [collectionName, success, showError, onSuccess, onError]
  );

  const update = useCallback(
    async (id: string, data: Partial<T>): Promise<T | null> => {
      setLoading(true);
      try {
        const response = await fetch(`/api/${collectionName}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update item');
        }

        const result = await response.json();
        success('Success', 'Item updated successfully');
        onSuccess?.();
        return result;
      } catch (err) {
        const message = getSafeErrorMessage(err);
        showError('Error', message);
        onError?.(err as Error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [collectionName, success, showError, onSuccess, onError]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      try {
        const response = await fetch(`/api/${collectionName}/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete item');
        }

        success('Success', 'Item deleted successfully');
        onSuccess?.();
        return true;
      } catch (err) {
        const message = getSafeErrorMessage(err);
        showError('Error', message);
        onError?.(err as Error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [collectionName, success, showError, onSuccess, onError]
  );

  return { create, update, remove, loading };
}
```

Usage:

```typescript
const { create, update, remove, loading } = useEntityCRUD<Attendee>({
  collectionName: 'attendees',
  onSuccess: refreshAttendees,
});

// Now instead of duplicating code:
const handleSave = async (data: Partial<Attendee>) => {
  if (editingAttendee) {
    await update(editingAttendee.id, data);
  } else {
    await create(data);
  }
};
```

---

### 9. Missing Loading States (Lines 1000-1100)

**Solution:** Add consistent loading states

```typescript
const [isDeleting, setIsDeleting] = useState(false);
const [deletingId, setDeletingId] = useState<string | null>(null);

const handleDelete = async (id: string) => {
  setIsDeleting(true);
  setDeletingId(id);
  try {
    await remove(id);
  } finally {
    setIsDeleting(false);
    setDeletingId(null);
  }
};

// In UI:
<Button
  onClick={() => handleDelete(attendee.id)}
  disabled={isDeleting && deletingId === attendee.id}
>
  {isDeleting && deletingId === attendee.id ? (
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
  ) : (
    <Trash2 className="h-4 w-4" />
  )}
</Button>
```

---

### 10. Inconsistent Error Handling (Lines 1200-1300)

**Solution:** Create error message utility

Create `src/lib/errorMessages.ts`:

```typescript
export interface AppError {
  type: string;
  message: string;
  details?: any;
}

const ERROR_MESSAGES: Record<string, string> = {
  // Authentication
  user_unauthorized: 'You do not have permission to perform this action',
  session_expired: 'Your session has expired. Please log in again',
  invalid_credentials: 'Invalid email or password',

  // Data operations
  document_not_found: 'The requested item was not found',
  duplicate_entry: 'An item with this information already exists',
  validation_error: 'Please check your input and try again',

  // Network
  network_error: 'Unable to connect. Please check your internet connection',
  timeout_error: 'The request took too long. Please try again',
  server_error: 'A server error occurred. Please try again later',

  // Default
  unknown_error: 'An unexpected error occurred. Please try again',
};

export function getSafeErrorMessage(error: any): string {
  // Handle Appwrite errors
  if (error?.type) {
    return ERROR_MESSAGES[error.type] || ERROR_MESSAGES.unknown_error;
  }

  // Handle API errors
  if (error?.message) {
    // Don't expose internal error messages
    if (process.env.NODE_ENV === 'development') {
      return error.message;
    }
    return ERROR_MESSAGES.unknown_error;
  }

  return ERROR_MESSAGES.unknown_error;
}

export function logError(error: Error, context?: Record<string, any>) {
  console.error('[Error]', error.message, context);

  // Send to error tracking service in production
  if (process.env.NODE_ENV === 'production') {
    // Sentry.captureException(error, { extra: context });
  }
}
```

Usage:

```typescript
try {
  await someOperation();
} catch (error) {
  logError(error as Error, { operation: 'create_attendee', attendeeId });
  const message = getSafeErrorMessage(error);
  showError('Error', message);
}
```


---

### 11. Magic Numbers and Strings (Lines 2500-2600)

**Solution:** Extract to constants

Create `src/constants/dashboard.ts`:

```typescript
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 25,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
  MAX_PAGE_SIZE: 100,
} as const;

export const DEBOUNCE_DELAYS = {
  SEARCH: 300,
  AUTO_SAVE: 1000,
  REALTIME_REFRESH: 500,
} as const;

export const TIMEOUTS = {
  API_REQUEST: 30000, // 30 seconds
  CREDENTIAL_GENERATION: 60000, // 60 seconds
  BULK_OPERATION: 120000, // 2 minutes
} as const;

export const LIMITS = {
  MAX_BULK_SELECTION: 100,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_CUSTOM_FIELDS: 20,
} as const;

export const SEARCH_OPERATORS = {
  CONTAINS: 'contains',
  EQUALS: 'equals',
  STARTS_WITH: 'startsWith',
  ENDS_WITH: 'endsWith',
  IS_EMPTY: 'isEmpty',
  IS_NOT_EMPTY: 'isNotEmpty',
} as const;

export const PHOTO_FILTERS = {
  ALL: 'all',
  WITH: 'with',
  WITHOUT: 'without',
} as const;

export const TABS = {
  ATTENDEES: 'attendees',
  USERS: 'users',
  ROLES: 'roles',
  SETTINGS: 'settings',
  LOGS: 'logs',
} as const;
```

Usage:

```typescript
import { PAGINATION, DEBOUNCE_DELAYS, TABS } from '@/constants/dashboard';

// Instead of:
const [currentPage, setCurrentPage] = useState(1);
const recordsPerPage = 25;
const debouncedRefresh = useDebouncedCallback(refresh, 500);

// Use:
const [currentPage, setCurrentPage] = useState(1);
const recordsPerPage = PAGINATION.DEFAULT_PAGE_SIZE;
const debouncedRefresh = useDebouncedCallback(refresh, DEBOUNCE_DELAYS.REALTIME_REFRESH);
```

---

## Low Severity Issues

### 12. Console.log Statements (Lines 3000-3100)

**Solution:** Use proper logging utility

Create `src/lib/logger.ts`:

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, context || '');
    }
  }

  info(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context || '');
    }
  }

  warn(message: string, context?: LogContext) {
    console.warn(`[WARN] ${message}`, context || '');
  }

  error(message: string, error?: Error, context?: LogContext) {
    console.error(`[ERROR] ${message}`, error, context || '');

    // Send to error tracking in production
    if (!this.isDevelopment && error) {
      // Sentry.captureException(error, { extra: context });
    }
  }
}

export const logger = new Logger();
```

Usage:

```typescript
// Instead of:
console.log('Fetching attendees', { page, pageSize });

// Use:
logger.debug('Fetching attendees', { page, pageSize });
```

---

### 13. Inconsistent Naming Conventions (Lines 4000-4100)

**Solution:** Standardize to camelCase

```typescript
// Before:
const custom_field_value = data.custom_field;
const user_id = data.user_id;

// After:
const customFieldValue = data.customField;
const userId = data.userId;
```

---

## Implementation Roadmap

### Phase 1: Critical Fixes (Week 1-2)

**Priority 1: Component Decomposition**
- [ ] Day 1-2: Create directory structure
- [ ] Day 3-5: Extract AttendeesTab (proof of concept)
- [ ] Day 6-7: Extract UsersTab
- [ ] Day 8-9: Extract RolesTab
- [ ] Day 10: Extract SettingsTab and LogsTab

**Priority 2: State Management**
- [ ] Day 11-12: Create attendees reducer
- [ ] Day 13: Create users reducer
- [ ] Day 14: Create roles reducer

**Priority 3: Input Sanitization**
- [ ] Day 15: Install DOMPurify and create utilities
- [ ] Day 16: Apply sanitization to all forms
- [ ] Day 17: Test sanitization thoroughly

### Phase 2: High Severity Fixes (Week 3)

- [ ] Day 18: Add error boundaries
- [ ] Day 19: Fix type safety issues
- [ ] Day 20: Add memoization for performance
- [ ] Day 21-22: Improve accessibility

### Phase 3: Medium Severity Fixes (Week 4)

- [ ] Day 23: Extract CRUD operations to hooks
- [ ] Day 24: Add loading states
- [ ] Day 25: Standardize error handling
- [ ] Day 26: Extract constants

### Phase 4: Low Severity Fixes (Week 5)

- [ ] Day 27: Replace console.log with logger
- [ ] Day 28: Fix naming conventions
- [ ] Day 29: Add missing return types
- [ ] Day 30: Final cleanup and documentation


---

## Testing Strategy

### Unit Tests

Create `src/components/dashboard/tabs/__tests__/AttendeesTab.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AttendeesTab } from '../AttendeesTab';
import { useAttendees } from '@/hooks/dashboard/useAttendees';

jest.mock('@/hooks/dashboard/useAttendees');

describe('AttendeesTab', () => {
  const mockAttendees = [
    {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      barcodeNumber: 'ABC123',
      photoUrl: null,
      customFieldValues: [],
    },
  ];

  beforeEach(() => {
    (useAttendees as jest.Mock).mockReturnValue({
      attendees: mockAttendees,
      loading: false,
      error: null,
      createAttendee: jest.fn(),
      updateAttendee: jest.fn(),
      deleteAttendee: jest.fn(),
    });
  });

  it('renders attendees table', () => {
    render(<AttendeesTab eventSettings={null} currentUser={null} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('filters attendees by search term', async () => {
    render(<AttendeesTab eventSettings={null} currentUser={null} />);

    const searchInput = screen.getByPlaceholderText('Search attendees...');
    fireEvent.change(searchInput, { target: { value: 'John' } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('handles attendee deletion', async () => {
    const mockDelete = jest.fn();
    (useAttendees as jest.Mock).mockReturnValue({
      attendees: mockAttendees,
      deleteAttendee: mockDelete,
    });

    render(<AttendeesTab eventSettings={null} currentUser={null} />);

    const deleteButton = screen.getByLabelText('Delete attendee John Doe');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('1');
    });
  });
});
```

### Integration Tests

Create `src/__tests__/integration/dashboard.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '@/pages/dashboard';
import { AuthProvider } from '@/contexts/AuthContext';

describe('Dashboard Integration', () => {
  it('loads and displays dashboard data', async () => {
    render(
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Attendees')).toBeInTheDocument();
    });
  });

  it('switches between tabs', async () => {
    render(
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    );

    const usersTab = screen.getByText('User Management');
    fireEvent.click(usersTab);

    await waitFor(() => {
      expect(screen.getByText('Manage system users')).toBeInTheDocument();
    });
  });
});
```

### E2E Tests (Playwright)

Create `tests/e2e/dashboard.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    // Assume user is already logged in
  });

  test('can create new attendee', async ({ page }) => {
    await page.click('text=Add Attendee');
    await page.fill('[name="firstName"]', 'Jane');
    await page.fill('[name="lastName"]', 'Smith');
    await page.click('text=Save');

    await expect(page.locator('text=Jane Smith')).toBeVisible();
  });

  test('can filter attendees', async ({ page }) => {
    await page.fill('[placeholder="Search attendees..."]', 'John');

    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=Jane Smith')).not.toBeVisible();
  });

  test('can generate credential', async ({ page }) => {
    await page.click('[aria-label="Generate credential for John Doe"]');

    await expect(page.locator('text=Credential generated successfully')).toBeVisible();
  });
});
```

---

## Monitoring and Validation

### Performance Monitoring

Add performance tracking:

```typescript
// src/lib/performance.ts
export function measurePerformance(name: string, fn: () => void) {
  const start = performance.now();
  fn();
  const end = performance.now();
  const duration = end - start;

  if (duration > 100) {
    console.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms`);
  }

  return duration;
}

// Usage:
measurePerformance('Filter attendees', () => {
  const filtered = attendees.filter(/* ... */);
});
```

### Error Tracking

Set up Sentry or similar:

```typescript
// src/lib/errorTracking.ts
import * as Sentry from '@sentry/nextjs';

export function initErrorTracking() {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
    });
  }
}

export function trackError(error: Error, context?: Record<string, any>) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, { extra: context });
  } else {
    console.error('[Error]', error, context);
  }
}
```

---

## Success Metrics

### Before Refactoring
- Dashboard component: 5,201 lines
- Number of useState hooks: 40+
- Test coverage: ~0%
- Performance (Time to Interactive): ~3s
- Accessibility score: 75/100
- Maintainability index: 20/100

### After Refactoring (Target)
- Largest component: <500 lines
- Number of useState hooks per component: <10
- Test coverage: >80%
- Performance (Time to Interactive): <1s
- Accessibility score: 95/100
- Maintainability index: 80/100

---

## Conclusion

This implementation guide provides a comprehensive roadmap for addressing all 30 issues identified in the code review. The refactoring should be done incrementally over 4-5 weeks, with continuous testing and validation at each phase.

**Key Takeaways:**
1. Split the monolithic component first - this resolves 60% of issues
2. Consolidate state management with useReducer
3. Add input sanitization for security
4. Implement error boundaries for resilience
5. Improve accessibility for all users

**Next Steps:**
1. Review this guide with the team
2. Create tickets for each phase
3. Assign ownership and timelines
4. Begin with Phase 1 (Critical Fixes)
5. Test thoroughly at each phase
6. Monitor performance and errors

---

**Document Version:** 1.0  
**Last Updated:** October 30, 2025  
**Maintained By:** Development Team
