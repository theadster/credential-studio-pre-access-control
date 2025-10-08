import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Trash2, Unlink } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  isInvited?: boolean;
}

interface DeleteUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteFromAuth: boolean) => Promise<void>;
  user: User | null;
}

export default function DeleteUserDialog({ isOpen, onClose, onConfirm, user }: DeleteUserDialogProps) {
  const [deleteOption, setDeleteOption] = useState<'full' | 'unlink'>('full');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(deleteOption === 'full');
      onClose();
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isDeleting) {
      onClose();
    }
  };

  if (!user) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete User
          </AlertDialogTitle>
          <AlertDialogDescription>
            Choose how you want to remove <strong>{user.email}</strong> from the system.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={deleteOption} onValueChange={(value) => setDeleteOption(value as 'full' | 'unlink')}>
            <div className="space-y-3">
              {/* Full Delete Option */}
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer">
                <RadioGroupItem value="full" id="full" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="full" className="cursor-pointer font-medium flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Full Delete (Recommended)
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Remove user from both the database and authentication system. The user will need to create a new account to access the system again.
                  </p>
                </div>
              </div>

              {/* Unlink Option */}
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer">
                <RadioGroupItem value="unlink" id="unlink" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="unlink" className="cursor-pointer font-medium flex items-center gap-2">
                    <Unlink className="h-4 w-4" />
                    Unlink Only
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Remove user from the database only. Their authentication account will remain active, and they can be re-linked later.
                  </p>
                </div>
              </div>
            </div>
          </RadioGroup>

          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {deleteOption === 'full' ? (
                <>
                  <strong>Warning:</strong> This action cannot be undone. The user will lose access immediately and all their authentication data will be permanently deleted.
                </>
              ) : (
                <>
                  <strong>Note:</strong> The user will lose access to the system but can still log in to their Appwrite account. An administrator can re-link them later.
                </>
              )}
            </AlertDescription>
          </Alert>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : deleteOption === 'full' ? 'Delete User' : 'Unlink User'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
