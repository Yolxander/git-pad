import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
  password_confirmation: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session - handle errors gracefully
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          // eslint-disable-next-line no-console
          console.warn('[AuthContext] Error getting session:', error.message);
          // Check for local user instead
          const localUser = localStorage.getItem('user');
          if (localUser) {
            localStorage.setItem('isAuthenticated', 'false');
          }
          setIsLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Save user info locally
        if (session?.user) {
          localStorage.setItem('user', JSON.stringify({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || '',
          }));
          localStorage.setItem('isAuthenticated', 'true');
        } else {
          // Check if user exists locally but session expired
          const localUser = localStorage.getItem('user');
          if (localUser) {
            localStorage.setItem('isAuthenticated', 'false');
          }
        }
        
        setIsLoading(false);
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.warn('[AuthContext] Failed to get session (Supabase may not be running):', error.message);
        // Check for local user instead
        const localUser = localStorage.getItem('user');
        if (localUser) {
          localStorage.setItem('isAuthenticated', 'false');
        }
        setIsLoading(false);
      });

    // Listen for auth changes - handle errors gracefully
    let subscription: { unsubscribe: () => void } | null = null;
    
    try {
      const {
        data: { subscription: sub },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Save user info locally
        if (session?.user) {
          localStorage.setItem('user', JSON.stringify({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || '',
          }));
          localStorage.setItem('isAuthenticated', 'true');
        } else {
          // User logged out - clear authenticated flag but keep user info
          localStorage.setItem('isAuthenticated', 'false');
        }
        
        setIsLoading(false);
      });
      subscription = sub;
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.warn('[AuthContext] Failed to set up auth state listener (Supabase may not be running):', error.message);
      setIsLoading(false);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      console.log('🔄 AuthContext: Starting login...', { email: credentials.email });
      setIsLoading(true);
      setError(null);

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      }).catch((err) => {
        // Handle connection errors gracefully
        if (err.message?.includes('ERR_CONNECTION_REFUSED') || 
            err.message?.includes('Failed to fetch')) {
          throw new Error('Unable to connect to authentication service. Please check your connection.');
        }
        throw err;
      });

      if (authError) {
        console.error('❌ AuthContext: Login failed:', authError);
        setError(authError.message || 'Login failed');
        throw authError;
      }

      console.log('🎉 AuthContext: Login response received:', {
        hasSession: !!data.session,
        hasUser: !!data.user,
        user: data.user,
      });

      setSession(data.session);
      setUser(data.user);

      // Save user info locally
      if (data.user) {
        localStorage.setItem('user', JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || '',
        }));
        localStorage.setItem('isAuthenticated', 'true');
      }

      console.log('💾 AuthContext: Session and user set successfully', {
        isAuthenticated: !!data.session && !!data.user,
        userId: data.user?.id,
        userEmail: data.user?.email
      });
    } catch (err: any) {
      console.error('❌ AuthContext: Login failed:', err);
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate password confirmation
      if (credentials.password !== credentials.password_confirmation) {
        const error = new Error('Passwords do not match');
        setError(error.message);
        throw error;
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            name: credentials.name,
          },
        },
      }).catch((err) => {
        // Handle connection errors gracefully
        if (err.message?.includes('ERR_CONNECTION_REFUSED') || 
            err.message?.includes('Failed to fetch')) {
          throw new Error('Unable to connect to authentication service. Please check your connection.');
        }
        throw err;
      });

      if (authError) {
        console.error('❌ AuthContext: Registration failed:', authError);
        setError(authError.message || 'Registration failed');
        throw authError;
      }

      setSession(data.session);
      setUser(data.user);

      // Save user info locally
      if (data.user) {
        localStorage.setItem('user', JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || credentials.name || '',
        }));
        localStorage.setItem('isAuthenticated', 'true');
      }
    } catch (err: any) {
      console.error('❌ AuthContext: Registration failed:', err);
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Try to sign out, but don't fail if Supabase is not available
      const { error: authError } = await supabase.auth.signOut().catch((err) => {
        // Silently handle connection errors - we'll still clear local state
        if (err.message?.includes('ERR_CONNECTION_REFUSED') || 
            err.message?.includes('Failed to fetch')) {
          // eslint-disable-next-line no-console
          console.warn('[AuthContext] Supabase unavailable during logout, clearing local state only');
          return { error: null };
        }
        throw err;
      });

      if (authError) {
        console.error('❌ AuthContext: Logout failed:', authError);
        // Still clear local state even if server logout fails
      }

      setUser(null);
      setSession(null);
      
      // Clear authenticated flag but keep user info for login screen
      localStorage.setItem('isAuthenticated', 'false');
    } catch (err: any) {
      console.error('❌ AuthContext: Logout failed:', err);
      // Still clear local state even if logout fails
      setUser(null);
      setSession(null);
      localStorage.setItem('isAuthenticated', 'false');
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    session,
    isAuthenticated: !!session && !!user,
    isLoading,
    error,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
