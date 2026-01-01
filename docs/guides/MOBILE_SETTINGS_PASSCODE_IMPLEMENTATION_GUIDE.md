---
title: "Mobile Settings Passcode Implementation Guide"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/pages/api/mobile/"]
---

# Mobile Settings Passcode Implementation Guide

## Overview

This guide provides comprehensive documentation for implementing the mobile settings passcode feature in the credential.studio mobile app. The passcode provides an additional security layer for the mobile app's settings menu, ensuring only authorized staff can modify mobile app configurations.

## Feature Summary

- 4-digit numerical passcode protection for mobile app settings menu
- Optional feature (can be disabled by setting to null)
- Configured by administrators through the web application
- Retrieved via the Mobile Event Info API
- Enforced client-side in the mobile application

## API Integration

### Endpoint Details

**Endpoint:** `GET /api/mobile/event-info`

**Base URL:** Your credential.studio instance URL (e.g., `https://your-domain.com`)

**Full URL:** `https://your-domain.com/api/mobile/event-info`

**Method:** GET

**Authentication:** Required - Session-based authentication using Appwrite session token

**Headers:**
```http
Content-Type: application/json
```


### Authentication Requirements

The mobile app must be authenticated with a valid Appwrite session before calling this endpoint. The session is established during the login process and maintained throughout the app lifecycle.

**Authentication Flow:**
1. User logs in via mobile app
2. Appwrite creates a session
3. Session token is stored securely in the mobile app
4. Session token is automatically included in API requests by Appwrite SDK

**Session Management:**
- Sessions are managed by Appwrite SDK
- No manual token handling required
- Session expires based on Appwrite configuration
- App should handle session expiration gracefully

### Response Structure

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "eventName": "Tech Conference 2025",
    "eventDate": "2025-07-15T00:00:00.000Z",
    "eventLocation": "Convention Center",
    "eventTime": "9:00 AM",
    "timeZone": "America/New_York",
    "mobileSettingsPasscode": "1234",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```


**Success Response (No Passcode Set):**

```json
{
  "success": true,
  "data": {
    "eventName": "Tech Conference 2025",
    "eventDate": "2025-07-15T00:00:00.000Z",
    "eventLocation": "Convention Center",
    "eventTime": "9:00 AM",
    "timeZone": "America/New_York",
    "mobileSettingsPasscode": null,
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### Response Field Descriptions

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `success` | boolean | Indicates if the request was successful | Yes |
| `data` | object | Container for event information | Yes |
| `data.eventName` | string | Name of the event | Yes |
| `data.eventDate` | string \| null | ISO 8601 date string of the event | No |
| `data.eventLocation` | string \| null | Physical location of the event | No |
| `data.eventTime` | string \| null | Time of the event (human-readable) | No |
| `data.timeZone` | string \| null | IANA timezone identifier | No |
| `data.mobileSettingsPasscode` | string \| null | 4-digit passcode or null if disabled | Yes |
| `data.updatedAt` | string | ISO 8601 timestamp of last update | Yes |


**Important Notes:**
- `mobileSettingsPasscode` is ALWAYS present in the response (never undefined)
- When passcode protection is disabled, the value is `null`
- When passcode protection is enabled, the value is a 4-digit string (e.g., "1234")
- Leading zeros are preserved (e.g., "0123" is valid)
- The field is always a string when set, never a number

### Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

**404 Not Found:**
```json
{
  "error": "Event settings not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "message": "Failed to retrieve event information"
}
```

## Implementation Requirements

### 1. Fetch Event Information on App Launch

The mobile app should fetch event information when the app launches or when the user logs in.


**Pseudo-code Example:**

```typescript
// On app launch or login
async function initializeApp() {
  try {
    // Fetch event information
    const response = await fetch('/api/mobile/event-info', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch event info');
    }

    const { data } = await response.json();
    
    // Store passcode in app state
    setMobileSettingsPasscode(data.mobileSettingsPasscode);
    
    // Store other event information as needed
    setEventInfo(data);
    
  } catch (error) {
    console.error('Error fetching event info:', error);
    // Handle error appropriately
  }
}
```

**Best Practices:**
- Fetch on app launch to ensure fresh data
- Cache the passcode value in secure storage
- Refresh periodically or when app returns to foreground
- Handle network errors gracefully


### 2. Protect Settings Menu Access

When the user attempts to access the settings menu, check if a passcode is required.

**Pseudo-code Example:**

```typescript
function openSettingsMenu() {
  const passcode = getMobileSettingsPasscode();
  
  if (passcode === null) {
    // No passcode protection - open settings directly
    navigateToSettings();
  } else {
    // Passcode protection enabled - show passcode prompt
    showPasscodePrompt(passcode);
  }
}

function showPasscodePrompt(correctPasscode: string) {
  // Show UI for entering 4-digit code
  const userInput = await promptForPasscode();
  
  if (validatePasscode(userInput, correctPasscode)) {
    // Correct passcode - grant access
    navigateToSettings();
  } else {
    // Incorrect passcode - show error
    showError('Incorrect passcode. Please try again.');
    // Optionally: track failed attempts
  }
}

function validatePasscode(userInput: string, correctPasscode: string): boolean {
  // Simple string comparison
  return userInput === correctPasscode;
}
```


### 3. Passcode Input UI/UX

**Recommended UI Design:**

1. **Input Method:**
   - 4 separate input boxes (one per digit)
   - Numerical keyboard only
   - Auto-advance to next box after digit entry
   - Backspace support to go back

2. **Visual Feedback:**
   - Show dots/asterisks for entered digits (security)
   - Highlight active input box
   - Clear visual indication of which digit is being entered

3. **User Actions:**
   - Clear button to reset all inputs
   - Submit button or auto-submit after 4 digits
   - Cancel button to return to previous screen

4. **Error Handling:**
   - Clear error message for incorrect passcode
   - Shake animation or red highlight on error
   - Clear inputs after error for retry

**Example UI Flow:**

```
┌─────────────────────────────┐
│   Enter Settings Passcode   │
├─────────────────────────────┤
│                             │
│   ┌───┐ ┌───┐ ┌───┐ ┌───┐  │
│   │ ● │ │ ● │ │ ● │ │   │  │
│   └───┘ └───┘ └───┘ └───┘  │
│                             │
│   [Clear]        [Cancel]   │
└─────────────────────────────┘
```


## User Experience Guidelines

### Passcode Entry Experience

1. **First-Time Experience:**
   - Show brief explanation of why passcode is required
   - "This event requires a passcode to access settings"
   - Don't overwhelm with too much text

2. **Repeat Access:**
   - Consider session-based authentication
   - Don't ask for passcode every time if recently authenticated
   - Cache successful authentication for reasonable duration (e.g., 15 minutes)

3. **Failed Attempts:**
   - Limit to 3-5 attempts before timeout
   - Implement exponential backoff (e.g., 30s, 1m, 5m)
   - Clear, friendly error messages
   - Don't reveal if passcode is close to correct

4. **Accessibility:**
   - Support VoiceOver/TalkBack for screen readers
   - Large touch targets for input boxes
   - High contrast mode support
   - Haptic feedback on error

### Security Considerations

1. **Passcode Storage:**
   - Store in secure storage (Keychain on iOS, Keystore on Android)
   - Never log passcode values
   - Clear from memory when app backgrounds
   - Encrypt if storing in local database


2. **Input Validation:**
   - Accept only numerical digits (0-9)
   - Enforce exactly 4 digits
   - Trim whitespace if pasted
   - Prevent copy/paste of entered passcode (security)

3. **Attempt Limiting:**
   - Track failed attempts locally
   - Implement timeout after multiple failures
   - Consider exponential backoff
   - Reset counter after successful authentication

4. **Session Management:**
   - Cache successful authentication temporarily
   - Clear cache when app backgrounds
   - Re-authenticate after timeout period
   - Consider biometric authentication as alternative

## Validation Rules

### Passcode Format

- **Length:** Exactly 4 digits
- **Characters:** Numerical digits only (0-9)
- **Leading Zeros:** Preserved (e.g., "0123" is valid)
- **Type:** String (not number)

**Validation Examples:**

```typescript
function isValidPasscodeFormat(passcode: string): boolean {
  // Must be exactly 4 digits
  const regex = /^[0-9]{4}$/;
  return regex.test(passcode);
}

// Valid passcodes
isValidPasscodeFormat("1234") // true
isValidPasscodeFormat("0000") // true
isValidPasscodeFormat("0123") // true
isValidPasscodeFormat("9999") // true

// Invalid passcodes
isValidPasscodeFormat("123")   // false - too short
isValidPasscodeFormat("12345") // false - too long
isValidPasscodeFormat("12a4")  // false - contains letter
isValidPasscodeFormat("12 4")  // false - contains space
```


## Error Handling Scenarios

### 1. Network Errors

**Scenario:** Unable to fetch event information due to network issues

**Handling:**
```typescript
try {
  const response = await fetch('/api/mobile/event-info');
  // ... handle response
} catch (error) {
  if (error.name === 'NetworkError' || !navigator.onLine) {
    // Use cached passcode if available
    const cachedPasscode = getCachedPasscode();
    if (cachedPasscode !== undefined) {
      setMobileSettingsPasscode(cachedPasscode);
      showToast('Using offline data');
    } else {
      showError('Unable to connect. Please check your internet connection.');
    }
  }
}
```

**Best Practice:**
- Cache last known passcode value
- Allow offline access if passcode was previously validated
- Sync when connection restored
- Show clear offline indicator

### 2. Authentication Errors

**Scenario:** Session expired or invalid

**Handling:**
```typescript
if (response.status === 401) {
  // Session expired - redirect to login
  clearSession();
  navigateToLogin();
  showMessage('Your session has expired. Please log in again.');
}
```


### 3. Missing Passcode Field

**Scenario:** API response doesn't include passcode field (backward compatibility)

**Handling:**
```typescript
const { data } = await response.json();

// Check if field exists
if (!('mobileSettingsPasscode' in data)) {
  // Field missing - treat as no passcode protection
  console.warn('mobileSettingsPasscode field missing from API response');
  setMobileSettingsPasscode(null);
} else {
  setMobileSettingsPasscode(data.mobileSettingsPasscode);
}
```

**Best Practice:**
- Gracefully handle missing field
- Default to no protection (null)
- Log warning for debugging
- Don't break app functionality

### 4. Passcode Changed While App Running

**Scenario:** Administrator changes passcode while mobile app is active

**Handling:**
```typescript
// Refresh event info periodically
setInterval(async () => {
  const { data } = await fetchEventInfo();
  
  if (data.mobileSettingsPasscode !== currentPasscode) {
    // Passcode changed - update and require re-authentication
    setMobileSettingsPasscode(data.mobileSettingsPasscode);
    clearAuthenticationCache();
    showToast('Settings passcode has been updated');
  }
}, 5 * 60 * 1000); // Check every 5 minutes
```


### 5. Passcode Removed by Administrator

**Scenario:** Administrator disables passcode protection

**Handling:**
```typescript
// On next API call
const { data } = await fetchEventInfo();

if (data.mobileSettingsPasscode === null && currentPasscode !== null) {
  // Passcode removed - disable protection
  setMobileSettingsPasscode(null);
  clearAuthenticationCache();
  showToast('Settings passcode has been removed');
}
```

**Best Practice:**
- Automatically disable protection when passcode is null
- Clear any cached authentication
- Notify user of change
- Allow immediate access to settings

## Edge Cases

### 1. Rapid Passcode Changes

**Issue:** Administrator changes passcode multiple times quickly

**Solution:**
- Always use latest value from API
- Invalidate cached authentication on change
- Require re-authentication with new passcode

### 2. App Backgrounding During Entry

**Issue:** User backgrounds app while entering passcode

**Solution:**
- Clear entered digits when app returns to foreground
- Require fresh entry for security
- Don't persist partial entry


### 3. Multiple Failed Attempts

**Issue:** User repeatedly enters wrong passcode

**Solution:**
```typescript
let failedAttempts = 0;
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 60000; // 1 minute

function handleFailedAttempt() {
  failedAttempts++;
  
  if (failedAttempts >= MAX_ATTEMPTS) {
    // Lock out user temporarily
    const lockoutUntil = Date.now() + LOCKOUT_DURATION;
    setLockoutTime(lockoutUntil);
    showError(`Too many failed attempts. Try again in 1 minute.`);
  } else {
    const remaining = MAX_ATTEMPTS - failedAttempts;
    showError(`Incorrect passcode. ${remaining} attempts remaining.`);
  }
}

function handleSuccessfulAttempt() {
  // Reset counter on success
  failedAttempts = 0;
  clearLockoutTime();
}
```

### 4. Biometric Authentication Alternative

**Enhancement:** Offer biometric authentication as alternative to passcode

**Implementation:**
```typescript
async function openSettingsMenu() {
  const passcode = getMobileSettingsPasscode();
  
  if (passcode === null) {
    navigateToSettings();
    return;
  }
  
  // Check if biometric is available and enabled
  const biometricAvailable = await checkBiometricAvailability();
  
  if (biometricAvailable && userPrefersBiometric()) {
    const biometricSuccess = await authenticateWithBiometric();
    if (biometricSuccess) {
      navigateToSettings();
    } else {
      // Fall back to passcode
      showPasscodePrompt(passcode);
    }
  } else {
    showPasscodePrompt(passcode);
  }
}
```


## Security Best Practices

### 1. Secure Storage

**iOS (Keychain):**
```swift
// Store passcode securely
let keychain = KeychainSwift()
keychain.set(passcode, forKey: "mobileSettingsPasscode")

// Retrieve passcode
let passcode = keychain.get("mobileSettingsPasscode")
```

**Android (Keystore):**
```kotlin
// Store passcode securely
val sharedPreferences = getSharedPreferences("secure_prefs", Context.MODE_PRIVATE)
val editor = sharedPreferences.edit()
editor.putString("mobileSettingsPasscode", passcode)
editor.apply()
```

### 2. Memory Management

- Clear passcode from memory when not needed
- Don't store in plain text variables longer than necessary
- Overwrite sensitive data before releasing memory
- Use secure string types if available

### 3. Logging and Debugging

**DO NOT:**
- Log passcode values
- Include passcode in error messages
- Display passcode in debug output
- Store passcode in crash reports

**DO:**
- Log authentication attempts (success/failure)
- Log passcode changes (not the value)
- Track security events
- Monitor for suspicious activity


### 4. Input Security

- Disable screenshot capability on passcode screen
- Prevent screen recording during entry
- Clear clipboard after paste (if allowed)
- Use secure text entry fields
- Implement anti-tampering measures

### 5. Network Security

- Always use HTTPS for API calls
- Validate SSL certificates
- Implement certificate pinning if possible
- Handle man-in-the-middle attack scenarios
- Timeout stale connections

## Testing Checklist

### Functional Tests

- [ ] Passcode prompt appears when passcode is set
- [ ] Settings open directly when passcode is null
- [ ] Correct passcode grants access
- [ ] Incorrect passcode shows error
- [ ] Can retry after incorrect attempt
- [ ] Passcode input accepts only numerical digits
- [ ] Passcode input limited to 4 digits
- [ ] Clear button resets input
- [ ] Cancel button returns to previous screen

### Integration Tests

- [ ] API returns passcode correctly when set
- [ ] API returns null correctly when not set
- [ ] App handles API errors gracefully
- [ ] App handles network errors gracefully
- [ ] Cached passcode works offline
- [ ] Passcode updates when changed by admin
- [ ] Protection disables when passcode removed


### Security Tests

- [ ] Passcode not logged or exposed
- [ ] Passcode stored securely in device
- [ ] Passcode input masked (dots/asterisks)
- [ ] Attempt limiting works correctly
- [ ] Lockout timer functions properly
- [ ] Biometric fallback works (if implemented)
- [ ] Screenshot disabled on passcode screen
- [ ] Memory cleared after authentication

### Edge Case Tests

- [ ] App handles missing passcode field
- [ ] App handles malformed API response
- [ ] App handles rapid passcode changes
- [ ] App handles backgrounding during entry
- [ ] App handles session expiration
- [ ] App handles offline mode
- [ ] App handles passcode removal
- [ ] App handles multiple failed attempts

### User Experience Tests

- [ ] UI is intuitive and easy to use
- [ ] Error messages are clear and helpful
- [ ] Loading states are shown appropriately
- [ ] Animations are smooth
- [ ] Keyboard appears automatically
- [ ] Focus management works correctly
- [ ] Accessibility features work (VoiceOver/TalkBack)
- [ ] High contrast mode supported


## Example API Requests and Responses

### Example 1: Successful Request with Passcode

**Request:**
```http
GET /api/mobile/event-info HTTP/1.1
Host: your-domain.com
Content-Type: application/json
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "eventName": "Annual Tech Summit 2025",
    "eventDate": "2025-08-20T00:00:00.000Z",
    "eventLocation": "San Francisco Convention Center",
    "eventTime": "8:00 AM",
    "timeZone": "America/Los_Angeles",
    "mobileSettingsPasscode": "5678",
    "updatedAt": "2025-07-15T14:30:00.000Z"
  }
}
```

### Example 2: Successful Request without Passcode

**Request:**
```http
GET /api/mobile/event-info HTTP/1.1
Host: your-domain.com
Content-Type: application/json
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "eventName": "Community Meetup",
    "eventDate": "2025-09-10T00:00:00.000Z",
    "eventLocation": "Local Community Center",
    "eventTime": "6:00 PM",
    "timeZone": "America/New_York",
    "mobileSettingsPasscode": null,
    "updatedAt": "2025-07-15T10:00:00.000Z"
  }
}
```


### Example 3: Unauthorized Request

**Request:**
```http
GET /api/mobile/event-info HTTP/1.1
Host: your-domain.com
Content-Type: application/json
```

**Response:**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### Example 4: Event Settings Not Found

**Request:**
```http
GET /api/mobile/event-info HTTP/1.1
Host: your-domain.com
Content-Type: application/json
```

**Response:**
```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "Event settings not found"
}
```

## Implementation Timeline

### Phase 1: Basic Implementation (Week 1)
- Integrate API call to fetch event information
- Store passcode in app state
- Implement basic passcode prompt UI
- Add passcode validation logic

### Phase 2: Enhanced UX (Week 2)
- Improve passcode input UI (4 separate boxes)
- Add animations and visual feedback
- Implement attempt limiting
- Add error handling and retry logic


### Phase 3: Security & Polish (Week 3)
- Implement secure storage (Keychain/Keystore)
- Add session-based authentication caching
- Implement offline support
- Add biometric authentication option (optional)

### Phase 4: Testing & Refinement (Week 4)
- Comprehensive testing (functional, security, edge cases)
- User acceptance testing
- Performance optimization
- Bug fixes and refinements

## Support and Troubleshooting

### Common Issues

**Issue 1: Passcode field is undefined**
- **Cause:** API response doesn't include the field
- **Solution:** Check API version, ensure backend is updated
- **Workaround:** Default to null if field missing

**Issue 2: Passcode not updating when changed**
- **Cause:** App not refreshing event information
- **Solution:** Implement periodic refresh or pull-to-refresh
- **Workaround:** Force user to restart app

**Issue 3: Authentication cache not clearing**
- **Cause:** Cache not invalidated on passcode change
- **Solution:** Clear cache when passcode value changes
- **Workaround:** Reduce cache duration

**Issue 4: Offline mode not working**
- **Cause:** Passcode not cached locally
- **Solution:** Implement secure local caching
- **Workaround:** Require online connection for first access


### Getting Help

For questions or issues during implementation:

1. **Check API Response:** Verify the API returns expected structure
2. **Review Authentication:** Ensure session is valid and active
3. **Test Both Scenarios:** Test with passcode enabled and disabled
4. **Check Logs:** Review app logs for errors or warnings
5. **Contact Backend Team:** If API behavior differs from documentation

### Backend Team Contact

- Review the design document: `.kiro/specs/mobile-settings-passcode/design.md`
- Check implementation tasks: `.kiro/specs/mobile-settings-passcode/tasks.md`
- Review test results: `docs/testing/MOBILE_SETTINGS_PASSCODE_TESTS_SUMMARY.md`

## Appendix

### A. Passcode Format Specification

- **Type:** String
- **Length:** Exactly 4 characters
- **Characters:** Numerical digits (0-9)
- **Leading Zeros:** Preserved
- **Null Value:** Indicates no passcode protection
- **Validation Regex:** `/^[0-9]{4}$/`

### B. API Response Schema

```typescript
interface EventInfoResponse {
  success: boolean;
  data: {
    eventName: string;
    eventDate: string | null;
    eventLocation: string | null;
    eventTime: string | null;
    timeZone: string | null;
    mobileSettingsPasscode: string | null;
    updatedAt: string;
  };
}
```


### C. Security Recommendations Summary

1. **Storage:** Use platform-specific secure storage (Keychain/Keystore)
2. **Memory:** Clear sensitive data from memory when not needed
3. **Logging:** Never log passcode values
4. **Input:** Mask passcode input, disable screenshots
5. **Network:** Use HTTPS, validate certificates
6. **Attempts:** Limit failed attempts, implement lockout
7. **Session:** Cache authentication temporarily, clear on background
8. **Biometric:** Consider as alternative authentication method

### D. Accessibility Guidelines

1. **Screen Readers:** Support VoiceOver (iOS) and TalkBack (Android)
2. **Touch Targets:** Minimum 44x44 points for input boxes
3. **Contrast:** Meet WCAG AA standards (4.5:1 minimum)
4. **Focus:** Clear focus indicators for keyboard navigation
5. **Feedback:** Provide haptic and audio feedback
6. **Labels:** Clear, descriptive labels for all UI elements
7. **Errors:** Announce errors to screen readers
8. **Instructions:** Provide clear instructions for passcode entry

### E. Performance Considerations

1. **API Calls:** Cache responses, implement request debouncing
2. **UI Rendering:** Optimize animations, use hardware acceleration
3. **Memory:** Release resources when not needed
4. **Battery:** Minimize background activity
5. **Network:** Handle slow connections gracefully
6. **Storage:** Use efficient data structures


## Conclusion

This guide provides comprehensive documentation for implementing the mobile settings passcode feature. The implementation should prioritize:

1. **Security:** Protect sensitive configuration data
2. **User Experience:** Make authentication smooth and intuitive
3. **Reliability:** Handle errors and edge cases gracefully
4. **Performance:** Minimize impact on app performance
5. **Accessibility:** Ensure feature is usable by all users

By following this guide, the mobile development team can implement a secure, user-friendly passcode protection system that integrates seamlessly with the credential.studio platform.

## Document Version

- **Version:** 1.0
- **Last Updated:** January 2025
- **Status:** Complete
- **Related Spec:** `.kiro/specs/mobile-settings-passcode/`

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| Jan 2025 | 1.0 | Initial release |

---

**For questions or clarifications, please contact the backend development team or refer to the specification documents in `.kiro/specs/mobile-settings-passcode/`.**
