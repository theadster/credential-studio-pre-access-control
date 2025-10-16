import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Settings,
  Shield,
  Activity,
  IdCard,
  LogOut,
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Wand2,
  Calendar,
  MapPin,
  Clock,
  BarChart3,
  Printer,
  AlertTriangle,
  Mail,
  MoreHorizontal,
  FileImage,
  Image,
  QrCode,
  User,
  Type,
  Link,
  Hash,
  ToggleLeft,
  ChevronDown,
  FileText,
  FileUp,
  UsersRound,
  CheckCircle,
  Circle,
  X
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useSweetAlert } from "@/hooks/useSweetAlert";
import { showProgressModal, closeProgressModal } from "@/lib/sweetalert-progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import AttendeeForm from "@/components/AttendeeForm";
import UserForm from "@/components/UserForm";
import EventSettingsForm from "@/components/EventSettingsForm";
import RoleForm from "@/components/RoleForm";
import RoleCard from "@/components/RoleCard";
import LinkUserDialog from "@/components/LinkUserDialog";
import DeleteUserDialog from "@/components/DeleteUserDialog";
import ExportDialog from "@/components/ExportDialog";
import ImportDialog from "@/components/ImportDialog";
import LogsExportDialog from "@/components/LogsExportDialog";
import LogsDeleteDialog from "@/components/LogsDeleteDialog";
import LogSettingsDialog from "@/components/LogSettingsDialog";
import { hasPermission, canAccessTab, canManageUser } from "@/lib/permissions";

interface User {
  id: string;
  userId?: string; // Appwrite user ID (used for filtering logs)
  email: string;
  name: string | null;
  role: {
    id: string;
    name: string;
    permissions: Record<string, boolean>;
  } | null;
  isInvited?: boolean;
  createdAt: string;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, boolean>;
  createdAt: string;
}

interface CustomFieldValue {
  customFieldId: string;
  value: string;
}

interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  barcodeNumber: string;
  notes?: string;
  photoUrl: string | null;
  credentialUrl?: string | null;
  credentialGeneratedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  customFieldValues: CustomFieldValue[];
  [key: string]: unknown;
}

interface EventSettings {
  id: string;
  eventName: string;
  eventDate: string;
  eventTime?: string;
  eventLocation: string;
  timeZone: string;
  barcodeType: string;
  barcodeLength: number;
  barcodeUnique: boolean;
  attendeeSortField?: string;
  attendeeSortDirection?: string;
  customFieldColumns?: number;
  bannerImageUrl: string | null;
  oneSimpleApiEnabled?: boolean;
  oneSimpleApiUrl?: string;
  switchboardEnabled?: boolean;
  switchboardApiEndpoint?: string;
  // DEPRECATED: API key no longer stored in database
  // switchboardApiKey?: string;
  cloudinaryEnabled?: boolean;
  cloudinaryCloudName?: string;
  // DEPRECATED: Credentials no longer stored in database
  // cloudinaryApiKey?: string;
  cloudinaryUploadPreset?: string;
  customFields: {
    id: string;
    fieldName: string;
    internalFieldName?: string;
    fieldType: string;
    fieldOptions?: { options: string[] };
    required: boolean;
    order: number;
  }[];
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

interface Log {
  id: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
  };
  attendee: {
    firstName: string;
    lastName: string;
  } | null;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { toast, success, error, warning, info, confirm, alert, loading: showLoading, close } = useSweetAlert();

  // Helper function to format action names for display
  const formatActionName = (action: string): string => {
    // Handle special cases
    const specialCases: Record<string, string> = {
      'delete_logs': 'Delete Logs',
      'bulk_update': 'Bulk Update',
      'bulk_delete': 'Bulk Delete',
      'login': 'Log In',
      'auth_login': 'Log In',
      'logout': 'Log Out',
      'auth_logout': 'Log Out',
      'generate_credential': 'Generate Credential',
      'clear_credential': 'Clear Credential',
      'bulk_export': 'Bulk Export',
      'bulk_import': 'Bulk Import',
    };

    if (specialCases[action]) {
      return specialCases[action];
    }

    // Default: split by underscore and capitalize each word
    return action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const [activeTab, setActiveTab] = useState("attendees");
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [eventSettings, setEventSettings] = useState<EventSettings | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPagination, setLogsPagination] = useState({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [logsFilters, setLogsFilters] = useState({
    action: 'all',
    userId: 'all'
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [photoFilter, setPhotoFilter] = useState<'all' | 'with' | 'without'>('all');
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 25;

  // Advanced Search State
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedSearchFilters, setAdvancedSearchFilters] = useState<{
    firstName: { value: string; operator: string };
    lastName: { value: string; operator: string };
    barcode: { value: string; operator: string };
    notes: { value: string; operator: string; hasNotes: boolean };
    photoFilter: 'all' | 'with' | 'without';
    customFields: { [key: string]: { value: string; operator: string } };
  }>({
    firstName: { value: '', operator: 'contains' },
    lastName: { value: '', operator: 'contains' },
    barcode: { value: '', operator: 'contains' },
    notes: { value: '', operator: 'contains', hasNotes: false },
    photoFilter: 'all',
    customFields: {}
  });

  const [showAttendeeForm, setShowAttendeeForm] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null);
  const [printingAttendee, setPrintingAttendee] = useState<string | null>(null);
  const [generatingCredential, setGeneratingCredential] = useState<string | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLinkUserDialog, setShowLinkUserDialog] = useState(false);
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [initializingRoles, setInitializingRoles] = useState(false);
  const [showEventSettingsForm, setShowEventSettingsForm] = useState(false);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkEditChanges, setBulkEditChanges] = useState<{ [key: string]: any }>({});
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [dropdownStates, setDropdownStates] = useState<{ [key: string]: boolean }>({});
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [exportingPdfs, setExportingPdfs] = useState(false);
  const [bulkGeneratingCredentials, setBulkGeneratingCredentials] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const refreshAttendees = useCallback(async () => {
    try {
      const attendeesResponse = await fetch('/api/attendees');
      if (attendeesResponse.ok) {
        const attendeesData = await attendeesResponse.json();
        setAttendees(Array.isArray(attendeesData) ? attendeesData : []);
      } else {
        setAttendees([]);
      }
    } catch (error) {
      console.error('Error refreshing attendees:', error);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    try {
      const usersResponse = await fetch('/api/users');
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        // API returns { users: [...], pagination: {...} }
        setUsers(usersData.users || []);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error refreshing users:', error);
    }
  }, []);

  const refreshRoles = useCallback(async () => {
    try {
      const rolesResponse = await fetch('/api/roles');
      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json();
        setRoles(Array.isArray(rolesData) ? rolesData : []);
      } else {
        setRoles([]);
      }
    } catch (error) {
      console.error('Error refreshing roles:', error);
    }
  }, []);

  const refreshEventSettings = useCallback(async () => {
    try {
      const settingsResponse = await fetch('/api/event-settings');
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setEventSettings(settingsData);
      }
    } catch (error) {
      console.error('Error refreshing event settings:', error);
    }
  }, []);

  /**
   * PERFORMANCE OPTIMIZATION: Grid Column Calculation
   * 
   * Memoized helper function to determine grid columns based on field count
   * and the configured maximum columns from event settings.
   * Uses useCallback to prevent unnecessary re-creation on every render.
   * 
   * The Name column is now wider (w-auto) allowing custom fields to utilize more horizontal space.
   * The Barcode, Credential, Status, and Actions columns are compact and grouped on the right.
   * 
   * Grid Layout Strategy:
   * - 1 field: Single column (grid-cols-1)
   * - 2-3 fields: 2 columns on tablet, 3 columns on desktop
   * - 4-6 fields: 3 columns on tablet, 5 columns on desktop
   * - 7-9 fields: 4 columns on tablet, 6 columns on desktop (or configured max)
   * - 10+ fields: 4 columns on tablet, configurable max on desktop (default 7)
   * 
   * The maximum columns for large screens can be configured in Event Settings to accommodate
   * different screen resolutions and user preferences (range: 3-10 columns).
   * 
   * Responsive breakpoints ensure mobile-first design with progressive enhancement.
   * 
   * @param fieldCount - Number of visible custom fields
   * @returns Tailwind CSS grid column classes
   */
  const getGridColumns = useCallback((fieldCount: number): string => {
    // Get configured max columns from event settings (default to 7 for backward compatibility)
    const maxColumns = eventSettings?.customFieldColumns || 7;

    // Mapping for lg:grid-cols-* classes (Tailwind JIT-safe)
    const lgGridColsMap: Record<number, string> = {
      3: 'lg:grid-cols-3',
      4: 'lg:grid-cols-4',
      5: 'lg:grid-cols-5',
      6: 'lg:grid-cols-6',
      7: 'lg:grid-cols-7',
      8: 'lg:grid-cols-8',
      9: 'lg:grid-cols-9',
      10: 'lg:grid-cols-10',
    };

    if (fieldCount === 1) return 'grid-cols-1';
    if (fieldCount >= 2 && fieldCount <= 3) return 'md:grid-cols-2 lg:grid-cols-3';
    if (fieldCount >= 4 && fieldCount <= 6) return 'md:grid-cols-3 lg:grid-cols-5';
    if (fieldCount >= 7 && fieldCount <= 9) {
      const cols = Math.min(6, maxColumns);
      const clampedCols = Math.max(3, Math.min(10, cols));
      return `md:grid-cols-4 ${lgGridColsMap[clampedCols] || 'lg:grid-cols-6'}`;
    }
    // 10 or more fields
    const clampedMaxCols = Math.max(3, Math.min(10, maxColumns));
    return `md:grid-cols-4 ${lgGridColsMap[clampedMaxCols] || 'lg:grid-cols-7'}`;
  }, [eventSettings?.customFieldColumns]);

  /**
   * PERFORMANCE OPTIMIZATION: Custom Fields Value Extraction
   * 
   * Extracts custom field values for an attendee outside the map function.
   * This prevents recreating the function on every render and improves performance
   * when rendering large lists of attendees.
   * 
   * Processing Logic:
   * 1. Filter to only visible fields (showOnMainPage !== false)
   * 2. Sort by field order for consistent display
   * 3. Map to display format with value lookup
   * 4. Format values based on field type (boolean, url, text)
   * 5. Filter out empty values (except boolean fields which always show)
   * 
   * @param attendee - The attendee object
   * @param customFields - Array of custom field definitions from event settings
   * @returns Array of custom fields with values ready for display
   */
  const getCustomFieldsWithValues = useCallback((attendee: Attendee, customFields: any[]) => {
    if (!customFields) return [];

    return customFields
      .filter((field: any) => field.showOnMainPage !== false) // Only show visible fields
      .sort((a: any, b: any) => a.order - b.order)
      .map((field: any) => {
        const value = Array.isArray(attendee.customFieldValues)
          ? attendee.customFieldValues.find((cfv: any) => cfv.customFieldId === field.id)
          : null;
        let displayValue = value?.value || null;

        // Format display value based on field type
        if (field.fieldType === 'boolean') {
          // For boolean fields, always show Yes/No, defaulting to No if no value is set
          displayValue = (displayValue === 'yes') ? 'Yes' : 'No';
        } else if (displayValue && field.fieldType === 'url') {
          // For URLs, show a clickable link
          displayValue = displayValue;
        }

        return {
          fieldName: field.fieldName,
          fieldType: field.fieldType,
          value: displayValue
        };
      })
      .filter((field: any) => {
        // Show boolean fields always (they will show Yes/No)
        // Show other fields only if they have a value
        return field.fieldType === 'boolean' || field.value;
      });
  }, []);

  const loadLogs = useCallback(async (page = 1, filters = logsFilters, retryCount = 0) => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: logsPagination.limit.toString(),
        action: filters.action,
        userId: filters.userId
      });

      const response = await fetch(`/api/logs?${params}`);

      // Handle rate limiting with exponential backoff
      if (response.status === 429 && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${retryCount + 1}/3)...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return loadLogs(page, filters, retryCount + 1);
      }

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setLogsPagination(data.pagination || {
          page: 1,
          limit: 50,
          totalCount: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        });
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, [logsPagination.limit, logsFilters]);

  // Get available tabs for current user
  const getAvailableTabs = (): string[] => {
    const tabs: string[] = [];
    if (canAccessTab(currentUser?.role, 'attendees')) tabs.push('attendees');
    if (canAccessTab(currentUser?.role, 'users')) tabs.push('users');
    if (canAccessTab(currentUser?.role, 'roles')) tabs.push('roles');
    if (canAccessTab(currentUser?.role, 'settings')) tabs.push('settings');
    if (canAccessTab(currentUser?.role, 'logs')) tabs.push('logs');
    return tabs;
  };

  // Dark mode detection
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Redirect to first available tab if current tab is not accessible
  useEffect(() => {
    if (currentUser?.role) {
      const availableTabs = getAvailableTabs();
      if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
        setActiveTab(availableTabs[0]);
      }
    }
  }, [currentUser?.role, activeTab]);

  // Get current user's role information
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const currentUserData = await response.json();
          console.log('Current user data:', currentUserData);
          console.log('Role:', currentUserData.role);
          console.log('Permissions:', currentUserData.role?.permissions);
          setCurrentUser(currentUserData);
        } else {
          console.error('Failed to fetch user profile:', response.status);
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Error loading current user:', error);
        setCurrentUser(null);
      }
    };

    if (user?.$id) {
      getCurrentUser();
    }
  }, [user?.$id]);

  // Load real data from APIs
  useEffect(() => {
    const loadData = async () => {
      // Show loading notification
      showLoading({
        title: "Loading Dashboard",
        text: "Please wait while we load your data..."
      });

      try {
        // Load users
        const usersResponse = await fetch('/api/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          // API returns { users: [...], pagination: {...} }
          setUsers(usersData.users || []);
        } else {
          setUsers([]);
        }

        // Load roles
        const rolesResponse = await fetch('/api/roles');
        if (rolesResponse.ok) {
          const rolesData = await rolesResponse.json();
          setRoles(Array.isArray(rolesData) ? rolesData : []);
        } else {
          setRoles([]);
        }

        // Load attendees
        const attendeesResponse = await fetch('/api/attendees');
        if (attendeesResponse.ok) {
          const attendeesData = await attendeesResponse.json();
          setAttendees(Array.isArray(attendeesData) ? attendeesData : []);
        } else {
          setAttendees([]);
        }

        // Load event settings
        const settingsResponse = await fetch('/api/event-settings');
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          setEventSettings(settingsData);
        } else {
          setEventSettings(null);
        }

        // Load logs with pagination
        await loadLogs();

        // Close loading and show success
        close();
        success("Dashboard Loaded", "All data loaded successfully!");
      } catch (err) {
        console.error('Error loading data:', err);
        // Close loading and show error
        close();
        error("Loading Failed", "Failed to load dashboard data. Using fallback data.");
        // Fall back to mock data if API fails
        loadMockData();
      } finally {
        setLoading(false);
      }
    };

    const loadMockData = () => {
      // Mock users
      setUsers([
        {
          id: "1",
          email: "admin@event.com",
          name: "Admin User",
          role: {
            id: "1",
            name: "Administrator",
            permissions: { all: true }
          },
          createdAt: new Date().toISOString()
        },
        {
          id: "2",
          email: "manager@event.com",
          name: "Event Manager",
          role: {
            id: "2",
            name: "Manager",
            permissions: { attendees: true, settings: false }
          },
          createdAt: new Date().toISOString()
        }
      ]);

      // Mock roles
      setRoles([
        {
          id: "1",
          name: "Administrator",
          description: "Full system access",
          permissions: { all: true },
          createdAt: new Date().toISOString()
        },
        {
          id: "2",
          name: "Manager",
          description: "Attendee management only",
          permissions: { attendees: true, settings: false },
          createdAt: new Date().toISOString()
        },
        {
          id: "3",
          name: "Viewer",
          description: "Read-only access",
          permissions: { view: true },
          createdAt: new Date().toISOString()
        }
      ]);

      // Mock attendees
      setAttendees([
        {
          id: "1",
          firstName: "John",
          lastName: "Doe",
          barcodeNumber: "EVT001234",
          photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          customFieldValues: []
        },
        {
          id: "2",
          firstName: "Jane",
          lastName: "Smith",
          barcodeNumber: "EVT001235",
          photoUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          customFieldValues: []
        }
      ]);

      // Mock event settings
      setEventSettings({
        id: "1",
        eventName: "Tech Conference 2024",
        eventDate: "2024-08-15",
        eventLocation: "San Francisco Convention Center",
        timeZone: "America/Los_Angeles",
        barcodeType: "alphanumerical",
        barcodeLength: 8,
        barcodeUnique: true,
        bannerImageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
        customFields: [
          {
            id: "1",
            fieldName: "Company",
            fieldType: "text",
            required: true,
            order: 1
          },
          {
            id: "2",
            fieldName: "Job Title",
            fieldType: "text",
            required: false,
            order: 2
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Mock logs
      setLogs([
        {
          id: "1",
          action: "create",
          details: { type: "attendee" },
          createdAt: new Date().toISOString(),
          user: { name: "Admin User", email: "admin@event.com" },
          attendee: { firstName: "John", lastName: "Doe" }
        },
        {
          id: "2",
          action: "update",
          details: { type: "settings" },
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          user: { name: "Admin User", email: "admin@event.com" },
          attendee: null
        }
      ]);

      setLoading(false);
    };

    loadData();
  }, []);

  // Real-time subscriptions with debouncing to prevent excessive API calls
  useEffect(() => {
    const refreshTimeouts: { [key: string]: NodeJS.Timeout } = {};

    const debouncedRefresh = (key: string, refreshFunction: () => void, delay: number = 1000) => {
      if (refreshTimeouts[key]) {
        clearTimeout(refreshTimeouts[key]);
      }
      refreshTimeouts[key] = setTimeout(() => {
        refreshFunction();
        delete refreshTimeouts[key];
      }, delay);
    };

    return () => {
      // Clear any pending timeouts
      Object.values(refreshTimeouts).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  // Appwrite real-time subscriptions for attendees
  // PERFORMANCE OPTIMIZATION: Reduced delay for faster updates
  useRealtimeSubscription({
    channels: [`databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.collections.${process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID}.documents`],
    callback: useCallback((response: any) => {
      console.log('Attendee change received!', response);
      setTimeout(() => refreshAttendees(), 500);
    }, [refreshAttendees])
  });

  // Appwrite real-time subscriptions for users
  // PERFORMANCE OPTIMIZATION: Reduced delay for faster updates
  useRealtimeSubscription({
    channels: [`databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.collections.${process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID}.documents`],
    callback: useCallback((response: any) => {
      console.log('Users change received!', response);
      setTimeout(() => refreshUsers(), 500);
    }, [refreshUsers])
  });

  // Appwrite real-time subscriptions for roles
  // PERFORMANCE OPTIMIZATION: Reduced delay for faster updates
  useRealtimeSubscription({
    channels: [`databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.collections.${process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID}.documents`],
    callback: useCallback((response: any) => {
      console.log('Roles change received!', response);
      setTimeout(() => refreshRoles(), 500);
    }, [refreshRoles])
  });

  // Appwrite real-time subscriptions for event settings and custom fields
  // PERFORMANCE OPTIMIZATION: Reduced delay for faster updates
  useRealtimeSubscription({
    channels: [
      `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.collections.${process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID}.documents`,
      `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.collections.${process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID}.documents`
    ],
    callback: useCallback((response: any) => {
      console.log('Event settings or custom fields change received!', response);
      setTimeout(() => refreshEventSettings(), 500);
    }, [refreshEventSettings])
  });

  // State to pause logs real-time updates during bulk deletion
  const [pauseLogsRealtime, setPauseLogsRealtime] = useState(false);

  // Appwrite real-time subscriptions for logs (with pause capability during bulk operations)
  // PERFORMANCE OPTIMIZATION: Reduced delay for faster updates
  useRealtimeSubscription({
    channels: [`databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.collections.${process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID}.documents`],
    callback: useCallback((response: any) => {
      // Skip refresh if paused (during bulk deletion)
      if (pauseLogsRealtime) {
        console.log('Logs change received but refresh paused during bulk operation');
        return;
      }
      console.log('Logs change received!', response);
      setTimeout(() => loadLogs(), 1000);
    }, [loadLogs, pauseLogsRealtime])
  });

  /**
   * CUSTOM FIELD VISIBILITY FILTERING
   * 
   * Filters custom fields to only include those marked as visible on the main page.
   * This creates a cleaner, more focused attendees table by hiding less frequently used fields.
   * 
   * Visibility Logic:
   * - showOnMainPage === true → Field is visible (explicit)
   * - showOnMainPage === undefined/null → Field is visible (backward compatibility)
   * - showOnMainPage === false → Field is hidden (explicit)
   * 
   * Performance:
   * - Uses useMemo to prevent unnecessary recalculations
   * - Only recalculates when eventSettings.customFields changes
   * - Efficient for large numbers of custom fields
   * 
   * Impact:
   * - Visible fields appear as columns in the attendees table
   * - Hidden fields are excluded from the table but remain in edit/create forms
   * - Reduces visual clutter and improves table readability
   * - All fields are still included in exports regardless of visibility
   * 
   * @returns Array of custom fields where showOnMainPage !== false
   */
  const visibleCustomFields = useMemo(() =>
    eventSettings?.customFields?.filter(
      (field: any) => field.showOnMainPage !== false // Only exclude if explicitly false
    ) || [],
    [eventSettings?.customFields]
  );

  // Enhanced filtering function for attendees including custom fields and photo filter
  const filteredAttendees = attendees
    .filter(attendee => {
      const applyTextFilter = (value: string, filter: { value: string; operator: string }) => {
        const { value: filterValue, operator } = filter;
        const lowerCaseValue = (value || '').toLowerCase();
        const lowerCaseFilterValue = (filterValue || '').toLowerCase();

        if (operator !== 'isEmpty' && operator !== 'isNotEmpty' && !filterValue) {
          return true; // No filter value provided for operators that need it
        }

        switch (operator) {
          case 'isEmpty':
            return !value;
          case 'isNotEmpty':
            return !!value;
          case 'contains':
            return lowerCaseValue.includes(lowerCaseFilterValue);
          case 'equals':
            return lowerCaseValue === lowerCaseFilterValue;
          case 'startsWith':
            return lowerCaseValue.startsWith(lowerCaseFilterValue);
          case 'endsWith':
            return lowerCaseValue.endsWith(lowerCaseFilterValue);
          default:
            return true;
        }
      };

      // If advanced search is active, use advanced filters
      if (showAdvancedSearch) {
        const firstNameMatch = applyTextFilter(attendee.firstName, advancedSearchFilters.firstName);
        const lastNameMatch = applyTextFilter(attendee.lastName, advancedSearchFilters.lastName);
        const barcodeMatch = applyTextFilter(attendee.barcodeNumber, advancedSearchFilters.barcode);

        // Notes filter
        const notesMatch = applyTextFilter(attendee.notes || '', advancedSearchFilters.notes);
        const hasNotesMatch = !advancedSearchFilters.notes.hasNotes ||
          (attendee.notes && attendee.notes.trim().length > 0);
        const notesFilterMatch = notesMatch && hasNotesMatch;

        // Photo filter
        const photoMatch = advancedSearchFilters.photoFilter === 'all' ||
          (advancedSearchFilters.photoFilter === 'with' && attendee.photoUrl) ||
          (advancedSearchFilters.photoFilter === 'without' && !attendee.photoUrl);

        // Custom fields filter
        const customFieldsMatch = Object.entries(advancedSearchFilters.customFields).every(([fieldId, filter]) => {
          const attendeeValueObj = Array.isArray(attendee.customFieldValues)
            ? attendee.customFieldValues.find((cfv: any) => cfv.customFieldId === fieldId)
            : null;
          const attendeeValue = attendeeValueObj?.value || '';
          const hasValue = !!attendeeValue;

          // If no operator or value (for operators that need it), match all
          if (!filter.operator || (filter.operator !== 'isEmpty' && filter.operator !== 'isNotEmpty' && !filter.value)) {
            return true;
          }

          switch (filter.operator) {
            case 'isEmpty':
              return !hasValue;
            case 'isNotEmpty':
              return hasValue;
            case 'contains':
              return hasValue && attendeeValue.toLowerCase().includes(filter.value.toLowerCase());
            case 'equals':
              return hasValue && attendeeValue.toLowerCase() === filter.value.toLowerCase();
            case 'startsWith':
              return hasValue && attendeeValue.toLowerCase().startsWith(filter.value.toLowerCase());
            case 'endsWith':
              return hasValue && attendeeValue.toLowerCase().endsWith(filter.value.toLowerCase());
            default:
              // For select and boolean, it's an equals check
              return hasValue && attendeeValue.toLowerCase() === filter.value.toLowerCase();
          }
        });

        return firstNameMatch && lastNameMatch && barcodeMatch && notesFilterMatch && photoMatch && customFieldsMatch;
      } else {
        // Use simple search
        const basicMatch = `${attendee.firstName} ${attendee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          attendee.barcodeNumber.toLowerCase().includes(searchTerm.toLowerCase());

        // Search in custom field values
        const customFieldMatch = Array.isArray(attendee.customFieldValues)
          ? attendee.customFieldValues.some((cfv: any) =>
            cfv.value && cfv.value.toLowerCase().includes(searchTerm.toLowerCase())
          )
          : false;

        // Photo filter
        const photoMatch = photoFilter === 'all' ||
          (photoFilter === 'with' && attendee.photoUrl) ||
          (photoFilter === 'without' && !attendee.photoUrl);

        return (basicMatch || customFieldMatch) && photoMatch;
      }
    })
    .sort((a, b) => {
      const field = eventSettings?.attendeeSortField || 'lastName';
      const direction = eventSettings?.attendeeSortDirection === 'desc' ? -1 : 1;

      let valA = (a as any)[field];
      let valB = (b as any)[field];

      if (field === 'createdAt') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB) * direction;
      }

      if (valA < valB) return -1 * direction;
      if (valA > valB) return 1 * direction;

      // Secondary sort by last name, then first name
      const lastNameComparison = a.lastName.localeCompare(b.lastName);
      if (lastNameComparison !== 0) {
        return lastNameComparison;
      }
      return a.firstName.localeCompare(b.firstName);
    });

  // Pagination logic for attendees
  const totalAttendees = filteredAttendees.length;
  const totalPages = Math.ceil(totalAttendees / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedAttendees = filteredAttendees.slice(startIndex, endIndex);

  // Reset to first page when search term or photo filter changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedAttendees([]);
  }, [searchTerm, photoFilter, showAdvancedSearch, advancedSearchFilters]);

  // Initialize custom fields in advanced search when event settings change
  useEffect(() => {
    if (eventSettings?.customFields && showAdvancedSearch) {
      const newCustomFields: { [key: string]: { value: string; operator: string } } = {};
      eventSettings.customFields.forEach((field: any) => {
        if (!advancedSearchFilters.customFields[field.id]) {
          newCustomFields[field.id] = { value: '', operator: 'contains' };
        }
      });

      if (Object.keys(newCustomFields).length > 0) {
        setAdvancedSearchFilters(prev => ({
          ...prev,
          customFields: { ...prev.customFields, ...newCustomFields }
        }));
      }
    }
  }, [eventSettings?.customFields, showAdvancedSearch]);

  // Advanced search functions
  const handleAdvancedSearchToggle = () => {
    setShowAdvancedSearch(!showAdvancedSearch);
    if (!showAdvancedSearch) {
      // Initialize custom fields when opening advanced search
      const customFields: { [key: string]: { value: string; operator: string } } = {};
      eventSettings?.customFields?.forEach((field: any) => {
        customFields[field.id] = { value: '', operator: 'contains' };
      });
      setAdvancedSearchFilters({
        firstName: { value: '', operator: 'contains' },
        lastName: { value: '', operator: 'contains' },
        barcode: { value: '', operator: 'contains' },
        notes: { value: '', operator: 'contains', hasNotes: false },
        photoFilter: 'all',
        customFields
      });
    }
  };

  // Check if advanced search has any active filters
  const hasAdvancedFilters = () => {
    return advancedSearchFilters.firstName.value || ['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.firstName.operator) ||
      advancedSearchFilters.lastName.value || ['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.lastName.operator) ||
      advancedSearchFilters.barcode.value || ['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.barcode.operator) ||
      advancedSearchFilters.notes.value || ['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.notes.operator) ||
      advancedSearchFilters.notes.hasNotes ||
      advancedSearchFilters.photoFilter !== 'all' ||
      Object.values(advancedSearchFilters.customFields).some(field => field.value || field.operator === 'isEmpty' || field.operator === 'isNotEmpty');
  };

  const handleAdvancedSearchChange = (
    field: 'firstName' | 'lastName' | 'barcode' | 'notes' | 'photoFilter',
    value: string,
    property: 'value' | 'operator' = 'value'
  ) => {
    setAdvancedSearchFilters(prev => {
      if (field === 'photoFilter') {
        return { ...prev, photoFilter: value as 'all' | 'with' | 'without' };
      }

      const newFieldState = {
        ...prev[field],
        [property]: value,
      };

      if (property === 'operator' && ['isEmpty', 'isNotEmpty'].includes(value)) {
        newFieldState.value = '';
      }

      return {
        ...prev,
        [field]: newFieldState,
      };
    });
  };

  const handleCustomFieldSearchChange = (fieldId: string, value: string, operator?: string) => {
    setAdvancedSearchFilters(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldId]: {
          value,
          operator: operator || prev.customFields[fieldId]?.operator || 'contains',
        }
      }
    }));
  };

  const handleCustomFieldOperatorChange = (fieldId: string, operator: string) => {
    setAdvancedSearchFilters(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldId]: {
          ...prev.customFields[fieldId],
          operator,
          // Clear value if operator doesn't need it
          value: ['isEmpty', 'isNotEmpty'].includes(operator) ? '' : prev.customFields[fieldId].value,
        }
      }
    }));
  };

  const clearAdvancedSearch = () => {
    const customFields: { [key: string]: { value: string; operator: string } } = {};
    eventSettings?.customFields?.forEach((field: any) => {
      customFields[field.id] = { value: '', operator: 'contains' };
    });
    setAdvancedSearchFilters({
      firstName: { value: '', operator: 'contains' },
      lastName: { value: '', operator: 'contains' },
      barcode: { value: '', operator: 'contains' },
      notes: { value: '', operator: 'contains', hasNotes: false },
      photoFilter: 'all',
      customFields
    });
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = selectedRole === "all" || user.role?.id === selectedRole;
    return matchesSearch && matchesRole;
  });

  // Helper function to capitalize first letter
  const capitalizeFirst = (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // API Functions
  const handleSaveAttendee = async (attendeeData: any) => {
    // Show loading notification
    showLoading({
      title: editingAttendee ? "Updating Attendee" : "Creating Attendee",
      text: "Please wait..."
    });

    try {
      const url = editingAttendee
        ? `/api/attendees/${editingAttendee.id}`
        : '/api/attendees';

      const method = editingAttendee ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attendeeData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save attendee');
      }

      const savedAttendee = await response.json();

      if (editingAttendee) {
        setAttendees(prev => prev.map(a => a.id === editingAttendee.id ? savedAttendee : a));
        close();
        success("Success", "Attendee updated successfully!");
      } else {
        setAttendees(prev => [savedAttendee, ...prev]);
        close();
        success("Success", "Attendee created successfully!");
      }

      setEditingAttendee(null);
    } catch (err: any) {
      close();
      error("Error", err.message);
      throw err;
    }
  };

  const handleSaveAndGenerateCredential = async (attendeeData: any) => {
    // Show loading notification
    showLoading({
      title: "Updating & Generating Credential",
      text: "Please wait..."
    });

    try {
      // First, save the attendee
      const url = editingAttendee
        ? `/api/attendees/${editingAttendee.id}`
        : '/api/attendees';

      const method = editingAttendee ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attendeeData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save attendee');
      }

      const savedAttendee = await response.json();

      // Update local state
      if (editingAttendee) {
        setAttendees(prev => prev.map(a => a.id === editingAttendee.id ? savedAttendee : a));
      } else {
        setAttendees(prev => [savedAttendee, ...prev]);
      }

      close();
      success("Success", "Attendee updated successfully! Generating credential...");

      // Then generate the credential
      const attendeeId = savedAttendee.id;
      await handleGenerateCredential(attendeeId);

      setEditingAttendee(null);
    } catch (err: any) {
      close();
      error("Error", err.message);
      throw err;
    }
  };

  const handleDeleteAttendee = async (attendeeId: string) => {
    const attendee = attendees.find(a => a.id === attendeeId);
    const attendeeName = attendee ? `${attendee.firstName} ${attendee.lastName}` : 'this attendee';

    const confirmed = await confirm({
      title: 'Delete Attendee',
      text: `Are you sure you want to delete ${attendeeName}? This action cannot be undone.`,
      icon: 'warning',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/attendees/${attendeeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete attendee');
      }

      setAttendees(prev => prev.filter(a => a.id !== attendeeId));
      success("Success", "Attendee deleted successfully!");
    } catch (err: any) {
      error("Error", err.message || "Failed to delete attendee");
    }
  };

  const handleGenerateCredential = async (attendeeId: string) => {
    // Find the attendee name for the loading modal
    const attendee = attendees.find(a => a.id === attendeeId);
    const attendeeName = attendee ? `${attendee.firstName} ${attendee.lastName}` : 'attendee';

    setGeneratingCredential(attendeeId);

    // Show SweetAlert2 progress modal
    const updateProgress = showProgressModal(isDark);
    updateProgress({
      title: 'Generating Credential',
      text: `Processing credential for ${attendeeName}...`,
      current: 0,
      total: 1,
      currentItemName: attendeeName
    });

    try {
      const response = await fetch(`/api/attendees/${attendeeId}/generate-credential`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate credential');
      }

      const result = await response.json();

      // Update the attendee in the local state with the new credential URL and updated timestamp
      setAttendees(prev => prev.map(a =>
        a.id === attendeeId
          ? {
            ...a,
            credentialUrl: result.credentialUrl,
            credentialGeneratedAt: result.generatedAt,
            $updatedAt: result.updatedAt || result.generatedAt // Use the actual Appwrite timestamp
          }
          : a
      ));

      // Close progress modal
      closeProgressModal();

      // Open the generated credential in a new tab
      if (result.credentialUrl) {
        window.open(result.credentialUrl, '_blank');
      }

      success("Success", "Credential generated successfully!");
    } catch (err: any) {
      closeProgressModal();

      // Get attendee name for error message
      const attendee = attendees.find(a => a.id === attendeeId);
      const attendeeName = attendee ? `${attendee.firstName} ${attendee.lastName}` : 'Unknown Attendee';

      // Show detailed error modal that requires acknowledgment
      await alert({
        title: 'Credential Generation Failed',
        html: `
          <div style="text-align: left;">
            <p style="margin-bottom: 12px;"><strong>Attendee:</strong> ${attendeeName}</p>
            <p style="margin-bottom: 12px;"><strong>Error:</strong></p>
            <p style="color: #ef4444; font-family: monospace; font-size: 0.9em; background: #fee; padding: 8px; border-radius: 4px; word-break: break-word;">
              ${err.message || 'Failed to generate credential'}
            </p>
          </div>
        `,
        icon: 'error',
        confirmButtonText: 'OK, I Understand'
      });
    } finally {
      setGeneratingCredential(null);
    }
  };

  const handleClearCredential = async (attendeeId: string) => {
    try {
      const response = await fetch(`/api/attendees/${attendeeId}/clear-credential`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to clear credential');
      }

      // Update the attendee in the local state
      setAttendees(prev => prev.map(a =>
        a.id === attendeeId
          ? { ...a, credentialUrl: null, credentialGeneratedAt: null }
          : a
      ));

      success("Success", "Credential cleared successfully!");
    } catch (err: any) {
      error("Error", err.message || "Failed to clear credential");
    }
  };

  const handlePrintCredential = async (attendeeId: string) => {
    setPrintingAttendee(attendeeId);
    try {
      const response = await fetch(`/api/attendees/${attendeeId}/print`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to print credential');
      }

      const result = await response.json();

      // Open the generated image in a new tab for printing
      if (result.credential?.imageUrl) {
        window.open(result.credential.imageUrl, '_blank');
      }

      success("Success", "Credential generated successfully!");
    } catch (err: any) {
      error("Error", err.message || "Failed to generate credential");
    } finally {
      setPrintingAttendee(null);
    }
  };

  // Role Management Functions
  const handleInitializeRoles = async () => {
    setInitializingRoles(true);
    try {
      const response = await fetch('/api/roles/initialize', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to initialize roles');
      }

      const result = await response.json();

      // Reload roles data
      const rolesResponse = await fetch('/api/roles');
      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json();
        setRoles(Array.isArray(rolesData) ? rolesData : []);
      }

      success("Success", "Roles initialized successfully!");
    } catch (err: any) {
      error("Error", err.message || "Failed to initialize roles");
    } finally {
      setInitializingRoles(false);
    }
  };

  const handleSaveRole = async (roleData: any) => {
    try {
      const url = editingRole
        ? `/api/roles/${editingRole.id}`
        : '/api/roles';

      const method = editingRole ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save role');
      }

      const savedRole = await response.json();

      if (editingRole) {
        setRoles(prev => prev.map(r => r.id === editingRole.id ? savedRole : r));
        success("Success", "Role updated successfully!");
      } else {
        setRoles(prev => [savedRole, ...prev]);
        success("Success", "Role created successfully!");
      }

      setEditingRole(null);
    } catch (err: any) {
      error("Error", err.message || "Failed to save role");
      throw err;
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    const roleName = role ? role.name : 'this role';

    const confirmed = await confirm({
      title: 'Delete Role',
      text: `Are you sure you want to delete the "${roleName}" role? This action cannot be undone.`,
      icon: 'warning',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete role');
      }

      setRoles(prev => prev.filter(r => r.id !== roleId));
      success("Success", "Role deleted successfully!");
    } catch (err: any) {
      error("Error", err.message || "Failed to delete role");
    }
  };

  // Event Settings Functions
  const handleSaveEventSettings = async (settingsData: any) => {
    // Show loading notification
    showLoading({
      title: eventSettings ? "Updating Settings" : "Creating Settings",
      text: "Please wait while we save your changes..."
    });

    try {
      const url = eventSettings
        ? `/api/event-settings`
        : '/api/event-settings';

      const method = eventSettings ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save event settings');
      }

      // Don't set the state immediately, instead refresh to get the latest data
      // This ensures we get the updated `updatedAt` timestamp from the database
      await refreshEventSettings();

      // Also refresh attendees to pick up custom field visibility changes
      await refreshAttendees();

      close();
      success("Success", eventSettings ? "Event settings updated successfully!" : "Event settings created successfully!");
    } catch (err: any) {
      close();
      error("Error", err.message);
      throw err;
    }
  };

  // User Management Functions
  const handleSaveUser = async (userData: any) => {
    try {
      const url = editingUser
        ? `/api/users`
        : '/api/users';

      const method = editingUser ? 'PUT' : 'POST';

      const requestData = editingUser
        ? { id: editingUser.id, ...userData }
        : userData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save user');
      }

      const savedUser = await response.json();

      if (editingUser) {
        setUsers(prev => prev.map(u => u.id === editingUser.id ? savedUser : u));
        success("Success", "User updated successfully!");
      } else {
        // Handle new user linking response
        setUsers(prev => [savedUser, ...prev]);

        // Check team membership status and display appropriate message
        if (savedUser.teamMembership) {
          if (savedUser.teamMembership.status === 'success') {
            success("Success", "User linked successfully and added to team!");
          } else if (savedUser.teamMembership.status === 'failed') {
            warning("Warning", `User linked successfully, but team membership failed: ${savedUser.teamMembership.error || 'Unknown error'}`);
          }
        } else {
          success("Success", "User linked successfully!");
        }
      }

      setEditingUser(null);

      // Refresh user list to ensure we have the latest data
      await refreshUsers();
    } catch (err: any) {
      error("Error", err.message || "Failed to save user");
      throw err;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      setUsers(prev => prev.filter(u => u.id !== userId));
      success("Success", "User deleted successfully!");
    } catch (err: any) {
      error("Error", err.message || "Failed to delete user");
    }
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    // Try modern clipboard API first
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      console.warn('Modern clipboard API failed, trying fallback:', error);
    }

    // Fallback method for older browsers or when modern API fails
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.style.opacity = '0';
      textArea.style.pointerEvents = 'none';
      textArea.setAttribute('readonly', '');
      textArea.setAttribute('contenteditable', 'true');

      document.body.appendChild(textArea);

      // For mobile devices
      if (navigator.userAgent.match(/ipad|ipod|iphone/i)) {
        textArea.contentEditable = 'true';
        textArea.readOnly = false;
        const range = document.createRange();
        range.selectNodeContents(textArea);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        textArea.setSelectionRange(0, 999999);
      } else {
        textArea.select();
        textArea.setSelectionRange(0, 999999);
      }

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        return true;
      }
    } catch (fallbackError) {
      console.warn('Fallback clipboard method failed:', fallbackError);
    }

    return false;
  };



  const handleLogsFilterChange = async (newFilters: typeof logsFilters) => {
    setLogsFilters(newFilters);
    await loadLogs(1, newFilters);
  };

  const handleLogsPageChange = async (newPage: number) => {
    await loadLogs(newPage, logsFilters);
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams({
        action: logsFilters.action,
        userId: logsFilters.userId,
        export: 'true'
      });

      const response = await fetch(`/api/logs?${params}`);
      if (response.ok) {
        const data = await response.json();

        // Convert logs to CSV
        const csvContent = [
          ['Date', 'Time', 'Action', 'User', 'Target', 'Details'].join(','),
          ...data.logs.map((log: Log) => [
            new Date(log.createdAt).toLocaleDateString(),
            new Date(log.createdAt).toLocaleTimeString(),
            log.action,
            log.user ? (log.user.name || log.user.email) : 'Unknown User',
            log.attendee ? `${log.attendee.firstName} ${log.attendee.lastName}` : (log.details?.target || log.details?.type || 'System'),
            log.details?.description || log.details?.summary || (log.details?.changes ? (Array.isArray(log.details.changes) ? log.details.changes.join(', ') : JSON.stringify(log.details.changes)) : JSON.stringify(log.details || {}).replace(/"/g, '""'))
          ].join(','))
        ].join('\n');

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        success("Export Complete", "Activity logs have been exported successfully.");
      }
    } catch (err: any) {
      error("Export Failed", err.message || "Failed to export logs");
    }
  };

  // Bulk Delete Functions
  const handleBulkDelete = async () => {
    const count = selectedAttendees.length;
    const confirmed = await confirm({
      title: 'Delete Multiple Attendees',
      text: `Are you sure you want to delete ${count} attendee${count !== 1 ? 's' : ''}? This action cannot be undone.`,
      icon: 'warning',
      confirmButtonText: 'Delete All',
      cancelButtonText: 'Cancel'
    });

    if (!confirmed) {
      return;
    }

    setBulkDeleting(true);

    // Show loading notification
    showLoading({
      title: "Deleting Attendees",
      text: `Deleting ${count} attendee${count !== 1 ? 's' : ''}...`
    });

    try {
      const attendeeIds = selectedAttendees;

      const response = await fetch('/api/attendees/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ attendeeIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete attendees');
      }

      const result = await response.json();

      // Remove deleted attendees from local state and clear selection
      setAttendees(prev => prev.filter(a => !attendeeIds.includes(a.id)));
      setSelectedAttendees([]);

      // Reset to page 1 to avoid being on a page that no longer exists
      setCurrentPage(1);

      close();
      success("Success", `Successfully deleted ${result.deletedCount} attendees.`);
    } catch (err: any) {
      close();
      error("Error", err.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkExportPdf = async () => {
    if (selectedAttendees.length === 0) {
      error("No Selection", "Please select attendees to export PDFs for.");
      return;
    }

    // Validate that all selected attendees have generated credentials
    const selectedAttendeesData = attendees.filter(attendee =>
      selectedAttendees.includes(attendee.id)
    );

    const attendeesWithoutCredentials = selectedAttendeesData.filter(attendee =>
      !attendee.credentialUrl || attendee.credentialUrl.trim() === ''
    );

    if (attendeesWithoutCredentials.length > 0) {
      const attendeeList = attendeesWithoutCredentials
        .slice(0, 5)
        .map(attendee => `<li>${attendee.firstName} ${attendee.lastName}</li>`)
        .join('');
      const moreCount = attendeesWithoutCredentials.length > 5
        ? `<li style="color: #6b7280; margin-top: 8px;">...and ${attendeesWithoutCredentials.length - 5} more</li>`
        : '';

      await alert({
        title: 'Missing Credentials',
        html: `
          <div style="text-align: left;">
            <p style="margin-bottom: 16px;">
              Cannot export PDFs for attendees without generated credentials.
            </p>
            <div style="background: #fee; padding: 12px; border-radius: 6px;">
              <p style="margin-bottom: 8px; font-weight: 600;">Attendees without credentials:</p>
              <ul style="margin: 0; padding-left: 20px; font-size: 0.9em; max-height: 200px; overflow-y: auto;">
                ${attendeeList}
                ${moreCount}
              </ul>
            </div>
            <p style="margin-top: 16px; font-size: 0.9em; color: #6b7280;">
              Please generate credentials first using the "Generate Credential" action.
            </p>
          </div>
        `,
        icon: 'error',
        confirmButtonText: 'OK, I Understand'
      });
      return;
    }

    // Filter selected attendees to only include those with credentialUrl
    const attendeesWithCredentials = filteredAttendees.filter(
      attendee => selectedAttendees.includes(attendee.id) && attendee.credentialUrl
    );

    if (attendeesWithCredentials.length === 0) {
      await alert({
        title: 'No Credentials',
        html: `
          <div style="text-align: left;">
            <p>None of the selected attendees have generated credentials.</p>
            <p style="margin-top: 12px; font-size: 0.9em; color: #6b7280;">
              Please generate credentials first using the "Generate Credential" action.
            </p>
          </div>
        `,
        icon: 'error',
        confirmButtonText: 'OK'
      });
      return;
    }

    setExportingPdfs(true);

    // Show SweetAlert2 progress modal
    const updateProgress = showProgressModal(isDark);
    updateProgress({
      title: 'Exporting PDFs',
      text: `Generating PDF for ${attendeesWithCredentials.length} attendee${attendeesWithCredentials.length === 1 ? '' : 's'}...`,
      current: 1,
      total: 1,
    });

    try {
      const response = await fetch('/api/attendees/bulk-export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendeeIds: attendeesWithCredentials.map(a => a.id),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle missing credentials error specifically
        if (errorData.errorType === 'missing_credentials') {
          const missingAttendees = errorData.attendeesWithoutCredentials || [];
          const attendeeList = missingAttendees
            .slice(0, 5)
            .map((name: string) => `<li>${name}</li>`)
            .join('');
          const moreCount = missingAttendees.length > 5
            ? `<li style="color: #6b7280; margin-top: 8px;">...and ${missingAttendees.length - 5} more</li>`
            : '';

          await alert({
            title: 'Missing Credentials',
            html: `
              <div style="text-align: left;">
                <p style="margin-bottom: 16px;">
                  The following attendees do not have generated credentials and cannot be included in PDF export.
                </p>
                <div style="background: #fee; padding: 12px; border-radius: 6px;">
                  <p style="margin-bottom: 8px; font-weight: 600;">Attendees without credentials:</p>
                  <ul style="margin: 0; padding-left: 20px; font-size: 0.9em; max-height: 200px; overflow-y: auto;">
                    ${attendeeList}
                    ${moreCount}
                  </ul>
                </div>
                <p style="margin-top: 16px; font-size: 0.9em; color: #6b7280;">
                  Please generate their credentials using the "Generate Credential" action and try again.
                </p>
              </div>
            `,
            icon: 'error',
            confirmButtonText: 'OK, I Understand'
          });
          return;
        }

        // Handle outdated credentials error specifically
        if (errorData.errorType === 'outdated_credentials') {
          const outdatedAttendees = errorData.attendeesWithOutdatedCredentials || [];
          const attendeeList = outdatedAttendees
            .slice(0, 5)
            .map((name: string) => `<li>${name}</li>`)
            .join('');
          const moreCount = outdatedAttendees.length > 5
            ? `<li style="color: #6b7280; margin-top: 8px;">...and ${outdatedAttendees.length - 5} more</li>`
            : '';

          await alert({
            title: 'Outdated Credentials',
            html: `
              <div style="text-align: left;">
                <p style="margin-bottom: 16px;">
                  The following attendees have outdated credentials that need to be regenerated before PDF export.
                </p>
                <div style="background: #fef3c7; padding: 12px; border-radius: 6px;">
                  <p style="margin-bottom: 8px; font-weight: 600;">Attendees with outdated credentials:</p>
                  <ul style="margin: 0; padding-left: 20px; font-size: 0.9em; max-height: 200px; overflow-y: auto;">
                    ${attendeeList}
                    ${moreCount}
                  </ul>
                </div>
                <p style="margin-top: 16px; font-size: 0.9em; color: #6b7280;">
                  Please regenerate their credentials using the "Generate Credential" action and try again.
                </p>
              </div>
            `,
            icon: 'warning',
            confirmButtonText: 'OK, I Understand'
          });
          return;
        }

        throw new Error(errorData.error || 'Failed to generate PDF');
      }

      const result = await response.json();

      // Close progress modal
      closeProgressModal();

      if (result.success && result.url) {
        // Open the PDF URL in a new tab
        window.open(result.url, '_blank');

        success("Success", `PDF generated successfully for ${attendeesWithCredentials.length} attendees.`);
      } else {
        throw new Error('Invalid response from PDF generation service');
      }

    } catch (err: any) {
      console.error('Error generating bulk PDF:', err);
      closeProgressModal();
      error("Export Error", err.message || "Failed to generate PDF");
    } finally {
      setExportingPdfs(false);
    }
  };

  const handleBulkGenerateCredentials = async () => {
    if (selectedAttendees.length === 0) {
      error("No Selection", "Please select attendees to generate credentials for.");
      return;
    }

    // Filter attendees that don't have credentials OR have outdated credentials
    const selectedAttendeesData = attendees.filter(attendee =>
      selectedAttendees.includes(attendee.id)
    );

    const attendeesNeedingCredentials = selectedAttendeesData.filter(attendee => {
      // No credential at all
      if (!attendee.credentialUrl || attendee.credentialUrl.trim() === '') {
        return true;
      }

      // Has credential but no generation timestamp - treat as outdated (legacy data)
      if (!attendee.credentialGeneratedAt) {
        return true;
      }

      // Has credential with timestamp - check if it's outdated
      const credentialGeneratedAt = new Date(attendee.credentialGeneratedAt);

      // Check if the attendee has a lastSignificantUpdate field
      // This field is set by the API when non-notes fields are updated
      const lastSignificantUpdate = (attendee as any).lastSignificantUpdate;

      if (lastSignificantUpdate) {
        // Use lastSignificantUpdate for comparison (ignores notes-only updates)
        const significantUpdateDate = new Date(lastSignificantUpdate);
        const timeDifference = Math.abs(credentialGeneratedAt.getTime() - significantUpdateDate.getTime());
        const isCredentialFromSameUpdate = timeDifference <= 5000; // 5 seconds tolerance

        if (isCredentialFromSameUpdate || credentialGeneratedAt > significantUpdateDate) {
          return false;
        } else {
          return true;
        }
      }

      // Fall back to $updatedAt if lastSignificantUpdate doesn't exist (legacy records)
      const updatedAtField = (attendee as any).$updatedAt || attendee.updatedAt;
      if (updatedAtField) {
        const recordUpdatedAt = new Date(updatedAtField);
        const timeDifference = Math.abs(credentialGeneratedAt.getTime() - recordUpdatedAt.getTime());
        const isCredentialFromSameUpdate = timeDifference <= 5000; // 5 seconds tolerance

        if (isCredentialFromSameUpdate || credentialGeneratedAt > recordUpdatedAt) {
          return false;
        } else {
          return true;
        }
      }

      // Has credential and timestamp but no updatedAt (shouldn't happen) - treat as current
      return false;
    });

    if (attendeesNeedingCredentials.length === 0) {
      info("All Selected Attendees Have Current Credentials", "All selected attendees already have current credentials generated.");
      return;
    }

    setBulkGeneratingCredentials(true);

    // Show SweetAlert2 progress modal
    const updateProgress = showProgressModal(isDark);
    updateProgress({
      title: 'Generating Credentials',
      text: 'Processing credentials for selected attendees...',
      current: 0,
      total: attendeesNeedingCredentials.length,
    });

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      for (let i = 0; i < attendeesNeedingCredentials.length; i++) {
        const attendee = attendeesNeedingCredentials[i];
        const attendeeName = `${attendee.firstName} ${attendee.lastName}`;

        updateProgress({
          title: 'Generating Credentials',
          text: 'Processing credentials for selected attendees...',
          current: i + 1,
          total: attendeesNeedingCredentials.length,
          currentItemName: attendeeName
        });

        // Process each attendee with error handling
        let hasError = false;
        let errorMessage = '';

        try {
          const response = await fetch(`/api/attendees/${attendee.id}/generate-credential`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            hasError = true;
            errorMessage = 'Failed to generate credential';
            try {
              const errorData = await response.json();
              // Include detailed error information if available
              errorMessage = errorData.details
                ? `${errorData.error}: ${errorData.details}`
                : errorData.error || errorMessage;
            } catch (parseError) {
              // If we can't parse the error response, use the status text
              errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
          } else {
            const result = await response.json();

            // Update the attendee in the local state with the new credential URL and updated timestamp
            setAttendees(prev => prev.map(a =>
              a.id === attendee.id
                ? {
                  ...a,
                  credentialUrl: result.credentialUrl,
                  credentialGeneratedAt: result.generatedAt,
                  $updatedAt: result.updatedAt || result.generatedAt // Use the actual Appwrite timestamp
                }
                : a
            ));

            successCount++;
          }
        } catch (err) {
          hasError = true;
          errorMessage = err instanceof Error ? err.message : 'Unknown error';
          console.error(`Error generating credential for ${attendeeName}:`, err);
        }

        // Record error if one occurred
        if (hasError) {
          errorCount++;
          errors.push(`${attendeeName}: ${errorMessage}`);
        }

        // Small delay between requests to avoid overwhelming the API
        if (i < attendeesNeedingCredentials.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Close progress modal
      closeProgressModal();

      // Show final results
      if (successCount > 0 && errorCount === 0) {
        success("Success", `Successfully generated ${successCount} credential${successCount === 1 ? '' : 's'}.`);
      } else if (successCount > 0 && errorCount > 0) {
        // Partial success - show detailed error modal
        const errorListHtml = errors.slice(0, 5).map(err =>
          `<li style="margin-bottom: 8px; color: #ef4444;">${err}</li>`
        ).join('');
        const moreErrors = errors.length > 5 ? `<li style="margin-top: 8px; color: #6b7280;">...and ${errors.length - 5} more errors</li>` : '';

        await alert({
          title: 'Partial Success',
          html: `
            <div style="text-align: left;">
              <p style="margin-bottom: 16px;">
                <strong style="color: #10b981;">✓ Successfully generated:</strong> ${successCount} credential${successCount === 1 ? '' : 's'}
              </p>
              <p style="margin-bottom: 12px;">
                <strong style="color: #ef4444;">✗ Failed to generate:</strong> ${errorCount} credential${errorCount === 1 ? '' : 's'}
              </p>
              <div style="background: #fee; padding: 12px; border-radius: 6px; margin-top: 12px;">
                <p style="margin-bottom: 8px; font-weight: 600;">Error Details:</p>
                <ul style="margin: 0; padding-left: 20px; font-size: 0.9em; max-height: 200px; overflow-y: auto;">
                  ${errorListHtml}
                  ${moreErrors}
                </ul>
              </div>
            </div>
          `,
          icon: 'warning',
          confirmButtonText: 'OK, I Understand'
        });
      } else {
        // Complete failure - show detailed error modal
        const errorListHtml = errors.slice(0, 5).map(err =>
          `<li style="margin-bottom: 8px; color: #ef4444;">${err}</li>`
        ).join('');
        const moreErrors = errors.length > 5 ? `<li style="margin-top: 8px; color: #6b7280;">...and ${errors.length - 5} more errors</li>` : '';

        await alert({
          title: 'Credential Generation Failed',
          html: `
            <div style="text-align: left;">
              <p style="margin-bottom: 16px; color: #ef4444;">
                Failed to generate any credentials. Please review the errors below:
              </p>
              <div style="background: #fee; padding: 12px; border-radius: 6px;">
                <p style="margin-bottom: 8px; font-weight: 600;">Error Details:</p>
                <ul style="margin: 0; padding-left: 20px; font-size: 0.9em; max-height: 200px; overflow-y: auto;">
                  ${errorListHtml}
                  ${moreErrors}
                </ul>
              </div>
            </div>
          `,
          icon: 'error',
          confirmButtonText: 'OK, I Understand'
        });
      }

    } finally {
      setBulkGeneratingCredentials(false);
    }
  };

  const handleBulkEdit = async () => {
    const changesToApply = Object.fromEntries(
      Object.entries(bulkEditChanges).filter(([, value]) => value && value !== 'no-change')
    );

    if (Object.keys(changesToApply).length === 0) {
      warning("No Changes", "You haven't specified any changes to apply.");
      return;
    }

    const count = selectedAttendees.length;
    const changeCount = Object.keys(changesToApply).length;
    const confirmed = await confirm({
      title: 'Bulk Edit Attendees',
      text: `Are you sure you want to apply ${changeCount} change${changeCount !== 1 ? 's' : ''} to ${count} attendee${count !== 1 ? 's' : ''}?`,
      icon: 'warning',
      confirmButtonText: 'Apply Changes',
      cancelButtonText: 'Cancel'
    });

    if (!confirmed) {
      return;
    }

    setIsBulkEditing(true);

    // Show loading notification
    showLoading({
      title: "Updating Attendees",
      text: `Applying changes to ${count} attendee${count !== 1 ? 's' : ''}...`
    });

    try {
      const attendeeIds = selectedAttendees;

      const response = await fetch('/api/attendees/bulk-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendeeIds, changes: changesToApply }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to bulk edit attendees');
      }

      const result = await response.json();
      await refreshAttendees();

      setShowBulkEdit(false);
      setBulkEditChanges({});
      setSelectedAttendees([]);

      // Reset to page 1 for consistent UX after bulk operations
      setCurrentPage(1);

      close();
      success("Success", `Successfully updated ${result.updatedCount} attendees.`);

    } catch (err: any) {
      close();
      error("Error", err.message);
    } finally {
      setIsBulkEditing(false);
    }
  };

  // Function to determine credential status
  const getCredentialStatus = (attendee: Attendee) => {
    // If no credential exists, return null (no status to show)
    if (!attendee.credentialUrl || !attendee.credentialGeneratedAt) {
      return null;
    }

    const credentialGeneratedAt = new Date(attendee.credentialGeneratedAt);

    // Check if the attendee has a lastSignificantUpdate field
    // This field is set by the API when non-notes fields are updated
    const lastSignificantUpdate = (attendee as any).lastSignificantUpdate;

    if (lastSignificantUpdate) {
      // Use lastSignificantUpdate for comparison (ignores notes-only updates)
      const significantUpdateDate = new Date(lastSignificantUpdate);
      const timeDifference = Math.abs(credentialGeneratedAt.getTime() - significantUpdateDate.getTime());
      const isCredentialFromSameUpdate = timeDifference <= 5000; // 5 seconds tolerance

      if (isCredentialFromSameUpdate || credentialGeneratedAt >= significantUpdateDate) {
        return 'current';
      } else {
        return 'outdated';
      }
    }

    // Fall back to $updatedAt if lastSignificantUpdate doesn't exist (legacy records)
    const updatedAtField = (attendee as any).$updatedAt || attendee.updatedAt;
    const recordUpdatedAt = new Date(updatedAtField);
    const timeDifference = Math.abs(credentialGeneratedAt.getTime() - recordUpdatedAt.getTime());
    const isCredentialFromSameUpdate = timeDifference <= 5000; // 5 seconds tolerance

    if (isCredentialFromSameUpdate || credentialGeneratedAt >= recordUpdatedAt) {
      return 'current';
    } else {
      return 'outdated';
    }
  };

  // Load logs when filters change or tab becomes active
  useEffect(() => {
    if (activeTab === 'logs' && canAccessTab(currentUser?.role, 'logs')) {
      loadLogs();
    }
  }, [activeTab, currentUser?.role, loadLogs]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r glass-effect flex flex-col h-screen bg-gradient-to-br from-background via-surface to-surface-variant">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-8">
              <IdCard className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">credential.studio</span>
            </div>

            {/* Event Banner */}
            {eventSettings?.bannerImageUrl && (
              <div className="mb-6">
                <img
                  src={eventSettings.bannerImageUrl}
                  alt={eventSettings.eventName}
                  className="w-full h-24 object-cover rounded-lg"
                />
                <div className="mt-3 text-center">
                  <h3 className="font-bold text-lg leading-tight break-words hyphens-auto"
                    style={{
                      fontSize: 'clamp(0.875rem, 4vw, 1.125rem)',
                      lineHeight: '1.2'
                    }}>
                    {eventSettings.eventName}
                  </h3>
                  <div className="flex items-center justify-center text-xs text-muted-foreground mt-2">
                    <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate">
                      {(() => {
                        // Handle date properly to avoid timezone issues
                        const dateValue = eventSettings.eventDate;

                        if (!dateValue) return 'No date set';

                        // Convert to string if it's not already
                        const dateStr = typeof dateValue === 'string' ? dateValue : String(dateValue);

                        // Extract just the date part if it's an ISO string
                        let datePart = dateStr;
                        if (dateStr.includes('T')) {
                          datePart = dateStr.split('T')[0];
                        }

                        // Parse as local date to avoid timezone conversion issues
                        const [year, month, day] = datePart.split('-').map(Number);
                        const localDate = new Date(year, month - 1, day);

                        // Format the date without timezone conversion
                        return localDate.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        });
                      })()}
                    </span>
                  </div>
                  {eventSettings.eventTime && (
                    <div className="flex items-center justify-center text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span>
                        {(() => {
                          // Format time in the event's timezone
                          const timeZone = eventSettings.timeZone || 'America/Los_Angeles';
                          const timeStr = eventSettings.eventTime;

                          // Create a date object with the time in the event's timezone
                          const today = new Date();
                          const [hours, minutes] = timeStr.split(':').map(Number);

                          // Create a date with today's date and the event time
                          const eventDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);

                          return eventDateTime.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                            timeZone: timeZone
                          });
                        })()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-center text-xs text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate">
                      {eventSettings.eventLocation}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <nav className="space-y-2">
              {canAccessTab(currentUser?.role, 'attendees') && (
                <Button
                  variant={activeTab === "attendees" ? "default" : "ghost"}
                  className="w-full justify-start text-base"
                  onClick={() => setActiveTab("attendees")}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Attendees
                </Button>
              )}
              {canAccessTab(currentUser?.role, 'settings') && (
                <Button
                  variant={activeTab === "settings" ? "default" : "ghost"}
                  className="w-full justify-start text-base"
                  onClick={() => setActiveTab("settings")}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Event Settings
                </Button>
              )}
              {canAccessTab(currentUser?.role, 'users') && (
                <Button
                  variant={activeTab === "users" ? "default" : "ghost"}
                  className="w-full justify-start text-base"
                  onClick={() => setActiveTab("users")}
                >
                  <UsersRound className="mr-2 h-4 w-4" />
                  User Management
                </Button>
              )}
              {canAccessTab(currentUser?.role, 'roles') && (
                <Button
                  variant={activeTab === "roles" ? "default" : "ghost"}
                  className="w-full justify-start text-base"
                  onClick={() => setActiveTab("roles")}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Roles
                </Button>
              )}
              {canAccessTab(currentUser?.role, 'logs') && (
                <Button
                  variant={activeTab === "logs" ? "default" : "ghost"}
                  className="w-full justify-start text-base"
                  onClick={() => setActiveTab("logs")}
                >
                  <Activity className="mr-2 h-4 w-4" />
                  Activity Logs
                </Button>
              )}
            </nav>
          </div>
        </div>

        {/* User Profile - Fixed at bottom of sidebar */}
        <div className="flex-shrink-0 p-6 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center space-x-3 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {currentUser?.name || user?.name || user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
              <p className="text-xs text-muted-foreground truncate font-bold">
                {currentUser?.role?.name || 'No role assigned'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto" style={{ backgroundColor: '#F1F5F9' }}>
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">
                {activeTab === "attendees" && "Attendees"}
                {activeTab === "users" && "User Management"}
                {activeTab === "roles" && "Role Management"}
                {activeTab === "settings" && "Event Settings"}
                {activeTab === "logs" && "Activity Logs"}
              </h1>
              <p className="text-muted-foreground">
                {activeTab === "attendees" && "Manage event attendees and their credentials"}
                {activeTab === "users" && "Manage system users and their access"}
                {activeTab === "roles" && "Configure user roles and permissions"}
                {activeTab === "settings" && "Configure event settings and integrations"}
                {activeTab === "logs" && "View system activity and audit trail"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {activeTab === "attendees" && hasPermission(currentUser?.role, 'attendees', 'create') && (
                <Button onClick={async () => {
                  await refreshEventSettings();
                  setEditingAttendee(null);
                  setShowAttendeeForm(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Attendee
                </Button>
              )}
              {activeTab === "users" && hasPermission(currentUser?.role, 'users', 'create') && (
                <>
                  <Button onClick={() => {
                    setEditingUser(null);
                    setShowUserForm(true);
                  }}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Link User
                  </Button>
                </>
              )}
              {activeTab === "roles" && hasPermission(currentUser?.role, 'roles', 'create') && (
                <Button onClick={() => setShowRoleForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Role
                </Button>
              )}
              {activeTab === "settings" && hasPermission(currentUser?.role, 'eventSettings', 'update') && (
                <Button onClick={() => setShowEventSettingsForm(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  {eventSettings ? "Edit Settings" : "Create Settings"}
                </Button>
              )}
            </div>
          </div>

          {/* Content based on active tab */}
          {activeTab === "attendees" && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 dark:from-blue-950/50 dark:to-blue-900/50 dark:border-blue-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <CardContent className="flex items-center p-4">
                    <div className="p-3 rounded-lg bg-blue-500/20 dark:bg-blue-400/20">
                      <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Days Until Event</p>
                      <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">
                        {eventSettings?.eventDate ? (() => {
                          const eventDate = new Date(eventSettings.eventDate);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          eventDate.setHours(0, 0, 0, 0);
                          const diffTime = eventDate.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          return diffDays >= 0 ? diffDays : 0;
                        })() : '--'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 dark:from-emerald-950/50 dark:to-emerald-900/50 dark:border-emerald-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <CardContent className="flex items-center p-4">
                    <div className="p-3 rounded-lg bg-emerald-500/20 dark:bg-emerald-400/20">
                      <Users className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Total Attendees</p>
                      <p className="text-4xl font-bold text-emerald-900 dark:text-emerald-100">{attendees.length}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 dark:from-purple-950/50 dark:to-purple-900/50 dark:border-purple-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <CardContent className="flex items-center p-4">
                    <div className="p-3 rounded-lg bg-purple-500/20 dark:bg-purple-400/20">
                      <IdCard className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Credentials Printed</p>
                      <p className="text-4xl font-bold text-purple-900 dark:text-purple-100">{attendees.filter(attendee => attendee.credentialUrl).length}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 dark:from-amber-950/50 dark:to-amber-900/50 dark:border-amber-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <CardContent className="flex items-center p-4">
                    <div className="p-3 rounded-lg bg-amber-500/20 dark:bg-amber-400/20">
                      <Upload className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Photos Uploaded</p>
                      <p className="text-4xl font-bold text-amber-900 dark:text-amber-100">{attendees.filter(a => a.photoUrl).length}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Search and Actions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  {!showAdvancedSearch ? (
                    <div className="flex items-center space-x-4">
                      <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search attendees..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 pr-10 bg-background"
                        />
                        {searchTerm && (
                          <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                            aria-label="Clear search"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <Select value={photoFilter} onValueChange={(value) => setPhotoFilter(value as 'all' | 'with' | 'without')}>
                        <SelectTrigger className="w-48 bg-background">
                          <SelectValue placeholder="Filter by photo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Attendees</SelectItem>
                          <SelectItem value="with">With Photo</SelectItem>
                          <SelectItem value="without">Without Photo</SelectItem>
                        </SelectContent>
                      </Select>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="flex items-center space-x-2"
                            data-advanced-search-trigger
                            onClick={() => {
                              // Initialize custom fields and notes when opening advanced search
                              if (!showAdvancedSearch) {
                                const customFields: { [key: string]: { value: string; operator: string } } = {};
                                eventSettings?.customFields?.forEach((field: any) => {
                                  customFields[field.id] = { value: '', operator: 'contains' };
                                });
                                if (Object.keys(advancedSearchFilters.customFields).length === 0) {
                                  setAdvancedSearchFilters(prev => ({
                                    ...prev,
                                    notes: { value: '', operator: 'contains', hasNotes: false },
                                    customFields
                                  }));
                                }
                              }
                            }}
                          >
                            <Filter className="h-4 w-4" />
                            <span>Advanced Search</span>
                            {hasAdvancedFilters() && (
                              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                                <span className="text-xs">!</span>
                              </Badge>
                            )}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center justify-between">
                              <span>Advanced Search</span>
                              <Button variant="ghost" size="sm" onClick={clearAdvancedSearch}>
                                Clear All
                              </Button>
                            </DialogTitle>
                            <DialogDescription>
                              Search attendees using multiple criteria. Leave fields empty to ignore them in the search.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {/* Basic Fields */}
                              <div className="space-y-2">
                                <Label htmlFor="firstName" className="flex items-center space-x-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span>First Name</span>
                                </Label>
                                <div className="flex space-x-2">
                                  <Select
                                    value={advancedSearchFilters.firstName.operator}
                                    onValueChange={(operator) => handleAdvancedSearchChange('firstName', operator, 'operator')}
                                  >
                                    <SelectTrigger className="w-[120px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="contains">Contains</SelectItem>
                                      <SelectItem value="equals">Equals</SelectItem>
                                      <SelectItem value="startsWith">Starts With</SelectItem>
                                      <SelectItem value="endsWith">Ends With</SelectItem>
                                      <SelectItem value="isEmpty">Is Empty</SelectItem>
                                      <SelectItem value="isNotEmpty">Is Not Empty</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    id="firstName"
                                    placeholder="Value..."
                                    value={advancedSearchFilters.firstName.value}
                                    onChange={(e) => handleAdvancedSearchChange('firstName', e.target.value, 'value')}
                                    disabled={['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.firstName.operator)}
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="lastName" className="flex items-center space-x-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span>Last Name</span>
                                </Label>
                                <div className="flex space-x-2">
                                  <Select
                                    value={advancedSearchFilters.lastName.operator}
                                    onValueChange={(operator) => handleAdvancedSearchChange('lastName', operator, 'operator')}
                                  >
                                    <SelectTrigger className="w-[120px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="contains">Contains</SelectItem>
                                      <SelectItem value="equals">Equals</SelectItem>
                                      <SelectItem value="startsWith">Starts With</SelectItem>
                                      <SelectItem value="endsWith">Ends With</SelectItem>
                                      <SelectItem value="isEmpty">Is Empty</SelectItem>
                                      <SelectItem value="isNotEmpty">Is Not Empty</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    id="lastName"
                                    placeholder="Value..."
                                    value={advancedSearchFilters.lastName.value}
                                    onChange={(e) => handleAdvancedSearchChange('lastName', e.target.value, 'value')}
                                    disabled={['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.lastName.operator)}
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="barcode" className="flex items-center space-x-2">
                                  <QrCode className="h-4 w-4 text-muted-foreground" />
                                  <span>Barcode</span>
                                </Label>
                                <div className="flex space-x-2">
                                  <Select
                                    value={advancedSearchFilters.barcode.operator}
                                    onValueChange={(operator) => handleAdvancedSearchChange('barcode', operator, 'operator')}
                                  >
                                    <SelectTrigger className="w-[120px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="contains">Contains</SelectItem>
                                      <SelectItem value="equals">Equals</SelectItem>
                                      <SelectItem value="startsWith">Starts With</SelectItem>
                                      <SelectItem value="endsWith">Ends With</SelectItem>
                                      <SelectItem value="isEmpty">Is Empty</SelectItem>
                                      <SelectItem value="isNotEmpty">Is Not Empty</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    id="barcode"
                                    placeholder="Value..."
                                    value={advancedSearchFilters.barcode.value}
                                    onChange={(e) => handleAdvancedSearchChange('barcode', e.target.value, 'value')}
                                    disabled={['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.barcode.operator)}
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="photoFilter" className="flex items-center space-x-2">
                                  <Image className="h-4 w-4 text-muted-foreground" />
                                  <span>Photo Status</span>
                                </Label>
                                <Select
                                  value={advancedSearchFilters.photoFilter}
                                  onValueChange={(value) => handleAdvancedSearchChange('photoFilter', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Filter by photo" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Attendees</SelectItem>
                                    <SelectItem value="with">With Photo</SelectItem>
                                    <SelectItem value="without">Without Photo</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Notes Field */}
                              <div className="space-y-2">
                                <Label htmlFor="notes" className="flex items-center space-x-2">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span>Notes</span>
                                </Label>
                                <div className="space-y-2">
                                  <div className="flex space-x-2">
                                    <Select
                                      value={advancedSearchFilters.notes.operator}
                                      onValueChange={(operator) => handleAdvancedSearchChange('notes', operator, 'operator')}
                                    >
                                      <SelectTrigger className="w-[120px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="contains">Contains</SelectItem>
                                        <SelectItem value="equals">Equals</SelectItem>
                                        <SelectItem value="startsWith">Starts With</SelectItem>
                                        <SelectItem value="endsWith">Ends With</SelectItem>
                                        <SelectItem value="isEmpty">Is Empty</SelectItem>
                                        <SelectItem value="isNotEmpty">Is Not Empty</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      id="notes"
                                      placeholder="Value..."
                                      value={advancedSearchFilters.notes.value}
                                      onChange={(e) => handleAdvancedSearchChange('notes', e.target.value, 'value')}
                                      disabled={['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.notes.operator)}
                                    />
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="hasNotes"
                                      checked={advancedSearchFilters.notes.hasNotes}
                                      onCheckedChange={(checked) => {
                                        setAdvancedSearchFilters(prev => ({
                                          ...prev,
                                          notes: {
                                            ...prev.notes,
                                            hasNotes: checked as boolean
                                          }
                                        }));
                                      }}
                                      disabled={['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.notes.operator)}
                                    />
                                    <Label
                                      htmlFor="hasNotes"
                                      className="text-sm font-normal cursor-pointer"
                                    >
                                      Has Notes
                                    </Label>
                                  </div>
                                </div>
                              </div>

                              {/* Custom Fields */}
                              {eventSettings?.customFields?.map((field: any) => {
                                // Function to get icon based on field type
                                const getFieldIcon = (fieldType: string) => {
                                  switch (fieldType) {
                                    case 'text':
                                    case 'uppercase':
                                      return <Type className="h-4 w-4 text-muted-foreground" />;
                                    case 'url':
                                      return <Link className="h-4 w-4 text-muted-foreground" />;
                                    case 'email':
                                      return <Mail className="h-4 w-4 text-muted-foreground" />;
                                    case 'number':
                                      return <Hash className="h-4 w-4 text-muted-foreground" />;
                                    case 'boolean':
                                      return <ToggleLeft className="h-4 w-4 text-muted-foreground" />;
                                    case 'select':
                                      return <ChevronDown className="h-4 w-4 text-muted-foreground" />;
                                    default:
                                      return <FileText className="h-4 w-4 text-muted-foreground" />;
                                  }
                                };

                                return (
                                  <div key={field.id} className="space-y-2">
                                    <Label htmlFor={`custom-${field.id}`} className="flex items-center space-x-2">
                                      {getFieldIcon(field.fieldType)}
                                      <span>{field.fieldName}</span>
                                      {field.fieldType && (
                                        <Badge variant="outline" className="ml-2 text-xs">
                                          {field.fieldType}
                                        </Badge>
                                      )}
                                    </Label>
                                    <div className="space-y-2">
                                      {['text', 'url', 'email', 'number'].includes(field.fieldType) ? (
                                        <div className="flex space-x-2">
                                          <Select
                                            value={advancedSearchFilters.customFields[field.id]?.operator || 'contains'}
                                            onValueChange={(operator) => handleCustomFieldOperatorChange(field.id, operator)}
                                          >
                                            <SelectTrigger className="w-[120px]">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="contains">Contains</SelectItem>
                                              <SelectItem value="equals">Equals</SelectItem>
                                              <SelectItem value="startsWith">Starts With</SelectItem>
                                              <SelectItem value="endsWith">Ends With</SelectItem>
                                              <SelectItem value="isEmpty">Is Empty</SelectItem>
                                              <SelectItem value="isNotEmpty">Is Not Empty</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <Input
                                            id={`custom-${field.id}`}
                                            placeholder={`Value...`}
                                            value={advancedSearchFilters.customFields[field.id]?.value || ''}
                                            onChange={(e) => handleCustomFieldSearchChange(field.id, e.target.value)}
                                            disabled={['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.customFields[field.id]?.operator)}
                                          />
                                        </div>
                                      ) : field.fieldType === 'select' ? (
                                        <Select
                                          value={advancedSearchFilters.customFields[field.id]?.value || 'all'}
                                          onValueChange={(value) => handleCustomFieldSearchChange(field.id, value === 'all' ? '' : value, 'equals')}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder={`Select ${field.fieldName.toLowerCase()}...`} />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="all">All options</SelectItem>
                                            {field.fieldOptions?.options?.filter((option: string) => option && option.trim() !== '').map((option: string, index: number) => (
                                              <SelectItem key={index} value={option}>
                                                {option}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      ) : field.fieldType === 'boolean' ? (
                                        <Select
                                          value={advancedSearchFilters.customFields[field.id]?.value || 'all'}
                                          onValueChange={(value) => handleCustomFieldSearchChange(field.id, value === 'all' ? '' : value, 'equals')}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder={`Select ${field.fieldName.toLowerCase()}...`} />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="all">All options</SelectItem>
                                            <SelectItem value="yes">Yes</SelectItem>
                                            <SelectItem value="no">No</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      ) : (
                                        <Input
                                          id={`custom-${field.id}`}
                                          placeholder={`Search by ${field.fieldName.toLowerCase()}...`}
                                          value={advancedSearchFilters.customFields[field.id]?.value || ''}
                                          onChange={(e) => handleCustomFieldSearchChange(field.id, e.target.value)}
                                        />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Apply Search Button */}
                            <div className="flex justify-end space-x-2 pt-4 border-t">
                              <DialogTrigger asChild>
                                <Button variant="outline">
                                  Cancel
                                </Button>
                              </DialogTrigger>
                              <DialogTrigger asChild>
                                <Button onClick={() => {
                                  if (hasAdvancedFilters()) {
                                    setShowAdvancedSearch(true);
                                  } else {
                                    error("No Search Criteria", "Please enter at least one search criterion to use advanced search.");
                                  }
                                }}>
                                  Apply Search
                                </Button>
                              </DialogTrigger>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-4">
                      <Alert className="bg-primary/10 border-primary/30 dark:bg-primary/20 dark:border-primary/40">
                        <Filter className="h-5 w-5 text-primary" />
                        <AlertDescription className="flex items-center justify-between w-full ml-2">
                          <div className="flex items-center space-x-3">
                            <span className="font-semibold text-primary text-base">Advanced Search Active</span>
                            <Badge variant="default" className="bg-primary text-primary-foreground">
                              {(() => {
                                let count = 0;
                                if (advancedSearchFilters.firstName.value || ['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.firstName.operator)) count++;
                                if (advancedSearchFilters.lastName.value || ['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.lastName.operator)) count++;
                                if (advancedSearchFilters.barcode.value || ['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.barcode.operator)) count++;
                                if (advancedSearchFilters.notes.value || ['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.notes.operator) || advancedSearchFilters.notes.hasNotes) count++;
                                if (advancedSearchFilters.photoFilter !== 'all') count++;
                                count += Object.values(advancedSearchFilters.customFields).filter(field => field.value || field.operator === 'isEmpty' || field.operator === 'isNotEmpty').length;
                                return `${count} ${count === 1 ? 'filter' : 'filters'}`;
                              })()}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-[140px]"
                              onClick={() => {
                                // Turn off advanced search mode to show the dialog
                                setShowAdvancedSearch(false);
                                // Trigger the dialog to open by clicking the Advanced Search button
                                setTimeout(() => {
                                  const advancedSearchButton = document.querySelector('[data-advanced-search-trigger]') as HTMLButtonElement;
                                  if (advancedSearchButton) {
                                    advancedSearchButton.click();
                                  }
                                }, 50);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Filters
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-[140px]"
                              onClick={() => {
                                setShowAdvancedSearch(false);
                                clearAdvancedSearch();
                              }}
                            >
                              Clear All Filters
                            </Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {/* Import/Export Buttons */}
                  <div className="flex items-center space-x-2">
                    {selectedAttendees.length > 0 && (
                      <>
                        <span className="text-sm text-muted-foreground">
                          {selectedAttendees.length} selected
                        </span>
                        {(hasPermission(currentUser?.role, 'attendees', 'bulkEdit') || hasPermission(currentUser?.role, 'attendees', 'bulkDelete')) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" className="flex items-center space-x-2">
                                <MoreHorizontal className="h-4 w-4" />
                                <span>Bulk</span>
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {hasPermission(currentUser?.role, 'attendees', 'bulkEdit') && (
                                <DropdownMenuItem
                                  onClick={() => setShowBulkEdit(true)}
                                  disabled={isBulkEditing}
                                >
                                  <Wand2 className="mr-2 h-4 w-4" />
                                  Bulk Edit
                                </DropdownMenuItem>
                              )}
                              {hasPermission(currentUser?.role, 'attendees', 'bulkGenerateCredentials') && (eventSettings as any)?.switchboardEnabled && (
                                <DropdownMenuItem
                                  onClick={handleBulkGenerateCredentials}
                                  disabled={bulkGeneratingCredentials}
                                >
                                  {bulkGeneratingCredentials ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                      Generating...
                                    </>
                                  ) : (
                                    <>
                                      <FileImage className="mr-2 h-4 w-4" />
                                      Bulk Generate Credentials
                                    </>
                                  )}
                                </DropdownMenuItem>
                              )}
                              {hasPermission(currentUser?.role, 'attendees', 'bulkDelete') && (
                                <DropdownMenuItem
                                  onClick={handleBulkDelete}
                                  disabled={bulkDeleting}
                                  className="text-destructive focus:text-destructive"
                                >
                                  {bulkDeleting ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                      Deleting...
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Bulk Delete
                                    </>
                                  )}
                                </DropdownMenuItem>
                              )}
                              {hasPermission(currentUser?.role, 'attendees', 'bulkGeneratePDFs') && (eventSettings as any)?.oneSimpleApiEnabled && (
                                <DropdownMenuItem
                                  onClick={handleBulkExportPdf}
                                  disabled={exportingPdfs}
                                >
                                  {exportingPdfs ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                      Exporting...
                                    </>
                                  ) : (
                                    <>
                                      <FileUp className="mr-2 h-4 w-4" />
                                      Bulk Export PDFs
                                    </>
                                  )}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}

                        {/* Bulk Edit Dialog - moved outside dropdown */}
                        {hasPermission(currentUser?.role, 'attendees', 'bulkEdit') && (
                          <Dialog open={showBulkEdit} onOpenChange={setShowBulkEdit}>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Bulk Edit Attendees</DialogTitle>
                                <DialogDescription>
                                  Apply changes to all {selectedAttendees.length} selected attendees.
                                  Only fields you change will be updated.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                                {eventSettings?.customFields
                                  ?.filter(field => ['text', 'url', 'email', 'number', 'select', 'boolean', 'uppercase'].includes(field.fieldType))
                                  .map((field: any) => (
                                    <div key={field.id} className="space-y-2">
                                      <Label htmlFor={`bulk-edit-${field.id}`}>{field.fieldName}</Label>
                                      {field.fieldType === 'boolean' ? (
                                        <Select
                                          onValueChange={(value) => setBulkEditChanges(prev => ({ ...prev, [field.id]: value }))}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="No Change" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="no-change">No Change</SelectItem>
                                            <SelectItem value="yes">Yes</SelectItem>
                                            <SelectItem value="no">No</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      ) : field.fieldType === 'select' ? (
                                        <Select
                                          onValueChange={(value) => setBulkEditChanges(prev => ({ ...prev, [field.id]: value }))}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="No Change" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="no-change">No Change</SelectItem>
                                            {field.fieldOptions?.options?.map((option: string, index: number) => (
                                              <SelectItem key={index} value={option}>{option}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      ) : (
                                        <Input
                                          id={`bulk-edit-${field.id}`}
                                          placeholder="Leave empty for no change"
                                          onChange={(e) => setBulkEditChanges(prev => ({ ...prev, [field.id]: e.target.value }))}
                                        />
                                      )}
                                    </div>
                                  ))}
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setShowBulkEdit(false)}>Cancel</Button>
                                <Button onClick={handleBulkEdit} disabled={isBulkEditing}>
                                  {isBulkEditing ? 'Applying...' : 'Apply Changes'}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </>
                    )}
                    {hasPermission(currentUser?.role, 'attendees', 'import') && (
                      <ImportDialog
                        onImportSuccess={refreshAttendees}
                        customFields={(eventSettings?.customFields || []).map(field => ({
                          ...field,
                          internalFieldName: field.internalFieldName || field.fieldName.toLowerCase().replace(/\s+/g, '_')
                        }))}
                      >
                        <Button variant="outline">
                          <Upload className="mr-2 h-4 w-4" />
                          Import
                        </Button>
                      </ImportDialog>
                    )}
                    {hasPermission(currentUser?.role, 'attendees', 'export') && (
                      <ExportDialog
                        totalAttendees={attendees.length}
                        filteredAttendees={filteredAttendees.length}
                        isFiltered={showAdvancedSearch || searchTerm !== '' || photoFilter !== 'all'}
                        searchTerm={searchTerm}
                        photoFilter={photoFilter}
                        advancedFilters={showAdvancedSearch ? {
                          firstName: advancedSearchFilters.firstName.value,
                          lastName: advancedSearchFilters.lastName.value,
                          barcode: advancedSearchFilters.barcode.value,
                          photoFilter: advancedSearchFilters.photoFilter,
                          customFields: Object.fromEntries(
                            Object.entries(advancedSearchFilters.customFields).map(([key, field]) => [
                              key,
                              { value: field.value, searchEmpty: field.operator === 'isEmpty' }
                            ])
                          )
                        } : null}
                        eventSettings={eventSettings || undefined}
                      >
                        <Button variant="outline">
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                      </ExportDialog>
                    )}
                  </div>
                </div>
              </div>

              {/* Attendees Table */}
              <Card className="glass-effect border-0">
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={
                              paginatedAttendees.length > 0 &&
                                paginatedAttendees.every(a => selectedAttendees.includes(a.id))
                                ? true
                                : paginatedAttendees.some(a => selectedAttendees.includes(a.id))
                                  ? "indeterminate"
                                  : false
                            }
                            onCheckedChange={() => {
                              const paginatedIds = paginatedAttendees.map(a => a.id);
                              const allOnPageSelected = paginatedAttendees.every(a => selectedAttendees.includes(a.id));
                              if (allOnPageSelected) {
                                setSelectedAttendees(prev => prev.filter(id => !paginatedIds.includes(id)));
                              } else {
                                setSelectedAttendees(prev => [...new Set([...prev, ...paginatedIds])]);
                              }
                            }}
                            aria-label="Select all on this page"
                          />
                        </TableHead>
                        <TableHead className="w-24">Photo</TableHead>
                        <TableHead className="w-auto">Name</TableHead>
                        <TableHead className="w-32 text-center">Barcode</TableHead>
                        <TableHead className="w-24 text-center">Credential</TableHead>
                        <TableHead className="w-32 text-center">Status</TableHead>
                        <TableHead className="w-24 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAttendees.map((attendee, index) => {
                        // PERFORMANCE OPTIMIZATION: Use extracted helper function
                        // This prevents recreating the logic on every render
                        const customFieldsWithValues = getCustomFieldsWithValues(
                          attendee,
                          eventSettings?.customFields || []
                        );

                        return (
                          <React.Fragment key={attendee.id}>
                            <TableRow
                              data-state={selectedAttendees.includes(attendee.id) && "selected"}
                              data-attendee-id={attendee.id}
                              className={customFieldsWithValues.length > 0 ? "border-b-0" : ""}
                              onMouseEnter={(e) => {
                                const rows = document.querySelectorAll(`tr[data-attendee-id="${attendee.id}"]`);
                                rows.forEach(row => row.classList.add('attendee-row-hover'));
                              }}
                              onMouseLeave={(e) => {
                                const rows = document.querySelectorAll(`tr[data-attendee-id="${attendee.id}"]`);
                                rows.forEach(row => row.classList.remove('attendee-row-hover'));
                              }}
                            >
                              <TableCell className="align-top pt-4" rowSpan={customFieldsWithValues.length > 0 ? 2 : 1}>
                                <Checkbox
                                  checked={selectedAttendees.includes(attendee.id)}
                                  onCheckedChange={(checked) => {
                                    setSelectedAttendees(prev =>
                                      checked
                                        ? [...prev, attendee.id]
                                        : prev.filter(id => id !== attendee.id)
                                    );
                                  }}
                                  aria-label={`Select ${attendee.firstName} ${attendee.lastName}`}
                                />
                              </TableCell>
                              <TableCell className="align-top pt-4" rowSpan={customFieldsWithValues.length > 0 ? 2 : 1}>
                                <div className="flex flex-col items-center gap-2">
                                  <div
                                    className="relative w-20 h-[6.67rem] bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/30 rounded-lg overflow-hidden flex-shrink-0 border border-violet-200 dark:border-violet-800/50 shadow-sm hover:shadow-md transition-all duration-200"
                                    role="img"
                                    aria-label={attendee.photoUrl ? `Photo of ${attendee.firstName} ${attendee.lastName}` : `Initials for ${attendee.firstName} ${attendee.lastName}`}
                                  >
                                    {attendee.photoUrl ? (
                                      <img
                                        src={attendee.photoUrl}
                                        alt=""
                                        className="w-full h-full object-contain"
                                        loading="lazy"
                                        decoding="async"
                                        onError={(e) => {
                                          // Fallback to initials on image load error
                                          e.currentTarget.style.display = 'none';
                                          const parent = e.currentTarget.parentElement;
                                          if (parent) {
                                            const initialsDiv = document.createElement('div');
                                            initialsDiv.className = 'w-full h-full flex items-center justify-center';
                                            initialsDiv.innerHTML = `<span class="text-2xl font-bold text-violet-600 dark:text-violet-400" aria-hidden="true">${attendee.firstName.charAt(0)}${attendee.lastName.charAt(0)}</span>`;
                                            parent.appendChild(initialsDiv);
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-2xl font-bold text-violet-600 dark:text-violet-400" aria-hidden="true">
                                          {attendee.firstName.charAt(0)}{attendee.lastName.charAt(0)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  {attendee.notes && attendee.notes.trim() !== '' && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800" aria-label="Has notes">
                                      <FileText className="h-3 w-3 mr-1" aria-hidden="true" />
                                      NOTES
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="align-top pt-4">
                                <button
                                  onClick={() => {
                                    if (hasPermission(currentUser?.role, 'attendees', 'update')) {
                                      // PERFORMANCE OPTIMIZATION: Open dialog immediately with list data
                                      // This provides instant feedback to the user
                                      setEditingAttendee(attendee);
                                      setShowAttendeeForm(true);

                                      // Fetch full attendee data in background (for hidden fields)
                                      // This happens after the dialog is already open
                                      fetch(`/api/attendees/${attendee.id}`)
                                        .then(response => {
                                          if (response.ok) {
                                            return response.json();
                                          }
                                          return null;
                                        })
                                        .then(fullAttendee => {
                                          if (fullAttendee) {
                                            setEditingAttendee(fullAttendee);
                                          }
                                        })
                                        .catch(error => {
                                          console.error('Error fetching full attendee:', error);
                                          // Already using list data, so no action needed
                                        });
                                    }
                                  }}
                                  className="text-left group w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                                  disabled={!hasPermission(currentUser?.role, 'attendees', 'update')}
                                  aria-label={`Edit ${attendee.firstName} ${attendee.lastName}${attendee.notes && attendee.notes.trim() !== '' ? ', has notes' : ''}`}
                                >
                                  <span className="font-semibold text-xl text-foreground group-hover:text-primary transition-colors">{attendee.firstName} {attendee.lastName}</span>
                                </button>
                              </TableCell>
                              <TableCell className="align-top pt-4">
                                <div className="flex items-center gap-2" role="group" aria-label={`Barcode: ${attendee.barcodeNumber}`}>
                                  <QrCode className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                  <Badge variant="outline" className="font-mono text-sm px-3 py-1.5 bg-background">
                                    {attendee.barcodeNumber}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="align-top pt-4">
                                <div className="flex justify-center">
                                  {attendee.credentialUrl ? (
                                    <button
                                      onClick={() => attendee.credentialUrl && window.open(attendee.credentialUrl, '_blank')}
                                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                      aria-label={`View credential for ${attendee.firstName} ${attendee.lastName}, opens in new tab`}
                                    >
                                      <Image className="h-5 w-5 text-purple-600" aria-hidden="true" />
                                    </button>
                                  ) : (
                                    <div className="p-1" role="status" aria-label="No credential generated">
                                      <Image className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="align-top pt-4">
                                <div className="flex justify-center">
                                  {(() => {
                                    const status = getCredentialStatus(attendee);
                                    if (status === 'current') {
                                      return (
                                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200 hover:border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/40 dark:hover:border-emerald-700 font-semibold px-3 py-1 transition-colors" role="status" aria-label="Credential status: Current">
                                          <CheckCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                                          CURRENT
                                        </Badge>
                                      );
                                    } else if (status === 'outdated') {
                                      return (
                                        <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200 hover:border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-900/40 dark:hover:border-red-700 font-semibold px-3 py-1 transition-colors" role="status" aria-label="Credential status: Outdated">
                                          <AlertTriangle className="h-3 w-3 mr-1" aria-hidden="true" />
                                          OUTDATED
                                        </Badge>
                                      );
                                    } else {
                                      return (
                                        <Badge variant="secondary" className="text-muted-foreground px-3 py-1" role="status" aria-label="Credential status: None">
                                          <Circle className="h-3 w-3 mr-1" aria-hidden="true" />
                                          NONE
                                        </Badge>
                                      );
                                    }
                                  })()}
                                </div>
                              </TableCell>
                              <TableCell className="align-top pt-4">
                                <div className="flex justify-center">
                                  <DropdownMenu
                                    open={dropdownStates[attendee.id] || false}
                                    onOpenChange={(open) => {
                                      setDropdownStates(prev => ({
                                        ...prev,
                                        [attendee.id]: open
                                      }));
                                    }}
                                  >
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" aria-label={`Actions for ${attendee.firstName} ${attendee.lastName}`}>
                                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {hasPermission(currentUser?.role, 'attendees', 'print') && (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setDropdownStates(prev => ({
                                              ...prev,
                                              [attendee.id]: false
                                            }));
                                            handleGenerateCredential(attendee.id);
                                          }}
                                          disabled={generatingCredential === attendee.id}
                                        >
                                          {generatingCredential === attendee.id ? (
                                            <>
                                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                              Generating...
                                            </>
                                          ) : (
                                            <>
                                              <FileImage className="mr-2 h-4 w-4" />
                                              Generate Credential
                                            </>
                                          )}
                                        </DropdownMenuItem>
                                      )}
                                      {hasPermission(currentUser?.role, 'attendees', 'print') && attendee.credentialUrl && (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setDropdownStates(prev => ({
                                              ...prev,
                                              [attendee.id]: false
                                            }));
                                            handleClearCredential(attendee.id);
                                          }}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Clear Credential
                                        </DropdownMenuItem>
                                      )}
                                      {hasPermission(currentUser?.role, 'attendees', 'update') && (
                                        <DropdownMenuItem
                                          onSelect={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                          }}
                                          onClick={async (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();

                                            // Close dropdown immediately
                                            setDropdownStates(prev => ({
                                              ...prev,
                                              [attendee.id]: false
                                            }));

                                            // Use a longer delay to ensure dropdown fully closes
                                            setTimeout(async () => {
                                              await refreshEventSettings();
                                              // Fetch full attendee data including hidden fields
                                              try {
                                                const response = await fetch(`/api/attendees/${attendee.id}`);
                                                if (response.ok) {
                                                  const fullAttendee = await response.json();
                                                  setEditingAttendee(fullAttendee);
                                                } else {
                                                  // Fallback to list data if fetch fails
                                                  setEditingAttendee(attendee);
                                                }
                                              } catch (error) {
                                                console.error('Error fetching full attendee:', error);
                                                // Fallback to list data if fetch fails
                                                setEditingAttendee(attendee);
                                              }
                                              setShowAttendeeForm(true);
                                            }, 100);
                                          }}
                                        >
                                          <Edit className="mr-2 h-4 w-4" />
                                          Edit
                                        </DropdownMenuItem>
                                      )}
                                      {hasPermission(currentUser?.role, 'attendees', 'delete') && (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setDropdownStates(prev => ({
                                              ...prev,
                                              [attendee.id]: false
                                            }));
                                            handleDeleteAttendee(attendee.id);
                                          }}
                                          className="text-destructive"
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                            {/* Custom Fields Row - Spans from Name to Actions columns */}
                            {customFieldsWithValues.length > 0 && (
                              <TableRow
                                data-state={selectedAttendees.includes(attendee.id) && "selected"}
                                data-attendee-id={attendee.id}
                                onMouseEnter={(e) => {
                                  const rows = document.querySelectorAll(`tr[data-attendee-id="${attendee.id}"]`);
                                  rows.forEach(row => row.classList.add('attendee-row-hover'));
                                }}
                                onMouseLeave={(e) => {
                                  const rows = document.querySelectorAll(`tr[data-attendee-id="${attendee.id}"]`);
                                  rows.forEach(row => row.classList.remove('attendee-row-hover'));
                                }}
                              >
                                <TableCell colSpan={5} className="pt-1 pb-6">
                                  <div className="border-t border-border/50 pt-2">
                                    {(() => {
                                      // PERFORMANCE OPTIMIZATION: Use memoized getGridColumns function
                                      const gridCols = getGridColumns(customFieldsWithValues.length);

                                      return (
                                        <div className={`grid grid-cols-1 ${gridCols} gap-x-6 gap-y-2`}>
                                          {customFieldsWithValues.map((field, index: number) => (
                                            <div key={index} className="flex flex-col space-y-0.5 min-w-0">
                                              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide" id={`field-label-${attendee.id}-${index}`}>
                                                {field.fieldName}
                                              </span>
                                              <div className="text-sm font-medium text-foreground min-w-0" aria-labelledby={`field-label-${attendee.id}-${index}`}>
                                                {field.fieldType === 'url' ? (
                                                  <a
                                                    href={field.value || ''}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:text-primary/80 underline inline-flex items-center gap-1 max-w-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                                                    onClick={(e) => e.stopPropagation()}
                                                    title={field.value || ''}
                                                    aria-label={`${field.fieldName}: ${field.value}, opens in new tab`}
                                                  >
                                                    <Link className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                                                    <span className="truncate block min-w-0">{field.value}</span>
                                                  </a>
                                                ) : field.fieldType === 'boolean' ? (
                                                  <Badge
                                                    variant="outline"
                                                    className={`text-xs ${field.value === 'Yes'
                                                      ? 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 hover:border-violet-300 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800 dark:hover:bg-violet-900/40 dark:hover:border-violet-700'
                                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300 dark:bg-gray-950/30 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-900/40 dark:hover:border-gray-700'
                                                      }`}
                                                    role="status"
                                                  >
                                                    {field.value}
                                                  </Badge>
                                                ) : (
                                                  <span className="truncate block" title={field.value || ''}>
                                                    {field.value}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to {Math.min(endIndex, totalAttendees)} of {totalAttendees} attendees
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePreviousPage}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <div className="flex items-center space-x-1">
                          {(() => {
                            const pages = [];
                            const maxVisiblePages = 5;

                            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                            const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                            if (endPage - startPage + 1 < maxVisiblePages) {
                              startPage = Math.max(1, endPage - maxVisiblePages + 1);
                            }

                            // Add first page and ellipsis if needed
                            if (startPage > 1) {
                              pages.push(
                                <Button
                                  key={1}
                                  variant={1 === currentPage ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handlePageChange(1)}
                                  className="w-8 h-8 p-0"
                                >
                                  1
                                </Button>
                              );
                              if (startPage > 2) {
                                pages.push(
                                  <span key="ellipsis1" className="text-muted-foreground px-1">
                                    ...
                                  </span>
                                );
                              }
                            }

                            // Add visible page numbers
                            for (let i = startPage; i <= endPage; i++) {
                              pages.push(
                                <Button
                                  key={i}
                                  variant={i === currentPage ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handlePageChange(i)}
                                  className="w-8 h-8 p-0"
                                >
                                  {i}
                                </Button>
                              );
                            }

                            // Add ellipsis and last page if needed
                            if (endPage < totalPages) {
                              if (endPage < totalPages - 1) {
                                pages.push(
                                  <span key="ellipsis2" className="text-muted-foreground px-1">
                                    ...
                                  </span>
                                );
                              }
                              pages.push(
                                <Button
                                  key={totalPages}
                                  variant={totalPages === currentPage ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handlePageChange(totalPages)}
                                  className="w-8 h-8 p-0"
                                >
                                  {totalPages}
                                </Button>
                              );
                            }

                            return pages;
                          })()}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNextPage}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-6">
              {/* Search and Filters */}
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background"
                  />
                </div>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-48 bg-background">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Users Table */}
              <Card className="glass-effect border-0">
                <CardHeader>
                  <CardTitle>System Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {user.email.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <button
                                  onClick={() => {
                                    if (hasPermission(currentUser?.role, 'users', 'update')) {
                                      setEditingUser(user);
                                      setShowUserForm(true);
                                    }
                                  }}
                                  className={`text-left ${hasPermission(currentUser?.role, 'users', 'update')
                                    ? 'hover:text-primary transition-colors cursor-pointer'
                                    : 'cursor-default'
                                    }`}
                                  disabled={!hasPermission(currentUser?.role, 'users', 'update')}
                                >
                                  <div className="font-medium text-lg hover:text-primary">{user.name || user.email.split('@')[0]}</div>
                                </button>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">{user.email}</span>
                                  {user.isInvited && (
                                    <Badge variant="secondary" className="text-xs">
                                      Invited
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.role ? (
                              <Badge variant="secondary">{user.role.name}</Badge>
                            ) : (
                              <Badge variant="outline">No Role</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {hasPermission(currentUser?.role, 'users', 'update') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingUser(user);
                                    setShowUserForm(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {hasPermission(currentUser?.role, 'users', 'delete') && canManageUser(currentUser?.role, user.role) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => {
                                    setUserToDelete(user);
                                    setShowDeleteUserDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "roles" && (
            <div className="space-y-6">
              {/* Role Initialization Alert */}
              {roles.length === 0 && (
                <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    No roles have been configured yet. Initialize the default role system to get started.
                    <Button
                      className="ml-4 bg-amber-600 hover:bg-amber-700 text-white"
                      size="sm"
                      onClick={handleInitializeRoles}
                      disabled={initializingRoles}
                    >
                      {initializingRoles ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Initializing...
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 h-4 w-4" />
                          Initialize Roles
                        </>
                      )}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Role Statistics */}
              {roles.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 dark:from-blue-950/50 dark:to-blue-900/50 dark:border-blue-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <CardContent className="flex items-center p-4">
                      <div className="p-3 rounded-lg bg-blue-500/20 dark:bg-blue-400/20">
                        <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Roles</p>
                        <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">{roles.length}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 dark:from-emerald-950/50 dark:to-emerald-900/50 dark:border-emerald-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <CardContent className="flex items-center p-4">
                      <div className="p-3 rounded-lg bg-emerald-500/20 dark:bg-emerald-400/20">
                        <Users className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Active Users</p>
                        <p className="text-4xl font-bold text-emerald-900 dark:text-emerald-100">{users.filter(u => u.role).length}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 dark:from-purple-950/50 dark:to-purple-900/50 dark:border-purple-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <CardContent className="flex items-center p-4">
                      <div className="p-3 rounded-lg bg-purple-500/20 dark:bg-purple-400/20">
                        <AlertTriangle className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Unassigned Users</p>
                        <p className="text-4xl font-bold text-purple-900 dark:text-purple-100">{users.filter(u => !u.role).length}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 dark:from-amber-950/50 dark:to-amber-900/50 dark:border-amber-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <CardContent className="flex items-center p-4">
                      <div className="p-3 rounded-lg bg-amber-500/20 dark:bg-amber-400/20">
                        <Settings className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Categories</p>
                        <p className="text-4xl font-bold text-amber-900 dark:text-amber-100">
                          {roles.length > 0 ? new Set(roles.flatMap(role => Object.keys(role.permissions || {}))).size : 0}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Roles List */}
              {roles.length > 0 && (
                <div className="space-y-4">
                  {roles.map((role) => (
                    <RoleCard
                      key={role.id}
                      role={role}
                      users={users}
                      canEdit={hasPermission(currentUser?.role, 'roles', 'update')}
                      canDelete={hasPermission(currentUser?.role, 'roles', 'delete')}
                      onEdit={(role) => {
                        setEditingRole(role);
                        setShowRoleForm(true);
                      }}
                      onDelete={handleDeleteRole}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6">
              {!eventSettings ? (
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    No event settings have been configured yet. Create your event settings to get started.
                    <Button
                      className="ml-4"
                      size="sm"
                      onClick={() => setShowEventSettingsForm(true)}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Create Event Settings
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  {/* Event Settings Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 dark:from-blue-950/50 dark:to-indigo-900/50 dark:border-blue-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                      <CardContent className="flex items-center p-4">
                        <div className="p-3 rounded-lg bg-blue-500/20 dark:bg-blue-400/20">
                          <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-4 overflow-hidden">
                          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Event Details</p>
                          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 truncate" title={eventSettings.eventName}>{eventSettings.eventName}</p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 truncate">
                            {(() => {
                              // Handle date properly to avoid timezone issues
                              const dateValue = eventSettings.eventDate;

                              if (!dateValue) return 'No date set';

                              // Convert to string if it's not already
                              const dateStr = typeof dateValue === 'string' ? dateValue : String(dateValue);

                              // Extract just the date part if it's an ISO string
                              let datePart = dateStr;
                              if (dateStr.includes('T')) {
                                datePart = dateStr.split('T')[0];
                              }

                              // Parse as local date to avoid timezone conversion issues
                              const [year, month, day] = datePart.split('-').map(Number);
                              const localDate = new Date(year, month - 1, day);

                              // Format the date without timezone conversion
                              return localDate.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              });
                            })()} • {eventSettings.eventLocation}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-emerald-50 to-teal-100 border-emerald-200 dark:from-emerald-950/50 dark:to-teal-900/50 dark:border-emerald-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                      <CardContent className="flex items-center p-4">
                        <div className="p-3 rounded-lg bg-emerald-500/20 dark:bg-emerald-400/20">
                          <QrCode className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Barcode Settings</p>
                          <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{capitalizeFirst(eventSettings.barcodeType)}</p>
                          <p className="text-xs text-emerald-700 dark:text-emerald-300">
                            {eventSettings.barcodeLength} characters • {eventSettings.barcodeUnique ? 'Unique' : 'Non-unique'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200 dark:from-purple-950/50 dark:to-violet-900/50 dark:border-purple-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                      <CardContent className="flex items-center p-4">
                        <div className="p-3 rounded-lg bg-purple-500/20 dark:bg-purple-400/20">
                          <Plus className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Custom Fields</p>
                          <p className="text-4xl font-bold text-purple-900 dark:text-purple-100">{eventSettings.customFields?.length || 0}</p>
                          <p className="text-xs text-purple-700 dark:text-purple-300">
                            Additional data fields
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Current Configuration Details */}
                  <Card className="glass-effect border-0">
                    <CardHeader>
                      <CardTitle>Current Configuration</CardTitle>
                      <CardDescription>
                        Detailed view of your current event settings and integrations
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* General Settings */}
                        <div>
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            General Settings
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Event Name:</span> {eventSettings.eventName || 'Not set'}
                            </div>
                            <div>
                              <span className="font-medium">Event Date:</span> {eventSettings.eventDate ? (() => {
                                const dateValue = eventSettings.eventDate;
                                if (!dateValue) return 'No date set';
                                const dateStr = typeof dateValue === 'string' ? dateValue : String(dateValue);
                                let datePart = dateStr;
                                if (dateStr.includes('T')) {
                                  datePart = dateStr.split('T')[0];
                                }
                                const [year, month, day] = datePart.split('-').map(Number);
                                const localDate = new Date(year, month - 1, day);
                                return localDate.toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                });
                              })() : 'Not set'}
                            </div>
                            <div>
                              <span className="font-medium">Event Time:</span> {eventSettings.eventTime ? (() => {
                                const timeZone = eventSettings.timeZone || 'America/Los_Angeles';
                                const timeStr = eventSettings.eventTime;
                                const today = new Date();
                                const [hours, minutes] = timeStr.split(':').map(Number);
                                const eventDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
                                return eventDateTime.toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                  timeZone: timeZone
                                });
                              })() : 'Not set'}
                            </div>
                            <div>
                              <span className="font-medium">Location:</span> {eventSettings.eventLocation || 'Not set'}
                            </div>
                            <div>
                              <span className="font-medium">Time Zone:</span> {eventSettings.timeZone || 'Not set'}
                            </div>
                            <div>
                              <span className="font-medium">Banner Image:</span> {eventSettings.bannerImageUrl ? 'Configured' : 'Not set'}
                            </div>
                          </div>
                        </div>

                        {/* Barcode Settings */}
                        <div>
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <QrCode className="h-4 w-4" />
                            Barcode Settings
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Barcode Type:</span> {eventSettings.barcodeType === 'numerical' ? 'Numerical (0-9)' : eventSettings.barcodeType === 'alphanumerical' ? 'Alphanumerical (A-Z, 0-9)' : (capitalizeFirst(eventSettings.barcodeType) + ' (0-9, A-Z)') || 'Not set'}
                            </div>
                            <div>
                              <span className="font-medium">Barcode Length:</span> {eventSettings.barcodeLength || 'Not set'}
                            </div>
                            <div>
                              <span className="font-medium">Unique Barcodes:</span> {eventSettings.barcodeUnique ? 'Yes' : 'No'}
                            </div>
                          </div>
                        </div>

                        {/* Integration Status */}
                        <div>
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Integrations
                          </h4>
                          <div className="space-y-3">
                            {/* Cloudinary Status */}
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className={`h-2 w-2 rounded-full ${eventSettings?.cloudinaryEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                <div>
                                  <div className="font-medium">Cloudinary Integration</div>
                                  <div className="text-xs text-muted-foreground">
                                    {eventSettings?.cloudinaryEnabled ? 'Active' : 'Disabled'}
                                    {/* SECURITY: API credentials configured via environment variables */}
                                    {eventSettings?.cloudinaryEnabled && eventSettings?.cloudinaryCloudName && eventSettings?.cloudinaryUploadPreset ? ' - Configured' : eventSettings?.cloudinaryEnabled ? ' - Incomplete Configuration' : ''}
                                  </div>
                                </div>
                              </div>
                              <Badge variant={eventSettings?.cloudinaryEnabled ? "default" : "secondary"}>
                                {eventSettings?.cloudinaryEnabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </div>

                            {/* Switchboard Status */}
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className={`h-2 w-2 rounded-full ${eventSettings?.switchboardEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                <div>
                                  <div className="font-medium">Switchboard Canvas Integration</div>
                                  <div className="text-xs text-muted-foreground">
                                    {eventSettings?.switchboardEnabled ? 'Active' : 'Disabled'}
                                    {/* SECURITY: API key configured via environment variables */}
                                    {eventSettings?.switchboardEnabled && eventSettings?.switchboardApiEndpoint ? ' - Configured' : eventSettings?.switchboardEnabled ? ' - Incomplete Configuration' : ''}
                                  </div>
                                </div>
                              </div>
                              <Badge variant={eventSettings?.switchboardEnabled ? "default" : "secondary"}>
                                {eventSettings?.switchboardEnabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </div>

                            {/* OneSimpleAPI Status */}
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className={`h-2 w-2 rounded-full ${eventSettings?.oneSimpleApiEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                <div>
                                  <div className="font-medium">OneSimpleAPI Integration</div>
                                  <div className="text-xs text-muted-foreground">
                                    {eventSettings?.oneSimpleApiEnabled ? 'Active' : 'Disabled'}
                                    {eventSettings?.oneSimpleApiEnabled && eventSettings?.oneSimpleApiUrl ? ' - Fully Configured' : eventSettings?.oneSimpleApiEnabled ? ' - Incomplete Configuration' : ''}
                                  </div>
                                </div>
                              </div>
                              <Badge variant={eventSettings?.oneSimpleApiEnabled ? "default" : "secondary"}>
                                {eventSettings?.oneSimpleApiEnabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="flex items-center justify-between pt-4 border-t">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Last updated {new Date(eventSettings.updatedAt || eventSettings.createdAt).toLocaleDateString()} at {new Date(eventSettings.updatedAt || eventSettings.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                          {hasPermission(currentUser?.role, 'eventSettings', 'update') && (
                            <Button onClick={() => setShowEventSettingsForm(true)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Settings
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Custom Fields Overview */}
                  {eventSettings.customFields && eventSettings.customFields.length > 0 && (
                    <Card className="glass-effect border-0">
                      <CardHeader>
                        <CardTitle>Custom Fields</CardTitle>
                        <CardDescription>
                          Additional fields configured for attendee data collection
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {eventSettings.customFields.map((field) => (
                            <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">{field.fieldName}</span>
                                  <Badge variant="outline">{field.fieldType}</Badge>
                                  {field.required && <Badge variant="secondary">Required</Badge>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "logs" && (
            <div className="space-y-6">
              {/* Activity Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 dark:from-blue-950/50 dark:to-blue-900/50 dark:border-blue-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <CardContent className="flex items-center p-4">
                    <div className="p-3 rounded-lg bg-blue-500/20 dark:bg-blue-400/20">
                      <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Activities</p>
                      <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">{logsPagination.totalCount}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 dark:from-emerald-950/50 dark:to-emerald-900/50 dark:border-emerald-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <CardContent className="flex items-center p-4">
                    <div className="p-3 rounded-lg bg-emerald-500/20 dark:bg-emerald-400/20">
                      <Calendar className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Today&apos;s Activities</p>
                      <p className="text-4xl font-bold text-emerald-900 dark:text-emerald-100">
                        {logs.filter(log => {
                          const logDate = new Date(log.createdAt).toDateString();
                          const today = new Date().toDateString();
                          return logDate === today;
                        }).length}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 dark:from-purple-950/50 dark:to-purple-900/50 dark:border-purple-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <CardContent className="flex items-center p-4">
                    <div className="p-3 rounded-lg bg-purple-500/20 dark:bg-purple-400/20">
                      <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Active Users</p>
                      <p className="text-4xl font-bold text-purple-900 dark:text-purple-100">
                        {new Set(logs.filter(log => log.user).map(log => log.user.email)).size}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 dark:from-amber-950/50 dark:to-amber-900/50 dark:border-amber-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <CardContent className="flex items-center p-4">
                    <div className="p-3 rounded-lg bg-amber-500/20 dark:bg-amber-400/20">
                      <BarChart3 className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="ml-4 flex-1 min-w-0">
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Most Common</p>
                      <p className="text-lg font-bold text-amber-900 dark:text-amber-100 break-words">
                        {(() => {
                          const actionCounts = logs.reduce((acc: Record<string, number>, log) => {
                            acc[log.action] = (acc[log.action] || 0) + 1;
                            return acc;
                          }, {});
                          const mostCommon = Object.entries(actionCounts).sort(([, a], [, b]) => (b as number) - (a as number))[0];
                          return mostCommon ? formatActionName(mostCommon[0]) : 'N/A';
                        })()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Logs Filters and Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Select
                    value={logsFilters.action}
                    onValueChange={(value) => handleLogsFilterChange({ ...logsFilters, action: value })}
                  >
                    <SelectTrigger className="w-48 bg-background">
                      <SelectValue placeholder="Filter by action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                      <SelectItem value="view">View</SelectItem>
                      <SelectItem value="print">Print</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                      <SelectItem value="logout">Logout</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={logsFilters.userId}
                    onValueChange={(value) => handleLogsFilterChange({ ...logsFilters, userId: value })}
                  >
                    <SelectTrigger className="w-48 bg-background">
                      <SelectValue placeholder="Filter by user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.userId || user.id}>
                          {user.name || user.email.split('@')[0]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  {hasPermission(currentUser?.role, 'logs', 'configure') && (
                    <LogSettingsDialog
                      onSettingsUpdate={() => {
                        // Optionally refresh logs or show a success message
                        success("Log Settings Updated", "Logging preferences have been updated successfully.");
                      }}
                    >
                      <Button variant="outline">
                        <Settings className="mr-2 h-4 w-4" />
                        Log Settings
                      </Button>
                    </LogSettingsDialog>
                  )}
                  {hasPermission(currentUser?.role, 'logs', 'delete') && (
                    <LogsDeleteDialog
                      users={users}
                      onDeleteSuccess={() => loadLogs(1, logsFilters)}
                      onDeleteStart={() => setPauseLogsRealtime(true)}
                      onDeleteEnd={() => setPauseLogsRealtime(false)}
                    >
                      <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Logs
                      </Button>
                    </LogsDeleteDialog>
                  )}
                  <LogsExportDialog
                    users={users}
                    totalLogs={logsPagination.totalCount}
                    currentFilters={logsFilters}
                  >
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </LogsExportDialog>
                  <Button variant="outline" onClick={() => loadLogs(1, logsFilters)}>
                    <Activity className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Logs Table */}
              <Card className="glass-effect border-0">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Activity Logs</span>
                    {logsLoading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Showing {logs.length} of {logsPagination.totalCount} activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {logsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="ml-2 text-muted-foreground">Loading activity logs...</span>
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">No Activity Found</h3>
                      <p className="text-sm text-muted-foreground">
                        {logsFilters.action !== 'all' || logsFilters.userId !== 'all'
                          ? 'No activities match your current filters.'
                          : 'No activities have been recorded yet.'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Action</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead>Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {logs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell>
                                <Badge variant={
                                  log.action === "create" ? "default" :
                                    log.action === "update" ? "secondary" :
                                      log.action === "delete" ? "destructive" :
                                        log.action === "view" ? "outline" :
                                          log.action === "print" ? "default" :
                                            "outline"
                                }>
                                  {formatActionName(log.action)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                      {log.user ? (log.user.name || log.user.email).charAt(0).toUpperCase() : '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium text-sm">
                                      {log.user ? (log.user.name || log.user.email.split('@')[0]) : 'Unknown User'}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {log.user ? log.user.email : 'User deleted'}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {log.attendee ? (
                                    <div>
                                      <div className="font-medium">{log.attendee.firstName} {log.attendee.lastName}</div>
                                      <div className="text-xs text-muted-foreground">Attendee</div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="font-medium">
                                        {((): string => {
                                          // Show the actual target (person name or target type)
                                          if (log.details?.firstName && log.details?.lastName) {
                                            return `${String(log.details.firstName)} ${String(log.details.lastName)}`;
                                          } else if (log.details?.roleName) {
                                            return String(log.details.roleName);
                                          } else if (log.details?.target) {
                                            return String(log.details.target);
                                          } else {
                                            return 'System';
                                          }
                                        })()}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {((): string => {
                                          // Show the category
                                          const type = log.details?.type;
                                          if (type === 'attendee' || type === 'attendees') return 'Attendee';
                                          if (type === 'user' || type === 'users') return 'User';
                                          if (type === 'role' || type === 'roles') return 'Role';
                                          if (type === 'settings' || type === 'event_settings') return 'Settings';
                                          if (type === 'system' || type === 'auth') return 'System Operation';
                                          if (log.details?.target) return String(log.details.target);
                                          return 'System';
                                        })()}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-muted-foreground max-w-xs">
                                  {log.details?.description ? (
                                    // Show description for all operations that have it
                                    <div className="text-xs">
                                      <div>{String(log.details.description)}</div>
                                      {/* Show changeDetails if available (for settings updates) */}
                                      {log.details?.changeDetails && typeof log.details.changeDetails === 'object' && Object.keys(log.details.changeDetails).length > 0 ? (
                                        <div className="mt-2 space-y-0.5 text-muted-foreground">
                                          {Object.entries(log.details.changeDetails as Record<string, { from: any; to: any }>).map(([field, change]) => (
                                            <div key={field}>
                                              <span className="font-medium">{field}</span>: {String(change.from)} → {String(change.to)}
                                            </div>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : log.details?.changes ? (
                                    <div className="text-xs space-y-1">
                                      {(() => {
                                        const changes = log.details.changes;
                                        if (Array.isArray(changes)) {
                                          // Handle array format (field names only)
                                          return <>Changed: {(changes as string[]).join(', ')}</>;
                                        } else if (typeof changes === 'object' && changes !== null) {
                                          // Check if it's the new format with from/to values
                                          const hasFromTo = Object.values(changes).some((v: any) => v && typeof v === 'object' && 'from' in v && 'to' in v);
                                          if (hasFromTo) {
                                            // New format: { field: { from: bool, to: bool } }
                                            return (
                                              <div className="space-y-0.5">
                                                {Object.entries(changes as Record<string, { from: boolean; to: boolean }>).map(([field, change]) => (
                                                  <div key={field}>
                                                    <span className="font-medium">{field}</span>: {String(change.from)} → {String(change.to)}
                                                  </div>
                                                ))}
                                              </div>
                                            );
                                          } else {
                                            // Legacy format: { field: boolean }
                                            return <>Changed: {Object.entries(changes as Record<string, boolean>)
                                              .filter(([, changed]) => changed)
                                              .map(([field]) => field)
                                              .join(', ')}
                                            </>;
                                          }
                                        } else {
                                          // Handle string format (fallback)
                                          return <>Changed: {String(changes)}</>;
                                        }
                                      })()}
                                    </div>
                                  ) : null}
                                  {log.details?.summary ? (
                                    <div className="text-xs text-muted-foreground mt-1">{String(log.details.summary)}</div>
                                  ) : null}
                                  {log.details?.barcodeNumber ? (
                                    <div className="text-xs">Barcode: {String(log.details.barcodeNumber || '')}</div>
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(log.createdAt).toLocaleTimeString()}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {/* Enhanced Pagination */}
                      {logsPagination.totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                          <div className="text-sm text-muted-foreground">
                            Page {logsPagination.page} of {logsPagination.totalPages} • Showing {logs.length} of {logsPagination.totalCount} activities
                          </div>

                          <div className="flex items-center space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLogsPageChange(1)}
                              disabled={logsPagination.page === 1 || logsLoading}
                            >
                              First
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLogsPageChange(logsPagination.page - 1)}
                              disabled={!logsPagination.hasPrev || logsLoading}
                            >
                              Previous
                            </Button>

                            {/* Page Numbers */}
                            <div className="flex items-center space-x-1">
                              {(() => {
                                const pages = [];
                                const maxVisiblePages = 5;
                                const currentPage = logsPagination.page;
                                const totalPages = logsPagination.totalPages;

                                let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                                const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                                if (endPage - startPage + 1 < maxVisiblePages) {
                                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                                }

                                // Add first page and ellipsis if needed
                                if (startPage > 1) {
                                  pages.push(
                                    <Button
                                      key={1}
                                      variant={1 === currentPage ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => handleLogsPageChange(1)}
                                      className="w-8 h-8 p-0"
                                      disabled={logsLoading}
                                    >
                                      1
                                    </Button>
                                  );
                                  if (startPage > 2) {
                                    pages.push(
                                      <span key="ellipsis1" className="text-muted-foreground px-1">
                                        ...
                                      </span>
                                    );
                                  }
                                }

                                // Add visible page numbers
                                for (let i = startPage; i <= endPage; i++) {
                                  pages.push(
                                    <Button
                                      key={i}
                                      variant={i === currentPage ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => handleLogsPageChange(i)}
                                      className="w-8 h-8 p-0"
                                      disabled={logsLoading}
                                    >
                                      {i}
                                    </Button>
                                  );
                                }

                                // Add ellipsis and last page if needed
                                if (endPage < totalPages) {
                                  if (endPage < totalPages - 1) {
                                    pages.push(
                                      <span key="ellipsis2" className="text-muted-foreground px-1">
                                        ...
                                      </span>
                                    );
                                  }
                                  pages.push(
                                    <Button
                                      key={totalPages}
                                      variant={totalPages === currentPage ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => handleLogsPageChange(totalPages)}
                                      className="w-8 h-8 p-0"
                                      disabled={logsLoading}
                                    >
                                      {totalPages}
                                    </Button>
                                  );
                                }

                                return pages;
                              })()}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLogsPageChange(logsPagination.page + 1)}
                              disabled={!logsPagination.hasNext || logsLoading}
                            >
                              Next
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLogsPageChange(logsPagination.totalPages)}
                              disabled={logsPagination.page === logsPagination.totalPages || logsLoading}
                            >
                              Last
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Attendee Form Modal */}
      {/* Note: For optimal performance, consider memoizing customFields with useMemo 
          to prevent unnecessary form re-initializations when eventSettings changes */}
      <AttendeeForm
        isOpen={showAttendeeForm}
        onClose={() => {
          setShowAttendeeForm(false);
          setEditingAttendee(null);
        }}
        onSave={handleSaveAttendee}
        onSaveAndGenerate={handleSaveAndGenerateCredential}
        attendee={editingAttendee || undefined}
        customFields={eventSettings?.customFields || []}
        eventSettings={eventSettings || undefined}
      />

      {/* User Form Modal */}
      <UserForm
        isOpen={showUserForm}
        onClose={() => {
          setShowUserForm(false);
          setEditingUser(null);
        }}
        onSave={handleSaveUser}
        user={editingUser}
        roles={roles}
        mode={editingUser ? 'edit' : 'link'}
      />

      {/* Link User Dialog */}
      <LinkUserDialog
        isOpen={showLinkUserDialog}
        onClose={() => setShowLinkUserDialog(false)}
        onLink={async () => {
          await refreshUsers();
        }}
        roles={roles}
      />

      {/* Delete User Dialog */}
      <DeleteUserDialog
        isOpen={showDeleteUserDialog}
        onClose={() => {
          setShowDeleteUserDialog(false);
          setUserToDelete(null);
        }}
        onConfirm={async (deleteFromAuth) => {
          if (!userToDelete) return;

          try {
            const response = await fetch('/api/users', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: userToDelete.id,
                deleteFromAuth
              }),
            });

            if (response.ok) {
              const data = await response.json();
              success("Success", data.message);
              await refreshUsers();
            } else {
              const errorData = await response.json();
              error("Error", errorData.error || "Failed to delete user");
            }
          } catch (err) {
            error("Error", "Failed to delete user");
          } finally {
            setShowDeleteUserDialog(false);
            setUserToDelete(null);
          }
        }}
        user={userToDelete}
      />

      {/* Event Settings Form Modal */}
      <EventSettingsForm
        isOpen={showEventSettingsForm}
        onClose={() => setShowEventSettingsForm(false)}
        onSave={handleSaveEventSettings}
        eventSettings={eventSettings}
      />

      {/* Role Form Modal */}
      <RoleForm
        isOpen={showRoleForm}
        onClose={() => {
          setShowRoleForm(false);
          setEditingRole(null);
        }}
        onSave={handleSaveRole}
        role={editingRole}
      />



    </div>
  );
}