const { PrismaClient } = require('@prisma/client');

async function completeRLSPolicies() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Adding comprehensive RLS policies...');
    
    // Invitations table policies
    console.log('\n📧 Creating invitations table policies...');
    
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
    
    // Event settings table policies
    console.log('\n⚙️ Creating event settings table policies...');
    
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
    
    // Custom fields table policies
    console.log('\n🏷️ Creating custom fields table policies...');
    
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
    
    // Attendees table policies
    console.log('\n👥 Creating attendees table policies...');
    
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
    
    // Attendee custom field values table policies
    console.log('\n📝 Creating attendee custom field values table policies...');
    
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
    
    // Logs table policies
    console.log('\n📊 Creating logs table policies...');
    
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
    
    // Log settings table policies
    console.log('\n🔧 Creating log settings table policies...');
    
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
    
    console.log('\n🎉 All RLS policies created successfully!');
    console.log('\n📊 Summary of policies created:');
    console.log('- Invitations: 2 policies (view own, manage for admins/event managers)');
    console.log('- Event Settings: 2 policies (view for authenticated, manage for admins/event managers)');
    console.log('- Custom Fields: 2 policies (view for authenticated, manage for admins/event managers)');
    console.log('- Attendees: 2 policies (view for authenticated, manage for staff+)');
    console.log('- Attendee Custom Field Values: 2 policies (view for authenticated, manage for staff+)');
    console.log('- Logs: 5 policies (view own, view all for admins, create own, update/delete for super admins)');
    console.log('- Log Settings: 2 policies (view for authenticated, manage for super admins)');
    
  } catch (error) {
    console.error('❌ Error creating RLS policies:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

completeRLSPolicies();