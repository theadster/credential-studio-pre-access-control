interface Permission {
  create?: boolean;
  read?: boolean;
  update?: boolean;
  delete?: boolean;
  print?: boolean;
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

export function hasPermission(
  userRole: any,
  resource: keyof UserPermissions,
  action: keyof Permission
): boolean {
  if (!userRole || !userRole.permissions) {
    return false;
  }

  const permissions = userRole.permissions as UserPermissions;
  const resourcePermissions = permissions[resource];

  if (!resourcePermissions) {
    return false;
  }

  return resourcePermissions[action] === true;
}

export function canAccessTab(userRole: any, tab: string): boolean {
  switch (tab) {
    case 'attendees':
      return hasPermission(userRole, 'attendees', 'read');
    case 'users':
      return hasPermission(userRole, 'users', 'read');
    case 'roles':
      return hasPermission(userRole, 'roles', 'read');
    case 'settings':
      return hasPermission(userRole, 'eventSettings', 'read');
    case 'logs':
      return hasPermission(userRole, 'logs', 'read');
    default:
      return false;
  }
}

export function getUserRoleLevel(userRole: any): number {
  if (!userRole) return 0;
  
  switch (userRole.name) {
    case 'Super Administrator':
      return 4;
    case 'Event Manager':
      return 3;
    case 'Registration Staff':
      return 2;
    case 'Viewer':
      return 1;
    default:
      return 0;
  }
}

export function canManageUser(currentUserRole: any, targetUserRole: any): boolean {
  const currentLevel = getUserRoleLevel(currentUserRole);
  const targetLevel = getUserRoleLevel(targetUserRole);
  
  // Super Administrators can manage anyone
  // Event Managers can manage Registration Staff and Viewers
  // Others cannot manage users
  return currentLevel > targetLevel && currentLevel >= 3;
}