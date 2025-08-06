import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔍 AuthCallback - Processing URL:', window.location.href);
        
        // Get the session from the URL
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting session:', error);
          navigate('/login');
          return;
        }

        if (data.session) {
          console.log('✅ Session found, user:', data.session.user.email);
          // Redirect to onboarding for new users
          navigate('/onboarding');
        } else {
          console.log('❌ No session found, redirecting to login');
          navigate('/login');
        }
      } catch (error) {
        console.error('❌ Error in auth callback:', error);
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processando confirmação...</p>
      </div>
    </div>
  );
};

export default AuthCallback;