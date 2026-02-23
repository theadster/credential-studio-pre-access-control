import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useConnectionHealth } from "@/hooks/useConnectionHealth";
import { useDataFreshness } from "@/hooks/useDataFreshness";
import { usePollingFallback } from "@/hooks/usePollingFallback";
import { ConnectionStatusIndicator } from "@/components/ConnectionStatusIndicator";
import { DataRefreshIndicator } from "@/components/DataRefreshIndicator";
import {
  showConnectionLostNotification,
  showReconnectedNotification,
  showMaxRetriesAlert,
  recordDisconnectionStart,
  clearDisconnectionTracking,
  getDisconnectionDuration,
} from "@/lib/connectionNotifications";
import { DATA_FRESHNESS } from "@/lib/constants";
import type { ConnectionStatus } from "@/types/connectionHealth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { EventSettings, CustomField, AccessControlTimeMode } from "@/components/EventSettingsForm/types";
import {
  parseCustomFieldValues,
  getCustomFieldValue,
  formatCustomFieldValue,
  isLegacyCustomFieldValues,
  isCurrentCustomFieldValues,
  type CustomFieldWithValue,
  type ParsedCustomFieldValues,
} from "@/types/customFields";
import { formatForDisplay, formatDateTimeSeparate } from "@/lib/accessControlDates";
import { isAccessControlEnabledForEvent } from "@/lib/accessControlFeature";
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
  FileDown,
  UsersRound,
  CheckCircle,
  Circle,
  X,
  HelpCircle,
  Check
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TooltipPortal } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useSweetAlert } from "@/hooks/useSweetAlert";
import { showProgressModal, closeProgressModal } from "@/lib/sweetalert-progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import AttendeeForm from "@/components/AttendeeForm";
import UserForm from "@/components/UserForm/index";
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
import ApprovalProfileManager from "@/components/ApprovalProfileManager";
import { ExportsTab } from "@/components/ExportsTab";
import { PdfGenerationToast, type PdfJobStatus } from "@/components/PdfGenerationToast";
import ScanLogsViewer from "@/components/ScanLogsViewer";
import OperatorMonitoringDashboard from "@/components/OperatorMonitoringDashboard";
import { AdvancedFiltersDialog } from "@/components/AdvancedFiltersDialog";
import type { AdvancedSearchFilters } from "@/lib/filterUtils";
import { hasActiveFilters as checkHasActiveFilters, createEmptyFilters, filtersToChips, type FilterChip } from "@/lib/filterUtils";
import { hasPermission, canAccessTab, canManageUser } from "@/lib/permissions";
import { CLEAR_SENTINEL } from "@/lib/constants";
import { buildPageWindow, escapeHtml } from "@/lib/utils";

/**
 * NotesTooltip component with overflow indicator
 * Shows a visual indicator when content is truncated
 */
function NotesTooltip({ notes }: { notes: string }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkHeight = () => {
      if (contentRef.current) {
        // Check if scrollHeight exceeds the visible height
        const hasOverflow = contentRef.current.scrollHeight > contentRef.current.clientHeight;
        setIsOverflowing(hasOverflow);
      }
    };

    // Small delay to ensure content is rendered and measured
    const timer = setTimeout(checkHeight, 100);
    return () => clearTimeout(timer);
  }, [notes]);

  return (
    <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm border-2 border-yellow-400 dark:border-yellow-600 rounded-md shadow-xl z-[9999] min-w-96 max-w-2xl pointer-events-none">
      <div 
        ref={contentRef}
        className="px-4 py-3 whitespace-pre-wrap break-words font-normal leading-relaxed overflow-hidden max-h-32"
      >
        {notes}
      </div>
      {isOverflowing && (
        <div className="px-4 py-2 border-t border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center gap-2 text-xs font-medium text-yellow-700 dark:text-yellow-400">
          <ChevronDown className="h-3 w-3" />
          <span>View full note in attendee record</span>
        </div>
      )}
      <div className="absolute top-full left-6 -mt-1 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-yellow-400 dark:border-t-yellow-600"></div>
    </div>
  );
}

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
  credentialCount?: number;
  photoUploadCount?: number;
  viewCount?: number;
  lastCredentialGenerated?: string | null;
  lastPhotoUploaded?: string | null;
  createdAt: string;
  updatedAt: string;
  customFieldValues: CustomFieldValue[];
  // Access control fields (Requirements 6.1, 6.2)
  validFrom?: string | null;
  validUntil?: string | null;
  accessEnabled?: boolean;
  [key: string]: unknown;
}

// Extend EventSettings with Appwrite-specific fields
interface DashboardEventSettings extends EventSettings {
  $createdAt?: string;
  $updatedAt?: string;
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

  /**
   * Maps activeTab string to a safe DataType union for usePollingFallback
   * Returns undefined if the tab doesn't correspond to a valid data type
   */
  const mapTabToDataType = (tab: string): 'attendees' | 'users' | 'roles' | 'settings' | 'logs' | undefined => {
    switch (tab) {
      case 'attendees':
        return 'attendees';
      case 'users':
        return 'users';
      case 'roles':
        return 'roles';
      case 'settings':
        return 'settings';
      case 'logs':
        return 'logs';
      default:
        return undefined;
    }
  };

  const [activeTab, setActiveTab] = useState("attendees");
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [eventSettings, setEventSettings] = useState<DashboardEventSettings | null>(null);

  const [logs, setLogs] = useState<Log[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [aggregateMetrics, setAggregateMetrics] = useState({
    totalMostCommonAction: 'N/A',
    totalActiveUsers: 0,
    totalTodayCount: 0
  });
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
    credentialFilter: 'all' | 'with' | 'without';
    customFields: { [key: string]: { value: string | string[]; operator: string } };
    accessControl: {
      accessStatus: 'all' | 'active' | 'inactive';
      validFromStart: string;
      validFromEnd: string;
      validUntilStart: string;
      validUntilEnd: string;
    };
    matchMode: 'all' | 'any';
  }>({
    firstName: { value: '', operator: 'contains' },
    lastName: { value: '', operator: 'contains' },
    barcode: { value: '', operator: 'contains' },
    notes: { value: '', operator: 'contains', hasNotes: false },
    photoFilter: 'all',
    credentialFilter: 'all',
    customFields: {},
    accessControl: {
      accessStatus: 'all',
      validFromStart: '',
      validFromEnd: '',
      validUntilStart: '',
      validUntilEnd: ''
    },
    matchMode: 'all'
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
  const [pdfToast, setPdfToast] = useState<{
    status: PdfJobStatus;
    attendeeCount: number;
    pdfUrl?: string;
    errorMessage?: string;
  } | null>(null);
  const [bulkGeneratingCredentials, setBulkGeneratingCredentials] = useState(false);
  const [bulkClearingCredentials, setBulkClearingCredentials] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showSelectAllDialog, setShowSelectAllDialog] = useState(false);
  const [showPageJumpDialog, setShowPageJumpDialog] = useState(false);
  const [pageJumpInput, setPageJumpInput] = useState("");
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrBarcodeNumber, setQrBarcodeNumber] = useState<string | null>(null);
  const [advancedFiltersDialogOpen, setAdvancedFiltersDialogOpen] = useState(false);
  const [isPollingActive, setIsPollingActive] = useState(false);

  const refreshAttendees = useCallback(async () => {
    try {
      const attendeesResponse = await fetch('/api/attendees');
      if (attendeesResponse.ok) {
        // Check if response has content before parsing JSON
        const contentLength = attendeesResponse.headers.get('content-length');
        if (contentLength === '0' || attendeesResponse.status === 204) {
          setAttendees([]);
          return;
        }
        
        const attendeesData = await attendeesResponse.json();
        if (Array.isArray(attendeesData)) {
          setAttendees(attendeesData);
        } else if (attendeesData && typeof attendeesData === 'object' && Array.isArray(attendeesData.attendees)) {
          setAttendees(attendeesData.attendees);
        } else {
          setAttendees([]);
        }
        // Mark freshness only after successful fetch
        attendeesFreshnessRef.current?.markFresh();
      } else {
        setAttendees([]);
      }
    } catch (error) {
      console.error('Error refreshing attendees:', error);
      setAttendees([]);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    try {
      const usersResponse = await fetch('/api/users');
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        // API returns { users: [...], pagination: {...} }
        setUsers(usersData.users || []);
        // Mark freshness only after successful fetch
        usersFreshnessRef.current?.markFresh();
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
        // Mark freshness only after successful fetch
        rolesFreshnessRef.current?.markFresh();
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
        
        // Parse accessControlDefaults if it's a string
        if (typeof settingsData.accessControlDefaults === 'string') {
          try {
            settingsData.accessControlDefaults = JSON.parse(settingsData.accessControlDefaults);
          } catch (e) {
            console.error('Failed to parse accessControlDefaults:', e);
          }
        }
        
        setEventSettings(settingsData);
        // Mark freshness only after successful fetch
        settingsFreshnessRef.current?.markFresh();
      }
    } catch (error) {
      console.error('Error refreshing event settings:', error);
    }
  }, []);

  /**
   * PERFORMANCE OPTIMIZATION: Grid Column Calculation
   * 
   * Memoized factory function to determine grid columns based on field count
   * and the configured maximum columns from event settings.
   * Uses useMemo to create a stable function reference that only changes when dependencies change.
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
   * @returns Function that takes fieldCount and returns Tailwind CSS grid column classes
   */
  const getGridColumns = useMemo(() => {
    const maxColumns = eventSettings?.customFieldColumns || 7;

    return (fieldCount: number): string => {
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
    };
  }, [eventSettings?.customFieldColumns]);

  /**
   * PERFORMANCE OPTIMIZATION: Custom Fields Value Extraction
   * 
   * Memoized factory function that extracts custom field values for an attendee.
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
   * @returns Function that takes attendee and customFields and returns formatted field values
   */
  const getCustomFieldsWithValues = useMemo(() => {
    return (attendee: Attendee, customFields: CustomField[]): CustomFieldWithValue[] => {
      if (!customFields || customFields.length === 0) return [];

      // Parse customFieldValues with type safety
      const parsedCustomFieldValues: ParsedCustomFieldValues = parseCustomFieldValues(
        attendee.customFieldValues
      );

      return customFields
        .filter((field: CustomField) => field.id && field.showOnMainPage !== false) // Only show visible fields with IDs
        .sort((a: CustomField, b: CustomField) => a.order - b.order)
        .map((field: CustomField): CustomFieldWithValue => {
          // Get value using type-safe helper (handles both formats)
          // field.id is guaranteed to exist due to filter above
          const rawValue = getCustomFieldValue(parsedCustomFieldValues, field.id);
          
          // Format value based on field type
          const displayValue = formatCustomFieldValue(rawValue ?? null, field.fieldType);

          return {
            customFieldId: field.id!,
            fieldName: field.fieldName,
            fieldType: field.fieldType,
            value: displayValue
          };
        })
        .filter((field: CustomFieldWithValue) => {
          // Show boolean fields always (they will show Yes/No)
          // Show other fields only if they have a value
          return field.fieldType === 'boolean' || field.value;
        });
    };
  }, []);

  const loadLogs = useCallback(async (page = 1, filters = logsFilters, retryCount = 0) => {
    // Don't load logs if user is not authenticated
    if (!currentUser) {
      console.log('Skipping logs load - user not authenticated');
      return;
    }

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
        // Store aggregate metrics from API response
        if (data.aggregateMetrics) {
          setAggregateMetrics(data.aggregateMetrics);
        }
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, [logsPagination.limit, logsFilters, currentUser]);

  // Get available tabs for current user
  const getAvailableTabs = (): string[] => {
    const tabs: string[] = [];
    if (canAccessTab(currentUser?.role, 'attendees')) tabs.push('attendees');
    if (canAccessTab(currentUser?.role, 'users')) tabs.push('users');
    if (canAccessTab(currentUser?.role, 'roles')) tabs.push('roles');
    if (canAccessTab(currentUser?.role, 'eventSettings')) tabs.push('settings');
    if (canAccessTab(currentUser?.role, 'logs')) tabs.push('logs');
    if (canAccessTab(currentUser?.role, 'monitoring')) tabs.push('monitoring');
    if (canAccessTab(currentUser?.role, 'accessControl')) tabs.push('accessControl');
    tabs.push('exports');
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

          // Debug logging (only in development)
          if (process.env.NODE_ENV === 'development') {
            console.log('Current user data:', currentUserData);
            console.log('Role:', currentUserData.role);
            console.log('Permissions:', currentUserData.role?.permissions);
          }

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
      // Wait for currentUser to be loaded before fetching data
      // Don't set loading to false here - keep showing loading animation
      // until currentUser is available and data is loaded
      if (!currentUser) {
        return;
      }

      try {
        // Load event settings FIRST so the loading screen can show the event name
        // This provides a better user experience during the loading animation
        if (canAccessTab(currentUser.role, 'eventSettings')) {
          try {
            const settingsResponse = await fetch('/api/event-settings');
            if (settingsResponse.ok) {
              const settingsData = await settingsResponse.json();
              
              // Parse accessControlDefaults if it's a string
              if (typeof settingsData.accessControlDefaults === 'string') {
                try {
                  settingsData.accessControlDefaults = JSON.parse(settingsData.accessControlDefaults);
                } catch (e) {
                  console.error('Failed to parse accessControlDefaults:', e);
                }
              }
              
              setEventSettings(settingsData);
            } else {
              setEventSettings(null);
            }
          } catch (err) {
            console.error('Error loading event settings:', err);
            setEventSettings(null);
          }
        }

        // Load remaining data in parallel for faster loading
        const loadPromises: Promise<void>[] = [];

        // Load users (only if user has permission)
        if (canAccessTab(currentUser.role, 'users')) {
          loadPromises.push(
            fetch('/api/users').then(async (usersResponse) => {
              try {
                if (usersResponse.ok) {
                  const contentLength = usersResponse.headers.get('content-length');
                  if (contentLength === '0' || usersResponse.status === 204) {
                    setUsers([]);
                  } else {
                    const usersData = await usersResponse.json();
                    if (Array.isArray(usersData)) {
                      setUsers(usersData);
                    } else {
                      setUsers((usersData && usersData.users) || []);
                    }
                  }
                } else {
                  setUsers([]);
                }
              } catch (err) {
                console.error('Error parsing users response:', err);
                setUsers([]);
              }
            })
          );
        }

        // Load roles (only if user has permission)
        if (canAccessTab(currentUser.role, 'roles')) {
          loadPromises.push(
            fetch('/api/roles').then(async (rolesResponse) => {
              try {
                if (rolesResponse.ok) {
                  const contentLength = rolesResponse.headers.get('content-length');
                  if (contentLength === '0' || rolesResponse.status === 204) {
                    setRoles([]);
                  } else {
                    const rolesData = await rolesResponse.json();
                    if (Array.isArray(rolesData)) {
                      setRoles(rolesData);
                    } else {
                      setRoles((rolesData && rolesData.roles) || []);
                    }
                  }
                } else {
                  setRoles([]);
                }
              } catch (err) {
                console.error('Error parsing roles response:', err);
                setRoles([]);
              }
            })
          );
        }

        // Load attendees (only if user has permission)
        if (canAccessTab(currentUser.role, 'attendees')) {
          loadPromises.push(
            fetch('/api/attendees').then(async (attendeesResponse) => {
              try {
                if (attendeesResponse.ok) {
                  const attendeesData = await attendeesResponse.json();
                  if (Array.isArray(attendeesData)) {
                    setAttendees(attendeesData);
                  } else {
                    setAttendees((attendeesData && attendeesData.attendees) || []);
                  }
                } else {
                  setAttendees([]);
                }
              } catch (err) {
                console.error('Error parsing attendees response:', err);
                setAttendees([]);
              }
            })
          );
        }

        // Load logs with pagination (only if user has permission)
        if (canAccessTab(currentUser.role, 'logs')) {
          loadPromises.push(loadLogs());
        }

        // Wait for all parallel requests to complete
        await Promise.all(loadPromises);
      } catch (err) {
        console.error('Error loading data:', err);
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
  }, [currentUser]); // Re-run when currentUser changes

  // ============================================================================
  // MEMORY LEAK PREVENTION: Page Visibility & Debounced Callbacks
  // ============================================================================

  /**
   * Create debounced versions of refresh functions to prevent excessive API calls
   * This replaces the setTimeout pattern which could accumulate timeouts
   */
  const debouncedRefreshAttendees = useDebouncedCallback(refreshAttendees, 500);
  const debouncedRefreshUsers = useDebouncedCallback(refreshUsers, 500);
  const debouncedRefreshRoles = useDebouncedCallback(refreshRoles, 500);
  const debouncedRefreshEventSettings = useDebouncedCallback(refreshEventSettings, 500);
  const debouncedLoadLogs = useDebouncedCallback(loadLogs, 1000);

  // ============================================================================
  // CONNECTION HEALTH MONITORING
  // ============================================================================

  /**
   * Ref to track dark mode for notifications (avoids re-renders)
   */
  const isDarkRef = useRef(isDark);
  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  /**
   * Connection health monitoring hook
   * Tracks WebSocket connection status and manages reconnection
   */
  const connectionHealth = useConnectionHealth({
    onStatusChange: useCallback((status: ConnectionStatus) => {
      if (status === 'disconnected') {
        recordDisconnectionStart();
      } else if (status === 'connected') {
        const duration = getDisconnectionDuration();
        if (duration > DATA_FRESHNESS.BRIEF_DISCONNECT_THRESHOLD) {
          showReconnectedNotification({ isDark: isDarkRef.current });
        }
        clearDisconnectionTracking();
      }
    }, []),
    onReconnectFailure: useCallback((_error: Error) => {
      // Derive attemptsMade from the connection health hook's maxReconnectAttempts
      // Falls back to 0 if undefined (defensive programming)
      const attemptsMade = connectionHealthRef.current?.maxReconnectAttempts ?? 0;
      showMaxRetriesAlert({
        attemptsMade,
        onReconnect: () => connectionHealthRef.current?.reconnect(),
        isDark: isDarkRef.current,
      });
    }, []),
  });

  // Ref to access connectionHealth.reconnect in callbacks
  const connectionHealthRef = useRef(connectionHealth);
  useEffect(() => {
    connectionHealthRef.current = connectionHealth;
  }, [connectionHealth]);

  /**
   * Data freshness hooks for each data type
   * Track when data was last updated and provide refresh functionality
   */
  const attendeesFreshness = useDataFreshness(
    { dataType: 'attendees' },
    refreshAttendees
  );

  const usersFreshness = useDataFreshness(
    { dataType: 'users' },
    refreshUsers
  );

  const rolesFreshness = useDataFreshness(
    { dataType: 'roles' },
    refreshRoles
  );

  const settingsFreshness = useDataFreshness(
    { dataType: 'settings' },
    refreshEventSettings
  );

  const logsFreshness = useDataFreshness(
    { dataType: 'logs' },
    useCallback(async () => { await loadLogs(); }, [loadLogs])
  );

  /**
   * Get the active freshness hook based on current tab
   */
  const getActiveFreshness = useCallback(() => {
    switch (activeTab) {
      case 'attendees': return attendeesFreshness;
      case 'users': return usersFreshness;
      case 'roles': return rolesFreshness;
      case 'settings': return settingsFreshness;
      case 'logs': return logsFreshness;
      default: return attendeesFreshness;
    }
  }, [activeTab, attendeesFreshness, usersFreshness, rolesFreshness, settingsFreshness, logsFreshness]);

  // Ref to access getActiveFreshness in callbacks without causing re-renders
  const getActiveFreshnessRef = useRef(getActiveFreshness);
  useEffect(() => {
    getActiveFreshnessRef.current = getActiveFreshness;
  }, [getActiveFreshness]);

  /**
   * Track page visibility with recovery callbacks
   * Triggers reconnection and data refresh when page becomes visible
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
   */
  const { isVisible: isPageVisible } = usePageVisibility({
    onBecomeVisible: useCallback(() => {
      // Trigger reconnection if disconnected (Requirement 4.2)
      if (connectionHealthRef.current?.state.status === 'disconnected') {
        connectionHealthRef.current.reconnect();
      }
      
      // Trigger data refresh for active tab (Requirement 4.3)
      const activeFreshness = getActiveFreshnessRef.current();
      if (activeFreshness && activeFreshness.state.isStale) {
        activeFreshness.refresh();
      }
    }, []),
    debounceMs: DATA_FRESHNESS.VISIBILITY_DEBOUNCE_MS,
    enableDebounce: true,
  });

  /**
   * Polling fallback activation timer
   * Activates after 60 seconds of disconnection to provide fallback data refresh
   * Uses state instead of inline computation to avoid recalculating on every render
   */
  useEffect(() => {
    // Only set up timer if disconnected
    if (connectionHealth.state.status !== 'disconnected' || connectionHealth.state.lastDisconnectedAt === null) {
      // Clear polling if reconnected
      if (isPollingActive) {
        setIsPollingActive(false);
      }
      return;
    }

    // Calculate time elapsed since disconnection
    const timeSinceDisconnect = Date.now() - connectionHealth.state.lastDisconnectedAt.getTime();
    const timeUntilPolling = DATA_FRESHNESS.POLLING_ACTIVATION_DELAY - timeSinceDisconnect;

    // If already past the threshold, activate immediately
    if (timeUntilPolling <= 0) {
      setIsPollingActive(true);
      return;
    }

    // Otherwise, schedule activation after remaining delay
    const timer = setTimeout(() => {
      setIsPollingActive(true);
    }, timeUntilPolling);

    return () => clearTimeout(timer);
  }, [connectionHealth.state.status, connectionHealth.state.lastDisconnectedAt, isPollingActive]);

  /**
   * Polling fallback when connection is lost for extended period
   * Only enabled when isPollingActive is true and activeTab maps to a valid data type
   */
  const pollingDataType = mapTabToDataType(activeTab);
  
  usePollingFallback({
    enabled: isPollingActive && pollingDataType !== undefined,
    dataType: pollingDataType || 'attendees', // Provide fallback for type safety, but won't be used if enabled is false
    onPoll: useCallback(async () => {
      const freshness = getActiveFreshness();
      await freshness.refresh();
    }, [getActiveFreshness]),
  });

  // ============================================================================
  // MEMORY LEAK PREVENTION: Conditional Realtime Subscriptions
  // ============================================================================

  /**
   * Refs for freshness hooks to avoid re-creating callbacks
   * This prevents cascading re-renders that cause infinite loops
   * 
   * Using refs allows us to pass these to useRealtimeSubscription without
   * causing the effect to re-run when the objects change
   * 
   * Note: connectionHealthRef is already declared above at line 991
   */
  const attendeesFreshnessRef = useRef(attendeesFreshness);
  const usersFreshnessRef = useRef(usersFreshness);
  const rolesFreshnessRef = useRef(rolesFreshness);
  const settingsFreshnessRef = useRef(settingsFreshness);
  const logsFreshnessRef = useRef(logsFreshness);

  useEffect(() => {
    attendeesFreshnessRef.current = attendeesFreshness;
    usersFreshnessRef.current = usersFreshness;
    rolesFreshnessRef.current = rolesFreshness;
    settingsFreshnessRef.current = settingsFreshness;
    logsFreshnessRef.current = logsFreshness;
    connectionHealthRef.current = connectionHealth;
  }, [attendeesFreshness, usersFreshness, rolesFreshness, settingsFreshness, logsFreshness, connectionHealth]);

  /**
   * Attendees subscription - Only active when:
   * 1. Page is visible (not in background tab)
   * 2. User is on the attendees tab
   * 
   * This prevents unnecessary WebSocket connections and memory accumulation
   * Uses refs to pass connection health and freshness tracking without
   * causing cascading re-renders
   * 
   * Note: markFresh() is called in refreshAttendees() after successful fetch,
   * not here, to ensure freshness is only marked on successful data retrieval
   */
  useRealtimeSubscription({
    channels: [`databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID}.rows`],
    callback: useCallback((response: any) => {
      console.log('Attendee change received!', response);
      debouncedRefreshAttendees();
    }, [debouncedRefreshAttendees]),
    enabled: isPageVisible && activeTab === 'attendees',
    onConnected: useCallback(() => {
      connectionHealthRef.current?._internal?.markConnected();
    }, []),
  });

  /**
   * Users subscription - Only active when:
   * 1. Page is visible
   * 2. User is on the users tab
   * 
   * Note: markFresh() is called in refreshUsers() after successful fetch,
   * not here, to ensure freshness is only marked on successful data retrieval
   */
  useRealtimeSubscription({
    channels: [`databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID}.rows`],
    callback: useCallback((response: any) => {
      console.log('Users change received!', response);
      debouncedRefreshUsers();
    }, [debouncedRefreshUsers]),
    enabled: isPageVisible && activeTab === 'users',
    onConnected: useCallback(() => {
      connectionHealthRef.current?._internal?.markConnected();
    }, []),
  });

  /**
   * Roles subscription - Only active when:
   * 1. Page is visible
   * 2. User is on the roles tab
   * 
   * Note: markFresh() is called in refreshRoles() after successful fetch,
   * not here, to ensure freshness is only marked on successful data retrieval
   */
  useRealtimeSubscription({
    channels: [`databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID}.rows`],
    callback: useCallback((response: any) => {
      console.log('Roles change received!', response);
      debouncedRefreshRoles();
    }, [debouncedRefreshRoles]),
    enabled: isPageVisible && activeTab === 'roles',
    onConnected: useCallback(() => {
      connectionHealthRef.current?._internal?.markConnected();
    }, []),
  });

  /**
   * Event settings subscription - Only active when:
   * 1. Page is visible
   * 2. User is on the settings tab
   * 
   * Monitors both event settings and custom fields collections
   * 
   * Note: markFresh() is called in refreshEventSettings() after successful fetch,
   * not here, to ensure freshness is only marked on successful data retrieval
   */
  useRealtimeSubscription({
    channels: [
      `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID}.rows`,
      `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID}.rows`
    ],
    callback: useCallback((response: any) => {
      console.log('Event settings or custom fields change received!', response);
      debouncedRefreshEventSettings();
    }, [debouncedRefreshEventSettings]),
    enabled: isPageVisible && activeTab === 'settings',
    onConnected: useCallback(() => {
      connectionHealthRef.current?._internal?.markConnected();
    }, []),
  });

  /**
   * State to pause logs real-time updates during bulk deletion
   * This prevents excessive refreshes during bulk operations
   */
  const [pauseLogsRealtime, setPauseLogsRealtime] = useState(false);

  /**
   * Logs subscription - Only active when:
   * 1. Page is visible
   * 2. User is on the logs tab
   * 3. Not paused during bulk operations
   * 
   * Note: The enabled prop already handles the pauseLogsRealtime check,
   * so no need for redundant checks in the callback
   */
  useRealtimeSubscription({
    channels: [`databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.tables.${process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID}.rows`],
    callback: useCallback((response: any) => {
      console.log('Logs change received!', response);
      debouncedLoadLogs();
      logsFreshnessRef.current?.markFresh();
    }, [debouncedLoadLogs]),
    enabled: isPageVisible && activeTab === 'logs' && !pauseLogsRealtime,
    onConnected: useCallback(() => {
      connectionHealthRef.current?._internal?.markConnected();
    }, []),
  });

  // ============================================================================
  // MEMORY MONITORING (Development Only)
  // ============================================================================

  /**
   * Monitor memory usage in development to detect potential leaks
   * Logs memory stats every 30 seconds when page is visible
   * 
   * Note: performance.memory is only available in Chrome/Edge
   */
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Only monitor when page is visible to avoid noise
    if (!isPageVisible) {
      return;
    }

    const interval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const used = Math.round(memory.usedJSHeapSize / 1048576);
        const total = Math.round(memory.totalJSHeapSize / 1048576);
        const limit = Math.round(memory.jsHeapSizeLimit / 1048576);
        const percentage = Math.round((used / limit) * 100);

        console.log(`[Memory Monitor] Used: ${used}MB / ${limit}MB (${percentage}%) | Total: ${total}MB | Active Tab: ${activeTab}`);

        // Warn if memory usage is high
        if (percentage > 80) {
          console.warn(`[Memory Monitor] High memory usage detected: ${percentage}%`);
        }
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isPageVisible, activeTab]);

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

  /**
   * PERFORMANCE OPTIMIZATION: Memoized Stats Calculations
   * 
   * These values are calculated once and only recalculated when their dependencies change.
   * This prevents expensive array operations (filter, reduce, sort) on every render.
   */

  // Time until event calculation (enhanced with hours and completion state)
  const timeUntilEvent = useMemo(() => {
    if (!eventSettings?.eventDate) return null;
    
    // Build full event datetime using eventTime if available
    const dateStr = typeof eventSettings.eventDate === 'string' 
      ? eventSettings.eventDate 
      : String(eventSettings.eventDate);
    let datePart = dateStr;
    if (dateStr.includes('T')) {
      datePart = dateStr.split('T')[0];
    }
    
    // Parse date parts with explicit validation
    const dateParts = datePart.split('-');
    if (dateParts.length !== 3) {
      return null;
    }
    
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10);
    const day = parseInt(dateParts[2], 10);
    
    // Validate parsed date values
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return null;
    }
    
    let eventDateTime: Date;
    if (eventSettings?.eventTime) {
      const timeParts = eventSettings.eventTime.split(':');
      const hours = timeParts.length >= 1 ? parseInt(timeParts[0], 10) : NaN;
      const minutes = timeParts.length >= 2 ? parseInt(timeParts[1], 10) : 0;
      
      // Validate time values
      if (isNaN(hours) || isNaN(minutes)) {
        eventDateTime = new Date(year, month - 1, day, 23, 59, 59);
      } else {
        eventDateTime = new Date(year, month - 1, day, hours, minutes);
      }
    } else {
      eventDateTime = new Date(year, month - 1, day, 23, 59, 59);
    }
    
    const now = new Date();
    const diffMs = eventDateTime.getTime() - now.getTime();
    
    // Return object with value, unit, and completion state
    if (diffMs <= 0) {
      return { value: 'Event Ended', unit: '', isCompleted: true };
    }
    
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (diffHours < 24) {
      const hours = Math.ceil(diffHours);
      return { value: hours, unit: hours === 1 ? 'Hour' : 'Hours', isCompleted: false };
    }
    
    // Use Math.round instead of Math.ceil for more intuitive day display
    // 2.04 days should show as "2 Days", not "3 Days"
    const days = Math.round(diffDays);
    return { value: days, unit: days === 1 ? 'Day' : 'Days', isCompleted: false };
  }, [eventSettings?.eventDate, eventSettings?.eventTime]);

  // Event date formatting
  const formattedEventDate = useMemo(() => {
    const dateValue = eventSettings?.eventDate;
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
  }, [eventSettings?.eventDate]);

  // Event time formatting
  const formattedEventTime = useMemo(() => {
    if (!eventSettings?.eventTime) return null;
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
  }, [eventSettings?.eventTime, eventSettings?.timeZone]);

  // Credentials generated count
  const credentialsGeneratedCount = useMemo(() => {
    return attendees.filter(a => a.credentialUrl && a.credentialUrl.trim() !== '').length;
  }, [attendees]);

  // Total credential generations
  const totalCredentialGenerations = useMemo(() => {
    const total = attendees.reduce((sum, a) => {
      const count = Number(a.credentialCount);
      return sum + (isNaN(count) || count < 0 ? 0 : count);
    }, 0);
    return total > 0 ? `${total} total generations` : '';
  }, [attendees]);

  // Photos uploaded stats
  const photoStats = useMemo(() => {
    const hasAtomicCounts = attendees.some(a => typeof a.photoUploadCount === 'number');
    const totalUploads = attendees.reduce((sum, a) => {
      // Only use photoUploadCount if it's explicitly a number field
      if (typeof a.photoUploadCount === 'number') {
        return sum + a.photoUploadCount;
      }
      // Fall back to counting based on photoUrl presence
      return sum + (a.photoUrl ? 1 : 0);
    }, 0);
    const attendeesWithPhotos = attendees.filter(a => a.photoUrl).length;
    const percentage = attendees.length > 0 ? Math.round((attendeesWithPhotos / attendees.length) * 100) : 0;
    const displayCount = hasAtomicCounts ? totalUploads : attendeesWithPhotos;
    
    return { displayCount, percentage };
  }, [attendees]);

  // Advanced filter count
  const activeFilterCount = useMemo(() => {
    const hasAccessControlFilters = isAccessControlEnabledForEvent(eventSettings?.accessControlEnabled) && (
      advancedSearchFilters.accessControl.accessStatus !== 'all' ||
      advancedSearchFilters.accessControl.validFromStart ||
      advancedSearchFilters.accessControl.validFromEnd ||
      advancedSearchFilters.accessControl.validUntilStart ||
      advancedSearchFilters.accessControl.validUntilEnd
    );
    
    let count = 0;
    if (advancedSearchFilters.firstName.value || ['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.firstName.operator)) count++;
    if (advancedSearchFilters.lastName.value || ['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.lastName.operator)) count++;
    if (advancedSearchFilters.barcode.value || ['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.barcode.operator)) count++;
    if (advancedSearchFilters.notes.value || ['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.notes.operator)) count++;
    if (advancedSearchFilters.notes.hasNotes) count++;
    if (advancedSearchFilters.photoFilter !== 'all') count++;
    if (advancedSearchFilters.credentialFilter !== 'all') count++;
    if (hasAccessControlFilters) count++;
    
    // Count custom field filters
    Object.values(advancedSearchFilters.customFields).forEach(field => {
      const hasValue = Array.isArray(field.value) ? field.value.length > 0 : !!field.value;
      if (hasValue || field.operator === 'isEmpty' || field.operator === 'isNotEmpty') {
        count++;
      }
    });
    
    return count;
  }, [advancedSearchFilters, eventSettings?.accessControlEnabled]);

  // Active filter chips for display
  const activeFilterChips = useMemo(() => {
    return filtersToChips(advancedSearchFilters, eventSettings);
  }, [advancedSearchFilters, eventSettings]);

  // Most common action in logs (from aggregate metrics)
  // This is now computed server-side from ALL logs, not just the current page
  const mostCommonAction = aggregateMetrics.totalMostCommonAction
    ? formatActionName(aggregateMetrics.totalMostCommonAction)
    : aggregateMetrics.totalMostCommonAction;

  // Logs pagination pages
  const logsPaginationPages = useMemo(() => {
    return buildPageWindow(logsPagination.page, logsPagination.totalPages, 5);
  }, [logsPagination.page, logsPagination.totalPages]);

  // Last updated timestamp formatting
  const formattedLastUpdated = useMemo(() => {
    const timestamp = eventSettings?.updatedAt || eventSettings?.$updatedAt || eventSettings?.createdAt || eventSettings?.$createdAt;
    if (!timestamp) return 'Last updated: Unknown';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Last updated: Unknown';
      return `Last updated ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
    } catch {
      return 'Last updated: Unknown';
    }
  }, [eventSettings?.updatedAt, eventSettings?.$updatedAt, eventSettings?.createdAt, eventSettings?.$createdAt]);

  // Active users count (from aggregate metrics)
  // This is now computed server-side from ALL logs, not just the current page
  const activeUsersCount = aggregateMetrics.totalActiveUsers;

  // Today's activities count (from aggregate metrics)
  // This is now computed server-side from ALL logs, not just the current page
  const todayActivitiesCount = aggregateMetrics.totalTodayCount;

  // Users with roles count
  const usersWithRolesCount = useMemo(() => {
    return users.filter(u => u.role).length;
  }, [users]);

  // Unassigned users count
  const unassignedUsersCount = useMemo(() => {
    return users.filter(u => !u.role).length;
  }, [users]);

  // Permission categories count (unique permission keys across all roles)
  const permissionCategoriesCount = useMemo(() => {
    if (roles.length === 0) return 0;
    return new Set(roles.flatMap(role => Object.keys(role.permissions || {}))).size;
  }, [roles]);

  /**
   * HELPER FUNCTIONS: Extract complex logic from JSX
   * 
   * These functions are defined at component level (not inside render)
   * to avoid recreating them on every render.
   */

  // Helper function for multi-select button display
  const formatMultiSelectButtonText = (values: any): React.ReactNode => {
    const selectedValues = Array.isArray(values) ? values : [];
    
    if (selectedValues.length === 0) {
      return <span className="text-muted-foreground">Select options...</span>;
    } else if (selectedValues.length === 1) {
      return <span>{selectedValues[0]}</span>;
    } else {
      return <span>{selectedValues.length} options selected</span>;
    }
  };

  // Helper function for credential status badge
  const renderCredentialStatusBadge = (attendee: any): React.ReactNode => {
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
  };

  // Helper function for log target name
  const getLogTargetName = (details: any): string => {
    if (details?.firstName && details?.lastName) {
      return `${String(details.firstName)} ${String(details.lastName)}`;
    } else if (details?.roleName) {
      return String(details.roleName);
    } else if (details?.target) {
      return String(details.target);
    } else {
      return 'System';
    }
  };

  // Helper function for log type category
  const getLogTypeCategory = (details: any): string => {
    const type = details?.type;
    if (type === 'attendee' || type === 'attendees') return 'Attendee';
    if (type === 'user' || type === 'users') return 'User';
    if (type === 'role' || type === 'roles') return 'Role';
    if (type === 'settings' || type === 'event_settings') return 'Settings';
    if (type === 'system' || type === 'auth') return 'System Operation';
    return 'General';
  };

  // Helper function for complex log changes formatting
  // Handles mixed-shape objects by checking each entry individually for from/to structure
  const formatComplexLogChanges = (changes: any): React.ReactNode => {
    if (Array.isArray(changes)) {
      // Handle array format (field names only)
      return <>Changed: {(changes as string[]).join(', ')}</>;
    } else if (typeof changes === 'object' && changes !== null) {
      // Check each entry individually for from/to structure
      const entries = Object.entries(changes);
      const hasNewFormatEntries = entries.some(([, v]) => v && typeof v === 'object' && 'from' in v && 'to' in v);
      
      if (hasNewFormatEntries) {
        // Mixed or new format: render each entry according to its shape
        return (
          <div className="space-y-0.5">
            {entries.map(([field, value]) => {
              // Check if this specific entry has from/to structure
              if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
                return (
                  <div key={field}>
                    <span className="font-medium">{field}</span>: {String(value.from)} → {String(value.to)}
                  </div>
                );
              } else if (typeof value === 'boolean') {
                // Legacy format: only show if true
                return value ? <div key={field}>{field}</div> : null;
              } else {
                // Other formats: show as-is
                return (
                  <div key={field}>
                    <span className="font-medium">{field}</span>: {String(value)}
                  </div>
                );
              }
            })}
          </div>
        );
      } else {
        // Legacy format: { field: boolean }
        return <>Changed: {entries
          .filter(([, changed]) => changed === true)
          .map(([field]) => field)
          .join(', ')}
        </>;
      }
    } else {
      // Handle string format (fallback)
      return <>Changed: {String(changes)}</>;
    }
  };

  // Helper function for multi-select clear button
  const renderMultiSelectClearButton = (fieldId: string, values: any, handleChange: (id: string, value: any, operator: string) => void): React.ReactNode => {
    const selectedValues = Array.isArray(values) ? values : [];
    
    if (selectedValues.length > 0) {
      return (
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => handleChange(fieldId, [], 'equals')}
          >
            Clear Selection
          </Button>
        </div>
      );
    }
    return null;
  };

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
          Boolean(attendee.notes && attendee.notes.trim().length > 0);
        const notesFilterMatch = notesMatch && hasNotesMatch;

        // Photo filter
        const photoMatch = advancedSearchFilters.photoFilter === 'all' ||
          (advancedSearchFilters.photoFilter === 'with' && Boolean(attendee.photoUrl)) ||
          (advancedSearchFilters.photoFilter === 'without' && !attendee.photoUrl);

        // Credential filter
        const credentialMatch = advancedSearchFilters.credentialFilter === 'all' ||
          (advancedSearchFilters.credentialFilter === 'with' && Boolean(attendee.credentialUrl)) ||
          (advancedSearchFilters.credentialFilter === 'without' && !attendee.credentialUrl);

        // Custom fields filter
        const customFieldsMatch = Object.entries(advancedSearchFilters.customFields).every(([fieldId, filter]) => {
          // Parse customFieldValues if it's a string
          let parsedCustomFieldValues: any = attendee.customFieldValues;
          if (typeof parsedCustomFieldValues === 'string') {
            try {
              parsedCustomFieldValues = JSON.parse(parsedCustomFieldValues);
            } catch (e) {
              parsedCustomFieldValues = {};
            }
          }

          // Handle both array format (legacy) and object format (current)
          let attendeeValue = '';
          if (Array.isArray(parsedCustomFieldValues)) {
            // Legacy array format
            const attendeeValueObj = parsedCustomFieldValues.find((cfv: any) => cfv.customFieldId === fieldId);
            attendeeValue = attendeeValueObj?.value || '';
          } else if (parsedCustomFieldValues && typeof parsedCustomFieldValues === 'object') {
            // Current object format
            const fieldValue = parsedCustomFieldValues[fieldId];
            if (Array.isArray(fieldValue)) {
              attendeeValue = fieldValue.join(', ');
            } else if (fieldValue !== undefined && fieldValue !== null) {
              attendeeValue = String(fieldValue);
            }
          }
          
          const hasValue = !!attendeeValue;

          // If no operator or value (for operators that need it), match all
          if (!filter.operator || (filter.operator !== 'isEmpty' && filter.operator !== 'isNotEmpty' && !filter.value)) {
            return true;
          }

          // Handle multi-select for select fields (array of values)
          if (Array.isArray(filter.value)) {
            // If empty array, match all (no filter applied)
            if (filter.value.length === 0) {
              return true;
            }
            // For multi-select, check if ANY of the attendee's values match ANY of the selected filter options
            const attendeeValues = attendeeValue.split(',').map(v => v.trim().toLowerCase());
            return filter.value.some(selectedValue => 
              attendeeValues.includes(selectedValue.toLowerCase())
            );
          }

          switch (filter.operator) {
            case 'isEmpty':
              return !hasValue;
            case 'isNotEmpty':
              return hasValue;
            case 'contains':
              return hasValue && attendeeValue.toLowerCase().includes((filter.value as string).toLowerCase());
            case 'equals':
              return hasValue && attendeeValue.toLowerCase() === (filter.value as string).toLowerCase();
            case 'startsWith':
              return hasValue && attendeeValue.toLowerCase().startsWith((filter.value as string).toLowerCase());
            case 'endsWith':
              return hasValue && attendeeValue.toLowerCase().endsWith((filter.value as string).toLowerCase());
            default:
              // For select and boolean, it's an equals check
              return hasValue && attendeeValue.toLowerCase() === (filter.value as string).toLowerCase();
          }
        });

        // Access Control filter (only if access control is enabled globally AND for this event)
        let accessControlMatch = true;
        if (isAccessControlEnabledForEvent(eventSettings?.accessControlEnabled)) {
          const { accessStatus, validFromStart, validFromEnd, validUntilStart, validUntilEnd } = advancedSearchFilters.accessControl;
          
          // Access status filter
          if (accessStatus !== 'all') {
            const isActive = attendee.accessEnabled !== false;
            accessControlMatch = accessStatus === 'active' ? isActive : !isActive;
          }
          
          // Valid From date range filter
          if (accessControlMatch && (validFromStart || validFromEnd)) {
            const attendeeValidFrom = attendee.validFrom ? attendee.validFrom.split('T')[0] : null;
            if (validFromStart && attendeeValidFrom) {
              accessControlMatch = attendeeValidFrom >= validFromStart;
            }
            if (accessControlMatch && validFromEnd && attendeeValidFrom) {
              accessControlMatch = attendeeValidFrom <= validFromEnd;
            }
            // If attendee has no validFrom but filter is set, exclude them
            if ((validFromStart || validFromEnd) && !attendeeValidFrom) {
              accessControlMatch = false;
            }
          }
          
          // Valid Until date range filter
          if (accessControlMatch && (validUntilStart || validUntilEnd)) {
            const attendeeValidUntil = attendee.validUntil ? attendee.validUntil.split('T')[0] : null;
            if (validUntilStart && attendeeValidUntil) {
              accessControlMatch = attendeeValidUntil >= validUntilStart;
            }
            if (accessControlMatch && validUntilEnd && attendeeValidUntil) {
              accessControlMatch = attendeeValidUntil <= validUntilEnd;
            }
            // If attendee has no validUntil but filter is set, exclude them
            if ((validUntilStart || validUntilEnd) && !attendeeValidUntil) {
              accessControlMatch = false;
            }
          }
        }

        // Apply match mode logic (AND vs OR)
        const matchMode = advancedSearchFilters.matchMode || 'all';
        
        if (matchMode === 'all') {
          // AND logic: all filters must match
          return firstNameMatch && lastNameMatch && barcodeMatch && notesFilterMatch && photoMatch && credentialMatch && customFieldsMatch && accessControlMatch;
        } else {
          // OR logic: at least one active filter must match
          // First, check which filters are actually active (not default/empty)
          const activeFilters: boolean[] = [];
          
          // Text filters are active if they have a value or use isEmpty/isNotEmpty
          const isFirstNameActive = advancedSearchFilters.firstName.value || ['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.firstName.operator);
          const isLastNameActive = advancedSearchFilters.lastName.value || ['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.lastName.operator);
          const isBarcodeActive = advancedSearchFilters.barcode.value || ['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.barcode.operator);
          const isNotesActive = advancedSearchFilters.notes.value || ['isEmpty', 'isNotEmpty'].includes(advancedSearchFilters.notes.operator) || advancedSearchFilters.notes.hasNotes;
          const isPhotoActive = advancedSearchFilters.photoFilter !== 'all';
          const isCredentialActive = advancedSearchFilters.credentialFilter !== 'all';
          const isCustomFieldsActive = Object.values(advancedSearchFilters.customFields).some(f => {
            const hasValue = Array.isArray(f.value) ? f.value.length > 0 : !!f.value;
            return hasValue || f.operator === 'isEmpty' || f.operator === 'isNotEmpty';
          });
          const isAccessControlActive = isAccessControlEnabledForEvent(eventSettings?.accessControlEnabled) && (
            advancedSearchFilters.accessControl.accessStatus !== 'all' ||
            advancedSearchFilters.accessControl.validFromStart ||
            advancedSearchFilters.accessControl.validFromEnd ||
            advancedSearchFilters.accessControl.validUntilStart ||
            advancedSearchFilters.accessControl.validUntilEnd
          );
          
          // Add active filter results
          if (isFirstNameActive) activeFilters.push(firstNameMatch);
          if (isLastNameActive) activeFilters.push(lastNameMatch);
          if (isBarcodeActive) activeFilters.push(barcodeMatch);
          if (isNotesActive) activeFilters.push(notesFilterMatch);
          if (isPhotoActive) activeFilters.push(photoMatch);
          if (isCredentialActive) activeFilters.push(credentialMatch);
          if (isCustomFieldsActive) activeFilters.push(customFieldsMatch);
          if (isAccessControlActive) activeFilters.push(accessControlMatch);
          
          // If no filters are active, show all results
          if (activeFilters.length === 0) return true;
          
          // OR: at least one must be true
          return activeFilters.some(match => match);
        }
      } else {
        // Use simple search
        const basicMatch = `${attendee.firstName} ${attendee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          attendee.barcodeNumber.toLowerCase().includes(searchTerm.toLowerCase());

        // Search in custom field values
        let customFieldMatch = false;
        let parsedCustomFieldValues: any = attendee.customFieldValues;
        if (typeof parsedCustomFieldValues === 'string') {
          try {
            parsedCustomFieldValues = JSON.parse(parsedCustomFieldValues);
          } catch (e) {
            parsedCustomFieldValues = {};
          }
        }

        if (Array.isArray(parsedCustomFieldValues)) {
          // Legacy array format
          customFieldMatch = parsedCustomFieldValues.some((cfv: any) =>
            cfv.value && cfv.value.toLowerCase().includes(searchTerm.toLowerCase())
          );
        } else if (parsedCustomFieldValues && typeof parsedCustomFieldValues === 'object') {
          // Current object format
          customFieldMatch = Object.values(parsedCustomFieldValues).some((value: any) => {
            if (Array.isArray(value)) {
              return value.some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()));
            }
            return value && String(value).toLowerCase().includes(searchTerm.toLowerCase());
          });
        }

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

  // Attendees pagination pages (must be after totalPages is defined)
  const attendeesPaginationPages = useMemo(() => {
    return buildPageWindow(currentPage, totalPages, 5);
  }, [currentPage, totalPages]);

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
        credentialFilter: 'all',
        customFields,
        accessControl: {
          accessStatus: 'all',
          validFromStart: '',
          validFromEnd: '',
          validUntilStart: '',
          validUntilEnd: ''
        },
        matchMode: 'all'
      });
    }
  };

  // Check if advanced search has any active filters
  // Uses the memoized activeFilterCount to avoid duplication
  const hasAdvancedFilters = () => activeFilterCount > 0;

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

  const handleCustomFieldSearchChange = (fieldId: string, value: string | string[], operator?: string) => {
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
          ...(prev.customFields[fieldId] || { value: '', operator: 'contains' }),
          operator,
          // Clear value if operator doesn't need it
          value: ['isEmpty', 'isNotEmpty'].includes(operator) ? '' : prev.customFields[fieldId]?.value ?? '',
        }
      }
    }));
  };

  const clearAdvancedSearch = () => {
    const customFields: { [key: string]: { value: string | string[]; operator: string } } = {};
    eventSettings?.customFields?.forEach((field: any) => {
      // Use empty array for select fields, empty string for others
      customFields[field.id] = { 
        value: field.fieldType === 'select' ? [] : '', 
        operator: 'contains' 
      };
    });
    setAdvancedSearchFilters({
      firstName: { value: '', operator: 'contains' },
      lastName: { value: '', operator: 'contains' },
      barcode: { value: '', operator: 'contains' },
      notes: { value: '', operator: 'contains', hasNotes: false },
      photoFilter: 'all',
      credentialFilter: 'all',
      customFields,
      accessControl: {
        accessStatus: 'all',
        validFromStart: '',
        validFromEnd: '',
        validUntilStart: '',
        validUntilEnd: ''
      },
      matchMode: 'all'
    });
  };

  // Remove individual filter by chip
  const removeIndividualFilter = (chip: FilterChip) => {
    setAdvancedSearchFilters(prev => {
      const updated = { ...prev };
      
      switch (chip.filterKey) {
        case 'firstName':
          updated.firstName = { value: '', operator: 'contains' };
          break;
        case 'lastName':
          updated.lastName = { value: '', operator: 'contains' };
          break;
        case 'barcode':
          updated.barcode = { value: '', operator: 'contains' };
          break;
        case 'photoFilter':
          updated.photoFilter = 'all';
          break;
        case 'credentialFilter':
          updated.credentialFilter = 'all';
          break;
        case 'notes':
          updated.notes = { ...updated.notes, value: '', operator: 'contains' };
          break;
        case 'hasNotes':
          updated.notes = { ...updated.notes, hasNotes: false };
          break;
        case 'accessStatus':
          updated.accessControl = { ...updated.accessControl, accessStatus: 'all' };
          break;
        case 'validFrom':
          updated.accessControl = { ...updated.accessControl, validFromStart: '', validFromEnd: '' };
          break;
        case 'validUntil':
          updated.accessControl = { ...updated.accessControl, validUntilStart: '', validUntilEnd: '' };
          break;
        case 'customField':
          if (chip.customFieldId) {
            // Look up field type inside updater to use current eventSettings
            const field = eventSettings?.customFields?.find((f: any) => f.id === chip.customFieldId);
            updated.customFields = {
              ...updated.customFields,
              [chip.customFieldId]: {
                value: field?.fieldType === 'select' ? [] : '',
                operator: 'contains'
              }
            };
          }
          break;
      }
      
      // Collapse advanced search if no active filters remain after this update
      if (!checkHasActiveFilters(updated)) {
        setShowAdvancedSearch(false);
      }
      
      return updated;
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
        const errorMessage = errorData.error || 'Failed to save attendee';

        close();

        // Show user-friendly error dialog based on error type
        if (errorMessage.toLowerCase().includes('barcode')) {
          // Build detailed message with existing attendee info if available
          let detailedMessage = "This barcode number already exists in the system.";

          if (errorData.existingAttendee) {
            const { firstName, lastName, barcodeNumber } = errorData.existingAttendee;
            detailedMessage += `\n\nThis barcode is currently assigned to:\n${firstName} ${lastName} (${barcodeNumber})`;
          }

          detailedMessage += "\n\nPlease generate a new barcode or enter a different number.";

          await alert({
            title: "Duplicate Barcode Number",
            text: detailedMessage,
            icon: "error",
            confirmButtonText: "OK"
          });
        } else {
          await alert({
            title: "Unable to Save Attendee",
            text: errorMessage,
            icon: "error",
            confirmButtonText: "OK"
          });
        }
        return;
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
      error("Unexpected Error", "An unexpected error occurred while saving the attendee. Please try again.");
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
        const errorMessage = errorData.error || 'Failed to save attendee';

        close();

        // Show user-friendly error dialog based on error type
        if (errorMessage.toLowerCase().includes('barcode')) {
          // Build detailed message with existing attendee info if available
          let detailedMessage = "This barcode number already exists in the system.";

          if (errorData.existingAttendee) {
            const { firstName, lastName, barcodeNumber } = errorData.existingAttendee;
            detailedMessage += `\n\nThis barcode is currently assigned to:\n${firstName} ${lastName} (${barcodeNumber})`;
          }

          detailedMessage += "\n\nPlease generate a new barcode or enter a different number.";

          await alert({
            title: "Duplicate Barcode Number",
            text: detailedMessage,
            icon: "error",
            confirmButtonText: "OK"
          });
        } else {
          await alert({
            title: "Unable to Save Attendee",
            text: errorMessage,
            icon: "error",
            confirmButtonText: "OK"
          });
        }
        return;
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
      error("Unexpected Error", "An unexpected error occurred while saving the attendee. Please try again.");
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
        // Create detailed error message with all available information
        let errorMessage = error.error || 'Failed to generate credential';
        if (error.details) {
          errorMessage += `\n\nDetails: ${error.details}`;
        }
        if (error.statusCode) {
          errorMessage += `\nStatus Code: ${error.statusCode}`;
        }
        if (error.responseBody) {
          errorMessage += `\nAPI Response: ${error.responseBody}`;
        }
        if (error.endpoint) {
          errorMessage += `\nEndpoint: ${error.endpoint}`;
        }
        if (error.hint) {
          errorMessage += `\nHint: ${error.hint}`;
        }
        throw new Error(errorMessage);
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

      // Open the generated credential in a new tab with cache-busting parameter
      if (result.credentialUrl) {
        const cacheBustedUrl = `${result.credentialUrl}?v=${Date.now()}`;
        window.open(cacheBustedUrl, '_blank');
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
            <p style="margin-bottom: 12px;"><strong>Attendee:</strong> ${escapeHtml(attendeeName)}</p>
            <p style="margin-bottom: 12px;"><strong>Error Details:</strong></p>
            <pre style="color: #ef4444; font-family: monospace; font-size: 0.85em; background: #fee; padding: 12px; border-radius: 6px; word-break: break-word; white-space: pre-wrap; max-height: 400px; overflow-y: auto; margin: 0;">${escapeHtml(err.message || 'Failed to generate credential')}</pre>
            <p style="margin-top: 12px; font-size: 0.9em; color: #6b7280;">
              <strong>Tip:</strong> Check your integration settings in Event Settings > Integrations if this error persists.
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
        const errorResponse = await response.json();
        // Create detailed error message with all available information
        let errorMessage = errorResponse.error || 'Failed to print credential';
        if (errorResponse.details) {
          errorMessage += `\n\nDetails: ${errorResponse.details}`;
        }
        if (errorResponse.statusCode) {
          errorMessage += `\nStatus Code: ${errorResponse.statusCode}`;
        }
        if (errorResponse.responseBody) {
          errorMessage += `\nAPI Response: ${errorResponse.responseBody}`;
        }
        if (errorResponse.endpoint) {
          errorMessage += `\nEndpoint: ${errorResponse.endpoint}`;
        }
        if (errorResponse.hint) {
          errorMessage += `\nHint: ${errorResponse.hint}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Open the generated image in a new tab for printing with cache-busting parameter
      if (result.credential?.imageUrl) {
        const cacheBustedUrl = `${result.credential.imageUrl}?v=${Date.now()}`;
        window.open(cacheBustedUrl, '_blank');
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

  // Ref to hold the PDF polling interval so it can be cleared from anywhere
  const pdfPollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPdfPolling = () => {
    if (pdfPollingIntervalRef.current !== null) {
      clearInterval(pdfPollingIntervalRef.current);
      pdfPollingIntervalRef.current = null;
    }
  };

  // Clear the polling interval when the component unmounts
  useEffect(() => () => stopPdfPolling(), []);

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

    // Show the toast immediately so the user gets instant feedback
    // while the start request (validation + job creation + function trigger) completes
    const optimisticCount = attendeesWithCredentials.length;
    setPdfToast({ status: "generating", attendeeCount: optimisticCount });

    try {
      // Step 1: POST to Start Endpoint to create the async job
      const startResponse = await fetch('/api/attendees/bulk-export-pdf-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendeeIds: attendeesWithCredentials.map(a => a.id),
        }),
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json();

        // Handle missing credentials error
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
          setPdfToast(null);
          setExportingPdfs(false);
          return;
        }

        // Handle outdated credentials error
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
          setPdfToast(null);
          setExportingPdfs(false);
          return;
        }

        throw new Error(errorData.details ? `${errorData.error}: ${errorData.details}` : (errorData.error || 'Failed to start PDF generation'));
      }

      const { jobId } = await startResponse.json();
      const attendeeCount = attendeesWithCredentials.length;

      // Step 2: Show non-blocking toast notification
      setPdfToast({ status: "generating", attendeeCount });

      // Track polling start time for 10-minute timeout
      const pollStartTime = Date.now();
      const POLL_INTERVAL_MS = 3000;
      const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

      // Step 3: Poll the Status Endpoint every 3 seconds
      pdfPollingIntervalRef.current = setInterval(async () => {
        // Step 7: Timeout after 10 minutes
        if (Date.now() - pollStartTime >= TIMEOUT_MS) {
          stopPdfPolling();
          setExportingPdfs(false);
          setPdfToast({ status: "timeout", attendeeCount });
          return;
        }

        try {
          const statusResponse = await fetch(
            `/api/attendees/pdf-job-status?jobId=${encodeURIComponent(jobId)}`
          );

          if (!statusResponse.ok) {
            // Terminal statuses — stop polling and surface the error immediately
            if (statusResponse.status === 403 || statusResponse.status === 404) {
              stopPdfPolling();
              setExportingPdfs(false);
              const msg = statusResponse.status === 403
                ? 'Access denied. You do not have permission to view this export.'
                : 'Export job not found. It may have been deleted.';
              setPdfToast({ status: "failed", attendeeCount, errorMessage: msg });
              return;
            }
            // Other non-OK statuses — transient, keep polling
            console.warn('PDF status poll returned non-OK:', statusResponse.status);
            return;
          }

          const statusData = await statusResponse.json();

          // Step 4: Completed — update toast (no auto-open, user clicks the link)
          if (statusData.status === 'completed' && statusData.pdfUrl) {
            stopPdfPolling();
            setExportingPdfs(false);
            const pdfUrl = statusData.pdfUrl;
            const count = statusData.attendeeCount ?? attendeeCount;
            setPdfToast({ status: "completed", attendeeCount: count, pdfUrl });
            return;
          }

          // Step 5: Failed — show error in toast
          if (statusData.status === 'failed') {
            stopPdfPolling();
            setExportingPdfs(false);
            setPdfToast({
              status: "failed",
              attendeeCount,
              errorMessage: statusData.error || 'PDF generation failed. Please try again.',
            });
            return;
          }

          // Still pending or processing — keep polling
        } catch (pollErr: any) {
          console.error('Error polling PDF job status:', pollErr);
          // Keep polling on transient network errors
        }
      }, POLL_INTERVAL_MS);

    } catch (err: any) {
      console.error('Error starting bulk PDF export:', err);
      stopPdfPolling();
      setPdfToast(null);
      setExportingPdfs(false);
      error("Export Error", err.message || "Failed to start PDF generation");
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
              // Build comprehensive error message
              let detailedError = errorData.error || errorMessage;
              if (errorData.details) {
                detailedError += ` - ${errorData.details}`;
              }
              if (errorData.statusCode) {
                detailedError += ` (Status: ${errorData.statusCode})`;
              }
              if (errorData.errorType) {
                detailedError += ` [${errorData.errorType}]`;
              }
              if (errorData.responseBody && errorData.responseBody.length < 200) {
                detailedError += ` Response: ${errorData.responseBody}`;
              } else if (errorData.responseBody) {
                detailedError += ` Response: ${errorData.responseBody.substring(0, 200)}...`;
              }
              errorMessage = detailedError;
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
          `<li style="margin-bottom: 10px; color: #ef4444; font-size: 0.9em; word-break: break-word;">${escapeHtml(err)}</li>`
        ).join('');
        const moreErrors = errors.length > 5 ? `<li style="margin-top: 8px; color: #6b7280; font-style: italic;">...and ${errors.length - 5} more errors</li>` : '';

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
                <ul style="margin: 0; padding-left: 20px; font-size: 0.85em; max-height: 300px; overflow-y: auto; font-family: monospace;">
                  ${errorListHtml}
                  ${moreErrors}
                </ul>
                <p style="margin-top: 12px; font-size: 0.9em; color: #6b7280; font-family: sans-serif;">
                  <strong>Tip:</strong> Check your integration settings in Event Settings > Integrations if errors persist.
                </p>
              </div>
            </div>
          `,
          icon: 'warning',
          confirmButtonText: 'OK, I Understand'
        });
      } else {
        // Complete failure - show detailed error modal
        const errorListHtml = errors.slice(0, 5).map(err =>
          `<li style="margin-bottom: 10px; color: #ef4444; font-size: 0.9em; word-break: break-word;">${escapeHtml(err)}</li>`
        ).join('');
        const moreErrors = errors.length > 5 ? `<li style="margin-top: 8px; color: #6b7280; font-style: italic;">...and ${errors.length - 5} more errors</li>` : '';

        await alert({
          title: 'Credential Generation Failed',
          html: `
            <div style="text-align: left;">
              <p style="margin-bottom: 16px; color: #ef4444;">
                Failed to generate any credentials. Please review the errors below:
              </p>
              <div style="background: #fee; padding: 12px; border-radius: 6px;">
                <p style="margin-bottom: 8px; font-weight: 600;">Error Details:</p>
                <ul style="margin: 0; padding-left: 20px; font-size: 0.85em; max-height: 300px; overflow-y: auto; font-family: monospace;">
                  ${errorListHtml}
                  ${moreErrors}
                </ul>
                <p style="margin-top: 12px; font-size: 0.9em; color: #6b7280; font-family: sans-serif;">
                  <strong>Tip:</strong> Check your integration settings in Event Settings > Integrations if errors persist.
                </p>
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

  const handleBulkClearCredentials = async () => {
    if (selectedAttendees.length === 0) {
      error("No Selection", "Please select attendees to clear credentials for.");
      return;
    }

    // Filter attendees that have credentials
    const selectedAttendeesData = attendees.filter(attendee =>
      selectedAttendees.includes(attendee.id)
    );

    const attendeesWithCredentials = selectedAttendeesData.filter(attendee =>
      attendee.credentialUrl && attendee.credentialUrl.trim() !== ''
    );

    if (attendeesWithCredentials.length === 0) {
      info("No Credentials", "None of the selected attendees have credentials to clear.");
      return;
    }

    const confirmed = await confirm({
      title: 'Clear Credentials',
      text: `Are you sure you want to clear credentials for ${attendeesWithCredentials.length} attendee${attendeesWithCredentials.length !== 1 ? 's' : ''}? This action cannot be undone.`,
      icon: 'warning',
      confirmButtonText: 'Clear Credentials',
      cancelButtonText: 'Cancel'
    });

    if (!confirmed) {
      return;
    }

    setBulkClearingCredentials(true);

    // Show SweetAlert2 progress modal
    const updateProgress = showProgressModal(isDark);
    updateProgress({
      title: 'Clearing Credentials',
      text: 'Processing credentials for selected attendees...',
      current: 0,
      total: attendeesWithCredentials.length,
    });

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      // Call bulk endpoint once with all attendee IDs
      const attendeeIds = attendeesWithCredentials.map(a => a.id);
      const response = await fetch('/api/attendees/bulk-clear-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ attendeeIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear credentials');
      }

      const result = await response.json();
      successCount = result.successCount || 0;
      errorCount = result.errorCount || 0;

      // Build error list from server response
      if (result.errors && Array.isArray(result.errors)) {
        for (const err of result.errors) {
          const attendee = attendeesWithCredentials.find(a => a.id === err.attendeeId);
          const attendeeName = attendee ? `${attendee.firstName} ${attendee.lastName}` : err.attendeeId;
          errors.push(`${attendeeName}: ${err.error}`);
        }
      }

      // Update local state for successfully cleared attendees
      setAttendees(prev => prev.map(a => {
        if (attendeeIds.includes(a.id)) {
          return { ...a, credentialUrl: null, credentialGeneratedAt: null };
        }
        return a;
      }));

      // Close progress modal immediately after bulk request completes
      if (typeof closeProgressModal === 'function') {
        try {
          closeProgressModal();
        } catch (cleanupError) {
          console.error('Error closing progress modal:', cleanupError);
        }
      }

      // Show final results
      if (successCount > 0 && errorCount === 0) {
        success("Success", `Successfully cleared ${successCount} credential${successCount === 1 ? '' : 's'}.`);
      } else if (successCount > 0 && errorCount > 0) {
        // Partial success - show detailed error modal
        const errorListHtml = errors.slice(0, 5).map(err =>
          `<li style="margin-bottom: 8px; color: #ef4444; font-size: 0.9em; word-break: break-word;">${escapeHtml(err)}</li>`
        ).join('');
        const moreErrors = errors.length > 5 ? `<li style="margin-top: 8px; color: #6b7280;">...and ${errors.length - 5} more errors</li>` : '';

        await alert({
          title: 'Partial Success',
          html: `
            <div style="text-align: left;">
              <p style="margin-bottom: 16px;">
                <strong style="color: #10b981;">✓ Successfully cleared:</strong> ${successCount} credential${successCount === 1 ? '' : 's'}
              </p>
              <p style="margin-bottom: 12px;">
                <strong style="color: #ef4444;">✗ Failed to clear:</strong> ${errorCount} credential${errorCount === 1 ? '' : 's'}
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
          `<li style="margin-bottom: 8px; color: #ef4444;">${escapeHtml(err)}</li>`
        ).join('');
        const moreErrors = errors.length > 5 ? `<li style="margin-top: 8px; color: #6b7280;">...and ${errors.length - 5} more errors</li>` : '';

        await alert({
          title: 'Credential Clear Failed',
          html: `
            <div style="text-align: left;">
              <p style="margin-bottom: 16px; color: #ef4444;">
                Failed to clear any credentials. Please review the errors below:
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

    } catch (err) {
      // Defensive close in catch block
      if (typeof closeProgressModal === 'function') {
        try {
          closeProgressModal();
        } catch (cleanupError) {
          console.error('Error closing progress modal:', cleanupError);
        }
      }
      console.error('Error in bulk clear credentials:', err);
      error("Error", "An unexpected error occurred while clearing credentials.");
    } finally {
      setBulkClearingCredentials(false);
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

      // Show transaction status in success message
      const transactionInfo = result.usedTransactions
        ? ' (using atomic transactions)'
        : ' (using sequential updates)';
      success("Success", `Successfully updated ${result.updatedCount} attendees${transactionInfo}.`);

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
    // Only load logs if user is authenticated and has permission
    if (currentUser && activeTab === 'logs' && canAccessTab(currentUser?.role, 'logs')) {
      loadLogs();
    }
  }, [activeTab, currentUser, loadLogs]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <div className="text-center">
          <div className="mb-6">
            <IdCard className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              {eventSettings?.eventName || 'credential.studio'}
            </h2>
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* PDF Generation Toast — non-blocking bottom-right notification */}
      {pdfToast && (
        <PdfGenerationToast
          status={pdfToast.status}
          attendeeCount={pdfToast.attendeeCount}
          pdfUrl={pdfToast.pdfUrl}
          errorMessage={pdfToast.errorMessage}
          onDismiss={() => setPdfToast(null)}
        />
      )}
      {/* Sidebar */}
      <aside className="w-64 border-r glass-effect bg-gradient-to-br from-background via-surface to-surface-variant self-start">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-3">
            <IdCard className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">credential.studio</span>
          </div>

            {/* Event Banner */}
            {eventSettings?.bannerImageUrl && (
              <div className="mb-6">
                <img
                  src={eventSettings.bannerImageUrl}
                  alt={eventSettings.eventName}
                  className="w-full h-24 object-contain rounded-lg bg-muted/30"
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
                      {formattedEventDate}
                    </span>
                  </div>
                  {eventSettings.eventTime && formattedEventTime && (
                    <div className="flex items-center justify-center text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span>
                        {formattedEventTime}
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
                  type="button"
                  variant={activeTab === "attendees" ? "default" : "ghost"}
                  className="w-full justify-start text-base"
                  onClick={() => setActiveTab("attendees")}
                >
                  <Users className={`mr-2 h-4 w-4 ${activeTab !== "attendees" ? "text-primary" : ""}`} />
                  Attendees
                </Button>
              )}
              {canAccessTab(currentUser?.role, 'eventSettings') && (
                <Button
                  type="button"
                  variant={activeTab === "settings" ? "default" : "ghost"}
                  className="w-full justify-start text-base"
                  onClick={() => setActiveTab("settings")}
                >
                  <Settings className={`mr-2 h-4 w-4 ${activeTab !== "settings" ? "text-primary" : ""}`} />
                  Event Settings
                </Button>
              )}
              {canAccessTab(currentUser?.role, 'users') && (
                <Button
                  type="button"
                  variant={activeTab === "users" ? "default" : "ghost"}
                  className="w-full justify-start text-base"
                  onClick={() => setActiveTab("users")}
                >
                  <UsersRound className={`mr-2 h-4 w-4 ${activeTab !== "users" ? "text-primary" : ""}`} />
                  User Management
                </Button>
              )}
              {canAccessTab(currentUser?.role, 'roles') && (
                <Button
                  type="button"
                  variant={activeTab === "roles" ? "default" : "ghost"}
                  className="w-full justify-start text-base"
                  onClick={() => setActiveTab("roles")}
                >
                  <Shield className={`mr-2 h-4 w-4 ${activeTab !== "roles" ? "text-primary" : ""}`} />
                  Roles
                </Button>
              )}
              {canAccessTab(currentUser?.role, 'logs') && (
                <Button
                  type="button"
                  variant={activeTab === "logs" ? "default" : "ghost"}
                  className="w-full justify-start text-base"
                  onClick={() => setActiveTab("logs")}
                >
                  <Activity className={`mr-2 h-4 w-4 ${activeTab !== "logs" ? "text-primary" : ""}`} />
                  Activity Logs
                </Button>
              )}
              {canAccessTab(currentUser?.role, 'monitoring') && (
                <Button
                  type="button"
                  variant={activeTab === "monitoring" ? "default" : "ghost"}
                  className="w-full justify-start text-base"
                  onClick={() => setActiveTab("monitoring")}
                >
                  <BarChart3 className={`mr-2 h-4 w-4 ${activeTab !== "monitoring" ? "text-primary" : ""}`} />
                  Operator Monitoring
                </Button>
              )}
              {canAccessTab(currentUser?.role, 'accessControl') && (
                <Button
                  type="button"
                  variant={activeTab === "accessControl" ? "default" : "ghost"}
                  className="w-full justify-start text-base"
                  onClick={() => setActiveTab("accessControl")}
                >
                  <QrCode className={`mr-2 h-4 w-4 ${activeTab !== "accessControl" ? "text-primary" : ""}`} />
                  Access Control
                </Button>
              )}
              <Button
                type="button"
                variant={activeTab === "exports" ? "default" : "ghost"}
                className="w-full justify-start text-base"
                onClick={() => setActiveTab("exports")}
              >
                <FileDown className={`mr-2 h-4 w-4 ${activeTab !== "exports" ? "text-primary" : ""}`} />
                Exports
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start text-base"
                onClick={() => window.open('https://help.credential.studio', '_blank', 'noopener,noreferrer')}
              >
                <HelpCircle className="mr-2 h-4 w-4 text-primary" />
                Help Center
              </Button>
            </nav>
          </div>

        {/* User Profile — directly below tabs */}
        <div className="p-6 border-t bg-background">
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
      <main className="flex-1 min-w-0" style={{ backgroundColor: '#F1F5F9' }}>
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
                {activeTab === "monitoring" && "Operator Monitoring"}
                {activeTab === "accessControl" && "Access Control"}
                {activeTab === "exports" && "Exports"}
              </h1>
              <p className="text-muted-foreground">
                {activeTab === "attendees" && "Manage event attendees and their credentials"}
                {activeTab === "users" && "Manage system users and their access"}
                {activeTab === "roles" && "Configure user roles and permissions"}
                {activeTab === "settings" && "Configure event settings and integrations"}
                {activeTab === "logs" && "View system activity and audit trail"}
                {activeTab === "monitoring" && "Monitor database operator performance and manage feature flags"}
                {activeTab === "accessControl" && "Manage approval profiles and view scan logs"}
                {activeTab === "exports" && "View and download your PDF credential exports"}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Connection Status Indicator */}
              <ConnectionStatusIndicator
                connectionState={connectionHealth.state}
                onReconnect={connectionHealth.reconnect}
              />
              
              {activeTab === "attendees" && hasPermission(currentUser?.role, 'attendees', 'create') && (
                <Button onClick={() => {
                  setEditingAttendee(null);
                  setShowAttendeeForm(true);
                  refreshEventSettings().catch(err => console.error('Failed to refresh event settings:', err));
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
                <Button onClick={() => {
                  setEditingRole(null);
                  setShowRoleForm(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Role
                </Button>
              )}
              {activeTab === "settings" && (hasPermission(currentUser?.role, 'eventSettings', 'create') || hasPermission(currentUser?.role, 'eventSettings', 'update')) && (
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
                <Card className={`bg-gradient-to-br ${timeUntilEvent?.isCompleted ? 'from-slate-50 to-slate-100 border-slate-200 dark:from-slate-950/50 dark:to-slate-900/50 dark:border-slate-800/50' : 'from-blue-50 to-blue-100 border-blue-200 dark:from-blue-950/50 dark:to-blue-900/50 dark:border-blue-800/50'} hover:shadow-lg transition-all duration-300 hover:scale-105`}>
                  <CardContent className="flex items-center p-4">
                    <div className={`p-3 rounded-lg ${timeUntilEvent?.isCompleted ? 'bg-slate-500/20 dark:bg-slate-400/20' : 'bg-blue-500/20 dark:bg-blue-400/20'}`}>
                      <Calendar className={`h-8 w-8 ${timeUntilEvent?.isCompleted ? 'text-slate-600 dark:text-slate-400' : 'text-blue-600 dark:text-blue-400'}`} />
                    </div>
                    <div className="ml-4">
                      <p className={`text-sm font-medium ${timeUntilEvent?.isCompleted ? 'text-slate-700 dark:text-slate-300' : 'text-blue-700 dark:text-blue-300'}`}>
                        {timeUntilEvent?.isCompleted ? 'Event Status' : `${timeUntilEvent?.unit || 'Time'} Until Event`}
                      </p>
                      <p className={`${timeUntilEvent?.isCompleted ? 'text-2xl' : 'text-4xl'} font-bold ${timeUntilEvent?.isCompleted ? 'text-slate-900 dark:text-slate-100' : 'text-blue-900 dark:text-blue-100'}`}>
                        {timeUntilEvent ? timeUntilEvent.value : '--'}
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
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Credentials Generated</p>
                      <p className="text-4xl font-bold text-purple-900 dark:text-purple-100">
                        {credentialsGeneratedCount}
                      </p>
                      <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mt-1">
                        {totalCredentialGenerations}
                      </p>
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
                      <p className="text-4xl font-bold text-amber-900 dark:text-amber-100">{photoStats.displayCount}</p>
                      <p className="text-xs font-normal text-amber-700 dark:text-amber-300">{photoStats.percentage}% have photos</p>
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
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm"
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
                      <Button
                        variant="outline"
                        className="flex items-center space-x-2"
                        data-advanced-search-trigger
                        onClick={() => {
                          // Merge newly added custom fields and remove stale ones
                          setAdvancedSearchFilters(prev => {
                            const validFieldIds = new Set(eventSettings?.customFields?.map((f: any) => f.id) || []);
                            const mergedCustomFields: Record<string, any> = {};
                            
                            // Keep only filters for fields that still exist
                            Object.entries(prev.customFields).forEach(([fieldId, filter]) => {
                              if (validFieldIds.has(fieldId)) {
                                mergedCustomFields[fieldId] = filter;
                              }
                            });
                            
                            // Add new fields
                            eventSettings?.customFields?.forEach((field: any) => {
                              if (field.id && !mergedCustomFields[field.id]) {
                                mergedCustomFields[field.id] = { value: '', operator: 'contains' };
                              }
                            });
                            
                            return {
                              ...prev,
                              customFields: mergedCustomFields
                            };
                          });
                          setAdvancedFiltersDialogOpen(true);
                        }}
                      >
                        <Filter className="h-4 w-4" />
                        <span>Advanced Filters</span>
                        {hasAdvancedFilters() && (
                          <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                            <span className="text-xs">!</span>
                          </Badge>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 p-3 rounded-md border border-violet-200 bg-violet-50 dark:border-violet-800/50 dark:bg-violet-950/30">
                      <span className="text-sm font-medium text-violet-700 dark:text-violet-300 flex items-center gap-1.5 shrink-0">
                        <Filter className="h-4 w-4" />
                        Filters:
                      </span>
                      {activeFilterChips.map((chip) => (
                        <Badge 
                          key={chip.id} 
                          variant="secondary" 
                          className="flex items-center gap-1 pl-2.5 pr-1 py-1 bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-700"
                        >
                          <span className="text-xs font-medium">{chip.label}:</span>
                          <span className="text-xs max-w-[120px] truncate">{chip.value}</span>
                          <button
                            type="button"
                            onClick={() => removeIndividualFilter(chip)}
                            className="ml-1 rounded-full p-0.5 hover:bg-violet-100 dark:hover:bg-violet-900/50 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-1"
                            aria-label={`Remove ${chip.label} filter`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      <span className="text-xs text-violet-600 dark:text-violet-400 shrink-0">
                        {filteredAttendees.length} {filteredAttendees.length === 1 ? 'result' : 'results'}
                      </span>
                      <div className="flex-1" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAdvancedFiltersDialogOpen(true)}
                        className="shrink-0 border-violet-300 dark:border-violet-700 hover:bg-violet-100 dark:hover:bg-violet-900/50"
                      >
                        <Edit className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setShowAdvancedSearch(false);
                          clearAdvancedSearch();
                        }}
                        className="shrink-0"
                      >
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        Clear All
                      </Button>
                    </div>
                  )}

                  {/* Advanced Filters Dialog - rendered outside conditional so it's always available */}
                  <AdvancedFiltersDialog
                    eventSettings={eventSettings}
                    filters={advancedSearchFilters}
                    onFiltersChange={setAdvancedSearchFilters}
                    onApply={() => {
                      setShowAdvancedSearch(true);
                    }}
                    onClear={() => {
                      clearAdvancedSearch();
                      setShowAdvancedSearch(false);
                    }}
                    open={advancedFiltersDialogOpen}
                    onOpenChange={setAdvancedFiltersDialogOpen}
                  />

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
                              {/* Generate and clear share the same permission by design - both are credential management operations */}
                              {hasPermission(currentUser?.role, 'attendees', 'bulkGenerateCredentials') && (
                                <DropdownMenuItem
                                  onClick={handleBulkClearCredentials}
                                  disabled={bulkClearingCredentials}
                                >
                                  {bulkClearingCredentials ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                      Clearing...
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Bulk Clear Credentials
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
                            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-0">
                              <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-0 bg-[#F1F5F9] dark:bg-slate-800 px-6 pt-6">
                                <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
                                  <Wand2 className="h-5 w-5" />
                                  Bulk Edit Attendees
                                </DialogTitle>
                                <DialogDescription>
                                  Apply changes to all {selectedAttendees.length} selected attendees.
                                  Only fields you change will be updated.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 px-6 py-6">
                                {eventSettings?.customFields
                                  ?.filter(field => ['text', 'url', 'email', 'number', 'date', 'select', 'checkbox', 'boolean', 'textarea', 'uppercase'].includes(field.fieldType))
                                  .map((field: any) => (
                                    <div key={field.id} className="space-y-2">
                                      <Label htmlFor={`bulk-edit-${field.id}`}>{field.fieldName}</Label>
                                      {(field.fieldType === 'boolean' || field.fieldType === 'checkbox') ? (
                                        <Select
                                          value={bulkEditChanges[field.id] ?? ''}
                                          onValueChange={(value) => setBulkEditChanges(prev => ({ ...prev, [field.id]: value }))}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="No Change" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="no-change">No Change</SelectItem>
                                            <SelectItem value="yes">Yes</SelectItem>
                                            <SelectItem value="no">No</SelectItem>
                                            <SelectItem value={CLEAR_SENTINEL}>Clear Field</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      ) : field.fieldType === 'select' ? (
                                        <Select
                                          value={bulkEditChanges[field.id] ?? ''}
                                          onValueChange={(value) => setBulkEditChanges(prev => ({ ...prev, [field.id]: value }))}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="No Change" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="no-change">No Change</SelectItem>
                                            <SelectItem value={CLEAR_SENTINEL}>Clear Field</SelectItem>
                                            {field.fieldOptions?.options?.map((option: string, index: number) => (
                                              <SelectItem key={index} value={option}>{option}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      ) : (
                                        <div className="space-y-2">
                                          {field.fieldType === 'textarea' ? (
                                            <Textarea
                                              id={`bulk-edit-${field.id}`}
                                              placeholder="Leave empty for no change"
                                              value={bulkEditChanges[field.id] === CLEAR_SENTINEL ? '' : bulkEditChanges[field.id] ?? ''}
                                              onChange={(e) => setBulkEditChanges(prev => ({ ...prev, [field.id]: e.target.value }))}
                                              disabled={bulkEditChanges[field.id] === CLEAR_SENTINEL}
                                              aria-disabled={bulkEditChanges[field.id] === CLEAR_SENTINEL}
                                              rows={3}
                                            />
                                          ) : (
                                            <Input
                                              id={`bulk-edit-${field.id}`}
                                              type={field.fieldType === 'number' ? 'number' : field.fieldType === 'email' ? 'email' : field.fieldType === 'url' ? 'url' : field.fieldType === 'date' ? 'date' : 'text'}
                                              placeholder="Leave empty for no change"
                                              value={bulkEditChanges[field.id] === CLEAR_SENTINEL ? '' : bulkEditChanges[field.id] ?? ''}
                                              onChange={(e) => setBulkEditChanges(prev => ({ ...prev, [field.id]: e.target.value }))}
                                              disabled={bulkEditChanges[field.id] === CLEAR_SENTINEL}
                                              aria-disabled={bulkEditChanges[field.id] === CLEAR_SENTINEL}
                                            />
                                          )}
                                          <div className="flex items-center space-x-2">
                                            <Checkbox
                                              id={`clear-${field.id}`}
                                              checked={bulkEditChanges[field.id] === CLEAR_SENTINEL}
                                              onCheckedChange={(checked) => {
                                                setBulkEditChanges(prev => ({
                                                  ...prev,
                                                  [field.id]: checked ? CLEAR_SENTINEL : ''
                                                }));
                                              }}
                                            />
                                            <Label
                                              htmlFor={`clear-${field.id}`}
                                              className="text-sm text-muted-foreground cursor-pointer"
                                            >
                                              Clear this field for all selected attendees
                                            </Label>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}

                                {/* Access Control Fields - Only show when access control is enabled globally AND for this event */}
                                {isAccessControlEnabledForEvent(eventSettings?.accessControlEnabled) && (
                                  <div className="border-t pt-4 mt-4 space-y-4">
                                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                      <Shield className="h-4 w-4" />
                                      Access Control
                                    </div>

                                    {/* Access Status */}
                                    <div className="space-y-2">
                                      <Label htmlFor="bulk-edit-accessEnabled">Access Status</Label>
                                      <Select
                                        onValueChange={(value) => setBulkEditChanges(prev => ({ ...prev, accessEnabled: value }))}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="No Change" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="no-change">No Change</SelectItem>
                                          <SelectItem value="active">Active</SelectItem>
                                          <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {/* Valid From */}
                                    <div className="space-y-2">
                                      <Label htmlFor="bulk-edit-validFrom">Valid From</Label>
                                      <div className="space-y-2">
                                        <Input
                                          id="bulk-edit-validFrom"
                                          type={eventSettings?.accessControlTimeMode === 'date_time' ? 'datetime-local' : 'date'}
                                          value={bulkEditChanges.validFrom === CLEAR_SENTINEL ? '' : bulkEditChanges.validFrom || ''}
                                          onChange={(e) => setBulkEditChanges(prev => ({ ...prev, validFrom: e.target.value }))}
                                          disabled={bulkEditChanges.validFrom === CLEAR_SENTINEL}
                                          placeholder="Leave empty for no change"
                                        />
                                        <div className="flex items-center space-x-2">
                                          <Checkbox
                                            id="clear-validFrom"
                                            checked={bulkEditChanges.validFrom === CLEAR_SENTINEL}
                                            onCheckedChange={(checked) => {
                                              setBulkEditChanges(prev => ({
                                                ...prev,
                                                validFrom: checked ? CLEAR_SENTINEL : ''
                                              }));
                                            }}
                                          />
                                          <Label
                                            htmlFor="clear-validFrom"
                                            className="text-sm text-muted-foreground cursor-pointer"
                                          >
                                            Clear this field for all selected attendees
                                          </Label>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Valid Until */}
                                    <div className="space-y-2">
                                      <Label htmlFor="bulk-edit-validUntil">Valid Until</Label>
                                      <div className="space-y-2">
                                        <Input
                                          id="bulk-edit-validUntil"
                                          type={eventSettings?.accessControlTimeMode === 'date_time' ? 'datetime-local' : 'date'}
                                          value={bulkEditChanges.validUntil === CLEAR_SENTINEL ? '' : bulkEditChanges.validUntil || ''}
                                          onChange={(e) => setBulkEditChanges(prev => ({ ...prev, validUntil: e.target.value }))}
                                          disabled={bulkEditChanges.validUntil === CLEAR_SENTINEL}
                                          placeholder="Leave empty for no change"
                                        />
                                        <div className="flex items-center space-x-2">
                                          <Checkbox
                                            id="clear-validUntil"
                                            checked={bulkEditChanges.validUntil === CLEAR_SENTINEL}
                                            onCheckedChange={(checked) => {
                                              setBulkEditChanges(prev => ({
                                                ...prev,
                                                validUntil: checked ? CLEAR_SENTINEL : ''
                                              }));
                                            }}
                                          />
                                          <Label
                                            htmlFor="clear-validUntil"
                                            className="text-sm text-muted-foreground cursor-pointer"
                                          >
                                            Clear this field for all selected attendees
                                          </Label>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex justify-end space-x-2 px-6 pb-6 pt-4 border-t border-slate-200 dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-800">
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
                        customFields={(eventSettings?.customFields || [])
                          .filter(field => field.id && field.internalFieldName)
                          .map(field => ({
                            ...field,
                            id: field.id!,
                            internalFieldName: field.internalFieldName!
                          }))}
                        accessControlSettings={{
                          accessControlEnabled: isAccessControlEnabledForEvent(eventSettings?.accessControlEnabled),
                          accessControlTimeMode: eventSettings?.accessControlTimeMode
                        }}
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
                        eventSettings={eventSettings ? {
                          customFields: (eventSettings.customFields || [])
                            .filter(field => field.id)
                            .map(field => ({
                              id: field.id!,
                              fieldName: field.fieldName,
                              fieldType: field.fieldType,
                              required: field.required
                            })),
                          accessControlEnabled: eventSettings.accessControlEnabled,
                          accessControlTimeMode: eventSettings.accessControlTimeMode
                        } : undefined}
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
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Attendees</CardTitle>
                    <DataRefreshIndicator
                      freshnessState={attendeesFreshness.state}
                      isRefreshing={attendeesFreshness.isRefreshing}
                      onRefresh={attendeesFreshness.refresh}
                      relativeTime={attendeesFreshness.getRelativeTime()}
                    />
                  </div>
                </CardHeader>
                <CardContent>
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
                                // Deselect all on current page
                                setSelectedAttendees(prev => prev.filter(id => !paginatedIds.includes(id)));
                              } else {
                                // Select all on current page first (immediate visual feedback)
                                setSelectedAttendees(prev => [...new Set([...prev, ...paginatedIds])]);
                                
                                // Check if there are more records than just the current page
                                if (filteredAttendees.length > recordsPerPage) {
                                  // Show dialog to choose between current page or all records
                                  setShowSelectAllDialog(true);
                                }
                              }
                            }}
                            aria-label="Select all on this page"
                          />
                        </TableHead>
                        <TableHead className="w-20">Photo</TableHead>
                        <TableHead className="w-auto">Name</TableHead>
                        <TableHead className="w-24 text-center">Barcode</TableHead>
                        <TableHead className="w-20 text-center">Credential</TableHead>
                        <TableHead className="w-24 text-center">Status</TableHead>
                        {/* Access Control Columns - Requirements 6.1, 6.2 */}
                        {isAccessControlEnabledForEvent(eventSettings?.accessControlEnabled) && (
                          <>
                            <TableHead className="w-24 text-center">Valid From</TableHead>
                            <TableHead className="w-24 text-center">Valid Until</TableHead>
                            <TableHead className="w-20 text-center">Access</TableHead>
                          </>
                        )}
                        <TableHead className="w-20 text-center">Actions</TableHead>
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
                                    className="relative w-24 h-32 bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/30 rounded-lg overflow-hidden flex-shrink-0 border border-violet-200 dark:border-violet-800/50 shadow-xs hover:shadow-md transition-all duration-200"
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
                                            const span = document.createElement('span');
                                            span.className = 'text-2xl font-bold text-violet-600 dark:text-violet-400';
                                            span.setAttribute('aria-hidden', 'true');
                                            span.textContent = `${attendee.firstName.charAt(0)}${attendee.lastName.charAt(0)}`;
                                            initialsDiv.appendChild(span);
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
                                    <div className="relative inline-block group">
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800 cursor-help" aria-label="Has notes">
                                        <FileText className="h-3 w-3 mr-1" aria-hidden="true" />
                                        NOTES
                                      </Badge>
                                      <NotesTooltip notes={attendee.notes} />
                                    </div>
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
                                            setEditingAttendee(prev =>
                                              prev?.id === attendee.id
                                                ? fullAttendee
                                                : prev
                                            );
                                          }
                                        })
                                        .catch(error => {
                                          console.error('Error fetching full attendee:', error);
                                          // Already using list data, so no action needed
                                        });
                                    }
                                  }}
                                  className="text-left group w-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm px-2 py-1 -mx-2 -my-1"
                                  disabled={!hasPermission(currentUser?.role, 'attendees', 'update')}
                                  aria-label={`Edit ${attendee.firstName} ${attendee.lastName}${attendee.notes && attendee.notes.trim() !== '' ? ', has notes' : ''}`}
                                >
                                  <span className="font-bold text-2xl text-foreground group-hover:text-primary transition-colors block leading-tight">{attendee.firstName} {attendee.lastName}</span>
                                </button>
                              </TableCell>
                              <TableCell className="align-top pt-4">
                                <div className="flex items-center gap-2" role="group" aria-label={`Barcode: ${attendee.barcodeNumber || 'Not assigned'}`}>
                                  <button
                                    type="button"
                                    disabled={!attendee.barcodeNumber}
                                    onClick={() => {
                                      if (attendee.barcodeNumber) {
                                        setQrBarcodeNumber(attendee.barcodeNumber);
                                        setQrModalOpen(true);
                                      }
                                    }}
                                    className="p-1 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                    aria-label={`View QR code for barcode ${attendee.barcodeNumber || 'Not assigned'}`}
                                  >
                                    <QrCode className={`h-4 w-4 transition-colors ${attendee.barcodeNumber ? 'text-muted-foreground hover:text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />
                                  </button>
                                  <Badge variant="outline" className="font-mono text-sm px-3 py-1.5 bg-background">
                                    {attendee.barcodeNumber || 'Not assigned'}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="align-top pt-4">
                                <div className="flex justify-center">
                                  {attendee.credentialUrl ? (
                                    <button
                                      onClick={() => attendee.credentialUrl && window.open(`${attendee.credentialUrl}?v=${Date.now()}`, '_blank')}
                                      className="p-1 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2"
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
                                  {renderCredentialStatusBadge(attendee)}
                                </div>
                              </TableCell>
                              {/* Access Control Cells - Requirements 6.1, 6.2, 6.3, 6.4 */}
                              {isAccessControlEnabledForEvent(eventSettings?.accessControlEnabled) && (
                                <>
                                  {/* Valid From Column - Requirement 6.3 */}
                                  <TableCell className={`align-top ${eventSettings?.accessControlTimeMode === 'date_time' ? 'pt-2' : 'pt-4'}`}>
                                    <div className="flex flex-col items-center justify-center">
                                      {attendee.validFrom ? (
                                        eventSettings?.accessControlTimeMode === 'date_time' ? (
                                          (() => {
                                            const formatted = formatDateTimeSeparate(typeof attendee.validFrom === 'string' ? attendee.validFrom : null);
                                            return (
                                              <>
                                                <span className="text-sm font-medium text-foreground">
                                                  {formatted.date}
                                                </span>
                                                {formatted.time && (
                                                  <span className="text-xs text-muted-foreground">
                                                    {formatted.time}
                                                  </span>
                                                )}
                                              </>
                                            );
                                          })()
                                        ) : (
                                          <span className="text-sm font-medium text-foreground">
                                            {formatForDisplay(
                                              typeof attendee.validFrom === 'string' ? attendee.validFrom : null, 
                                              eventSettings?.accessControlTimeMode || 'date_only'
                                            )}
                                          </span>
                                        )
                                      ) : (
                                        <span className="text-sm font-medium text-foreground">—</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  {/* Valid Until Column - Requirement 6.3 */}
                                  <TableCell className={`align-top ${eventSettings?.accessControlTimeMode === 'date_time' ? 'pt-2' : 'pt-4'}`}>
                                    <div className="flex flex-col items-center justify-center">
                                      {attendee.validUntil ? (
                                        eventSettings?.accessControlTimeMode === 'date_time' ? (
                                          (() => {
                                            const formatted = formatDateTimeSeparate(typeof attendee.validUntil === 'string' ? attendee.validUntil : null);
                                            return (
                                              <>
                                                <span className="text-sm font-medium text-foreground">
                                                  {formatted.date}
                                                </span>
                                                {formatted.time && (
                                                  <span className="text-xs text-muted-foreground">
                                                    {formatted.time}
                                                  </span>
                                                )}
                                              </>
                                            );
                                          })()
                                        ) : (
                                          <span className="text-sm font-medium text-foreground">
                                            {formatForDisplay(
                                              typeof attendee.validUntil === 'string' ? attendee.validUntil : null, 
                                              eventSettings?.accessControlTimeMode || 'date_only'
                                            )}
                                          </span>
                                        )
                                      ) : (
                                        <span className="text-sm font-medium text-foreground">—</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  {/* Access Status Column - Requirement 6.4 */}
                                  <TableCell className="align-top pt-4">
                                    <div className="flex justify-center">
                                      {attendee.accessEnabled !== false ? (
                                        <Badge 
                                          className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/60 font-semibold px-3 py-1 transition-colors"
                                          role="status"
                                          aria-label="Access status: Active"
                                        >
                                          <CheckCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                                          Active
                                        </Badge>
                                      ) : (
                                        <Badge 
                                          className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-900/60 font-semibold px-3 py-1 transition-colors"
                                          role="status"
                                          aria-label="Access status: Inactive"
                                        >
                                          <X className="h-3 w-3 mr-1" aria-hidden="true" />
                                          Inactive
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                </>
                              )}
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
                                <TableCell colSpan={isAccessControlEnabledForEvent(eventSettings?.accessControlEnabled) ? 8 : 5} className="pt-1 pb-6">
                                  <div className="border-t border-border/50 pt-2">
                                    <div className={`grid grid-cols-1 ${getGridColumns(customFieldsWithValues.length)} gap-x-6 gap-y-2`}>
                                      {customFieldsWithValues.map((field) => (
                                        <div key={field.customFieldId} className="flex flex-col space-y-0.5 min-w-0">
                                          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide" id={`field-label-${attendee.id}-${field.customFieldId}`}>
                                            {field.fieldName}
                                          </span>
                                          <div className="text-sm font-medium text-foreground min-w-0" aria-labelledby={`field-label-${attendee.id}-${field.customFieldId}`}>
                                                {field.fieldType === 'url' ? (
                                                  (() => {
                                                    const url = field.value || '';
                                                    // Only allow http:// and https:// protocols for security
                                                    const isValidUrl = /^https?:\/\/.+/i.test(url);
                                                    return isValidUrl ? (
                                                      <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:text-primary/80 underline inline-flex items-center gap-1 max-w-full focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm"
                                                        onClick={(e) => e.stopPropagation()}
                                                        title={url}
                                                        aria-label={`${field.fieldName}: ${url}, opens in new tab`}
                                                      >
                                                        <Link className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                                                        <span className="truncate block min-w-0">{url}</span>
                                                      </a>
                                                    ) : (
                                                      <span className="truncate block text-muted-foreground" title={url}>
                                                        {url || '—'}
                                                      </span>
                                                    );
                                                  })()
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
                                                ) : field.fieldType === 'checkbox' ? (
                                                  <Badge
                                                    variant="outline"
                                                    className={`text-xs inline-flex items-center gap-1.5 ${(field.value === 'Yes' || field.value === 'yes')
                                                      ? 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 hover:border-violet-300 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800 dark:hover:bg-violet-900/40 dark:hover:border-violet-700'
                                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300 dark:bg-gray-950/30 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-900/40 dark:hover:border-gray-700'
                                                      }`}
                                                    role="status"
                                                  >
                                                    {(field.value === 'Yes' || field.value === 'yes') ? (
                                                      <Check className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                                                    ) : (
                                                      <X className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                                                    )}
                                                    {(field.value === 'Yes' || field.value === 'yes') ? 'Yes' : 'No'}
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
                          {/* First page and ellipsis if needed */}
                          {attendeesPaginationPages[0] > 1 && (
                            <>
                              <Button
                                variant={1 === currentPage ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(1)}
                                className="w-8 h-8 p-0"
                              >
                                1
                              </Button>
                              {attendeesPaginationPages[0] > 2 && (
                                <span className="text-muted-foreground px-1">...</span>
                              )}
                            </>
                          )}
                          
                          {/* Visible page numbers */}
                          {attendeesPaginationPages.map(page => (
                            <Button
                              key={page}
                              variant={page === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          ))}
                          
                          {/* Ellipsis and last page if needed */}
                          {attendeesPaginationPages[attendeesPaginationPages.length - 1] < totalPages && (
                            <>
                              {attendeesPaginationPages[attendeesPaginationPages.length - 1] < totalPages - 1 && (
                                <span className="text-muted-foreground px-1">...</span>
                              )}
                              <Button
                                variant={totalPages === currentPage ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(totalPages)}
                                className="w-8 h-8 p-0"
                              >
                                {totalPages}
                              </Button>
                            </>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNextPage}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPageJumpDialog(true)}
                          title="Jump to page"
                        >
                          <Hash className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Select All Dialog */}
              <Dialog open={showSelectAllDialog} onOpenChange={setShowSelectAllDialog}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Select Attendees</DialogTitle>
                    <DialogDescription>
                      You have {filteredAttendees.length} attendees matching your current filters. Would you like to select just the current page or all matching records?
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 py-4">
                    <div className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium">Current Page Only</div>
                        <div className="text-sm text-muted-foreground">
                          Select {paginatedAttendees.length} attendees on this page
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          const paginatedIds = paginatedAttendees.map(a => a.id);
                          setSelectedAttendees(prev => [...new Set([...prev, ...paginatedIds])]);
                          setShowSelectAllDialog(false);
                        }}
                      >
                        Select Page
                      </Button>
                    </div>
                    <div className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium">All Matching Records</div>
                        <div className="text-sm text-muted-foreground">
                          Select all {filteredAttendees.length} attendees in search results
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          const allIds = filteredAttendees.map(a => a.id);
                          setSelectedAttendees(allIds);
                          setShowSelectAllDialog(false);
                        }}
                      >
                        Select All
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowSelectAllDialog(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Page Jump Dialog */}
              <Dialog open={showPageJumpDialog} onOpenChange={setShowPageJumpDialog}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Jump to Page</DialogTitle>
                    <DialogDescription>
                      Enter a page number between 1 and {totalPages}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 py-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="page-jump" className="text-right whitespace-nowrap">
                        Page Number
                      </Label>
                      <Input
                        id="page-jump"
                        type="number"
                        min="1"
                        max={totalPages}
                        value={pageJumpInput}
                        onChange={(e) => setPageJumpInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const pageNum = parseInt(pageJumpInput);
                            if (pageNum >= 1 && pageNum <= totalPages) {
                              handlePageChange(pageNum);
                              setShowPageJumpDialog(false);
                              setPageJumpInput("");
                            }
                          }
                        }}
                        placeholder={`1-${totalPages}`}
                        className="flex-1"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPageJumpDialog(false);
                        setPageJumpInput("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        const pageNum = parseInt(pageJumpInput);
                        if (pageNum >= 1 && pageNum <= totalPages) {
                          handlePageChange(pageNum);
                          setShowPageJumpDialog(false);
                          setPageJumpInput("");
                        } else {
                          error("Invalid Page", `Please enter a page number between 1 and ${totalPages}`);
                        }
                      }}
                      disabled={!pageJumpInput || parseInt(pageJumpInput) < 1 || parseInt(pageJumpInput) > totalPages}
                    >
                      Go to Page
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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
                  <div className="flex items-center justify-between">
                    <CardTitle>System Users</CardTitle>
                    <DataRefreshIndicator
                      freshnessState={usersFreshness.state}
                      isRefreshing={usersFreshness.isRefreshing}
                      onRefresh={usersFreshness.refresh}
                      relativeTime={usersFreshness.getRelativeTime()}
                    />
                  </div>
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
                        <p className="text-4xl font-bold text-emerald-900 dark:text-emerald-100">{usersWithRolesCount}</p>
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
                        <p className="text-4xl font-bold text-purple-900 dark:text-purple-100">{unassignedUsersCount}</p>
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
                          {permissionCategoriesCount}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Roles List */}
              {roles.length > 0 && (
                <div className="space-y-4">
                  {/* Section header with Data Refresh Indicator */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-muted-foreground">Roles</h3>
                    <DataRefreshIndicator
                      freshnessState={rolesFreshness.state}
                      isRefreshing={rolesFreshness.isRefreshing}
                      onRefresh={rolesFreshness.refresh}
                      relativeTime={rolesFreshness.getRelativeTime()}
                    />
                  </div>
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
                  {/* Section header with Data Refresh Indicator */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-muted-foreground">Event Settings</h3>
                    <DataRefreshIndicator
                      freshnessState={settingsFreshness.state}
                      isRefreshing={settingsFreshness.isRefreshing}
                      onRefresh={settingsFreshness.refresh}
                      relativeTime={settingsFreshness.getRelativeTime()}
                    />
                  </div>
                  
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
                            {formattedEventDate} • {eventSettings.eventLocation}
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
                              <span className="font-medium">Event Date:</span> {formattedEventDate}
                            </div>
                            <div>
                              <span className="font-medium">Event Time:</span> {formattedEventTime || 'Not set'}
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
                            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
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
                            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
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
                            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
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
                              {formattedLastUpdated}
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
                            <div key={field.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
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
                        {todayActivitiesCount}
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
                        {activeUsersCount}
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
                        {mostCommonAction}
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span>Activity Logs</span>
                        {logsLoading && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Showing {logs.length} of {logsPagination.totalCount} activities
                      </CardDescription>
                    </div>
                    <DataRefreshIndicator
                      freshnessState={logsFreshness.state}
                      isRefreshing={logsFreshness.isRefreshing}
                      onRefresh={logsFreshness.refresh}
                      relativeTime={logsFreshness.getRelativeTime()}
                    />
                  </div>
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
                                        {getLogTargetName(log.details)}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {getLogTypeCategory(log.details)}
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
                                      {formatComplexLogChanges(log.details.changes)}
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
                              {/* First page and ellipsis if needed */}
                              {logsPaginationPages[0] > 1 && (
                                <>
                                  <Button
                                    variant={1 === logsPagination.page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleLogsPageChange(1)}
                                    className="w-8 h-8 p-0"
                                    disabled={logsLoading}
                                  >
                                    1
                                  </Button>
                                  {logsPaginationPages[0] > 2 && (
                                    <span className="text-muted-foreground px-1">...</span>
                                  )}
                                </>
                              )}
                              
                              {/* Visible page numbers */}
                              {logsPaginationPages.map(page => (
                                <Button
                                  key={page}
                                  variant={page === logsPagination.page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleLogsPageChange(page)}
                                  className="w-8 h-8 p-0"
                                  disabled={logsLoading}
                                >
                                  {page}
                                </Button>
                              ))}
                              
                              {/* Ellipsis and last page if needed */}
                              {logsPaginationPages[logsPaginationPages.length - 1] < logsPagination.totalPages && (
                                <>
                                  {logsPaginationPages[logsPaginationPages.length - 1] < logsPagination.totalPages - 1 && (
                                    <span className="text-muted-foreground px-1">...</span>
                                  )}
                                  <Button
                                    variant={logsPagination.totalPages === logsPagination.page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleLogsPageChange(logsPagination.totalPages)}
                                    className="w-8 h-8 p-0"
                                    disabled={logsLoading}
                                  >
                                    {logsPagination.totalPages}
                                  </Button>
                                </>
                              )}
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

          {activeTab === "monitoring" && (
            <div className="space-y-6">
              <OperatorMonitoringDashboard />
            </div>
          )}

          {activeTab === "accessControl" && (
            <div className="space-y-6">
              <ApprovalProfileManager />
              <ScanLogsViewer />
            </div>
          )}

          {activeTab === "exports" && (
            <ExportsTab eventSettingsId={eventSettings?.id} />
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
        customFields={(eventSettings?.customFields || []).map(field => ({
          ...field,
          id: field.id || '',
          fieldOptions: field.fieldOptions as { uppercase?: boolean; options?: string[] } | undefined
        }))}
        eventSettings={eventSettings ? {
          id: eventSettings.id,
          eventName: eventSettings.eventName,
          eventDate: eventSettings.eventDate,
          barcodeType: eventSettings.barcodeType as 'numerical' | 'alphanumeric' | undefined,
          barcodeLength: eventSettings.barcodeLength,
          cloudinaryCloudName: eventSettings.cloudinaryCloudName,
          cloudinaryUploadPreset: eventSettings.cloudinaryUploadPreset,
          cloudinaryCropAspectRatio: eventSettings.cloudinaryCropAspectRatio,
          cloudinaryDisableSkipCrop: eventSettings.cloudinaryDisableSkipCrop,
          forceFirstNameUppercase: eventSettings.forceFirstNameUppercase,
          forceLastNameUppercase: eventSettings.forceLastNameUppercase,
          accessControlEnabled: eventSettings.accessControlEnabled,
          accessControlTimeMode: eventSettings.accessControlTimeMode,
          timeZone: eventSettings.timeZone,
          accessControlDefaults: eventSettings.accessControlDefaults
        } : undefined}
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

      {/* QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={(open) => setQrModalOpen(open)}>
        <DialogContent className="max-w-sm bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-0">
          <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-0 bg-[#F1F5F9] dark:bg-slate-800 px-6 pt-6">
            <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Barcode QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 px-6">
            {qrBarcodeNumber && (
              <>
                <div className="bg-white p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 mb-6">
                  <QRCodeSVG
                    value={qrBarcodeNumber}
                    size={256}
                    level="H"
                    includeMargin={true}
                    fgColor="#000000"
                    bgColor="#ffffff"
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Barcode Number</p>
                  <p className="text-lg font-mono font-bold text-foreground">{qrBarcodeNumber}</p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}