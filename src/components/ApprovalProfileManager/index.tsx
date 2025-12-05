/**
 * ApprovalProfileManager Component
 * 
 * A comprehensive component for managing approval profiles including:
 * - Profile list view with search
 * - Profile editor dialog
 * - Rule builder with field selector
 * - Operator selector with value input
 * - AND/OR logic grouping UI
 * 
 * @see .kiro/specs/mobile-access-control/design.md
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
} from '@/components/ui/table';
import { 
  Clock,
  Edit, 
  FileText,
  Loader2,
  Plus, 
  Search, 
  Shield, 
  Trash2,
} from 'lucide-react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { ApprovalProfile, RuleGroup } from '@/types/approvalProfile';
import ProfileEditorDialog from './ProfileEditorDialog';

interface ApprovalProfileManagerProps {
  /** Optional callback when a profile is created/updated/deleted */
  onProfileChange?: () => void;
}

export default function ApprovalProfileManager({ onProfileChange }: ApprovalProfileManagerProps) {
  const { success, error: showError } = useSweetAlert();
  
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ApprovalProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ApprovalProfile | null>(null);
  const [deleteProfile, setDeleteProfile] = useState<ApprovalProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load profiles
  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/approval-profiles');
      if (response.ok) {
        const data = await response.json();
        setProfiles(data.data || []);
      } else {
        showError('Error', 'Failed to load approval profiles');
      }
    } catch (err) {
      console.error('Error loading profiles:', err);
      showError('Error', 'Failed to load approval profiles');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Filter profiles by search term
  const filteredProfiles = profiles.filter(
    (profile) =>
      profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (profile.description && profile.description.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  // Handle create new profile
  const handleCreate = () => {
    setEditingProfile(null);
    setShowEditor(true);
  };

  // Handle edit profile
  const handleEdit = (profile: ApprovalProfile) => {
    setEditingProfile(profile);
    setShowEditor(true);
  };

  // Handle delete profile
  const handleDelete = async () => {
    if (!deleteProfile) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/approval-profiles/${deleteProfile.$id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        success('Success', 'Profile deleted successfully');
        setProfiles(prev => prev.filter(p => p.$id !== deleteProfile.$id));
        onProfileChange?.();
      } else {
        const data = await response.json();
        showError('Error', data.error || 'Failed to delete profile');
      }
    } catch (err) {
      console.error('Error deleting profile:', err);
      showError('Error', 'Failed to delete profile');
    } finally {
      setDeleting(false);
      setDeleteProfile(null);
    }
  };

  // Handle save from editor
  const handleSave = () => {
    loadProfiles();
    setShowEditor(false);
    setEditingProfile(null);
    onProfileChange?.();
  };

  // Get rule count from profile
  const getRuleCount = (profile: ApprovalProfile): number => {
    return countRules(profile.rules);
  };

  // Count rules recursively
  const countRules = (group: RuleGroup): number => {
    let count = 0;
    for (const condition of group.conditions) {
      if ('logic' in condition) {
        count += countRules(condition as RuleGroup);
      } else {
        count += 1;
      }
    }
    return count;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Approval Profiles
              </CardTitle>
              <CardDescription>
                Manage rule sets that define entry requirements for different access points
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Profile
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search profiles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>
          </div>

          {/* Profiles Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading profiles...</span>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? (
                <p>No profiles match your search</p>
              ) : (
                <div className="space-y-2">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <p>No approval profiles yet</p>
                  <p className="text-sm">Create your first profile to define entry requirements</p>
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Rules</TableHead>
                  <TableHead className="text-center">Version</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((profile) => (
                  <TableRow key={profile.$id}>
                    <TableCell className="font-medium">{profile.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {profile.description || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{getRuleCount(profile)}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">v{profile.version}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(profile.$updatedAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(profile)}
                          aria-label={`Edit ${profile.name || 'profile'}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteProfile(profile)}
                          aria-label={`Delete ${profile.name || 'profile'}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Profile Editor Dialog */}
      <ProfileEditorDialog
        open={showEditor}
        onOpenChange={setShowEditor}
        profile={editingProfile}
        onSave={handleSave}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={Boolean(deleteProfile)} onOpenChange={(open) => !open && setDeleteProfile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteProfile?.name}&quot;? 
              This action cannot be undone. Scan logs will retain references to this profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
