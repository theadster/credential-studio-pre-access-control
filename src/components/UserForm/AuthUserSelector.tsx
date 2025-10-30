/**
 * AuthUserSelector Component
 * 
 * Combines AuthUserSearch and AuthUserList for selecting Appwrite auth users.
 * Shows selected user in a card with their details.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, User as UserIcon } from 'lucide-react';
import AuthUserSearch from '@/components/AuthUserSearch';
import AuthUserList from '@/components/AuthUserList';
import { AuthUserSelectorProps } from './types';

/**
 * Auth user selector component
 * 
 * @param props - Component props
 * @returns Auth user search and selection UI
 */
export default function AuthUserSelector({
  selectedUser,
  onSelect,
  authUsers,
  loading,
  onSearch,
}: AuthUserSelectorProps) {
  return (
    <div className="space-y-4">
      {/* Search Component */}
      <AuthUserSearch
        onSelect={onSelect}
        selectedUserId={selectedUser?.$id}
        linkedUserIds={[]}
      />

      {/* User List */}
      <AuthUserList
        users={authUsers}
        selectedUserId={selectedUser?.$id}
        linkedUserIds={[]}
        onSelect={onSelect}
        loading={loading}
      />

      {/* Selected User Display Card */}
      {selectedUser && (
        <Card className="border-primary">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <UserIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm mb-1">Selected User</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                  {selectedUser.name && (
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{selectedUser.name}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
