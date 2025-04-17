import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, XCircle, UserPlus, Trash2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [adminEmails, setAdminEmails] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [stats, setStats] = useState({
    totalDoctors: 0,
    pendingDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0
  });

  // Redirect if not admin
  if (userRole !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  useEffect(() => {
    fetchDoctors();
    fetchAdminEmails();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch total doctors
      const { count: totalDoctors, error: doctorsError } = await supabase
        .from('doctors')
        .select('*', { count: 'exact', head: true });

      if (doctorsError) throw doctorsError;

      // Fetch pending doctors
      const { count: pendingDoctors, error: pendingError } = await supabase
        .from('doctors')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', false);

      if (pendingError) throw pendingError;

      // Fetch total patients
      const { count: totalPatients, error: patientsError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'patient');

      if (patientsError) throw patientsError;

      // Fetch total appointments
      const { count: totalAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true });

      if (appointmentsError) throw appointmentsError;

      setStats({
        totalDoctors: totalDoctors || 0,
        pendingDoctors: pendingDoctors || 0,
        totalPatients: totalPatients || 0,
        totalAppointments: totalAppointments || 0
      });
    } catch (error: any) {
      toast({
        title: "Error fetching statistics",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          *,
          profile:profiles(*)
        `)
        .order('is_verified', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDoctors(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching doctors",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_emails')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAdminEmails(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching admin emails",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleVerifyDoctor = async (doctorId: string, isVerified: boolean) => {
    try {
      const { error } = await supabase
        .from('doctors')
        .update({ is_verified: isVerified })
        .eq('id', doctorId);

      if (error) throw error;

      // Update local state
      setDoctors(doctors.map(doctor => 
        doctor.id === doctorId ? { ...doctor, is_verified: isVerified } : doctor
      ));

      // Update stats
      setStats({
        ...stats,
        pendingDoctors: isVerified 
          ? Math.max(0, stats.pendingDoctors - 1) 
          : stats.pendingDoctors + 1
      });

      toast({
        title: isVerified ? "Doctor verified" : "Doctor verification revoked",
        description: isVerified 
          ? "The doctor can now log in and use the system." 
          : "The doctor's access has been revoked.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating verification status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddAdminEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail || !newAdminEmail.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_emails')
        .insert({ email: newAdminEmail });

      if (error) throw error;

      toast({
        title: "Admin email added",
        description: `${newAdminEmail} has been added as an admin.`,
      });

      setNewAdminEmail('');
      fetchAdminEmails();
    } catch (error: any) {
      toast({
        title: "Error adding admin email",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveAdminEmail = async (id: string, email: string) => {
    try {
      const { error } = await supabase
        .from('admin_emails')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAdminEmails(adminEmails.filter(admin => admin.id !== id));

      toast({
        title: "Admin email removed",
        description: `${email} has been removed from admins.`,
      });
    } catch (error: any) {
      toast({
        title: "Error removing admin email",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // In the render section of AdminDashboard.tsx, ensure you have a clear doctors listing with verification options
  const renderDoctorsList = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-6">
                  <Skeleton className="h-5 w-1/2 mb-4" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
  
    if (doctors.length === 0) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No doctors found in the system.</AlertDescription>
        </Alert>
      );
    }
  
    return (
      <div className="space-y-4">
        {doctors.map((doctor) => (
          <Card key={doctor.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarFallback>
                      {doctor.profile?.first_name?.[0]}{doctor.profile?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">
                      Dr. {doctor.profile?.first_name} {doctor.profile?.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {doctor.specialty} • {doctor.experience_years} years experience
                    </p>
                    <p className="text-sm text-muted-foreground">{doctor.profile?.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={doctor.is_verified ? "success" : "destructive"}>
                    {doctor.is_verified ? "Verified" : "Pending"}
                  </Badge>
                  {doctor.is_verified ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleVerifyDoctor(doctor.id, false)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Revoke
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleVerifyDoctor(doctor.id, true)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDoctors}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDoctors}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAppointments}</div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="doctors">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="doctors">Doctor Verification</TabsTrigger>
          <TabsTrigger value="admins">Admin Access</TabsTrigger>
        </TabsList>
        
        {/* Doctors Verification Tab */}
        <TabsContent value="doctors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Doctor Verification</CardTitle>
              <CardDescription>
                Approve or revoke access for doctor accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array(3).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : doctors.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No doctor accounts found</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {doctors.map(doctor => (
                    <div key={doctor.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarFallback>
                            {doctor.profile?.first_name?.[0]}{doctor.profile?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">Dr. {doctor.profile?.first_name} {doctor.profile?.last_name}</p>
                          <p className="text-sm text-muted-foreground">{doctor.qualification} • {doctor.specialty}</p>
                          <p className="text-sm text-muted-foreground">{doctor.profile?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {doctor.is_verified ? (
                          <>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Verified
                            </Badge>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleVerifyDoctor(doctor.id, false)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Revoke Access
                            </Button>
                          </>
                        ) : (
                          <>
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              Pending
                            </Badge>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleVerifyDoctor(doctor.id, true)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Verify Doctor
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Admin Access Tab */}
        <TabsContent value="admins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Access</CardTitle>
              <CardDescription>
                Manage email addresses with admin privileges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleAddAdminEmail} className="flex space-x-2">
                <Input
                  placeholder="Enter email address"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit">
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add Admin
                </Button>
              </form>
              
              {loading ? (
                <div className="space-y-3">
                  {Array(3).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : adminEmails.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No admin emails configured</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {adminEmails.map(admin => (
                    <div key={admin.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <span>{admin.email}</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRemoveAdminEmail(admin.id, admin.email)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;