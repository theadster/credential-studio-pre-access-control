import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, CheckCircle2, XCircle, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppwriteAuthUser } from './AuthUserSearch';
import { useApiError } from '@/hooks/useApiError';

interface AuthUserListProps {
  users: AppwriteAuthUser[];
  selectedUserId?: string;
  linkedUserIds?: string[];
  onSelect: (user: AppwriteAuthUser) => void;
  loading?: boolean;
}

export default function AuthUserList({
  users,
  selectedUserId,
  linkedUserIds = [],
  onSelect,
  loading = false
}: AuthUserListProps) {
  const { handleError, handleSuccess, fetchWithRetry } = useApiError();
  const [sendingVerificationTo, setSendingVerificationTo] = useState<string | null>(null);

  const handleSendVerificationEmail = async (user: AppwriteAuthUser, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent user selection when clicking button

    setSendingVerificationTo(user.$id);

    try {
      // Use fetchWithRetry for automatic retry (Requirement 7.5)
      await fetchWithRetry('/api/users/verify-email', {
        method: 'POST',
        body: JSON.stringify({
          authUserId: user.$id,
        }),
      });

      // Use centralized success handling (Requirement 7.6)
      handleSuccess(
        'Verification Email Sent',
        `Verification email sent to ${user.email}`
      );
    } catch (err: unknown) {
      // Type guard to safely handle error
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error sending verification email:', errorMessage);

      // Use centralized error handling (Requirement 7.6)
      // Ensure handleError always receives an Error object
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, 'Failed to send verification email');
    } finally {
      setSendingVerificationTo(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (users.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-md">
      {users.map((user) => {
        const isLinked = user.isLinked || linkedUserIds.includes(user.$id);
        const isSelected = selectedUserId === user.$id;
        const isDisabled = isLinked;

        return (
          <div
            key={user.$id}
            onClick={() => !isDisabled && onSelect(user)}
            className={cn(
              "p-4 border-b last:border-b-0 transition-colors",
              isDisabled ? "cursor-not-allowed opacity-60 bg-muted/50" : "cursor-pointer hover:bg-accent",
              isSelected && !isDisabled && "bg-accent border-l-4 border-l-primary"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm truncate">{user.email}</p>
                  {isLinked && (
                    <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
                      <UserCheck className="h-3 w-3" />
                      Already Linked
                    </Badge>
                  )}
                </div>

                {user.name && (
                  <p className="text-sm text-muted-foreground mb-1">{user.name}</p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    Created {formatDate(user.$createdAt)}
                  </p>

                  {user.emailVerification ? (
                    <Badge variant="default" className="flex items-center gap-1 bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-600 hover:bg-yellow-700 text-white">
                      <XCircle className="h-3 w-3" />
                      Unverified
                    </Badge>
                  )}
                </div>
              </div>

              {!user.emailVerification && !isLinked && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => handleSendVerificationEmail(user, e)}
                  onKeyDown={(e) => {
                    // Prevent keyboard activation from bubbling to row
                    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                      e.stopPropagation();
                      // Prevent default scroll behavior for Space key
                      if (e.key === ' ' || e.key === 'Spacebar') {
                        e.preventDefault();
                      }
                    }
                  }}
                  disabled={sendingVerificationTo === user.$id}
                  className="shrink-0"
                >
                  {sendingVerificationTo === user.$id ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-3 w-3 mr-1" />
                      Send Verification
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
