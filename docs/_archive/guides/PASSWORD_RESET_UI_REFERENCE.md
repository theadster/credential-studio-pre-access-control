# Password Reset UI Reference

## Button Location

The "Reset Password" button appears in the User Management interface when linking users.

### Navigation Path
```
Dashboard → User Management → Link User → [User List]
```

## UI Layout

### Unverified User (Both Buttons)
```
┌─────────────────────────────────────────────────────────────────┐
│ user@example.com                    [Unverified Badge]          │
│ John Doe                                                        │
│ Created Jan 15, 2024                                           │
│                                                                 │
│                    [📧 Send Verification] [🔑 Reset Password]  │
└─────────────────────────────────────────────────────────────────┘
```

### Verified User (Reset Only)
```
┌─────────────────────────────────────────────────────────────────┐
│ user@example.com                    [✓ Verified Badge]          │
│ John Doe                                                        │
│ Created Jan 15, 2024                                           │
│                                                                 │
│                                      [🔑 Reset Password]        │
└─────────────────────────────────────────────────────────────────┘
```

### Linked User (No Buttons)
```
┌─────────────────────────────────────────────────────────────────┐
│ user@example.com                    [Already Linked Badge]      │
│ John Doe                                                        │
│ Created Jan 15, 2024                                           │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Button States

### Normal State
```
┌──────────────────────┐
│ 🔑 Reset Password    │
└──────────────────────┘
```
- **Background**: White with border (outline variant)
- **Text**: Default foreground color
- **Icon**: KeyRound icon (left-aligned)
- **Cursor**: Pointer
- **Hover**: Light background highlight

### Loading State
```
┌──────────────────────┐
│ ⟳ Sending...         │
└──────────────────────┘
```
- **Icon**: Spinning loader animation
- **Text**: "Sending..."
- **Cursor**: Default (not clickable)
- **Disabled**: Cannot click

### Disabled State
```
┌──────────────────────┐
│ 🔑 Reset Password    │  (grayed out)
└──────────────────────┘
```
- **Opacity**: Reduced (60%)
- **Cursor**: Not-allowed
- **Reason**: Another operation in progress

## Button Behavior

### Click Action
1. Button shows loading state immediately
2. API request sent to `/api/users/send-password-reset`
3. Success: Show success toast notification
4. Error: Show error toast notification
5. Button returns to normal state

### Keyboard Navigation
- **Tab**: Focus on button
- **Enter/Space**: Trigger password reset
- **Event**: Stops propagation (doesn't select user row)

### Accessibility
- **ARIA Label**: Implicit from button text
- **Focus Ring**: Visible when focused
- **Screen Reader**: Announces button state changes

## Success Notification

### Toast Appearance
```
┌─────────────────────────────────────────────────────────┐
│ ✓ Password Reset Email Sent                            │
│                                                         │
│ Password reset email sent to user@example.com.         │
│ User must click the link in their email to reset       │
│ their password.                                         │
│                                                         │
│                                              [OK]       │
└─────────────────────────────────────────────────────────┘
```
- **Type**: Success (green theme)
- **Icon**: Checkmark
- **Title**: "Password Reset Email Sent"
- **Message**: Includes user email and instructions
- **Duration**: Auto-dismiss after 5 seconds or manual close

## Error Notifications

### Rate Limit Error
```
┌─────────────────────────────────────────────────────────┐
│ ✗ Failed to send password reset email                  │
│                                                         │
│ Too many password reset emails sent for this user.     │
│ Please try again in 30 minutes.                        │
│                                                         │
│                                              [OK]       │
└─────────────────────────────────────────────────────────┘
```

### Permission Error
```
┌─────────────────────────────────────────────────────────┐
│ ✗ Failed to send password reset email                  │
│                                                         │
│ Insufficient permissions to send password reset        │
│ emails.                                                 │
│                                                         │
│                                              [OK]       │
└─────────────────────────────────────────────────────────┘
```

### Generic Error
```
┌─────────────────────────────────────────────────────────┐
│ ✗ Failed to send password reset email                  │
│                                                         │
│ Failed to send password reset email. Please try        │
│ again.                                                  │
│                                                         │
│                                              [OK]       │
└─────────────────────────────────────────────────────────┘
```

## Responsive Design

### Desktop (> 768px)
- Buttons side-by-side
- Full button text visible
- Icons and text both shown

### Tablet (768px - 1024px)
- Buttons may wrap to new line
- Full button text visible
- Icons and text both shown

### Mobile (< 768px)
- Buttons stack vertically
- Full button text visible
- Icons and text both shown
- Touch-friendly tap targets

## Color Scheme

### Light Mode
- **Button Background**: White (`bg-background`)
- **Button Border**: Light gray (`border-input`)
- **Button Text**: Dark gray (`text-foreground`)
- **Icon Color**: Matches text
- **Hover**: Light accent background (`hover:bg-accent`)

### Dark Mode
- **Button Background**: Dark gray (`dark:bg-background`)
- **Button Border**: Dark border (`dark:border-input`)
- **Button Text**: Light gray (`dark:text-foreground`)
- **Icon Color**: Matches text
- **Hover**: Dark accent background (`dark:hover:bg-accent`)

## Icon Details

### KeyRound Icon
- **Size**: 12px × 12px (`h-3 w-3`)
- **Position**: Left of text
- **Margin**: 4px right margin (`mr-1`)
- **Style**: Outline style (not filled)
- **Color**: Inherits from button text color

### Loader Icon (Loading State)
- **Size**: 12px × 12px (`h-3 w-3`)
- **Position**: Left of text
- **Margin**: 4px right margin (`mr-1`)
- **Animation**: Continuous spin
- **Color**: Inherits from button text color

## Spacing

### Button Padding
- **Horizontal**: 16px (`px-4`)
- **Vertical**: 8px (`py-2`)

### Button Gap
- **Between Buttons**: 8px (`gap-2`)

### Row Padding
- **User Row**: 16px all sides (`p-4`)

## Typography

### Button Text
- **Font Size**: 14px (`text-sm`)
- **Font Weight**: 500 (medium)
- **Line Height**: 20px
- **Letter Spacing**: Normal

## Interaction States

### Hover
- Background changes to accent color
- Smooth transition (300ms)
- Cursor changes to pointer

### Focus
- Visible focus ring
- Ring color matches primary color
- Ring offset for clarity

### Active (Pressed)
- Slightly darker background
- No scale transform (maintains size)

### Disabled
- Reduced opacity (60%)
- Cursor shows not-allowed
- No hover effects
- No click events

## Z-Index Layers

### Button Layer
- **Z-Index**: Auto (default)
- **Position**: Relative

### Toast Notifications
- **Z-Index**: 9999 (top layer)
- **Position**: Fixed

## Animation Timing

### Button State Changes
- **Duration**: 300ms
- **Easing**: Ease-in-out
- **Properties**: Background, border, color

### Loader Spin
- **Duration**: 1000ms
- **Easing**: Linear
- **Loop**: Infinite

### Toast Appearance
- **Duration**: 200ms
- **Easing**: Ease-out
- **Direction**: Slide in from top

## Accessibility Features

### Keyboard Support
- ✅ Tab navigation
- ✅ Enter/Space activation
- ✅ Focus indicators
- ✅ Event propagation control

### Screen Reader Support
- ✅ Button role implicit
- ✅ State changes announced
- ✅ Loading state communicated
- ✅ Error messages read aloud

### Visual Indicators
- ✅ Clear button labels
- ✅ Icon reinforcement
- ✅ Loading spinner
- ✅ Disabled state visible

### Color Contrast
- ✅ WCAG AA compliant
- ✅ Sufficient contrast ratios
- ✅ Works in light and dark modes

## Browser Compatibility

### Supported Browsers
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

### Features Used
- CSS Grid/Flexbox
- CSS Transitions
- SVG Icons
- Modern JavaScript (ES6+)

## Performance

### Button Rendering
- **Initial Load**: < 50ms
- **State Change**: < 16ms (60fps)
- **Click Response**: Immediate

### API Request
- **Typical**: 200-500ms
- **Timeout**: 30 seconds
- **Retry**: Automatic (3 attempts)

## Testing Checklist

### Visual Testing
- [ ] Button appears correctly
- [ ] Icon displays properly
- [ ] Text is readable
- [ ] Spacing is correct
- [ ] Colors match design
- [ ] Dark mode works

### Interaction Testing
- [ ] Click triggers action
- [ ] Loading state shows
- [ ] Success notification appears
- [ ] Error notification appears
- [ ] Disabled state works
- [ ] Keyboard navigation works

### Responsive Testing
- [ ] Desktop layout correct
- [ ] Tablet layout correct
- [ ] Mobile layout correct
- [ ] Touch targets adequate

### Accessibility Testing
- [ ] Screen reader announces correctly
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Color contrast sufficient

## Related Documentation
- [Password Reset Admin Guide](./PASSWORD_RESET_ADMIN_GUIDE.md)
- [Auth User Linking Admin Guide](./AUTH_USER_LINKING_ADMIN_GUIDE.md)
- [Visual Design System](../.kiro/steering/visual-design.md)
