import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, hasRestaurant } = useAuth();
  const navigate = useNavigate();

  console.log('🛡️ ProtectedRoute check:', { 
    user: !!user, 
    loading, 
    hasRestaurant,
    userEmail: user?.email 
  });

  // Handle redirects based on auth state
  useEffect(() => {
    if (!loading && user) {
      if (hasRestaurant === false) {
        console.log('🔄 Redirecting to onboarding...');
        navigate('/onboarding', { replace: true });
      } else if (hasRestaurant === true && window.location.pathname === '/login') {
        console.log('🔄 Redirecting to dashboard...');
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, loading, hasRestaurant, navigate]);

  if (loading) {
    console.log('⏳ Still loading...');
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    console.log('🚫 No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // If user is authenticated but doesn't have a restaurant, redirect to onboarding
  if (hasRestaurant === false) {
    console.log('🏪 No restaurant, redirecting to onboarding');
    return <Navigate to="/onboarding" replace />;
  }

  // If we're still checking restaurant status, show loading
  if (hasRestaurant === null) {
    console.log('❓ Still checking restaurant status...');
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  console.log('✅ All checks passed, rendering protected content');
  return <>{children}</>;
};

export default ProtectedRoute;