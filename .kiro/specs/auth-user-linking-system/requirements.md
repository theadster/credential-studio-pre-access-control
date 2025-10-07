# Requirements Document

## Introduction

This feature transforms the user management system from creating new Appwrite auth users to linking existing Appwrite auth users to the application. The current system creates new auth accounts when adding users, but after migrating to Appwrite for authentication and database, the workflow should change to:

1. Users already exist in the Appwrite auth system
2. Administrators link these existing auth users to the application
3. Users are assigned roles and permissions within the application
4. Optionally, team memberships are managed to control project access

This change aligns with the Appwrite authentication model where users authenticate first, then are granted access to specific projects/teams through memberships.

## Requirements

### Requirement 1: Link Existing Auth Users

**User Story:** As an administrator, I want to link existing Appwrite auth users to my application, so that I can grant them access and assign roles without creating duplicate accounts.

#### Acceptance Criteria

1. WHEN an administrator opens the "Add User" dialog THEN the system SHALL display a user search/selection interface instead of user creation fields
2. WHEN an administrator searches for users THEN the system SHALL query existing Appwrite auth users by email or name
3. WHEN an administrator selects an auth user THEN the system SHALL verify the user is not already linked to the application
4. IF a selected auth user is already linked THEN the system SHALL display an error message "This user is already linked to the application"
5. WHEN an administrator assigns a role and confirms THEN the system SHALL create a user profile record linking the auth user ID to the selected role
6. WHEN a user profile is created THEN the system SHALL log the action with details including auth user email, name, and assigned role
7. WHEN the linking is successful THEN the system SHALL display a success message and refresh the users list

### Requirement 2: Search and Browse Auth Users

**User Story:** As an administrator, I want to search and browse existing Appwrite auth users, so that I can find the correct user to link to my application.

#### Acceptance Criteria

1. WHEN the user search interface loads THEN the system SHALL fetch and display a list of Appwrite auth users
2. WHEN an administrator types in the search field THEN the system SHALL filter auth users by email or name in real-time
3. WHEN displaying auth users THEN the system SHALL show email, name, and account creation date
4. WHEN displaying auth users THEN the system SHALL indicate which users are already linked to the application
5. IF an auth user is already linked THEN the system SHALL disable selection and show a "Already Linked" badge
6. WHEN there are many auth users THEN the system SHALL implement pagination with 25 users per page
7. WHEN no users match the search THEN the system SHALL display "No users found matching your search"

### Requirement 3: Update User Form UI

**User Story:** As an administrator, I want an intuitive interface for linking users, so that I can quickly grant access to the right people.

#### Acceptance Criteria

1. WHEN the "Add User" button is clicked THEN the system SHALL open a dialog titled "Link Existing User"
2. WHEN the dialog opens THEN the system SHALL display a search input with placeholder "Search by email or name"
3. WHEN the dialog opens THEN the system SHALL display a scrollable list of auth users below the search
4. WHEN an auth user is selected THEN the system SHALL highlight the selection and display their details
5. WHEN an auth user is selected THEN the system SHALL show a role selection dropdown
6. WHEN the role dropdown is opened THEN the system SHALL display all available roles with descriptions
7. WHEN editing an existing linked user THEN the system SHALL show the current role and allow updating it
8. WHEN editing an existing linked user THEN the system SHALL NOT allow changing the linked auth user
9. WHEN the form is submitted THEN the system SHALL show a loading state on the submit button

### Requirement 4: Remove Auth User Creation

**User Story:** As a system administrator, I want to ensure users are not created in the auth system from the application, so that authentication remains centralized in Appwrite.

#### Acceptance Criteria

1. WHEN the POST /api/users endpoint is called THEN the system SHALL NOT call Appwrite's users.create() method
2. WHEN the POST /api/users endpoint is called THEN the system SHALL expect an authUserId parameter instead of email/password
3. WHEN creating a user profile THEN the system SHALL validate the authUserId exists in Appwrite auth
4. IF the authUserId does not exist THEN the system SHALL return a 400 error "Invalid auth user ID"
5. WHEN a user profile is created THEN the system SHALL NOT generate temporary passwords
6. WHEN a user profile is created THEN the system SHALL NOT send invitation emails
7. WHEN the DELETE endpoint is called with deleteFromAuth=true THEN the system SHALL still support deleting from auth for cleanup purposes

### Requirement 5: Team Membership Management (Optional)

**User Story:** As an administrator, I want to manage Appwrite team memberships when linking users, so that users have proper access to the project resources.

#### Acceptance Criteria

1. WHEN linking a user THEN the system SHALL optionally add the user to an Appwrite team
2. IF team membership is enabled THEN the system SHALL display a checkbox "Add to project team"
3. WHEN the team checkbox is selected THEN the system SHALL use the Appwrite Teams API to create a membership
4. WHEN creating a team membership THEN the system SHALL assign appropriate team roles based on application role
5. IF team membership creation fails THEN the system SHALL still create the user profile but log a warning
6. WHEN unlinking a user THEN the system SHALL optionally remove the team membership
7. WHEN displaying linked users THEN the system SHALL show team membership status

### Requirement 6: Backward Compatibility

**User Story:** As a system administrator, I want existing user profiles to continue working, so that the migration doesn't break current functionality.

#### Acceptance Criteria

1. WHEN the system loads existing user profiles THEN the system SHALL continue to display them correctly
2. WHEN existing users log in THEN the system SHALL authenticate them without issues
3. WHEN the users list is displayed THEN the system SHALL show both old and new user profiles
4. WHEN editing an old user profile THEN the system SHALL allow updating the role
5. IF an old user profile has isInvited=true THEN the system SHALL display an "Invited User" badge
6. WHEN deleting old user profiles THEN the system SHALL support the existing deletion flow

### Requirement 7: Error Handling and Validation

**User Story:** As an administrator, I want clear error messages when linking fails, so that I can understand and resolve issues quickly.

#### Acceptance Criteria

1. WHEN the Appwrite API is unavailable THEN the system SHALL display "Unable to connect to authentication service"
2. WHEN an auth user is already linked THEN the system SHALL display "This user already has access to the application"
3. WHEN no role is selected THEN the system SHALL display "Please select a role for this user"
4. WHEN the auth user ID is invalid THEN the system SHALL display "Selected user not found in authentication system"
5. WHEN team membership fails THEN the system SHALL display "User linked successfully but team membership failed"
6. WHEN any error occurs THEN the system SHALL log the error details for debugging
7. WHEN validation fails THEN the system SHALL prevent form submission and highlight the error

### Requirement 8: Email Verification Management

**User Story:** As an administrator, I want to see which users have verified their email and send verification emails to unverified users, so that I can ensure all users have verified accounts before granting access.

#### Acceptance Criteria

1. WHEN displaying auth users in the search list THEN the system SHALL show an email verification status badge for each user
2. IF a user's email is verified THEN the system SHALL display a green "Verified" badge
3. IF a user's email is not verified THEN the system SHALL display a yellow "Unverified" badge
4. WHEN an unverified user is displayed THEN the system SHALL show a "Send Verification Email" button
5. WHEN the "Send Verification Email" button is clicked THEN the system SHALL call the Appwrite API to send a verification email
6. WHEN a verification email is sent successfully THEN the system SHALL display "Verification email sent successfully"
7. IF a verification email fails to send THEN the system SHALL display an appropriate error message
8. WHEN sending verification emails THEN the system SHALL enforce rate limiting (max 3 per user per hour)
9. IF rate limit is exceeded THEN the system SHALL display "Too many verification emails sent. Please try again later."
10. IF a user's email is already verified THEN the system SHALL disable the "Send Verification Email" button
11. WHEN a verification email is sent THEN the system SHALL log the action with administrator ID and user email

### Requirement 9: Permissions and Access Control

**User Story:** As a system administrator, I want to ensure only authorized users can link auth users, so that access control remains secure.

#### Acceptance Criteria

1. WHEN a user without 'users.create' permission attempts to link a user THEN the system SHALL return a 403 error
2. WHEN a user without 'users.read' permission attempts to search auth users THEN the system SHALL return a 403 error
3. WHEN a user without 'users.update' permission attempts to update roles THEN the system SHALL return a 403 error
4. WHEN a user without 'users.delete' permission attempts to unlink users THEN the system SHALL return a 403 error
5. WHEN checking permissions THEN the system SHALL use the existing hasPermission() function
6. WHEN displaying the UI THEN the system SHALL hide link/unlink buttons for users without permissions
7. WHEN logging actions THEN the system SHALL record which administrator performed the linking

## Out of Scope

The following items are explicitly out of scope for this feature:

- Creating new Appwrite auth users from the application
- Sending invitation emails to new users
- Password management or reset functionality
- Bulk user linking operations
- User profile synchronization with Appwrite auth data
- Automatic team membership based on email domain
- Integration with external identity providers
- User onboarding workflows

## Technical Constraints

- Must use Appwrite SDK version compatible with the project
- Must maintain existing database schema for user profiles
- Must not break existing authentication flows
- Team membership feature depends on Appwrite Teams API availability
- Search functionality limited by Appwrite Users API capabilities

## Success Metrics

- Administrators can successfully link existing auth users
- Zero new auth users created from the application
- User linking completes in under 3 seconds
- Error messages are clear and actionable
- Existing user profiles continue to function correctly
