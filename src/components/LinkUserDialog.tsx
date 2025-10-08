import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, UserCheck, Link as LinkIcon, Mail, Calendar, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AvailableUser {
  userId: string;
  email: string;
  name: string;
  createdAt: string;
  emailVerification: boolean;
  status: boolean;
}

interface Role {
  id?: string;
  $id?: string;
  name: string;
  description: string | null;
  permissions: any;
}

interface LinkUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: () => Promise<void>;
  roles: Role[];
}

export default function LinkUserDialog({ isOpen, onClose, onLink, roles }: LinkUserDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(undefined);
  const [addToTeam, setAddToTeam] = useState<boolean>(true);

  // Fetch available users when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableUsers();
      setSelectedUserId(undefined);
      setSelectedRoleId(undefined);
      setAddToTeam(true); // Default to adding to team
    }
  }, [isOpen]);

  const fetchAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/users/available');
      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data.users || []);
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to fetch available users",
        });
      }
    } catch (error) {
      console.error('Error fetching available users:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch available users",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!selectedUserId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please select a user to link",
        });
        return;
      }

      if (!selectedRoleId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please select a role for the user",
        });
        return;
      }

      // Call API to link user
      const response = await fetch('/api/users/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUserId,
          roleId: selectedRoleId,
          addToTeam: addToTeam,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Show success message with team membership status
        let description = `User ${data.user.email} has been linked successfully`;
        if (data.teamMembership) {
          if (data.teamMembership.status === 'success') {
            description += ' and added to the project team';
          } else if (data.teamMembership.status === 'failed') {
            description += `, but team membership failed: ${data.teamMembership.error}`;
          }
        }
        
        toast({
          title: "Success",
          description,
        });
        await onLink();
        onClose();
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to link user",
        });
      }
    } catch (error: any) {
      console.error('Error linking user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to link user. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = availableUsers.find(u => u.userId === selectedUserId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Link Existing User
          </DialogTitle>
          <DialogDescription>
            Link an existing Appwrite Auth user to the database and assign them a role.
          </DialogDescription>
        </DialogHeader>

        {loadingUsers ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : availableUsers.length === 0 ? (
          <Alert>
            <AlertDescription>
              No unlinked users found. All Appwrite Auth users are already linked to the database.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user">Select User *</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user to link" />
                </SelectTrigger>
                <SelectContent className="max-w-[460px]">
                  {availableUsers.map((user) => (
                    <SelectItem key={user.userId} value={user.userId} className="max-w-[460px]">
                      <div className="flex flex-col gap-1 w-full text-left py-1">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">{user.email}</span>
                        </div>
                        {user.name && (
                          <span className="text-sm text-muted-foreground truncate pl-5">
                            {user.name}
                          </span>
                        )}
                        <div className="flex items-center gap-2 pl-5">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Created {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                          {user.emailVerification && (
                            <Badge variant="secondary" className="text-xs">
                              Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedUser && (
                <p className="text-xs text-muted-foreground">
                  This user will be granted access to the system with the selected role.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-link">Assign Role *</Label>
              <Select 
                value={selectedRoleId} 
                onValueChange={(value) => {
                  console.log('Role selected:', value);
                  setSelectedRoleId(value);
                }}
              >
                <SelectTrigger id="role-link">
                  <SelectValue placeholder="Select a role">
                    {selectedRoleId && (
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 flex-shrink-0" />
                        <span>{roles.find(r => (r.$id || r.id) === selectedRoleId)?.name}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4} className="max-w-[460px]">
                  {roles.map((role) => {
                    const roleId = role.$id || role.id || '';
                    return (
                      <SelectItem key={roleId} value={roleId} className="max-w-[460px]">
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

            {/* Team Membership Option */}
            {process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID && (
              <div className="flex items-center space-x-2 p-3 border rounded-md">
                <Checkbox
                  id="addToTeam"
                  checked={addToTeam}
                  onCheckedChange={(checked) => setAddToTeam(checked as boolean)}
                />
                <div className="flex flex-col">
                  <Label
                    htmlFor="addToTeam"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Add to project team (Recommended)
                    </div>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Grant this user access to project resources through team membership. Without this, they may not be able to access data.
                  </p>
                </div>
              </div>
            )}

            {selectedUser && selectedRoleId && (
              <Alert>
                <AlertDescription className="text-sm">
                  <strong>{selectedUser.email}</strong> will be linked to the database and granted access with the selected role
                  {addToTeam && process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID && ' and added to the project team'}.
                </AlertDescription>
              </Alert>
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
              <Button type="submit" disabled={loading || !selectedUserId || !selectedRoleId}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <LinkIcon className="mr-2 h-4 w-4" />
                Link User
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
