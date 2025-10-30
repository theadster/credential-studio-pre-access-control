/**
 * RoleSelector Component
 * 
 * Dropdown selector for user roles with descriptions.
 * Displays role name and description in a clean, accessible format.
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCheck } from 'lucide-react';
import { RoleSelectorProps } from './types';

/**
 * Role selector component
 * 
 * @param props - Component props
 * @returns Role selector dropdown
 */
export default function RoleSelector({ value, onChange, roles, disabled = false }: RoleSelectorProps) {
  // Filter out roles without valid IDs and log warnings
  const validRoles = roles.filter(role => {
    const roleId = role.$id || role.id;
    if (!roleId) {
      // Data integrity issue: role missing both $id and id fields
      // This indicates an upstream problem in role creation or fetching
      console.warn('Role without valid ID detected and skipped:', {
        name: role.name,
        hasDescription: !!role.description,
      });
      return false;
    }
    return true;
  });

  // Find selected role for display
  const selectedRole = value ? validRoles.find(r => (r.$id || r.id) === value) : null;

  return (
    <div className="space-y-2">
      <Label htmlFor="role">Role *</Label>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger id="role">
          <SelectValue placeholder="Select a role">
            {selectedRole && (
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 flex-shrink-0" />
                <span>{selectedRole.name}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent position="popper" sideOffset={4} className="max-w-[380px]">
          {validRoles.map((role) => {
            const roleId = role.$id ?? role.id;
            // This should never happen due to filtering, but TypeScript needs the guard
            if (!roleId) return null;

            return (
              <SelectItem key={roleId} value={roleId} className="max-w-[380px]">
                <div className="flex items-start gap-2 py-1">
                  <UserCheck className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-medium text-sm">{role.name}</span>
                    {role.description && (
                      <span className="text-xs text-muted-foreground leading-tight">
                        {role.description}
                      </span>
                    )}
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
