
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-full max-w-md space-y-8 p-4">
          <Skeleton className="h-12 w-2/3 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6 mx-auto" />
          <Skeleton className="h-10 w-36 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold text-primary">MedPoint Portal</h1>
          <p className="mt-3 text-xl text-gray-600">Hospital Management System</p>
          <p className="mt-2 text-base text-gray-500">
            Book appointments, access medical records, and manage your healthcare journey
          </p>
        </div>
        
        <div className="flex flex-col space-y-4">
          <Button 
            size="lg" 
            onClick={() => navigate('/auth')}
            className="w-full"
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
