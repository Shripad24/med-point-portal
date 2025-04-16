
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Calendar, Users } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";

const Dashboard = () => {
  const { user, userRole, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    upcomingAppointments: [],
    recentActivity: [],
    stats: {
      totalAppointments: 0,
      completedAppointments: 0,
      totalPatients: 0,
      totalDoctors: 0
    }
  });

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, userRole]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      let stats = {
        totalAppointments: 0,
        completedAppointments: 0,
        totalPatients: 0,
        totalDoctors: 0
      };

      // Fetch different data based on user role
      if (userRole === 'admin') {
        await fetchAdminData(stats);
      } else if (userRole === 'doctor') {
        await fetchDoctorData(stats);
      } else if (userRole === 'patient') {
        await fetchPatientData(stats);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async (stats: any) => {
    // Fetch total appointments
    const { count: totalAppointments, error: apptError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true });

    if (apptError) throw apptError;
    stats.totalAppointments = totalAppointments || 0;

    // Fetch completed appointments
    const { count: completedAppointments, error: compError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    if (compError) throw compError;
    stats.completedAppointments = completedAppointments || 0;

    // Fetch total patients
    const { count: totalPatients, error: patError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'patient');

    if (patError) throw patError;
    stats.totalPatients = totalPatients || 0;

    // Fetch total doctors
    const { count: totalDoctors, error: docError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'doctor');

    if (docError) throw docError;
    stats.totalDoctors = totalDoctors || 0;

    // Fetch upcoming appointments
    const { data: upcomingAppointments, error: upcomingError } = await supabase
      .from('appointments')
      .select(`
        *,
        doctor:doctors(
          *,
          profile:profiles(*)
        ),
        patient:profiles!appointments_patient_id_fkey(*)
      `)
      .eq('status', 'scheduled')
      .order('appointment_date', { ascending: true })
      .limit(5);

    if (upcomingError) throw upcomingError;

    setDashboardData({
      ...dashboardData,
      upcomingAppointments: upcomingAppointments || [],
      stats
    });
  };

  const fetchDoctorData = async (stats: any) => {
    // Fetch doctor's total appointments
    const { count: totalAppointments, error: apptError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('doctor_id', user!.id);

    if (apptError) throw apptError;
    stats.totalAppointments = totalAppointments || 0;

    // Fetch doctor's completed appointments
    const { count: completedAppointments, error: compError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('doctor_id', user!.id)
      .eq('status', 'completed');

    if (compError) throw compError;
    stats.completedAppointments = completedAppointments || 0;

    // Fetch doctor's patient count
    const { data: patientIds, error: patientsError } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('doctor_id', user!.id)
      .eq('status', 'completed');

    if (patientsError) throw patientsError;

    // Count unique patients
    const uniquePatients = new Set(patientIds?.map(p => p.patient_id));
    stats.totalPatients = uniquePatients.size;

    // Fetch upcoming appointments
    const { data: upcomingAppointments, error: upcomingError } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:profiles!appointments_patient_id_fkey(*)
      `)
      .eq('doctor_id', user!.id)
      .eq('status', 'scheduled')
      .order('appointment_date', { ascending: true })
      .limit(5);

    if (upcomingError) throw upcomingError;

    setDashboardData({
      ...dashboardData,
      upcomingAppointments: upcomingAppointments || [],
      stats
    });
  };

  const fetchPatientData = async (stats: any) => {
    // Fetch patient's total appointments
    const { count: totalAppointments, error: apptError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', user!.id);

    if (apptError) throw apptError;
    stats.totalAppointments = totalAppointments || 0;

    // Fetch patient's completed appointments
    const { count: completedAppointments, error: compError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', user!.id)
      .eq('status', 'completed');

    if (compError) throw compError;
    stats.completedAppointments = completedAppointments || 0;

    // Fetch total doctors (for reference)
    const { count: totalDoctors, error: docError } = await supabase
      .from('doctors')
      .select('*', { count: 'exact', head: true });

    if (docError) throw docError;
    stats.totalDoctors = totalDoctors || 0;

    // Fetch upcoming appointments
    const { data: upcomingAppointments, error: upcomingError } = await supabase
      .from('appointments')
      .select(`
        *,
        doctor:doctors(
          *,
          profile:profiles(*)
        )
      `)
      .eq('patient_id', user!.id)
      .eq('status', 'scheduled')
      .order('appointment_date', { ascending: true })
      .limit(5);

    if (upcomingError) throw upcomingError;

    setDashboardData({
      ...dashboardData,
      upcomingAppointments: upcomingAppointments || [],
      stats
    });
  };

  const renderWelcomeMessage = () => {
    const greeting = getGreeting();
    const name = profile?.first_name || 'there';
    
    return (
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {greeting}, {name}!
        </h1>
        <p className="text-muted-foreground">
          {userRole === 'admin' 
            ? "Welcome to your admin dashboard. Here's an overview of system activity." 
            : userRole === 'doctor'
              ? "Here's an overview of your appointments and patient statistics."
              : "Here's an overview of your medical appointments and services."}
        </p>
      </div>
    );
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const renderStatsCards = () => {
    if (loading) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <Skeleton className="h-4 w-[150px]" />
                </CardTitle>
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[100px]" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    let cards = [];

    if (userRole === 'admin') {
      cards = [
        {
          title: "Total Appointments",
          value: dashboardData.stats.totalAppointments,
          icon: <Calendar className="h-4 w-4 text-muted-foreground" />
        },
        {
          title: "Completed Appointments",
          value: dashboardData.stats.completedAppointments,
          icon: <Activity className="h-4 w-4 text-muted-foreground" />
        },
        {
          title: "Total Patients",
          value: dashboardData.stats.totalPatients,
          icon: <Users className="h-4 w-4 text-muted-foreground" />
        },
        {
          title: "Total Doctors",
          value: dashboardData.stats.totalDoctors,
          icon: <Users className="h-4 w-4 text-muted-foreground" />
        }
      ];
    } else if (userRole === 'doctor') {
      cards = [
        {
          title: "Total Appointments",
          value: dashboardData.stats.totalAppointments,
          icon: <Calendar className="h-4 w-4 text-muted-foreground" />
        },
        {
          title: "Completed Appointments",
          value: dashboardData.stats.completedAppointments,
          icon: <Activity className="h-4 w-4 text-muted-foreground" />
        },
        {
          title: "Total Patients",
          value: dashboardData.stats.totalPatients,
          icon: <Users className="h-4 w-4 text-muted-foreground" />
        }
      ];
    } else {
      cards = [
        {
          title: "Total Appointments",
          value: dashboardData.stats.totalAppointments,
          icon: <Calendar className="h-4 w-4 text-muted-foreground" />
        },
        {
          title: "Completed Appointments",
          value: dashboardData.stats.completedAppointments,
          icon: <Activity className="h-4 w-4 text-muted-foreground" />
        },
        {
          title: "Available Doctors",
          value: dashboardData.stats.totalDoctors,
          icon: <Users className="h-4 w-4 text-muted-foreground" />
        }
      ];
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
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

    if (dashboardData.upcomingAppointments.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>No Upcoming Appointments</CardTitle>
            <CardDescription>
              {userRole === 'patient' 
                ? "You don't have any scheduled appointments." 
                : userRole === 'doctor'
                  ? "You don't have any upcoming appointments with patients."
                  : "There are no upcoming appointments in the system."}
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {dashboardData.upcomingAppointments.map((appointment: any) => {
          const appointmentDate = parseISO(appointment.appointment_date);
          
          // Get patient or doctor name based on user role
          let name = '';
          if (userRole === 'doctor' && appointment.patient) {
            name = `${appointment.patient.first_name} ${appointment.patient.last_name}`;
          } else if ((userRole === 'patient' || userRole === 'admin') && appointment.doctor?.profile) {
            name = `Dr. ${appointment.doctor.profile.first_name} ${appointment.doctor.profile.last_name}`;
          }
          
          return (
            <Card key={appointment.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <CardTitle className="text-base">
                    {isValid(appointmentDate) 
                      ? format(appointmentDate, 'MMMM d, yyyy')
                      : 'Invalid date'}
                  </CardTitle>
                  <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Scheduled
                  </span>
                </div>
                <CardDescription>
                  {isValid(appointmentDate) 
                    ? format(appointmentDate, 'h:mm a')
                    : 'Invalid time'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  <span className="font-medium">
                    {userRole === 'doctor' ? 'Patient' : 'Doctor'}:
                  </span>{' '}
                  {name}
                </p>
                {appointment.reason && (
                  <p className="text-sm mt-1">
                    <span className="font-medium">Reason:</span>{' '}
                    {appointment.reason}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 space-y-8">
      {renderWelcomeMessage()}
      
      <div className="space-y-8">
        {renderStatsCards()}
        
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold mb-4">Upcoming Appointments</h2>
            {renderUpcomingAppointments()}
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <Card>
              <CardHeader>
                <CardTitle>System Activity</CardTitle>
                <CardDescription>
                  Recent actions and updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-500 py-6">
                  Activity tracking coming soon...
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
