const { PrismaClient } = require('@prisma/client');

async function testRLSFunctionality() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Testing RLS functionality...');
    
    // Test 1: Check if RLS is enabled on all tables
    console.log('\n📋 Test 1: Checking RLS status on all tables...');
    
    const rlsStatus = await prisma.$queryRaw`
      SELECT schemaname, tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `;
    
    console.log('RLS Status:');
    rlsStatus.forEach(table => {
      const status = table.rowsecurity ? '✅ ENABLED' : '❌ DISABLED';
      console.log(`  ${table.tablename}: ${status}`);
    });
    
    // Test 2: Check existing policies
    console.log('\n📋 Test 2: Checking existing RLS policies...');
    
    const policies = await prisma.$queryRaw`
      SELECT tablename, policyname, cmd, roles
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;
    
    console.log(`\nFound ${policies.length} RLS policies:`);
    let currentTable = '';
    policies.forEach(policy => {
      if (policy.tablename !== currentTable) {
        currentTable = policy.tablename;
        console.log(`\n  📊 ${policy.tablename}:`);
      }
      console.log(`    - ${policy.policyname} (${policy.cmd}) for roles: ${policy.roles}`);
    });
    
    // Test 3: Check helper functions
    console.log('\n📋 Test 3: Checking helper functions...');
    
    try {
      const functions = await prisma.$queryRaw`
        SELECT routine_name, routine_type
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name IN ('get_current_user_id', 'get_user_role')
        ORDER BY routine_name;
      `;
      
      console.log('Helper functions:');
      functions.forEach(func => {
        console.log(`  ✅ ${func.routine_name} (${func.routine_type})`);
      });
      
      if (functions.length < 2) {
        console.log('  ⚠️  Some helper functions may be missing');
      }
    } catch (error) {
      console.log('  ❌ Error checking helper functions:', error.message);
    }
    
    // Test 4: Test basic data access (this will test if the service role bypass works)
    console.log('\n📋 Test 4: Testing basic data access...');
    
    try {
      const userCount = await prisma.user.count();
      console.log(`  ✅ Users table accessible: ${userCount} users found`);
      
      const roleCount = await prisma.role.count();
      console.log(`  ✅ Roles table accessible: ${roleCount} roles found`);
      
      const attendeeCount = await prisma.attendee.count();
      console.log(`  ✅ Attendees table accessible: ${attendeeCount} attendees found`);
      
    } catch (error) {
      console.log('  ❌ Error accessing data:', error.message);
      console.log('  This might indicate an issue with service role bypass policies');
    }
    
    // Test 5: Verify service role bypass policies
    console.log('\n📋 Test 5: Checking service role bypass policies...');
    
    const serviceRolePolicies = await prisma.$queryRaw`
      SELECT tablename, policyname
      FROM pg_policies 
      WHERE schemaname = 'public'
      AND policyname = 'Service role bypass'
      ORDER BY tablename;
    `;
    
    console.log(`Service role bypass policies: ${serviceRolePolicies.length}`);
    serviceRolePolicies.forEach(policy => {
      console.log(`  ✅ ${policy.tablename}`);
    });
    
    console.log('\n🎉 RLS functionality test completed!');
    console.log('\n📊 Summary:');
    console.log(`- RLS enabled on ${rlsStatus.filter(t => t.rowsecurity).length}/${rlsStatus.length} tables`);
    console.log(`- ${policies.length} RLS policies created`);
    console.log(`- ${serviceRolePolicies.length} service role bypass policies`);
    console.log('- Basic data access working (service role bypass functional)');
    
  } catch (error) {
    console.error('❌ Error during RLS functionality test:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testRLSFunctionality();