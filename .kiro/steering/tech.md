# Technology Stack & Build System

## Core Framework & Runtime
- **Next.js 15.5.2** with Pages Router (not App Router)
- **React 19.1.1** with TypeScript 5.x
- **Node.js 20.x** (specified in engines)

## Backend Services
- **Appwrite** as backend platform (Auth, Database, Realtime, Storage)
- **Appwrite Database** for all data storage with real-time capabilities
- **Appwrite Auth** for authentication and user management
- Database schema managed through Appwrite collections and attributes

## Styling & UI
- **Tailwind CSS 3.4.13** for styling
- **shadcn/ui** component library (New York style)
- **Radix UI** primitives for accessible components
- **Framer Motion** for animations
- **Lucide React** for icons

## Key Libraries
- **Appwrite SDK** for authentication, database, and real-time operations
- **React Hook Form** with **Zod** validation
- **Cloudinary** for image management
- **date-fns** for date manipulation
- **Switchboard Canvas API** for credential printing

## Development Tools
- **ESLint** with Next.js config
- **TypeScript** with strict mode enabled
- **PostCSS** with Autoprefixer

## Common Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Appwrite Setup
```bash
npm run setup:appwrite  # Create Appwrite collections and configure database
node scripts/setup-appwrite.ts  # Run setup script directly
node scripts/verify-appwrite-setup.ts  # Verify Appwrite configuration
```

### Data Migration (if migrating from Supabase)
```bash
node src/scripts/migrate-to-appwrite.ts  # Migrate data from Supabase to Appwrite
```

### Setup & Deployment
```bash
npm run setup        # Initial project setup
npm run vercel-build # Vercel deployment build
```

## Build Configuration
- TypeScript build errors are ignored in production (`ignoreBuildErrors: true`)
- Webpack optimization disabled in preview environments
- Image domains configured for assets.co.dev and images.unsplash.com