
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, Users, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { userRole, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    upcomingAppointments: 0,
    totalDoctors: 0,
    totalPatients: 0,
    completedAppointments: 0
  });
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      
      try {
        // Different dashboard data based on user role
        if (userRole === 'patient') {
          await fetchPatientDashboardData();
        } else if (userRole === 'doctor') {
          await fetchDoctorDashboardData();
        } else if (userRole === 'admin') {
          await fetchAdminDashboardData();
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user && userRole) {
      fetchDashboardData();
    }
  }, [user, userRole]);

  const fetchPatientDashboardData = async () => {
    // Fetch upcoming appointments
    const { data: upcomingAppointments, error: upcomingError } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', user!.id)
      .eq('status', 'scheduled')
      .gte('appointment_date', new Date().toISOString())
      .order('appointment_date', { ascending: true });

    if (upcomingError) throw upcomingError;

    // Fetch completed appointments
    const { data: completedAppointments, error: completedError } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', user!.id)
      .eq('status', 'completed')
      .order('appointment_date', { ascending: false });

    if (completedError) throw completedError;

    // Fetch total doctors
    const { count: doctorsCount, error: doctorsError } = await supabase
      .from('doctors')
      .select('*', { count: 'exact', head: true });

    if (doctorsError) throw doctorsError;

    setStats({
      upcomingAppointments: upcomingAppointments.length,
      totalDoctors: doctorsCount || 0,
      totalPatients: 0, // Not relevant for patients
      completedAppointments: completedAppointments.length
    });

    setRecentAppointments(upcomingAppointments.slice(0, 5));
  };

  const fetchDoctorDashboardData = async () => {
    // Fetch upcoming appointments for the doctor
    const { data: upcomingAppointments, error: upcomingError } = await supabase
      .from('appointments')
      .select(`
        *,
        profiles:patient_id (first_name, last_name)
      `)
      .eq('doctor_id', user!.id)
      .eq('status', 'scheduled')
      .gte('appointment_date', new Date().toISOString())
      .order('appointment_date', { ascending: true });

    if (upcomingError) throw upcomingError;

    // Fetch total patients seen by this doctor
    const { data: patientIds, error: patientsError } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('doctor_id', user!.id)
      .is('status', 'completed');

    if (patientsError) throw patientsError;
    
    // Create a Set to get unique patient count
    const uniquePatients = new Set(patientIds.map(p => p.patient_id));

    // Fetch completed appointments
    const { data: completedAppointments, error: completedError } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', user!.id)
      .eq('status', 'completed')
      .order('appointment_date', { ascending: false });

    if (completedError) throw completedError;

    setStats({
      upcomingAppointments: upcomingAppointments.length,
      totalDoctors: 0, // Not relevant for doctors
      totalPatients: uniquePatients.size,
      completedAppointments: completedAppointments.length
    });

    setRecentAppointments(upcomingAppointments.slice(0, 5));
  };

  const fetchAdminDashboardData = async () => {
    // Fetch upcoming appointments
    const { data: upcomingAppointments, error: upcomingError } = await supabase
      .from('appointments')
      .select(`
        *,
        doctor:doctor_id (id),
        patient:patient_id (first_name, last_name)
      `)
      .eq('status', 'scheduled')
      .gte('appointment_date', new Date().toISOString())
      .order('appointment_date', { ascending: true });

    if (upcomingError) throw upcomingError;

    // Fetch total doctors
    const { count: doctorsCount, error: doctorsError } = await supabase
      .from('doctors')
      .select('*', { count: 'exact', head: true });

    if (doctorsError) throw doctorsError;

    // Fetch total patients
    const { count: patientsCount, error: patientsError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'patient');

    if (patientsError) throw patientsError;

    // Fetch completed appointments
    const { count: completedCount, error: completedError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    if (completedError) throw completedError;

    setStats({
      upcomingAppointments: upcomingAppointments.length,
      totalDoctors: doctorsCount || 0,
      totalPatients: patientsCount || 0,
      completedAppointments: completedCount || 0
    });

    setRecentAppointments(upcomingAppointments.slice(0, 5));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent>
            {[1, 2, 3].map((i) => (
              <div key={i} className="mb-4">
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to your {userRole} dashboard
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Appointments
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingAppointments}</div>
          </CardContent>
        </Card>

        {userRole !== 'doctor' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Doctors
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDoctors}</div>
            </CardContent>
          </Card>
        )}

        {userRole !== 'patient' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {userRole === 'doctor' ? 'Your Patients' : 'Total Patients'}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPatients}</div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Appointments
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedAppointments}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Appointments</CardTitle>
          <CardDescription>
            {recentAppointments.length > 0 
              ? 'Your upcoming appointments' 
              : 'You have no upcoming appointments'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentAppointments.length > 0 ? (
            <div className="space-y-4">
              {recentAppointments.map((appointment) => (
                <div 
                  key={appointment.id} 
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {new Date(appointment.appointment_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(appointment.appointment_date).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {appointment.duration_minutes && ` (${appointment.duration_minutes} min)`}
                    </p>
                    {appointment.profiles && (
                      <p className="text-sm">
                        Patient: {appointment.profiles.first_name} {appointment.profiles.last_name}
                      </p>
                    )}
                    {appointment.reason && (
                      <p className="text-sm text-muted-foreground">
                        Reason: {appointment.reason}
                      </p>
                    )}
                  </div>
                  
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/appointments/${appointment.id}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-muted-foreground mb-4">No upcoming appointments found</p>
              <Button asChild>
                <Link to="/appointments">
                  {userRole === 'patient' ? 'Book an Appointment' : 'View All Appointments'}
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
