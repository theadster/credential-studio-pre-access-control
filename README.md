# EventCredentialPro

This is a comprehensive event credential management application that includes:

1. Next.js with Pages Router
2. Tailwind CSS Framework
3. Context for global state management

## Features

- **Event Credential Management**: Complete CRUD operations for attendee records with custom fields and photo uploads
- **User Authentication**: Secure authentication system with role-based access control using Supabase
- **Role Management**: Granular permissions and role management for different user types
- **Event Configuration**: Comprehensive event settings including barcode generation and custom fields
- **Photo Integration**: Seamless photo uploads with Cloudinary widget integration
- **Professional Printing**: High-quality credential printing with Switchboard Canvas API
- **Activity Logging**: Full audit trail of all user actions and system changes
- **Beautiful UI**: Modern, responsive design with Framer Motion animations and shadcn/ui components
- **Database Integration**: Prisma ORM with Supabase PostgreSQL database

## Getting Started

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the development server:
   ```
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## Project Structure

- `pages/`: Contains all the pages of the application
- `components/`: Reusable React components
- `contexts/`: Global state management using Context API
- `hooks/`: Custom React hooks
- `styles/`: Global style (global.css)
- `utils/`: Utility functions and helpers

## Learn More

To learn more about the technologies used in this template, check out the following resources:

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Context API](https://reactjs.org/docs/context.html)
