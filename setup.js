const fs = require('fs');
const path = require('path');

console.log('🚀 credential.studio Setup Script');
console.log('=====================================');

// Check if .env.local exists
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file not found!');
  console.log('Please copy .env.local and update the values.');
  process.exit(1);
}

// Read .env.local and check for placeholder values
const envContent = fs.readFileSync(envPath, 'utf8');
const hasPlaceholders = envContent.includes('your_') || envContent.includes('_here');

if (hasPlaceholders) {
  console.log('⚠️  Environment variables contain placeholder values!');
  console.log('Please update .env.local with your actual Supabase credentials.');
  console.log('');
  console.log('Required variables:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  console.log('- DATABASE_URL');
  console.log('- DIRECT_URL');
  console.log('');
  console.log('See BOLT_SETUP.md for detailed instructions.');
} else {
  console.log('✅ Environment variables look good!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Run: npm install');
  console.log('2. Run: npm run build');
  console.log('3. Run: npm run dev');
  console.log('');
  console.log('Your credential.studio app will be ready! 🎉');
}