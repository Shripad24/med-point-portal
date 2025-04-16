
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from './Layout';
import { Skeleton } from '@/components/ui/skeleton';

export const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: ('patient' | 'doctor' | 'admin')[] }) => {
  const { user, userRole, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-64 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
      </div>
    );
  }

  // If user is not logged in, redirect to login page
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If specific roles are required, check them
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // If all checks pass, render the protected content within the layout
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

export default ProtectedRoute;
