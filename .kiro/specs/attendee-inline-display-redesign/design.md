# Design Document

## Overview

This design document outlines the technical approach for redesigning the inline display of attendee data in the Attendees table. The redesign transforms the current basic table layout into a more modern, visually appealing presentation that enhances readability while maintaining full compatibility with existing features.

### Design Goals

1. **Visual Enhancement**: Create a modern, professional appearance using the existing violet-based design system
2. **Improved Information Hierarchy**: Make important information (name, photo, status) more prominent
3. **Better Custom Field Display**: Organize custom fields in a responsive grid that adapts to content
4. **Maintain Performance**: Ensure no significant performance degradation
5. **Full Compatibility**: Preserve all existing functionality including hidden fields, bulk operations, and permissions

### Key Design Principles

- **Progressive Enhancement**: Build on existing components rather than replacing them
- **Consistency**: Follow established patterns from the shadcn/ui library and existing codebase
- **Accessibility First**: Ensure WCAG AA compliance throughout
- **Mobile Responsive**: Design works seamlessly across all device sizes
- **Performance Conscious**: Use React optimization patterns (useMemo, useCallback) appropriately

## Architecture

### Component Structure

The redesign focuses on the attendee table row rendering within `src/pages/dashboard.tsx`. No new components are needed; instead, we'll enhance the existing table structure with improved styling and layout.

```
Dashboard Component
└── Attendees Tab
    └── Attendees Table
        └── Table Body
            └── Table Row (Enhanced)
                ├── Checkbox Cell
                ├── Photo Cell (Enhanced)
                ├── Name Cell (Enhanced)
                │   ├── Name with Click Handler
                │   ├── Notes Badge (if applicable)
                │   └── Custom Fields Grid (Enhanced)
                ├── Barcode Cell (Enhanced)
                ├── Credential Cell
                ├── Status Cell (Enhanced)
                └── Actions Cell
```

### Data Flow

1. **Attendee Data**: Fetched from `/api/attendees` endpoint
2. **Custom Fields**: Retrieved from `eventSettings.customFields`
3. **Visible Fields Filtering**: Applied via `visibleCustomFields` useMemo hook
4. **Grid Layout Calculation**: Determined dynamically based on field count
5. **Rendering**: React renders enhanced table rows with new styling


## Components and Interfaces

### Enhanced Table Row Structure

#### Photo Cell Enhancement

**Current Implementation:**
```tsx
<div className="relative w-12 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
  {/* Photo or initials */}
</div>
```

**Enhanced Design:**
```tsx
<TableCell className="align-top">
  <div className="relative w-20 h-24 bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/30 rounded-lg overflow-hidden flex-shrink-0 border border-violet-200 dark:border-violet-800/50 shadow-sm hover:shadow-md transition-all duration-200">
    {attendee.photoUrl ? (
      <img
        src={attendee.photoUrl}
        alt={`${attendee.firstName} ${attendee.lastName}`}
        className="w-full h-full object-cover"
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">
          {attendee.firstName.charAt(0)}{attendee.lastName.charAt(0)}
        </span>
      </div>
    )}
  </div>
</TableCell>
```

**Design Rationale:**
- Increased size from 64x80px to 80x96px (w-20 h-24) for better visibility
- Added `align-top` to TableCell to position photo at top of column
- Added gradient background for visual appeal
- Added border and shadow for depth
- Hover effect for interactivity feedback
- Larger initials (text-2xl) for better readability
- Photo stays at top regardless of custom field expansion

#### Name Cell Enhancement

**Current Implementation:**
```tsx
<div>
  <button className="text-left hover:text-primary transition-colors cursor-pointer">
    <div className="flex items-center gap-2">
      <span className="font-medium text-lg">{attendee.firstName} {attendee.lastName}</span>
      {/* Notes badge */}
    </div>
  </button>
  {/* Custom fields grid */}
</div>
```

**Enhanced Design:**
```tsx
<TableCell>
  <div>
    <button className="text-left group w-full">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
          {attendee.firstName} {attendee.lastName}
        </span>
        {attendee.notes && attendee.notes.trim() !== '' && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800">
            <FileText className="h-3 w-3 mr-1" />
            NOTES
          </Badge>
        )}
      </div>
    </button>
    
    {/* Enhanced Custom Fields Grid - Full Width */}
    {customFieldsWithValues.length > 0 && (
      <div className="mt-3 pt-3 border-t border-border/50">
        <div className={`grid ${getGridColumns(customFieldsWithValues.length)} gap-x-6 gap-y-2`}>
          {customFieldsWithValues.map((field, index) => (
            <div key={index} className="flex flex-col space-y-0.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {field.fieldName}
              </span>
              <span className="text-sm font-medium text-foreground">
                {field.fieldType === 'url' ? (
                  <a
                    href={field.value || ''}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 underline inline-flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link className="h-3 w-3" />
                    {field.value}
                  </a>
                ) : field.fieldType === 'boolean' ? (
                  <Badge 
                    variant={field.value === 'Yes' ? undefined : 'secondary'} 
                    className={field.value === 'Yes' 
                      ? "text-xs bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-900/50 dark:hover:bg-violet-950/30 transition-colors" 
                      : "text-xs"
                    }
                  >
                    {field.value}
                  </Badge>
                ) : (
                  field.value
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
</TableCell>
```

**Design Rationale:**
- Removed extra `mb-2` spacing after name to eliminate blank line
- Removed `py-2` wrapper to reduce vertical padding
- Custom fields section starts immediately after border separator
- Grid layout allows fields to wrap to multiple rows naturally
- Full width utilization in name cell for custom fields
- Boolean fields displayed as badges for visual distinction
- URL fields with icon indicator
- Improved notes badge with icon and better colors


#### Barcode Cell Enhancement

**Current Implementation:**
```tsx
<Badge variant="outline">{attendee.barcodeNumber}</Badge>
```

**Enhanced Design:**
```tsx
<TableCell className="align-top">
  <div className="flex items-center gap-2">
    <QrCode className="h-4 w-4 text-muted-foreground" />
    <Badge variant="outline" className="font-mono text-sm px-3 py-1 bg-background">
      {attendee.barcodeNumber}
    </Badge>
  </div>
</TableCell>
```

**Design Rationale:**
- Added `align-top` to TableCell to position barcode at top of column
- Barcode icon and number on same line under "Barcode" heading
- Monospace font for barcode numbers (better readability)
- Increased padding for better visual weight
- Background color for contrast
- Stays at top regardless of custom field expansion in name cell

#### Status Cell Enhancement

**Current Implementation:**
```tsx
{status === 'current' ? (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase bg-green-100 text-green-800 border border-green-200">
    CURRENT
  </span>
) : /* ... */}
```

**Enhanced Design:**
```tsx
<TableCell className="align-top">
  <div className="flex justify-center">
    {(() => {
      const status = getCredentialStatus(attendee);
      if (status === 'current') {
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200 hover:border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/40 dark:hover:border-emerald-700 font-semibold px-3 py-1 transition-colors">
            <CheckCircle className="h-3 w-3 mr-1" />
            CURRENT
          </Badge>
        );
      } else if (status === 'outdated') {
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200 hover:border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-900/40 dark:hover:border-red-700 font-semibold px-3 py-1 transition-colors">
            <AlertTriangle className="h-3 w-3 mr-1" />
            OUTDATED
          </Badge>
        );
      } else {
        return (
          <Badge variant="secondary" className="text-muted-foreground px-3 py-1">
            <Circle className="h-3 w-3 mr-1" />
            NONE
          </Badge>
        );
      }
    })()}
  </div>
</TableCell>
```

**Design Rationale:**
- Added `align-top` to TableCell to keep status badge at top of column
- Status badge remains on first line regardless of custom field expansion
- Added icons to status badges for visual clarity (not color-only)
- Hover effects use same color family (emerald for Current, red for Outdated) to avoid purple clash
- Added `transition-colors` for smooth hover effect
- Improved dark mode colors with better contrast
- Consistent padding across all status types
- "NONE" state now has a badge instead of just "—"

#### Credential Cell and Actions Cell Enhancement

**Enhanced Design:**
```tsx
<TableCell className="align-top">
  <div className="flex justify-center">
    {attendee.credentialUrl ? (
      <button
        onClick={() => attendee.credentialUrl && window.open(attendee.credentialUrl, '_blank')}
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Image className="h-5 w-5 text-purple-600" />
      </button>
    ) : (
      <div className="p-1">
        <Image className="h-5 w-5 text-gray-400" />
      </div>
    )}
  </div>
</TableCell>

<TableCell className="align-top">
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="sm">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    {/* ... dropdown content ... */}
  </DropdownMenu>
</TableCell>
```

**Design Rationale:**
- Added `align-top` to both credential and actions cells
- Credential image icon stays at top of column
- Actions dropdown menu stays at top of column
- These elements remain fixed on first line regardless of custom field expansion
- Maintains consistent top-row alignment across all columns

### Grid Layout Calculation

**Helper Function:**
```tsx
const getGridColumns = (fieldCount: number): string => {
  if (fieldCount === 1) return 'grid-cols-1';
  if (fieldCount >= 2 && fieldCount <= 3) return 'grid-cols-2';
  if (fieldCount >= 4 && fieldCount <= 5) return 'grid-cols-3';
  return 'grid-cols-4'; // 6 or more fields
};
```

**Responsive Breakpoints:**
```tsx
const getResponsiveGridColumns = (fieldCount: number): string => {
  const baseClass = getGridColumns(fieldCount);
  // Mobile: always single column
  // Tablet: max 2 columns
  // Desktop: full grid
  return `grid-cols-1 md:${baseClass.replace('grid-cols-', 'grid-cols-').slice(0, -1)}2 lg:${baseClass}`;
};
```

**Design Rationale:**
- Progressive enhancement from mobile to desktop
- Prevents overcrowding on smaller screens
- Maintains readability across all device sizes


## Data Models

### Custom Field Display Model

```typescript
interface CustomFieldDisplay {
  fieldName: string;
  fieldType: 'text' | 'number' | 'email' | 'url' | 'date' | 'select' | 'boolean' | 'textarea';
  value: string | null;
}
```

**Processing Logic:**
1. Filter custom fields to only visible ones (`showOnMainPage !== false`)
2. Sort by field order
3. Map to display model with formatted values
4. Filter out empty values (except boolean fields)

### Attendee Display Model

The existing `Attendee` interface remains unchanged. The display logic is handled in the rendering layer.

```typescript
interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  barcodeNumber: string;
  notes?: string;
  photoUrl: string | null;
  credentialUrl?: string | null;
  credentialGeneratedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  customFieldValues: CustomFieldValue[];
}
```

## Error Handling

### Photo Loading Errors

```tsx
<img
  src={attendee.photoUrl}
  alt={`${attendee.firstName} ${attendee.lastName}`}
  className="w-full h-full object-cover"
  onError={(e) => {
    // Fallback to initials on image load error
    e.currentTarget.style.display = 'none';
    e.currentTarget.parentElement?.classList.add('show-initials');
  }}
/>
```

### Missing Custom Field Values

- Boolean fields: Always display "Yes" or "No" (default to "No")
- Other fields: Hide if no value exists
- URL fields: Validate before rendering as link

### Grid Layout Edge Cases

- 0 fields: Don't render custom fields section
- 1 field: Single column layout
- Very long field values: Use text truncation with ellipsis and title attribute

```tsx
<span 
  className="text-sm font-medium text-foreground truncate" 
  title={field.value || ''}
>
  {field.value}
</span>
```

## Testing Strategy

### Visual Regression Testing

1. **Snapshot Tests**: Capture screenshots of attendee rows with various configurations
   - 0 custom fields
   - 1-2 custom fields
   - 3-5 custom fields
   - 6+ custom fields
   - With/without photos
   - With/without notes
   - Different credential statuses

2. **Cross-Browser Testing**: Verify appearance in Chrome, Firefox, Safari, Edge

3. **Responsive Testing**: Test at breakpoints: 375px, 768px, 1024px, 1440px

### Functional Testing

1. **Click Handlers**: Verify name click opens edit form with all fields
2. **URL Links**: Verify external links open in new tab
3. **Hidden Fields**: Verify hidden fields don't appear in display but are in edit form
4. **Real-time Updates**: Verify display updates when data changes
5. **Bulk Selection**: Verify checkboxes work correctly
6. **Permissions**: Verify edit button respects permissions

### Performance Testing

1. **Render Time**: Measure initial render with 100, 500, 1000 attendees
2. **Scroll Performance**: Test smooth scrolling with large datasets
3. **Filter Performance**: Measure filter/search response time
4. **Memory Usage**: Monitor memory consumption with large datasets

### Accessibility Testing

1. **Keyboard Navigation**: Tab through all interactive elements
2. **Screen Reader**: Test with NVDA/JAWS/VoiceOver
3. **Color Contrast**: Verify all text meets WCAG AA (4.5:1 for normal text)
4. **Focus Indicators**: Verify visible focus states on all interactive elements


### Top-Row Alignment Strategy

**Problem:** When custom fields expand to multiple rows in the name cell, other columns (photo, barcode, credential, status, actions) should not vertically center. They should stay at the top.

**Solution:** Apply `align-top` class to all TableCell components except the checkbox cell.

**Implementation:**
```tsx
<TableRow>
  <TableCell>{/* Checkbox - default alignment */}</TableCell>
  <TableCell className="align-top">{/* Photo */}</TableCell>
  <TableCell>{/* Name and custom fields - default alignment */}</TableCell>
  <TableCell className="align-top">{/* Barcode */}</TableCell>
  <TableCell className="align-top">{/* Credential */}</TableCell>
  <TableCell className="align-top">{/* Status */}</TableCell>
  <TableCell className="align-top">{/* Actions */}</TableCell>
</TableRow>
```

**Benefits:**
- Photo, barcode, credential icon, status badge, and actions menu all align to the top
- Custom fields can expand to 2, 3, or more rows without affecting other columns
- Maintains clean, organized appearance
- Improves scannability by keeping key controls at consistent position

## Design Specifications

### Color Palette

Following the existing violet-based design system:

#### Photo Container
- **Light Mode**: 
  - Background: `from-violet-50 to-violet-100`
  - Border: `border-violet-200`
  - Initials: `text-violet-600`
- **Dark Mode**: 
  - Background: `from-violet-950/30 to-violet-900/30`
  - Border: `border-violet-800/50`
  - Initials: `text-violet-400`

#### Notes Badge
- **Light Mode**: `bg-violet-100 text-violet-700 border-violet-200`
- **Dark Mode**: `bg-violet-900/30 text-violet-300 border-violet-800`

#### Status Badges
- **Current**: 
  - Light: `bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200 hover:border-emerald-300`
  - Dark: `bg-emerald-900/30 text-emerald-300 border-emerald-800 hover:bg-emerald-900/40 hover:border-emerald-700`
  - Hover uses slightly darker emerald instead of purple to avoid color clash
- **Outdated**: 
  - Light: `bg-red-100 text-red-800 border-red-200 hover:bg-red-200 hover:border-red-300`
  - Dark: `bg-red-900/30 text-red-300 border-red-800 hover:bg-red-900/40 hover:border-red-700`
  - Hover uses slightly darker red for consistency
- **None**: 
  - Uses `variant="secondary"` from shadcn/ui with default hover behavior

#### Boolean Field Badges
- **Yes**: 
  - Light: `bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100`
  - Dark: `bg-violet-950/20 text-violet-400 border-violet-900/50 hover:bg-violet-950/30`
  - Uses subtle, faint violet instead of bold primary color
- **No**: Uses `variant="secondary"` (muted gray)

### Typography

#### Name Display
- Font: System font stack (inherited)
- Size: `text-lg` (1.125rem / 18px)
- Weight: `font-semibold` (600)
- Color: `text-foreground` with `hover:text-primary`

#### Custom Field Labels
- Font: System font stack
- Size: `text-[11px]` (11px)
- Weight: `font-medium` (500)
- Transform: `uppercase`
- Tracking: `tracking-wide`
- Color: `text-muted-foreground`

#### Custom Field Values
- Font: System font stack (monospace for barcodes)
- Size: `text-sm` (0.875rem / 14px)
- Weight: `font-medium` (500)
- Color: `text-foreground`

#### Barcode Numbers
- Font: `font-mono` (monospace)
- Size: `text-sm` (0.875rem / 14px)
- Weight: Normal
- Color: Inherited from badge

### Spacing

#### Photo Cell
- Size: `w-20 h-24` (80px x 96px) - increased from 64x80px
- Padding: None (image fills container)
- Margin: None (flex-shrink-0 prevents compression)
- Alignment: `align-top` on TableCell

#### Name Cell
- Vertical Padding: None (removed `py-2` to eliminate extra space)
- Name-to-Badge Gap: `gap-2` (0.5rem / 8px)
- Name-to-Fields Gap: `mt-3 pt-3` (with border) - removed `mb-2` to eliminate blank line

#### Custom Fields Grid
- Column Gap: `gap-x-6` (1.5rem / 24px)
- Row Gap: `gap-y-2` (0.5rem / 8px)
- Label-to-Value Gap: `space-y-0.5` (0.125rem / 2px)

#### Status Badges
- Padding: `px-3 py-1` (0.75rem x 0.25rem)
- Icon-to-Text Gap: `mr-1` (0.25rem / 4px)

### Borders and Shadows

#### Photo Container
- Border: `border` (1px solid)
- Border Radius: `rounded-lg` (0.5rem / 8px)
- Shadow: `shadow-sm` default, `hover:shadow-md` on hover

#### Custom Fields Section
- Top Border: `border-t border-border/50` (50% opacity)

#### Badges
- Border: `border` (1px solid, color-specific)
- Border Radius: `rounded-md` (0.375rem / 6px)

### Animations and Transitions

#### Photo Hover Effect
```css
transition-all duration-200
hover:shadow-md
```

#### Name Hover Effect
```css
transition-colors
group-hover:text-primary
```

#### Link Hover Effect
```css
hover:text-primary/80
```

All transitions use the default easing function for consistency.

### Responsive Breakpoints

#### Mobile (< 768px)
- Custom fields: Single column (`grid-cols-1`)
- Photo size: Maintained at 64x80px
- Font sizes: Maintained (already optimized)

#### Tablet (768px - 1024px)
- Custom fields: Max 2 columns
- Photo size: Maintained
- Spacing: Maintained

#### Desktop (> 1024px)
- Custom fields: Full responsive grid (1-4 columns based on count)
- Photo size: Maintained
- Spacing: Full spacing as designed

### Accessibility Specifications

#### Focus States
All interactive elements use the default focus ring:
```css
focus:ring-2 focus:ring-ring focus:ring-offset-2
```

#### ARIA Labels
- Photo images: `alt` attribute with full name
- Clickable names: Implicit button role
- External links: `rel="noopener noreferrer"` for security
- Status badges: Text content provides context (not color-only)

#### Keyboard Navigation
- Tab order: Checkbox → Name → Actions dropdown
- Enter/Space on name: Opens edit form
- Enter/Space on links: Opens in new tab

#### Screen Reader Announcements
- Name button: "Edit [First Name] [Last Name]"
- Status badges: Icon + text both announced
- Custom field structure: Label and value both announced


## Implementation Considerations

### Performance Optimizations

#### 1. Memoization Strategy

```tsx
// Already exists - maintain this pattern
const visibleCustomFields = useMemo(() =>
  eventSettings?.customFields?.filter(
    (field: any) => field.showOnMainPage !== false
  ) || [],
  [eventSettings?.customFields]
);

// Add memoization for grid column calculation
const getGridColumns = useCallback((fieldCount: number): string => {
  if (fieldCount === 1) return 'grid-cols-1';
  if (fieldCount >= 2 && fieldCount <= 3) return 'grid-cols-2';
  if (fieldCount >= 4 && fieldCount <= 5) return 'grid-cols-3';
  return 'grid-cols-4';
}, []);
```

#### 2. Avoid Inline Function Definitions

Move repeated logic outside the map function:
```tsx
// Before: Inline function in map
{paginatedAttendees.map((attendee) => {
  const customFieldsWithValues = eventSettings?.customFields?.filter(...)
  // ...
})}

// After: Extract to helper function
const getCustomFieldsWithValues = (attendee: Attendee) => {
  return eventSettings?.customFields
    ?.filter((field: any) => field.showOnMainPage !== false)
    ?.sort((a: any, b: any) => a.order - b.order)
    ?.map((field: any) => {
      // ... processing logic
    })
    ?.filter((field: any) => field.fieldType === 'boolean' || field.value) || [];
};
```

#### 3. Image Loading Optimization

```tsx
<img
  src={attendee.photoUrl}
  alt={`${attendee.firstName} ${attendee.lastName}`}
  className="w-full h-full object-cover"
  loading="lazy" // Add lazy loading for off-screen images
  decoding="async" // Async image decoding
/>
```

### Backward Compatibility

#### Hidden Fields Support

The design maintains full compatibility with the `showOnMainPage` field:

```tsx
// Existing logic - no changes needed
const visibleCustomFields = useMemo(() =>
  eventSettings?.customFields?.filter(
    (field: any) => field.showOnMainPage !== false
  ) || [],
  [eventSettings?.customFields]
);
```

When editing an attendee:
1. Click handler fetches full attendee data: `GET /api/attendees/${id}`
2. Edit form receives ALL custom fields (including hidden ones)
3. Form displays all fields regardless of `showOnMainPage` setting
4. Save operation preserves all field values

#### Real-time Updates

The existing real-time subscription logic remains unchanged:
```tsx
useRealtimeSubscription({
  channels: [`databases.${databaseId}.collections.${attendeesCollectionId}.documents`],
  callback: useCallback((response: any) => {
    setTimeout(() => refreshAttendees(), 2000);
  }, [refreshAttendees])
});
```

The enhanced display will automatically update when data changes.

### Migration Strategy

#### Phase 1: Style Updates (Low Risk)
1. Update photo container styling
2. Enhance name display styling
3. Improve badge styling
4. Add icons to status badges

#### Phase 2: Layout Changes (Medium Risk)
1. Implement custom fields grid layout
2. Add responsive breakpoints
3. Update spacing and borders

#### Phase 3: Interaction Enhancements (Low Risk)
1. Add hover effects
2. Improve focus states
3. Enhance accessibility attributes

### Rollback Plan

If issues arise, the changes can be easily reverted by:
1. Reverting the styling classes to original values
2. Removing the grid layout (return to original flex layout)
3. Removing new icons and badges

The underlying data structure and logic remain unchanged, making rollback safe.

### Browser Compatibility

#### Supported Browsers
- Chrome/Edge: 90+
- Firefox: 88+
- Safari: 14+

#### CSS Features Used
- CSS Grid: Widely supported
- Flexbox: Widely supported
- CSS Variables: Widely supported (via Tailwind)
- Gradient backgrounds: Widely supported

#### Fallbacks
- Grid layout: Falls back to single column on older browsers
- Gradient backgrounds: Falls back to solid color
- Shadows: Gracefully degrades

### Dark Mode Support

All color values include dark mode variants using Tailwind's `dark:` prefix:

```tsx
className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
```

The design automatically adapts when the `dark` class is present on the `<html>` element.

### Internationalization (i18n)

The design supports internationalization:
- Text labels use existing i18n patterns
- Layout adapts to different text lengths
- RTL support via Tailwind's `rtl:` prefix (if needed in future)

### Security Considerations

#### URL Field Handling
```tsx
<a
  href={field.value || ''}
  target="_blank"
  rel="noopener noreferrer" // Prevents window.opener access
  onClick={(e) => e.stopPropagation()} // Prevents row click
>
```

#### XSS Prevention
- All user-generated content is rendered as text (React escapes by default)
- URLs are not executed as JavaScript
- No `dangerouslySetInnerHTML` usage

## Conclusion

This design provides a comprehensive approach to enhancing the attendee display while maintaining full compatibility with existing features. The implementation focuses on visual improvements and better information hierarchy without changing the underlying data structures or business logic.

The design is:
- **Visually appealing**: Modern styling with proper use of color, typography, and spacing
- **Highly readable**: Clear hierarchy and organized layout
- **Fully compatible**: Works with all existing features including hidden fields
- **Performant**: Uses React optimization patterns appropriately
- **Accessible**: Meets WCAG AA standards
- **Responsive**: Works seamlessly across all device sizes

The phased implementation approach allows for incremental deployment and easy rollback if needed.
