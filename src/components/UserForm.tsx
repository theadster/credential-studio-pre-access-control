import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, UserCheck, UserPlus, Link as LinkIcon, Mail, User as UserIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import AuthUserSearch, { AppwriteAuthUser } from './AuthUserSearch';
import AuthUserList from './AuthUserList';
import { useApiError } from '@/hooks/useApiError';

interface User {
  id: string;
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
  const { handleError, fetchWithRetry } = useApiError();
  const [loading, setLoading] = useState(false);
  const [selectedAuthUser, setSelectedAuthUser] = useState<AppwriteAuthUser | null>(null);
  const [authUsers, setAuthUsers] = useState<AppwriteAuthUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [formData, setFormData] = useState<{
    email: string;
    name: string;
    roleId: string | undefined;
    password: string;
    authUserId: string;
    addToTeam: boolean;
  }>({
    email: '',
    name: '',
    roleId: undefined,
    password: '',
    authUserId: '',
    addToTeam: false
  });

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        name: user.name || '',
        roleId: user.role?.id || undefined,
        password: '', // Don't populate password for editing
        authUserId: '',
        addToTeam: false
      });
      setSelectedAuthUser(null);
    } else {
      setFormData({
        email: '',
        name: '',
        roleId: undefined,
        password: '',
        authUserId: '',
        addToTeam: mode === 'link' // Default to true in link mode
      });
      setSelectedAuthUser(null);
    }
  }, [user, isOpen, mode]);

  // Fetch initial auth users when in link mode
  useEffect(() => {
    if (isOpen && mode === 'link') {
      fetchAuthUsers();
    }
  }, [isOpen, mode]);

  const fetchAuthUsers = async () => {
    setSearchLoading(true);
    try {
      // Use fetchWithRetry for automatic retry (Requirement 7.5)
      const data = await fetchWithRetry('/api/users/search', {
        method: 'POST',
        body: JSON.stringify({
          q: '',
          page: 1,
          limit: 25
        }),
      });
      setAuthUsers(data.users);
    } catch (error) {
      console.error('Error fetching auth users:', error);
      // Error is already handled by fetchWithRetry
    } finally {
      setSearchLoading(false);
    }
  };

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
        if (!formData.email || !formData.name || !formData.roleId) {
          handleError(
            { error: 'Please fill in all required fields', code: 'VALIDATION_ERROR' },
            'Please fill in all required fields'
          );
          setLoading(false);
          return;
        }

        if (!user && !formData.password) {
          handleError(
            { error: 'Password is required for new users', code: 'VALIDATION_ERROR' },
            'Password is required for new users'
          );
          setLoading(false);
          return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          handleError(
            { error: 'Please enter a valid email address', code: 'VALIDATION_ERROR' },
            'Please enter a valid email address'
          );
          setLoading(false);
          return;
        }

        // Password validation for new users
        if (!user && formData.password.length < 6) {
          handleError(
            { error: 'Password must be at least 6 characters long', code: 'VALIDATION_ERROR' },
            'Password must be at least 6 characters long'
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'link' ? (
              <>
                <LinkIcon className="h-5 w-5" />
                Link Existing User
              </>
            ) : user ? (
              <>
                {user.isInvited ? <LinkIcon className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                Edit User
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5" />
                Create New User
              </>
            )}
          </DialogTitle>
          {mode === 'link' ? (
            <DialogDescription>
              Search for and select an existing Appwrite auth user to link to your application.
            </DialogDescription>
          ) : user ? (
            <>
              <DialogDescription>
                Update user information and role assignment.
              </DialogDescription>
              {user.isInvited && (
                <Badge variant="secondary" className="w-fit mt-2">
                  Invited User
                </Badge>
              )}
            </>
          ) : (
            <DialogDescription>
              Create a new user account. An invitation email will be sent automatically.
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                  onValueChange={(value) => {
                    console.log('Role selected (link mode):', value);
                    handleChange('roleId', value);
                  }}
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
              {process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID && (
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-edit">Role *</Label>
                <Select 
                  value={formData.roleId} 
                  onValueChange={(value) => {
                    console.log('Role selected (edit mode):', value);
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

              {!user && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    The user will be able to sign in with this password immediately.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end space-x-2 pt-4">
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
              {mode === 'link' ? 'Link User' : user ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}