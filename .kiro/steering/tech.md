# Technology Stack & Build System

## Core Framework & Runtime
- **Next.js 16.0.3** with Pages Router (not App Router)
- **React 19.2.0** with TypeScript 5.9.3
- **Node.js >=20.x** (specified in engines)

## Backend Services
- **Appwrite** as backend platform (Auth, Database, Realtime, Storage)
- **Appwrite Database** for all data storage with real-time capabilities
- **Appwrite Auth** for authentication and user management
- Database schema managed through Appwrite collections and attributes

## Styling & UI
- **Tailwind CSS 3.4.18** for styling
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
  - Main config: `tsconfig.json` (excludes test files)
  - Test config: `tsconfig.test.json` (separate config for test files)
- **PostCSS** with Autoprefixer
- **Vitest** for testing (see testing.md for details)

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
- Image domains configured for images.unsplash.com

## Configuration Files
- `components.json` - shadcn/ui configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `next.config.mjs` - Next.js configuration
- `tsconfig.json` - TypeScript configuration with path aliases
- `tsconfig.test.json` - Test-specific TypeScript config
- `vitest.config.ts` - Vitest test runner configuration

## Command Execution Guidelines

### Running Commands
- **NEVER** use a `path` parameter when executing bash commands
- Commands run from the workspace root by default
- Only specify a path if you need to run a command in a specific subdirectory
- This keeps command execution clean and prevents unnecessary path overhead

**Examples:**
- ✅ `npm run dev` (no path needed)
- ✅ `npx vitest --run` (no path needed)
- ✅ `npm run build` (no path needed)
- ❌ `path: "."` or `path: "/workspace"` (unnecessary)