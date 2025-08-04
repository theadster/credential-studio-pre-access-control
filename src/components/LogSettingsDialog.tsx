import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Settings, 
  Users, 
  Shield, 
  Activity, 
  FileText, 
  UserPlus, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  Download, 
  Upload,
  LogIn,
  LogOut,
  IdCard,
  Save,
  RotateCcw
} from 'lucide-react';

interface LogSettings {
  id: string;
  attendeeCreate: boolean;
  attendeeUpdate: boolean;
  attendeeDelete: boolean;
  attendeeView: boolean;
  attendeeBulkDelete: boolean;
  attendeeImport: boolean;
  attendeeExport: boolean;
  credentialGenerate: boolean;
  credentialClear: boolean;
  userCreate: boolean;
  userUpdate: boolean;
  userDelete: boolean;
  userView: boolean;
  userInvite: boolean;
  roleCreate: boolean;
  roleUpdate: boolean;
  roleDelete: boolean;
  roleView: boolean;
  eventSettingsUpdate: boolean;
  customFieldCreate: boolean;
  customFieldUpdate: boolean;
  customFieldDelete: boolean;
  customFieldReorder: boolean;
  authLogin: boolean;
  authLogout: boolean;
  logsDelete: boolean;
  logsExport: boolean;
  logsView: boolean;
  systemViewEventSettings: boolean;
  systemViewAttendeeList: boolean;
  systemViewRolesList: boolean;
  systemViewUsersList: boolean;
}

interface LogSettingsDialogProps {
  children: React.ReactNode;
  onSettingsUpdate?: () => void;
}

const LogSettingsDialog: React.FC<LogSettingsDialogProps> = ({ children, onSettingsUpdate }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<LogSettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<LogSettings | null>(null);

  // Load log settings when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadLogSettings();
    }
  }, [isOpen]);

  const loadLogSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/log-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setOriginalSettings(data);
      } else {
        throw new Error('Failed to load log settings');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load log settings",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await fetch('/api/log-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save log settings');
      }

      const updatedSettings = await response.json();
      setSettings(updatedSettings);
      setOriginalSettings(updatedSettings);
      
      toast({
        title: "Success",
        description: "Log settings updated successfully!",
      });

      if (onSettingsUpdate) {
        onSettingsUpdate();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalSettings) {
      setSettings({ ...originalSettings });
    }
  };

  const updateSetting = (key: keyof LogSettings, value: boolean) => {
    if (settings) {
      setSettings({
        ...settings,
        [key]: value
      });
    }
  };

  const hasChanges = () => {
    if (!settings || !originalSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  };

  const getEnabledCount = (category: string) => {
    if (!settings) return 0;
    
    const categorySettings = {
      attendees: [
        settings.attendeeCreate,
        settings.attendeeUpdate,
        settings.attendeeDelete,
        settings.attendeeView,
        settings.attendeeBulkDelete,
        settings.attendeeImport,
        settings.attendeeExport
      ],
      credentials: [
        settings.credentialGenerate,
        settings.credentialClear
      ],
      users: [
        settings.userCreate,
        settings.userUpdate,
        settings.userDelete,
        settings.userView,
        settings.userInvite
      ],
      roles: [
        settings.roleCreate,
        settings.roleUpdate,
        settings.roleDelete,
        settings.roleView
      ],
      settings: [
        settings.eventSettingsUpdate
      ],
      customFields: [
        settings.customFieldCreate,
        settings.customFieldUpdate,
        settings.customFieldDelete,
        settings.customFieldReorder
      ],
      auth: [
        settings.authLogin,
        settings.authLogout
      ],
      logs: [
        settings.logsDelete,
        settings.logsExport,
        settings.logsView
      ],
      system: [
        settings.systemViewEventSettings,
        settings.systemViewAttendeeList,
        settings.systemViewRolesList,
        settings.systemViewUsersList
      ]
    };

    return categorySettings[category as keyof typeof categorySettings]?.filter(Boolean).length || 0;
  };

  const getTotalCount = (category: string) => {
    const categoryCounts = {
      attendees: 7,
      credentials: 2,
      users: 5,
      roles: 4,
      settings: 1,
      customFields: 4,
      auth: 2,
      logs: 3,
      system: 4
    };

    return categoryCounts[category as keyof typeof categoryCounts] || 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Log Settings</span>
          </DialogTitle>
          <DialogDescription>
            Configure which activities should be logged in the system. Disabled activities will not create log entries.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading log settings...</span>
          </div>
        ) : settings ? (
          <div className="space-y-6">
            {/* Attendee Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span>Attendee Management</span>
                  </div>
                  <Badge variant="outline">
                    {getEnabledCount('attendees')}/{getTotalCount('attendees')} enabled
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Control logging for attendee-related activities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Plus className="h-4 w-4 text-green-600" />
                      <Label htmlFor="attendeeCreate">Create Attendee</Label>
                    </div>
                    <Switch
                      id="attendeeCreate"
                      checked={settings.attendeeCreate}
                      onCheckedChange={(checked) => updateSetting('attendeeCreate', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Edit className="h-4 w-4 text-blue-600" />
                      <Label htmlFor="attendeeUpdate">Update Attendee</Label>
                    </div>
                    <Switch
                      id="attendeeUpdate"
                      checked={settings.attendeeUpdate}
                      onCheckedChange={(checked) => updateSetting('attendeeUpdate', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Trash2 className="h-4 w-4 text-red-600" />
                      <Label htmlFor="attendeeDelete">Delete Attendee</Label>
                    </div>
                    <Switch
                      id="attendeeDelete"
                      checked={settings.attendeeDelete}
                      onCheckedChange={(checked) => updateSetting('attendeeDelete', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4 text-gray-600" />
                      <Label htmlFor="attendeeView">View Attendee</Label>
                    </div>
                    <Switch
                      id="attendeeView"
                      checked={settings.attendeeView}
                      onCheckedChange={(checked) => updateSetting('attendeeView', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Trash2 className="h-4 w-4 text-red-600" />
                      <Label htmlFor="attendeeBulkDelete">Bulk Delete</Label>
                    </div>
                    <Switch
                      id="attendeeBulkDelete"
                      checked={settings.attendeeBulkDelete}
                      onCheckedChange={(checked) => updateSetting('attendeeBulkDelete', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Upload className="h-4 w-4 text-purple-600" />
                      <Label htmlFor="attendeeImport">Import Attendees</Label>
                    </div>
                    <Switch
                      id="attendeeImport"
                      checked={settings.attendeeImport}
                      onCheckedChange={(checked) => updateSetting('attendeeImport', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Download className="h-4 w-4 text-orange-600" />
                      <Label htmlFor="attendeeExport">Export Attendees</Label>
                    </div>
                    <Switch
                      id="attendeeExport"
                      checked={settings.attendeeExport}
                      onCheckedChange={(checked) => updateSetting('attendeeExport', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Credential Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <IdCard className="h-5 w-5 text-purple-600" />
                    <span>Credential Management</span>
                  </div>
                  <Badge variant="outline">
                    {getEnabledCount('credentials')}/{getTotalCount('credentials')} enabled
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Control logging for credential-related activities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Plus className="h-4 w-4 text-green-600" />
                      <Label htmlFor="credentialGenerate">Generate Credential</Label>
                    </div>
                    <Switch
                      id="credentialGenerate"
                      checked={settings.credentialGenerate}
                      onCheckedChange={(checked) => updateSetting('credentialGenerate', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Trash2 className="h-4 w-4 text-red-600" />
                      <Label htmlFor="credentialClear">Clear Credential</Label>
                    </div>
                    <Switch
                      id="credentialClear"
                      checked={settings.credentialClear}
                      onCheckedChange={(checked) => updateSetting('credentialClear', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    <span>User Management</span>
                  </div>
                  <Badge variant="outline">
                    {getEnabledCount('users')}/{getTotalCount('users')} enabled
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Control logging for user management activities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <UserPlus className="h-4 w-4 text-green-600" />
                      <Label htmlFor="userCreate">Create User</Label>
                    </div>
                    <Switch
                      id="userCreate"
                      checked={settings.userCreate}
                      onCheckedChange={(checked) => updateSetting('userCreate', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Edit className="h-4 w-4 text-blue-600" />
                      <Label htmlFor="userUpdate">Update User</Label>
                    </div>
                    <Switch
                      id="userUpdate"
                      checked={settings.userUpdate}
                      onCheckedChange={(checked) => updateSetting('userUpdate', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Trash2 className="h-4 w-4 text-red-600" />
                      <Label htmlFor="userDelete">Delete User</Label>
                    </div>
                    <Switch
                      id="userDelete"
                      checked={settings.userDelete}
                      onCheckedChange={(checked) => updateSetting('userDelete', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4 text-gray-600" />
                      <Label htmlFor="userView">View Users</Label>
                    </div>
                    <Switch
                      id="userView"
                      checked={settings.userView}
                      onCheckedChange={(checked) => updateSetting('userView', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <UserPlus className="h-4 w-4 text-purple-600" />
                      <Label htmlFor="userInvite">Invite User</Label>
                    </div>
                    <Switch
                      id="userInvite"
                      checked={settings.userInvite}
                      onCheckedChange={(checked) => updateSetting('userInvite', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Role Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-amber-600" />
                    <span>Role Management</span>
                  </div>
                  <Badge variant="outline">
                    {getEnabledCount('roles')}/{getTotalCount('roles')} enabled
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Control logging for role management activities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Plus className="h-4 w-4 text-green-600" />
                      <Label htmlFor="roleCreate">Create Role</Label>
                    </div>
                    <Switch
                      id="roleCreate"
                      checked={settings.roleCreate}
                      onCheckedChange={(checked) => updateSetting('roleCreate', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Edit className="h-4 w-4 text-blue-600" />
                      <Label htmlFor="roleUpdate">Update Role</Label>
                    </div>
                    <Switch
                      id="roleUpdate"
                      checked={settings.roleUpdate}
                      onCheckedChange={(checked) => updateSetting('roleUpdate', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Trash2 className="h-4 w-4 text-red-600" />
                      <Label htmlFor="roleDelete">Delete Role</Label>
                    </div>
                    <Switch
                      id="roleDelete"
                      checked={settings.roleDelete}
                      onCheckedChange={(checked) => updateSetting('roleDelete', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4 text-gray-600" />
                      <Label htmlFor="roleView">View Roles</Label>
                    </div>
                    <Switch
                      id="roleView"
                      checked={settings.roleView}
                      onCheckedChange={(checked) => updateSetting('roleView', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Event Settings & Custom Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-5 w-5 text-indigo-600" />
                      <span>Event Settings</span>
                    </div>
                    <Badge variant="outline">
                      {getEnabledCount('settings')}/{getTotalCount('settings')} enabled
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Edit className="h-4 w-4 text-blue-600" />
                      <Label htmlFor="eventSettingsUpdate">Update Settings</Label>
                    </div>
                    <Switch
                      id="eventSettingsUpdate"
                      checked={settings.eventSettingsUpdate}
                      onCheckedChange={(checked) => updateSetting('eventSettingsUpdate', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-teal-600" />
                      <span>Custom Fields</span>
                    </div>
                    <Badge variant="outline">
                      {getEnabledCount('customFields')}/{getTotalCount('customFields')} enabled
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Plus className="h-4 w-4 text-green-600" />
                        <Label htmlFor="customFieldCreate">Create Field</Label>
                      </div>
                      <Switch
                        id="customFieldCreate"
                        checked={settings.customFieldCreate}
                        onCheckedChange={(checked) => updateSetting('customFieldCreate', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Edit className="h-4 w-4 text-blue-600" />
                        <Label htmlFor="customFieldUpdate">Update Field</Label>
                      </div>
                      <Switch
                        id="customFieldUpdate"
                        checked={settings.customFieldUpdate}
                        onCheckedChange={(checked) => updateSetting('customFieldUpdate', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Trash2 className="h-4 w-4 text-red-600" />
                        <Label htmlFor="customFieldDelete">Delete Field</Label>
                      </div>
                      <Switch
                        id="customFieldDelete"
                        checked={settings.customFieldDelete}
                        onCheckedChange={(checked) => updateSetting('customFieldDelete', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <RotateCcw className="h-4 w-4 text-purple-600" />
                        <Label htmlFor="customFieldReorder">Reorder Fields</Label>
                      </div>
                      <Switch
                        id="customFieldReorder"
                        checked={settings.customFieldReorder}
                        onCheckedChange={(checked) => updateSetting('customFieldReorder', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Authentication, Logs & System Operations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <LogIn className="h-5 w-5 text-emerald-600" />
                      <span>Authentication</span>
                    </div>
                    <Badge variant="outline">
                      {getEnabledCount('auth')}/{getTotalCount('auth')} enabled
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <LogIn className="h-4 w-4 text-green-600" />
                      <Label htmlFor="authLogin">User Login</Label>
                    </div>
                    <Switch
                      id="authLogin"
                      checked={settings.authLogin}
                      onCheckedChange={(checked) => updateSetting('authLogin', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <LogOut className="h-4 w-4 text-red-600" />
                      <Label htmlFor="authLogout">User Logout</Label>
                    </div>
                    <Switch
                      id="authLogout"
                      checked={settings.authLogout}
                      onCheckedChange={(checked) => updateSetting('authLogout', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-red-600" />
                      <span>Log Management</span>
                    </div>
                    <Badge variant="outline">
                      {getEnabledCount('logs')}/{getTotalCount('logs')} enabled
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Trash2 className="h-4 w-4 text-red-600" />
                        <Label htmlFor="logsDelete">Delete Logs</Label>
                      </div>
                      <Switch
                        id="logsDelete"
                        checked={settings.logsDelete}
                        onCheckedChange={(checked) => updateSetting('logsDelete', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Download className="h-4 w-4 text-orange-600" />
                        <Label htmlFor="logsExport">Export Logs</Label>
                      </div>
                      <Switch
                        id="logsExport"
                        checked={settings.logsExport}
                        onCheckedChange={(checked) => updateSetting('logsExport', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Eye className="h-4 w-4 text-gray-600" />
                        <Label htmlFor="logsView">View Logs</Label>
                      </div>
                      <Switch
                        id="logsView"
                        checked={settings.logsView}
                        onCheckedChange={(checked) => updateSetting('logsView', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-5 w-5 text-slate-600" />
                      <span>System Operations</span>
                    </div>
                    <Badge variant="outline">
                      {getEnabledCount('system')}/{getTotalCount('system')} enabled
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Control logging for system view operations that occur on page refresh
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Eye className="h-4 w-4 text-gray-600" />
                        <Label htmlFor="systemViewEventSettings">View Event Settings</Label>
                      </div>
                      <Switch
                        id="systemViewEventSettings"
                        checked={settings.systemViewEventSettings}
                        onCheckedChange={(checked) => updateSetting('systemViewEventSettings', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Eye className="h-4 w-4 text-gray-600" />
                        <Label htmlFor="systemViewAttendeeList">View Attendee List</Label>
                      </div>
                      <Switch
                        id="systemViewAttendeeList"
                        checked={settings.systemViewAttendeeList}
                        onCheckedChange={(checked) => updateSetting('systemViewAttendeeList', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Eye className="h-4 w-4 text-gray-600" />
                        <Label htmlFor="systemViewRolesList">View Roles List</Label>
                      </div>
                      <Switch
                        id="systemViewRolesList"
                        checked={settings.systemViewRolesList}
                        onCheckedChange={(checked) => updateSetting('systemViewRolesList', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Eye className="h-4 w-4 text-gray-600" />
                        <Label htmlFor="systemViewUsersList">View Users List</Label>
                      </div>
                      <Switch
                        id="systemViewUsersList"
                        checked={settings.systemViewUsersList}
                        onCheckedChange={(checked) => updateSetting('systemViewUsersList', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                {hasChanges() ? (
                  <span className="text-amber-600 font-medium">You have unsaved changes</span>
                ) : (
                  <span>All changes saved</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={!hasChanges() || saving}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges() || saving}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">Failed to Load Settings</h3>
            <p className="text-sm text-muted-foreground">
              Unable to load log settings. Please try again.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LogSettingsDialog;