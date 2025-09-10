# Row Level Security (RLS) Implementation Documentation

## Overview

This document outlines the comprehensive Row Level Security (RLS) implementation that has been applied to the Credential Studio database. RLS provides fine-grained access control at the database level, ensuring that users can only access data they are authorized to see based on their authentication status and role.

## Security Improvements

### 1. Database-Level Security
- **Row Level Security enabled** on all 9 main tables
- **31 comprehensive RLS policies** created for granular access control
- **Authentication helper functions** for consistent user identification
- **Service role bypass policies** for API operations

### 2. Tables Protected by RLS

| Table | RLS Status | Policies Count |
|-------|------------|----------------|
| users | ✅ Enabled | 4 policies |
| roles | ✅ Enabled | 3 policies |
| invitations | ✅ Enabled | 3 policies |
| event_settings | ✅ Enabled | 3 policies |
| custom_fields | ✅ Enabled | 3 policies |
| attendees | ✅ Enabled | 3 policies |
| attendee_custom_field_values | ✅ Enabled | 3 policies |
| logs | ✅ Enabled | 6 policies |
| log_settings | ✅ Enabled | 3 policies |

## Authentication Helper Functions

### `get_current_user_id()`
```sql
CREATE OR REPLACE FUNCTION get_current_user_id() RETURNS uuid AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    (current_setting('request.jwt.claims', true)::json->>'user_id')
  )::uuid;
$$ LANGUAGE sql STABLE;
```

### `get_user_role(user_uuid uuid)`
```sql
CREATE OR REPLACE FUNCTION get_user_role(user_uuid uuid) RETURNS text AS $$
  SELECT r.name FROM users u 
  JOIN roles r ON u."roleId" = r.id 
  WHERE u.id = user_uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

## RLS Policy Structure

### Users Table Policies
1. **Users can view their own data** - Users can only see their own profile information
2. **Users can update their own data** - Users can only modify their own profile
3. **Super admins can manage all users** - Super Administrators have full access to all user records
4. **Service role bypass** - Allows API operations to function properly

### Roles Table Policies
1. **Authenticated users can view roles** - Any authenticated user can view available roles
2. **Super admins can manage roles** - Only Super Administrators can create/modify/delete roles
3. **Service role bypass** - Ensures API functionality

### Invitations Table Policies
1. **Users can view invitations they created** - Users can only see invitations they personally created
2. **Super admins and event managers can manage invitations** - Administrative roles have full access
3. **Service role bypass** - API operation support

### Event Settings Table Policies
1. **Authenticated users can view event settings** - All authenticated users can view event configuration
2. **Super admins and event managers can manage event settings** - Only administrative roles can modify settings
3. **Service role bypass** - API operation support

### Custom Fields Table Policies
1. **Authenticated users can view custom fields** - All authenticated users can see custom field definitions
2. **Super admins and event managers can manage custom fields** - Only administrative roles can modify custom fields
3. **Service role bypass** - API operation support

### Attendees Table Policies
1. **Authenticated users can view attendees** - All authenticated users can view attendee information
2. **Staff and above can manage attendees** - Registration Staff, Event Managers, and Super Administrators can modify attendee data
3. **Service role bypass** - API operation support

### Attendee Custom Field Values Table Policies
1. **Authenticated users can view attendee custom field values** - All authenticated users can view custom field data
2. **Staff and above can manage attendee custom field values** - Registration Staff and above can modify custom field values
3. **Service role bypass** - API operation support

### Logs Table Policies
1. **Users can view their own logs** - Users can only see logs related to their own actions
2. **Super admins and event managers can view all logs** - Administrative roles have full log visibility
3. **Authenticated users can create logs** - All authenticated users can create log entries
4. **Super admins can update logs** - Only Super Administrators can modify existing logs
5. **Super admins can delete logs** - Only Super Administrators can delete log entries
6. **Service role bypass** - API operation support

### Log Settings Table Policies
1. **Authenticated users can view log settings** - All authenticated users can view logging configuration
2. **Super admins can manage log settings** - Only Super Administrators can modify logging settings
3. **Service role bypass** - API operation support

## Role-Based Access Control

### Role Hierarchy
1. **Super Administrator** - Full access to all data and operations
2. **Event Manager** - Can manage events, attendees, and view logs
3. **Registration Staff** - Can manage attendees and their custom field values
4. **Regular User** - Can view their own data and basic event information

### Permission Matrix

| Resource | Super Admin | Event Manager | Registration Staff | Regular User |
|----------|-------------|---------------|-------------------|-------------|
| Users | Full Access | View Only | View Only | Own Data Only |
| Roles | Full Access | View Only | View Only | View Only |
| Invitations | Full Access | Full Access | View Own | View Own |
| Event Settings | Full Access | Full Access | View Only | View Only |
| Custom Fields | Full Access | Full Access | View Only | View Only |
| Attendees | Full Access | Full Access | Full Access | View Only |
| Attendee Custom Fields | Full Access | Full Access | Full Access | View Only |
| Logs | Full Access | View All | View Own | View Own |
| Log Settings | Full Access | View Only | View Only | View Only |

## Service Role Bypass

To ensure API operations function correctly, each table includes a "Service role bypass" policy that allows the Supabase service role to perform all operations. This is essential for:

- API endpoints that need to query data on behalf of users
- Background processes and automated tasks
- Administrative operations performed by the application

## Security Benefits

### 1. Defense in Depth
- **Database-level protection** complements application-level security
- **Automatic enforcement** regardless of how data is accessed
- **Protection against SQL injection** and direct database access

### 2. Principle of Least Privilege
- Users can only access data they need for their role
- **Granular permissions** based on specific operations (SELECT, INSERT, UPDATE, DELETE)
- **Context-aware access** based on data ownership and relationships

### 3. Audit and Compliance
- **Clear policy definitions** for security audits
- **Role-based access tracking** through database logs
- **Consistent enforcement** across all database operations

## Testing and Verification

The RLS implementation has been thoroughly tested:

✅ **RLS Status**: Enabled on all 9 tables  
✅ **Policy Count**: 31 comprehensive policies created  
✅ **Helper Functions**: Authentication functions working correctly  
✅ **Service Role Bypass**: API operations functioning properly  
✅ **Data Access**: Basic CRUD operations verified  
✅ **Application Functionality**: Login and role-based features working  

## Maintenance and Updates

### Adding New Tables
When adding new tables to the schema:
1. Enable RLS: `ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;`
2. Create appropriate policies based on data sensitivity
3. Add service role bypass policy for API operations
4. Test access patterns thoroughly

### Modifying Policies
To modify existing policies:
1. Drop the existing policy: `DROP POLICY "policy_name" ON table_name;`
2. Create the new policy with updated conditions
3. Test the changes thoroughly
4. Update this documentation

### Monitoring
Regularly monitor:
- Policy effectiveness through database logs
- Application functionality after policy changes
- Performance impact of RLS policies
- Security audit compliance

## Conclusion

The implemented RLS system provides comprehensive database-level security that:
- Protects sensitive data at the database level
- Enforces role-based access control automatically
- Maintains application functionality through service role bypass
- Provides a solid foundation for security compliance

This implementation ensures that even if application-level security is bypassed, the database itself enforces proper access controls, significantly improving the overall security posture of the Credential Studio application.