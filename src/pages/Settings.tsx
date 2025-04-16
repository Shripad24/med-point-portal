
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Users, Settings as SettingsIcon, ShieldCheck, UserPlus, CheckCircle2, AlertTriangle, Trash2, AlertCircle } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type DoctorSpecialty = Database['public']['Enums']['doctor_specialty'];
type UserRole = Database['public']['Enums']['user_role'];

const SettingsPage = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    role: 'patient' as UserRole,
    qualification: '',
    specialty: 'general' as DoctorSpecialty,
    experienceYears: '0'
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (userRole !== 'admin') return;
    fetchUsers();
  }, [user, userRole]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching users",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewUserInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUserForm({
      ...newUserForm,
      [name]: value
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'specialty') {
      setNewUserForm({
        ...newUserForm,
        [name]: value as DoctorSpecialty
      });
    } else if (name === 'role') {
      setNewUserForm({
        ...newUserForm,
        [name]: value as UserRole
      });
    } else {
      setNewUserForm({
        ...newUserForm,
        [name]: value
      });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create user in Supabase Auth
      const { data: userData, error: userError } = await supabase.auth.signUp({
        email: newUserForm.email,
        password: newUserForm.password,
        options: {
          data: {
            first_name: newUserForm.firstName,
            last_name: newUserForm.lastName
          }
        }
      });

      if (userError) throw userError;

      if (!userData.user) {
        throw new Error("Failed to create user");
      }

      // Update user's role in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: newUserForm.role })
        .eq('id', userData.user.id);

      if (profileError) throw profileError;

      // If creating a doctor, add doctor information
      if (newUserForm.role === 'doctor') {
        const doctorData = {
          id: userData.user.id,
          qualification: newUserForm.qualification,
          specialty: newUserForm.specialty,
          experience_years: parseInt(newUserForm.experienceYears)
        };
        
        const { error: doctorError } = await supabase
          .from('doctors')
          .insert(doctorData);

        if (doctorError) throw doctorError;
      }

      toast({
        title: "User created",
        description: `New ${newUserForm.role} account has been created successfully.`,
      });

      // Reset form
      setNewUserForm({
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        role: 'patient' as UserRole,
        qualification: '',
        specialty: 'general' as DoctorSpecialty,
        experienceYears: '0'
      });

      // Refresh user list
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error creating user",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserRoleUpdate = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      toast({
        title: "Role updated",
        description: `User role has been updated to ${newRole}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      // Delete user from Auth
      const { error } = await supabase.auth.admin.deleteUser(selectedUser.id);

      if (error) throw error;

      toast({
        title: "User deleted",
        description: "User has been deleted successfully.",
      });

      setOpenDeleteDialog(false);
      setOpenUserDialog(false);
      // Refresh user list
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUserClick = (user: any) => {
    setSelectedUser(user);
    setOpenUserDialog(true);
  };

  const getFilteredUsers = () => {
    if (!searchTerm) return users;
    
    const term = searchTerm.toLowerCase();
    return users.filter(user => 
      user.first_name.toLowerCase().includes(term) ||
      user.last_name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.role.toLowerCase().includes(term)
    );
  };

  const getInitials = (firstName: string, lastName: string) => {
    return (firstName?.[0] || '') + (lastName?.[0] || '');
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs';
      case 'doctor':
        return 'bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs';
      default:
        return 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs';
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="container mx-auto p-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to access the admin settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Admin Settings</h1>
      
      <Tabs defaultValue="users">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="system">
            <SettingsIcon className="h-4 w-4 mr-2" />
            System Settings
          </TabsTrigger>
        </TabsList>
        
        {/* User Management Tab */}
        <TabsContent value="users" className="mt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* User List */}
            <div className="flex-1">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Users</h2>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                </DialogTrigger>
              </div>
              
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-4"
              />
              
              <div className="space-y-2">
                {loading ? (
                  Array(5).fill(0).map((_, index) => (
                    <div key={index} className="flex items-center p-3 border rounded-md">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="ml-3 space-y-1 flex-1">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))
                ) : (
                  getFilteredUsers().map(user => (
                    <div 
                      key={user.id} 
                      className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleUserClick(user)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {getInitials(user.first_name, user.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="ml-3 flex-1">
                        <div className="font-medium">{user.first_name} {user.last_name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                      <span className={getRoleBadgeClass(user.role)}>
                        {user.role}
                      </span>
                    </div>
                  ))
                )}
                
                {!loading && getFilteredUsers().length === 0 && (
                  <div className="text-center p-4 border rounded-md">
                    <p className="text-gray-500">No users found</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Add User Form */}
            <Dialog>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account with the specified role
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleCreateUser}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={newUserForm.firstName}
                          onChange={handleNewUserInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={newUserForm.lastName}
                          onChange={handleNewUserInputChange}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={newUserForm.email}
                        onChange={handleNewUserInputChange}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={newUserForm.password}
                        onChange={handleNewUserInputChange}
                        required
                        minLength={6}
                      />
                      <p className="text-xs text-gray-500">
                        Password must be at least 6 characters
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select 
                        value={newUserForm.role}
                        onValueChange={(value) => handleSelectChange('role', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="patient">Patient</SelectItem>
                          <SelectItem value="doctor">Doctor</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {newUserForm.role === 'doctor' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="qualification">Qualification</Label>
                          <Input
                            id="qualification"
                            name="qualification"
                            value={newUserForm.qualification}
                            onChange={handleNewUserInputChange}
                            placeholder="MD, MBBS, etc."
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="specialty">Specialty</Label>
                          <Select 
                            value={newUserForm.specialty}
                            onValueChange={(value) => handleSelectChange('specialty', value)}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a specialty" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cardiology">Cardiology</SelectItem>
                              <SelectItem value="dermatology">Dermatology</SelectItem>
                              <SelectItem value="neurology">Neurology</SelectItem>
                              <SelectItem value="orthopedics">Orthopedics</SelectItem>
                              <SelectItem value="pediatrics">Pediatrics</SelectItem>
                              <SelectItem value="psychiatry">Psychiatry</SelectItem>
                              <SelectItem value="gynecology">Gynecology</SelectItem>
                              <SelectItem value="ophthalmology">Ophthalmology</SelectItem>
                              <SelectItem value="general">General</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="experienceYears">Years of Experience</Label>
                          <Input
                            id="experienceYears"
                            name="experienceYears"
                            type="number"
                            min="0"
                            max="50"
                            value={newUserForm.experienceYears}
                            onChange={handleNewUserInputChange}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  
                  <DialogFooter>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Creating...' : 'Create User'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>
        
        {/* System Settings Tab */}
        <TabsContent value="system" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>
                Configure global system settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-md font-medium">Allow New Registrations</h3>
                  <p className="text-sm text-gray-500">
                    Enable or disable public user registration
                  </p>
                </div>
                <Switch checked={true} />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-md font-medium">Email Notifications</h3>
                  <p className="text-sm text-gray-500">
                    Send email notifications for appointments
                  </p>
                </div>
                <Switch checked={true} />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-md font-medium">Allow Weekend Appointments</h3>
                  <p className="text-sm text-gray-500">
                    Enable scheduling appointments on weekends
                  </p>
                </div>
                <Switch checked={false} />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="button">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Save Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* User Details Dialog */}
      <Dialog open={openUserDialog} onOpenChange={setOpenUserDialog}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle>User Details</DialogTitle>
                <DialogDescription>
                  View and manage user information
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-lg">
                      {getInitials(selectedUser.first_name, selectedUser.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h2 className="text-xl font-bold">
                      {selectedUser.first_name} {selectedUser.last_name}
                    </h2>
                    <p className="text-gray-500">{selectedUser.email}</p>
                    <span className={getRoleBadgeClass(selectedUser.role)}>
                      {selectedUser.role}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Change Role</Label>
                    <Select 
                      value={selectedUser.role}
                      onValueChange={(value) => handleUserRoleUpdate(selectedUser.id, value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="patient">Patient</SelectItem>
                        <SelectItem value="doctor">Doctor</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedUser.phone && (
                    <div className="pt-2">
                      <Label className="text-sm text-gray-500">Phone</Label>
                      <p>{selectedUser.phone}</p>
                    </div>
                  )}
                  
                  <div className="pt-2">
                    <Label className="text-sm text-gray-500">Created</Label>
                    <p>{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="gap-2">
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    setOpenDeleteDialog(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete User
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
