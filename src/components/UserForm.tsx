/**
 * UserForm Component
 * 
 * This component handles two user management scenarios:
 * 
 * 1. LINK MODE: Link existing Appwrite auth users to the application
 *    - Searches for existing Appwrite auth users
 *    - Creates a user profile in the database linking to the auth user
 *    - Assigns a role to the user
 *    - Optionally adds user to project team
 * 
 * 2. EDIT MODE: Update existing user profiles
 *    - Updates user name and role assignment
 *    - Provides password reset functionality for users with auth accounts
 * 
 * NOTE: This component does NOT create new Appwrite auth users with passwords.
 * New auth users are created through the /api/auth/signup endpoint, which uses
 * Appwrite's built-in authentication system (enforces 8-character minimum password).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, UserCheck, Link as LinkIcon, Mail, User as UserIcon, KeyRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AuthUserSearch, { AppwriteAuthUser } from './AuthUserSearch';
import AuthUserList from './AuthUserList';
import { useApiError } from '@/hooks/useApiError';

// Module-level constant for team ID to avoid repeated environment lookups during render
const PROJECT_TEAM_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID;

interface User {
  id: string;
  userId?: string; // Appwrite auth user ID
  email: string;
  name: string | null;
  role: {
    id: string;
    name: string;
    permissions: any;
  } | null;
  isInvited?: boolean;
  createdAt: string;
}

interface Role {
  id?: string;
  $id?: string;
  name: string;
  description: string | null;
  permissions: any;
}

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: any) => Promise<void>;
  user?: User | null;
  roles: Role[];
  mode?: 'link' | 'edit';
}

export default function UserForm({ isOpen, onClose, onSave, user, roles, mode = 'edit' }: UserFormProps) {
  const { handleError, handleSuccess, fetchWithRetry } = useApiError();
  const [loading, setLoading] = useState(false);
  const [selectedAuthUser, setSelectedAuthUser] = useState<AppwriteAuthUser | null>(null);
  const [authUsers, setAuthUsers] = useState<AppwriteAuthUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [formData, setFormData] = useState<{
    email: string;
    name: string;
    roleId: string | undefined;
    authUserId: string;
    addToTeam: boolean;
  }>({
    email: '',
    name: '',
    roleId: undefined,
    authUserId: '',
    addToTeam: false
  });

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        name: user.name || '',
        roleId: user.role?.id || undefined,
        authUserId: '',
        addToTeam: false
      });
      setSelectedAuthUser(null);
    } else {
      setFormData({
        email: '',
        name: '',
        roleId: undefined,
        authUserId: '',
        addToTeam: mode === 'link' // Default to true in link mode
      });
      setSelectedAuthUser(null);
    }
  }, [user, isOpen, mode]);

  // Fetch initial auth users when in link mode
  // Memoized fetch function for authenticated users
  const fetchAuthUsers = useCallback(async () => {
    setSearchLoading(true);
    try {
      // Use fetchWithRetry for automatic retry (Requirement 7.5)
      const data = await fetchWithRetry('/api/users/search', {
        method: 'POST',
        body: JSON.stringify({
          q: '',
          page: 1,
          limit: 25,
        }),
      });
      setAuthUsers(data.users);
    } catch (error) {
      console.error('Error fetching auth users:', error);
      // Error is already handled by fetchWithRetry
    } finally {
      setSearchLoading(false);
    }
  }, [fetchWithRetry]);

  // Fetch initial auth users when in link mode
  useEffect(() => {
    if (isOpen && mode === 'link') {
      fetchAuthUsers();
    }
  }, [isOpen, mode, fetchAuthUsers]);

  const handleAuthUserSelect = (authUser: AppwriteAuthUser) => {
    setSelectedAuthUser(authUser);
    setFormData(prev => ({
      ...prev,
      authUserId: authUser.$id,
      email: authUser.email,
      name: authUser.name
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation for link mode (Requirement 7.3)
      if (mode === 'link') {
        if (!selectedAuthUser) {
          handleError(
            { error: 'Please select a user to link', code: 'VALIDATION_ERROR' },
            'Please select a user to link'
          );
          setLoading(false);
          return;
        }

        if (!formData.roleId) {
          handleError(
            { error: 'Please select a role for this user', code: 'VALIDATION_ERROR' },
            'Please select a role for this user'
          );
          setLoading(false);
          return;
        }

        // Prepare data for linking
        const linkData = {
          authUserId: formData.authUserId,
          roleId: formData.roleId,
          addToTeam: formData.addToTeam
        };

        await onSave(linkData);
      } else {
        // Validation for edit mode (Requirement 7.3)
        // Note: Edit mode only updates name and role for existing users
        // New auth users are created via /api/auth/signup, not through this form
        if (!formData.name || !formData.roleId) {
          handleError(
            { error: 'Please fill in all required fields', code: 'VALIDATION_ERROR' },
            'Please fill in all required fields'
          );
          setLoading(false);
          return;
        }

        await onSave(formData);
      }

      onClose();
    } catch (error: any) {
      console.error('Error saving user:', error);
      // Error handling is done in the parent component
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSendPasswordReset = async () => {
    if (!user) return;

    // Check if user has an auth ID (userId)
    if (!user.userId) {
      handleError(
        new Error('This user does not have an associated auth account. Password reset is only available for users with auth accounts.'),
        'Cannot send password reset'
      );
      return;
    }

    setSendingPasswordReset(true);

    try {
      // Send password reset email using the user's auth ID
      await fetchWithRetry('/api/users/send-password-reset', {
        method: 'POST',
        body: JSON.stringify({
          authUserId: user.userId,
        }),
      });

      handleSuccess(
        'Password Reset Email Sent',
        `Password reset email sent to ${user.email}. User must click the link in their email to reset their password.`
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error sending password reset email:', errorMessage);

      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, 'Failed to send password reset email');
    } finally {
      setSendingPasswordReset(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-0 gap-0"
        onWheel={(e) => {
          // Prevent scroll chaining to the page behind the dialog
          const target = e.currentTarget;
          const isAtTop = target.scrollTop === 0;
          const isAtBottom = target.scrollTop + target.clientHeight >= target.scrollHeight;

          if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4 bg-[#F1F5F9] dark:bg-slate-800 px-6 pt-6">
          <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
            {mode === 'link' ? (
              <>
                <LinkIcon className="h-6 w-6 text-primary" />
                Link Existing User
              </>
            ) : (
              <>
                {user?.isInvited ? <LinkIcon className="h-6 w-6 text-primary" /> : <UserCheck className="h-6 w-6 text-primary" />}
                Edit User
              </>
            )}
          </DialogTitle>
          {mode === 'link' ? (
            <DialogDescription className="text-slate-600 dark:text-slate-400 mt-2">
              Search for and select an existing Appwrite auth user to link to your application.
            </DialogDescription>
          ) : (
            <DialogDescription className="text-slate-600 dark:text-slate-400 mt-2">
              Update user information and role assignment.
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pt-6 pb-0" autoComplete="off" data-form-type="other" data-lpignore="true">
          <div className="space-y-4">
            {mode === 'link' ? (
            <>
              {/* Auth User Search and Selection */}
              <div className="space-y-4">
                <AuthUserSearch
                  onSelect={handleAuthUserSelect}
                  selectedUserId={selectedAuthUser?.$id}
                  linkedUserIds={[]}
                />

                <AuthUserList
                  users={authUsers}
                  selectedUserId={selectedAuthUser?.$id}
                  linkedUserIds={[]}
                  onSelect={handleAuthUserSelect}
                  loading={searchLoading}
                />
              </div>

              {/* Selected User Display Card */}
              {selectedAuthUser && (
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
                            <p className="text-sm text-muted-foreground">{selectedAuthUser.email}</p>
                          </div>
                          {selectedAuthUser.name && (
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-3 w-3 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">{selectedAuthUser.name}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.roleId}
                  onValueChange={(value) => handleChange('roleId', value)}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role">
                      {formData.roleId && (
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 flex-shrink-0" />
                          <span>{roles.find(r => (r.$id || r.id) === formData.roleId)?.name}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="max-w-[380px]">
                    {roles.map((role) => {
                      const roleId = role.$id || role.id || '';
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

              {/* Optional Team Membership */}
              {PROJECT_TEAM_ID && (
                <div className="flex items-center space-x-2 p-3 border rounded-md">
                  <Checkbox
                    id="addToTeam"
                    checked={formData.addToTeam}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, addToTeam: checked as boolean }))
                    }
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
          ) : (
            <>
              {/* Edit Mode - Traditional Form Fields */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="user@example.com"
                  disabled={!!user} // Don't allow email changes for existing users
                  required
                  autoComplete="off"
                  data-form-type="other"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="John Doe"
                  required
                  autoComplete="off"
                  data-form-type="other"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-edit">Role *</Label>
                <Select
                  value={formData.roleId}
                  onValueChange={(value) => {
                    if (value) {
                      handleChange('roleId', value);
                    }
                  }}
                >
                  <SelectTrigger id="role-edit">
                    <SelectValue placeholder="Select a role">
                      {formData.roleId && (
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 flex-shrink-0" />
                          <span>{roles.find(r => (r.$id || r.id) === formData.roleId)?.name}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="max-w-[380px]">
                    {roles.length === 0 && <div className="p-2 text-sm text-muted-foreground">No roles available</div>}
                    {roles.map((role) => {
                      const roleId = role.$id || role.id || '';
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

              {/* Password Reset for Existing Users with Auth Accounts */}
              {user && user.userId && (
                <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
                  <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                        Password Reset
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Send a password reset email to help this user change their password.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleSendPasswordReset}
                      disabled={sendingPasswordReset || loading}
                      className="shrink-0 border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/30"
                    >
                      {sendingPasswordReset ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <KeyRound className="h-3 w-3 mr-1" />
                          Send Reset Email
                        </>
                      )}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Info message for invited users without auth accounts */}
              {user && !user.userId && user.isInvited && (
                <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
                  <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription>
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      This user was invited but hasn't created their account yet. Password reset will be available after they complete signup.
                    </p>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
          </div>

          <div className="flex justify-end space-x-2 pt-6 pb-6 border-t-2 border-slate-200 dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-800 -mx-6 px-6 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'link' ? 'Link User' : 'Update User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}