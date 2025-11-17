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
  monitoring?: Permission;
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
    case 'monitoring':
      // Operator monitoring requires monitoring read access
      return hasPermission(userRole, 'monitoring', 'read');
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

// Helper function to check permissions for API endpoints
export async function checkApiPermission(
  userId: string,
  resource: keyof UserPermissions,
  action: keyof Permission,
  prisma: any
): Promise<{ hasPermission: boolean; user?: any; role?: any }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    if (!user || !user.role) {
      return { hasPermission: false };
    }

    const permission = hasPermission(user.role, resource, action);
    return { hasPermission: permission, user, role: user.role };
  } catch (error) {
    console.error('Error checking API permission:', error);
    return { hasPermission: false };
  }
}