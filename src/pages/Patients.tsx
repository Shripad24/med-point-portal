
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, User, Activity, FileText, Phone, Mail, Clock } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const PatientsPage = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientAppointments, setPatientAppointments] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  
  useEffect(() => {
    fetchPatients();
  }, [user, userRole]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      let query;
      
      if (userRole === 'doctor') {
        // Doctors can only see patients they've had appointments with
        const { data: appointmentData, error: appointmentError } = await supabase
          .from('appointments')
          .select('patient_id')
          .eq('doctor_id', user!.id)
          .order('appointment_date', { ascending: false });
          
        if (appointmentError) throw appointmentError;
        
        if (!appointmentData || appointmentData.length === 0) {
          setPatients([]);
          setLoading(false);
          return;
        }
        
        // Get unique patient IDs
        const patientIds = [...new Set(appointmentData.map(app => app.patient_id))];
        
        query = supabase
          .from('profiles')
          .select('*')
          .eq('role', 'patient')
          .in('id', patientIds);
      } else if (userRole === 'admin') {
        // Admins can see all patients
        query = supabase
          .from('profiles')
          .select('*')
          .eq('role', 'patient');
      } else {
        setPatients([]);
        setLoading(false);
        return;
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setPatients(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching patients",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientAppointments = async (patientId: string) => {
    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          doctor:doctors(*),
          doctor_profile:profiles!doctors(*)
        `)
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: false });
        
      if (userRole === 'doctor') {
        // Doctors can only see their own appointments with this patient
        query = query.eq('doctor_id', user!.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setPatientAppointments(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching patient appointments",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePatientClick = async (patient: any) => {
    setSelectedPatient(patient);
    await fetchPatientAppointments(patient.id);
    setOpenDialog(true);
  };

  const handleScheduleAppointment = (patientId: string) => {
    setOpenDialog(false);
    // Navigate to appointments page with the patient pre-selected
    navigate('/appointments', { state: { selectedPatientId: patientId } });
  };

  const getFilteredPatients = () => {
    if (!searchTerm) return patients;
    
    const term = searchTerm.toLowerCase();
    return patients.filter(patient => 
      patient.first_name.toLowerCase().includes(term) ||
      patient.last_name.toLowerCase().includes(term) ||
      patient.email.toLowerCase().includes(term) ||
      (patient.phone && patient.phone.includes(term))
    );
  };

  const getInitials = (firstName: string, lastName: string) => {
    return (firstName?.[0] || '') + (lastName?.[0] || '');
  };

  const renderPatientsList = () => {
    if (loading) {
      return Array(6).fill(0).map((_, index) => (
        <Card key={index} className="mb-4">
          <CardHeader className="flex flex-row items-start gap-4 pb-2">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-5 w-1/3 mb-2" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-9 w-full" />
          </CardFooter>
        </Card>
      ));
    }

    const filteredPatients = getFilteredPatients();
    
    if (filteredPatients.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>No patients found</CardTitle>
            <CardDescription>
              {searchTerm 
                ? "No patients match your search criteria."
                : userRole === 'doctor' 
                  ? "You don't have any patients yet."
                  : "There are no registered patients."}
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return filteredPatients.map(patient => {
      const fullName = `${patient.first_name} ${patient.last_name}`;
      
      return (
        <Card key={patient.id} className="mb-4 hover:shadow-md transition-shadow cursor-pointer" 
          onClick={() => handlePatientClick(patient)}>
          <CardHeader className="flex flex-row items-start gap-4 pb-2">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/20 text-primary">
                {getInitials(patient.first_name, patient.last_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{fullName}</CardTitle>
              <CardDescription>{patient.email}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {patient.phone && (
              <p className="text-sm">
                <Phone className="h-4 w-4 inline mr-1 text-gray-500" />
                <span>{patient.phone}</span>
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={(e) => {
              e.stopPropagation();
              handleScheduleAppointment(patient.id);
            }}>
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Appointment
            </Button>
          </CardFooter>
        </Card>
      );
    });
  };

  const renderPatientAppointments = () => {
    if (patientAppointments.length === 0) {
      return (
        <div className="p-4 text-center bg-gray-50 rounded-md">
          <p className="text-gray-500">No appointment history found for this patient.</p>
        </div>
      );
    }

    return patientAppointments.map(appointment => {
      const appointmentDate = parseISO(appointment.appointment_date);
      const doctorName = appointment.doctor_profile 
        ? `Dr. ${appointment.doctor_profile.first_name} ${appointment.doctor_profile.last_name}`
        : 'Unknown Doctor';
      
      return (
        <Card key={appointment.id} className="mb-2">
          <CardHeader className="p-3 pb-0">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-medium">
                  {isValid(appointmentDate) ? format(appointmentDate, 'MMM d, yyyy') : 'Invalid date'}
                </span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                appointment.status === 'missed' ? 'bg-amber-100 text-amber-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm">
                {isValid(appointmentDate) ? format(appointmentDate, 'h:mm a') : 'Invalid time'}
                {' '}({appointment.duration_minutes} min)
              </span>
            </div>
            {userRole === 'admin' && (
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{doctorName}</span>
              </div>
            )}
            {appointment.reason && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Reason:</p>
                <p className="text-sm">{appointment.reason}</p>
              </div>
            )}
          </CardContent>
        </Card>
      );
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Patients</h1>
      
      <div className="mb-6">
        <Input
          placeholder="Search patients by name, email or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {renderPatientsList()}
      </div>
      
      {/* Patient Detail Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedPatient && (
            <>
              <DialogHeader>
                <DialogTitle>Patient Profile</DialogTitle>
                <DialogDescription>
                  View detailed information about the patient
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="profile" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="appointments">Appointment History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="profile" className="py-4">
                  <div className="flex items-start gap-4 mb-6">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-primary/20 text-primary text-lg">
                        {getInitials(selectedPatient.first_name, selectedPatient.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h2 className="text-xl font-bold">
                        {selectedPatient.first_name} {selectedPatient.last_name}
                      </h2>
                      <p className="text-gray-500">Patient</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-gray-500" />
                      <span>{selectedPatient.email}</span>
                    </div>
                    
                    {selectedPatient.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-5 w-5 text-gray-500" />
                        <span>{selectedPatient.phone}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6">
                    <Button onClick={() => handleScheduleAppointment(selectedPatient.id)}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Schedule Appointment
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="appointments" className="py-4">
                  <h3 className="text-lg font-semibold mb-4">Appointment History</h3>
                  {renderPatientAppointments()}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientsPage;
