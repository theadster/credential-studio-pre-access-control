# 🚀 Bolt.new Migration Checklist

## ✅ Pre-Migration Checklist

### Files Created/Updated:
- [x] `.env.local` - Environment variables template
- [x] `BOLT_SETUP.md` - Comprehensive setup guide
- [x] `setup.js` - Setup validation script
- [x] `package.json` - Updated with Prisma build commands
- [x] `BOLT_CHECKLIST.md` - This checklist

### Required for Bolt.new:
- [x] All source code is ready
- [x] Package.json has proper build scripts
- [x] Environment variables template is created
- [x] Setup documentation is complete

## 📋 Post-Migration Steps (Do these in Bolt.new)

### 1. Environment Setup
```bash
# Run the setup checker
npm run setup
```

### 2. Update .env.local with your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `DATABASE_URL` - Your Supabase PostgreSQL connection string
- `DIRECT_URL` - Your Supabase direct connection string
- `NEXT_PUBLIC_SITE_URL` - Update to your Bolt.new preview URL

### 3. Install and Build
```bash
npm install
npm run build
npm run dev
```

### 4. First Time Setup in the App
1. Navigate to the login page
2. Create your first admin user
3. Go to Event Settings and configure your event
4. Set up roles and permissions in the Roles section
5. Configure integrations (optional):
   - Cloudinary for image uploads
   - Switchboard Canvas for credential generation
   - OneSimpleAPI for PDF generation

### 5. Test Core Features
- [ ] User authentication works
- [ ] Can create/edit attendees
- [ ] Custom fields are working
- [ ] Search and filtering works
- [ ] Bulk operations work
- [ ] Activity logging is active

## 🔧 Troubleshooting

### Common Issues:
1. **Build Errors**: Make sure all environment variables are set
2. **Database Connection**: Verify your Supabase DATABASE_URL
3. **Prisma Issues**: Run `npx prisma generate` manually if needed
4. **Permission Errors**: Check Supabase RLS policies

### Quick Fixes:
```bash
# Reset database if needed
npm run db:reset

# Regenerate Prisma client
npx prisma generate

# Open database browser
npm run db:studio
```

## 📁 Project Structure Overview

```
credential.studio/
├── .env.local              # Environment variables (UPDATE THIS!)
├── BOLT_SETUP.md          # Setup instructions
├── BOLT_CHECKLIST.md      # This checklist
├── setup.js               # Setup validation script
├── package.json           # Dependencies and scripts
├── prisma/
│   └── schema.prisma      # Database schema
├── src/
│   ├── components/        # React components
│   ├── pages/            # Next.js pages and API routes
│   ├── lib/              # Utility libraries
│   ├── contexts/         # React contexts
│   └── styles/           # CSS styles
└── public/               # Static assets
```

## 🎯 Success Criteria

Your migration is successful when:
- [x] The app builds without errors
- [x] You can log in and create users
- [x] You can manage attendees
- [x] All core features are working
- [x] Database operations are functioning

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify all environment variables are correct
3. Ensure your Supabase project is properly configured
4. Review the BOLT_SETUP.md for detailed instructions

**Your credential.studio app is ready for Bolt.new! 🚀**