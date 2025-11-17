# credential.studio Product Overview

credential.studio is a comprehensive event credential management application designed for professional event organizers and administrators. Built with Next.js and powered by Appwrite for backend services.

## Core Features

- **Event Credential Management**: Complete CRUD operations for attendee records with custom fields and photo uploads
- **User Authentication & Authorization**: Role-based access control system with granular permissions using Appwrite Auth
- **Event Configuration**: Comprehensive event settings including barcode generation and custom field management
- **Photo Integration**: Cloudinary integration for professional photo uploads and management
- **Professional Printing**: Switchboard Canvas API integration for high-quality credential printing
- **Activity Logging**: Full audit trail of all user actions and system changes
- **Data Management**: Import/export capabilities with bulk operations support
- **Real-time Updates**: Live data synchronization using Appwrite Realtime

## Target Users

- Event organizers and coordinators
- Registration staff and administrators
- Security personnel managing event access
- Event management companies

## Key Business Logic

- Barcode generation (numerical/alphanumerical) with configurable length and uniqueness
- Custom field system for flexible attendee data collection
- Role-based permissions for different user types (admin, staff, viewer)
- Comprehensive logging system for compliance and audit requirements
- Multi-format export capabilities (CSV, PDF) for reporting and integration

## Technology Stack

- **Frontend**: Next.js 16.0.3 with React 19.2.0 and TypeScript 5.9.3
- **Backend**: Appwrite (Authentication, Database, Realtime, Storage)
- **Styling**: Tailwind CSS 3.4.18 with shadcn/ui component library
- **Image Management**: Cloudinary
- **Printing**: Switchboard Canvas API
- **State Management**: React Context API