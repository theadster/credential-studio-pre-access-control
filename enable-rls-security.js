const { PrismaClient } = require('@prisma/client');

async function enableRLSSecurity() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔒 Starting Row Level Security implementation...');
    
    // Step 1: Enable RLS on all tables
    console.log('\n📋 Step 1: Enabling RLS on all tables...');
    
    const tables = [
      'users',
      'roles', 
      'invitations',
      'event_settings',
      'custom_fields',
      'attendees',
      'attendee_custom_field_values',
      'logs',
      'log_settings'
    ];
    
    for (const table of tables) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`✅ Enabled RLS on ${table}`);
    }
    
    // Step 2: Create authentication helper function
    console.log('\n🔧 Step 2: Creating authentication helper function...');
    
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION get_current_user_id() RETURNS uuid AS $$
        SELECT COALESCE(
          current_setting('request.jwt.claims', true)::json->>'sub',
          (current_setting('request.jwt.claims', true)::json->>'user_id')
        )::uuid;
      $$ LANGUAGE sql STABLE;
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION get_user_role(user_uuid uuid) RETURNS text AS $$
        SELECT r.name FROM users u 
        JOIN roles r ON u."roleId" = r.id 
        WHERE u.id = user_uuid;
      $$ LANGUAGE sql STABLE SECURITY DEFINER;
    `);
    
    console.log('✅ Created authentication helper functions');
    
    // Step 3: Create RLS Policies
    console.log('\n🛡️  Step 3: Creating RLS policies...');
    
    // Users table policies
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can view their own data" ON users
        FOR SELECT USING (id = get_current_user_id());
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can update their own data" ON users
        FOR UPDATE USING (id = get_current_user_id());
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Super admins can manage all users" ON users
        FOR ALL USING (
          get_user_role(get_current_user_id()) = 'Super Administrator'
        );
    `);
    
    console.log('✅ Created users table policies');
    
    // Roles table policies
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Authenticated users can view roles" ON roles
        FOR SELECT USING (get_current_user_id() IS NOT NULL);
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Super admins can manage roles" ON roles
        FOR ALL USING (
          get_user_role(get_current_user_id()) = 'Super Administrator'
        );
    `);
    
    console.log('✅ Created roles table policies');
    
    // Invitations table policies
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can view invitations they created" ON invitations
        FOR SELECT USING ("createdBy" = get_current_user_id());
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Super admins and event managers can manage invitations" ON invitations
        FOR ALL USING (
          get_user_role(get_current_user_id()) IN ('Super Administrator', 'Event Manager')
        );
    `);
    
    console.log('✅ Created invitations table policies');
    
    // Event settings policies
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Authenticated users can view event settings" ON event_settings
        FOR SELECT USING (get_current_user_id() IS NOT NULL);
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Super admins and event managers can manage event settings" ON event_settings
        FOR ALL USING (
          get_user_role(get_current_user_id()) IN ('Super Administrator', 'Event Manager')
        );
    `);
    
    console.log('✅ Created event_settings table policies');
    
    // Custom fields policies
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Authenticated users can view custom fields" ON custom_fields
        FOR SELECT USING (get_current_user_id() IS NOT NULL);
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Super admins and event managers can manage custom fields" ON custom_fields
        FOR ALL USING (
          get_user_role(get_current_user_id()) IN ('Super Administrator', 'Event Manager')
        );
    `);
    
    console.log('✅ Created custom_fields table policies');
    
    // Attendees policies
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Authenticated users can view attendees" ON attendees
        FOR SELECT USING (get_current_user_id() IS NOT NULL);
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Staff and above can manage attendees" ON attendees
        FOR ALL USING (
          get_user_role(get_current_user_id()) IN ('Super Administrator', 'Event Manager', 'Registration Staff')
        );
    `);
    
    console.log('✅ Created attendees table policies');
    
    // Attendee custom field values policies
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Authenticated users can view attendee custom field values" ON attendee_custom_field_values
        FOR SELECT USING (get_current_user_id() IS NOT NULL);
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Staff and above can manage attendee custom field values" ON attendee_custom_field_values
        FOR ALL USING (
          get_user_role(get_current_user_id()) IN ('Super Administrator', 'Event Manager', 'Registration Staff')
        );
    `);
    
    console.log('✅ Created attendee_custom_field_values table policies');
    
    // Logs policies
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can view their own logs" ON logs
        FOR SELECT USING ("userId" = get_current_user_id());
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Super admins and event managers can view all logs" ON logs
        FOR SELECT USING (
          get_user_role(get_current_user_id()) IN ('Super Administrator', 'Event Manager')
        );
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Authenticated users can create logs" ON logs
        FOR INSERT WITH CHECK ("userId" = get_current_user_id());
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Super admins can update logs" ON logs
        FOR UPDATE USING (
          get_user_role(get_current_user_id()) = 'Super Administrator'
        );
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Super admins can delete logs" ON logs
        FOR DELETE USING (
          get_user_role(get_current_user_id()) = 'Super Administrator'
        );
    `);
    
    console.log('✅ Created logs table policies');
    
    // Log settings policies
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Authenticated users can view log settings" ON log_settings
        FOR SELECT USING (get_current_user_id() IS NOT NULL);
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Super admins can manage log settings" ON log_settings
        FOR ALL USING (
          get_user_role(get_current_user_id()) = 'Super Administrator'
        );
    `);
    
    console.log('✅ Created log_settings table policies');
    
    // Step 4: Create service role bypass policies for API operations
    console.log('\n🔑 Step 4: Creating service role bypass policies...');
    
    // These policies allow the service role to bypass RLS for API operations
    const serviceRoleBypassTables = [
      'users', 'roles', 'invitations', 'event_settings', 'custom_fields', 
      'attendees', 'attendee_custom_field_values', 'logs', 'log_settings'
    ];
    
    for (const table of serviceRoleBypassTables) {
      await prisma.$executeRawUnsafe(`
        CREATE POLICY "Service role bypass" ON "${table}"
          FOR ALL TO service_role USING (true) WITH CHECK (true);
      `);
    }
    
    console.log('✅ Created service role bypass policies');
    
    console.log('\n🎉 Row Level Security implementation completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- ✅ Enabled RLS on all 9 tables');
    console.log('- ✅ Created authentication helper functions');
    console.log('- ✅ Implemented role-based access policies');
    console.log('- ✅ Added service role bypass for API operations');
    console.log('\n🔒 Your database is now secured with Row Level Security!');
    
  } catch (error) {
    console.error('❌ Error implementing RLS:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

enableRLSSecurity();