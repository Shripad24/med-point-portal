import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database } from '@/integrations/supabase/types';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type UserRole = Database['public']['Enums']['user_role'];

const Auth = () => {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  
  // Redirect if already logged in
  if (user) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">MedPoint Portal</h1>
          <p className="text-gray-600 mt-2">Hospital Management System</p>
        </div>
        
        <Card>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <LoginForm signIn={signIn} />
            </TabsContent>
            
            <TabsContent value="register">
              <RegisterForm signUp={signUp} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

const LoginForm = ({ signIn }: { signIn: (email: string, password: string) => Promise<void> }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      </CardContent>
      
      <CardFooter>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>
      </CardFooter>
    </form>
  );
};

const RegisterForm = ({ signUp }: { signUp: (email: string, password: string, firstName: string, lastName: string, role: UserRole, qualification?: string, specialty?: string, experienceYears?: number) => Promise<void> }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('patient');
  const [qualification, setQualification] = useState('');
  const [specialty, setSpecialty] = useState<string>('general');
  const [experienceYears, setExperienceYears] = useState<string>('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDoctorFields, setShowDoctorFields] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const specialties = [
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

  const validatePassword = () => {
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return false;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleRoleChange = (value: string) => {
    setRole(value as UserRole);
    setShowDoctorFields(value === 'doctor');
    
    if (value !== 'doctor') {
      setQualification('');
      setSpecialty('general');
      setExperienceYears('');
    }
  };

  const validateForm = () => {
    setFormError(null);
    
    if (role === 'doctor') {
      if (!qualification) {
        setFormError('Please enter your qualification');
        return false;
      }
      if (!specialty) {
        setFormError('Please select your specialty');
        return false;
      }
      if (!experienceYears || isNaN(Number(experienceYears))) {
        setFormError('Please enter valid years of experience');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword() || !validateForm()) return;
    
    setIsLoading(true);
    
    try {
      await signUp(
        email, 
        password, 
        firstName, 
        lastName, 
        role, 
        role === 'doctor' ? qualification : undefined,
        role === 'doctor' ? specialty : undefined,
        role === 'doctor' ? Number(experienceYears) : undefined
      );
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Register to access the hospital management system
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {formError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="register-email">Email</Label>
          <Input
            id="register-email"
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="role">I am a</Label>
          <Select 
            value={role} 
            onValueChange={handleRoleChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="patient">Patient</SelectItem>
              <SelectItem value="doctor">Doctor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {showDoctorFields && (
          <>
            <div className="space-y-2">
              <Label htmlFor="qualification">Qualification</Label>
              <Input
                id="qualification"
                placeholder="MD, MBBS, etc."
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                required={role === 'doctor'}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="specialty">Specialty</Label>
              <Select 
                value={specialty} 
                onValueChange={setSpecialty}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map(spec => (
                    <SelectItem key={spec} value={spec}>
                      {spec.charAt(0).toUpperCase() + spec.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="experienceYears">Years of Experience</Label>
              <Input
                id="experienceYears"
                type="number"
                min="0"
                placeholder="Years of experience"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                required={role === 'doctor'}
              />
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your doctor account will require admin verification before you can appear in the doctor listings.
              </AlertDescription>
            </Alert>
          </>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="register-password">Password</Label>
          <Input
            id="register-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onBlur={validatePassword}
            required
          />
          {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
        </div>
      </CardContent>
      
      <CardFooter>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </CardFooter>
    </form>
  );
};

export default Auth;
