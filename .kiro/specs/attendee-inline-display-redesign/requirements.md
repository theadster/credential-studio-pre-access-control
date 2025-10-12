# Requirements Document

## Introduction

This specification defines the requirements for redesigning the inline display of attendee data in the Attendees table on the Dashboard page. The current implementation displays attendee information in a basic table format with custom fields shown as small text below the name. The redesign aims to enhance visual appeal, improve readability, and maintain full compatibility with existing features including hidden fields, bulk operations, real-time updates, and permission-based access control.

The redesign will focus on creating a more modern, card-like presentation within the table structure that better showcases attendee information, makes custom fields more prominent and scannable, and provides better visual hierarchy while maintaining the existing functionality and performance characteristics.

## Requirements

### Requirement 1: Enhanced Visual Presentation

**User Story:** As an event organizer, I want the attendee list to be visually appealing and modern, so that I can enjoy using the system and quickly identify attendees at a glance.

#### Acceptance Criteria

1. WHEN viewing the attendees table THEN the display SHALL use modern design elements including appropriate spacing, typography, and color schemes consistent with the existing violet-based design system
2. WHEN viewing attendee rows THEN each row SHALL have clear visual separation and hierarchy that makes it easy to distinguish between different attendees
3. WHEN viewing attendee information THEN the photo SHALL be prominently displayed with appropriate sizing and aspect ratio
4. WHEN viewing the table THEN the design SHALL maintain consistency with the existing shadcn/ui component library and Tailwind CSS styling patterns
5. WHEN viewing in dark mode THEN all visual elements SHALL adapt appropriately with proper contrast ratios meeting WCAG AA standards

### Requirement 2: Improved Readability and Scannability

**User Story:** As a registration staff member, I want to quickly scan and read attendee information, so that I can efficiently process attendees during check-in.

#### Acceptance Criteria

1. WHEN viewing attendee names THEN they SHALL be displayed with clear typography hierarchy using appropriate font sizes and weights
2. WHEN viewing custom field data THEN each field SHALL be clearly labeled and visually distinct from other fields
3. WHEN viewing multiple custom fields THEN they SHALL be organized in a logical, grid-based layout that maximizes readability
4. WHEN viewing barcode numbers THEN they SHALL be displayed on the same line as the attendee's name in the barcode column
5. WHEN viewing credential status THEN status indicators SHALL use color-coded badges with clear labels (Current, Outdated, None)
6. WHEN viewing attendees with notes THEN a visual indicator SHALL clearly show that notes exist without cluttering the display
7. WHEN custom fields contain URLs THEN they SHALL be displayed as clickable links with appropriate styling
8. WHEN viewing the name cell THEN there SHALL be no extra blank line underneath the attendee's name before custom fields display

### Requirement 3: Responsive Grid Layout for Custom Fields

**User Story:** As an event administrator, I want custom fields to be displayed in an organized grid layout that expands to use full available width, so that I can see all relevant information without excessive scrolling or clutter.

#### Acceptance Criteria

1. WHEN an attendee has 1 custom field visible THEN it SHALL display in a single-column layout
2. WHEN an attendee has 2-3 custom fields visible THEN they SHALL display in a 2-column grid layout
3. WHEN an attendee has 4-5 custom fields visible THEN they SHALL display in a 3-column grid layout
4. WHEN an attendee has 6 or more custom fields visible THEN they SHALL display in a 4-column grid layout
5. WHEN viewing custom fields THEN the grid SHALL maintain consistent spacing and alignment across all rows
6. WHEN viewing boolean fields THEN they SHALL display as "Yes" or "No" with appropriate visual styling
7. WHEN viewing empty fields THEN they SHALL be hidden from display (except boolean fields which always show)
8. WHEN custom fields extend beyond one row THEN they SHALL wrap to additional rows without affecting other data in the attendee box
9. WHEN viewing custom fields THEN they SHALL occupy the full width available in the name cell below the separator line

### Requirement 4: Enhanced Photo Display

**User Story:** As a security personnel, I want attendee photos to be clearly visible, appropriately sized, and positioned at the top of their column, so that I can quickly verify attendee identity.

#### Acceptance Criteria

1. WHEN viewing an attendee with a photo THEN the photo SHALL be displayed at a size larger than 64x80 pixels (w x h) with proper aspect ratio
2. WHEN viewing an attendee without a photo THEN a placeholder SHALL display the attendee's initials with appropriate styling
3. WHEN hovering over a photo THEN there SHALL be a subtle visual effect indicating interactivity
4. WHEN viewing photos THEN they SHALL be properly cropped and centered using object-fit cover
5. WHEN viewing the photo column THEN it SHALL have consistent width and alignment across all rows
6. WHEN viewing photos THEN they SHALL be positioned at the top of their column rather than vertically centered within the attendee box

### Requirement 5: Optimized Top Row Layout

**User Story:** As an event coordinator, I want the credential image, link, status badge, and actions menu to remain at the top of the attendee box on a single line, so that I can quickly access these controls without scrolling.

#### Acceptance Criteria

1. WHEN viewing the attendee row THEN the credential image icon, status badge, and actions dropdown SHALL be positioned on the first line of their respective columns
2. WHEN viewing on different screen sizes THEN these top-row elements SHALL NOT become vertically responsive or move down
3. WHEN viewing the barcode column THEN the barcode icon and number SHALL be displayed on the same line under the "Barcode" heading
4. WHEN custom fields expand to multiple rows THEN the top-row elements SHALL remain fixed at the top of their columns
5. WHEN the photo is positioned at the top of its column THEN it SHALL align with the top-row elements in other columns

### Requirement 6: Improved Status and Badge Display

**User Story:** As an event coordinator, I want to quickly identify credential status and special attributes, so that I can prioritize actions and identify issues.

#### Acceptance Criteria

1. WHEN viewing credential status THEN it SHALL use color-coded badges: green for "Current", red for "Outdated", and gray for "None"
2. WHEN viewing the notes indicator THEN it SHALL use a small, unobtrusive badge that doesn't interfere with the name display
3. WHEN viewing barcode numbers THEN they SHALL be displayed in a badge format with outline styling on the same line as the barcode icon
4. WHEN viewing status badges THEN they SHALL use consistent sizing, padding, and typography
5. WHEN viewing badges in dark mode THEN they SHALL maintain appropriate contrast and visibility

### Requirement 7: Compatibility with Hidden Fields

**User Story:** As an event administrator, I want the redesigned display to respect field visibility settings, so that hidden fields remain hidden while visible fields are prominently displayed.

#### Acceptance Criteria

1. WHEN a custom field has showOnMainPage set to false THEN it SHALL NOT appear in the inline display
2. WHEN a custom field has showOnMainPage set to true or undefined THEN it SHALL appear in the inline display
3. WHEN viewing the attendee edit form THEN all fields (including hidden ones) SHALL be available for editing
4. WHEN exporting attendee data THEN all fields (including hidden ones) SHALL be included in the export
5. WHEN field visibility settings change THEN the display SHALL update automatically via real-time subscriptions

### Requirement 8: Maintain Existing Functionality

**User Story:** As a system user, I want all existing features to continue working seamlessly, so that the redesign doesn't disrupt my workflow.

#### Acceptance Criteria

1. WHEN clicking on an attendee name THEN it SHALL open the edit form with all fields (including hidden ones) populated correctly
2. WHEN using bulk selection THEN checkboxes SHALL function identically to the current implementation
3. WHEN using search and filters THEN they SHALL continue to work with the same logic and performance
4. WHEN using pagination THEN it SHALL maintain the same behavior and performance characteristics
5. WHEN using the actions dropdown THEN all actions (Edit, Delete, Generate Credential, etc.) SHALL function identically
6. WHEN real-time updates occur THEN the display SHALL update automatically without losing user context
7. WHEN permission checks are applied THEN they SHALL continue to control access to features appropriately

### Requirement 9: Performance and Optimization

**User Story:** As a system user, I want the redesigned display to load quickly and perform smoothly, so that I can work efficiently with large attendee lists.

#### Acceptance Criteria

1. WHEN viewing the attendees table THEN the initial render time SHALL NOT increase by more than 10% compared to the current implementation
2. WHEN scrolling through attendees THEN the display SHALL remain smooth and responsive
3. WHEN filtering or searching THEN the results SHALL update within 500ms
4. WHEN using useMemo for custom field filtering THEN it SHALL prevent unnecessary recalculations
5. WHEN rendering custom fields THEN the grid layout calculation SHALL be optimized to avoid performance bottlenecks

### Requirement 10: Accessibility Compliance

**User Story:** As a user with accessibility needs, I want the redesigned display to be fully accessible, so that I can use the system effectively with assistive technologies.

#### Acceptance Criteria

1. WHEN using keyboard navigation THEN all interactive elements SHALL be accessible via Tab key
2. WHEN using screen readers THEN all information SHALL be properly announced with appropriate ARIA labels
3. WHEN viewing color-coded elements THEN they SHALL include text labels in addition to color (not color-only indicators)
4. WHEN viewing in high contrast mode THEN all elements SHALL remain visible and distinguishable
5. WHEN viewing with increased font sizes THEN the layout SHALL adapt gracefully without breaking

### Requirement 11: Mobile and Responsive Design

**User Story:** As a mobile user, I want the attendee display to work well on smaller screens, so that I can manage attendees from any device.

#### Acceptance Criteria

1. WHEN viewing on mobile devices (< 768px) THEN the custom field grid SHALL adapt to a single-column layout
2. WHEN viewing on tablet devices (768px - 1024px) THEN the custom field grid SHALL use appropriate column counts
3. WHEN viewing on desktop devices (> 1024px) THEN the custom field grid SHALL use the full responsive grid system
4. WHEN viewing on any device THEN photos SHALL scale appropriately while maintaining aspect ratio
5. WHEN viewing on any device THEN all interactive elements SHALL remain accessible and usable
6. WHEN viewing on any device THEN the top-row elements (credential, status, actions) SHALL remain on the first line and not become vertically responsive
