import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  CreditCard,
  LogOut,
  Bell,
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Calendar,
  MapPin,
  Clock,
  BarChart3,
  Printer,
  AlertTriangle,
  Mail,
  MoreHorizontal,
  FileImage,
  Award
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AttendeeForm from "@/components/AttendeeForm";
import UserForm from "@/components/UserForm";
import EventSettingsForm from "@/components/EventSettingsForm";
import RoleForm from "@/components/RoleForm";
import { hasPermission, canAccessTab, canManageUser } from "@/lib/permissions";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: {
    id: string;
    name: string;
    permissions: any;
  } | null;
  isInvited?: boolean;
  createdAt: string;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: any;
  createdAt: string;
}

interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  barcodeNumber: string;
  photoUrl: string | null;
  credentialUrl?: string | null;
  credentialGeneratedAt?: string | null;
  createdAt: string;
  customFieldValues: any[];
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
  bannerImageUrl: string | null;
  customFields: any[];
  createdAt: string;
  updatedAt: string;
}

interface Log {
  id: string;
  action: string;
  details: any;
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
  const { toast } = useToast();
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
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [customFieldFilters, setCustomFieldFilters] = useState<Record<string, string>>({});
  const [showAttendeeForm, setShowAttendeeForm] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null);
  const [printingAttendee, setPrintingAttendee] = useState<string | null>(null);
  const [generatingCredential, setGeneratingCredential] = useState<string | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initializingRoles, setInitializingRoles] = useState(false);
  const [showEventSettingsForm, setShowEventSettingsForm] = useState(false);
  const [invitingUser, setInvitingUser] = useState<string | null>(null);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

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

    if (user?.id) {
      getCurrentUser();
    }
  }, [user?.id]);

  // Load real data from APIs
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load users
        const usersResponse = await fetch('/api/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(Array.isArray(usersData) ? usersData : []);
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
      } catch (error) {
        console.error('Error loading data:', error);
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
          customFieldValues: []
        },
        {
          id: "2",
          firstName: "Jane",
          lastName: "Smith",
          barcodeNumber: "EVT001235",
          photoUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150",
          createdAt: new Date().toISOString(),
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

  // Enhanced filtering function for attendees including custom fields
  const filteredAttendees = attendees.filter(attendee => {
    // Basic search in name and barcode
    const basicMatch = `${attendee.firstName} ${attendee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attendee.barcodeNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Search in custom field values
    const customFieldMatch = attendee.customFieldValues?.some((cfv: any) => 
      cfv.value && cfv.value.toLowerCase().includes(searchTerm.toLowerCase())
    ) || false;
    
    const searchMatch = basicMatch || customFieldMatch;
    
    // Apply custom field filters
    const customFieldFilterMatch = Object.entries(customFieldFilters).every(([fieldId, filterValue]) => {
      if (!filterValue || filterValue === 'all') return true;
      
      const attendeeFieldValue = attendee.customFieldValues?.find((cfv: any) => cfv.customFieldId === fieldId);
      return attendeeFieldValue?.value?.toLowerCase().includes(filterValue.toLowerCase()) || false;
    });
    
    return searchMatch && customFieldFilterMatch;
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = selectedRole === "all" || user.role?.id === selectedRole;
    return matchesSearch && matchesRole;
  });

  // Function to refresh event settings and custom fields
  const refreshEventSettings = async () => {
    try {
      const settingsResponse = await fetch('/api/event-settings');
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setEventSettings(settingsData);
      }
    } catch (error) {
      console.error('Error refreshing event settings:', error);
    }
  };

  // API Functions
  const handleSaveAttendee = async (attendeeData: any) => {
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
        const error = await response.json();
        throw new Error(error.error || 'Failed to save attendee');
      }

      const savedAttendee = await response.json();

      if (editingAttendee) {
        setAttendees(prev => prev.map(a => a.id === editingAttendee.id ? savedAttendee : a));
        toast({
          title: "Success",
          description: "Attendee updated successfully!",
        });
      } else {
        setAttendees(prev => [savedAttendee, ...prev]);
        toast({
          title: "Success",
          description: "Attendee created successfully!",
        });
      }

      setEditingAttendee(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      throw error;
    }
  };

  const handleDeleteAttendee = async (attendeeId: string) => {
    try {
      const response = await fetch(`/api/attendees/${attendeeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete attendee');
      }

      setAttendees(prev => prev.filter(a => a.id !== attendeeId));
      toast({
        title: "Success",
        description: "Attendee deleted successfully!",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleGenerateCredential = async (attendeeId: string) => {
    setGeneratingCredential(attendeeId);
    try {
      const response = await fetch(`/api/attendees/${attendeeId}/generate-credential`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate credential');
      }

      const result = await response.json();
      
      // Update the attendee in the local state with the new credential URL
      setAttendees(prev => prev.map(a => 
        a.id === attendeeId 
          ? { ...a, credentialUrl: result.credentialUrl, credentialGeneratedAt: result.generatedAt }
          : a
      ));

      // Open the generated credential in a new tab
      if (result.credentialUrl) {
        window.open(result.credentialUrl, '_blank');
      }

      toast({
        title: "Success",
        description: "Credential generated successfully!",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setGeneratingCredential(null);
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

      toast({
        title: "Success",
        description: "Credential generated successfully!",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
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

      toast({
        title: "Success",
        description: "Roles initialized successfully!",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
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
        toast({
          title: "Success",
          description: "Role updated successfully!",
        });
      } else {
        setRoles(prev => [savedRole, ...prev]);
        toast({
          title: "Success",
          description: "Role created successfully!",
        });
      }

      setEditingRole(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      throw error;
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete role');
      }

      setRoles(prev => prev.filter(r => r.id !== roleId));
      toast({
        title: "Success",
        description: "Role deleted successfully!",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  // Event Settings Functions
  const handleSaveEventSettings = async (settingsData: any) => {
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
        const error = await response.json();
        throw new Error(error.error || 'Failed to save event settings');
      }

      // Don't set the state immediately, instead refresh to get the latest data
      // This ensures we get the updated `updatedAt` timestamp from the database
      await refreshEventSettings();

      toast({
        title: "Success",
        description: eventSettings ? "Event settings updated successfully!" : "Event settings created successfully!",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      throw error;
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
        toast({
          title: "Success",
          description: "User updated successfully!",
        });
      } else {
        setUsers(prev => [savedUser, ...prev]);
        toast({
          title: "Success",
          description: "User created successfully!",
        });
      }

      setEditingUser(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      throw error;
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
      toast({
        title: "Success",
        description: "User deleted successfully!",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
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

  const handleInviteUser = async (userId: string) => {
    setInvitingUser(userId);
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create invitation');
      }

      const result = await response.json();
      
      // Copy invitation URL to clipboard
      const copySuccess = await copyToClipboard(result.invitationUrl);
      
      if (copySuccess) {
        toast({
          title: "Invitation Created",
          description: "Invitation link has been copied to your clipboard. Share it with the user to complete their registration.",
        });
      } else {
        // Show the URL in the toast if copying failed
        toast({
          title: "Invitation Created",
          description: `Please copy this invitation link manually: ${result.invitationUrl}`,
          duration: 10000, // Show longer so user can copy
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setInvitingUser(null);
    }
  };

  // Logs Functions
  const loadLogs = async (page = 1, filters = logsFilters) => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: logsPagination.limit.toString(),
        action: filters.action,
        userId: filters.userId
      });

      const response = await fetch(`/api/logs?${params}`);
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
            log.user.name || log.user.email,
            log.attendee ? `${log.attendee.firstName} ${log.attendee.lastName}` : (log.details?.type || 'System'),
            JSON.stringify(log.details || {}).replace(/"/g, '""')
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

        toast({
          title: "Export Complete",
          description: "Activity logs have been exported successfully.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error.message,
      });
    }
  };

  // Load logs when filters change or tab becomes active
  useEffect(() => {
    if (activeTab === 'logs' && canAccessTab(currentUser?.role, 'logs')) {
      loadLogs();
    }
  }, [activeTab, currentUser?.role]);

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
    <div className="flex min-h-screen bg-gradient-to-br from-background via-surface to-surface-variant">
      {/* Sidebar */}
      <aside className="w-64 border-r glass-effect">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-8">
            <CreditCard className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">EventCredentialPro</span>
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
                <Shield className="mr-2 h-4 w-4" />
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

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 w-64 p-6 border-t">
          <div className="flex items-center space-x-3 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback>
                {user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {currentUser?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0]}
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
      <main className="flex-1 overflow-auto">
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
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              {activeTab === "attendees" && hasPermission(currentUser?.role, 'attendees', 'create') && (
                <Button onClick={async () => {
                  await refreshEventSettings();
                  setShowAttendeeForm(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Attendee
                </Button>
              )}
              {activeTab === "users" && hasPermission(currentUser?.role, 'users', 'create') && (
                <Button onClick={() => setShowUserForm(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
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
              {/* Search and Filters */}
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search attendees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </Button>
                </div>

                {/* Custom Field Filters */}
                {eventSettings?.customFields && eventSettings.customFields.length > 0 && (
                  <div className="flex items-center space-x-4 flex-wrap">
                    <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
                    {eventSettings.customFields
                      .sort((a: any, b: any) => a.order - b.order)
                      .map((field: any) => (
                        <Select
                          key={field.id}
                          value={customFieldFilters[field.id] || 'all'}
                          onValueChange={(value) => 
                            setCustomFieldFilters(prev => ({
                              ...prev,
                              [field.id]: value
                            }))
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder={`Filter by ${field.fieldName}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All {field.fieldName}</SelectItem>
                            {/* Get unique values for this field from attendees */}
                            {Array.from(new Set(
                              attendees
                                .map(attendee => 
                                  attendee.customFieldValues?.find((cfv: any) => cfv.customFieldId === field.id)?.value
                                )
                                .filter(Boolean)
                            )).map((value: any) => (
                              <SelectItem key={value} value={value}>
                                {value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ))}
                    {Object.keys(customFieldFilters).length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCustomFieldFilters({})}
                        className="text-muted-foreground"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="glass-effect border-0 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Attendees</CardTitle>
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{attendees.length}</div>
                  </CardContent>
                </Card>
                <Card className="glass-effect border-0 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Credentials Printed</CardTitle>
                    <div className="p-2 rounded-lg bg-success/10">
                      <CreditCard className="h-4 w-4 text-success" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-success">0</div>
                  </CardContent>
                </Card>
                <Card className="glass-effect border-0 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Photos Uploaded</CardTitle>
                    <div className="p-2 rounded-lg bg-info/10">
                      <Upload className="h-4 w-4 text-info" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-info">{attendees.filter(a => a.photoUrl).length}</div>
                  </CardContent>
                </Card>
                <Card className="glass-effect border-0 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                    <div className="p-2 rounded-lg bg-warning/10">
                      <Activity className="h-4 w-4 text-warning" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-warning">{logs.length}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Attendees Table */}
              <Card className="glass-effect border-0">
                <CardHeader>
                  <CardTitle>Attendees</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Photo</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Barcode</TableHead>
                        <TableHead>Credential</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAttendees.map((attendee) => {
                        // Get custom field values for this attendee, sorted by field order
                        const customFieldsWithValues = eventSettings?.customFields
                          ?.sort((a: any, b: any) => a.order - b.order)
                          ?.map((field: any) => {
                            const value = attendee.customFieldValues?.find((cfv: any) => cfv.customFieldId === field.id);
                            let displayValue = value?.value || null;
                            
                            // Format display value based on field type
                            if (displayValue && field.fieldType === 'boolean') {
                              displayValue = displayValue === 'yes' ? 'Yes' : 'No';
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
                          ?.filter((field: any) => field.value) || [];

                        return (
                          <TableRow key={attendee.id}>
                            <TableCell>
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={attendee.photoUrl || undefined} />
                                <AvatarFallback>
                                  {attendee.firstName.charAt(0)}{attendee.lastName.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-lg">{attendee.firstName} {attendee.lastName}</div>
                                {/* Display custom fields under the name */}
                                {customFieldsWithValues.length > 0 && (
                                  <div className="mt-1">
                                    {(() => {
                                      // Determine grid columns based on number of fields
                                      const fieldCount = customFieldsWithValues.length;
                                      let gridCols = 'grid-cols-1';
                                      if (fieldCount >= 2) gridCols = 'grid-cols-2';
                                      if (fieldCount >= 4) gridCols = 'grid-cols-3';
                                      if (fieldCount >= 6) gridCols = 'grid-cols-4';

                                      return (
                                        <div className={`grid ${gridCols} gap-x-4 gap-y-1`}>
                                          {customFieldsWithValues.map((field: any, index: number) => (
                                            <div key={index} className="text-xs text-muted-foreground">
                                              <span className="font-medium">{field.fieldName}:</span>{' '}
                                              {field.fieldType === 'url' ? (
                                                <a 
                                                  href={field.value} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer"
                                                  className="text-blue-600 hover:text-blue-800 underline"
                                                >
                                                  {field.value}
                                                </a>
                                              ) : (
                                                field.value
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{attendee.barcodeNumber}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-center">
                                {attendee.credentialUrl ? (
                                  <button
                                    onClick={() => attendee.credentialUrl && window.open(attendee.credentialUrl, '_blank')}
                                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                                    title="View Credential"
                                  >
                                    <Award className="h-5 w-5 text-purple-600" />
                                  </button>
                                ) : (
                                  <div className="p-1" title="No Credential Generated">
                                    <Award className="h-5 w-5 text-gray-400" />
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {hasPermission(currentUser?.role, 'attendees', 'print') && (
                                    <DropdownMenuItem
                                      onClick={() => handleGenerateCredential(attendee.id)}
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
                                  {hasPermission(currentUser?.role, 'attendees', 'update') && (
                                    <DropdownMenuItem
                                      onClick={async () => {
                                        await refreshEventSettings();
                                        setEditingAttendee(attendee);
                                        setShowAttendeeForm(true);
                                      }}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                  )}
                                  {hasPermission(currentUser?.role, 'attendees', 'delete') && (
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteAttendee(attendee.id)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
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
                    className="pl-10"
                  />
                </div>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-48">
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
                                <div className="font-medium">{user.name || user.email.split('@')[0]}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
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
                              {user.isInvited && hasPermission(currentUser?.role, 'users', 'create') && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleInviteUser(user.id)}
                                  disabled={invitingUser === user.id}
                                  className="text-blue-600"
                                >
                                  {invitingUser === user.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                  ) : (
                                    <Mail className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              {hasPermission(currentUser?.role, 'users', 'update') && canManageUser(currentUser?.role, user.role) && (
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
                                  onClick={() => handleDeleteUser(user.id)}
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
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No roles have been configured yet. Initialize the default role system to get started.
                    <Button 
                      className="ml-4" 
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
                  <Card className="glass-effect border-0 hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">{roles.length}</div>
                    </CardContent>
                  </Card>
                  <Card className="glass-effect border-0 hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                      <div className="p-2 rounded-lg bg-success/10">
                        <Users className="h-4 w-4 text-success" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-success">{users.filter(u => u.role).length}</div>
                    </CardContent>
                  </Card>
                  <Card className="glass-effect border-0 hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Unassigned Users</CardTitle>
                      <div className="p-2 rounded-lg bg-warning/10">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-warning">{users.filter(u => !u.role).length}</div>
                    </CardContent>
                  </Card>
                  <Card className="glass-effect border-0 hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Permission Levels</CardTitle>
                      <div className="p-2 rounded-lg bg-info/10">
                        <Settings className="h-4 w-4 text-info" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-info">4</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Roles Grid */}
              {roles.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {roles.map((role) => (
                    <Card key={role.id} className="glass-effect border-0 hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Shield className="h-5 w-5 text-primary" />
                            <span>{role.name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {users.filter(u => u.role?.id === role.id).length} users
                          </Badge>
                        </CardTitle>
                        <CardDescription>{role.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <div className="text-sm font-medium mb-2">Permissions:</div>
                            <div className="space-y-2">
                              {Object.entries(role.permissions).map(([resource, perms]: [string, any]) => (
                                <div key={resource} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                  <span className="text-sm font-medium capitalize">{resource}</span>
                                  <div className="flex flex-wrap gap-1">
                                    {typeof perms === 'object' && perms !== null ? (
                                      Object.entries(perms).map(([action, allowed]: [string, any]) => (
                                        allowed && (
                                          <Badge key={action} variant="secondary" className="text-xs">
                                            {action}
                                          </Badge>
                                        )
                                      ))
                                    ) : (
                                      <Badge variant="secondary" className="text-xs">
                                        {String(perms)}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-xs text-muted-foreground">
                              Created {new Date(role.createdAt).toLocaleDateString()}
                            </span>
                            <div className="flex items-center space-x-2">
                              {hasPermission(currentUser?.role, 'roles', 'update') && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    setEditingRole(role);
                                    setShowRoleForm(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {hasPermission(currentUser?.role, 'roles', 'delete') && role.name !== 'Super Administrator' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => handleDeleteRole(role.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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
                    <Card className="glass-effect border-0 hover:shadow-lg transition-shadow">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Event Details</CardTitle>
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Calendar className="h-4 w-4 text-primary" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-lg font-bold">{eventSettings.eventName}</div>
                        <div className="text-sm text-muted-foreground">
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
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="glass-effect border-0 hover:shadow-lg transition-shadow">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Barcode Settings</CardTitle>
                        <div className="p-2 rounded-lg bg-success/10">
                          <CreditCard className="h-4 w-4 text-success" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-lg font-bold">{eventSettings.barcodeType}</div>
                        <div className="text-sm text-muted-foreground">
                          {eventSettings.barcodeLength} characters • {eventSettings.barcodeUnique ? 'Unique' : 'Non-unique'}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="glass-effect border-0 hover:shadow-lg transition-shadow">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Custom Fields</CardTitle>
                        <div className="p-2 rounded-lg bg-info/10">
                          <Plus className="h-4 w-4 text-info" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-lg font-bold">{eventSettings.customFields?.length || 0}</div>
                        <div className="text-sm text-muted-foreground">
                          Additional data fields
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
                            <CreditCard className="h-4 w-4" />
                            Barcode Settings
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Barcode Type:</span> {eventSettings.barcodeType === 'numerical' ? 'Numerical (0-9)' : eventSettings.barcodeType === 'alphanumerical' ? 'Alphanumerical (A-Z, 0-9)' : 'Not set'}
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
                                <div className={`h-2 w-2 rounded-full ${(eventSettings as any).cloudinaryEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                <div>
                                  <div className="font-medium">Cloudinary Integration</div>
                                  <div className="text-xs text-muted-foreground">
                                    {(eventSettings as any).cloudinaryEnabled ? 'Active' : 'Disabled'}
                                    {(eventSettings as any).cloudinaryEnabled && (eventSettings as any).cloudinaryCloudName && (eventSettings as any).cloudinaryApiKey && (eventSettings as any).cloudinaryUploadPreset ? ' - Fully Configured' : (eventSettings as any).cloudinaryEnabled ? ' - Incomplete Configuration' : ''}
                                  </div>
                                </div>
                              </div>
                              <Badge variant={(eventSettings as any).cloudinaryEnabled ? "default" : "secondary"}>
                                {(eventSettings as any).cloudinaryEnabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </div>

                            {/* Switchboard Status */}
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className={`h-2 w-2 rounded-full ${(eventSettings as any).switchboardEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                <div>
                                  <div className="font-medium">Switchboard Canvas Integration</div>
                                  <div className="text-xs text-muted-foreground">
                                    {(eventSettings as any).switchboardEnabled ? 'Active' : 'Disabled'}
                                    {(eventSettings as any).switchboardEnabled && (eventSettings as any).switchboardApiEndpoint && (eventSettings as any).switchboardApiKey ? ' - Fully Configured' : (eventSettings as any).switchboardEnabled ? ' - Incomplete Configuration' : ''}
                                  </div>
                                </div>
                              </div>
                              <Badge variant={(eventSettings as any).switchboardEnabled ? "default" : "secondary"}>
                                {(eventSettings as any).switchboardEnabled ? 'Enabled' : 'Disabled'}
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
                          <Button onClick={() => setShowEventSettingsForm(true)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Settings
                          </Button>
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
                          {eventSettings.customFields.map((field: any) => (
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
              {/* Logs Filters and Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Select 
                    value={logsFilters.action} 
                    onValueChange={(value) => handleLogsFilterChange({ ...logsFilters, action: value })}
                  >
                    <SelectTrigger className="w-48">
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
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email.split('@')[0]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" onClick={exportLogs}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button variant="outline" onClick={() => loadLogs(1, logsFilters)}>
                    <Activity className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Activity Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="glass-effect border-0 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{logsPagination.totalCount}</div>
                  </CardContent>
                </Card>
                <Card className="glass-effect border-0 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Today's Activities</CardTitle>
                    <div className="p-2 rounded-lg bg-success/10">
                      <Calendar className="h-4 w-4 text-success" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-success">
                      {logs.filter(log => {
                        const logDate = new Date(log.createdAt).toDateString();
                        const today = new Date().toDateString();
                        return logDate === today;
                      }).length}
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-effect border-0 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                    <div className="p-2 rounded-lg bg-info/10">
                      <Users className="h-4 w-4 text-info" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-info">
                      {new Set(logs.map(log => log.user.email)).size}
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-effect border-0 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Most Common Action</CardTitle>
                    <div className="p-2 rounded-lg bg-warning/10">
                      <BarChart3 className="h-4 w-4 text-warning" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-warning">
                      {(() => {
                        const actionCounts = logs.reduce((acc: any, log) => {
                          acc[log.action] = (acc[log.action] || 0) + 1;
                          return acc;
                        }, {});
                        const mostCommon = Object.entries(actionCounts).sort(([,a]: any, [,b]: any) => b - a)[0];
                        return mostCommon ? mostCommon[0] : 'N/A';
                      })()}
                    </div>
                  </CardContent>
                </Card>
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
                                  {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                      {(log.user.name || log.user.email).charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium text-sm">{log.user.name || log.user.email.split('@')[0]}</div>
                                    <div className="text-xs text-muted-foreground">{log.user.email}</div>
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
                                      <div className="font-medium">{log.details?.type || "System"}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {log.details?.firstName && log.details?.lastName 
                                          ? `${log.details.firstName} ${log.details.lastName}`
                                          : 'System Operation'
                                        }
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-muted-foreground max-w-xs">
                                  {log.details?.changes && Object.keys(log.details.changes).length > 0 && (
                                    <div className="text-xs">
                                      Changed: {Object.entries(log.details.changes)
                                        .filter(([, changed]) => changed)
                                        .map(([field]) => field)
                                        .join(', ')
                                      }
                                    </div>
                                  )}
                                  {log.details?.count && (
                                    <div className="text-xs">Count: {log.details.count}</div>
                                  )}
                                  {log.details?.barcodeNumber && (
                                    <div className="text-xs">Barcode: {log.details.barcodeNumber}</div>
                                  )}
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

                      {/* Pagination */}
                      {logsPagination.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6">
                          <div className="text-sm text-muted-foreground">
                            Page {logsPagination.page} of {logsPagination.totalPages}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLogsPageChange(logsPagination.page - 1)}
                              disabled={!logsPagination.hasPrev || logsLoading}
                            >
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLogsPageChange(logsPagination.page + 1)}
                              disabled={!logsPagination.hasNext || logsLoading}
                            >
                              Next
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
      <AttendeeForm
        isOpen={showAttendeeForm}
        onClose={() => {
          setShowAttendeeForm(false);
          setEditingAttendee(null);
        }}
        onSave={handleSaveAttendee}
        attendee={editingAttendee}
        customFields={eventSettings?.customFields || []}
        eventSettings={eventSettings}
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