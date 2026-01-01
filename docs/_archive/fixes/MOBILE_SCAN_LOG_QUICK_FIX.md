# Quick Fix: localId Type Error

## The Problem
```
Expected string, received number
```

The mobile app is sending `localId` as a **number** instead of a **string**.

## The Solution

### Change This:
```typescript
const localId = Date.now(); // ❌ Number: 1733529613265
```

### To This:
```typescript
const localId = Date.now().toString(); // ✅ String: "1733529613265"
```

## One-Line Fix

Wherever you generate `localId`, add `.toString()`:

```typescript
// Before
localId: Date.now()

// After
localId: Date.now().toString()
```

## Or Use UUID

```typescript
import { v4 as uuidv4 } from 'uuid';

const localId = uuidv4(); // ✅ Always a string
```

## Verify the Fix

```typescript
console.log(typeof log.localId); // Should print: "string"
```

If it prints `"number"`, you still have the issue.

## That's It!

Once `localId` is a string, the upload will work.
