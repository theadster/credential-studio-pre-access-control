import React, { useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Shield, Users, Settings, Calendar, Edit, Trash2, ChevronDown } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: any;
  createdAt: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  role?: { id: string } | null;
}

interface RoleCardProps {
  role: Role;
  users: User[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (role: Role) => void;
  onDelete: (roleId: string) => void;
}

const RoleCard = memo(({ role, users, canEdit, canDelete, onEdit, onDelete }: RoleCardProps) => {
  // Memoize user count calculation
  const userCount = useMemo(() => {
    return users.filter(u => u.role?.id === role.id).length;
  }, [users, role.id]);

  // Memoize permission count calculation
  const permissionCount = useMemo(() => {
    return Object.values(role.permissions || {}).reduce((count, perms) => {
      if (typeof perms === 'object' && perms !== null) {
        return count + Object.values(perms).filter(Boolean).length;
      }
      return count + (perms ? 1 : 0);
    }, 0);
  }, [role.permissions]);

  // Memoize role color classes
  const roleColorClasses = useMemo(() => {
    const colorMap: Record<string, { bg: string; text: string }> = {
      'Super Administrator': {
        bg: 'bg-red-100 dark:bg-red-900/20',
        text: 'text-red-600 dark:text-red-400'
      },
      'Administrator': {
        bg: 'bg-purple-100 dark:bg-purple-900/20',
        text: 'text-purple-600 dark:text-purple-400'
      },
      'Manager': {
        bg: 'bg-blue-100 dark:bg-blue-900/20',
        text: 'text-blue-600 dark:text-blue-400'
      },
      'Editor': {
        bg: 'bg-green-100 dark:bg-green-900/20',
        text: 'text-green-600 dark:text-green-400'
      }
    };

    return colorMap[role.name] || {
      bg: 'bg-gray-100 dark:bg-gray-900/20',
      text: 'text-gray-600 dark:text-gray-400'
    };
  }, [role.name]);

  // Memoize assigned users
  const assignedUsers = useMemo(() => {
    return users.filter(u => u.role?.id === role.id).slice(0, 5);
  }, [users, role.id]);

  // Memoize permission categories
  const permissionCategories = useMemo(() => {
    return Object.entries(role.permissions || {})
      .map(([resource, perms]: [string, boolean | Record<string, boolean>]) => {
        const resourcePermissions = typeof perms === 'object' && perms !== null
          ? Object.entries(perms).filter(([, allowed]) => allowed).map(([action]) => action)
          : perms ? [String(perms)] : [];

        if (resourcePermissions.length === 0) return null;

        return {
          resource,
          permissions: resourcePermissions
        };
      })
      .filter(Boolean);
  }, [role.permissions]);

  return (
    <div
      className="group relative border rounded-lg p-6 hover:shadow-lg transition-all duration-300 hover:border-primary/50 hover:scale-[1.02] bg-gradient-to-br from-background to-muted/30"
      role="article"
      aria-label={`${role.name} role with ${userCount} user${userCount !== 1 ? 's' : ''} and ${permissionCount} permission${permissionCount !== 1 ? 's' : ''}`}
    >
      {/* Role Header */}
      <div className="flex items-start mb-4 pr-0 md:pr-20">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <div className={`p-2 rounded-lg transition-colors ${roleColorClasses.bg}`}>
              <Shield className={`h-5 w-5 ${roleColorClasses.text}`} aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                {role.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {role.description || 'No description provided'}
              </p>
            </div>
          </div>

          {/* Role Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-muted-foreground mt-3">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" aria-hidden="true" />
              <span>{userCount} user{userCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4" aria-hidden="true" />
              <span>{permissionCount} permission{permissionCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Created {new Date(role.createdAt).toLocaleDateString()}</span>
              <span className="sm:hidden">{new Date(role.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="absolute top-4 right-4 flex items-center space-x-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(role)}
              className="hover:bg-primary/10 hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={`Edit ${role.name} role`}
            >
              <Edit className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Edit {role.name} role</span>
            </Button>
          )}
          {canDelete && role.name !== 'Super Administrator' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={() => onDelete(role.id)}
              aria-label={`Delete ${role.name} role`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Delete {role.name} role</span>
            </Button>
          )}
        </div>
      </div>

      {/* Permissions Overview */}
      <div className="mt-4">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="permissions" className="border-none">
            <AccordionTrigger className="hover:no-underline py-2" aria-label={`View ${permissionCount} permission${permissionCount !== 1 ? 's' : ''} for ${role.name}`}>
              <div className="flex items-center space-x-2">
                <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm font-medium text-foreground">Permissions Overview</span>
                <Badge variant="secondary" className="text-xs">
                  {permissionCount} permission{permissionCount !== 1 ? 's' : ''}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {permissionCategories.map((category: any) => (
                  <div key={category.resource} className="flex flex-col space-y-2 p-3 bg-muted/30 rounded-lg border">
                    <div className="flex items-center space-x-2">
                      <div className={`h-2 w-2 rounded-full ${category.permissions.length > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span className="text-sm font-medium capitalize">{category.resource}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {category.permissions.slice(0, 3).map((action: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs px-2 py-0.5">
                          {action}
                        </Badge>
                      ))}
                      {category.permissions.length > 3 && (
                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                          +{category.permissions.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Users with this role */}
      <div className="mt-4 pt-4 border-t">
        <div className="text-sm font-medium text-foreground mb-3">
          {userCount > 0 ? 'Users with this role' : 'No users assigned'}
        </div>
        {userCount > 0 ? (
          <div className="flex flex-wrap gap-2">
            {assignedUsers.map((user) => (
              <div 
                key={user.id} 
                className="flex items-center space-x-2 bg-muted/50 rounded-full px-3 py-1.5 hover:bg-muted transition-colors"
              >
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-foreground">
                  {user.name || user.email.split('@')[0]}
                </span>
              </div>
            ))}
            {userCount > 5 && (
              <div className="flex items-center justify-center bg-muted/50 rounded-full px-3 py-1.5">
                <span className="text-xs text-muted-foreground font-medium">
                  +{userCount - 5} more
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            This role has not been assigned to any users yet.
          </p>
        )}
      </div>
    </div>
  );
});

RoleCard.displayName = 'RoleCard';

export default RoleCard;
