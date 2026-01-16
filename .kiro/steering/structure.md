---
inclusion: fileMatch
fileMatchPattern: "**/*.{ts,tsx,js,jsx},**/api/**/*"
---
# Project Structure & Organization

## Root Directory Structure
```
├── src/                    # Main source code
├── scripts/                # Database setup and migration scripts
├── public/                 # Static assets
├── .kiro/                  # Kiro configuration and steering
└── [config files]          # See tech.md for config file details
```

## Source Code Organization (`src/`)

### Pages (`src/pages/`)
- **Pages Router structure** (not App Router)
- `_app.tsx` - Global app wrapper with providers
- `_document.tsx` - Custom document structure
- `api/` - API routes organized by feature
- Authentication pages: `login.tsx`, `signup.tsx`, `reset-password.tsx`
- Main application pages: `dashboard.tsx`, `private.tsx`, `public.tsx`

### API Routes (`src/pages/api/`)
Organized by feature domains:
- `attendees/` - Attendee CRUD, bulk operations, export/import
- `auth/` - Authentication endpoints
- `custom-fields/` - Custom field management
- `event-settings/` - Event configuration
- `invitations/` - User invitation system
- `logs/` - Activity logging
- `roles/` - Role and permission management
- `users/` - User management

### Components (`src/components/`)
- **Feature components** at root level (e.g., `AttendeeForm.tsx`, `EventSettingsForm.tsx`)
- `ui/` - shadcn/ui component library (40+ components)
- Follow PascalCase naming convention
- Use TypeScript interfaces for props

### Utilities & Libraries (`src/lib/`)
- `appwrite.ts` - Appwrite client configuration
- `utils.ts` - General utility functions (cn, etc.)
- `permissions.ts` - Role-based access control logic
- Custom validation and settings modules

### Other Directories
- `contexts/` - React Context providers (AuthContext)
- `hooks/` - Custom React hooks
- `styles/` - Global CSS (globals.css with Tailwind)

## Naming Conventions

### Files & Directories
- **Components**: PascalCase (e.g., `AttendeeForm.tsx`)
- **Pages**: kebab-case (e.g., `forgot-password.tsx`)
- **API routes**: kebab-case (e.g., `bulk-delete.ts`)
- **Utilities**: camelCase (e.g., `customFieldValidation.ts`)

### Code Conventions
- **Interfaces**: PascalCase with descriptive names
- **Props**: Use TypeScript interfaces, not inline types
- **Imports**: Absolute imports using `@/` alias
- **Components**: Export as default, use named exports for utilities

## Database Schema (Appwrite)
- Collections managed via `scripts/setup-appwrite.ts`
- Collection names use snake_case (e.g., `attendees`, `custom_fields`)
- Document IDs are auto-generated UUIDs
- Attributes defined programmatically with type safety
- Indexes created for query optimization
