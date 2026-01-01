---
title: "Custom Field Internal Names Implementation"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/pages/api/custom-fields/"]
---

# Custom Field Internal Names Implementation

## Summary

Implemented `customFieldValuesByInternalName` mapping in mobile API endpoints to fix the discrepancy between approval profile field references and mobile app data structure.

## Problem Solved

**Before**: Approval profiles referenced custom fields using internal names (e.g., `customFieldValues.vip_room`), but the mobile API only provided field IDs and display names, causing rule evaluation to fail.

**After**: Mobile API now provides three custom field mapping formats:
1. `customFieldValues` - Field IDs as keys (backward compatibility)
2. `customFieldValuesByName` - Display names as keys (for UI display)
3. `customFieldValuesByInternalName` - Internal names as keys (for approval profile rules) ✨ NEW

## Files Modified

### 1. Mobile Sync Attendees API
**File**: `src/pages/api/mobile/sync/attendees.ts`

**Changes**:
- Added `customFieldInternalMap` to map field IDs to internal names
- Added `customFieldValuesByInternalName` to response object
- Updated custom field fetching to include internal name mapping

**Impact**: All attendee sync operations now include internal name mappings

### 2. Mobile Debug Attendee API (Query Parameter)
**File**: `src/pages/api/mobile/debug/attendee.ts`

**Changes**:
- Added `customFieldInternalMap` for internal name mapping
- Added `customFieldValuesByInternalName` to response object
- Updated API documentation to reflect new field

**Impact**: Debug endpoint now provides all three mapping formats

### 3. Mobile Debug Attendee API (Dynamic Route)
**File**: `src/pages/api/mobile/debug/attendee/[barcode].ts`

**Changes**:
- Added `fieldInternalMap` for internal name mapping
- Added `customFieldValues` and `customFieldValuesByInternalName` to response
- Updated response format documentation

**Impact**: Barcode lookup endpoint now provides all three mapping formats

### 4. Test Suite
**File**: `src/__tests__/api/mobile/custom-field-internal-names.test.ts` (NEW)

**Coverage**:
- Data structure verification
- Approval profile rule compatibility
- Three mapping format consistency
- Edge case handling (missing internal names, empty values)

**Results**: All 7 tests passing ✅

## API Response Format

### Before
```json
{
  "customFieldValues": {
    "field-abc123": "Gold"
  },
  "customFieldValuesByName": {
    "VIP Room": "Gold"
  }
}
```

### After
```json
{
  "customFieldValues": {
    "field-abc123": "Gold"
  },
  "customFieldValuesByName": {
    "VIP Room": "Gold"
  },
  "customFieldValuesByInternalName": {
    "vip_room": "Gold"
  }
}
```

## Mobile App Integration Guide

### Step 1: Update Attendee Cache Structure

When caching attendee data from the sync API, use `customFieldValuesByInternalName` for the `customFieldValues` field:

```typescript
// Mobile app caching logic
const cachedAttendee: CachedAttendee = {
  id: attendee.id,
  firstName: attendee.firstName,
  lastName: attendee.lastName,
  barcodeNumber: attendee.barcodeNumber,
  photoUrl: attendee.photoUrl,
  customFieldValues: attendee.customFieldValuesByInternalName, // ✨ Use internal names
  accessEnabled: attendee.accessControl.accessEnabled,
  validFrom: attendee.accessControl.validFrom,
  validUntil: attendee.accessControl.validUntil
};
```

### Step 2: Verify Approval Profile Rule Evaluation

Approval profile rules will now work correctly:

```typescript
// Approval profile rule
{
  "field": "customFieldValues.vip_room",
  "operator": "equals",
  "value": "Gold"
}

// Cached attendee (after Step 1)
{
  "customFieldValues": {
    "vip_room": "Gold"  // ✅ Matches rule field path
  }
}

// Rule evaluation (existing rule engine)
const value = getFieldValue(attendee, "customFieldValues.vip_room");
// Returns: "Gold" ✅
```

### Step 3: Keep Display Names for UI

Continue using `customFieldValuesByName` for displaying custom field values in the UI:

```typescript
// For displaying in UI
const displayValue = attendee.customFieldValuesByName["VIP Room"];
// Shows: "Gold"
```

## Backward Compatibility

✅ **Fully backward compatible** - No breaking changes

- Old mobile app versions will continue to work (they ignore the new field)
- New mobile app versions can use the new field immediately
- All three mapping formats are provided in every response

## Testing

### Unit Tests
```bash
npx vitest --run src/__tests__/api/mobile/custom-field-internal-names.test.ts
```

**Results**: 7/7 tests passing ✅

### Integration Testing Checklist

- [ ] Test approval profile rule evaluation with custom fields
- [ ] Test mobile app sync with new field mapping
- [ ] Test backward compatibility with old mobile app versions
- [ ] Test edge cases (missing internal names, empty values)
- [ ] Test with various custom field types (text, select, boolean, etc.)

## Benefits

1. **Fixes Approval Profile Rules**: Custom field rules now work correctly in mobile app
2. **Maintains Consistency**: Aligns with template system (Switchboard, OneSimpleAPI)
3. **Backward Compatible**: No breaking changes for existing mobile apps
4. **Flexible**: Provides all three naming formats for different use cases
5. **Future-Proof**: Supports any custom field naming scenario

## Related Documentation

- Analysis: `docs/fixes/CUSTOM_FIELD_NAMING_DISCREPANCY_ANALYSIS.md`
- Mobile Access Control Spec: `.kiro/specs/mobile-access-control/`
- Rule Engine: `src/lib/ruleEngine.ts`
- Approval Profile Types: `src/types/approvalProfile.ts`

## Next Steps

### For Backend (Complete ✅)
- [x] Add `customFieldValuesByInternalName` to mobile sync API
- [x] Add `customFieldValuesByInternalName` to debug APIs
- [x] Create unit tests
- [x] Update API documentation

### For Mobile App (Pending)
- [ ] Update attendee caching to use `customFieldValuesByInternalName`
- [ ] Test approval profile rule evaluation
- [ ] Verify backward compatibility
- [ ] Deploy mobile app update

### For Testing (Pending)
- [ ] Integration tests with real approval profiles
- [ ] End-to-end testing with mobile app
- [ ] Performance testing with large datasets

## Deployment Notes

### Backend Deployment
1. Deploy backend changes (no database migrations needed)
2. Verify API responses include new field
3. Monitor for any errors in logs

### Mobile App Deployment
1. Update mobile app to use new field
2. Test thoroughly in staging environment
3. Deploy mobile app update
4. Monitor approval profile rule evaluation

### Rollback Plan
If issues occur:
1. Mobile app can continue using old field structure (backward compatible)
2. Backend changes are additive only (no breaking changes)
3. No database rollback needed

## Performance Impact

**Minimal** - The changes add:
- One additional Map creation per request (~O(n) where n = number of custom fields)
- One additional object in response (~few KB per attendee)
- No additional database queries

**Estimated overhead**: < 1ms per request, < 5KB per attendee

## Security Considerations

✅ No security impact:
- Uses existing authentication and authorization
- No new data exposure (internal names are already in custom fields API)
- No changes to permission checks

## Conclusion

The implementation successfully resolves the custom field naming discrepancy by providing internal name mappings in the mobile API. This enables approval profile rules to work correctly while maintaining full backward compatibility.

**Status**: Backend implementation complete ✅  
**Next**: Mobile app integration required
