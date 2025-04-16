
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid, addMinutes } from 'date-fns';
import { Calendar as CalendarIcon, Clock, FileText, X, Pencil, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type AppointmentStatus = Database['public']['Enums']['appointment_status'];
type DoctorSpecialty = Database['public']['Enums']['doctor_specialty'];

const AppointmentPage = () => {
  const { user, userRole, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [openNewAppointment, setOpenNewAppointment] = useState(false);
  const [openViewAppointment, setOpenViewAppointment] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [formData, setFormData] = useState({
    doctorId: '',
    patientId: user?.id || '',
    appointmentDate: new Date(),
    time: '09:00',
    duration: 30,
    reason: '',
    notes: ''
  });

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let query = supabase.from('appointments').select(`
        *,
        doctor:doctors(*),
        patient:profiles!appointments_patient_id_fkey(*)
      `);

      if (userRole === 'doctor') {
        query = query.eq('doctor_id', user!.id);
      } else if (userRole === 'patient') {
        query = query.eq('patient_id', user!.id);
      }

      const { data, error } = await query.order('appointment_date', { ascending: true });

      if (error) {
        throw error;
      }

      setAppointments(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching appointments",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          *,
          profile:profiles(*)
        `);

      if (error) {
        throw error;
      }

      setDoctors(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching doctors",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchPatients = async () => {
    if (userRole !== 'admin') return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'patient');

      if (error) {
        throw error;
      }

      setPatients(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching patients",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
    fetchPatients();
  }, [user, userRole]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      setFormData({
        ...formData,
        appointmentDate: newDate
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const [hours, minutes] = formData.time.split(':').map(Number);
      const appointmentDateTime = new Date(formData.appointmentDate);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      const appointmentData = {
        doctor_id: formData.doctorId,
        patient_id: userRole === 'admin' ? formData.patientId : user!.id,
        appointment_date: appointmentDateTime.toISOString(),
        duration_minutes: formData.duration,
        reason: formData.reason,
        notes: formData.notes,
        status: 'scheduled' as AppointmentStatus
      };

      const { error } = await supabase.from('appointments').insert(appointmentData);

      if (error) {
        throw error;
      }

      toast({
        title: "Appointment created",
        description: "Your appointment has been scheduled successfully.",
      });

      setOpenNewAppointment(false);
      fetchAppointments();
    } catch (error: any) {
      toast({
        title: "Error creating appointment",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateAppointmentStatus = async (id: string, status: AppointmentStatus) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: "Appointment updated",
        description: `Appointment status changed to ${status}.`,
      });

      fetchAppointments();
      setOpenViewAppointment(false);
    } catch (error: any) {
      toast({
        title: "Error updating appointment",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'missed':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewAppointment = (appointment: any) => {
    setSelectedAppointment(appointment);
    setOpenViewAppointment(true);
  };

  const renderAppointments = () => {
    if (loading) {
      return Array(3).fill(0).map((_, index) => (
        <Card key={index} className="mb-4">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full mb-2" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ));
    }

    if (appointments.length === 0) {
      return (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>No appointments found</CardTitle>
            <CardDescription>
              {userRole === 'patient' 
                ? "You haven't scheduled any appointments yet." 
                : "No appointments scheduled."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userRole === 'patient' && (
              <Button onClick={() => setOpenNewAppointment(true)}>
                Schedule an appointment
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    return appointments.map((appointment) => {
      const appointmentDate = parseISO(appointment.appointment_date);
      const endTime = addMinutes(appointmentDate, appointment.duration_minutes);
      const doctorName = `${appointment.doctor?.profile?.first_name || ''} ${appointment.doctor?.profile?.last_name || ''}`.trim();
      const patientName = `${appointment.patient?.first_name || ''} ${appointment.patient?.last_name || ''}`.trim();
      
      return (
        <Card key={appointment.id} className="mb-4 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">
                  {isValid(appointmentDate) ? format(appointmentDate, 'MMMM d, yyyy') : 'Invalid date'}
                </CardTitle>
                <CardDescription>
                  {isValid(appointmentDate) ? format(appointmentDate, 'h:mm a') : 'Invalid time'} - 
                  {isValid(endTime) ? format(endTime, ' h:mm a') : 'Invalid time'}
                </CardDescription>
              </div>
              <Badge className={getStatusColor(appointment.status)}>
                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {userRole === 'patient' && (
              <div className="mb-2">
                <p className="text-sm font-medium">Doctor</p>
                <p>{doctorName || 'Unknown doctor'}</p>
              </div>
            )}
            {(userRole === 'doctor' || userRole === 'admin') && (
              <div className="mb-2">
                <p className="text-sm font-medium">Patient</p>
                <p>{patientName || 'Unknown patient'}</p>
              </div>
            )}
            {appointment.reason && (
              <div className="mb-2">
                <p className="text-sm font-medium">Reason</p>
                <p className="line-clamp-2">{appointment.reason}</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => handleViewAppointment(appointment)}>
              View Details
            </Button>
          </CardFooter>
        </Card>
      );
    });
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Appointments</h1>
        {(userRole === 'patient' || userRole === 'admin') && (
          <Button onClick={() => setOpenNewAppointment(true)}>
            Schedule New Appointment
          </Button>
        )}
      </div>

      <Tabs defaultValue="upcoming" className="mb-6">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="space-y-4">
          {renderAppointments()}
        </TabsContent>
      </Tabs>

      {/* New Appointment Dialog */}
      <Dialog open={openNewAppointment} onOpenChange={setOpenNewAppointment}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule New Appointment</DialogTitle>
            <DialogDescription>
              Fill out the form below to schedule an appointment with a doctor.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {userRole === 'admin' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="patientId" className="text-right">
                    Patient
                  </Label>
                  <div className="col-span-3">
                    <Select 
                      name="patientId"
                      value={formData.patientId} 
                      onValueChange={(value) => handleSelectChange('patientId', value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {`${patient.first_name} ${patient.last_name}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="doctorId" className="text-right">
                  Doctor
                </Label>
                <div className="col-span-3">
                  <Select 
                    name="doctorId"
                    value={formData.doctorId} 
                    onValueChange={(value) => handleSelectChange('doctorId', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {`Dr. ${doctor.profile.first_name} ${doctor.profile.last_name} (${doctor.specialty})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  Date
                </Label>
                <div className="col-span-3">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateChange}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="time" className="text-right">
                  Time
                </Label>
                <div className="col-span-3">
                  <Select 
                    name="time"
                    value={formData.time} 
                    onValueChange={(value) => handleSelectChange('time', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 9 }, (_, i) => i + 9).map((hour) => (
                        <React.Fragment key={hour}>
                          <SelectItem value={`${hour.toString().padStart(2, '0')}:00`}>
                            {`${hour}:00 ${hour < 12 ? 'AM' : 'PM'}`}
                          </SelectItem>
                          <SelectItem value={`${hour.toString().padStart(2, '0')}:30`}>
                            {`${hour}:30 ${hour < 12 ? 'AM' : 'PM'}`}
                          </SelectItem>
                        </React.Fragment>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="duration" className="text-right">
                  Duration
                </Label>
                <div className="col-span-3">
                  <Select 
                    name="duration"
                    value={formData.duration.toString()} 
                    onValueChange={(value) => handleSelectChange('duration', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reason" className="text-right">
                  Reason
                </Label>
                <div className="col-span-3">
                  <Input
                    id="reason"
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    placeholder="Brief reason for the appointment"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">
                  Notes
                </Label>
                <div className="col-span-3">
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Any additional details or notes"
                    rows={3}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenNewAppointment(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Schedule Appointment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Appointment Dialog */}
      <Dialog open={openViewAppointment} onOpenChange={setOpenViewAppointment}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedAppointment && (
            <>
              <DialogHeader>
                <DialogTitle>Appointment Details</DialogTitle>
                <DialogDescription>
                  View and manage appointment information
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-gray-500" />
                    <span className="font-medium">
                      {isValid(parseISO(selectedAppointment.appointment_date))
                        ? format(parseISO(selectedAppointment.appointment_date), 'MMMM d, yyyy')
                        : 'Invalid date'}
                    </span>
                  </div>
                  <Badge className={getStatusColor(selectedAppointment.status)}>
                    {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <span>
                    {isValid(parseISO(selectedAppointment.appointment_date))
                      ? format(parseISO(selectedAppointment.appointment_date), 'h:mm a')
                      : 'Invalid time'} - 
                    {isValid(parseISO(selectedAppointment.appointment_date))
                      ? format(addMinutes(parseISO(selectedAppointment.appointment_date), selectedAppointment.duration_minutes), ' h:mm a')
                      : 'Invalid time'}
                    {' '}({selectedAppointment.duration_minutes} minutes)
                  </span>
                </div>

                {userRole === 'patient' && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Doctor</h3>
                    <p className="font-medium">
                      Dr. {selectedAppointment.doctor?.profile?.first_name || ''} {selectedAppointment.doctor?.profile?.last_name || ''}
                    </p>
                    <p className="text-sm text-gray-600 capitalize">{selectedAppointment.doctor?.specialty}</p>
                  </div>
                )}

                {(userRole === 'doctor' || userRole === 'admin') && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Patient</h3>
                    <p className="font-medium">{selectedAppointment.patient?.first_name || ''} {selectedAppointment.patient?.last_name || ''}</p>
                    <p className="text-sm text-gray-600">{selectedAppointment.patient?.email}</p>
                    {selectedAppointment.patient?.phone && (
                      <p className="text-sm text-gray-600">{selectedAppointment.patient.phone}</p>
                    )}
                  </div>
                )}

                {selectedAppointment.reason && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Reason</h3>
                    <p>{selectedAppointment.reason}</p>
                  </div>
                )}

                {selectedAppointment.notes && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Notes</h3>
                    <p className="whitespace-pre-line">{selectedAppointment.notes}</p>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                {selectedAppointment.status === 'scheduled' && (
                  <div className="flex gap-2 w-full justify-between">
                    <Button 
                      variant="destructive" 
                      onClick={() => updateAppointmentStatus(selectedAppointment.id, 'cancelled')}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel Appointment
                    </Button>
                    
                    {(userRole === 'doctor' || userRole === 'admin') && (
                      <Button 
                        variant="default" 
                        onClick={() => updateAppointmentStatus(selectedAppointment.id, 'completed')}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Mark as Completed
                      </Button>
                    )}
                  </div>
                )}

                {selectedAppointment.status === 'cancelled' && userRole === 'patient' && (
                  <Button 
                    variant="outline"
                    onClick={() => updateAppointmentStatus(selectedAppointment.id, 'scheduled')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Reschedule
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentPage;
