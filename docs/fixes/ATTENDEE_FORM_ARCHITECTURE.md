# AttendeeForm Architecture

## Component Hierarchy

```
AttendeeForm (index.tsx)
├── useAttendeeForm Hook
│   ├── Form State Management
│   ├── Barcode Generation
│   ├── Form Validation
│   └── Data Preparation
│
├── useCloudinaryUpload Hook
│   ├── Widget Initialization
│   ├── Upload Configuration
│   └── Upload Handling
│
└── UI Components
    ├── PhotoUploadSection
    │   ├── Photo Preview
    │   ├── Upload Button
    │   └── Remove Button
    │
    ├── BasicInformationSection
    │   ├── First Name Input
    │   ├── Last Name Input
    │   ├── Barcode Input
    │   ├── Generate Button
    │   └── Notes Textarea
    │
    ├── CustomFieldsSection
    │   ├── Text Fields
    │   ├── Number Fields
    │   ├── Email Fields
    │   ├── URL Fields
    │   ├── Date Fields
    │   ├── Select Fields
    │   ├── Checkbox Fields
    │   ├── Boolean Fields
    │   └── Textarea Fields
    │
    └── FormActions
        ├── Cancel Button
        ├── Save Button
        └── Save & Generate Button
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      AttendeeForm                           │
│                                                             │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │ useAttendeeForm  │         │useCloudinaryUpload│        │
│  │                  │         │                   │        │
│  │ • formData       │         │ • isOpen          │        │
│  │ • validateForm   │         │ • openWidget      │        │
│  │ • generateBarcode│         └──────────────────┘        │
│  │ • prepareData    │                 │                    │
│  └──────────────────┘                 │                    │
│          │                            │                    │
│          ├────────────────────────────┼────────────────┐   │
│          │                            │                │   │
│          ▼                            ▼                ▼   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │PhotoUpload   │  │BasicInfo     │  │CustomFields  │    │
│  │Section       │  │Section       │  │Section       │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│                    ┌──────────────┐                        │
│                    │FormActions   │                        │
│                    └──────────────┘                        │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
                             ▼
                    ┌──────────────┐
                    │ Parent       │
                    │ Component    │
                    │ (Dashboard)  │
                    └──────────────┘
```

## State Management

```
┌─────────────────────────────────────────────────────────────┐
│                    Form State (formData)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Basic Fields:                                              │
│  • firstName: string                                        │
│  • lastName: string                                         │
│  • barcodeNumber: string                                    │
│  • notes: string                                            │
│  • photoUrl: string                                         │
│                                                             │
│  Custom Fields:                                             │
│  • customFieldValues: Record<string, string>                │
│    {                                                        │
│      "field-id-1": "value1",                               │
│      "field-id-2": "value2",                               │
│      ...                                                    │
│    }                                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Hook Responsibilities

### useAttendeeForm

```typescript
Input:
  • attendee?: Attendee
  • customFields: CustomField[]
  • eventSettings?: EventSettings

Output:
  • formData: FormData
  • setFormData: (data: FormData) => void
  • generateBarcode: () => Promise<void>
  • validateForm: (attendee?: Attendee) => Promise<boolean>
  • prepareAttendeeData: () => Attendee
  • resetForm: () => void

Responsibilities:
  1. Initialize form state from attendee data
  2. Handle form field updates
  3. Generate unique barcodes
  4. Validate all form fields
  5. Check barcode uniqueness
  6. Prepare data for API submission
  7. Reset form to initial state
```

### useCloudinaryUpload

```typescript
Input:
  • eventSettings?: EventSettings
  • onUploadSuccess: (url: string) => void

Output:
  • isCloudinaryOpen: boolean
  • openUploadWidget: () => void

Responsibilities:
  1. Initialize Cloudinary widget
  2. Configure upload settings
  3. Handle upload success
  4. Handle upload errors
  5. Manage widget open state
```

## Component Props Flow

### PhotoUploadSection
```typescript
Props:
  • photoUrl: string           ← from formData
  • firstName: string          ← from formData
  • lastName: string           ← from formData
  • onUpload: () => void       ← from useCloudinaryUpload
  • onRemove: () => void       ← updates formData

Events:
  • Upload clicked → openUploadWidget()
  • Remove clicked → setFormData({ ...prev, photoUrl: '' })
```

### BasicInformationSection
```typescript
Props:
  • firstName: string          ← from formData
  • lastName: string           ← from formData
  • barcodeNumber: string      ← from formData
  • notes: string              ← from formData
  • isEditMode: boolean        ← from !!attendee
  • eventSettings              ← from parent
  • onFirstNameChange          ← updates formData
  • onLastNameChange           ← updates formData
  • onBarcodeChange            ← updates formData
  • onNotesChange              ← updates formData
  • onGenerateBarcode          ← from useAttendeeForm

Events:
  • Field changed → setFormData({ ...prev, [field]: value })
  • Generate clicked → generateBarcode()
```

### CustomFieldsSection
```typescript
Props:
  • customFields: CustomField[] ← from parent
  • values: Record<string, string> ← from formData.customFieldValues
  • onChange: (fieldId, value) ← updates formData

Events:
  • Field changed → setFormData({
      ...prev,
      customFieldValues: {
        ...prev.customFieldValues,
        [fieldId]: value
      }
    })
```

### FormActions
```typescript
Props:
  • isEditMode: boolean        ← from !!attendee
  • loading: boolean           ← local state
  • loadingAndGenerate: boolean ← local state
  • showGenerateButton: boolean ← from !!attendee && !!onSaveAndGenerate
  • onCancel: () => void       ← from parent
  • onSaveAndGenerate          ← from parent

Events:
  • Cancel clicked → onClose()
  • Save clicked → handleSubmit()
  • Save & Generate clicked → handleSaveAndGenerate()
```

## Validation Flow

```
User Submits Form
       │
       ▼
┌──────────────────┐
│ validateForm()   │
└──────────────────┘
       │
       ├─► Check required fields (firstName, lastName, barcode)
       │   └─► Error if missing
       │
       ├─► Check required custom fields
       │   └─► Error if missing
       │
       └─► Check barcode uniqueness
           │
           ├─► Skip if editing with same barcode
           │
           └─► API call: /api/attendees/check-barcode
               │
               ├─► Barcode exists → Error
               │
               └─► Barcode unique → Continue
                   │
                   ▼
           ┌──────────────────┐
           │ prepareData()    │
           └──────────────────┘
                   │
                   ▼
           ┌──────────────────┐
           │ onSave(data)     │
           └──────────────────┘
```

## Barcode Generation Flow

```
User Clicks Generate
       │
       ▼
┌──────────────────────┐
│ generateBarcode()    │
└──────────────────────┘
       │
       ▼
┌──────────────────────┐
│ Generate random      │
│ barcode based on     │
│ event settings       │
└──────────────────────┘
       │
       ▼
┌──────────────────────┐
│ Check uniqueness     │
│ via API              │
└──────────────────────┘
       │
       ├─► Unique? → Set barcode
       │
       └─► Duplicate? → Retry (max 10 times)
           │
           ├─► Success → Set barcode
           │
           └─► All retries failed → Show error
```

## Photo Upload Flow

```
User Clicks Upload
       │
       ▼
┌──────────────────────┐
│ openUploadWidget()   │
└──────────────────────┘
       │
       ▼
┌──────────────────────┐
│ Cloudinary Widget    │
│ Opens                │
└──────────────────────┘
       │
       ├─► User selects photo
       │   │
       │   ▼
       │   ┌──────────────────┐
       │   │ Crop & Edit      │
       │   └──────────────────┘
       │   │
       │   ▼
       │   ┌──────────────────┐
       │   │ Upload to        │
       │   │ Cloudinary       │
       │   └──────────────────┘
       │   │
       │   ▼
       │   ┌──────────────────┐
       │   │ onUploadSuccess  │
       │   │ (url)            │
       │   └──────────────────┘
       │   │
       │   ▼
       │   ┌──────────────────┐
       │   │ setFormData({    │
       │   │   photoUrl: url  │
       │   │ })               │
       │   └──────────────────┘
       │
       └─► User cancels → Close widget
```

## File Structure

```
src/
├── hooks/
│   ├── useAttendeeForm.ts          (250 lines)
│   │   ├── Form state management
│   │   ├── Barcode generation
│   │   ├── Validation logic
│   │   └── Data preparation
│   │
│   └── useCloudinaryUpload.ts      (130 lines)
│       ├── Widget initialization
│       ├── Upload configuration
│       └── Event handling
│
└── components/
    └── AttendeeForm/
        ├── index.tsx                (230 lines)
        │   ├── Main orchestrator
        │   ├── Dialog wrapper
        │   ├── Form submission
        │   └── Component composition
        │
        ├── PhotoUploadSection.tsx   (60 lines)
        │   ├── Photo preview
        │   ├── Upload button
        │   └── Remove button
        │
        ├── BasicInformationSection.tsx (120 lines)
        │   ├── Name fields
        │   ├── Barcode field
        │   └── Notes field
        │
        ├── CustomFieldsSection.tsx  (180 lines)
        │   ├── Field type rendering
        │   ├── Field icons
        │   └── Field validation
        │
        └── FormActions.tsx          (50 lines)
            ├── Cancel button
            ├── Save button
            └── Save & Generate button
```

## Benefits Summary

### Separation of Concerns
- ✅ Logic separated from UI
- ✅ Each component has single responsibility
- ✅ Hooks encapsulate complex logic
- ✅ Easy to understand and modify

### Testability
- ✅ Hooks testable in isolation
- ✅ Components testable independently
- ✅ Easy to mock dependencies
- ✅ Clear test boundaries

### Reusability
- ✅ Hooks reusable across components
- ✅ UI components reusable
- ✅ Easy to create similar forms
- ✅ Modular architecture

### Maintainability
- ✅ Small, focused files
- ✅ Clear responsibilities
- ✅ Easy to locate code
- ✅ Reduced coupling

---

**Architecture Version:** 2.0
**Date:** October 27, 2025
**Status:** Production Ready
