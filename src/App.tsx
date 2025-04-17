
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import Layout from '@/components/layout/Layout';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';
import Appointments from '@/pages/Appointments';
import Profile from '@/pages/Profile';
import Doctors from '@/pages/Doctors';
import MedicalRecords from '@/pages/MedicalRecords';
import NotFound from '@/pages/NotFound';
import Admin from '@/pages/Admin';
import Patients from '@/pages/Patients';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="medpoint-theme">
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes with Layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/appointments" element={<Appointments />} />
                <Route path="/appointments/new" element={<Appointments isNew={true} />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/doctors" element={<Doctors />} />
                <Route path="/medical-records" element={<MedicalRecords />} />
                
                {/* Admin-only route */}
                <Route path="/admin" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Admin />
                  </ProtectedRoute>
                } />
                
                {/* Doctor-only route */}
                <Route path="/patients" element={
                  <ProtectedRoute allowedRoles={['doctor', 'admin']}>
                    <Patients />
                  </ProtectedRoute>
                } />
              </Route>
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
