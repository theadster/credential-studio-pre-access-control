/**
 * AccessControlForm Component
 * 
 * A form component for managing attendee access control settings including:
 * - Access enabled/disabled toggle
 * - Valid from datetime picker
 * - Valid until datetime picker
 * - Date validation (validFrom must be before validUntil)
 * 
 * @see .kiro/specs/mobile-access-control/design.md
 * @see Requirements 1.1, 1.6, 2.1
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Loader2,
  Save
} from 'lucide-react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import {
  convertUtcToEventLocalForInput,
  convertEventLocalToUtcForStorage
} from '@/lib/accessControlDates';

interface AccessControlData {
  $id: string | null;
  attendeeId: string;
  accessEnabled: boolean;
  validFrom: string | null;
  validUntil: string | null;
  $createdAt: string | null;
  $updatedAt: string | null;
}

interface AccessControlFormProps {
  /** The attendee ID to manage access control for */
  attendeeId: string;
  /** Event timezone for date interpretation (defaults to UTC) */
  eventTimezone?: string;
  /** Optional callback when access control is updated */
  onUpdate?: (data: AccessControlData) => void;
  /** Whether the form is in read-only mode */
  readOnly?: boolean;
  /** Compact mode for embedding in other forms */
  compact?: boolean;
}

export default function AccessControlForm({
  attendeeId,
  eventTimezone = 'UTC',
  onUpdate,
  readOnly = false,
  compact = false
}: AccessControlFormProps) {
  const { success, error: showError } = useSweetAlert();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessControl, setAccessControl] = useState<AccessControlData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Form state
  const [accessEnabled, setAccessEnabled] = useState(true);
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');

  // Load access control data
  const loadAccessControl = useCallback(async () => {
    if (!attendeeId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/access-control/${attendeeId}`);
      if (response.ok) {
        const data = await response.json();
        setAccessControl(data);
        setAccessEnabled(data.accessEnabled);
        setValidFrom(convertUtcToEventLocalForInput(data.validFrom, eventTimezone));
        setValidUntil(convertUtcToEventLocalForInput(data.validUntil, eventTimezone));
        setHasChanges(false);
      } else {
        const errorData = await response.json();
        showError('Error', errorData.error || 'Failed to load access control');
      }
    } catch (err) {
      console.error('Error loading access control:', err);
      showError('Error', 'Failed to load access control settings');
    } finally {
      setLoading(false);
    }
  }, [attendeeId, eventTimezone, showError]);

  useEffect(() => {
    loadAccessControl();
  }, [loadAccessControl]);

  // Validate date range
  useEffect(() => {
    if (validFrom && validUntil) {
      const fromDate = new Date(validFrom);
      const untilDate = new Date(validUntil);
      if (fromDate >= untilDate) {
        setValidationError('Valid From must be before Valid Until');
      } else {
        setValidationError(null);
      }
    } else {
      setValidationError(null);
    }
  }, [validFrom, validUntil]);

  // Track changes
  useEffect(() => {
    if (!accessControl) return;
    
    const originalEnabled = accessControl.accessEnabled;
    const originalFrom = convertUtcToEventLocalForInput(accessControl.validFrom, eventTimezone);
    const originalUntil = convertUtcToEventLocalForInput(accessControl.validUntil, eventTimezone);
    
    const changed = 
      accessEnabled !== originalEnabled ||
      validFrom !== originalFrom ||
      validUntil !== originalUntil;
    
    setHasChanges(changed);
  }, [accessEnabled, validFrom, validUntil, accessControl, eventTimezone]);

  // Handle save
  const handleSave = async () => {
    if (!attendeeId) {
      showError('Error', 'Attendee ID is missing');
      return;
    }

    if (validationError) {
      showError('Validation Error', validationError);
      return;
    }

    setSaving(true);
    try {
      const convertedValidFrom = convertEventLocalToUtcForStorage(validFrom, eventTimezone);
      const convertedValidUntil = convertEventLocalToUtcForStorage(validUntil, eventTimezone);

      // Validate conversion results - if input was provided but conversion failed, show error
      if ((validFrom && !convertedValidFrom) || (validUntil && !convertedValidUntil)) {
        showError('Error', 'Invalid date format. Please check your date inputs.');
        setSaving(false);
        return;
      }

      const response = await fetch(`/api/access-control/${attendeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessEnabled,
          validFrom: convertedValidFrom,
          validUntil: convertedValidUntil,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAccessControl(data);
        setAccessEnabled(data.accessEnabled);
        setValidFrom(convertUtcToEventLocalForInput(data.validFrom, eventTimezone));
        setValidUntil(convertUtcToEventLocalForInput(data.validUntil, eventTimezone));
        setHasChanges(false);
        success('Success', 'Access control settings saved');
        onUpdate?.(data);
      } else {
        let errorMessage = 'Failed to save';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // Response is not valid JSON, use default message
        }
        showError('Error', errorMessage);
      }
    } catch (err) {
      console.error('Error saving access control:', err);
      showError('Error', 'Failed to save access control settings');
    } finally {
      setSaving(false);
    }
  };

  // Handle reset
  const handleReset = () => {
    if (accessControl) {
      setAccessEnabled(accessControl.accessEnabled);
      setValidFrom(convertUtcToEventLocalForInput(accessControl.validFrom, eventTimezone));
      setValidUntil(convertUtcToEventLocalForInput(accessControl.validUntil, eventTimezone));
      setHasChanges(false);
    }
  };

  // Determine current status
  const getAccessStatus = () => {
    if (!accessEnabled) {
      return { status: 'disabled', label: 'Access Disabled', color: 'destructive' as const };
    }
    
    const now = new Date();
    if (validFrom) {
      const fromDate = new Date(validFrom);
      if (now < fromDate) {
        return { status: 'pending', label: 'Not Yet Valid', color: 'secondary' as const };
      }
    }
    if (validUntil) {
      const untilDate = new Date(validUntil);
      if (now > untilDate) {
        return { status: 'expired', label: 'Expired', color: 'destructive' as const };
      }
    }
    return { status: 'active', label: 'Active', color: 'default' as const };
  };

  const accessStatus = getAccessStatus();

  if (loading) {
    return (
      <Card className={compact ? 'border-0 shadow-none' : ''}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading access control...</span>
        </CardContent>
      </Card>
    );
  }

  const content = (
    <div className="space-y-6">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Access Status</span>
        </div>
        <Badge variant={accessStatus.color}>
          {accessStatus.status === 'active' && <CheckCircle className="h-3 w-3 mr-1" />}
          {accessStatus.status === 'disabled' && <XCircle className="h-3 w-3 mr-1" />}
          {accessStatus.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
          {accessStatus.status === 'expired' && <AlertTriangle className="h-3 w-3 mr-1" />}
          {accessStatus.label}
        </Badge>
      </div>

      {/* Access Enabled Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
        <div className="space-y-0.5">
          <Label htmlFor="access-enabled" className="text-base font-medium">
            Access Enabled
          </Label>
          <p className="text-sm text-muted-foreground">
            When disabled, all scan attempts will be denied regardless of validity dates
          </p>
        </div>
        <Switch
          id="access-enabled"
          checked={accessEnabled}
          onCheckedChange={setAccessEnabled}
          disabled={readOnly}
        />
      </div>

      {/* Validity Window */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="valid-from" className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Valid From
          </Label>
          <Input
            id="valid-from"
            type="datetime-local"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            disabled={readOnly}
            className="bg-background"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty for immediate validity
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="valid-until" className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Valid Until
          </Label>
          <Input
            id="valid-until"
            type="datetime-local"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            disabled={readOnly}
            className="bg-background"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty for no expiration
          </p>
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      {!readOnly && (
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              Reset
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={saving || !hasChanges || !!validationError}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );

  if (compact) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Access Control
        </CardTitle>
        <CardDescription>
          Configure badge validity window and access permissions for this attendee
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
