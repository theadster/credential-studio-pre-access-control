# Requirements Document

## Introduction

This specification addresses the incomplete integration field mapping in the Appwrite migration. While the migration successfully created separate integration collections (Cloudinary, Switchboard Canvas, OneSimpleAPI) and some fields are being read correctly, several boolean and configuration fields are not being properly mapped back to the flattened format expected by the frontend. This causes integration settings like "Auto-optimize images", "Generate thumbnails", "Disable Skip Crop button", and "Crop Aspect Ratio" to not display or function correctly in the UI.

## Requirements

### Requirement 1: Complete Cloudinary Integration Field Mapping

**User Story:** As an event administrator, I want all Cloudinary integration settings to be properly saved and displayed, so that I can configure photo upload behavior correctly.

#### Acceptance Criteria

1. WHEN the event settings API fetches Cloudinary integration data THEN it SHALL map all fields including autoOptimize, generateThumbnails, disableSkipCrop, and cropAspectRatio to the flattened response format
2. WHEN the frontend displays event settings THEN it SHALL show the correct values for all Cloudinary boolean switches and dropdown fields
3. WHEN an administrator updates Cloudinary settings THEN the system SHALL save all fields to the Cloudinary integration collection
4. WHEN the Cloudinary integration document is missing optional fields THEN the system SHALL provide appropriate default values (false for booleans, '1' for cropAspectRatio)
5. WHEN the event settings are cached THEN the cache SHALL include all Cloudinary integration fields

### Requirement 2: Complete Switchboard Canvas Integration Field Mapping

**User Story:** As an event administrator, I want all Switchboard Canvas integration settings to be properly saved and displayed, so that credential printing works correctly.

#### Acceptance Criteria

1. WHEN the event settings API fetches Switchboard integration data THEN it SHALL map all fields including authHeaderType, requestBody, templateId, and fieldMappings to the flattened response format
2. WHEN the frontend displays event settings THEN it SHALL show the correct values for all Switchboard configuration fields
3. WHEN an administrator updates Switchboard settings THEN the system SHALL save all fields to the Switchboard integration collection
4. WHEN fieldMappings is stored as a JSON string THEN the system SHALL parse it correctly for the response
5. WHEN the Switchboard integration document is missing optional fields THEN the system SHALL provide appropriate default values

### Requirement 3: Complete OneSimpleAPI Integration Field Mapping

**User Story:** As an event administrator, I want all OneSimpleAPI integration settings to be properly saved and displayed, so that external API integration works correctly.

#### Acceptance Criteria

1. WHEN the event settings API fetches OneSimpleAPI integration data THEN it SHALL map all fields including url, formDataKey, formDataValue, and recordTemplate to the flattened response format
2. WHEN the frontend displays event settings THEN it SHALL show the correct values for all OneSimpleAPI configuration fields
3. WHEN an administrator updates OneSimpleAPI settings THEN the system SHALL save all fields to the OneSimpleAPI integration collection
4. WHEN the OneSimpleAPI integration document is missing optional fields THEN the system SHALL provide appropriate default values

### Requirement 4: Integration Field Updates

**User Story:** As an event administrator, I want my changes to integration settings to be properly saved, so that my configuration persists across sessions.

#### Acceptance Criteria

1. WHEN an administrator updates event settings with integration fields THEN the system SHALL extract integration-specific fields from the request
2. WHEN Cloudinary fields are updated THEN the system SHALL call updateCloudinaryIntegration with all relevant fields
3. WHEN Switchboard fields are updated THEN the system SHALL call updateSwitchboardIntegration with all relevant fields
4. WHEN OneSimpleAPI fields are updated THEN the system SHALL call updateOneSimpleApiIntegration with all relevant fields
5. WHEN integration updates fail THEN the system SHALL handle errors gracefully and provide meaningful error messages
6. WHEN integration updates succeed THEN the system SHALL invalidate the event settings cache

### Requirement 5: Backward Compatibility

**User Story:** As a developer, I want the integration field mapping to maintain backward compatibility with existing frontend code, so that no UI changes are required.

#### Acceptance Criteria

1. WHEN the API returns event settings THEN it SHALL use the flattened field naming convention (e.g., cloudinaryAutoOptimize, switchboardAuthHeaderType)
2. WHEN the API receives event settings updates THEN it SHALL accept the flattened field naming convention
3. WHEN integration data is missing THEN the system SHALL provide default values that match the previous behavior
4. WHEN the flattenEventSettings helper is used THEN it SHALL correctly map all integration fields to the expected format

### Requirement 6: Data Consistency

**User Story:** As a system administrator, I want integration data to remain consistent across reads and writes, so that configuration doesn't get lost or corrupted.

#### Acceptance Criteria

1. WHEN integration fields are read from separate collections THEN they SHALL be merged correctly with core event settings
2. WHEN integration fields are updated THEN they SHALL be written to the correct integration collection
3. WHEN multiple integration updates occur THEN the system SHALL use optimistic locking to prevent conflicts
4. WHEN integration documents don't exist THEN the system SHALL create them with appropriate default values
5. WHEN integration fields are null or undefined THEN the system SHALL handle them gracefully without errors
