import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, UserPlus, Mail, AlertCircle } from 'lucide-react';

const AdminPage = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingDoctors, setPendingDoctors] = useState<any[]>([]);
  const [adminEmails, setAdminEmails] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [openAddAdminDialog, setOpenAddAdminDialog] = useState(false);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchPendingDoctors();
      fetchAdminEmails();
    }
  }, [userRole]);

  const fetchPendingDoctors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('is_verified', false);

      if (error) throw error;
      setPendingDoctors(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching pending doctors",
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
        .select('*');

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

  const handleVerifyDoctor = async (doctorId: string, isApproved: boolean) => {
    try {
      if (isApproved) {
        // Update doctor verification status
        const { error: doctorError } = await supabase
          .from('doctors')
          .update({ is_verified: true })
          .eq('id', doctorId);

        if (doctorError) throw doctorError;

        // Update profile verification status
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ is_verified: true })
          .eq('id', doctorId);

        if (profileError) throw profileError;

        toast({
          title: "Doctor verified",
          description: "The doctor has been approved and can now log in.",
        });
      } else {
        // If rejected, we could either delete the account or mark it as rejected
        const { error } = await supabase
          .from('doctors')
          .update({ is_verified: false, is_rejected: true })
          .eq('id', doctorId);

        if (error) throw error;

        toast({
          title: "Doctor rejected",
          description: "The doctor application has been rejected.",
        });
      }

      // Refresh the list
      fetchPendingDoctors();
    } catch (error: any) {
      toast({
        title: "Error updating doctor status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAdminEmail || !newAdminEmail.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if email already exists in admin_emails
      const { data: existingAdmin } = await supabase
        .from('admin_emails')
        .select('*')
        .eq('email', newAdminEmail);

      if (existingAdmin && existingAdmin.length > 0) {
        toast({
          title: "Email already exists",
          description: "This email is already in the admin list.",
          variant: "destructive",
        });
        return;
      }

      // Add new admin email
      const { error } = await supabase
        .from('admin_emails')
        .insert({ email: newAdminEmail });

      if (error) throw error;

      toast({
        title: "Admin added",
        description: `${newAdminEmail} has been added to the admin list.`,
      });

      setNewAdminEmail('');
      setOpenAddAdminDialog(false);
      fetchAdminEmails();
    } catch (error: any) {
      toast({
        title: "Error adding admin",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveAdmin = async (id: string) => {
    try {
      const { error } = await supabase
        .from('admin_emails')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Admin removed",
        description: "The email has been removed from the admin list.",
      });

      fetchAdminEmails();
    } catch (error: any) {
      toast({
        title: "Error removing admin",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Unauthorized</CardTitle>
            <CardDescription>
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pending Doctors Section */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Pending Doctor Verifications</CardTitle>
            <CardDescription>
              Approve or reject doctor registration requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingDoctors.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No pending doctor verifications
              </div>
            ) : (
              <div className="space-y-4">
                {pendingDoctors.map((doctor) => (
                  <div key={doctor.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">
                          Dr. {doctor.profile.first_name} {doctor.profile.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{doctor.profile.email}</p>
                      </div>
                      <Badge variant="outline">{doctor.specialty}</Badge>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm"><strong>Qualification:</strong> {doctor.qualification}</p>
                      <p className="text-sm"><strong>Experience:</strong> {doctor.experience_years} years</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleVerifyDoctor(doctor.id, true)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleVerifyDoctor(doctor.id, false)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Emails Section */}
        <Card className="col-span-1">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Admin Emails</CardTitle>
                <CardDescription>
                  Manage emails with admin privileges
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setOpenAddAdminDialog(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Admin
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {adminEmails.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No admin emails configured
              </div>
            ) : (
              <div className="space-y-2">
                {adminEmails.map((admin) => (
                  <div key={admin.id} className="flex justify-between items-center p-2 border rounded-md">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{admin.email}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleRemoveAdmin(admin.id)}
                    >
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Admin Dialog */}
      <Dialog open={openAddAdminDialog} onOpenChange={setOpenAddAdminDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Admin Email</DialogTitle>
            <DialogDescription>
              Add an email address that will have admin privileges.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAdmin}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenAddAdminDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Admin</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;