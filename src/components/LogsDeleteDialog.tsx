import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface LogsDeleteDialogProps {
  users: User[];
  onDeleteSuccess: () => void;
  children: React.ReactNode;
}

export default function LogsDeleteDialog({ users, onDeleteSuccess, children }: LogsDeleteDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filters, setFilters] = useState({
    beforeDate: '',
    action: '',
    userId: ''
  });

  const handleDelete = async () => {
    if (!filters.beforeDate && !filters.action && !filters.userId) {
      toast({
        variant: "destructive",
        title: "No filters selected",
        description: "Please select at least one filter to prevent accidental deletion of all logs.",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/logs/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete logs');
      }

      const result = await response.json();
      
      toast({
        title: "Success",
        description: result.message,
      });

      setIsOpen(false);
      setFilters({ beforeDate: '', action: '', userId: '' });
      onDeleteSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const hasFilters = filters.beforeDate || filters.action || filters.userId;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Activity Logs
          </DialogTitle>
          <DialogDescription>
            Delete logs based on the criteria below. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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

          {!hasFilters && (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                Please select at least one filter to prevent accidental deletion of all logs.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}