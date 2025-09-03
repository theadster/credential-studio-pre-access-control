-- CredentialStudio Database Setup SQL
-- This file creates all necessary tables, constraints, and initial data for the CredentialStudio application
-- Run this file on a fresh PostgreSQL database to set up the complete schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Users table
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "roleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Create Roles table
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- Create EventSettings table
CREATE TABLE "EventSettings" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL DEFAULT 'My Event',
    "eventDate" TIMESTAMP(3),
    "eventTime" TEXT,
    "eventLocation" TEXT,
    "eventTimezone" TEXT DEFAULT 'America/New_York',
    "bannerImageUrl" TEXT,
    "signInBannerUrl" TEXT,
    "barcodeType" TEXT NOT NULL DEFAULT 'numerical',
    "barcodeLength" INTEGER NOT NULL DEFAULT 8,
    "cloudinaryCloudName" TEXT,
    "cloudinaryApiKey" TEXT,
    "cloudinaryApiSecret" TEXT,
    "cloudinaryUploadPreset" TEXT,
    "cloudinaryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cloudinaryCroppingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cloudinaryCroppingAspectRatio" DOUBLE PRECISION,
    "cloudinaryDisableSkipCrop" BOOLEAN NOT NULL DEFAULT false,
    "switchboardEnabled" BOOLEAN NOT NULL DEFAULT false,
    "switchboardApiEndpoint" TEXT,
    "switchboardAuthType" TEXT,
    "switchboardAuthValue" TEXT,
    "switchboardRequestBody" TEXT,
    "switchboardFieldMappings" JSONB DEFAULT '{}',
    "oneSimpleApiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "oneSimpleApiUrl" TEXT,
    "oneSimpleApiFormDataKey" TEXT,
    "oneSimpleApiFormDataValue" TEXT,
    "oneSimpleApiRecordTemplate" TEXT,
    "forceUppercaseNames" BOOLEAN NOT NULL DEFAULT false,
    "defaultSorting" TEXT NOT NULL DEFAULT 'lastName',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSettings_pkey" PRIMARY KEY ("id")
);

-- Create CustomField table
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "internalName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT[],
    "forceUppercase" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- Create Attendee table
CREATE TABLE "Attendee" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "barcode" TEXT NOT NULL,
    "photoUrl" TEXT,
    "credentialUrl" TEXT,
    "credentialGeneratedAt" TIMESTAMP(3),
    "customFieldValues" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendee_pkey" PRIMARY KEY ("id")
);

-- Create AttendeeCustomFieldValue table
CREATE TABLE "AttendeeCustomFieldValue" (
    "id" TEXT NOT NULL,
    "attendeeId" TEXT NOT NULL,
    "customFieldId" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendeeCustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- Create ActivityLog table
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- Create LogSettings table
CREATE TABLE "LogSettings" (
    "id" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogSettings_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");
CREATE UNIQUE INDEX "Attendee_barcode_key" ON "Attendee"("barcode");
CREATE UNIQUE INDEX "AttendeeCustomFieldValue_attendeeId_customFieldId_key" ON "AttendeeCustomFieldValue"("attendeeId", "customFieldId");

-- Add foreign key constraints
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AttendeeCustomFieldValue" ADD CONSTRAINT "AttendeeCustomFieldValue_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "Attendee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendeeCustomFieldValue" ADD CONSTRAINT "AttendeeCustomFieldValue_customFieldId_fkey" FOREIGN KEY ("customFieldId") REFERENCES "CustomField"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default roles with comprehensive permissions
INSERT INTO "Role" ("id", "name", "permissions", "createdAt", "updatedAt") VALUES
(
    'super-admin-role-id',
    'Super Administrator',
    '{
        "attendees": {
            "view": true,
            "create": true,
            "edit": true,
            "delete": true,
            "import": true,
            "export": true,
            "print": true,
            "bulk_edit": true,
            "bulk_delete": true
        },
        "users": {
            "view": true,
            "create": true,
            "edit": true,
            "delete": true,
            "invite": true
        },
        "roles": {
            "view": true,
            "edit": true
        },
        "event_settings": {
            "view": true,
            "edit": true
        },
        "activity_logs": {
            "view": true,
            "export": true,
            "delete": true,
            "configure": true
        }
    }',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'admin-role-id',
    'Administrator',
    '{
        "attendees": {
            "view": true,
            "create": true,
            "edit": true,
            "delete": true,
            "import": true,
            "export": true,
            "print": true,
            "bulk_edit": true,
            "bulk_delete": true
        },
        "users": {
            "view": true,
            "create": true,
            "edit": true,
            "delete": false,
            "invite": true
        },
        "roles": {
            "view": true,
            "edit": false
        },
        "event_settings": {
            "view": true,
            "edit": true
        },
        "activity_logs": {
            "view": true,
            "export": true,
            "delete": false,
            "configure": false
        }
    }',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'manager-role-id',
    'Manager',
    '{
        "attendees": {
            "view": true,
            "create": true,
            "edit": true,
            "delete": true,
            "import": true,
            "export": true,
            "print": true,
            "bulk_edit": true,
            "bulk_delete": false
        },
        "users": {
            "view": true,
            "create": false,
            "edit": false,
            "delete": false,
            "invite": false
        },
        "roles": {
            "view": false,
            "edit": false
        },
        "event_settings": {
            "view": true,
            "edit": false
        },
        "activity_logs": {
            "view": true,
            "export": false,
            "delete": false,
            "configure": false
        }
    }',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'editor-role-id',
    'Editor',
    '{
        "attendees": {
            "view": true,
            "create": true,
            "edit": true,
            "delete": false,
            "import": true,
            "export": true,
            "print": true,
            "bulk_edit": false,
            "bulk_delete": false
        },
        "users": {
            "view": false,
            "create": false,
            "edit": false,
            "delete": false,
            "invite": false
        },
        "roles": {
            "view": false,
            "edit": false
        },
        "event_settings": {
            "view": false,
            "edit": false
        },
        "activity_logs": {
            "view": false,
            "export": false,
            "delete": false,
            "configure": false
        }
    }',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'viewer-role-id',
    'Viewer',
    '{
        "attendees": {
            "view": true,
            "create": false,
            "edit": false,
            "delete": false,
            "import": false,
            "export": true,
            "print": false,
            "bulk_edit": false,
            "bulk_delete": false
        },
        "users": {
            "view": false,
            "create": false,
            "edit": false,
            "delete": false,
            "invite": false
        },
        "roles": {
            "view": false,
            "edit": false
        },
        "event_settings": {
            "view": false,
            "edit": false
        },
        "activity_logs": {
            "view": false,
            "export": false,
            "delete": false,
            "configure": false
        }
    }',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Insert default event settings
INSERT INTO "EventSettings" ("id", "eventName", "eventDate", "eventTime", "eventLocation", "eventTimezone", "barcodeType", "barcodeLength", "cloudinaryEnabled", "cloudinaryCroppingEnabled", "cloudinaryDisableSkipCrop", "switchboardEnabled", "oneSimpleApiEnabled", "forceUppercaseNames", "defaultSorting", "createdAt", "updatedAt") VALUES
(
    'default-event-settings',
    'My Event',
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    '09:00',
    'Event Location',
    'America/New_York',
    'numerical',
    8,
    false,
    true,
    false,
    false,
    false,
    false,
    'lastName',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Insert default log settings with all logging enabled
INSERT INTO "LogSettings" ("id", "settings", "createdAt", "updatedAt") VALUES
(
    'default-log-settings',
    '{
        "user_login": true,
        "user_logout": true,
        "user_create": true,
        "user_update": true,
        "user_delete": true,
        "user_invite": true,
        "attendee_create": true,
        "attendee_update": true,
        "attendee_delete": true,
        "attendee_import": true,
        "attendee_export": true,
        "attendee_bulk_edit": true,
        "attendee_bulk_delete": true,
        "attendee_print": true,
        "attendee_generate_credential": true,
        "attendee_clear_credential": true,
        "role_update": true,
        "event_settings_update": true,
        "custom_field_create": true,
        "custom_field_update": true,
        "custom_field_delete": true,
        "custom_field_reorder": true,
        "log_settings_update": true,
        "log_delete": true,
        "system_view_dashboard": false,
        "system_view_attendees": false,
        "system_view_users": false,
        "system_view_roles": false,
        "system_view_event_settings": false,
        "system_view_activity_logs": false
    }',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Insert sample custom fields (optional - remove if not needed)
INSERT INTO "CustomField" ("id", "name", "internalName", "type", "required", "options", "forceUppercase", "order", "createdAt", "updatedAt") VALUES
(
    'sample-text-field',
    'Company',
    'company',
    'text',
    false,
    '{}',
    false,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'sample-select-field',
    'Registration Type',
    'registration_type',
    'select',
    false,
    '{"Standard", "VIP", "Speaker"}',
    false,
    2,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'sample-boolean-field',
    'Dietary Restrictions',
    'dietary_restrictions',
    'boolean',
    false,
    '{}',
    false,
    3,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX "User_roleId_idx" ON "User"("roleId");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX "Attendee_firstName_idx" ON "Attendee"("firstName");
CREATE INDEX "Attendee_lastName_idx" ON "Attendee"("lastName");
CREATE INDEX "Attendee_email_idx" ON "Attendee"("email");
CREATE INDEX "Attendee_createdAt_idx" ON "Attendee"("createdAt");
CREATE INDEX "Attendee_updatedAt_idx" ON "Attendee"("updatedAt");
CREATE INDEX "AttendeeCustomFieldValue_attendeeId_idx" ON "AttendeeCustomFieldValue"("attendeeId");
CREATE INDEX "AttendeeCustomFieldValue_customFieldId_idx" ON "AttendeeCustomFieldValue"("customFieldId");
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
CREATE INDEX "CustomField_order_idx" ON "CustomField"("order");

-- Add comments to tables for documentation
COMMENT ON TABLE "User" IS 'Application users with role-based access control';
COMMENT ON TABLE "Role" IS 'User roles with JSON-based permissions';
COMMENT ON TABLE "EventSettings" IS 'Global event configuration and integration settings';
COMMENT ON TABLE "CustomField" IS 'Dynamic custom fields for attendee data collection';
COMMENT ON TABLE "Attendee" IS 'Event attendees with custom field support';
COMMENT ON TABLE "AttendeeCustomFieldValue" IS 'Values for custom fields per attendee';
COMMENT ON TABLE "ActivityLog" IS 'System activity and audit logging';
COMMENT ON TABLE "LogSettings" IS 'Configuration for activity logging features';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'CredentialStudio database setup completed successfully!';
    RAISE NOTICE 'Created tables: User, Role, EventSettings, CustomField, Attendee, AttendeeCustomFieldValue, ActivityLog, LogSettings';
    RAISE NOTICE 'Inserted default roles: Super Administrator, Administrator, Manager, Editor, Viewer';
    RAISE NOTICE 'Inserted default event settings and log configuration';
    RAISE NOTICE 'Database is ready for use!';
END $$;