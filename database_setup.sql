-- CredentialStudio Database Setup SQL
-- This file creates all necessary tables, constraints, and initial data for the CredentialStudio application
-- Run this file on a fresh PostgreSQL database to set up the complete schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (mapped from User model)
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "roleId" TEXT,
    "isInvited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Create invitations table
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- Create roles table
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- Create event_settings table
CREATE TABLE "event_settings" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventTime" TEXT,
    "eventLocation" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL,
    "barcodeType" TEXT NOT NULL,
    "barcodeLength" INTEGER NOT NULL,
    "barcodeUnique" BOOLEAN NOT NULL,
    "forceFirstNameUppercase" BOOLEAN DEFAULT false,
    "forceLastNameUppercase" BOOLEAN DEFAULT false,
    "attendeeSortField" TEXT DEFAULT 'lastName',
    "attendeeSortDirection" TEXT DEFAULT 'asc',
    "cloudinaryEnabled" BOOLEAN DEFAULT false,
    "cloudinaryCloudName" TEXT,
    "cloudinaryApiKey" TEXT,
    "cloudinaryApiSecret" TEXT,
    "cloudinaryUploadPreset" TEXT,
    "cloudinaryAutoOptimize" BOOLEAN DEFAULT false,
    "cloudinaryGenerateThumbnails" BOOLEAN DEFAULT false,
    "cloudinaryDisableSkipCrop" BOOLEAN DEFAULT false,
    "cloudinaryCropAspectRatio" TEXT DEFAULT '1',
    "switchboardEnabled" BOOLEAN DEFAULT false,
    "switchboardApiEndpoint" TEXT,
    "switchboardAuthHeaderType" TEXT DEFAULT 'Bearer',
    "switchboardApiKey" TEXT,
    "switchboardRequestBody" TEXT,
    "switchboardTemplateId" TEXT,
    "switchboardFieldMappings" JSONB,
    "oneSimpleApiEnabled" BOOLEAN DEFAULT false,
    "oneSimpleApiUrl" TEXT,
    "oneSimpleApiFormDataKey" TEXT,
    "oneSimpleApiFormDataValue" TEXT,
    "oneSimpleApiRecordTemplate" TEXT,
    "bannerImageUrl" TEXT,
    "signInBannerUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_settings_pkey" PRIMARY KEY ("id")
);

-- Create custom_fields table
CREATE TABLE "custom_fields" (
    "id" TEXT NOT NULL,
    "eventSettingsId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "internalFieldName" TEXT,
    "fieldType" TEXT NOT NULL,
    "fieldOptions" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_fields_pkey" PRIMARY KEY ("id")
);

-- Create attendees table
CREATE TABLE "attendees" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "barcodeNumber" TEXT NOT NULL,
    "photoUrl" TEXT,
    "credentialUrl" TEXT,
    "credentialGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendees_pkey" PRIMARY KEY ("id")
);

-- Create attendee_custom_field_values table
CREATE TABLE "attendee_custom_field_values" (
    "id" TEXT NOT NULL,
    "attendeeId" TEXT NOT NULL,
    "customFieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "attendee_custom_field_values_pkey" PRIMARY KEY ("id")
);

-- Create logs table
CREATE TABLE "logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attendeeId" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- Create log_settings table
CREATE TABLE "log_settings" (
    "id" TEXT NOT NULL,
    "attendeeCreate" BOOLEAN NOT NULL DEFAULT true,
    "attendeeUpdate" BOOLEAN NOT NULL DEFAULT true,
    "attendeeDelete" BOOLEAN NOT NULL DEFAULT true,
    "attendeeView" BOOLEAN NOT NULL DEFAULT false,
    "attendeeBulkDelete" BOOLEAN NOT NULL DEFAULT true,
    "attendeeImport" BOOLEAN NOT NULL DEFAULT true,
    "attendeeExport" BOOLEAN NOT NULL DEFAULT true,
    "credentialGenerate" BOOLEAN NOT NULL DEFAULT true,
    "credentialClear" BOOLEAN NOT NULL DEFAULT true,
    "userCreate" BOOLEAN NOT NULL DEFAULT true,
    "userUpdate" BOOLEAN NOT NULL DEFAULT true,
    "userDelete" BOOLEAN NOT NULL DEFAULT true,
    "userView" BOOLEAN NOT NULL DEFAULT false,
    "userInvite" BOOLEAN NOT NULL DEFAULT true,
    "roleCreate" BOOLEAN NOT NULL DEFAULT true,
    "roleUpdate" BOOLEAN NOT NULL DEFAULT true,
    "roleDelete" BOOLEAN NOT NULL DEFAULT true,
    "roleView" BOOLEAN NOT NULL DEFAULT false,
    "eventSettingsUpdate" BOOLEAN NOT NULL DEFAULT true,
    "customFieldCreate" BOOLEAN NOT NULL DEFAULT true,
    "customFieldUpdate" BOOLEAN NOT NULL DEFAULT true,
    "customFieldDelete" BOOLEAN NOT NULL DEFAULT true,
    "customFieldReorder" BOOLEAN NOT NULL DEFAULT true,
    "authLogin" BOOLEAN NOT NULL DEFAULT true,
    "authLogout" BOOLEAN NOT NULL DEFAULT true,
    "logsDelete" BOOLEAN NOT NULL DEFAULT true,
    "logsExport" BOOLEAN NOT NULL DEFAULT true,
    "logsView" BOOLEAN NOT NULL DEFAULT false,
    "systemViewEventSettings" BOOLEAN NOT NULL DEFAULT false,
    "systemViewAttendeeList" BOOLEAN NOT NULL DEFAULT false,
    "systemViewRolesList" BOOLEAN NOT NULL DEFAULT false,
    "systemViewUsersList" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_settings_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");
CREATE UNIQUE INDEX "attendees_barcodeNumber_key" ON "attendees"("barcodeNumber");
CREATE UNIQUE INDEX "attendee_custom_field_values_attendeeId_customFieldId_key" ON "attendee_custom_field_values"("attendeeId", "customFieldId");

-- Add foreign key constraints
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_eventSettingsId_fkey" FOREIGN KEY ("eventSettingsId") REFERENCES "event_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendee_custom_field_values" ADD CONSTRAINT "attendee_custom_field_values_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "attendees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendee_custom_field_values" ADD CONSTRAINT "attendee_custom_field_values_customFieldId_fkey" FOREIGN KEY ("customFieldId") REFERENCES "custom_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "logs" ADD CONSTRAINT "logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "logs" ADD CONSTRAINT "logs_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "attendees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default roles with comprehensive permissions matching the application structure
INSERT INTO "roles" ("id", "name", "description", "permissions", "createdAt", "updatedAt") VALUES
(
    'clm0000001',
    'Super Administrator',
    'Full system access with all permissions including user management and system configuration',
    '{
        "attendees": {
            "create": true,
            "read": true,
            "update": true,
            "delete": true,
            "print": true,
            "export": true,
            "import": true
        },
        "users": {
            "create": true,
            "read": true,
            "update": true,
            "delete": true
        },
        "roles": {
            "create": true,
            "read": true,
            "update": true,
            "delete": true
        },
        "eventSettings": {
            "create": true,
            "read": true,
            "update": true,
            "delete": true
        },
        "customFields": {
            "create": true,
            "read": true,
            "update": true,
            "delete": true
        },
        "logs": {
            "read": true,
            "delete": true,
            "export": true,
            "configure": true
        },
        "system": {
            "configure": true,
            "backup": true,
            "restore": true
        }
    }',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'clm0000002',
    'Event Manager',
    'Full event management access including attendees, settings, and printing',
    '{
        "attendees": {
            "create": true,
            "read": true,
            "update": true,
            "delete": true,
            "print": true,
            "export": true,
            "import": true
        },
        "users": {
            "read": true
        },
        "roles": {
            "read": true
        },
        "eventSettings": {
            "create": true,
            "read": true,
            "update": true,
            "delete": false
        },
        "customFields": {
            "create": true,
            "read": true,
            "update": true,
            "delete": true
        },
        "logs": {
            "read": true,
            "export": true,
            "configure": false
        },
        "system": {
            "configure": false,
            "backup": false,
            "restore": false
        }
    }',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'clm0000003',
    'Registration Staff',
    'Attendee management and credential printing access',
    '{
        "attendees": {
            "create": true,
            "read": true,
            "update": true,
            "delete": false,
            "print": true,
            "export": false,
            "import": false
        },
        "users": {
            "read": false
        },
        "roles": {
            "read": false
        },
        "eventSettings": {
            "create": false,
            "read": true,
            "update": false,
            "delete": false
        },
        "customFields": {
            "create": false,
            "read": true,
            "update": false,
            "delete": false
        },
        "logs": {
            "read": false,
            "export": false,
            "configure": false
        },
        "system": {
            "configure": false,
            "backup": false,
            "restore": false
        }
    }',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'clm0000004',
    'Viewer',
    'Read-only access to attendee information',
    '{
        "attendees": {
            "create": false,
            "read": true,
            "update": false,
            "delete": false,
            "print": false,
            "export": false,
            "import": false
        },
        "users": {
            "read": false
        },
        "roles": {
            "read": false
        },
        "eventSettings": {
            "create": false,
            "read": true,
            "update": false,
            "delete": false
        },
        "customFields": {
            "create": false,
            "read": true,
            "update": false,
            "delete": false
        },
        "logs": {
            "read": false,
            "export": false,
            "configure": false
        },
        "system": {
            "configure": false,
            "backup": false,
            "restore": false
        }
    }',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Insert default event settings
INSERT INTO "event_settings" ("id", "eventName", "eventDate", "eventTime", "eventLocation", "timeZone", "barcodeType", "barcodeLength", "barcodeUnique", "createdAt", "updatedAt") VALUES
(
    'clm0000001',
    'My Event',
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    '09:00',
    'Event Location',
    'America/New_York',
    'numerical',
    8,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Insert default log settings
INSERT INTO "log_settings" ("id", "createdAt", "updatedAt") VALUES
(
    'clm0000001',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX "users_roleId_idx" ON "users"("roleId");
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");
CREATE INDEX "invitations_userId_idx" ON "invitations"("userId");
CREATE INDEX "invitations_createdBy_idx" ON "invitations"("createdBy");
CREATE INDEX "invitations_expiresAt_idx" ON "invitations"("expiresAt");
CREATE INDEX "custom_fields_eventSettingsId_idx" ON "custom_fields"("eventSettingsId");
CREATE INDEX "custom_fields_order_idx" ON "custom_fields"("order");
CREATE INDEX "attendees_firstName_idx" ON "attendees"("firstName");
CREATE INDEX "attendees_lastName_idx" ON "attendees"("lastName");
CREATE INDEX "attendees_createdAt_idx" ON "attendees"("createdAt");
CREATE INDEX "attendees_updatedAt_idx" ON "attendees"("updatedAt");
CREATE INDEX "attendee_custom_field_values_attendeeId_idx" ON "attendee_custom_field_values"("attendeeId");
CREATE INDEX "attendee_custom_field_values_customFieldId_idx" ON "attendee_custom_field_values"("customFieldId");
CREATE INDEX "logs_userId_idx" ON "logs"("userId");
CREATE INDEX "logs_attendeeId_idx" ON "logs"("attendeeId");
CREATE INDEX "logs_action_idx" ON "logs"("action");
CREATE INDEX "logs_createdAt_idx" ON "logs"("createdAt");

-- Add comments to tables for documentation
COMMENT ON TABLE "users" IS 'Application users with role-based access control';
COMMENT ON TABLE "invitations" IS 'User invitation tokens and tracking';
COMMENT ON TABLE "roles" IS 'User roles with JSON-based permissions';
COMMENT ON TABLE "event_settings" IS 'Global event configuration and integration settings';
COMMENT ON TABLE "custom_fields" IS 'Dynamic custom fields for attendee data collection';
COMMENT ON TABLE "attendees" IS 'Event attendees with custom field support';
COMMENT ON TABLE "attendee_custom_field_values" IS 'Values for custom fields per attendee';
COMMENT ON TABLE "logs" IS 'System activity and audit logging';
COMMENT ON TABLE "log_settings" IS 'Configuration for activity logging features';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'CredentialStudio database setup completed successfully!';
    RAISE NOTICE 'Created tables: users, invitations, roles, event_settings, custom_fields, attendees, attendee_custom_field_values, logs, log_settings';
    RAISE NOTICE 'Inserted default roles: Super Administrator, Event Manager, Registration Staff, Viewer';
    RAISE NOTICE 'Inserted default event settings and log configuration';
    RAISE NOTICE 'Database is ready for use!';
END $$;