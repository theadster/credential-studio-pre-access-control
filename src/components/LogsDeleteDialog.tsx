import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { useSweetAlert } from '@/hooks/useSweetAlert';

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface LogsDeleteDialogProps {
  users: User[];
  onDeleteSuccess: () => void;
  onDeleteStart?: () => void;
  onDeleteEnd?: () => void;
  children: React.ReactNode;
}

export default function LogsDeleteDialog({ users, onDeleteSuccess, onDeleteStart, onDeleteEnd, children }: LogsDeleteDialogProps) {
  const { success, error, confirm } = useSweetAlert();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [deletedCount, setDeletedCount] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    beforeDate: '',
    action: '',
    userId: ''
  });

  const handleDelete = async () => {
    if (!filters.beforeDate && !filters.action && !filters.userId) {
      error("No filters selected", "Please select at least one filter to prevent accidental deletion of all logs.");
      return;
    }

    // Build confirmation message based on filters
    let filterDescription = '';
    const filterParts = [];
    if (filters.beforeDate) filterParts.push(`before ${filters.beforeDate}`);
    if (filters.action) filterParts.push(`of type "${filters.action}"`);
    if (filters.userId) {
      const user = users.find(u => u.id === filters.userId);
      const userName = user ? (user.name || user.email) : 'selected user';
      filterParts.push(`from ${userName}`);
    }
    filterDescription = filterParts.join(', ');

    const confirmed = await confirm({
      title: 'Delete Activity Logs',
      text: `Are you sure you want to permanently delete all logs ${filterDescription}? This action cannot be undone.`,
      icon: 'warning',
      confirmButtonText: 'Delete Logs',
      cancelButtonText: 'Cancel'
    });

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setElapsedTime(0);
    setDeletedCount(null);
    
    // Notify parent to pause real-time updates
    if (onDeleteStart) {
      onDeleteStart();
    }
    
    // Start a timer to show elapsed time
    const timerInterval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    try {
      const response = await fetch('/api/logs/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters),
      });

      clearInterval(timerInterval);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete logs');
      }

      const result = await response.json();
      
      // Show final count
      setDeletedCount(result.deletedCount);
      
      success("Success", result.message);

      // Wait a moment to show results and let rate limits reset before closing
      setTimeout(() => {
        setIsOpen(false);
        setFilters({ beforeDate: '', action: '', userId: '' });
        setElapsedTime(0);
        setDeletedCount(null);
        setIsDeleting(false);
        
        // Notify parent to resume real-time updates
        if (onDeleteEnd) {
          onDeleteEnd();
        }
        
        // Wait an additional 3 seconds before refreshing to let rate limits reset
        setTimeout(() => {
          onDeleteSuccess();
        }, 3000);
      }, 1500);
    } catch (err: any) {
      clearInterval(timerInterval);
      error("Error", err.message);
      setIsDeleting(false);
      setElapsedTime(0);
      setDeletedCount(null);
      
      // Notify parent to resume real-time updates even on error
      if (onDeleteEnd) {
        onDeleteEnd();
      }
    }
  };

  const hasFilters = filters.beforeDate || filters.action || filters.userId;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4 bg-[#F1F5F9] dark:bg-slate-800 px-6 pt-6">
          <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-destructive" />
            Delete Activity Logs
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400 mt-2">
            Delete logs based on the criteria below. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pt-6 pb-0">
          {/* Warning Alert */}
          <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Deleting logs is permanent and cannot be restored. 
              Please ensure you have selected the correct criteria.
            </AlertDescription>
          </Alert>

          {/* Delete before date */}
          <div className="space-y-2">
            <Label htmlFor="beforeDate">Delete logs before date (optional)</Label>
            <Input
              id="beforeDate"
              type="date"
              value={filters.beforeDate}
              onChange={(e) => setFilters(prev => ({ ...prev, beforeDate: e.target.value }))}
              placeholder="Select date"
            />
            <p className="text-xs text-muted-foreground">
              All logs created before this date will be deleted
            </p>
          </div>

          {/* Filter by action */}
          <div className="space-y-2">
            <Label htmlFor="action">Delete logs of specific type (optional)</Label>
            <Select value={filters.action} onValueChange={(value) => setFilters(prev => ({ ...prev, action: value === 'all' ? '' : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="view">View</SelectItem>
                <SelectItem value="print">Print</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="export">Export</SelectItem>
                <SelectItem value="import">Import</SelectItem>
                <SelectItem value="delete_logs">Delete Logs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter by user */}
          <div className="space-y-2">
            <Label htmlFor="userId">Delete logs from specific user (optional)</Label>
            <Select value={filters.userId} onValueChange={(value) => setFilters(prev => ({ ...prev, userId: value === 'all' ? '' : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email.split('@')[0]} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!hasFilters && !isDeleting && (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                Please select at least one filter to prevent accidental deletion of all logs.
              </AlertDescription>
            </Alert>
          )}

          {/* Progress indicator */}
          {isDeleting && (
            <div className="space-y-3 pt-4 border-t">
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <strong>Please be patient:</strong> Large log deletions can take considerable time to complete. 
                  Do not close this dialog or refresh the page.
                </AlertDescription>
              </Alert>
              
              <div className="flex items-center justify-center gap-3 py-4">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                <div className="text-center">
                  <div className="font-medium text-lg">
                    {deletedCount !== null ? 'Completed' : 'Deleting logs...'}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {deletedCount !== null 
                      ? `${deletedCount} log${deletedCount !== 1 ? 's' : ''} deleted in ${Math.floor(elapsedTime / 60)}m ${elapsedTime % 60}s`
                      : `Elapsed time: ${Math.floor(elapsedTime / 60)}m ${elapsedTime % 60}s`
                    }
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-6 pb-6 border-t-2 border-slate-200 dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-800 px-6 mt-6">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || !hasFilters}
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Logs
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}