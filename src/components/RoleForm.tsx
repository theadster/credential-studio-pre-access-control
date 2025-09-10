import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Users, Settings, Activity, CreditCard, Eye, Edit, Trash2, Plus, Download, Upload, Printer, AlertTriangle } from "lucide-react";

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: any;
  createdAt: string;
}

interface RoleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (roleData: any) => Promise<void>;
  role?: Role | null;
}

interface Permission {
  create?: boolean;
  read?: boolean;
  update?: boolean;
  delete?: boolean;
  print?: boolean;
  export?: boolean;
  import?: boolean;
  bulkEdit?: boolean;
  bulkDelete?: boolean;
  bulkGenerateCredentials?: boolean;
  bulkGeneratePDFs?: boolean;
  configure?: boolean;
  backup?: boolean;
  restore?: boolean;
}

interface UserPermissions {
  attendees?: Permission;
  users?: Permission;
  roles?: Permission;
  eventSettings?: Permission;
  customFields?: Permission;
  logs?: Permission;
  system?: Permission;
}

const defaultPermissions: UserPermissions = {
  attendees: {
    create: false,
    read: false,
    update: false,
    delete: false,
    print: false,
    export: false,
    import: false,
    bulkEdit: false,
    bulkDelete: false,
    bulkGenerateCredentials: false,
    bulkGeneratePDFs: false
  },
  users: {
    create: false,
    read: false,
    update: false,
    delete: false
  },
  roles: {
    create: false,
    read: false,
    update: false,
    delete: false
  },
  eventSettings: {
    create: false,
    read: false,
    update: false,
    delete: false,
    configure: false
  },
  customFields: {
    create: false,
    read: false,
    update: false,
    delete: false
  },
  logs: {
    read: false,
    delete: false,
    export: false,
    configure: false
  },
  system: {
    backup: false,
    restore: false,
    configure: false
  }
};

const permissionLabels = {
  attendees: {
    title: "Attendees",
    description: "Manage event attendees and their credentials",
    icon: Users,
    actions: {
      create: "Create new attendees",
      read: "View attendee list and details",
      update: "Edit attendee information",
      delete: "Delete attendees",
      print: "Print credentials",
      export: "Export attendee data",
      import: "Import attendee data",
      bulkEdit: "Bulk edit multiple attendees",
      bulkDelete: "Bulk delete multiple attendees",
      bulkGenerateCredentials: "Bulk generate credentials for multiple attendees",
      bulkGeneratePDFs: "Bulk generate PDFs for multiple attendees"
    }
  },
  users: {
    title: "User Management",
    description: "Manage system users and their access",
    icon: Shield,
    actions: {
      create: "Create new users",
      read: "View user list and details",
      update: "Edit user information",
      delete: "Delete users"
    }
  },
  roles: {
    title: "Role Management",
    description: "Configure user roles and permissions",
    icon: Shield,
    actions: {
      create: "Create new roles",
      read: "View roles and permissions",
      update: "Edit role permissions",
      delete: "Delete roles"
    }
  },
  eventSettings: {
    title: "Event Settings",
    description: "Configure event settings and integrations",
    icon: Settings,
    actions: {
      create: "Create event settings",
      read: "View event settings",
      update: "Edit event settings",
      delete: "Delete event settings",
      configure: "Advanced configuration"
    }
  },
  customFields: {
    title: "Custom Fields",
    description: "Manage custom attendee data fields",
    icon: Plus,
    actions: {
      create: "Create new custom fields",
      read: "View custom fields",
      update: "Edit custom fields",
      delete: "Delete custom fields"
    }
  },
  logs: {
    title: "Activity Logs",
    description: "View system activity and audit trail",
    icon: Activity,
    actions: {
      read: "View activity logs",
      delete: "Delete logs",
      export: "Export logs",
      configure: "Configure log settings"
    }
  },
  system: {
    title: "System Administration",
    description: "Advanced system management features",
    icon: Settings,
    actions: {
      backup: "Create system backups",
      restore: "Restore from backups",
      configure: "System configuration"
    }
  }
};

export default function RoleForm({ isOpen, onClose, onSave, role }: RoleFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: defaultPermissions
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description || "",
        permissions: { ...defaultPermissions, ...role.permissions }
      });
    } else {
      setFormData({
        name: "",
        description: "",
        permissions: defaultPermissions
      });
    }
    setErrors({});
  }, [role, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Validation
      const newErrors: any = {};
      if (!formData.name.trim()) {
        newErrors.name = "Role name is required";
      }

      // Check if at least one permission is granted
      const hasAnyPermission = Object.values(formData.permissions).some((resource: any) =>
        Object.values(resource).some((permission: any) => permission === true)
      );

      if (!hasAnyPermission) {
        newErrors.permissions = "At least one permission must be granted";
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      await onSave(formData);
      onClose();
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (resource: keyof UserPermissions, action: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [resource]: {
          ...prev.permissions[resource],
          [action]: value
        }
      }
    }));
  };

  const handleSelectAllForResource = (resource: keyof UserPermissions, value: boolean) => {
    const resourcePermissions = { ...formData.permissions[resource] };
    Object.keys(resourcePermissions).forEach(action => {
      resourcePermissions[action as keyof Permission] = value;
    });

    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [resource]: resourcePermissions
      }
    }));
  };

  const getPermissionCount = (resource: keyof UserPermissions) => {
    const permissions = formData.permissions[resource];
    if (!permissions) return { granted: 0, total: 0 };
    
    const granted = Object.values(permissions).filter(Boolean).length;
    const total = Object.keys(permissions).length;
    return { granted, total };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>{role ? "Edit Role" : "Create New Role"}</span>
          </DialogTitle>
          <DialogDescription>
            {role ? "Modify role permissions and settings" : "Create a new role with specific permissions"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter role name"
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the role"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Permissions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Permissions</h3>
                <p className="text-sm text-muted-foreground">
                  Configure what this role can access and modify
                </p>
              </div>
              {errors.permissions && (
                <Alert className="max-w-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{errors.permissions}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {Object.entries(permissionLabels).map(([resource, config]) => {
                const IconComponent = config.icon;
                const { granted, total } = getPermissionCount(resource as keyof UserPermissions);
                const allSelected = granted === total;
                const someSelected = granted > 0 && granted < total;

                return (
                  <Card key={resource} className="border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <IconComponent className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{config.title}</CardTitle>
                            <CardDescription className="text-sm">
                              {config.description}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={granted > 0 ? "default" : "outline"}>
                            {granted}/{total}
                          </Badge>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectAllForResource(resource as keyof UserPermissions, !allSelected)}
                          >
                            {allSelected ? "Deselect All" : "Select All"}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(config.actions).map(([action, label]) => {
                          const isChecked = formData.permissions[resource as keyof UserPermissions]?.[action as keyof Permission] || false;
                          
                          return (
                            <div key={action} className="flex items-center space-x-2 p-2 rounded border bg-muted/20">
                              <Switch
                                id={`${resource}-${action}`}
                                checked={isChecked}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(resource as keyof UserPermissions, action, checked)
                                }
                              />
                              <Label 
                                htmlFor={`${resource}-${action}`}
                                className="text-sm font-medium cursor-pointer flex-1"
                              >
                                {label}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Error Display */}
          {errors.submit && (
            <Alert className="border-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {role ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  {role ? "Update Role" : "Create Role"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}