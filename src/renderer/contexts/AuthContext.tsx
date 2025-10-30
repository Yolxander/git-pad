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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      console.log('🔄 AuthContext: Starting login...', { email: credentials.email });
      setIsLoading(true);
      setError(null);

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
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
      });

      if (authError) {
        console.error('❌ AuthContext: Registration failed:', authError);
        setError(authError.message || 'Registration failed');
        throw authError;
      }

      setSession(data.session);
      setUser(data.user);
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
      const { error: authError } = await supabase.auth.signOut();

      if (authError) {
        console.error('❌ AuthContext: Logout failed:', authError);
        setError(authError.message || 'Logout failed');
        throw authError;
      }

      setUser(null);
      setSession(null);
    } catch (err: any) {
      console.error('❌ AuthContext: Logout failed:', err);
      setError(err.message || 'Logout failed');
      throw err;
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
