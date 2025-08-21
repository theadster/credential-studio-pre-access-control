# credential.studio - Bolt.new Setup Guide

This is a comprehensive event credential management platform built with Next.js, Supabase, and Prisma.

## 🚀 Quick Setup for Bolt.new

### 1. Environment Variables Setup

1. Copy the `.env.local` file and update all the placeholder values
2. Get your Supabase credentials from [Supabase Dashboard](https://supabase.com/dashboard)
3. Update the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
NEXT_PUBLIC_SITE_URL=https://your-bolt-preview-url.bolt.new
```

### 2. Database Setup

The project uses Prisma with PostgreSQL (Supabase). After setting up environment variables:

```bash
# Install dependencies
npm install

# Generate Prisma client and setup database
npm run build
```

### 3. Initial Data Setup

The application requires some initial setup:

1. **Roles**: The system will auto-create default roles on first run
2. **Event Settings**: Create your first event through the UI
3. **Log Settings**: Configure what actions to log

### 4. Key Features

- **User Management**: Role-based access control with invitations
- **Attendee Management**: CRUD operations with custom fields
- **Credential Generation**: Integration with Switchboard Canvas API
- **Bulk Operations**: Import/Export, Bulk Edit/Delete
- **Activity Logging**: Comprehensive audit trail
- **Integrations**: Cloudinary for images, OneSimpleAPI for PDFs

### 5. Required Integrations (Optional)

#### Cloudinary (for image uploads)
- Sign up at [Cloudinary](https://cloudinary.com)
- Configure in Event Settings > Integrations

#### Switchboard Canvas (for credential generation)
- Get API credentials from Switchboard Canvas
- Configure in Event Settings > Integrations

#### OneSimpleAPI (for PDF generation)
- Get API access from OneSimpleAPI
- Configure in Event Settings > Integrations

### 6. First Time Setup

1. Run the application: `npm run dev`
2. Navigate to the login page
3. Create your first admin user
4. Set up your event in Event Settings
5. Configure roles and permissions
6. Start adding attendees!

### 7. Build Commands

The project includes comprehensive build scripts:

- `npm run dev` - Development server
- `npm run build` - Production build with Prisma setup
- `npm run db:studio` - Open Prisma Studio
- `npm run db:migrate` - Run database migrations

### 8. Troubleshooting

#### Common Issues:
1. **Database Connection**: Ensure your Supabase DATABASE_URL is correct
2. **Prisma Client**: Run `npx prisma generate` if you get Prisma client errors
3. **Environment Variables**: Make sure all NEXT_PUBLIC_ variables are set correctly
4. **Permissions**: Check that your Supabase RLS policies allow the operations

#### Database Reset (if needed):
```bash
npm run db:reset
```

### 9. Project Structure

```
src/
├── components/          # React components
├── pages/              # Next.js pages and API routes
├── lib/                # Utility libraries
├── contexts/           # React contexts
├── styles/             # CSS styles
└── util/               # Helper utilities

prisma/
└── schema.prisma       # Database schema
```

### 10. Support

This is a full-featured credential management system with:
- Real-time updates via Supabase
- Comprehensive role-based permissions
- Advanced search and filtering
- Bulk operations
- Activity logging
- Multiple integrations

For any issues, check the console logs and ensure all environment variables are properly configured.