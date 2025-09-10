const { PrismaClient } = require('@prisma/client');

async function checkRLSStatus() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Checking Row Level Security status...');
    
    // Check RLS status for all tables
    const rlsStatus = await prisma.$queryRaw`
      SELECT 
        schemaname, 
        tablename, 
        rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `;
    
    console.log('\nRLS Status for all tables:');
    console.table(rlsStatus);
    
    // Check existing policies
    const policies = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;
    
    console.log('\nExisting RLS Policies:');
    if (policies.length > 0) {
      console.table(policies);
    } else {
      console.log('No RLS policies found.');
    }
    
  } catch (error) {
    console.error('Error checking RLS status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRLSStatus();