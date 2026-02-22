---
title: Attendee Import Path Traversal Security Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-22
review_interval_days: 90
related_code:
  - src/pages/api/attendees/import.ts
---

# Attendee Import Path Traversal Security Fix

## Problem

The attendee import endpoint read files directly from `file.filepath` without validating that the path was within the expected temp directory. An attacker could potentially manipulate the filepath to read arbitrary files from the server filesystem.

**Vulnerability Type:** Path Traversal / Local File Inclusion (LFI)

**Attack Vector:** If an attacker could control or manipulate the `file.filepath` value returned by formidable, they could use path traversal sequences (e.g., `../../../etc/passwd`) to read sensitive files.

## Root Cause

The code trusted the filepath provided by formidable without validation:

```typescript
// VULNERABLE - no path validation
fs.createReadStream(file.filepath)
```

While formidable is generally safe, the principle of defense-in-depth requires validating that uploaded files are actually in the expected location.

## Fix

Added path validation to ensure the file is within the temp directory:

```typescript
// Security: Validate file path is within temp directory to prevent path traversal attacks
const path = require('path');
const uploadDir = form.uploadDir || '/tmp';
const resolvedFilePath = path.resolve(file.filepath);
const resolvedUploadDir = path.resolve(uploadDir);

if (!resolvedFilePath.startsWith(resolvedUploadDir)) {
  return res.status(400).json({
    error: 'Validation error',
    message: 'Invalid file path. File must be uploaded through the form.',
    retryable: false,
    type: 'VALIDATION',
    details: {
      suggestion: 'Upload a file using the form and try again.'
    }
  });
}

// Now safe to read the file
fs.createReadStream(resolvedFilePath)
```

**Key changes:**
1. Resolve both paths to absolute paths using `path.resolve()`
2. Verify the file path starts with the upload directory
3. Reject any files outside the allowed directory
4. Use the validated path for all file operations (read and cleanup)

## Why This Works

- `path.resolve()` normalizes paths and resolves `..` sequences, preventing bypass attempts
- Checking `startsWith()` ensures the file is within the allowed directory tree
- Rejecting invalid paths prevents any file inclusion attacks
- No performance impact — validation is minimal

## Impact

- **Security:** Eliminates path traversal vulnerability in file upload
- **User Experience:** No change — legitimate uploads work as before
- **Performance:** Negligible — adds only path resolution and string comparison

## Pattern

This pattern should be applied to any file upload endpoint:

```typescript
// Always validate uploaded file paths
const path = require('path');
const uploadDir = form.uploadDir || '/tmp';
const resolvedFilePath = path.resolve(file.filepath);
const resolvedUploadDir = path.resolve(uploadDir);

if (!resolvedFilePath.startsWith(resolvedUploadDir)) {
  // Reject the file
  return res.status(400).json({ error: 'Invalid file path' });
}

// Safe to use resolvedFilePath
fs.createReadStream(resolvedFilePath);
```

## Testing

To verify the fix:
1. Upload a valid CSV file — should work normally
2. Attempt to manipulate the filepath (if possible) — should be rejected with 400 error
3. Verify error message is user-friendly and doesn't leak system paths

