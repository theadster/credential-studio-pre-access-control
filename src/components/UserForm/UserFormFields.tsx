/**
 * UserFormFields Component
 * 
 * Form input fields for user creation and editing.
 * Renders different fields based on mode (link vs edit).
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import RoleSelector from './RoleSelector';
import AuthUserSelector from './AuthUserSelector';
import { UserFormFieldsProps } from './types';

// Module-level constant for team ID
const PROJECT_TEAM_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID;

/**
 * User form fields component
 * 
 * @param props - Component props
 * @returns Form fields based on mode
 */
export default function UserFormFields({
  formData,
  onChange,
  roles,
  mode,
  user,
  selectedAuthUser,
  authUsers = [],
  searchLoading = false,
  onAuthUserSelect,
}: UserFormFieldsProps) {
  // Link mode - show auth user selector and role
  if (mode === 'link') {
    return (
      <>
        {/* Auth User Search and Selection */}
        <AuthUserSelector
          selectedUser={selectedAuthUser || null}
          onSelect={onAuthUserSelect || ((authUser) => {
            onChange('authUserId', authUser.$id);
            onChange('email', authUser.email);
            onChange('name', authUser.name);
          })}
          authUsers={authUsers}
          loading={searchLoading}
          onSearch={() => {}} // Search is handled by AuthUserSearch component
        />

        {/* Role Selection */}
        <RoleSelector
          value={formData.roleId}
          onChange={(roleId) => onChange('roleId', roleId)}
          roles={roles}
        />

        {/* Optional Team Membership */}
        {PROJECT_TEAM_ID && (
          <div className="flex items-center space-x-2 p-3 border border-border rounded-md">
            <Checkbox
              id="addToTeam"
              checked={formData.addToTeam}
              onCheckedChange={(checked) => onChange('addToTeam', checked as boolean)}
            />
            <div className="flex flex-col">
              <Label
                htmlFor="addToTeam"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Add to project team
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Grant this user access to project resources through team membership
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  // Edit mode - show traditional form fields
  return (
    <>
      {/* Email Address */}
      <div className="space-y-2">
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="text"
          inputMode="email"
          value={formData.email}
          onChange={(e) => onChange('email', e.target.value.trim())}
          placeholder="user@example.com"
          disabled={!!user} // Don't allow email changes for existing users
          required
          autoComplete="off"
          data-form-type="other"
          data-lpignore="true"
        />
      </div>

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Full Name *</Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="John Doe"
          required
          autoComplete="off"
          data-form-type="other"
          data-lpignore="true"
        />
      </div>

      {/* Role Selection */}
      <RoleSelector
        value={formData.roleId}
        onChange={(roleId) => onChange('roleId', roleId)}
        roles={roles}
      />
    </>
  );
}
