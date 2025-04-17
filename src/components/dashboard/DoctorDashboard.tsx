import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, isValid, addDays, startOfDay, endOfDay } from 'date-fns';
import { Calendar, Clock, Users, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [completedAppointments, setCompletedAppointments] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    todayAppointments: 0
  });
  const [doctorId, setDoctorId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchDoctorId();
    }
  }, [user]);

  useEffect(() => {
    if (doctorId) {
      fetchDoctorData();
      fetchDailyAppointments();
    }
  }, [doctorId, selectedDate]);

  const fetchDoctorId = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('id')
        .eq('profile_id', user!.id)
        .single();

      if (error) throw error;
      setDoctorId(data?.id || null);
    } catch (error: any) {
      toast({
        title: "Error fetching doctor information",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchDoctorData = async () => {
    if (!doctorId) return;
    
    setLoading(true);
    try {
      // Fetch upcoming appointments
      const { data: upcoming, error: upcomingError } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:profiles!appointments_patient_id_fkey(*)
        `)
        .eq('doctor_id', doctorId)
        .eq('status', 'scheduled')
        .gt('appointment_date', new Date().toISOString())
        .order('appointment_date', { ascending: true })
        .limit(5);

      if (upcomingError) throw upcomingError;
      setUpcomingAppointments(upcoming || []);

      // Fetch completed appointments
      const { data: completed, error: completedError } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:profiles!appointments_patient_id_fkey(*)
        `)
        .eq('doctor_id', doctorId)
        .eq('status', 'completed')
        .order('appointment_date', { ascending: false })
        .limit(5);

      if (completedError) throw completedError;
      setCompletedAppointments(completed || []);

      // Fetch stats
      const { count: totalAppointments, error: totalError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', doctorId);

      if (totalError) throw totalError;

      const { count: completedAppointmentsCount, error: completedCountError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', doctorId)
        .eq('status', 'completed');

      if (completedCountError) throw completedCountError;

      const today = new Date();
      const { count: todayAppointmentsCount, error: todayError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', doctorId)
        .gte('appointment_date', startOfDay(today).toISOString())
        .lte('appointment_date', endOfDay(today).toISOString());

      if (todayError) throw todayError;

      // Count unique patients
      const { data: uniquePatients, error: patientsError } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('doctor_id', doctorId)
        .is('patient_id', 'not.null');

      if (patientsError) throw patientsError;
      
      const uniquePatientIds = new Set(uniquePatients.map(item => item.patient_id));

      setStats({
        totalPatients: uniquePatientIds.size,
        totalAppointments: totalAppointments || 0,
        completedAppointments: completedAppointmentsCount || 0,
        todayAppointments: todayAppointmentsCount || 0
      });
    } catch (error: any) {
      toast({
        title: "Error fetching doctor data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyAppointments = async () => {
    if (!doctorId) return;
    
    try {
      // Fetch appointments for selected date
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:profiles!appointments_patient_id_fkey(*)
        `)
        .eq('doctor_id', doctorId)
        .gte('appointment_date', startOfDay(selectedDate).toISOString())
        .lte('appointment_date', endOfDay(selectedDate).toISOString())
        .order('appointment_date', { ascending: true });

      if (appointmentsError) throw appointmentsError;
      setTodayAppointments(appointments || []);
    } catch (error: any) {
      toast({
        title: "Error fetching daily appointments",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointmentId);

      if (error) throw error;

      // Refresh data
      fetchDoctorData();
      fetchDailyAppointments();

      toast({
        title: "Status Updated",
        description: `Appointment marked as ${status}`,
      });
    } catch (error: any) {
      toast({
        title: "Update Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeClass = (status: string) => {
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

  const renderWelcomeMessage = () => {
    const hour = new Date().getHours();
    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';
    
    return (
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{greeting}, Doctor!</h1>
        <p className="text-muted-foreground">Welcome to your doctor dashboard. Here's an overview of your schedule and patients.</p>
      </div>
    );
  };

  const renderStats = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    const completionRate = stats.totalAppointments > 0 
      ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100) 
      : 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-5 w-5 text-muted-foreground mr-2" />
              <span className="text-2xl font-bold">{stats.totalPatients}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-muted-foreground mr-2" />
              <span className="text-2xl font-bold">{stats.totalAppointments}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-muted-foreground mr-2" />
              <span className="text-2xl font-bold">{stats.todayAppointments}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center">
                <Activity className="h-5 w-5 text-muted-foreground mr-2" />
                <span className="text-2xl font-bold">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderDailySchedule = () => {
    const navigateDay = (days: number) => {
      setSelectedDate(prev => addDays(prev, days));
    };

    if (loading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="outline" size="sm" onClick={() => navigateDay(-1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous Day
          </Button>
          <h3 className="text-lg font-medium">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h3>
          <Button variant="outline" size="sm" onClick={() => navigateDay(1)}>
            Next Day <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {todayAppointments.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No appointments scheduled</CardTitle>
              <CardDescription>You don't have any appointments for this day.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          todayAppointments.map((appointment) => {
            const appointmentDate = parseISO(appointment.appointment_date);
            const patientName = `${appointment.patient?.first_name || ''} ${appointment.patient?.last_name || ''}`.trim();
            
            return (
              <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {isValid(appointmentDate) ? format(appointmentDate, 'h:mm a') : 'Invalid time'}
                      </CardTitle>
                      <CardDescription>
                        {appointment.duration_minutes} minutes
                      </CardDescription>
                    </div>
                    <Badge className={getStatusBadgeClass(appointment.status)}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-2">
                    <p className="text-sm font-medium">Patient</p>
                    <p>{patientName}</p>
                  </div>
                  {appointment.reason && (
                    <div>
                      <p className="text-sm font-medium">Reason</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{appointment.reason}</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/appointments?id=${appointment.id}`)}
                  >
                    View Details
                  </Button>
                  {appointment.status === 'scheduled' && (
                    <Button 
                      size="sm"
                      onClick={() => handleUpdateAppointmentStatus(appointment.id, 'completed')}
                    >
                      Mark Completed
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
    );
  };

  const renderUpcomingAppointments = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (upcomingAppointments.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>No upcoming appointments</CardTitle>
            <CardDescription>You don't have any scheduled appointments.</CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {upcomingAppointments.map((appointment) => {
          const appointmentDate = parseISO(appointment.appointment_date);
          const patientName = `${appointment.patient?.first_name || ''} ${appointment.patient?.last_name || ''}`.trim();
          
          return (
            <Card key={appointment.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {isValid(appointmentDate) ? format(appointmentDate, 'MMMM d, yyyy') : 'Invalid date'}
                    </CardTitle>
                    <CardDescription>
                      {isValid(appointmentDate) ? format(appointmentDate, 'h:mm a') : 'Invalid time'} 
                      {' '}({appointment.duration_minutes} minutes)
                    </CardDescription>
                  </div>
                  <Badge className={getStatusBadgeClass(appointment.status)}>
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-2">
                  <p className="text-sm font-medium">Patient</p>
                  <p>{patientName}</p>
                </div>
                {appointment.reason && (
                  <div>
                    <p className="text-sm font-medium">Reason</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{appointment.reason}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/appointments?id=${appointment.id}`)}
                >
                  View Details
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleUpdateAppointmentStatus(appointment.id, 'cancelled')}
                >
                  Cancel
                </Button>
              </CardFooter>
            </Card>
          );
        })}
        <div className="text-center pt-4">
          <Button variant="outline" onClick={() => navigate('/appointments')}>
            View All Appointments
          </Button>
        </div>
      </div>
    );
  };

  const renderCompletedAppointments = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (completedAppointments.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>No completed appointments</CardTitle>
            <CardDescription>You don't have any completed appointments yet.</CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {completedAppointments.map((appointment) => {
          const appointmentDate = parseISO(appointment.appointment_date);
          const patientName = `${appointment.patient?.first_name || ''} ${appointment.patient?.last_name || ''}`.trim();
          
          return (
            <Card key={appointment.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {isValid(appointmentDate) ? format(appointmentDate, 'MMMM d, yyyy') : 'Invalid date'}
                    </CardTitle>
                    <CardDescription>
                      {isValid(appointmentDate) ? format(appointmentDate, 'h:mm a') : 'Invalid time'} 
                      {' '}({appointment.duration_minutes} minutes)
                    </CardDescription>
                  </div>
                  <Badge className={getStatusBadgeClass(appointment.status)}>
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-2">
                  <p className="text-sm font-medium">Patient</p>
                  <p>{patientName}</p>
                </div>
                {appointment.reason && (
                  <div>
                    <p className="text-sm font-medium">Reason</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{appointment.reason}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/appointments?id=${appointment.id}`)}
                >
                  View Details
                </Button>
              </CardFooter>
            </Card>
          );
        })}
        <div className="text-center pt-4">
          <Button variant="outline" onClick={() => navigate('/appointments?status=completed')}>
            View All Completed Appointments
          </Button>
        </div>
      </div>
    );
  };

  const renderQuickActions = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks you might want to do</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          <Button className="w-full" onClick={() => navigate('/appointments/new')}>
            Schedule Appointment
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate('/patients')}>
            View Patients
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate('/profile')}>
            Update Profile
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate('/medical-records')}>
            Medical Records
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {renderWelcomeMessage()}
      {renderStats()}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Today's Schedule</h2>
          {renderDailySchedule()}
          
          <h2 className="text-xl font-semibold mb-4 mt-8">Upcoming Appointments</h2>
          {renderUpcomingAppointments()}
          
          <h2 className="text-xl font-semibold mb-4 mt-8">Completed Appointments</h2>
          {renderCompletedAppointments()}
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          {renderQuickActions()}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;