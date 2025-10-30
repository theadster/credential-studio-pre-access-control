/**
 * UserForm Type Definitions
 * 
 * Shared types and interfaces for the UserForm component module.
 * These types are used across all UserForm components and hooks.
 */

import { AppwriteAuthUser } from '@/components/AuthUserSearch';

/**
 * User entity from the database
 * Represents a user profile linked to an Appwrite auth user
 */
export interface User {
  /** Database record ID */
  id: string;

  /** Appwrite auth user ID (optional - may not be linked) */
  userId?: string;

  /** User's email address */
  email: string;

  /** User's display name */
  name: string | null;

  /** User's assigned role with permissions */
  role: {
    id: string;
    name: string;
    permissions: Record<string, unknown>;
  } | null;

  /** Whether user was created via invitation */
  isInvited?: boolean;

  /** Account creation timestamp */
  createdAt: string;
}

/**
 * Role entity from the database
 * Represents a role that can be assigned to users
 */
export interface Role {
  /** Database record ID (legacy field) */
  id?: string;

  /** Appwrite document ID */
  $id?: string;

  /** Role name (e.g., "Administrator", "Staff") */
  name: string;

  /** Role description */
  description: string | null;

  /** 
   * Role permissions object
   * Maps permission keys to boolean values indicating if permission is granted
   * Example: { "users.create": true, "users.delete": false }
   */
  permissions: Record<string, boolean | Record<string, boolean>>;
}

/**
 * Form data structure for user creation/editing
 * Used to manage form state
 */
export interface UserFormData {
  /** User's email address */
  email: string;

  /** User's display name */
  name: string;

  /** Selected role ID */
  roleId: string | undefined;

  /** Selected Appwrite auth user ID (link mode only) */
  authUserId: string;

  /** Whether to add user to project team (link mode only) */
  addToTeam: boolean;
}

/**
 * UserForm operation mode
 * - 'link': Link existing Appwrite auth user to application
 * - 'edit': Edit existing user profile
 */
export type UserFormMode = 'link' | 'edit';

/**
 * Props for the main UserForm component
 */
export interface UserFormProps {
  /** Whether the dialog is open */
  isOpen: boolean;

  /** Callback to close the dialog */
  onClose: () => void;

  /** 
   * Callback to save user data
   * Accepts either full UserFormData or partial data for link mode
   */
  onSave: (userData: UserFormData | Partial<UserFormData>) => Promise<void>;

  /** User to edit (undefined for link mode) */
  user?: User | null;

  /** Available roles for assignment */
  roles: Role[];

  /** Operation mode (defaults to 'edit') */
  mode?: UserFormMode;
}

/**
 * Props for the RoleSelector component
 */
export interface RoleSelectorProps {
  /** Selected role ID */
  value: string | undefined;

  /** Callback when role changes */
  onChange: (roleId: string) => void;

  /** Available roles */
  roles: Role[];

  /** Whether the selector is disabled */
  disabled?: boolean;
}

/**
 * Props for the AuthUserSelector component
 */
export interface AuthUserSelectorProps {
  /** Selected auth user */
  selectedUser: AppwriteAuthUser | null;

  /** Callback when user is selected */
  onSelect: (user: AppwriteAuthUser) => void;

  /** Available auth users */
  authUsers: AppwriteAuthUser[];

  /** Whether search is loading */
  loading: boolean;

  /** Callback to search for users */
  onSearch: (query: string) => void;
}

/**
 * Props for the PasswordResetSection component
 */
export interface PasswordResetSectionProps {
  /** User to send password reset to */
  user: User;

  /** Whether password reset is being sent */
  sending: boolean;

  /** Callback to send password reset */
  onSendReset: () => void;
}

/**
 * Props for the UserFormFields component
 */
export interface UserFormFieldsProps {
  /** Form data */
  formData: UserFormData;

  /** 
   * Callback when field changes
   * Value type depends on the field being updated
   */
  onChange: (field: keyof UserFormData, value: string | boolean | undefined) => void;

  /** Available roles */
  roles: Role[];

  /** Operation mode */
  mode: UserFormMode;

  /** User being edited (edit mode only) */
  user?: User | null;

  /** Selected auth user (link mode only) */
  selectedAuthUser?: AppwriteAuthUser | null;

  /** Available auth users (link mode only) */
  authUsers?: AppwriteAuthUser[];

  /** Whether auth users are loading (link mode only) */
  searchLoading?: boolean;

  /** Callback when auth user is selected (link mode only) */
  onAuthUserSelect?: (user: AppwriteAuthUser) => void;
}

/**
 * Validation error structure
 */
export interface ValidationError {
  /** Field that has the error */
  field: string;

  /** Error message */
  message: string;
}

/**
 * Validation result structure
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;

  /** Array of validation errors */
  errors: ValidationError[];
}

// Re-export AppwriteAuthUser for convenience
export type { AppwriteAuthUser };
