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
  Printer
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import AttendeeForm from "@/components/AttendeeForm";
import UserForm from "@/components/UserForm";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: {
    id: string;
    name: string;
    permissions: any;
  } | null;
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
  createdAt: string;
  customFieldValues: any[];
}

interface EventSettings {
  id: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  timeZone: string;
  barcodeType: string;
  barcodeLength: number;
  barcodeUnique: boolean;
  bannerImageUrl: string | null;
  customFields: any[];
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [showAttendeeForm, setShowAttendeeForm] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null);
  const [printingAttendee, setPrintingAttendee] = useState<string | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

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

        // Load logs
        const logsResponse = await fetch('/api/logs');
        if (logsResponse.ok) {
          const logsData = await logsResponse.json();
          setLogs(Array.isArray(logsData) ? logsData : []);
        } else {
          setLogs([]);
        }
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
        ]
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

  const filteredAttendees = attendees.filter(attendee =>
    `${attendee.firstName} ${attendee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attendee.barcodeNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = selectedRole === "all" || user.role?.id === selectedRole;
    return matchesSearch && matchesRole;
  });

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
              <div className="mt-2">
                <h3 className="font-semibold text-sm">{eventSettings.eventName}</h3>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date(eventSettings.eventDate).toLocaleDateString()}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 mr-1" />
                  {eventSettings.eventLocation}
                </div>
              </div>
            </div>
          )}

          <nav className="space-y-2">
            <Button
              variant={activeTab === "attendees" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("attendees")}
            >
              <Users className="mr-2 h-4 w-4" />
              Attendees
            </Button>
            <Button
              variant={activeTab === "users" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("users")}
            >
              <Shield className="mr-2 h-4 w-4" />
              User Management
            </Button>
            <Button
              variant={activeTab === "roles" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("roles")}
            >
              <Shield className="mr-2 h-4 w-4" />
              Roles
            </Button>
            <Button
              variant={activeTab === "settings" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("settings")}
            >
              <Settings className="mr-2 h-4 w-4" />
              Event Settings
            </Button>
            <Button
              variant={activeTab === "logs" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("logs")}
            >
              <Activity className="mr-2 h-4 w-4" />
              Activity Logs
            </Button>
          </nav>
        </div>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t">
          <div className="flex items-center space-x-3 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback>
                {user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
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
              {activeTab === "attendees" && (
                <Button onClick={() => setShowAttendeeForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Attendee
                </Button>
              )}
              {activeTab === "users" && (
                <Button onClick={() => setShowUserForm(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              )}
            </div>
          </div>

          {/* Content based on active tab */}
          {activeTab === "attendees" && (
            <div className="space-y-6">
              {/* Search and Filters */}
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
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAttendees.map((attendee) => (
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
                              <div className="font-medium">{attendee.firstName} {attendee.lastName}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{attendee.barcodeNumber}</Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(attendee.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setEditingAttendee(attendee);
                                  setShowAttendeeForm(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setEditingAttendee(attendee);
                                  setShowAttendeeForm(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handlePrintCredential(attendee.id)}
                                disabled={printingAttendee === attendee.id}
                              >
                                {printingAttendee === attendee.id ? (
                                  <Printer className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CreditCard className="h-4 w-4" />
                                )}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-destructive"
                                onClick={() => handleDeleteAttendee(attendee.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-destructive"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
              {/* Roles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map((role) => (
                  <Card key={role.id} className="glass-effect border-0 hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {role.name}
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </CardTitle>
                      <CardDescription>{role.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Permissions:</div>
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(role.permissions).map((permission) => (
                            <Badge key={permission} variant="outline" className="text-xs">
                              {permission}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === "settings" && eventSettings && (
            <div className="space-y-6">
              <Tabs defaultValue="general" className="w-full">
                <TabsList>
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="barcode">Barcode Settings</TabsTrigger>
                  <TabsTrigger value="integrations">Integrations</TabsTrigger>
                  <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="space-y-6">
                  <Card className="glass-effect border-0">
                    <CardHeader>
                      <CardTitle>Event Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="eventName">Event Name</Label>
                          <Input id="eventName" value={eventSettings.eventName} />
                        </div>
                        <div>
                          <Label htmlFor="eventDate">Event Date</Label>
                          <Input id="eventDate" type="date" value={eventSettings.eventDate} />
                        </div>
                        <div>
                          <Label htmlFor="eventLocation">Location</Label>
                          <Input id="eventLocation" value={eventSettings.eventLocation} />
                        </div>
                        <div>
                          <Label htmlFor="timeZone">Time Zone</Label>
                          <Select value={eventSettings.timeZone}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                              <SelectItem value="America/New_York">Eastern Time</SelectItem>
                              <SelectItem value="America/Chicago">Central Time</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="bannerImage">Banner Image URL</Label>
                        <Input id="bannerImage" value={eventSettings.bannerImageUrl || ""} />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="barcode" className="space-y-6">
                  <Card className="glass-effect border-0">
                    <CardHeader>
                      <CardTitle>Barcode Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="barcodeType">Barcode Type</Label>
                          <Select value={eventSettings.barcodeType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="numerical">Numerical</SelectItem>
                              <SelectItem value="alphanumerical">Alphanumerical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="barcodeLength">Barcode Length</Label>
                          <Input id="barcodeLength" type="number" value={eventSettings.barcodeLength} />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="barcodeUnique" checked={eventSettings.barcodeUnique} />
                        <Label htmlFor="barcodeUnique">Ensure unique barcodes</Label>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="integrations" className="space-y-6">
                  <Card className="glass-effect border-0">
                    <CardHeader>
                      <CardTitle>Cloudinary Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="cloudName">Cloud Name</Label>
                          <Input id="cloudName" placeholder="your-cloud-name" />
                        </div>
                        <div>
                          <Label htmlFor="uploadPreset">Upload Preset</Label>
                          <Input id="uploadPreset" placeholder="your-upload-preset" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-effect border-0">
                    <CardHeader>
                      <CardTitle>Switchboard Canvas Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="switchboardApiKey">API Key</Label>
                          <Input id="switchboardApiKey" type="password" placeholder="your-api-key" />
                        </div>
                        <div>
                          <Label htmlFor="templateId">Template ID</Label>
                          <Input id="templateId" placeholder="your-template-id" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="custom-fields" className="space-y-6">
                  <Card className="glass-effect border-0">
                    <CardHeader>
                      <CardTitle>Custom Fields</CardTitle>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Field
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {eventSettings.customFields.map((field: any) => (
                          <div key={field.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium">{field.fieldName}</div>
                              <div className="text-sm text-muted-foreground">
                                Type: {field.fieldType} • {field.required ? "Required" : "Optional"}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="space-y-6">
              {/* Logs Table */}
              <Card className="glass-effect border-0">
                <CardHeader>
                  <CardTitle>Activity Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Target</TableHead>
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
                              "outline"
                            }>
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{log.user.name || log.user.email.split('@')[0]}</div>
                              <div className="text-sm text-muted-foreground">{log.user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.attendee ? (
                              `${log.attendee.firstName} ${log.attendee.lastName}`
                            ) : (
                              log.details?.type || "System"
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(log.createdAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
    </div>
  );
}