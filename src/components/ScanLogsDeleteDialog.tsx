/**
 * ScanLogsDeleteDialog Component
 * 
 * A dialog for deleting scan logs with filter options.
 * Matches the behavior of LogsDeleteDialog for system logs.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { useSweetAlert } from '@/hooks/useSweetAlert';

interface Profile {
  id: string;
  name: string;
}

interface ScanLogsDeleteDialogProps {
  profiles: Profile[];
  onDeleteSuccess: () => void;
  children: React.ReactNode;
}

export default function ScanLogsDeleteDialog({ profiles, onDeleteSuccess, children }: ScanLogsDeleteDialogProps) {
  const { success, error, confirm } = useSweetAlert();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [deletedCount, setDeletedCount] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    beforeDate: '',
    result: '',
    profileId: ''
  });
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const handleDelete = async () => {
    if (!filters.beforeDate && !filters.result && !filters.profileId) {
      error("No filters selected", "Please select at least one filter to prevent accidental deletion of all scan logs.");
      return;
    }

    // Build confirmation message
    const filterParts = [];
    if (filters.beforeDate) filterParts.push(`before ${filters.beforeDate}`);
    if (filters.result) filterParts.push(`with result "${filters.result}"`);
    if (filters.profileId) {
      const profile = profiles.find(p => p.id === filters.profileId);
      filterParts.push(`from profile "${profile?.name || 'Unknown'}"`);
    }
    const filterDescription = filterParts.join(', ');

    const confirmed = await confirm({
      title: 'Delete Scan Logs',
      text: `Are you sure you want to permanently delete all scan logs ${filterDescription}? This action cannot be undone.`,
      icon: 'warning',
      confirmButtonText: 'Delete Logs',
      cancelButtonText: 'Cancel'
    });

    if (!confirmed) return;

    setIsDeleting(true);
    setElapsedTime(0);
    setDeletedCount(null);
    
    timerIntervalRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    try {
      const response = await fetch('/api/scan-logs/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to delete scan logs');
      }

      const result = await response.json();
      setDeletedCount(result.deletedCount);
      success("Success", result.message);

      setTimeout(() => {
        setIsOpen(false);
        setFilters({ beforeDate: '', result: '', profileId: '' });
        setElapsedTime(0);
        setDeletedCount(null);
        setIsDeleting(false);
        
        setTimeout(() => {
          onDeleteSuccess();
        }, 1500);
      }, 1500);
    } catch (err: any) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      error("Error", err.message);
      setIsDeleting(false);
      setElapsedTime(0);
      setDeletedCount(null);
    }
  };

  const hasFilters = filters.beforeDate || filters.result || filters.profileId;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4 bg-[#F1F5F9] dark:bg-slate-800 px-6 pt-6">
          <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-destructive" />
            Delete Scan Logs
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400 mt-2">
            Delete scan logs based on the criteria below. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pt-6 pb-0">
          <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Deleting scan logs is permanent and cannot be restored.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="beforeDate">Delete logs before date (optional)</Label>
            <Input
              id="beforeDate"
              type="date"
              value={filters.beforeDate}
              onChange={(e) => setFilters(prev => ({ ...prev, beforeDate: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              All scan logs created before this date will be deleted
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="result">Delete logs with specific result (optional)</Label>
            <Select 
              value={filters.result || 'all'} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, result: value === 'all' ? '' : value }))}
            >
              <SelectTrigger id="result">
                <SelectValue placeholder="All results" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All results</SelectItem>
                <SelectItem value="approved">Approved only</SelectItem>
                <SelectItem value="denied">Denied only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profileId">Delete logs from specific profile (optional)</Label>
            <Select 
              value={filters.profileId || 'all'} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, profileId: value === 'all' ? '' : value }))}
            >
              <SelectTrigger id="profileId">
                <SelectValue placeholder="All profiles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All profiles</SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name}
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

          {isDeleting && (
            <div className="space-y-3 pt-4 border-t">
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <strong>Please be patient:</strong> Large deletions can take time. Do not close this dialog.
                </AlertDescription>
              </Alert>
              
              <div className="flex items-center justify-center gap-3 py-4">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                <div className="text-center">
                  <div className="font-medium text-lg">
                    {deletedCount !== null ? 'Completed' : 'Deleting scan logs...'}
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
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting || !hasFilters}>
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
