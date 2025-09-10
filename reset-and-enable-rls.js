const { PrismaClient } = require('@prisma/client');

async function resetAndEnableRLS() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Starting RLS reset and setup...');
    
    // Step 1: Drop existing policies and disable RLS
    console.log('\n🧹 Step 1: Cleaning up existing policies and RLS...');
    
    const tables = [
      'users', 'roles', 'invitations', 'event_settings', 'custom_fields',
      'attendees', 'attendee_custom_field_values', 'logs', 'log_settings'
    ];
    
    for (const table of tables) {
      // Drop all existing policies for the table
      await prisma.$executeRawUnsafe(`
        DO $$ 
        DECLARE 
          pol RECORD;
        BEGIN
          FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = '${table}' LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON "${table}"';
          END LOOP;
        END $$;
      `);
      
      // Disable RLS
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY;`);
    }
    
    console.log('✅ Cleaned up existing policies and disabled RLS');
    
    // Step 2: Enable RLS on all tables
    console.log('\n🔒 Step 2: Enabling RLS on all tables...');
    
    for (const table of tables) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
    }
    
    console.log('✅ Enabled RLS on all tables');
    
    // Step 3: Create authentication helper functions
    console.log('\n🔧 Step 3: Creating authentication helper functions...');
    
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
    
    // Step 4: Create RLS Policies
    console.log('\n📋 Step 4: Creating RLS policies...');
    
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
    
    // Service role bypass policies for API operations
    console.log('\n🔑 Step 5: Creating service role bypass policies...');
    
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
    
    console.log('\n🎉 RLS setup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Enabled RLS on ${tables.length} tables`);
    console.log('- Created authentication helper functions');
    console.log('- Created basic user and role policies');
    console.log('- Created service role bypass policies for API operations');
    
  } catch (error) {
    console.error('❌ Error during RLS setup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetAndEnableRLS();