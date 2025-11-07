import { useState, useEffect } from 'react';
import { MemoryRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './components/Home';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import './App.css';

declare global {
  interface Window {
    electron: {
      checkOnboardingCompleted: () => Promise<boolean>;
    };
  }
}

const AppRoutes = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const completed = await window.electron.checkOnboardingCompleted();
        setOnboardingCompleted(completed);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setOnboardingCompleted(false);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, []);

  if (isLoading || checkingOnboarding) {
    return <div>Loading...</div>;
  }

  // Check if user exists locally
  const localUser = localStorage.getItem('user');
  const isAuthenticatedLocally = localStorage.getItem('isAuthenticated') === 'true';
  
  // Determine initial route based on onboarding and auth state
  const getInitialRoute = () => {
    // If onboarding not completed, show onboarding
    if (onboardingCompleted === false) {
      return '/onboarding';
    }
    
    // If authenticated, go to home
    if (isAuthenticated && isAuthenticatedLocally) {
    return '/home';
    }
    
    // If user exists locally but not authenticated (logged out), show login
    if (localUser && !isAuthenticated) {
      return '/auth';
    }
    
    // Default to auth if onboarding completed but no user
    return '/auth';
  };

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={getInitialRoute()} replace />}
      />
      <Route
        path="/onboarding"
        element={<Onboarding />}
      />
      <Route
        path="/auth"
        element={<Auth onLogin={() => {}} />}
      />
      <Route
        path="/home"
        element={<Home onLogout={logout} />}
      />
    </Routes>
  );
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}
