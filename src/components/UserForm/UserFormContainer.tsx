/**
 * UserFormContainer Component
 * 
 * Main orchestration component for user creation and editing.
 * Manages state, validation, and coordinates all sub-components.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, UserCheck, Link as LinkIcon } from 'lucide-react';
import { useApiError } from '@/hooks/useApiError';
import { AppwriteAuthUser } from '@/components/AuthUserSearch';
import { useUserFormState } from './hooks/useUserFormState';
import { useUserFormValidation } from './hooks/useUserFormValidation';
import { usePasswordReset } from './hooks/usePasswordReset';
import UserFormFields from './UserFormFields';
import PasswordResetSection from './PasswordResetSection';
import { UserFormProps } from './types';

/**
 * User form container component
 * 
 * @param props - Component props
 * @returns User form dialog
 */
export default function UserFormContainer({
  isOpen,
  onClose,
  onSave,
  user,
  roles,
  mode = 'edit',
}: UserFormProps) {
  const { handleError, fetchWithRetry } = useApiError();
  
  // Hooks
  const { formData, updateField, resetForm } = useUserFormState(user, mode, isOpen);
  const { validate } = useUserFormValidation();
  const { sendPasswordReset, sending: sendingPasswordReset } = usePasswordReset();
  
  // Local state
  const [loading, setLoading] = useState(false);
  const [selectedAuthUser, setSelectedAuthUser] = useState<AppwriteAuthUser | null>(null);
  const [authUsers, setAuthUsers] = useState<AppwriteAuthUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Fetch auth users for link mode
  const fetchAuthUsers = useCallback(async () => {
    setSearchLoading(true);
    try {
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

  // Reset selected auth user when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedAuthUser(null);
    }
  }, [isOpen]);

  /**
   * Handle auth user selection
   */
  const handleAuthUserSelect = (authUser: AppwriteAuthUser) => {
    setSelectedAuthUser(authUser);
    updateField('authUserId', authUser.$id);
    updateField('email', authUser.email);
    updateField('name', authUser.name);
  };

  /**
   * Handle password reset
   */
  const handleSendPasswordReset = async () => {
    if (!user) return;
    await sendPasswordReset(user);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form data
      const validationResult = validate(formData, mode, user, selectedAuthUser);
      
      if (!validationResult.isValid) {
        // Show first error
        const firstError = validationResult.errors[0];
        handleError(
          { error: firstError.message, code: 'VALIDATION_ERROR' },
          firstError.message
        );
        setLoading(false);
        return;
      }

      // Prepare data based on mode
      if (mode === 'link') {
        const linkData = {
          authUserId: formData.authUserId,
          roleId: formData.roleId,
          addToTeam: formData.addToTeam,
        };
        await onSave(linkData);
      } else {
        await onSave(formData);
      }

      // Close dialog on success
      onClose();
    } catch (error: any) {
      console.error('Error saving user:', error);
      // Error handling is done in the parent component
    } finally {
      setLoading(false);
    }
  };

  /**
   * Memoized scroll handler to prevent scroll chaining
   * Prevents the page behind the dialog from scrolling when dialog is at top/bottom
   */
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtTop = target.scrollTop === 0;
    const isAtBottom = target.scrollTop + target.clientHeight >= target.scrollHeight;

    if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
      e.preventDefault();
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        onWheel={handleWheel}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'link' ? (
              <>
                <LinkIcon className="h-5 w-5" />
                Link Existing User
              </>
            ) : (
              <>
                {user?.isInvited ? <LinkIcon className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                Edit User
              </>
            )}
          </DialogTitle>
          {mode === 'link' ? (
            <DialogDescription>
              Search for and select an existing Appwrite auth user to link to your application.
            </DialogDescription>
          ) : (
            <DialogDescription>
              Update user information and role assignment.
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Form Fields */}
          <UserFormFields
            formData={formData}
            onChange={updateField}
            roles={roles}
            mode={mode}
            user={user}
            selectedAuthUser={selectedAuthUser}
            authUsers={authUsers}
            searchLoading={searchLoading}
            onAuthUserSelect={handleAuthUserSelect}
          />

          {/* Password Reset Section (Edit Mode Only) */}
          {mode === 'edit' && user && (
            <PasswordResetSection
              user={user}
              sending={sendingPasswordReset}
              onSendReset={handleSendPasswordReset}
            />
          )}

          {/* Form Actions */}
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
              {mode === 'link' ? 'Link User' : 'Update User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
