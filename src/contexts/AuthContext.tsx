import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  hasRestaurant: boolean | null;
  signInWithOtp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkRestaurantStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasRestaurant, setHasRestaurant] = useState<boolean | null>(null);
  
  const checkRestaurantStatus = async (): Promise<boolean> => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const userId = currentSession?.user?.id;
    
    console.log('🔍 Checking restaurant status for user:', userId);
    if (!userId) {
      console.log('❌ No user ID found');
      return false;
    }
    
    try {
      const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', userId);

      if (error) {
        console.error('Error checking restaurant:', error);
        return false;
      }

      const hasRestaurantRecord = restaurants && restaurants.length > 0;
      console.log('🏪 Restaurant check result:', { 
        hasRestaurantRecord, 
        restaurantCount: restaurants?.length || 0, 
        error: error?.message || null 
      });
      
      setHasRestaurant(hasRestaurantRecord);
      return hasRestaurantRecord;
    } catch (error) {
      console.error('Error checking restaurant status:', error);
      setHasRestaurant(false);
      return false;
    }
  };
  
  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        console.log('🔍 Initializing auth, current URL:', window.location.href);
        
        // Handle email confirmation from URL
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        const urlParamsObj = Object.fromEntries(urlParams.entries());
        const hashParamsObj = Object.fromEntries(hashParams.entries());
        
        console.log('📧 URL params:', urlParamsObj);
        console.log('📧 Hash params:', hashParamsObj);
        console.log('📧 Full search:', window.location.search);
        console.log('📧 Full hash:', window.location.hash);
        
        const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');
        const tokenType = hashParams.get('type') || urlParams.get('type') || hashParams.get('token_type') || urlParams.get('token_type');
        
        console.log('🔑 Tokens found:', { 
          accessToken: accessToken ? accessToken.substring(0, 20) + '...' : null, 
          refreshToken: refreshToken ? refreshToken.substring(0, 20) + '...' : null, 
          tokenType,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken
        });
        
        if (accessToken && refreshToken) {
          console.log('📧 Processing email confirmation with tokens, type:', tokenType);
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          console.log('📧 Set session result:', { 
            success: !error, 
            user: data?.session?.user?.email, 
            error: error?.message,
            sessionExists: !!data?.session
          });
          
          if (!error && data.session && mounted) {
            console.log('✅ Email confirmation successful, user:', data.session.user.email);
            // Clean URL and redirect to onboarding
            window.history.replaceState(null, '', '/onboarding');
            setSession(data.session);
            setUser(data.session.user);
            setHasRestaurant(false); // New user, no restaurant yet
            setLoading(false);
            return;
          } else {
            console.error('❌ Failed to set session:', error?.message);
          }
        } else {
          console.log('❌ No tokens found in URL for email confirmation');
        }
        
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔐 Initial session check:', session?.user?.email || 'No user');
        
        if (mounted) {
          setSession(session);
          setUser(session?.user || null);
          
          // Check restaurant status if user exists
          if (session?.user) {
            await checkRestaurantStatus();
          } else {
            setHasRestaurant(null);
          }
          
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up auth state listener - but only update when actually needed
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('🔄 Auth state change:', event, session?.user?.email || 'No user');
        
        // Only update state if session actually changed
        const sessionChanged = session?.user?.id !== user?.id;
        
        if (sessionChanged) {
          setSession(session);
          setUser(session?.user || null);
          
          if (session?.user) {
            // Small delay to ensure session is fully established
            setTimeout(async () => {
              if (mounted) {
                await checkRestaurantStatus();
              }
            }, 100);
          } else {
            setHasRestaurant(null);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - only run once

  const signInWithOtp = async (email: string) => {
    console.log('📧 Starting OTP sign in process...');
    const redirectUrl = window.location.origin + '/auth/callback';
    
    const { data, error } = await supabase.auth.signInWithOtp({ 
      email,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    console.log('📧 OTP response:', { data, error: error?.message });
    
    if (error) throw error;
    console.log('✅ OTP email sent successfully');
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    setHasRestaurant(null);
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      hasRestaurant, 
      signInWithOtp,
      signOut, 
      checkRestaurantStatus 
    }}>
      {children}
    </AuthContext.Provider>
  );
};