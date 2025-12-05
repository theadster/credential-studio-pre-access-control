/**
 * ProfileEditorDialog Component
 * 
 * Dialog for creating and editing approval profiles with a visual rule builder.
 * 
 * @see .kiro/specs/mobile-access-control/design.md
 * @see Requirements 3.2, 3.3, 3.4, 3.5
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Shield } from 'lucide-react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { ApprovalProfile, RuleGroup } from '@/types/approvalProfile';
import RuleBuilder from './RuleBuilder';

interface ProfileEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ApprovalProfile | null;
  onSave: () => void;
}

const DEFAULT_RULES: RuleGroup = {
  logic: 'AND',
  conditions: [],
};

export default function ProfileEditorDialog({
  open,
  onOpenChange,
  profile,
  onSave,
}: ProfileEditorDialogProps) {
  const { success, error: showError } = useSweetAlert();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState<RuleGroup>(DEFAULT_RULES);
  const [nameError, setNameError] = useState('');

  // Reset form when dialog opens/closes or profile changes
  useEffect(() => {
    if (open) {
      if (profile) {
        setName(profile.name);
        setDescription(profile.description || '');
        setRules(profile.rules);
      } else {
        setName('');
        setDescription('');
        setRules(DEFAULT_RULES);
      }
      setNameError('');
    }
  }, [open, profile]);

  // Cleanup: abort pending requests when dialog closes or unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [open]);

  // Validate name
  const validateName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setNameError('Name is required');
      return false;
    }
    if (trimmed.length > 100) {
      setNameError('Name must be 100 characters or less');
      return false;
    }
    setNameError('');
    return true;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateName(name)) return;

    // Validate rules have at least one condition
    if (rules.conditions.length === 0) {
      showError('Validation Error', 'Please add at least one rule');
      return;
    }

    setSaving(true);
    
    // Abort any previous request before creating a new controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const url = profile 
        ? `/api/approval-profiles/${profile.$id}` 
        : '/api/approval-profiles';
      
      const method = profile ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          rules,
        }),
        signal: controller.signal,
      });

      // If request was aborted, return early without updating state
      if (controller.signal.aborted) return;

      if (response.ok) {
        success('Success', profile ? 'Profile updated successfully' : 'Profile created successfully');
        onSave();
      } else {
        const data = await response.json();
        if (response.status === 409) {
          setNameError('A profile with this name already exists');
        } else {
          showError('Error', data.error || 'Failed to save profile');
        }
      }
    } catch (err) {
      // Ignore abort errors - component is unmounting
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('Error saving profile:', err);
      showError('Error', 'Failed to save profile');
    } finally {
      // Always reset saving state, even if request was aborted
      setSaving(false);
      // Clear the controller ref after request completes
      abortControllerRef.current = null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {profile ? 'Edit Profile' : 'Create Profile'}
          </DialogTitle>
          <DialogDescription>
            {profile 
              ? 'Update the profile settings and rules' 
              : 'Create a new approval profile with custom rules'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  validateName(e.target.value);
                }}
                placeholder="e.g., VIP Access, General Admission"
                className={nameError ? 'border-destructive' : ''}
              />
              {nameError && (
                <p className="text-sm text-destructive">{nameError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-description">Description</Label>
              <Textarea
                id="profile-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe when this profile should be used..."
                rows={2}
              />
            </div>
          </div>

          {/* Rule Builder */}
          <div className="space-y-2">
            <Label>Rules</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Define the conditions that must be met for access approval
            </p>
            <RuleBuilder rules={rules} onChange={setRules} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {profile ? 'Update Profile' : 'Create Profile'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
