# Design Document

## Overview

This design document outlines the comprehensive redesign of the Roles page in CredentialStudio. The redesign transforms the current nested table layout into a modern, card-based interface that emphasizes visual hierarchy, scannability, and user experience while maintaining all existing functionality. The design leverages the application's existing design system (violet theme, glass morphism, shadcn/ui components) to create a cohesive, professional interface.

## Architecture

### Component Structure

```
Dashboard (src/pages/dashboard.tsx)
├── Roles Tab Section
│   ├── Role Statistics Cards (4 cards)
│   ├── Roles Grid Container
│   │   └── Role Cards (mapped from roles array)
│   │       ├── Role Header
│   │       ├── Role Stats
│   │       ├── Permission Summary (collapsible)
│   │       └── Assigned Users Preview
│   └── Role Form Dialog (RoleForm component)
│       ├── Basic Information Section
│       └── Permission Categories (collapsible cards)
```

### State Management

The redesign maintains the existing state structure in `dashboard.tsx`:
- `roles`: Array of role objects
- `users`: Array of user objects (for user count and assignments)
- `currentUser`: Current user with permissions
- `showRoleForm`: Boolean for dialog visibility
- `editingRole`: Currently selected role for editing
- `initializingRoles`: Loading state for role initialization

No new state variables are required; the redesign focuses on presentation improvements.

## Components and Interfaces

### 1. Role Statistics Cards

**Purpose:** Provide at-a-glance metrics about the role system

**Design:**
- Grid layout: 4 columns on desktop, 2 on tablet, 1 on mobile
- Gradient backgrounds matching existing dashboard aesthetic
- Icons: Shield, Users, AlertTriangle, Settings
- Hover effect: Scale 1.05 with shadow increase
- Metrics displayed:
  - Total Roles
  - Active Users (users with assigned roles)
  - Unassigned Users
  - Permission Categories (unique permission keys)

**Visual Specifications:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Blue gradient for Total Roles */}
  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 
    dark:from-blue-950/50 dark:to-blue-900/50 dark:border-blue-800/50 
    hover:shadow-lg transition-all duration-300 hover:scale-105">
    {/* Icon container with semi-transparent background */}
    <div className="p-3 rounded-lg bg-blue-500/20 dark:bg-blue-400/20">
      <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
    </div>
    {/* Metric display */}
  </Card>
  {/* Similar cards for other metrics with emerald, purple, amber gradients */}
</div>
```

### 2. Role Card Component

**Purpose:** Display individual role information in a scannable, organized format

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────┐
│ [Icon] Role Name                          [Edit] [Delete]│
│        Description                                        │
│                                                           │
│ 👥 X users  ⚙️ X permissions  📅 Created date           │
│                                                           │
│ ▼ Permissions Overview                                   │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│ │● Attendees│ │● Users   │ │● Roles   │                 │
│ │ create    │ │ read     │ │ update   │                 │
│ │ read +2   │ │ update   │ │ delete   │                 │
│ └──────────┘ └──────────┘ └──────────┘                 │
│                                                           │
│ 👤 Users with this role                                  │
│ [Avatar] [Avatar] [Avatar] [Avatar] [Avatar] +5 more    │
└─────────────────────────────────────────────────────────┘
```

**Visual Specifications:**

**Container:**
- Border with rounded corners (`rounded-lg`)
- Padding: `p-6`
- Hover effects: Border color change, shadow increase
- Gradient background: `from-background to-muted/20`
- Transition: `transition-all duration-200`

**Role Header:**
- Icon container with role-specific colors:
  - Super Administrator: Red (`bg-red-100 dark:bg-red-900/20`)
  - Administrator: Purple (`bg-purple-100 dark:bg-purple-900/20`)
  - Manager: Blue (`bg-blue-100 dark:bg-blue-900/20`)
  - Editor: Green (`bg-green-100 dark:bg-green-900/20`)
  - Default: Gray (`bg-gray-100 dark:bg-gray-900/20`)
- Role name: `text-lg font-semibold` with hover color change to primary
- Description: `text-sm text-muted-foreground`

**Role Stats:**
- Horizontal flex layout with spacing
- Icons: Users, Settings, Calendar (h-4 w-4)
- Text: `text-sm text-muted-foreground`
- Format: "X users", "X permissions", "Created [date]"

**Action Buttons:**
- Positioned absolute top-right
- Opacity 0 by default, 100 on card hover
- Smooth transition: `transition-opacity`
- Edit button: Ghost variant with primary hover
- Delete button: Ghost variant with destructive color
- Hidden for Super Administrator role (delete only)

**Permission Summary:**
- Collapsible section with expand/collapse animation
- Grid layout: 3 columns on desktop, 2 on tablet, 1 on mobile
- Each permission category card:
  - Background: `bg-muted/30`
  - Border: `border rounded-lg`
  - Padding: `p-3`
  - Status indicator: Green dot for active, gray for inactive
  - Permission badges: Show first 3, then "+X more"
  - Badge styling: `variant="secondary"` with `text-xs`

**Assigned Users Preview:**
- Border-top separator
- User avatars in horizontal flex with gap
- Avatar size: `h-5 w-5`
- Show maximum 5 avatars
- "+X more" indicator for additional users
- Avatar fallback: First letter of name/email

### 3. Role Form Dialog (Enhanced)

**Purpose:** Create and edit roles with improved UX

**Current Issues to Address:**
- Long scrolling list of permissions
- Difficult to scan all options
- No visual grouping beyond cards

**Design Improvements:**

**Layout:**
- Maximum width: `max-w-5xl` (increased from 4xl for better space utilization)
- Maximum height: `max-h-[90vh]` with scroll
- Sections clearly separated with dividers

**Basic Information Section:**
- Two-column grid on desktop
- Role Name (required) with validation
- Description (optional)
- Clear error messaging below fields

**Permission Categories:**
- Accordion-style collapsible sections
- Each category as an Accordion item:
  - Header shows: Icon, Title, Description, Permission count badge, Select All button
  - Content shows: Grid of permission toggles
  - Collapsed by default except first category
  - Smooth expand/collapse animation

**Permission Toggle Design:**
```tsx
<div className="flex items-center space-x-3 p-3 rounded-lg border bg-muted/10 
  hover:bg-muted/20 transition-colors">
  <Switch id={`${resource}-${action}`} />
  <Label className="text-sm font-medium cursor-pointer flex-1">
    {label}
  </Label>
</div>
```

**Category Header Design:**
```tsx
<AccordionTrigger className="hover:no-underline">
  <div className="flex items-center justify-between w-full">
    <div className="flex items-center space-x-3">
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="text-left">
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
    </div>
    <div className="flex items-center space-x-2">
      <Badge variant={granted > 0 ? "default" : "outline"}>
        {granted}/{total}
      </Badge>
      <Button variant="outline" size="sm" onClick={handleSelectAll}>
        {allSelected ? "Deselect All" : "Select All"}
      </Button>
    </div>
  </div>
</AccordionTrigger>
```

**Validation and Error Handling:**
- Inline validation for required fields
- Error alert at bottom of form for submission errors
- Clear error messages with AlertTriangle icon
- Prevent submission if no permissions selected

### 4. Empty State

**Purpose:** Guide users when no roles exist

**Design:**
- Alert component with amber color scheme
- AlertTriangle icon
- Clear message about initializing roles
- Prominent "Initialize Roles" button
- Loading state during initialization

## Data Models

### Role Interface (Existing)
```typescript
interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, boolean | Record<string, boolean>>;
  createdAt: string;
}
```

### Permission Structure (Existing)
```typescript
interface UserPermissions {
  attendees?: {
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
    print?: boolean;
    export?: boolean;
    import?: boolean;
    bulkEdit?: boolean;
    bulkDelete?: boolean;
    bulkGenerateCredentials?: boolean;
    bulkGeneratePDFs?: boolean;
  };
  users?: {
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
  };
  roles?: {
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
  };
  eventSettings?: {
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
    configure?: boolean;
  };
  customFields?: {
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
  };
  logs?: {
    read?: boolean;
    delete?: boolean;
    export?: boolean;
    configure?: boolean;
  };
  system?: {
    backup?: boolean;
    restore?: boolean;
    configure?: boolean;
  };
}
```

## Error Handling

### Form Validation Errors
- **Empty role name:** Display inline error below field
- **No permissions selected:** Display alert at bottom of form
- **Duplicate role name:** Display error from API response

### API Errors
- **Network errors:** Show SweetAlert error modal
- **Permission denied:** Show error and close form
- **Role in use (delete):** Show confirmation with user count

### Loading States
- **Initializing roles:** Button shows spinner and "Initializing..." text
- **Saving role:** Submit button shows spinner and "Creating..."/"Updating..." text
- **Deleting role:** Show loading modal during deletion

## Testing Strategy

### Visual Testing
1. **Responsive Design:**
   - Test on mobile (320px, 375px, 414px)
   - Test on tablet (768px, 1024px)
   - Test on desktop (1280px, 1440px, 1920px)
   - Verify no horizontal scrolling
   - Verify readable text at all sizes

2. **Dark Mode:**
   - Test all color combinations
   - Verify contrast ratios meet WCAG AA
   - Test gradient backgrounds
   - Test hover states

3. **Hover States:**
   - Role card hover effects
   - Action button fade-in
   - Permission toggle hover
   - Button hover states

### Functional Testing
1. **Role Creation:**
   - Create role with all permissions
   - Create role with partial permissions
   - Create role with no permissions (should fail)
   - Verify validation messages

2. **Role Editing:**
   - Edit role name and description
   - Add permissions to existing role
   - Remove permissions from existing role
   - Verify changes persist

3. **Role Deletion:**
   - Delete role with no users
   - Attempt to delete role with users (should confirm)
   - Attempt to delete Super Administrator (should prevent)
   - Verify role removed from list

4. **Permission Management:**
   - Toggle individual permissions
   - Use "Select All" for category
   - Use "Deselect All" for category
   - Verify permission counts update

### Accessibility Testing
1. **Keyboard Navigation:**
   - Tab through all interactive elements
   - Activate buttons with Enter/Space
   - Navigate accordion with arrow keys
   - Verify focus indicators visible

2. **Screen Reader:**
   - Test role card announcements
   - Test permission toggle labels
   - Test error message announcements
   - Test loading state announcements

3. **Color Contrast:**
   - Verify all text meets WCAG AA (4.5:1)
   - Verify interactive elements distinguishable
   - Test with color blindness simulators

### Performance Testing
1. **Large Data Sets:**
   - Test with 50+ roles
   - Test with 100+ users
   - Verify smooth scrolling
   - Verify no lag on interactions

2. **Animation Performance:**
   - Test hover animations
   - Test accordion expand/collapse
   - Test dialog open/close
   - Verify 60fps on modern devices

## Design Patterns

### Color Usage
- **Role-specific colors:** Red (Super Admin), Purple (Admin), Blue (Manager), Green (Editor), Gray (Custom)
- **Status indicators:** Green dot (active), Gray dot (inactive)
- **Semantic colors:** Destructive for delete, Primary for edit
- **Gradient backgrounds:** Match existing dashboard cards

### Typography
- **Role names:** `text-lg font-semibold`
- **Descriptions:** `text-sm text-muted-foreground`
- **Stats:** `text-sm text-muted-foreground`
- **Permission labels:** `text-sm font-medium`
- **Counts:** `text-4xl font-bold` (statistics cards)

### Spacing
- **Card padding:** `p-6`
- **Section gaps:** `space-y-6`
- **Element gaps:** `space-x-2`, `space-y-2`
- **Grid gaps:** `gap-6` (statistics), `gap-4` (role cards), `gap-3` (permissions)

### Animations
- **Hover scale:** `hover:scale-105` with `transition-all duration-300`
- **Opacity fade:** `opacity-0 group-hover:opacity-100` with `transition-opacity`
- **Accordion:** Built-in Radix UI animations
- **Dialog:** Built-in Radix UI animations

### Icons
- **Shield:** Roles, security, permissions
- **Users:** User count, assignments
- **Settings:** Configuration, system
- **AlertTriangle:** Warnings, unassigned users
- **Calendar:** Creation date
- **Edit:** Edit action
- **Trash2:** Delete action
- **Plus:** Create new role

## Responsive Breakpoints

### Mobile (< 768px)
- Statistics: 1 column
- Role cards: Full width
- Permission grid: 1 column
- Form: Single column layout
- User avatars: Scroll horizontally if needed

### Tablet (768px - 1024px)
- Statistics: 2 columns
- Role cards: Full width
- Permission grid: 2 columns
- Form: Two column layout for basic info
- User avatars: Show all with wrap

### Desktop (> 1024px)
- Statistics: 4 columns
- Role cards: Full width (better readability)
- Permission grid: 3 columns
- Form: Two column layout
- User avatars: Show all inline

## Accessibility Features

### ARIA Labels
- Role cards: `aria-label` with role name and user count
- Action buttons: `aria-label` describing action
- Permission toggles: Associated with labels via `htmlFor`
- Statistics cards: `role="status"` for metrics

### Keyboard Support
- Tab order: Logical flow through interface
- Enter/Space: Activate buttons and toggles
- Escape: Close dialogs
- Arrow keys: Navigate accordion items

### Screen Reader Support
- Semantic HTML: Use appropriate elements
- Hidden text: Provide context for icons
- Live regions: Announce dynamic changes
- Error messages: Associated with form fields

### Focus Management
- Visible focus indicators: `ring-2 ring-primary`
- Focus trap: Keep focus within dialog
- Return focus: Restore focus after dialog close
- Skip links: Allow skipping to main content

## Implementation Notes

### Files to Modify
1. **src/pages/dashboard.tsx**
   - Update Roles tab section (lines ~3756-4000)
   - Enhance role card layout
   - Improve permission summary display
   - Add collapsible sections

2. **src/components/RoleForm.tsx**
   - Convert permission cards to accordion
   - Improve visual hierarchy
   - Enhance validation display
   - Add better loading states

### Dependencies
- No new dependencies required
- Uses existing shadcn/ui components:
  - Card, CardHeader, CardTitle, CardContent, CardDescription
  - Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
  - Button, Input, Label, Switch
  - Badge, Alert, AlertDescription
  - Accordion, AccordionItem, AccordionTrigger, AccordionContent (new)
  - Avatar, AvatarFallback

### Performance Considerations
- Use `useMemo` for permission calculations
- Use `useCallback` for event handlers
- Avoid unnecessary re-renders with proper key props
- Lazy load user avatars if list is long

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid and Flexbox support required
- CSS custom properties support required
- No IE11 support needed

## Design System Compliance

### Colors
- Uses existing CSS variables from `globals.css`
- Maintains violet primary color scheme
- Follows light/dark mode patterns
- Uses semantic color tokens

### Components
- Uses shadcn/ui components exclusively
- Follows New York style variant
- Maintains consistent spacing scale
- Uses Tailwind utility classes

### Typography
- Uses system font stack
- Follows existing size scale
- Maintains font weight hierarchy
- Uses consistent line heights

### Interactions
- Follows existing hover patterns
- Uses consistent transition durations
- Maintains focus indicator style
- Uses established loading patterns

## Migration Strategy

### Phase 1: Role Card Redesign
- Update role card layout in dashboard.tsx
- Implement new permission summary
- Add collapsible sections
- Test with existing data

### Phase 2: Role Form Enhancement
- Convert to accordion layout
- Improve visual hierarchy
- Enhance validation
- Test form submission

### Phase 3: Polish and Optimization
- Add animations and transitions
- Optimize performance
- Test accessibility
- Gather user feedback

### Rollback Plan
- Keep existing code commented
- Test thoroughly before deployment
- Monitor for issues post-deployment
- Quick rollback if critical bugs found

## Success Metrics

### Usability
- Reduced time to create/edit roles
- Fewer user errors in permission selection
- Increased user satisfaction scores
- Reduced support tickets

### Performance
- Page load time < 2 seconds
- Smooth 60fps animations
- No layout shifts
- Fast interaction response

### Accessibility
- WCAG AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Color contrast compliance

## Future Enhancements

### Potential Additions
1. **Role Templates:** Pre-configured role templates for common use cases
2. **Permission Comparison:** Side-by-side role comparison view
3. **Bulk Operations:** Assign roles to multiple users at once
4. **Role Hierarchy:** Parent-child role relationships
5. **Permission Search:** Search/filter permissions in form
6. **Role Cloning:** Duplicate existing role as starting point
7. **Permission Presets:** Quick-select common permission combinations
8. **Audit Trail:** View history of role changes

### Not in Scope
- Role-based UI customization
- Dynamic permission creation
- Role scheduling (time-based access)
- Integration with external auth systems
