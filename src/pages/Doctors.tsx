import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Users, Star, BookOpen, Heart, Phone, Mail, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database } from '@/integrations/supabase/types';

// Explicitly define the doctor specialty type
type DoctorSpecialty = 'cardiology' | 'dermatology' | 'neurology' | 'orthopedics' | 'pediatrics' | 'psychiatry' | 'gynecology' | 'ophthalmology' | 'general';

const DoctorsPage = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  
  // Define the specialties array with the explicit type
  const specialties: DoctorSpecialty[] = [
    'cardiology',
    'dermatology',
    'neurology',
    'orthopedics',
    'pediatrics',
    'psychiatry',
    'gynecology',
    'ophthalmology',
    'general'
  ];

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('is_verified', true);

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
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorClick = (doctor: any) => {
    setSelectedDoctor(doctor);
    setOpenDialog(true);
  };

  const handleBookAppointment = (doctorId: string) => {
    setOpenDialog(false);
    navigate('/appointments', { state: { selectedDoctorId: doctorId } });
  };

  const getFilteredDoctors = () => {
    let filtered = [...doctors];
    
    if (selectedSpecialty) {
      filtered = filtered.filter(doctor => doctor.specialty === selectedSpecialty);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(doctor => 
        doctor.profile.first_name.toLowerCase().includes(term) ||
        doctor.profile.last_name.toLowerCase().includes(term) ||
        doctor.specialty.toLowerCase().includes(term) ||
        doctor.qualification.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  };

  const getSpecialtyColor = (specialty: string) => {
    const colors: Record<string, string> = {
      cardiology: 'bg-red-100 text-red-800',
      dermatology: 'bg-green-100 text-green-800',
      neurology: 'bg-purple-100 text-purple-800',
      orthopedics: 'bg-blue-100 text-blue-800',
      pediatrics: 'bg-yellow-100 text-yellow-800',
      psychiatry: 'bg-pink-100 text-pink-800',
      gynecology: 'bg-indigo-100 text-indigo-800',
      ophthalmology: 'bg-orange-100 text-orange-800',
      general: 'bg-gray-100 text-gray-800'
    };
    
    return colors[specialty] || 'bg-gray-100 text-gray-800';
  };

  const getInitials = (firstName: string, lastName: string) => {
    return (firstName?.[0] || '') + (lastName?.[0] || '');
  };

  const renderDoctorsList = () => {
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

    const filteredDoctors = getFilteredDoctors();
    
    if (filteredDoctors.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>No doctors found</CardTitle>
            <CardDescription>
              No doctors match your search criteria. Please try different filters.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return filteredDoctors.map(doctor => {
      const fullName = `Dr. ${doctor.profile.first_name} ${doctor.profile.last_name}`;
      
      return (
        <Card key={doctor.id} className="mb-4 hover:shadow-md transition-shadow cursor-pointer" 
          onClick={() => handleDoctorClick(doctor)}>
          <CardHeader className="flex flex-row items-start gap-4 pb-2">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(doctor.profile.first_name, doctor.profile.last_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{fullName}</CardTitle>
              <Badge className={getSpecialtyColor(doctor.specialty)}>
                {doctor.specialty.charAt(0).toUpperCase() + doctor.specialty.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-1">
              <Star className="h-4 w-4 inline mr-1 text-amber-500" />
              <span className="font-medium">{doctor.qualification}</span>
            </p>
            <p className="text-sm">
              <BookOpen className="h-4 w-4 inline mr-1 text-blue-500" />
              <span>{doctor.experience_years} years experience</span>
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={(e) => {
              e.stopPropagation();
              handleBookAppointment(doctor.id);
            }}>
              <Calendar className="mr-2 h-4 w-4" />
              Book Appointment
            </Button>
          </CardFooter>
        </Card>
      );
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Find a Doctor</h1>
      
      {userRole === 'doctor' && !doctors.some(d => d.id === user?.id) && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your doctor profile is pending verification by an administrator.
            Once verified, it will appear in the doctor listings.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="md:col-span-3">
          <Input
            placeholder="Search doctors by name, specialty or qualification..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
            <SelectTrigger>
              <SelectValue placeholder="All Specialties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Specialties</SelectItem>
              {specialties.map(specialty => (
                <SelectItem key={specialty} value={specialty}>
                  {specialty.charAt(0).toUpperCase() + specialty.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {renderDoctorsList()}
      </div>
      
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedDoctor && (
            <>
              <DialogHeader>
                <DialogTitle>Doctor Profile</DialogTitle>
                <DialogDescription>
                  View detailed information about the doctor
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <div className="flex items-start gap-4 mb-6">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {getInitials(selectedDoctor.profile.first_name, selectedDoctor.profile.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h2 className="text-xl font-bold">
                      Dr. {selectedDoctor.profile.first_name} {selectedDoctor.profile.last_name}
                    </h2>
                    <p className="text-gray-500">{selectedDoctor.qualification}</p>
                    <div className="mt-2">
                      <Badge className={getSpecialtyColor(selectedDoctor.specialty)}>
                        {selectedDoctor.specialty.charAt(0).toUpperCase() + selectedDoctor.specialty.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                    <span>
                      <strong>{selectedDoctor.experience_years}</strong> years of experience
                    </span>
                  </div>
                  
                  {selectedDoctor.profile.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-gray-500" />
                      <span>{selectedDoctor.profile.email}</span>
                    </div>
                  )}
                  
                  {selectedDoctor.profile.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-gray-500" />
                      <span>{selectedDoctor.profile.phone}</span>
                    </div>
                  )}
                  
                  {selectedDoctor.bio && (
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold mb-2">About</h3>
                      <p className="text-gray-700">{selectedDoctor.bio}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                {userRole === 'patient' && (
                  <Button onClick={() => handleBookAppointment(selectedDoctor.id)}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Book Appointment
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DoctorsPage;
