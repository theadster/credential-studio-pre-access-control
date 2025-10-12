# Credential Generation Error Modal Examples

## Visual Examples of Error Modals

### Single Credential Generation Error

```
╔═══════════════════════════════════════════════════════════╗
║  ❌ Credential Generation Failed                          ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  Attendee: John Doe                                       ║
║                                                            ║
║  Error:                                                    ║
║  ┌──────────────────────────────────────────────────┐    ║
║  │ Failed to generate credential with Switchboard   │    ║
║  │ Canvas: API returned 401: Unauthorized           │    ║
║  └──────────────────────────────────────────────────┘    ║
║                                                            ║
║                  [ OK, I Understand ]                      ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝
```

### Bulk Generation - Partial Success

```
╔═══════════════════════════════════════════════════════════╗
║  ⚠️  Partial Success                                      ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  ✓ Successfully generated: 7 credentials                  ║
║  ✗ Failed to generate: 3 credentials                      ║
║                                                            ║
║  Error Details:                                            ║
║  ┌──────────────────────────────────────────────────┐    ║
║  │ • John Doe: API returned 401: Unauthorized       │    ║
║  │ • Jane Smith: Invalid template configuration     │    ║
║  │ • Bob Johnson: Missing required custom field     │    ║
║  │                                                   │    ║
║  └──────────────────────────────────────────────────┘    ║
║                                                            ║
║                  [ OK, I Understand ]                      ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝
```

### Bulk Generation - Complete Failure

```
╔═══════════════════════════════════════════════════════════╗
║  ❌ Credential Generation Failed                          ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  Failed to generate any credentials. Please review the    ║
║  errors below:                                             ║
║                                                            ║
║  Error Details:                                            ║
║  ┌──────────────────────────────────────────────────┐    ║
║  │ • John Doe: Switchboard integration not found    │ ↕  ║
║  │ • Jane Smith: Switchboard integration not found  │    ║
║  │ • Bob Johnson: Switchboard integration not found │    ║
║  │ • Alice Williams: Switchboard integration not... │    ║
║  │ • Charlie Brown: Switchboard integration not...  │    ║
║  │                                                   │    ║
║  │ ...and 5 more errors                              │    ║
║  └──────────────────────────────────────────────────┘    ║
║                                                            ║
║                  [ OK, I Understand ]                      ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝
```

## Error Message Patterns

### API Authentication Error
```
Failed to generate credential with Switchboard Canvas: API returned 401: Unauthorized
```
**Cause:** Invalid or missing SWITCHBOARD_API_KEY  
**Solution:** Check environment variable configuration

### Configuration Error
```
Switchboard Canvas integration not found
```
**Cause:** Integration not configured in event settings  
**Solution:** Set up Switchboard integration in Event Settings tab

### Template Error
```
Invalid request body template in Switchboard Canvas settings: JSON parse error at position 234
```
**Cause:** Syntax error in request body template  
**Solution:** Review and fix JSON template in integration settings

### Missing Field Error
```
Missing required custom field: companyName
```
**Cause:** Required field not filled for attendee  
**Solution:** Update attendee record with required field value

### Network Error
```
Failed to connect to Switchboard Canvas API
```
**Cause:** Network connectivity issue or wrong endpoint  
**Solution:** Check internet connection and API endpoint URL

## Color Coding

### Success (Green)
- ✓ Successfully generated: X credentials
- Color: `#10b981`

### Error (Red)
- ✗ Failed to generate: X credentials
- Error messages
- Color: `#ef4444`
- Background: `#fee`

### Warning (Yellow/Orange)
- ⚠️ Partial Success icon
- Mixed success/failure scenarios

### Muted (Gray)
- "...and X more errors"
- Secondary information
- Color: `#6b7280`

## Modal Behavior

### User Interactions
- ✅ Click "OK, I Understand" button → Dismisses modal
- ❌ Click outside modal → Does nothing (modal stays)
- ❌ Press ESC key → Does nothing (modal stays)
- ❌ Press Enter key → Does nothing (must click button)

### Scrolling
- Error list scrollable when more than 5 errors
- Max height: 200px
- Scroll indicator (↕) shown when scrollable

### Responsiveness
- Modal adapts to screen size
- Text wraps appropriately
- Maintains readability on mobile devices

## Comparison: Before vs After

### Before (Auto-Dismiss Toast)
```
┌─────────────────────────────┐
│  ❌ Error                   │  [Disappears after 5 seconds]
│  Failed to generate...      │
└─────────────────────────────┘
```
**Problems:**
- Disappears too quickly
- Limited error information
- User might miss it
- No way to ensure user reads it

### After (Acknowledgment Modal)
```
╔═══════════════════════════════════════════╗
║  ❌ Credential Generation Failed          ║  [Stays until acknowledged]
║                                            ║
║  Attendee: John Doe                       ║
║  Error: [Full error message]              ║
║                                            ║
║         [ OK, I Understand ]               ║
╚═══════════════════════════════════════════╝
```
**Benefits:**
- Stays until user acknowledges
- Full error details shown
- User must read to dismiss
- Better for troubleshooting

## Real-World Scenarios

### Scenario 1: Switchboard API Key Expired
**What User Sees:**
```
❌ Credential Generation Failed

Attendee: John Doe

Error:
Failed to generate credential with Switchboard Canvas: 
API returned 401: Unauthorized
```

**What User Should Do:**
1. Click "OK, I Understand"
2. Contact administrator
3. Administrator updates SWITCHBOARD_API_KEY
4. Retry credential generation

### Scenario 2: Bulk Generation with Mixed Results
**What User Sees:**
```
⚠️ Partial Success

✓ Successfully generated: 47 credentials
✗ Failed to generate: 3 credentials

Error Details:
• John Doe: Missing required field: companyName
• Jane Smith: Missing required field: companyName
• Bob Johnson: Photo URL is invalid
```

**What User Should Do:**
1. Click "OK, I Understand"
2. Note which attendees failed
3. Update missing information for failed attendees
4. Retry generation for those specific attendees

### Scenario 3: Complete Configuration Failure
**What User Sees:**
```
❌ Credential Generation Failed

Failed to generate any credentials. Please review the errors below:

Error Details:
• John Doe: Switchboard Canvas integration not found
• Jane Smith: Switchboard Canvas integration not found
• Bob Johnson: Switchboard Canvas integration not found
...and 47 more errors
```

**What User Should Do:**
1. Click "OK, I Understand"
2. Realize this is a configuration issue (all failed with same error)
3. Go to Event Settings → Integrations
4. Configure Switchboard Canvas integration
5. Retry bulk generation

## Accessibility

### Keyboard Navigation
- Tab to focus on "OK, I Understand" button
- Enter/Space to activate button
- Focus visible with outline

### Screen Readers
- Modal title announced
- Error content read in order
- Button label clear and descriptive

### Visual Clarity
- High contrast colors
- Clear visual hierarchy
- Readable font sizes
- Proper spacing

## Tips for Users

### Reading Error Messages
1. **Look for patterns:** If all errors are the same, it's likely a configuration issue
2. **Check attendee names:** Note which specific records failed
3. **Read full error:** Don't just skim, the details matter
4. **Take a screenshot:** Helpful for support tickets

### Troubleshooting
1. **Single failure:** Likely an issue with that specific attendee's data
2. **Multiple failures:** Could be configuration or API issue
3. **All failures:** Definitely a configuration or integration issue

### Best Practices
1. **Don't ignore errors:** They contain important information
2. **Fix root cause:** Don't just retry without fixing the issue
3. **Update records:** Ensure all required fields are filled
4. **Test configuration:** Generate one credential before bulk operations
